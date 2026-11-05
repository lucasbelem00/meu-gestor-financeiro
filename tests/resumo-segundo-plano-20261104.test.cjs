const {test}=require('node:test'),assert=require('node:assert/strict');
const {ambienteProtecao,fixture,launch,personal,loan}=require('./fixtures/protecao-mocks.cjs');
const api=(a,n,p)=>a.ctx.executarAcaoApi_(n,p);
function ambiente(dados=fixture()){
 const a=ambienteProtecao(dados);a.carregar();
 const criar=a.ctx.ScriptApp.newTrigger;a.ctx.ScriptApp.newTrigger=function(nome){const b=criar(nome);b.everyMinutes=n=>{assert.equal(n,5);return b;};return b;};
 return a;
}
const estado=a=>a.ctx.situacaoResumoPlanilhaGestor_();
const salvar=(a,id)=>api(a,'salvarLancamentoWeb',{...launch,requestId:id,incluirAtualizacaoDados:true});

const acoesTerceiros=['salvarEmprestimoWeb','editarEmprestimoLinhaWeb','alternarStatusEmprestimoWeb','dividirParcelaEmprestimoWeb','excluirEmprestimoWeb','moverParaEmprestimosWeb','moverParaGastosPessoaisWeb'];
function prepararTerceiros(acao){
 const a=ambiente(fixture([personal('Pessoal',60)],[loan('Ana','A Receber',120,'Cartao')])),r=a.db.sheets[acao==='moverParaEmprestimosWeb'?'Lançamentos':'Empréstimos'].rows[1];
 const p={registroId:r[11],compraId:r[12],versao:r[13],linha:2,descricao:r[acao==='moverParaEmprestimosWeb'?1:2],mesFatura:r[8],parcela:r[6],descOriginal:r[2],mesOriginal:r[8],parcelaOriginal:r[6],requestId:'async-terceiros-'+acao};
 if(acao==='salvarEmprestimoWeb')Object.assign(p,{dataCompra:'16/10/2026',pessoa:'Bia',descricao:'Compra',formaPagto:'Cartao',valorTotal:30,numParcelas:1,parcelaInicial:1,mesPrimeiraFatura:'10/2026'});
 if(acao==='editarEmprestimoLinhaWeb')Object.assign(p,{dataCompra:r[0],pessoa:r[1],formaPagto:r[3],valorParcela:130,status:r[9],observacoes:r[10]});
 if(acao==='alternarStatusEmprestimoWeb')p.statusDesejado='Recebido';
 if(acao==='dividirParcelaEmprestimoWeb')p.valorRecebido=40;
 if(acao==='moverParaEmprestimosWeb')p.pessoa='Bia';
 if(acao==='moverParaGastosPessoaisWeb')p.categoria='Teste';
 return {a,p};
}
for(const acao of acoesTerceiros)test(acao+' confirma sem resumo síncrono, preserva reenvio e conclui pelo worker',()=>{
 const {a,p}=prepararTerceiros(acao);a.ctx.ativarResumoEmSegundoPlanoGestor();a.ctx.rotinaResumoPlanilhaGestor();
 const antes=JSON.stringify(a.db.sheets['_Gestor_Resumo'].rows),gerar=a.ctx.atualizarResumoNativoGestor_;let chamadas=0;
 a.ctx.atualizarResumoNativoGestor_=(...args)=>{chamadas++;return gerar(...args);};
 api(a,acao,p);assert.equal(chamadas,0);assert.equal(estado(a).pendente,true);assert.equal(JSON.stringify(a.db.sheets['_Gestor_Resumo'].rows),antes);
 assert(a.db.sheets['_Gestor_Operacoes'].rows.some(r=>r[0]===acao+':'+p.requestId&&r[2]==='CONFIRMADO'));
 const financeiro=()=>JSON.stringify(['Lançamentos','Empréstimos'].map(n=>a.db.sheets[n].rows)),confirmado=financeiro();
 api(a,acao,p);assert.equal(financeiro(),confirmado);assert.equal(chamadas,0);
 const dados=a.carregar();assert.equal(dados.resumoPlanilha.pendente,true);assert.equal(chamadas,0);assert.equal(dados.emprestimos.itens.length,a.db.sheets['Empréstimos'].rows.slice(1).filter(r=>r[11]).length);
 assert.equal(a.ctx.rotinaResumoPlanilhaGestor().sucesso,true);assert.equal(estado(a).pendente,false);assert.equal(chamadas,1);assert.equal(financeiro(),confirmado);
});

