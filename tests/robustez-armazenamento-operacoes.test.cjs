const {test}=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm');
const {boot,fixture,personal,loan,launch,clone}=require('./fixtures/gestor-mocks.cjs');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
function trecho(a,b){const i=html.indexOf(a),j=html.indexOf(b,i+a.length);assert(i>=0&&j>i);return html.slice(i,j);}
const ler=ctx=>ctx.executarAcaoApi_('getDadosCompletos',null);
const alvo=r=>({registroId:r[11],compraId:r[12],versao:r[13],linha:2,descOriginal:r[1],descricao:r[1],mesFatura:r[8],parcela:r[6]});
const pedido={action:'salvarLancamentoWeb',requestId:'cancelamento-seguro-001'};

test('cancelamento antes do envio impede chegada tardia, inclusive após restauração',()=>{
  const {ctx,db,props}=boot(fixture());
  assert.equal(ctx.cancelarOperacaoWeb(pedido).estado,'cancelado');
  assert.equal(ctx.cancelarOperacaoWeb(pedido).estado,'cancelado');
  assert.equal(ctx.consultarOperacaoWeb(pedido).estado,'cancelado');
  props.set('GESTOR_EPOCA_RESTAURACAO','outra-epoca');
  assert.throws(()=>ctx.salvarLancamentoWeb({...launch,requestId:pedido.requestId}),e=>e.codigo==='OPERACAO_CANCELADA');
  assert.equal(db.sheets['Lançamentos'].getLastRow(),1);
  assert.equal(db.sheets['_Gestor_Operacoes'].rows.filter(r=>r[2]==='CANCELADO').length,1);
});
test('cancelamento com resposta perdida mantém proibição durável e consulta recupera',()=>{
  const {ctx,db}=boot(fixture());ctx.cancelarOperacaoWeb({...pedido,requestId:'outro-envio-001'});
  db.failure={name:'_Gestor_Operacoes',stage:'after',row:3};
  assert.throws(()=>ctx.cancelarOperacaoWeb(pedido),e=>e.resultadoIncerto===true);
  assert.equal(ctx.consultarOperacaoWeb(pedido).estado,'cancelado');
  assert.throws(()=>ctx.salvarLancamentoWeb({...launch,requestId:pedido.requestId}),/cancelado/);
});
test('cancelamento não toca gravação concluída nem recebimentos',()=>{
  const {ctx,db}=boot(fixture());ctx.salvarLancamentoWeb({...launch,requestId:pedido.requestId});
  const antes=JSON.stringify(db.sheets['Lançamentos'].rows);
  assert.equal(ctx.cancelarOperacaoWeb(pedido).estado,'confirmado');
  assert.equal(JSON.stringify(db.sheets['Lançamentos'].rows),antes);
});
for(const stage of ['before','after']) test('cancelamento recusa plano PRONTO com falha '+stage+'; recuperação não duplica',()=>{
  const {ctx,db}=boot(fixture());db.failure={name:'Lançamentos',stage};
  assert.throws(()=>ctx.salvarLancamentoWeb({...launch,requestId:pedido.requestId}),/FALHA/);
  assert.equal(ctx.cancelarOperacaoWeb(pedido).estado,'conferencia');
  assert.equal(ctx.consultarOperacaoWeb(pedido).estado,'confirmado');
  assert.equal(db.sheets['Lançamentos'].rows.slice(1).filter(r=>r[11]).length,3);
});
test('PREPARANDO incompleto é cancelável sem aplicar suas partes',()=>{
  const {ctx,db}=boot(fixture());db.failure={name:'_Gestor_Operacoes',stage:'before',row:3};
  assert.throws(()=>ctx.salvarLancamentoWeb({...launch,requestId:pedido.requestId}),/FALHA/);
  assert.equal(db.sheets['_Gestor_Operacoes'].rows[1][2],'PREPARANDO');
  assert.equal(ctx.cancelarOperacaoWeb(pedido).estado,'cancelado');
  assert.equal(db.sheets['Lançamentos'].getLastRow(),1);
});
test('cancelamento usa a mesma trava e recusa notas, restauração e ação desconhecida',()=>{
  const {ctx,lock}=boot(fixture());lock.has=true;
  assert.throws(()=>ctx.cancelarOperacaoWeb(pedido),/NESTED REAL LOCK/);lock.has=false;
  for(const action of ['salvarNotasWeb','restaurarBackupDadosWeb','qualquerAcao']) assert.throws(()=>ctx.cancelarOperacaoWeb({...pedido,action}),/não pode ser cancelado/);
});

