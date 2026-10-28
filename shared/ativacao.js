// A requisição do celular só agenda. O Apps Script executa o trabalho demorado
// sem depender da conexão HTTP, mantendo uma identificação e a etapa duráveis.
const CHAVE_ATIVACAO_ANUAL_GESTOR_='GESTOR_ATIVACAO_ANUAL_V1';
const FUNCAO_ATIVACAO_ANUAL_GESTOR_='retomarAtivacaoAnualGestor';
function lerAtivacaoAnualGestor_(){
  const texto=propriedade_(CHAVE_ATIVACAO_ANUAL_GESTOR_);if(!texto)return null;let j;
  try{j=JSON.parse(texto);}catch(_){throw Error('O acompanhamento da ativação está inválido. Preserve as propriedades para conferência.');}
  if(j.versao!==1||!j.id||!['AGENDADA','EXECUTANDO','CONCLUIDA','ERRO'].includes(j.estado)||j.origem!==propriedade_(CHAVE_ID_PLANILHA_GESTOR))throw Error('A ativação pertence a outra base ou está incompatível. Confira o destino.');
  return j;
}
function salvarAtivacaoAnualGestor_(j){j.atualizadaEm=new Date().toISOString();PropertiesService.getScriptProperties().setProperty(CHAVE_ATIVACAO_ANUAL_GESTOR_,JSON.stringify(j));return j;}
function ativacaoEmCursoGestor_(j){return j&&['AGENDADA','EXECUTANDO'].includes(j.estado)&&Date.now()-new Date(j.atualizadaEm).getTime()<10*60*1000;}
function statusAtivacaoAnualGestor_(){const j=lerAtivacaoAnualGestor_();if(!j)return null;return Object.assign({},j,{interrompida:['AGENDADA','EXECUTANDO'].includes(j.estado)&&!ativacaoEmCursoGestor_(j)});}
function etapaAtivacaoAnualGestor_(etapa){const j=lerAtivacaoAnualGestor_();if(j?.estado==='EXECUTANDO'){j.etapa=etapa;salvarAtivacaoAnualGestor_(j);}}
function agendarAtivacaoAnualGestor_(){
  const iguais=ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()===FUNCAO_ATIVACAO_ANUAL_GESTOR_);
  if(!iguais.length)ScriptApp.newTrigger(FUNCAO_ATIVACAO_ANUAL_GESTOR_).timeBased().after(1000).create();
}
function solicitarAtivacaoAnualGestor_(){
  const lock=LockService.getScriptLock();if(!lock.tryLock(1000))throw Error('Há uma operação em andamento. Use Atualizar situação antes de tentar a ativação novamente.');
  try{
    const c=configProtecaoGestor_();if(!c.ativo||c.planilhaId!==propriedade_(CHAVE_ID_PLANILHA_GESTOR))throw Error('Ative primeiro a proteção automática e confira a base de controle.');
    let j=lerAtivacaoAnualGestor_();
    if(j?.estado==='CONCLUIDA'&&c.organizacaoAnual&&c.pdfAutomatico)return {sucesso:true,repetido:true,ativacaoAnual:j};
    if(ativacaoEmCursoGestor_(j)){if(j.estado==='AGENDADA')agendarAtivacaoAnualGestor_();return {sucesso:true,repetido:true,ativacaoAnual:j};}
    j=Object.assign({},j||{versao:1,id:gerarIdGestor_(),origem:propriedade_(CHAVE_ID_PLANILHA_GESTOR),criadaEm:new Date().toISOString()},{estado:'AGENDADA',etapa:'Aguardando execução no Google',erro:'',tentativas:j?.tentativas||0});salvarAtivacaoAnualGestor_(j);
    try{agendarAtivacaoAnualGestor_();}catch(e){j.estado='ERRO';j.erro='Não foi possível agendar: '+String(e.message||e);salvarAtivacaoAnualGestor_(j);throw e;}
    return {sucesso:true,ativacaoAnual:j,mensagem:'Ativação agendada no Google. O início pode demorar; acompanhe em Atualizar situação.'};
  }finally{lock.releaseLock();}
}
function retomarAtivacaoAnualGestor(){
  const lock=LockService.getScriptLock();if(!lock.tryLock(1000))return {ocupado:true};let j;
  try{
    j=lerAtivacaoAnualGestor_();if(!j||j.estado==='CONCLUIDA'||j.estado==='EXECUTANDO'&&ativacaoEmCursoGestor_(j)||j.estado==='ERRO')return {semTrabalho:true};
    for(const t of ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()===FUNCAO_ATIVACAO_ANUAL_GESTOR_))ScriptApp.deleteTrigger(t);
    j.estado='EXECUTANDO';j.etapa='Conferindo a base';j.tentativas++;salvarAtivacaoAnualGestor_(j);
  }finally{lock.releaseLock();}
  try{ativarOrganizacaoAnualWeb();j=lerAtivacaoAnualGestor_();j.estado='CONCLUIDA';j.etapa='Organização anual e PDFs ativados';j.erro='';salvarAtivacaoAnualGestor_(j);return {sucesso:true};}
  catch(e){j=lerAtivacaoAnualGestor_();j.estado='ERRO';j.erro=String(e.message||e).slice(0,500);salvarAtivacaoAnualGestor_(j);throw e;}
}
function recuperarPlanosAtivacaoAnualGestor_(ss){
  const diario=ss.getSheetByName(ABA_DIARIO_GESTOR_);if(!diario)return;
  const linhas=[...localizarLinhasTecnicasGestor_(diario,3,'PRONTO'),...localizarLinhasTecnicasGestor_(diario,3,'PREPARANDO')].sort((a,b)=>a-b);
  for(const linha of linhas){
    if(!String(diario.getRange(linha,1).getValue()).startsWith('organizarAnos:'))continue;
    const e=lerOperacaoTecnicaGestor_(diario,linha);
    if(e.cabecalho[2]==='PREPARANDO'){diario.getRange(linha,3).setValue('PRONTO');SpreadsheetApp.flush();}
    aplicarPlanoGestor_(ss,e.plano);diario.getRange(linha,3).setValue('CONFIRMADO');SpreadsheetApp.flush();
  }
}
