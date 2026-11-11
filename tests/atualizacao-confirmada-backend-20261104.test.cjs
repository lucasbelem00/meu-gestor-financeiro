const {test}=require('node:test'),assert=require('node:assert/strict');
const {boot,fixture,personal,loan,launch,clone}=require('./fixtures/gestor-mocks.cjs');
const {ambienteProtecao}=require('./fixtures/protecao-mocks.cjs');
const api=(a,n,p)=>a.ctx.executarAcaoApi_(n,p);
function iniciar(dados=fixture()) {const a=boot(dados);api(a,'getDadosCompletos');return a;}
function conferir(a,r){
 assert.equal(r.atualizacaoDados?.versao,1);
 const d=r.atualizacaoDados.dados,atual=api(a,'getDadosCompletos');
 for(const k of Object.keys(atual).filter(k=>k!=='historicoTecnico'))assert.equal(JSON.stringify(d[k]),JSON.stringify(atual[k]),k);
 assert.equal(d.integridade.bloqueada,false);
}
function editar(a,r,extras={}){return api(a,'editarLancamentoLinhaWeb',{incluirAtualizacaoDados:true,requestId:'snapshot-editar-001',registroId:r[11],compraId:r[12],versao:r[13],linha:2,descOriginal:r[1],mesOriginal:r[8],parcelaOriginal:r[6],descricao:'Descrição atualizada',dataCompra:'16/10/2026',formaPagto:'Cartao',categoria:'Teste',valorParcela:r[7],mesFatura:r[8],status:r[9],tags:'#teste',...extras});}
test('edição devolve primeira página filtrada equivalente à nova consulta, com soma correta e reconferência antes de paginar',()=>{
 const a=iniciar(fixture([personal('Original',30),personal('Outro',20)])),r=clone(a.db.sheets['Lançamentos'].rows[1]);
 const consulta={filtros:{termo:'Atualizada',status:'Em Aberto'},offset:0,limite:50};
 const res=editar(a,r,{historicoAtual:consulta}),h=res.atualizacaoDados.historico;
 assert.equal(JSON.stringify(h.consulta),JSON.stringify(consulta));const atual=api(a,'filtrarLancamentosWeb',consulta);assert.equal(h.resposta.versaoConsulta,null);assert.equal(h.requerReconsultaPaginacao,true);delete atual.versaoConsulta;const exibida={...h.resposta};delete exibida.versaoConsulta;assert.equal(JSON.stringify(exibida),JSON.stringify(atual));
 assert.equal(h.resposta.qtdTotal,1);assert(!JSON.stringify(a.db.sheets['_Gestor_Operacoes'].rows).includes('atualizacaoDados'));
});
test('exclusão devolve seleção sem item excluído e pedido de outra página não cria atalho',()=>{
 for(const offset of [0,50]){
 const a=iniciar(fixture([personal('Excluir',30),personal('Outro',20)])),r=a.db.sheets['Lançamentos'].rows[1],consulta={filtros:{termo:'Excluir'},offset,limite:50};
 const res=api(a,'excluirLancamentoWeb',{registroId:r[11],compraId:r[12],versao:r[13],linha:2,descricao:r[1],mesFatura:r[8],parcela:r[6],incluirAtualizacaoDados:true,historicoAtual:consulta,requestId:'snapshot-excluir-historico-001'});
 assert(res.atualizacaoDados);if(offset===0){assert.equal(res.atualizacaoDados.historico.resposta.qtdTotal,0);assert.equal(res.atualizacaoDados.historico.resposta.itens.length,0);}else assert.equal(res.atualizacaoDados.historico,undefined);
 }
});

