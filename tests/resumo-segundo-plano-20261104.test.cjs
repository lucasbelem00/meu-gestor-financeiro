const {test}=require('node:test'),assert=require('node:assert/strict');
const {ambienteProtecao,fixture,launch}=require('./fixtures/protecao-mocks.cjs');
const api=(a,n,p)=>a.ctx.executarAcaoApi_(n,p);
function ambiente(){
 const a=ambienteProtecao(fixture());a.carregar();
 const criar=a.ctx.ScriptApp.newTrigger;a.ctx.ScriptApp.newTrigger=function(nome){const b=criar(nome);b.everyMinutes=n=>{assert.equal(n,5);return b;};return b;};
 return a;
}
const estado=a=>a.ctx.situacaoResumoPlanilhaGestor_();
const salvar=(a,id)=>api(a,'salvarLancamentoWeb',{...launch,requestId:id,incluirAtualizacaoDados:true});

test('ativação instala uma rotina independente do app, sem duplicar gatilhos ou liberar modo antes de instalar',()=>{
 const a=ambiente();assert.equal(estado(a).modo,'imediato');
 a.ctx.ativarResumoEmSegundoPlanoGestor();a.ctx.ativarResumoEmSegundoPlanoGestor();
 assert.equal(a.gatilhos.filter(t=>t.getHandlerFunction()==='rotinaResumoPlanilhaGestor').length,1);assert.equal(estado(a).modo,'segundo_plano');
 const b=ambiente();b.ctx.ScriptApp.newTrigger=()=>{throw Error('sem autorização');};assert.throws(()=>b.ctx.ativarResumoEmSegundoPlanoGestor(),/autorização/);assert.equal(estado(b).modo,'imediato');
});

test('salvar confirma finanças sem executar resumo e tarefa sobrevive sem outra chamada do cliente',()=>{
 const a=ambiente();a.ctx.ativarResumoEmSegundoPlanoGestor();a.ctx.rotinaResumoPlanilhaGestor();
 const anterior=JSON.stringify(a.db.sheets['_Gestor_Resumo'].rows),gerar=a.ctx.atualizarResumoNativoGestor_;let chamadas=0;
 a.ctx.atualizarResumoNativoGestor_=(...args)=>{chamadas++;return gerar(...args);};
 const r=salvar(a,'resumo-async-salvar-001');assert.equal(chamadas,0);assert.equal(r.atualizacaoDados.dados.resumoPlanilha.pendente,true);
 assert(a.db.sheets['_Gestor_Operacoes'].rows.some(r=>r[0]==='salvarLancamentoWeb:resumo-async-salvar-001'&&r[2]==='CONFIRMADO'));
 assert.equal(JSON.stringify(a.db.sheets['_Gestor_Resumo'].rows),anterior);assert.equal(estado(a).pendente,true);
 assert.equal(a.ctx.rotinaResumoPlanilhaGestor().sucesso,true);assert.equal(chamadas,1);assert.equal(estado(a).pendente,false);
 assert.notEqual(JSON.stringify(a.db.sheets['_Gestor_Resumo'].rows),anterior);
});

test('múltiplos envios são agrupados e execução repetida é inofensiva',()=>{
 const a=ambiente();a.ctx.ativarResumoEmSegundoPlanoGestor();
 salvar(a,'resumo-lote-001');salvar(a,'resumo-lote-002');salvar(a,'resumo-lote-003');
 a.ctx.rotinaResumoPlanilhaGestor();const linhas=JSON.stringify(a.db.sheets['_Gestor_Resumo'].rows);
 assert.equal(a.ctx.rotinaResumoPlanilhaGestor().pendente,false);assert.equal(JSON.stringify(a.db.sheets['_Gestor_Resumo'].rows),linhas);
 assert.equal(a.db.sheets['_Gestor_Resumo'].rows.slice(4).reduce((s,r)=>s+r[5],0),300);
});

test('interrupção após PRONTO mantém tarefa mas impede resumo parcial; recuperação permite concluir depois',()=>{
 const a=ambiente();a.ctx.ativarResumoEmSegundoPlanoGestor();const aplicar=a.ctx.aplicarPlanoGestor_;
 a.ctx.aplicarPlanoGestor_=()=>{throw Error('interrupção simulada');};assert.throws(()=>salvar(a,'resumo-interrompido-001'),/interrupção/);
 assert.equal(estado(a).pendente,true);assert.equal(a.ctx.rotinaResumoPlanilhaGestor().aguardandoConferencia,true);
 a.ctx.aplicarPlanoGestor_=aplicar;a.carregar();assert.equal(a.ctx.rotinaResumoPlanilhaGestor().sucesso,true);assert.equal(estado(a).pendente,false);
 assert.equal(a.db.sheets['Lançamentos'].rows.length,4);
});