test('pagamento parcial segue data/parcela, fecha centavos e mantém recebimento',()=>{
  const a=personal('Minha compra',100,'2/3','10/2026','Em Aberto','Cartao','03/10/2026');
  const b=loan('Ana','Recebido',70,'Cartao');b[0]='02/10/2026';
  const {ctx,db}=boot(fixture([a],[b]));ler(ctx);
  const p={forma:'Cartao',mesFatura:'10/2026',valor:100.01};
  const previa=ctx.executarAcaoApi_('previaPagamentoFaturaWeb',p);
  assert.deepEqual(Array.from(previa.aplicacoes,i=>i.aplicar),[70,30.01]);
  assert.equal(previa.aplicacoes[0].resumo.pessoa,'Ana');
  const envio={...previa,requestId:'parcial-cronologico-001'};ctx.registrarPagamentoFaturaWeb(envio);ctx.registrarPagamentoFaturaWeb(envio);
  assert.equal(db.sheets['Empréstimos'].rows[1][9],'Recebido');
  assert.equal(db.sheets['Empréstimos'].rows[1][14],'Pago');
  assert.equal(db.sheets['Lançamentos'].rows[1][17],30.01);
  assert.equal(ctx.obterFaturaPagamentoWeb(p).restante,69.99);
});
test('mesma data ordena por parcela; reordenar linhas não troca a distribuição',()=>{
  const {ctx,db}=boot(fixture([personal('Primeira',40,'1/2'),personal('Segunda',40,'2/2')]));ler(ctx);
  const p={forma:'Cartao',mesFatura:'10/2026',valor:10};
  const a=ctx.executarAcaoApi_('previaPagamentoFaturaWeb',p);
  [db.sheets['Lançamentos'].rows[1],db.sheets['Lançamentos'].rows[2]]=[db.sheets['Lançamentos'].rows[2],db.sheets['Lançamentos'].rows[1]];
  const b=ctx.executarAcaoApi_('previaPagamentoFaturaWeb',p);
  assert.equal(a.aplicacoes[0].resumo.descricao,'Primeira');assert.equal(a.versaoFatura,b.versaoFatura);
  assert.throws(()=>ctx.registrarPagamentoFaturaWeb({...a,regra:'antiga',requestId:'regra-antiga-001'}),/prévia atualizada/);
});

test('controle fixo corrompido preserva dados, sinaliza série e permite lançamento independente',()=>{
  const {ctx,db}=boot(fixture([personal('Série antiga',20,'∞/∞','09/2026','Assinatura Ativa')]));
  ler(ctx);const fixa=db.sheets['Lançamentos'].rows.find(r=>r[6]==='∞/∞');const compra=fixa[12];
  fixa[15]='gestor-serie-v1:{quebrado';ctx.getHojeSeguro=()=>new Date(2026,10,16);
  const antes=db.sheets['Lançamentos'].rows.filter(r=>r[12]===compra).length;
  const d=ler(ctx);assert.equal(d.integridade.bloqueada,false);assert.equal(d.integridade.series.length,1);
  assert.equal(d.assinaturas[0].controleInvalido,true);
  assert.equal(db.sheets['Lançamentos'].rows.filter(r=>r[12]===compra).length,antes);
  ctx.salvarLancamentoWeb({...launch,descricao:'Independente',requestId:'fora-da-serie-001'});
  assert.equal(db.sheets['Lançamentos'].rows.find(r=>r[11]===fixa[11])[15],'gestor-serie-v1:{quebrado');
  const atual=clone(db.sheets['Lançamentos'].rows.find(r=>r[11]===fixa[11]));
  assert.throws(()=>ctx.cancelarAssinaturaWeb({...alvo(atual),requestId:'serie-invalida-001'}),/conferência/);
  assert.throws(()=>ctx.excluirLancamentoWeb({...alvo(atual),requestId:'excluir-invalida-001'}),/controle inválido/);
});
test('corrupção em ocorrência antiga também suspende projeção da série inteira',()=>{
  const {ctx,db}=boot(fixture([personal('Fixa',20,'∞/∞','09/2026','Assinatura Ativa'),personal('Compra futura',50,'1/1','12/2026')]));
  const inicial=ler(ctx);assert(inicial.faturas.pivot.Cartao['12/2026']>50);
  db.sheets['Lançamentos'].rows.find(r=>r[6]==='∞/∞'&&r[8]==='09/2026')[15]='gestor-serie-v1:{inválido';
  const atual=ler(ctx);
  assert.equal(atual.assinaturas[0].controleInvalido,true);
  assert.equal(atual.faturas.pivot.Cartao['12/2026'],50);
  assert(atual.lancamentos.some(r=>r[1]==='Fixa'));
});
test('controle fixo estruturalmente inválido não vira padrão nem é sobrescrito',()=>{
  const {ctx}=boot(fixture());
  for(const json of ['null','[]','{"diaReferencia":32}','{"encerrada":"sim"}','{"encerramentoMes":"inválido"}']) {
    const r=personal();r[15]='gestor-serie-v1:'+json;
    assert.equal(ctx.serieRecorrenteGestor_(r).invalida,true);
    assert.throws(()=>ctx.definirSerieRecorrenteGestor_(r,{encerrada:true}),/conferência/);
    assert.equal(r[15],'gestor-serie-v1:'+json);
  }
});
test('tipo legado à vista gera uma ocorrência paga; agendamento e recorrência futura seguem pendentes',()=>{
  const f=fixture();f['Formas de Pagamento'].push(['','Dinheiro','Conta',0,'','']);
  const {ctx,db}=boot(f);
  ctx.salvarLancamentoWeb({...launch,formaPagto:'Dinheiro',requestId:'avista-novo-001'});
  const rows=db.sheets['Lançamentos'].rows.slice(1).filter(r=>r[11]);assert.equal(rows.length,1);assert.equal(rows[0][9],'Pago');assert.equal(rows[0][6],'1/1');
  ctx.salvarLancamentoWeb({...launch,formaPagto:'Dinheiro',dataCompra:'01/11/2026',mesPrimeiraFatura:'11/2026',requestId:'avista-agendado-001'});
  assert.equal(db.sheets['Lançamentos'].rows.filter(r=>r[9]==='Agendado').length,1);
  ctx.salvarLancamentoWeb({...launch,descricao:'Fixa',formaPagto:'Dinheiro',isAssinatura:true,requestId:'avista-fixa-001'});
  ctx.getHojeSeguro=()=>new Date(2026,10,16);ler(ctx);
  assert.equal(db.sheets['Lançamentos'].rows.find(r=>r[6]==='∞/∞'&&r[8]==='11/2026')[9],'Assinatura Ativa');
});