for(const acao of ['registrarPagamentoFaturaWeb','alternarStatusEmprestimoWeb','dividirParcelaEmprestimoWeb'])test(acao+' devolve atualização confirmada equivalente à consulta real e preserva reenvio',()=>{
 const terceiro=loan('Pessoa','A Receber',100,'Cartao');terceiro[0]='02/10/2026';const a=iniciar(fixture([personal('Pessoal',80)],[terceiro]));
 const r=clone(a.db.sheets['Empréstimos'].rows[1]);let p;
 if(acao==='registrarPagamentoFaturaWeb')p={...api(a,'previaPagamentoFaturaWeb',{forma:'Cartao',mesFatura:'10/2026',valor:100,resumo:true})};
 else p={linha:2,registroId:r[11],compraId:r[12],versao:r[13],pessoa:r[1],descricao:r[2],mesFatura:r[8],parcela:r[6],statusDesejado:'Recebido',valorRecebido:40};
 Object.assign(p,{incluirAtualizacaoDados:true,requestId:'snapshot-pagamentos-'+acao});
 const res=api(a,acao,p);conferir(a,res);assert(!JSON.stringify(a.db.sheets['_Gestor_Operacoes'].rows).includes('atualizacaoDados'));
 if(acao==='registrarPagamentoFaturaWeb')assert.equal(a.db.sheets['Empréstimos'].rows[1][9],'A Receber');
 else assert.equal(a.ctx.obterFaturaPagamentoWeb({forma:'Cartao',mesFatura:'10/2026'}).pago,0);
 const antes=JSON.stringify([a.db.sheets['Lançamentos'].rows,a.db.sheets['Empréstimos'].rows]);
 const repetido=api(a,acao,p);assert.equal(repetido.atualizacaoDados,undefined);assert.equal(JSON.stringify([a.db.sheets['Lançamentos'].rows,a.db.sheets['Empréstimos'].rows]),antes);
});
test('falha acessória na atualização do pagamento conserva confirmação financeira sem duplicar',()=>{
 const a=iniciar(fixture([personal('Pessoal',100)])),p={...api(a,'previaPagamentoFaturaWeb',{forma:'Cartao',mesFatura:'10/2026',valor:100,resumo:true}),incluirAtualizacaoDados:true,requestId:'snapshot-pagamento-falha-001'},ler=a.ctx.getDadosCompletos;
 a.ctx.getDadosCompletos=()=>{throw Error('Falha acessória');};const r=api(a,'registrarPagamentoFaturaWeb',p);assert.equal(r.atualizacaoDados,undefined);assert.equal(r.pago,100);
 a.ctx.getDadosCompletos=ler;api(a,'registrarPagamentoFaturaWeb',p);assert.equal(a.ctx.obterFaturaPagamentoWeb(p).pago,100);
});
test('pagamento com atualização confirmada exige menos leituras reais que pagar e consultar tudo novamente',()=>{
 function executar(opt){
  const terceiro=loan('Pessoa','A Receber',100,'Cartao');terceiro[0]='02/10/2026';const a=iniciar(fixture([personal('Pessoal',80)],[terceiro]));
  const p={...api(a,'previaPagamentoFaturaWeb',{forma:'Cartao',mesFatura:'10/2026',valor:100,resumo:true}),incluirAtualizacaoDados:opt,requestId:'pagamento-medicao-snapshot'};let leituras=0;
  for(const sh of Object.values(a.db.sheets)){const obter=sh.getRange;sh.getRange=function(...args){const r=obter.apply(this,args);for(const k of ['getValues','getFormulas','getDisplayValues','getValue']){const ler=r[k];if(ler)r[k]=function(){leituras++;return ler.apply(this,arguments);};}return r;};}
  const r=api(a,'registrarPagamentoFaturaWeb',p),dados=opt?r.atualizacaoDados?.dados:api(a,'getDadosCompletos');assert(dados);return {leituras,dados};
 }
 const novo=executar(true),anterior=executar(false);assert(novo.leituras<anterior.leituras,'leituras devem cair: '+novo.leituras+' / '+anterior.leituras);
 for(const k of ['kpis','faturas'])assert.equal(JSON.stringify(novo.dados[k]),JSON.stringify(anterior.dados[k]),k);
});

