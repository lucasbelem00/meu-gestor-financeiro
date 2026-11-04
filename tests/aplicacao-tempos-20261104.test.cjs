const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {boot,fixture,launch}=require('./fixtures/gestor-mocks.cjs');

test('salvamento medido mantém confirmação e só publica durações das etapas permitidas',()=>{
 const a=boot(fixture());a.ctx.salvarLancamentoWeb({...launch,incluirAtualizacaoDados:true,requestId:'medicao-aplicacao-001'});
 const m=JSON.parse(vm.runInContext('JSON.stringify(TEMPOS_RESPOSTA_GESTOR_)',a.ctx));
 for(const k of ['prepararBaseMs','prepararManutencaoMs','prepararDiarioMs','aplicarDestinosMs','aplicarLeituraMs','aplicarEscritaMs','aplicarFormatosMs','aplicarFlushMs','aplicarConferenciaMs'])assert(Number.isFinite(m.detalhesGravacao[k]),k);
 for(const k of ['prepararCancelamentoMs','prepararPendenciasMs','prepararRecuperacaoMs','prepararReenvioMs','planoMudancasMs','planoAnualMs','atualizacaoPrepararMs','atualizacaoRecorrenciasMs','atualizacaoDadosMs','atualizacaoConferenciaMs'])assert(Number.isFinite(m.detalhesGravacao[k]),k);
 for(const k of ['abasPlano','blocosEscritos','celulasEscritas'])assert(Number.isInteger(m.detalhesGravacao[k])&&m.detalhesGravacao[k]>0,k);
 assert.equal(a.db.sheets['_Gestor_Operacoes'].rows[1][2],'CONFIRMADO');assert.equal(a.db.sheets['Lançamentos'].rows.filter(r=>r[1]==='Teste').length,3);
});

test('falha de escrita continua pendente e libera trava mesmo com medições habilitadas',()=>{
 const a=boot(fixture());a.db.failure={name:'Lançamentos',stage:'before',row:1};
 assert.throws(()=>a.ctx.salvarLancamentoWeb({...launch,requestId:'medicao-aplicacao-falha'}),/FALHA/);
 assert(a.db.sheets['_Gestor_Operacoes'].rows.some(r=>r[2]==='PRONTO'));assert.equal(a.lock.has,false);
 const m=JSON.parse(vm.runInContext('JSON.stringify(TEMPOS_RESPOSTA_GESTOR_)',a.ctx));assert(Number.isFinite(m.detalhesGravacao.aplicarEscritaMs));
});
