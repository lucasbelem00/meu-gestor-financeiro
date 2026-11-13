const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {boot,fixture,personal,launch}=require('./fixtures/gestor-mocks.cjs');
test('ano reutiliza abertura mas relê células, fórmulas, identidade e hash do fechamento',()=>{
 const {ambienteProtecao}=require('./fixtures/protecao-mocks.cjs'),a=ambienteProtecao(fixture([personal('Compra',10)]));a.ativar();
 const e=a.ctx.garantirAnoGestor_(a.db,2026),b=a.planilhas.get(e.id),abrir=a.ctx.SpreadsheetApp.openById;let aberturas=0;
 a.ctx.SpreadsheetApp.openById=id=>{if(id===e.id)aberturas++;return abrir(id);};vm.runInContext('HASHES_EXECUCAO_GESTOR_=new Map()',a.ctx);
 a.ctx.dadosAnoGestor_(e);a.ctx.dadosAnoGestor_(e);assert.equal(aberturas,1);
 b.sheets['Lançamentos'].getRange(1,1).setValue('=10');assert.throws(()=>a.ctx.dadosAnoGestor_(e),/fórmulas/);
 b.sheets['Lançamentos'].getRange(1,1).setValue('Data');const d=a.ctx.dadosAnoGestor_(e),fechado={...e,estado:'FECHADO',hash:a.ctx.hashGestor_(d)};
 a.ctx.dadosAnoGestor_(fechado);b.sheets['Lançamentos'].getRange(1,1).setValue('Alterado');assert.throws(()=>a.ctx.dadosAnoGestor_(fechado),/fechado.*alterado/);
 b.sheets['Leia-me'].getRange(2,2).setValue('outra-base');assert.throws(()=>a.ctx.dadosAnoGestor_(e),/não pertence/);
 assert.equal(aberturas,1);vm.runInContext('HASHES_EXECUCAO_GESTOR_=null',a.ctx);
});
test('reutiliza abertura somente no executor, sem guardar valores ou falhas de abertura',()=>{
 const a=boot(fixture([personal('Primeiro',10)]));let aberturas=0;
 a.ctx.SpreadsheetApp.openById=id=>{aberturas++;if(id==='falha')throw Error('indisponível');return a.db;};
 vm.runInContext('HASHES_EXECUCAO_GESTOR_=new Map()',a.ctx);
 const ss=a.ctx.abrirPlanilhaPorIdGestor_('fixture');assert.equal(a.ctx.abrirPlanilhaPorIdGestor_('fixture'),ss);assert.equal(aberturas,1);
 assert.equal(ss.getSheetByName('Lançamentos').getRange(2,8).getValue(),10);
 a.db.sheets['Lançamentos'].rows[1][7]=25;
 assert.equal(a.ctx.abrirPlanilhaPorIdGestor_('fixture').getSheetByName('Lançamentos').getRange(2,8).getValue(),25);
 for(let i=0;i<2;i++)assert.throws(()=>a.ctx.abrirPlanilhaPorIdGestor_('falha'),/indisponível/);assert.equal(aberturas,3);
 vm.runInContext('HASHES_EXECUCAO_GESTOR_=new Map()',a.ctx);a.ctx.abrirPlanilhaPorIdGestor_('fixture');assert.equal(aberturas,4);
 vm.runInContext('HASHES_EXECUCAO_GESTOR_=null',a.ctx);a.ctx.abrirPlanilhaPorIdGestor_('fixture');a.ctx.abrirPlanilhaPorIdGestor_('fixture');assert.equal(aberturas,6);
});
test('executor limpa referências após sucesso e falha; diagnóstico exporta só contagens e duração',()=>{
 const a=boot(fixture());a.ctx.executarAcaoApi_('getDadosCompletos');
 a.ctx.executarAcaoApi_('salvarLancamentoWeb',{...launch,requestId:'referencias-salvar-001'});
 assert.equal(vm.runInContext('HASHES_EXECUCAO_GESTOR_',a.ctx),null);
 const d=vm.runInContext('TEMPOS_RESPOSTA_GESTOR_.detalhesGravacao',a.ctx);
 assert(d.planilhasAbertas>=1);assert(Number.isFinite(d.abrirPlanilhaMs));assert(!JSON.stringify(d).includes('fixture'));
 assert.throws(()=>a.ctx.executarOperacaoGestor_('leituraTeste',{},()=>{a.ctx.abrirPlanilhaPorIdGestor_('fixture');throw Error('falha controlada');},true),/falha controlada/);
 assert.equal(vm.runInContext('HASHES_EXECUCAO_GESTOR_',a.ctx),null);assert.equal(a.lock.has,false);
});
test('metas usam bloco único mantendo vazios, fórmulas e coluna intermediária',()=>{
 const a=boot(fixture()),sh=a.db.sheets['Dashboard & Resumo'];
 sh.rows[16]=['','Saúde','não é meta','=125'];sh.rows[17]=['','','intermediário',999];sh.rows[18]=['','Outros 📦','',50];
 const original=sh.getRange;let leituras=0;sh.getRange=function(...args){const r=original.apply(this,args),ler=r.getValues;r.getValues=()=>{leituras++;return ler();};return r;};
 const m=a.ctx.lerMetasCategorias();assert.equal(m['Saúde'],125);assert.equal(m['Outros 📦'],50);assert.equal(m[''],undefined);assert.equal(leituras,1);
});
test('tipo e identidade compartilham valores, mas mantêm recusa de fórmula no tipo',()=>{
 const a=boot(fixture());a.ctx.executarAcaoApi_('getDadosCompletos');
 const sh=a.db.sheets['Formas de Pagamento'],original=sh.getDataRange;let leituras=0;
 sh.getDataRange=function(){const r=original.call(this),ler=r.getValues;r.getValues=()=>{leituras++;return ler();};return r;};
 assert.equal(a.ctx.tipoFormaGestor_('Cartao',a.db),'cartao');assert.equal(leituras,1);
 const col=a.ctx.colunaTipoFormaGestor_(sh,false);sh.getRange(7,col).setValue('=1');
 assert.throws(()=>a.ctx.tipoFormaGestor_('Cartao',a.db),/tipo|Tipo/);
});