test('empréstimo interrompido continua PRONTO, worker espera e recuperação não duplica',()=>{
 const {a,p}=prepararTerceiros('salvarEmprestimoWeb');a.ctx.ativarResumoEmSegundoPlanoGestor();const aplicar=a.ctx.aplicarPlanoGestor_;
 a.ctx.aplicarPlanoGestor_=()=>{throw Error('interrupção terceiros');};assert.throws(()=>api(a,'salvarEmprestimoWeb',p),/interrupção terceiros/);assert.equal(estado(a).pendente,true);assert.equal(a.ctx.rotinaResumoPlanilhaGestor().aguardandoConferencia,true);
 a.ctx.aplicarPlanoGestor_=aplicar;a.carregar();api(a,'salvarEmprestimoWeb',p);assert.equal(a.db.sheets['Empréstimos'].rows.filter(r=>r[1]==='Bia').length,1);assert.equal(a.ctx.rotinaResumoPlanilhaGestor().sucesso,true);
});

test('restauração e manutenção não passam a adiar resumo com a ampliação para terceiros',()=>{
 const a=ambiente();a.ctx.ativarResumoEmSegundoPlanoGestor();a.ctx.rotinaResumoPlanilhaGestor();
 for(const acao of ['restaurarBackupDadosWeb','manutencao','desfazerAtividadeWeb'])assert.equal(a.ctx.solicitarResumoAssincronoGestor_(acao,{ss:{abas:{}}}),false);
 assert.equal(estado(a).pendente,false);
});

test('nova elegibilidade de terceiros conserva fallback imediato por fórmula ou falha da intenção',()=>{
 for(const motivo of ['formula','intencao']){
  const {a,p}=prepararTerceiros('editarEmprestimoLinhaWeb');a.ctx.ativarResumoEmSegundoPlanoGestor();a.ctx.rotinaResumoPlanilhaGestor();let chamadas=0;const gerar=a.ctx.atualizarResumoNativoGestor_;
  a.ctx.atualizarResumoNativoGestor_=(...args)=>{chamadas++;return gerar(...args);};
  if(motivo==='formula')a.db.sheets['Dashboard & Resumo'].getRange(17,4).setValue('=500');
  else{const obter=a.ctx.PropertiesService.getScriptProperties;let falhar=true;a.ctx.PropertiesService.getScriptProperties=()=>{const props=obter(),set=props.setProperty;props.setProperty=(k,v)=>{if(k==='GESTOR_RESUMO_ASSINCRONO_V1'&&falhar){falhar=false;throw Error('quota temporária');}return set(k,v);};return props;};}
  api(a,'editarEmprestimoLinhaWeb',p);assert.equal(chamadas,1);assert.equal(estado(a).pendente,false);assert.equal(a.db.sheets['Empréstimos'].rows[1][7],130);
 }
});

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

test('diagnóstico recente registra duração do worker sem incluir conteúdo privado do controle',()=>{
 const a=ambiente();a.ctx.ativarResumoEmSegundoPlanoGestor();a.ctx.rotinaResumoPlanilhaGestor();
 const e=estado(a).ultimaExecucao;assert(Number.isFinite(e.inicioServidorMs));assert(e.fimServidorMs>=e.inicioServidorMs);assert(e.duracaoMs>=0);
 const s=JSON.parse(a.props.get('GESTOR_RESUMO_ASSINCRONO_V1'));s.ultimaExecucao.token='privado';a.props.set('GESTOR_RESUMO_ASSINCRONO_V1',JSON.stringify(s));
 const d=a.ctx.diagnosticarPendenciasWeb();assert.equal(d.resumoPlanilha.ultimaExecucao.inicioServidorMs,e.inicioServidorMs);assert(!JSON.stringify(d.resumoPlanilha).includes('privado'));
});