test('novo devolve retrato completo confirmado sem persistir retrato no diário nem duplicar reenvio',()=>{
 const a=iniciar(),p={...launch,incluirAtualizacaoDados:true,requestId:'snapshot-novo-001'};
 const r=api(a,'salvarLancamentoWeb',p);conferir(a,r);
 assert(!JSON.stringify(a.db.sheets['_Gestor_Operacoes'].rows).includes('atualizacaoDados'));
 const ids=a.db.sheets['Lançamentos'].rows.slice(1).map(r=>r[11]);
 const repetido=api(a,'salvarLancamentoWeb',p);assert.equal(repetido.atualizacaoDados,undefined);assert.deepEqual(a.db.sheets['Lançamentos'].rows.slice(1).map(r=>r[11]),ids);
});

test('edição devolve valores e versões finais iguais à consulta real sem alterar outras parcelas',()=>{
 const a=iniciar(fixture([personal('Original',30)],[loan('Ana','A Receber',20,'Cartao')])),antes=clone(a.db.sheets['Lançamentos'].rows[1]);
 const r=editar(a,antes,{valorParcela:45});conferir(a,r);
 const linha=r.atualizacaoDados.dados.lancamentos.find(x=>x[13]===antes[11]);assert.equal(linha[15],antes[13]+1);assert.equal(linha[1],'Descrição Atualizada');assert.equal(a.db.sheets['Empréstimos'].rows[1][9],'A Receber');
});

test('cliente sem opt-in mantém resultado anterior sem retrato',()=>{
 const a=iniciar(),r=api(a,'salvarLancamentoWeb',{...launch,requestId:'snapshot-sem-opt-in-001'});assert.equal(r.atualizacaoDados,undefined);
});

test('fórmula particular em configuração exige consulta real em vez de valores calculados anteriores',()=>{
 const a=iniciar();a.db.sheets['Dashboard & Resumo'].getRange(17,4).setValue('=500');
 const r=api(a,'salvarLancamentoWeb',{...launch,incluirAtualizacaoDados:true,requestId:'snapshot-formula-001'});
 assert.equal(r.atualizacaoDados,undefined);assert.equal(a.db.sheets['Lançamentos'].rows.length,4);assert.equal(a.db.sheets['Dashboard & Resumo'].getRange(17,4).getFormulas()[0][0],'=500');
});

test('fluxo completo com retrato reduz leituras reais comparado a salvar e consultar de novo',()=>{
 function executar(retrato){
  const a=iniciar(fixture([], [loan('Ana','A Receber',20,'Cartao')]));let leituras=0;
  for(const sh of Object.values(a.db.sheets)){
   const obter=sh.getRange;sh.getRange=function(...args){const r=obter.apply(this,args);for(const campo of ['getValues','getFormulas','getDisplayValues','getValue']){const ler=r[campo];if(ler)r[campo]=function(){leituras++;return ler.apply(this,arguments);};}return r;};
  }
  const res=api(a,'salvarLancamentoWeb',{...launch,incluirAtualizacaoDados:retrato,requestId:'snapshot-comparacao-001'});
  const dados=retrato?res.atualizacaoDados?.dados:api(a,'getDadosCompletos');assert(dados);return {leituras,dados};
 }
 const antes=executar(false),depois=executar(true);assert(depois.leituras<antes.leituras,JSON.stringify({antes:antes.leituras,depois:depois.leituras}));
 assert.equal(JSON.stringify(antes.dados.kpis),JSON.stringify(depois.dados.kpis));
});

test('recorrência e Pix mantêm projeções e controles no retrato confirmado',()=>{
 for(const pix of [false,true]){
  const a=iniciar(),r=api(a,'salvarLancamentoWeb',{...launch,formaPagto:pix?'Pix':'Cartao',numParcelas:1,isAssinatura:true,statusInicial:'Assinatura Ativa',incluirAtualizacaoDados:true,requestId:'snapshot-recorrencia-'+pix});
  conferir(a,r);
 }
});

