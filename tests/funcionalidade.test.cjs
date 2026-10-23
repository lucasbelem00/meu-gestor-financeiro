const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {boot,fixture,personal,loan,launch}=require('./fixtures/gestor-mocks.cjs');
const ler=ctx=>ctx.executarAcaoApi_('getDadosCompletos',null);

test('dados consolidados não repetem meses compartilhados por gastos e empréstimos',()=>{
  const {ctx}=boot(fixture([personal('Compra outubro'),personal('Compra novembro',50,'1/1','11/2026')],[loan('Ana'),loan('Bruno')]));
  const dados=ler(ctx);
  assert.equal(dados.mesesDisponiveis.length,new Set(dados.mesesDisponiveis).size);
  assert.equal(dados.estruturaMesesAno['2026'].length,2);
});

test('inclusão com status e controles vazios completa a mesma linha sem duplicar',()=>{
  const {ctx,db}=boot(fixture([personal('Anterior',20)]));ler(ctx);
  const dados={...launch,isAssinatura:true,requestId:'fixo-incompleto-001'};
  db.failure={name:'Lançamentos',stage:'after'};assert.throws(()=>ctx.salvarLancamentoWeb(dados),/FALHA/);
  const sh=db.sheets['Lançamentos'],r=sh.rows.at(-1),id=r[11];
  [9,11,12,13,14,16,17].forEach(c=>r[c]='');
  ctx.salvarLancamentoWeb(dados);ler(ctx);
  assert.equal(sh.rows.length,3);assert.equal(sh.rows.at(-1)[11],id);assert.equal(sh.rows.at(-1)[9],'Assinatura Ativa');
  assert(db.sheets['_Gestor_Operacoes'].rows.every(r=>r[2]!=='PRONTO'));
});

test('recuperação parcial recusa valor divergente e alteração em linha anterior',()=>{
  for(const alterarAnterior of [false,true]){
    const {ctx,db}=boot(fixture([personal('Anterior',20)]));ler(ctx);
    const dados={...launch,isAssinatura:true,requestId:'fixo-conflito-'+alterarAnterior};
    db.failure={name:'Lançamentos',stage:'after'};assert.throws(()=>ctx.salvarLancamentoWeb(dados),/FALHA/);
    const sh=db.sheets['Lançamentos'];[9,11,12,13,14,16,17].forEach(c=>sh.rows.at(-1)[c]='');
    sh.rows[alterarAnterior?1:2][7]=999;
    assert.throws(()=>ctx.salvarLancamentoWeb(dados),/não corresponde|mudou durante/);assert.equal(sh.rows[alterarAnterior?1:2][7],999);
  }
});

test('gasto fixo interrompido recupera sem duplicar e permite leitura posterior',()=>{
  for(const stage of ['before','after']){
    const {ctx,db}=boot(fixture());
    const dados={...launch,isAssinatura:true,requestId:'fixo-interrompido-'+stage};
    db.failure={name:'Lançamentos',stage};
    assert.throws(()=>ctx.salvarLancamentoWeb(dados),/FALHA/);
    ctx.salvarLancamentoWeb(dados);ler(ctx);ler(ctx);
    const rows=db.sheets['Lançamentos'].rows.slice(1).filter(r=>r[11]);
    assert.equal(rows.length,1);assert.equal(rows[0][6],'∞/∞');assert.equal(rows[0][7],100);
  }
});

test('Pix parcelado conserva centavos e parcelas futuras não viram pagas ao abrir',()=>{
  const {ctx,db}=boot(fixture());
  ctx.salvarLancamentoWeb({...launch,formaPagto:'Pix',pixParcelado:true,requestId:'pix-parcelado-001'});
  const rows=db.sheets['Lançamentos'].rows.slice(1).filter(r=>r[11]);
  assert.deepEqual(rows.map(r=>r[7]),[33.34,33.33,33.33]);
  assert.deepEqual(rows.map(r=>r[9]),['Pago','Em Aberto','Em Aberto']);ler(ctx);
  assert.deepEqual(db.sheets['Lançamentos'].rows.slice(1).filter(r=>r[11]).map(r=>r[9]),['Pago','Em Aberto','Em Aberto']);
});

test('Pix único ignora parcelamento sem opção explícita',()=>{
  const {ctx,db}=boot(fixture());ctx.salvarLancamentoWeb({...launch,formaPagto:'Pix',requestId:'pix-unico-001'});
  const rows=db.sheets['Lançamentos'].rows.slice(1).filter(r=>r[11]);assert.equal(rows.length,1);assert.equal(rows[0][7],100);assert.equal(rows[0][6],'1/1');
});

test('recebimento de Pix em três vezes não cria dívida com banco',()=>{
  const {ctx,db}=boot(fixture());
  ctx.salvarEmprestimoWeb({dataCompra:'16/10/2026',pessoa:'Ana',descricao:'Ajuda',formaPagto:'Pix',valorTotal:120,numParcelas:3,parcelaInicial:1,mesPrimeiraFatura:'10/2026',pixParcelado:true,requestId:'pix-emprestimo-001'});
  const rows=db.sheets['Empréstimos'].rows.slice(1).filter(r=>r[11]);assert.equal(rows.length,3);assert(rows.every(r=>r[9]==='A Receber'&&r[14]==='Pago'));
  assert.equal(ler(ctx).emprestimos.kpis.limiteOcupado,'R$ 0,00');
  const r=rows[0];ctx.alternarStatusEmprestimoWeb({registroId:r[11],versao:r[13],linha:2,requestId:'pix-receber-001',statusDesejado:'Recebido'});
  assert.equal(db.sheets['Empréstimos'].rows.slice(1).filter(r=>r[9]==='Recebido').length,1);
});