test('referências de abas evitam consultas repetidas, sem memorizar células nem ausências',()=>{const a=boot(fixture([personal('Primeiro',10)])),original=a.db.getSheetByName;let consultas=0;a.db.getSheetByName=function(n){consultas++;return original.call(this,n);};vm.runInContext('HASHES_EXECUCAO_GESTOR_=new Map()',a.ctx);const sh=a.ctx.obterAbaExecucaoGestor_(a.db,'Lançamentos');for(let i=0;i<10;i++)assert.equal(a.ctx.obterAbaExecucaoGestor_(a.db,'Lançamentos'),sh);assert.equal(consultas,1);sh.rows[1][7]=27;assert.equal(a.ctx.obterAbaExecucaoGestor_(a.db,'Lançamentos').getRange(2,8).getValue(),27);assert.equal(a.ctx.obterAbaExecucaoGestor_(a.db,'Nova'),null);a.db.insertSheet('Nova');assert(a.ctx.obterAbaExecucaoGestor_(a.db,'Nova'));vm.runInContext('HASHES_EXECUCAO_GESTOR_=new Map()',a.ctx);a.ctx.obterAbaExecucaoGestor_(a.db,'Lançamentos');assert.equal(consultas,4);vm.runInContext('HASHES_EXECUCAO_GESTOR_=null',a.ctx);a.ctx.obterAbaExecucaoGestor_(a.db,'Lançamentos');a.ctx.obterAbaExecucaoGestor_(a.db,'Lançamentos');assert.equal(consultas,6);});

test('metadados anuais reutilizam referências, mas identidade e células são relidas',()=>{const {ambienteProtecao}=require('./fixtures/protecao-mocks.cjs'),a=ambienteProtecao(fixture([personal('Compra',10)]));a.ativar();const e=a.ctx.garantirAnoGestor_(a.db,2026),b=a.planilhas.get(e.id),listar=b.getSheets;let listas=0;b.getSheets=function(){listas++;return listar.call(this)};vm.runInContext('HASHES_EXECUCAO_GESTOR_=new Map();HASHES_EXECUCAO_GESTOR_.detalhesIOGestor={}',a.ctx);a.ctx.dadosAnoGestor_(e);a.ctx.dadosAnoGestor_(e);assert.equal(listas,1);assert.equal(vm.runInContext('HASHES_EXECUCAO_GESTOR_.detalhesIOGestor.anoMetadadosReutilizados',a.ctx),1);b.sheets['Leia-me'].getRange(2,2).setValue('outra-base');assert.throws(()=>a.ctx.dadosAnoGestor_(e),/não pertence/);assert.equal(listas,1);});

test('aplicação e ano fechado reconferem enumeração mesmo com referências já abertas',()=>{const {ambienteProtecao}=require('./fixtures/protecao-mocks.cjs'),a=ambienteProtecao(fixture([personal('Compra',10)]));a.ativar();const e=a.ctx.garantirAnoGestor_(a.db,2026),b=a.planilhas.get(e.id),listar=b.getSheets;let listas=0;b.getSheets=function(){listas++;return listar.call(this)};vm.runInContext('HASHES_EXECUCAO_GESTOR_=new Map()',a.ctx);const d=a.ctx.dadosAnoGestor_(e);vm.runInContext('HASHES_EXECUCAO_GESTOR_.aplicandoPlanoGestor=true',a.ctx);a.ctx.dadosAnoGestor_(e);assert.equal(listas,2);vm.runInContext('HASHES_EXECUCAO_GESTOR_.aplicandoPlanoGestor=false',a.ctx);a.ctx.dadosAnoGestor_(e,'Lançamentos');assert.equal(listas,3);a.ctx.dadosAnoGestor_({...e,estado:'FECHADO',hash:a.ctx.hashGestor_(d)});assert.equal(listas,4);});