test('virada do mês com ocorrência pendente usa consulta habitual e não grava manutenção após confirmação',()=>{
 const a=iniciar();api(a,'salvarLancamentoWeb',{...launch,numParcelas:1,isAssinatura:true,statusInicial:'Assinatura Ativa',requestId:'snapshot-fixo-anterior'});
 a.ctx.getHojeSeguro=()=>new Date(2026,10,16);
 const r=api(a,'salvarLancamentoWeb',{...launch,descricao:'Compra nova',dataCompra:'16/11/2026',mesPrimeiraFatura:'11/2026',numParcelas:1,incluirAtualizacaoDados:true,requestId:'snapshot-virada-001'});
 assert.equal(r.atualizacaoDados,undefined);
 assert.equal(a.db.sheets['Lançamentos'].rows.filter(x=>String(x[6]).includes('∞')&&String(x[8]).includes('11/2026')).length,0);
 api(a,'getDadosCompletos');assert.equal(a.db.sheets['Lançamentos'].rows.filter(x=>String(x[6]).includes('∞')&&String(x[8]).includes('11/2026')).length,1);
});

test('falha acessória ao montar retrato preserva gravação confirmada e reenvio protegido',()=>{
 const a=iniciar(),get=a.ctx.getDadosCompletos;a.ctx.getDadosCompletos=()=>{throw Error('falha de retrato');};
 const p={...launch,incluirAtualizacaoDados:true,requestId:'snapshot-falha-001'},r=api(a,'salvarLancamentoWeb',p);assert.equal(r.atualizacaoDados,undefined);
 assert(a.db.sheets['_Gestor_Operacoes'].rows.some(x=>x[0]==='salvarLancamentoWeb:'+p.requestId&&x[2]==='CONFIRMADO'));
 a.ctx.getDadosCompletos=get;assert.equal(api(a,'salvarLancamentoWeb',p).atualizacaoDados,undefined);assert.equal(a.db.sheets['Lançamentos'].rows.length,4);
});

test('migração virtual ou retrato grande usa fallback sem gravar mudanças acessórias',()=>{
 for(const migrar of [true,false]){
  const a=iniciar(),get=a.ctx.getDadosCompletos;
  a.ctx.getDadosCompletos=()=>{const dados=get();if(migrar)a.ctx.obterPlanilhaGestor_().getSheetByName('Dashboard & Resumo').getRange(1,1).setValue('migração');else dados.extra='x'.repeat(400000);return dados;};
  const r=api(a,'salvarLancamentoWeb',{...launch,incluirAtualizacaoDados:true,requestId:'snapshot-fallback-'+String(migrar)});assert.equal(r.atualizacaoDados,undefined);assert.notEqual(a.db.sheets['Dashboard & Resumo'].rows[0][0],'migração');
 }
});

test('retrato pós-confirmação preserva parcelas entre anos e informação do ano fechado',()=>{
 const a=ambienteProtecao(fixture([personal('Antigo',30,'1/1','12/2025')]));a.ativar();a.ctx.cicloAnualGestor_(a.db,a.pasta);
 const r=api(a,'salvarLancamentoWeb',{...launch,mesPrimeiraFatura:'12/2026',incluirAtualizacaoDados:true,requestId:'snapshot-anos-001'});conferir(a,r);
 const antigo=r.atualizacaoDados.dados.lancamentos.find(x=>x[1]==='Antigo');assert.equal(antigo[21]?.ano,2025);
});