test('falha do resumo e da conclusão preservam tarefa para repetição, sem repetir gravação financeira',()=>{
 const a=ambiente();a.ctx.ativarResumoEmSegundoPlanoGestor();salvar(a,'resumo-retry-001');const gerar=a.ctx.atualizarResumoNativoGestor_;
 a.ctx.atualizarResumoNativoGestor_=()=>{throw Error('falha temporária');};assert.equal(a.ctx.rotinaResumoPlanilhaGestor().sucesso,false);assert.equal(estado(a).pendente,true);assert.match(estado(a).erro,/temporária/);
 a.ctx.atualizarResumoNativoGestor_=gerar;a.ctx.rotinaResumoPlanilhaGestor();assert.equal(estado(a).pendente,false);assert.equal(estado(a).erro,'');
 salvar(a,'resumo-retry-002');const concluir=a.ctx.concluirResumoAssincronoGestor_;a.ctx.concluirResumoAssincronoGestor_=()=>{throw Error('falha ao concluir marca');};
 assert.equal(a.ctx.rotinaResumoPlanilhaGestor().sucesso,false);assert.equal(estado(a).pendente,true);
 a.ctx.concluirResumoAssincronoGestor_=concluir;assert.equal(a.ctx.rotinaResumoPlanilhaGestor().sucesso,true);assert.equal(estado(a).pendente,false);
 assert.equal(a.db.sheets['Lançamentos'].rows.length,7);
});

test('intenção já está durável antes de PRONTO e fórmula particular mantém resumo imediato',()=>{
 const a=ambiente();a.ctx.ativarResumoEmSegundoPlanoGestor();a.ctx.rotinaResumoPlanilhaGestor();const sh=a.db.sheets['_Gestor_Operacoes'],ler=sh.getRange;let pronto=false;
 sh.getRange=function(...args){const r=ler.apply(this,args),gravar=r.setValue;r.setValue=function(v){if(v==='PRONTO'&&!pronto){assert.equal(estado(a).pendente,true);pronto=true;}return gravar.call(this,v);};return r;};
 salvar(a,'resumo-ordem-001');assert.equal(pronto,true);a.ctx.rotinaResumoPlanilhaGestor();
 a.db.sheets['Dashboard & Resumo'].getRange(17,4).setValue('=500');salvar(a,'resumo-formula-001');assert.equal(estado(a).pendente,false);
});

test('trava ocupada não perde tarefa e troca de base não processa a intenção de outra planilha',()=>{
 const a=ambiente();a.ctx.ativarResumoEmSegundoPlanoGestor();a.lock.has=true;
 assert.equal(a.ctx.rotinaResumoPlanilhaGestor().ocupado,true);assert.equal(estado(a).pendente,true);a.lock.has=false;
 a.props.set('GESTOR_PLANILHA_ID','outra-base');assert.equal(a.ctx.rotinaResumoPlanilhaGestor().pendente,false);assert.equal(estado(a).modo,'imediato');
});

test('manutenção interrompida também impede materialização de fotografia parcial',()=>{
 const a=ambiente();a.ctx.ativarResumoEmSegundoPlanoGestor();const sh=a.db.insertSheet('_Gestor_Manutencao');
 sh.getRange(1,1,2,6).setValues([['Operação','Estado','Arquivo do plano','SHA256','Data','Detalhe'],['manutencao-teste','PRONTO','','','','']]);
 assert.equal(a.ctx.rotinaResumoPlanilhaGestor().aguardandoConferencia,true);assert.equal(estado(a).pendente,true);
 sh.getRange(2,2).setValue('CONFIRMADO');assert.equal(a.ctx.rotinaResumoPlanilhaGestor().sucesso,true);
});

test('falha ao persistir intenção usa caminho síncrono e não confirma tarefa inexistente',()=>{
 const a=ambiente();a.ctx.ativarResumoEmSegundoPlanoGestor();a.ctx.rotinaResumoPlanilhaGestor();
 const obter=a.ctx.PropertiesService.getScriptProperties;let falhar=true;
 a.ctx.PropertiesService.getScriptProperties=()=>{const p=obter(),gravar=p.setProperty;p.setProperty=(k,v)=>{if(k==='GESTOR_RESUMO_ASSINCRONO_V1'&&falhar){falhar=false;throw Error('quota temporária');}return gravar(k,v);};return p;};
 const r=salvar(a,'resumo-fallback-001');assert(r);assert.equal(estado(a).pendente,false);assert.equal(a.db.sheets['_Gestor_Resumo'].rows.slice(4).reduce((s,r)=>s+r[5],0),100);
});
