const {test}=require('node:test'),assert=require('node:assert/strict');
const {ambienteProtecao,fixture,launch}=require('./fixtures/protecao-mocks.cjs');
function ambiente(){
 const a=ambienteProtecao(fixture());a.carregar();
 const criar=a.ctx.ScriptApp.newTrigger;
 a.ctx.ScriptApp.newTrigger=nome=>{const b=criar(nome);b.everyMinutes=()=>b;b.after=ms=>{assert.equal(ms,120000);return b;};return b;};
 a.ctx.ScriptApp.deleteTrigger=t=>a.gatilhos.splice(a.gatilhos.indexOf(t),1);
 const cache=new Map();a.ctx.CacheService={getScriptCache:()=>({put:(k,v)=>cache.set(k,v),get:k=>cache.get(k)||null})};
 return {...a,cache};
}
test('resumo cede ao uso recente, mantém finanças confirmadas e não adia além do orçamento',()=>{
 const a=ambiente();a.ctx.ativarResumoEmSegundoPlanoGestor();
 a.ctx.executarAcaoApi_('salvarLancamentoWeb',{...launch,requestId:'prioridade-resumo-001'});
 assert.equal(a.ctx.usoRecenteAppGestor_(),true);
 const antes=JSON.stringify(a.db.sheets['Lançamentos'].rows);
 assert.equal(a.ctx.rotinaResumoPlanilhaGestor().adiadoPorUso,true);
 assert.equal(a.ctx.situacaoResumoPlanilhaGestor_().pendente,true);
 const s=JSON.parse(a.props.get('GESTOR_RESUMO_ASSINCRONO_V1'));s.adiadoDesde=Date.now()-300001;
 a.props.set('GESTOR_RESUMO_ASSINCRONO_V1',JSON.stringify(s));
 assert.equal(a.ctx.rotinaResumoPlanilhaGestor().sucesso,true);
 assert.equal(a.ctx.situacaoResumoPlanilhaGestor_().pendente,false);
 assert.equal(JSON.stringify(a.db.sheets['Lançamentos'].rows),antes);
 assert.equal(JSON.parse(a.props.get('GESTOR_RESUMO_ASSINCRONO_V1')).adiadoDesde,undefined);
});
test('cache indisponível e rotina automática não criam prioridade falsa',()=>{
 const a=ambiente();a.ctx.marcarUsoRecenteAppGestor_('processarModelosRecorrenciaGestor');assert.equal(a.cache.size,0);
 a.ctx.CacheService.getScriptCache=()=>{throw Error('indisponível');};
 assert.doesNotThrow(()=>a.ctx.marcarUsoRecenteAppGestor_('salvarLancamentoWeb'));
 assert.equal(a.ctx.usoRecenteAppGestor_(),false);
 a.ctx.ativarResumoEmSegundoPlanoGestor();assert.equal(a.ctx.rotinaResumoPlanilhaGestor().sucesso,true);
});
test('proteção agenda retomada única e orçamento expirado libera execução normal',()=>{
 const a=ambiente();a.ctx.marcarUsoRecenteAppGestor_('getDadosCompletos');
 assert.equal(a.ctx.rotinaProtecaoProgramadaGestor().adiadoPorUso,true);
 assert.equal(a.ctx.rotinaProtecaoProgramadaGestor().adiadoPorUso,true);
 assert.equal(a.gatilhos.filter(t=>t.getHandlerFunction()==='retomarProtecaoProgramadaPorUsoGestor').length,1);
 a.props.set('GESTOR_ADIAMENTO_PROTECAO_V1',String(Date.now()-300001));
 assert.equal(a.ctx.adiarProtecaoProgramadaPorUsoGestor_(),false);
 assert.equal(a.props.has('GESTOR_ADIAMENTO_PROTECAO_V1'),false);
});
test('falha no gatilho não confirma adiamento; retomada preserva gatilho diário',()=>{
 const a=ambiente();a.ctx.marcarUsoRecenteAppGestor_('getDadosCompletos');
 const criar=a.ctx.ScriptApp.newTrigger;a.ctx.ScriptApp.newTrigger=()=>{throw Error('quota');};
 assert.equal(a.ctx.adiarProtecaoProgramadaPorUsoGestor_(),false);
 a.ctx.ScriptApp.newTrigger=criar;a.ctx.adiarProtecaoProgramadaPorUsoGestor_();
 criar('rotinaProtecaoProgramadaGestor').create();let chamadas=0;
 a.ctx.rotinaProtecaoProgramadaGestor=()=>{chamadas++;return 'retomou';};
 assert.equal(a.ctx.retomarProtecaoProgramadaPorUsoGestor(),'retomou');assert.equal(chamadas,1);
 assert.deepEqual(a.gatilhos.map(t=>t.getHandlerFunction()),['rotinaProtecaoProgramadaGestor']);
});