test('consulta completa e retrato confirmado não fazem leitura de exibição dispensável das formas',()=>{const a=iniciar(fixture([],[loan('Ana','A Receber',20,'Cartao')])),sh=a.db.sheets['Formas de Pagamento'],get=sh.getRange;sh.getRange=function(...args){const r=get.apply(this,args);r.getDisplayValues=()=>{throw Error('Exibição das formas não deve ser consultada');};return r;};assert(api(a,'getDadosCompletos').formasPagamento.length);const r=api(a,'salvarLancamentoWeb',{...launch,incluirAtualizacaoDados:true,requestId:'snapshot-sem-display-formas'});assert.equal(r.atualizacaoDados.versao,1);conferir(a,r);});
test('fórmula incompatível interrompe snapshot antes de calcular o Painel inteiro',()=>{const a=iniciar(),get=a.ctx.getDadosCompletos;let chamadas=0;a.db.sheets['Dashboard & Resumo'].getRange(17,4).setValue('=500');a.ctx.getDadosCompletos=()=>{chamadas++;return get();};const r=api(a,'salvarLancamentoWeb',{...launch,incluirAtualizacaoDados:true,requestId:'snapshot-formula-curto-001'});assert.equal(r.atualizacaoDados,undefined);assert.equal(chamadas,0);assert(a.db.sheets['_Gestor_Operacoes'].rows.some(x=>x[0]==='salvarLancamentoWeb:snapshot-formula-curto-001'&&x[2]==='CONFIRMADO'));});


test('categorias devolvem atualização confirmada com nomes, metas e versões atuais',()=>{const a=iniciar(fixture([personal('Compra',30)])),d=api(a,'getDadosCompletos');const r=api(a,'salvarCategoriasWeb',{requestId:'snapshot-categorias-001',incluirAtualizacaoDados:true,versaoConfiguracao:d.versoesConfiguracao.categorias,categorias:[{nome:'Teste',meta:250},{nome:'Outros 📦',meta:0}],renomeacoes:[]});conferir(a,r);assert.equal(r.atualizacaoDados.dados.configCategorias.find(c=>c.nome==='Teste').meta,250);});
test('exclusão devolve retrato confirmado sem o registro, preservando os demais',()=>{const a=iniciar(fixture([personal('Excluir',30),personal('Preservar',20)])),r=a.db.sheets['Lançamentos'].rows.find(r=>r[1]==='Excluir');const p={requestId:'snapshot-excluir-001',incluirAtualizacaoDados:true,registroId:r[11],compraId:r[12],versao:r[13],linha:2,descricao:r[1],mesFatura:r[8],parcela:r[6],excluirTodasParcelas:false};const res=api(a,'excluirLancamentoWeb',p);conferir(a,res);assert(!res.atualizacaoDados.dados.lancamentos.some(x=>x[1]==='Excluir'));assert(res.atualizacaoDados.dados.lancamentos.some(x=>x[1]==='Preservar'));const antes=JSON.stringify(a.db.sheets['Lançamentos'].rows);api(a,'excluirLancamentoWeb',p);assert.equal(JSON.stringify(a.db.sheets['Lançamentos'].rows),antes);});

test('Total da Carteira acompanha cartões novos e limites corrigidos sem depender da linha de resumo',()=>{
 const f=fixture();f['Formas de Pagamento'].push(['','Total Carteira','',7,'','','',0]);const a=iniciar(f);
 let d=api(a,'getDadosCompletos');assert.equal(d.formasPagamento.find(f=>f.tipo==='resumo').limiteTotal,'R$ 1.000,00');
 let res=api(a,'salvarFormaPagamentoWeb',{requestId:'forma-carteira-nova-001',incluirAtualizacaoDados:true,versaoConfiguracao:d.versoesConfiguracao.formas,nome:'Segundo',tipo:'cartao',banco:'Banco',limite:2500,fechamento:5,vencimento:10});conferir(a,res);
 d=res.atualizacaoDados.dados;assert.equal(d.formasPagamento.find(f=>f.tipo==='resumo').limiteTotal,'R$ 3.500,00');
 res=api(a,'salvarFormaPagamentoWeb',{requestId:'forma-carteira-limite-001',incluirAtualizacaoDados:true,versaoConfiguracao:d.versoesConfiguracao.formas,nomeOriginal:'Cartao',nome:'Cartao',tipo:'cartao',banco:'Banco',limite:1200,fechamento:5,vencimento:10});conferir(a,res);
 assert.equal(res.atualizacaoDados.dados.formasPagamento.find(f=>f.tipo==='resumo').limiteTotal,'R$ 3.700,00');
});
