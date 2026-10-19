const {test}=require('node:test'),assert=require('node:assert/strict');
const {boot,fixture}=require('./fixtures/gestor-mocks.cjs');
function ambiente(){const x=boot(fixture());x.ctx.console={log(){},error(){}};return {...x,versao:g=>x.ctx.versaoConfiguracaoGestor_(x.db,g)};}
const cartao={nomeOriginal:'Cartao',nome:'Cartao',banco:'Banco',limite:2000,fechamento:5,vencimento:10};
test('edição antiga de cartão conflita e reenvio confirmado permanece idempotente',()=>{
 const {ctx,db,versao}=ambiente();const v=versao('formas');const p={...cartao,versaoConfiguracao:v,requestId:'cartao-versao-001'};
 ctx.salvarFormaPagamentoWeb(p);
 assert.throws(()=>ctx.salvarFormaPagamentoWeb({...p,limite:1000,fechamento:6,requestId:'cartao-versao-002'}),/desatualizada/);
 assert.equal(db.sheets['Formas de Pagamento'].rows[6][3],2000);
 ctx.salvarFormaPagamentoWeb(p);assert.equal(db.sheets['Formas de Pagamento'].rows[6][3],2000);
 assert.notEqual(versao('formas'),v);
});
test('renomear, excluir e reordenar cartão exigem versão atual',()=>{
 const {ctx,db,versao}=ambiente();const v=versao('formas');ctx.salvarFormaPagamentoWeb({...cartao,versaoConfiguracao:v,requestId:'cartao-mudar-001'});
 for(const [acao,param]of [['salvarFormaPagamentoWeb',{...cartao,nome:'Renomeado'}],['excluirFormaPagamentoWeb',{nome:'Cartao'}],['reordenarFormasPagamentoWeb',{ordem:['Cartao']}]])assert.throws(()=>ctx[acao]({...param,versaoConfiguracao:v,requestId:'cartao-conflito-'+acao}),/desatualizada/);
 assert.equal(db.sheets['Formas de Pagamento'].rows[6][1],'Cartao');
});
test('cartão recusa limite negativo e dias fora de faixa antes de alterar configuração',()=>{
 const {ctx,db,versao}=ambiente();const antes=JSON.stringify(db.sheets['Formas de Pagamento'].rows);
 for(const [i,extra] of [{limite:-1},{limite:Infinity},{limite:'abc'},{fechamento:0},{vencimento:99},{vencimento:'12x'},{fechamento:1.5}].entries())assert.throws(()=>ctx.salvarFormaPagamentoWeb({...cartao,...extra,versaoConfiguracao:versao('formas'),requestId:'cartao-invalido-'+i}),/Limite|Fechamento|Vencimento/);
 assert.equal(JSON.stringify(db.sheets['Formas de Pagamento'].rows),antes);
 ctx.salvarFormaPagamentoWeb({...cartao,fechamento:'',vencimento:'',versaoConfiguracao:versao('formas'),requestId:'cartao-dias-vazios'});
 assert.equal(db.sheets['Formas de Pagamento'].rows[6][4],'');
});
test('categorias recusam excesso, nomes duplicados e metas inválidas sem descartar registros',()=>{
 const {ctx,db,versao}=ambiente();const antes=JSON.stringify(db.sheets['Dashboard & Resumo'].rows);
 const listas=[Array.from({length:26},(_,i)=>({nome:'Categoria '+i,meta:0})),[{nome:'Saúde 💊',meta:1},{nome:'Saude',meta:2}],[{nome:'Teste',meta:-1}],[{nome:'',meta:0}]];
 for(const [i,categorias]of listas.entries())assert.throws(()=>ctx.salvarCategoriasWeb({categorias,versaoConfiguracao:versao('categorias'),requestId:'categorias-invalidas-'+i}),/25|único|Meta/);
 assert.equal(JSON.stringify(db.sheets['Dashboard & Resumo'].rows),antes);
});
test('categorias antigas não substituem configuração recente e API anuncia versões',()=>{
 const {ctx,db,versao}=ambiente();const v=versao('categorias');
 ctx.salvarCategoriasWeb({categorias:[{nome:'Teste',meta:200}],versaoConfiguracao:v,requestId:'categorias-atuais-001'});
 assert.throws(()=>ctx.salvarCategoriasWeb({categorias:[{nome:'Antiga',meta:100}],versaoConfiguracao:v,requestId:'categorias-antigas-001'}),/desatualizada/);
 assert.equal(db.sheets['Dashboard & Resumo'].rows[16][1],'Teste');
 const res=ctx.executarAcaoApi_('getDadosCompletos',null);assert.equal(res.versoesConfiguracao.categorias,versao('categorias'));assert.equal(res.versoesConfiguracao.formas,versao('formas'));
});
test('configuração sem versão é recusada e uma nova versão permite salvar',()=>{
 const {ctx,versao}=ambiente();assert.throws(()=>ctx.salvarFormaPagamentoWeb({...cartao,requestId:'cartao-sem-versao-001'}),/desatualizada/);
 ctx.salvarFormaPagamentoWeb({...cartao,versaoConfiguracao:versao('formas'),requestId:'cartao-com-versao-001'});
});
test('snapshot virtual reaproveita valores calculados sem perder fórmulas',()=>{
 const {ctx,db}=ambiente();const sh=db.sheets['Formas de Pagamento'];sh.rows[6][3]='=1000+1000';
 let leituras=0;const getDataRange=sh.getDataRange.bind(sh);sh.getDataRange=()=>{const r=getDataRange(),getValues=r.getValues;r.getValues=()=>{leituras++;return getValues();};return r;};
 const ss=ctx.criarPlanilhaVirtualGestor_(db,{});const virtual=ss.getSheetByName('Formas de Pagamento');
 assert.equal(leituras,1);assert.equal(virtual.getRange('D7').getValues()[0][0],2000);assert.equal(virtual.getRange('D7').getFormulas()[0][0],'=1000+1000');assert.equal(leituras,1);
});


test('pedido de categorias sem lista não apaga o conjunto existente',()=>{
 const {ctx,db,versao}=ambiente();const antes=JSON.stringify(db.sheets['Dashboard & Resumo'].rows);
 assert.throws(()=>ctx.salvarCategoriasWeb({versaoConfiguracao:versao('categorias'),requestId:'categorias-sem-lista-001'}),/25 categorias/);assert.equal(JSON.stringify(db.sheets['Dashboard & Resumo'].rows),antes);
});