test('etapas do resumo são numéricas e diagnóstico omite campos privados e inválidos',()=>{
 const a=ambiente();a.ctx.ativarResumoEmSegundoPlanoGestor();a.ctx.rotinaResumoPlanilhaGestor();
 const s=JSON.parse(a.props.get('GESTOR_RESUMO_ASSINCRONO_V1'));
 assert.equal(Object.keys(s.ultimaExecucao.etapas).length,13);
 for(const v of Object.values(s.ultimaExecucao.etapas))assert(Number.isFinite(v)&&v>=0);
 s.ultimaExecucao.etapas.privado='não exportar';s.ultimaExecucao.etapas.resumoControleMs=-1;a.props.set('GESTOR_RESUMO_ASSINCRONO_V1',JSON.stringify(s));
 const e=estado(a).ultimaExecucao.etapas;assert.equal(e.privado,undefined);assert.equal(e.resumoControleMs,undefined);
});

test('memo de hashes e fuso dura apenas uma execução do worker e é restaurado após falha',()=>{
 const vm=require('node:vm'),a=ambiente();a.ctx.ativarResumoEmSegundoPlanoGestor();a.ctx.memoAnteriorTeste=new Map();vm.runInContext('HASHES_EXECUCAO_GESTOR_=memoAnteriorTeste',a.ctx);
 const gerar=a.ctx.atualizarResumoNativoGestor_;a.ctx.atualizarResumoNativoGestor_=(...args)=>{assert.equal(vm.runInContext('HASHES_EXECUCAO_GESTOR_===memoAnteriorTeste',a.ctx),false);return gerar(...args);};
 assert.equal(a.ctx.rotinaResumoPlanilhaGestor().sucesso,true);assert.equal(vm.runInContext('HASHES_EXECUCAO_GESTOR_===memoAnteriorTeste',a.ctx),true);
 a.ctx.ativarResumoEmSegundoPlanoGestor();a.ctx.atualizarResumoNativoGestor_=()=>{throw Error('falha controlada');};assert.equal(a.ctx.rotinaResumoPlanilhaGestor().sucesso,false);assert.equal(vm.runInContext('HASHES_EXECUCAO_GESTOR_===memoAnteriorTeste',a.ctx),true);assert.equal(a.lock.has,false);
});

test('falha ao persistir intenção usa caminho síncrono e não confirma tarefa inexistente',()=>{
 const a=ambiente();a.ctx.ativarResumoEmSegundoPlanoGestor();a.ctx.rotinaResumoPlanilhaGestor();
 const obter=a.ctx.PropertiesService.getScriptProperties;let falhar=true;
 a.ctx.PropertiesService.getScriptProperties=()=>{const p=obter(),gravar=p.setProperty;p.setProperty=(k,v)=>{if(k==='GESTOR_RESUMO_ASSINCRONO_V1'&&falhar){falhar=false;throw Error('quota temporária');}return gravar(k,v);};return p;};
 const r=salvar(a,'resumo-fallback-001');assert(r);assert.equal(estado(a).pendente,false);assert.equal(a.db.sheets['_Gestor_Resumo'].rows.slice(4).reduce((s,r)=>s+r[5],0),100);
});

