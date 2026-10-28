const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {ambienteProtecao,fixture,personal}=require('./fixtures/protecao-mocks.cjs');
function ambiente(){const a=ambienteProtecao(fixture([personal('Despesa fictícia',25)]));a.ativar();const criar=a.ctx.ScriptApp.newTrigger;a.ctx.ScriptApp.newTrigger=n=>{const b=criar(n);b.after=ms=>{assert.equal(ms,1000);return b;};return b;};a.ctx.ScriptApp.deleteTrigger=t=>{const i=a.gatilhos.indexOf(t);assert(i>=0);a.gatilhos.splice(i,1);};return a;}
const solicitar=a=>a.ctx.executarAcaoApi_('ativarOrganizacaoAnualWeb',{});
const pendentes=a=>a.gatilhos.filter(t=>t.getHandlerFunction()==='retomarAtivacaoAnualGestor');
test('API só agenda e retorna antes do backup ou da criação de anos; reenvio mantém identificação e gatilho único',()=>{
 const a=ambiente(),r=solicitar(a);assert.equal(r.ativacaoAnual.estado,'AGENDADA');assert.equal(a.arquivos.size,0);assert.equal(a.planilhas.size,1);const repetido=solicitar(a);assert.equal(repetido.ativacaoAnual.id,r.ativacaoAnual.id);assert.equal(pendentes(a).length,1);
});
test('ponte nativa do Apps Script também agenda sem executar o trabalho financeiro na resposta',()=>{
 const a=ambiente(),r=JSON.parse(a.ctx.apiCallServidor('ativarOrganizacaoAnualWeb',{}));assert.equal(r.sucesso,true);assert.equal(r.dados.ativacaoAnual.estado,'AGENDADA');assert.equal(a.arquivos.size,0);assert.equal(a.planilhas.size,1);
});
test('worker conclui após a conexão original terminar e conserva o agendamento diário',()=>{
 const a=ambiente(),r=solicitar(a);a.ctx.retomarAtivacaoAnualGestor();const s=a.ctx.obterStatusProtecaoWeb();assert.equal(s.ativacaoAnual.estado,'CONCLUIDA');assert.equal(s.ativacaoAnual.id,r.ativacaoAnual.id);assert.equal(s.organizacaoAnual,true);assert.equal(s.pdfAutomatico,true);assert.equal(pendentes(a).length,0);assert.equal(a.gatilhos.filter(t=>t.getHandlerFunction()==='rotinaProtecaoProgramadaGestor').length,1);
 const quantidade=a.planilhas.size;solicitar(a);a.ctx.retomarAtivacaoAnualGestor();assert.equal(a.planilhas.size,quantidade);
});
test('falha após gravar uma aba mantém o plano e a retomada não duplica despesas ou arquivos anuais',()=>{
 const a=ambiente(),id=solicitar(a).ativacaoAnual.id;a.db.failure={name:'Lançamentos',stage:'after',row:2};assert.throws(()=>a.ctx.retomarAtivacaoAnualGestor(),/FALHA SIMULADA/);assert.equal(a.ctx.statusAtivacaoAnualGestor_().estado,'ERRO');
 const arquivos=a.planilhas.size;assert.equal(solicitar(a).ativacaoAnual.id,id);a.ctx.retomarAtivacaoAnualGestor();assert.equal(a.ctx.statusAtivacaoAnualGestor_().estado,'CONCLUIDA');assert.equal(a.planilhas.size,arquivos);assert.equal(a.ctx.matrizFinanceiraAnualGestor_(a.db,'Lançamentos').length,2);
});
test('execução interrompida é identificada e retoma com a mesma identificação',()=>{
 const a=ambiente(),j=solicitar(a).ativacaoAnual;j.estado='EXECUTANDO';j.atualizadaEm=new Date(Date.now()-11*60*1000).toISOString();a.props.set('GESTOR_ATIVACAO_ANUAL_V1',JSON.stringify(j));assert.equal(a.ctx.statusAtivacaoAnualGestor_().interrompida,true);assert.equal(solicitar(a).ativacaoAnual.id,j.id);a.ctx.retomarAtivacaoAnualGestor();assert.equal(a.ctx.statusAtivacaoAnualGestor_().estado,'CONCLUIDA');
});
test('plano completamente preparado é retomado antes de repetir a organização',()=>{
 const a=ambiente();solicitar(a);const aplicar=a.ctx.aplicarPlanoGestor_;let capturado;
 a.ctx.aplicarPlanoGestor_=(ss,p)=>{capturado=p;throw Error('Interrupção simulada');};assert.throws(()=>a.ctx.retomarAtivacaoAnualGestor(),/Interrupção/);a.ctx.aplicarPlanoGestor_=aplicar;
 const diario=a.db.sheets['_Gestor_Operacoes'],linha=diario.rows.findIndex(r=>r[2]==='PRONTO'&&String(r[0]).startsWith('organizarAnos:'));assert(linha>=0);diario.rows[linha][2]='PREPARANDO';assert(capturado);
 solicitar(a);a.ctx.retomarAtivacaoAnualGestor();assert.equal(a.ctx.statusAtivacaoAnualGestor_().estado,'CONCLUIDA');assert.equal(a.ctx.matrizFinanceiraAnualGestor_(a.db,'Lançamentos').length,2);
});
test('falha de autorização para agendar fica explícita sem ativar a organização',()=>{
 const a=ambiente();a.ctx.ScriptApp.newTrigger=()=>{throw Error('Autorize a conta');};assert.throws(()=>solicitar(a),/Autorize/);assert.equal(a.ctx.statusAtivacaoAnualGestor_().estado,'ERRO');assert.equal(a.ctx.configProtecaoGestor_().organizacaoAnual,undefined);
});
test('disputa de trava responde sem iniciar outra ativação nem liberar a trava alheia',()=>{
 const a=ambiente();a.lock.has=true;assert.throws(()=>solicitar(a),/operação em andamento/);assert.equal(a.lock.has,true);assert.equal(a.props.has('GESTOR_ATIVACAO_ANUAL_V1'),false);a.lock.has=false;
});
test('estados da tela não anunciam concluído enquanto o trabalho está agendado, executando ou com erro',()=>{
 const s=fs.readFileSync('interface/protecao.js','utf8'),c=vm.createContext({});vm.runInContext(s.slice(s.indexOf('function situacaoProtecaoLegivelGestor'),s.indexOf('function detalheFechamentoAnualGestor')),c);
 for(const estado of ['AGENDADA','EXECUTANDO','ERRO']){const r=c.situacaoProtecaoLegivelGestor({rotinaInstalada:true,organizacaoAnual:true,pdfAutomatico:true,ativacaoAnual:{estado}});assert(!r.anual.endsWith(': ativada'));assert.match(r.pdf,/aguardando/);}
});