test('confirmação de edição é seletiva e não envia antes de confirmar',()=>{
  const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
  const a=html.indexOf('    function confirmarEdicaoFinanceiraGestor('),b=html.indexOf('    function salvarEdicaoLanc(',a);
  let callback,confirmacoes=0,envios=0;const modal={_dadosOriginaisEdicao:{descricao:'Compra',status:'Em Aberto'},classList:{contains:()=>false}};
  const ctx=vm.createContext({document:{getElementById:()=>modal},mostrarConfirmacao:(_t,_m,fn)=>{confirmacoes++;callback=fn;}});
  vm.runInContext(html.slice(a,b),ctx);
  ctx.confirmarEdicaoFinanceiraGestor('modalEdicaoLanc',{descricao:'Outra descrição',status:'Em Aberto',parcelaOriginal:'1/1'},()=>envios++);assert.equal(envios,1);assert.equal(confirmacoes,0);
  ctx.confirmarEdicaoFinanceiraGestor('modalEdicaoLanc',{descricao:'Compra',status:'Pago',parcelaOriginal:'1/1'},()=>envios++);assert.equal(envios,1);callback();assert.equal(envios,2);
  ctx.confirmarEdicaoFinanceiraGestor('modalEdicaoLanc',{descricao:'Compra',status:'Em Aberto',parcelaOriginal:'1/3',propagarValorParcelas:true},()=>envios++);assert.equal(confirmacoes,2);assert.equal(envios,2);
});

test('histórico extenso não é baixado inteiro em nova gravação e reenvio continua seguro',()=>{
  const {ctx,db}=boot(fixture([personal()]));ler(ctx);
  const diario=db.sheets['_Gestor_Operacoes'];for(let i=0;i<2000;i++)diario.rows.push(['antiga-'+i,'sha','CONFIRMADO',1,'',new Date()]);
  const obter=diario.getRange.bind(diario);diario.getRange=(...args)=>{const r=obter(...args);if((args[2]||1)>500&&args[1]===1&&args[3]===6)r.getValues=()=>{throw Error('Download integral do diário');};return r;};
  const atividade=db.sheets['_Gestor_Atividade']||db.insertSheet('_Gestor_Atividade');
  atividade.rows=[['Evento','Data','Ação','Resumo','Tipo','Conteúdo']];
  atividade.getDataRange=()=>{throw Error('Download integral da atividade');};
  const p={...launch,requestId:'hist-grande-001'};ctx.salvarLancamentoWeb(p);ctx.salvarLancamentoWeb(p);
  assert.equal(db.sheets['Lançamentos'].rows.slice(1).filter(r=>r[1]==='Teste').length,3);
});

test('interrupção ao anexar atividade recupera sem repetir compra',()=>{
  const {ctx,db}=boot(fixture());ler(ctx);const p={...launch,requestId:'hist-falha-anexo-001'};
  db.failure={name:'_Gestor_Atividade',stage:'after'};
  assert.throws(()=>ctx.salvarLancamentoWeb(p),/FALHA SIMULADA/);ctx.salvarLancamentoWeb(p);
  assert.equal(db.sheets['Lançamentos'].rows.slice(1).filter(r=>r[11]).length,3);
  assert.equal(ctx.executarAcaoApi_('obterAtividadeWeb',{}).total,1);
});

test('aba particular com nome do diário não é sobrescrita',()=>{
  const {ctx,db}=boot(fixture());db.insertSheet('_Gestor_Operacoes').rows=[['Meus dados']];
  assert.throws(()=>ler(ctx),/estrutura incompatível/);assert.equal(db.sheets['_Gestor_Operacoes'].rows[0][0],'Meus dados');
});


test('validação antiga de status é atualizada antes de gravar assinatura',()=>{
  const {ctx,db}=boot(fixture());const sh=db.sheets['Lançamentos'];
  let permitidos=['Pago','Em Aberto','Agendado'];const getRange=sh.getRange.bind(sh);
  sh.getRange=function(...args){
    const rg=getRange(...args),setValues=rg.setValues.bind(rg);
    rg.setDataValidation=function(regra){assert.equal(args[1],10);assert.equal(args[0],2);assert.equal(regra.allowInvalid,false);permitidos=Array.from(regra.values);return rg;};
    rg.setValues=function(values){values.forEach((row,i)=>{const c=9-(args[1]-1);if(args[0]+i>1&&c>=0&&c<row.length&&row[c]&&!permitidos.includes(row[c]))throw Error('Validação antiga recusou status');});return setValues(values);};return rg;
  };
  ctx.salvarLancamentoWeb({...launch,isAssinatura:true,requestId:'validacao-assinatura-001'});
  assert(permitidos.includes('Assinatura Ativa'));assert(permitidos.includes('Assinatura Cancelada'));
  assert.equal(sh.rows[1][9],'Assinatura Ativa');ler(ctx);
});