function storage(seed={},limite=100000){const mapa=new Map(Object.entries(seed));return {mapa,getItem:k=>mapa.get(k)??null,removeItem:k=>mapa.delete(k),setItem(k,v){const total=Array.from(mapa).reduce((n,[key,value])=>n+(key===k?0:value.length),0)+String(v).length;if(total>limite)throw Object.assign(Error('cheio'),{name:'QuotaExceededError'});mapa.set(k,String(v));}};}
function front(local,sessao=storage()){const ctx=vm.createContext({localStorage:local,sessionStorage:sessao,mostrarAviso(){}});vm.runInContext(trecho('    function lerCacheLeituraGestor(','    function lerJSONLocalGestor('),ctx);return ctx;}
test('quota libera apenas cache reconstruível e preserva diagnóstico, versões, fila e rascunhos',()=>{
  const criticos={'gestorDiagnosticoV1':'evento','gestorFilaItemV2:abc':'fila','gestorMutacaoV3:abc':'envio','gestorNotasOpV2:abc':'nota','gestorEpocaRestauracaoV1':'epoca','gestorCancelamentoV1:abc':'cancelar','rascunhoLancamento':'texto'};
  const local=storage({...criticos,cacheDadosGestorV11:'x'.repeat(200),gestorHistoricoCacheV1:'y'.repeat(100)},340),ctx=front(local);
  assert.equal(ctx.gravarArmazenamentoGestor('gestorNotasEnvioV2','z'.repeat(200)),true);
  for(const [k,v] of Object.entries(criticos)) assert.equal(local.getItem(k),v);
  assert.equal(local.getItem('cacheDadosGestorV11'),null);
});
test('armazenamento crítico cheio interrompe; cache opcional falha sem apagar operações',()=>{
  const local=storage({'gestorFilaItemV2:a':'x'.repeat(30)},35),ctx=front(local);
  assert.throws(()=>ctx.gravarArmazenamentoGestor('gestorMutacaoV3:b','novos dados'),e=>e.codigo==='ARMAZENAMENTO_INDISPONIVEL');
  assert.equal(ctx.salvarCacheLeituraGestor('cacheDadosGestorV11','y'.repeat(50)),false);
  assert.equal(local.getItem('gestorFilaItemV2:a'),'x'.repeat(30));
});
test('falha no rascunho da sessão mantém versão anterior e mostra aviso',()=>{
  const sessao=storage({rascunhoLancamento:'antes'},6),ctx=front(storage(),sessao);let avisos=0;ctx.mostrarAviso=()=>avisos++;
  assert.equal(ctx.guardarRascunhoGestor('rascunhoLancamento','novo texto maior'),false);
  assert.equal(ctx.guardarRascunhoGestor('rascunhoLancamento','novo texto maior'),false);
  assert.equal(sessao.getItem('rascunhoLancamento'),'antes');assert.equal(avisos,1);
});
test('calculadora usa operações limitadas e recusa código e resultados não finitos',()=>{
  const ctx=vm.createContext({document:{addEventListener(){}}});vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../interface/usabilidade.js'),'utf8'),ctx);
  for(const [expr,valor] of [['2+3*4',14],['(2+3)*4',20],['-2*-3',6],['200*10%',20],['1,5+0,5',2],['(10+10)%',0.2]]) assert.equal(ctx.avaliarExpressaoCalc(expr),valor);
  for(const expr of ['globalThis.x=1','1/0','1;2','2**3','('.repeat(50)+'1'+')'.repeat(50),'9'.repeat(300)]) assert.equal(ctx.avaliarExpressaoCalc(expr),null);
  assert(!html.includes('new Function('));
});
test('onOpen só cria menu; não inicia manutenção autorizada',()=>{
  const {ctx}=boot(fixture());let manutencao=0;const menu={createMenu(){return this;},addItem(){return this;},addSeparator(){return this;},addToUi(){}};
  ctx.SpreadsheetApp.getUi=()=>menu;ctx.atualizarStatusAutomatico=()=>manutencao++;ctx.onOpen();assert.equal(manutencao,0);
});