function prepararExclusaoResumo(forma='Cartao',status='Em Aberto'){
 const a=ambiente(fixture([personal('Excluir teste',30,'1/1','10/2026',status,forma),personal('Preservar',20)]));a.ctx.ativarResumoEmSegundoPlanoGestor();a.ctx.rotinaResumoPlanilhaGestor();const r=a.db.sheets['Lançamentos'].rows.find(r=>r[1]==='Excluir teste');
 return {a,id:r[11],p:{registroId:r[11],compraId:r[12],versao:r[13],linha:2,descricao:r[1],mesFatura:r[8],parcela:r[6],excluirTodasParcelas:false,permitirExcluirPixPago:true,incluirAtualizacaoDados:true,requestId:'exclusao-resumo-'+forma}};
}
for(const forma of ['Cartao','Pix'])test('exclusão '+forma+' confirma antes do resumo, mantém reenvio e worker atualiza',()=>{const {a,p,id}=prepararExclusaoResumo(forma,forma==='Pix'?'Pago':'Em Aberto'),antes=JSON.stringify(a.db.sheets['_Gestor_Resumo'].rows),gerar=a.ctx.atualizarResumoNativoGestor_;let chamadas=0;a.ctx.atualizarResumoNativoGestor_=(...args)=>{chamadas++;return gerar(...args);};const r=api(a,'excluirLancamentoWeb',p);assert.equal(chamadas,0);assert.equal(estado(a).pendente,true);assert.equal(r.atualizacaoDados.dados.resumoPlanilha.pendente,true);assert.equal(JSON.stringify(a.db.sheets['_Gestor_Resumo'].rows),antes);assert(!a.db.sheets['Lançamentos'].rows.some(r=>r[11]===id));assert(a.db.sheets['_Gestor_Operacoes'].rows.some(r=>r[0]==='excluirLancamentoWeb:'+p.requestId&&r[2]==='CONFIRMADO'));api(a,'excluirLancamentoWeb',p);assert.equal(chamadas,0);assert.equal(a.ctx.rotinaResumoPlanilhaGestor().sucesso,true);assert.equal(chamadas,1);assert.equal(estado(a).pendente,false);assert(!a.db.sheets['Lançamentos'].rows.some(r=>r[11]===id));assert.notEqual(JSON.stringify(a.db.sheets['_Gestor_Resumo'].rows),antes);});
test('exclusão conserva resumo imediato com fórmula ou falha ao guardar intenção',()=>{for(const motivo of ['formula','intencao']){const {a,p,id}=prepararExclusaoResumo(),gerar=a.ctx.atualizarResumoNativoGestor_;let chamadas=0;a.ctx.atualizarResumoNativoGestor_=(...args)=>{chamadas++;return gerar(...args);};if(motivo==='formula')a.db.sheets['Dashboard & Resumo'].getRange(17,4).setValue('=500');else{const obter=a.ctx.PropertiesService.getScriptProperties;let falhar=true;a.ctx.PropertiesService.getScriptProperties=()=>{const props=obter(),set=props.setProperty;props.setProperty=(k,v)=>{if(k==='GESTOR_RESUMO_ASSINCRONO_V1'&&falhar){falhar=false;throw Error('quota simulada');}return set(k,v);};return props;};}api(a,'excluirLancamentoWeb',p);assert.equal(chamadas,1);assert.equal(estado(a).pendente,false);assert(!a.db.sheets['Lançamentos'].rows.some(r=>r[11]===id));}});
test('exclusão interrompida permanece protegida e worker espera a recuperação',()=>{const {a,p,id}=prepararExclusaoResumo(),aplicar=a.ctx.aplicarPlanoGestor_;a.ctx.aplicarPlanoGestor_=()=>{throw Error('exclusão interrompida');};assert.throws(()=>api(a,'excluirLancamentoWeb',p),/interrompida/);assert.equal(estado(a).pendente,true);assert.equal(a.ctx.rotinaResumoPlanilhaGestor().aguardandoConferencia,true);assert(a.db.sheets['Lançamentos'].rows.some(r=>r[11]===id));a.ctx.aplicarPlanoGestor_=aplicar;api(a,'excluirLancamentoWeb',p);assert(!a.db.sheets['Lançamentos'].rows.some(r=>r[11]===id));assert.equal(a.ctx.rotinaResumoPlanilhaGestor().sucesso,true);assert.equal(estado(a).pendente,false);});
test('cartão pago segue bloqueado sem agendar resumo por uma exclusão recusada',()=>{const {a,p,id}=prepararExclusaoResumo('Cartao','Pago');assert.throws(()=>api(a,'excluirLancamentoWeb',p),/pagamento registrado/);assert.equal(estado(a).pendente,false);assert(a.db.sheets['Lançamentos'].rows.some(r=>r[11]===id));});
