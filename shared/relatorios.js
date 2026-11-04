// Compara gastos pessoais por competência, em centavos e com períodos equivalentes.
// Intenção persistida antes de PRONTO; o gatilho lê somente dados confirmados.
const CHAVE_RESUMO_ASSINCRONO_GESTOR_='GESTOR_RESUMO_ASSINCRONO_V1';
function lerResumoAssincronoGestor_(){
  const texto=PropertiesService.getScriptProperties().getProperty(CHAVE_RESUMO_ASSINCRONO_GESTOR_);
  if(!texto)return null;
  const s=JSON.parse(texto);if(s.versao!==1||typeof s.origem!=='string'||typeof s.ativo!=='boolean'||typeof s.pendente!=='boolean')throw Error('Controle do resumo em segundo plano inválido.');
  return s.origem===propriedade_(CHAVE_ID_PLANILHA_GESTOR)?s:null;
}
function salvarResumoAssincronoGestor_(s){PropertiesService.getScriptProperties().setProperty(CHAVE_RESUMO_ASSINCRONO_GESTOR_,JSON.stringify(s));}
function situacaoResumoPlanilhaGestor_(conferirGatilho=false){
  try{const s=lerResumoAssincronoGestor_(),estado={modo:s?.ativo?'segundo_plano':'imediato',pendente:s?.pendente===true,erro:s?.erro||'',atualizadoEm:s?.atualizadoEm||null,solicitadoEm:s?.solicitadoEm||null};
    const e=s?.ultimaExecucao;if(e&&Number.isFinite(e.inicioServidorMs)&&e.inicioServidorMs>=0)estado.ultimaExecucao={inicioServidorMs:e.inicioServidorMs,fimServidorMs:Number.isFinite(e.fimServidorMs)?e.fimServidorMs:null,duracaoMs:Number.isFinite(e.duracaoMs)?e.duracaoMs:null};
    if(estado.ultimaExecucao&&e.etapas){const etapas={};for(const k of ['resumoControleMs','resumoLeituraMs','resumoCalculoMs','resumoDashboardMs','resumoEscritaMs','resumoFormulasMs','resumoComparacaoMs','resumoGravacaoMs','resumoFlushMs'])if(typeof e.etapas[k]==='number'&&Number.isFinite(e.etapas[k])&&e.etapas[k]>=0)etapas[k]=Math.round(e.etapas[k]);if(Object.keys(etapas).length)estado.ultimaExecucao.etapas=etapas;}
    if(conferirGatilho&&s?.ativo)estado.rotinaInstalada=ScriptApp.getProjectTriggers().some(t=>t.getHandlerFunction()==='rotinaResumoPlanilhaGestor');return estado;}
  catch(_){return {modo:'imediato',pendente:false,erro:'Confira a configuração do resumo em segundo plano.'};}
}
// Executar uma vez no editor, na conta proprietária da implantação.
// A criação do gatilho deve terminar antes de habilitar o modo assíncrono.
function ativarResumoEmSegundoPlanoGestor(){
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    if(!ScriptApp.getProjectTriggers().some(t=>t.getHandlerFunction()==='rotinaResumoPlanilhaGestor'))ScriptApp.newTrigger('rotinaResumoPlanilhaGestor').timeBased().everyMinutes(5).create();
    const anterior=lerResumoAssincronoGestor_();
    salvarResumoAssincronoGestor_({versao:1,origem:propriedade_(CHAVE_ID_PLANILHA_GESTOR),ativo:true,pendente:true,solicitadoEm:new Date().toISOString(),atualizadoEm:anterior?.atualizadoEm||null,erro:''});
    return {sucesso:true,mensagem:'Resumo em segundo plano ativado. O Google verifica a tarefa a cada cinco minutos, mesmo com o app fechado.'};
  }finally{lock.releaseLock();}
}
function entradasCalculadasResumoGestor_(ctx){
  const abas=ctx?.ss?.abas||{},formula=v=>typeof v==='string'&&v.startsWith('=');
  if(['Lançamentos','Empréstimos'].some(n=>abas[n]?.valores.some(r=>r.some(formula))))return true;
  for(const nome of ['Formas de Pagamento','Dashboard & Resumo']){
    // Algumas ações de terceiros não abrem o cadastro de categorias. Verificar
    // suas fórmulas sem abrir/migrar outra aba virtual depois de fechar o plano.
    const matriz=abas[nome]?.valores||ctx?.ssReal?.getSheetByName(nome)?.getDataRange().getFormulas()||[];
    if(nome==='Formas de Pagamento'?matriz.slice(6).some(r=>r.slice(1,7).some(formula)):matriz.slice(16,41).some(r=>formula(r[1])||formula(r[3])))return true;
  }
  return false;
}
function solicitarResumoAssincronoGestor_(acao,ctx){
  if(!['confirmarMesRecorrenciaWeb','processarModelosRecorrenciaGestor','salvarLancamentoWeb','editarLancamentoLinhaWeb','salvarEmprestimoWeb','editarEmprestimoLinhaWeb','alternarStatusEmprestimoWeb','dividirParcelaEmprestimoWeb','excluirEmprestimoWeb','moverParaEmprestimosWeb','moverParaGastosPessoaisWeb'].includes(acao))return false;
  try{
    const s=lerResumoAssincronoGestor_();if(!s?.ativo)return false;
    if(entradasCalculadasResumoGestor_(ctx))return false;
    s.pendente=true;s.solicitadoEm=new Date().toISOString();salvarResumoAssincronoGestor_(s);return true;
  }catch(_){return false;} // Sem intenção durável, mantém o resumo síncrono.
}
function concluirResumoAssincronoGestor_(){
  const s=lerResumoAssincronoGestor_();if(!s?.ativo)return;
  s.pendente=false;s.erro='';s.atualizadoEm=new Date().toISOString();salvarResumoAssincronoGestor_(s);
}
function rotinaResumoPlanilhaGestor(){
  try{const inicial=lerResumoAssincronoGestor_();if(!inicial?.ativo||!inicial.pendente)return {pendente:false};}catch(_){return {pendente:true,erroConfiguracao:true};}
  const lock=LockService.getScriptLock();if(!lock.tryLock(1000))return {pendente:true,ocupado:true};
  const hashesAnteriores=HASHES_EXECUCAO_GESTOR_;HASHES_EXECUCAO_GESTOR_=new Map();
  const tempos={};
  let inicioExecucao=null;
  try{
    const s=lerResumoAssincronoGestor_();if(!s?.ativo||!s.pendente)return {pendente:false};
    const ss=obterPlanilhaGestor_(),diario=ss.getSheetByName(ABA_DIARIO_GESTOR_);
    // Nunca materializar uma aplicação financeira interrompida ou divergente.
    if(diario&&localizarLinhasTecnicasGestor_(diario,3,'PRONTO').length)return {pendente:true,aguardandoConferencia:true};
    const manutencao=ss.getSheetByName(ABA_MANUTENCAO_PROTECAO_GESTOR_);
    if(manutencao&&localizarLinhasTecnicasGestor_(manutencao,2,'PRONTO').length)return {pendente:true,aguardandoConferencia:true};
    inicioExecucao=Date.now();try{s.ultimaExecucao={inicioServidorMs:inicioExecucao,fimServidorMs:null,duracaoMs:null};salvarResumoAssincronoGestor_(s);}catch(_){}
    try{atualizarResumoNativoGestor_(ss,tempos);return {sucesso:true,pendente:false};}
    catch(e){const atual=lerResumoAssincronoGestor_();if(atual){atual.pendente=true;atual.erro=String(e.message||e).slice(0,250);salvarResumoAssincronoGestor_(atual);}return {sucesso:false,pendente:true};}
  }finally{
    try{if(inicioExecucao!==null){const s=lerResumoAssincronoGestor_();if(s?.ultimaExecucao?.inicioServidorMs===inicioExecucao){const fim=Date.now();s.ultimaExecucao.fimServidorMs=fim;s.ultimaExecucao.duracaoMs=Math.max(0,fim-inicioExecucao);s.ultimaExecucao.etapas=tempos;salvarResumoAssincronoGestor_(s);}}}catch(_){}
    HASHES_EXECUCAO_GESTOR_=hashesAnteriores;
    lock.releaseLock();
  }
}

function compararAnosGastosGestor_(registros,ano){
  const hoje=getHojeSeguro(),anoAtual=hoje.getFullYear(),mesLimite=ano===anoAtual?hoje.getMonth()+1:12;
  const anterior=ano-1,intervalo=mesLimite===12?'Ano completo':'Jan a '+['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][mesLimite-1];
  const soma=a=>registros.filter(r=>r.ano===a&&r.mes>=1&&r.mes<=mesLimite&&r.total>0).reduce((t,r)=>t+r.total,0);
  const atual=soma(ano),base=soma(anterior),futuro=ano>anoAtual,variacao=!futuro&&base>0?Math.round((atual-base)/base*1000)/10:null;
  return {variacao:variacao,texto:futuro?'Ano futuro · sem comparação':variacao===null?'Sem base anterior':variacao===0?'Mesmo valor de '+anterior:Math.abs(variacao).toFixed(1).replace('.',',')+'% '+(variacao<0?'abaixo':'acima')+' de '+anterior,intervalo:intervalo,anoAnterior:anterior,mesLimite:mesLimite,atualRaw:atual/100,anteriorRaw:base/100,criterio:futuro?'A comparação estará disponível quando o ano começar.':intervalo+' de '+ano+' comparado com o mesmo período de '+anterior+'. Gastos pessoais registrados; exclui terceiros, cancelados e previsões.'};
}
// Resumos derivados: a fonte financeira continua sendo registros + ajustes e
// arquivos anuais conferidos. Esta aba e os PDFs nunca substituem o backup.
const ABA_RESUMO_NATIVO_GESTOR_='_Gestor_Resumo';
const MARCADOR_RESUMO_NATIVO_GESTOR_='Resumo gerenciado pelo Gestor — v1';
const CAB_RESUMO_NATIVO_GESTOR_=['Ano','Mês','Forma','Categoria','Origem','Registrado','Pago ao banco','Saldo ao banco','Recebido de pessoas','A receber de pessoas','Quantidade','Tipo de gasto','Prioridade'];
const ABA_RELATORIOS_PDF_GESTOR_='_Gestor_RelatoriosPDF';
const CAB_RELATORIOS_PDF_GESTOR_=['Identificação','Período','Hash dos dados','Estado','Arquivo ou nome','SHA256 PDF','Gerado em','Metadados JSON'];

function registrosResumoNativoGestor_(ss,leituraLocal){
  const dash=ss.getSheetByName('Dashboard & Resumo'),valoresCategorias=dash?dash.getRange('B17:B41').getValues():[],categorias=valoresCategorias.map(r=>String(r[0]||'').trim()).filter(Boolean),registros=[],ids=new Set();
  if(leituraLocal){leituraLocal.ss=ss;leituraLocal.categorias=valoresCategorias.map(r=>r.slice());}
  // Snapshot exclusivo desta leitura: fora do contexto transacional, resolver
  // cada registro individualmente relia o cadastro inteiro no Google Sheets.
  const folhaFormas=ss.getSheetByName('Formas de Pagamento');
  const formasResumo=folhaFormas?validarIdentidadesFormasGestor_(folhaFormas.getDataRange().getValues()).chaves:new Map();
  const nomeFormaResumo=forma=>formasResumo.get(chaveFormaGestor_(forma))?.nome||limparApostrofo(forma);
  const anual=typeof ativoAnualGestor_==='function'&&ativoAnualGestor_(ss);
  const leituraAnual=anual?{ss:ss,catalogo:catalogoAnosGestor_(ss),ajustes:ajustesAnuaisGestor_(ss),anos:new Map()}:null;
  const incluir=function(nome,r){
    if(!r.some(v=>v!==''&&v!=null))return;
    const id=String(r[11]||'');if(!id||ids.has(id))throw Error('O resumo encontrou registro sem identificação ou repetido. Atualize os dados antes de gerar relatórios.');ids.add(id);
    const mes=formatarCelulaRegistroGestor_(r[8],'MM/yyyy'),info=parseMesFat(mes),total=centavosGestor_(r[7]),emp=nome==='Empréstimos';
    if(!info.m)throw Error('Competência inválida no resumo. Nenhum período será omitido.');
    if(isStatusCancelado(r[9])||total<=0)return;
    const pago=centavosGestor_(valorPagoBancoGestor_(r,emp));
    registros.push({id:id,ano:info.a,mes:mes,forma:nomeFormaResumo(r[emp?3:2]),categoria:emp?'Empréstimos a terceiros':resolverCategoria(r[3],categorias),origem:emp?'Terceiros':'Pessoal',perfilGasto:emp?null:lerPerfilGastoGestor_(r),total:total,pago:pago,saldo:total-pago,recebido:emp&&r[9]==='Recebido'?total:0,aReceber:emp&&r[9]!=='Recebido'?total:0});
  };
  for(const nome of ['Lançamentos','Empréstimos']){
    const valores=anual?matrizFinanceiraAnualGestor_(ss,nome,leituraAnual):ss.getSheetByName(nome)?.getDataRange().getValues()||[];
    valores.slice(1).forEach(r=>incluir(nome,r));
  }
  for(const e of catalogoAnualProtecaoGestor_(ss))for(const a of dadosArquivoAnualProtecaoGestor_(e).abas)a.valores.slice(1).forEach(r=>incluir(a.nome,r));
  return registros.sort((a,b)=>a.id.localeCompare(b.id));
}
function agruparResumoNativoGestor_(registros){
  const grupos=new Map();for(const r of registros){const chave=JSON.stringify([r.ano,r.mes,r.forma,r.categoria,r.origem,r.perfilGasto?.tipo||'',r.perfilGasto?.prioridade||'']);if(!grupos.has(chave))grupos.set(chave,{ano:r.ano,mes:r.mes,forma:r.forma,categoria:r.categoria,origem:r.origem,perfilGasto:r.perfilGasto||null,total:0,pago:0,saldo:0,recebido:0,aReceber:0,quantidade:0});const g=grupos.get(chave);for(const k of ['total','pago','saldo','recebido','aReceber'])g[k]+=r[k];g.quantidade++;}
  return Array.from(grupos.values()).sort((a,b)=>parseMesFat(a.mes).time-parseMesFat(b.mes).time||a.origem.localeCompare(b.origem)||a.forma.localeCompare(b.forma)||a.categoria.localeCompare(b.categoria));
}
function normalizarFormulaResumoGestor_(formula){
  let dentro=false,resultado='';for(let i=0;i<String(formula).length;i++){const c=formula[i];if(c==='"'){resultado+=c;if(dentro&&formula[i+1]==='"'){resultado+='"';i++;}else dentro=!dentro;}else if(dentro)resultado+=c;else if(!/\s/.test(c))resultado+=(c===','?';':c.toUpperCase());}return resultado;
}
function literalFormulaResumoGestor_(texto){return '"'+String(texto??'').replace(/"/g,'""')+'"';}
function formulaGerenciadaResumoGestor_(linha,coluna,mes,categoria){
  const soma=(campo,criterios)=>'=SUMIFS(\''+ABA_RESUMO_NATIVO_GESTOR_+'\'!'+campo+'5:'+campo+';\''+ABA_RESUMO_NATIVO_GESTOR_+'\'!E5:E;"Pessoal"'+criterios+')';
  const atual=';\''+ABA_RESUMO_NATIVO_GESTOR_+'\'!B5:B;TEXT(TODAY();"mm/yyyy")';
  if(linha===3)return coluna===2?soma('H',atual):coluna===4?soma('G',atual):coluna===6?soma('F',atual):coluna===8?soma('F',''):null;
  if(linha>=7&&linha<=14&&coluna>=3&&coluna<=6)return soma('F',';\''+ABA_RESUMO_NATIVO_GESTOR_+'\'!C5:C;$B'+linha+';\''+ABA_RESUMO_NATIVO_GESTOR_+'\'!B5:B;'+literalFormulaResumoGestor_(mes));
  if(linha>=17&&linha<=41&&coluna===3)return soma('F',';\''+ABA_RESUMO_NATIVO_GESTOR_+'\'!D5:D;'+literalFormulaResumoGestor_(categoria)+atual);
  return null;
}
function reconhecerFormulaPadraoResumoGestor_(formula,linha,coluna,ss,valoresDashboard){
  const f=normalizarFormulaResumoGestor_(formula),comparar=t=>f===normalizarFormulaResumoGestor_(t),l="'Lançamentos'!";
  if(linha===3){const modelos={2:'=SUMIFS('+l+'H:H;'+l+'J:J;"<>Pago";'+l+'J:J;"<>Assinatura Cancelada")',4:'=SUMIFS('+l+'H:H;'+l+'J:J;"Pago")',6:'=SUMIFS('+l+'H:H;'+l+'I:I;TEXT(TODAY();"mm/yyyy");'+l+'J:J;"<>Assinatura Cancelada")',8:'=SUMIFS('+l+'H:H;'+l+'J:J;"<>Assinatura Cancelada")'};return modelos[coluna]&&comparar(modelos[coluna])?{linha:linha,coluna:coluna}:null;}
  if(linha>=7&&linha<=14&&coluna>=3&&coluna<=6){const m=String(formula).match(/"(\d{2}\/\d{4})"\s*\)\s*$/);if(m&&parseMesFat(m[1]).time&&comparar('=SUMIFS('+l+'$H:$H;'+l+'$C:$C;$B'+linha+';'+l+'$I:$I;"'+m[1]+'")'))return {linha:linha,coluna:coluna,mes:m[1]};}
  if(linha>=17&&linha<=41&&coluna===3&&comparar('=SUMIFS('+l+'H:H;'+l+'D:D;B'+linha+';'+l+'I:I;TEXT(TODAY();"mm/yyyy");'+l+'J:J;"<>Assinatura Cancelada")'))return {linha:linha,coluna:coluna,categoria:String((valoresDashboard?valoresDashboard[linha-1]?.[1]:ss.getSheetByName('Dashboard & Resumo').getRange(linha,2).getValue())||'')};
  return null;
}
function gravarResumoConferidoGestor_(sh,linhas,tempos){
  const inicio=Date.now(),range=sh.getDataRange(),atuais=range.getValues(),formulas=range.getFormulas(),cols=CAB_RESUMO_NATIVO_GESTOR_.length;
  const n=Math.max(atuais.length,linhas.length),alvos=[];
  for(let i=0;i<n;i++){
    const nova=Array.from({length:cols},(_,j)=>linhas[i]?.[j]??'');
    if(formulas[i]?.some(Boolean)||nova.some((v,j)=>!(i===2&&j===1)&&(atuais[i]?.[j]??'')!==v))alvos.push(i);
  }
  const data=atuais[2]?.[1];if(typeof data!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(data)||!Number.isFinite(Date.parse(data)))if(!alvos.includes(2))alvos.push(2);
  if(tempos)tempos.resumoComparacaoMs=Date.now()-inicio;
  if(!alvos.length){if(tempos){tempos.resumoGravacaoMs=0;tempos.resumoFlushMs=0;}return false;}
  if(!alvos.includes(2))alvos.push(2);alvos.sort((a,b)=>a-b);
  // Evita trocar uma gravação em lote por dezenas de chamadas pequenas.
  const blocos=alvos.reduce((s,v,i)=>s+Number(i===0||v!==alvos[i-1]+1),0);
  if(blocos>3)alvos.splice(0,alvos.length,...Array.from({length:n},(_,i)=>i));
  if(sh.getMaxRows&&n>sh.getMaxRows())sh.insertRowsAfter(sh.getMaxRows(),n-sh.getMaxRows());
  if(sh.getMaxColumns&&cols>sh.getMaxColumns())sh.insertColumnsAfter(sh.getMaxColumns(),cols-sh.getMaxColumns());
  const gravacao=Date.now();
  for(let k=0;k<alvos.length;){let fim=k+1;while(fim<alvos.length&&alvos[fim]===alvos[fim-1]+1)fim++;
    const valores=alvos.slice(k,fim).map(i=>Array.from({length:cols},(_,j)=>{const v=linhas[i]?.[j]??'';return typeof v==='string'&&/^[=+@]/.test(v)?"'"+v:v;}));
    sh.getRange(alvos[k]+1,1,valores.length,cols).setValues(valores);k=fim;
  }
  if(tempos)tempos.resumoGravacaoMs=Date.now()-gravacao;
  const flush=Date.now();SpreadsheetApp.flush();if(tempos)tempos.resumoFlushMs=Date.now()-flush;
  return true;
}
function atualizarResumoNativoGestor_(ss,tempos){
  let marco=Date.now();const medir=nome=>{const agora=Date.now();if(tempos)tempos[nome]=Math.max(0,agora-marco);marco=agora;};
  let sh=ss.getSheetByName(ABA_RESUMO_NATIVO_GESTOR_),meta={migracoes:[]};
  if(sh&&sh.getLastRow()){
    const cab=sh.getRange(1,1,1,3).getValues()[0];if(cab[0]!==MARCADOR_RESUMO_NATIVO_GESTOR_||cab[1]!==propriedade_(CHAVE_ID_PLANILHA_GESTOR))throw Error('A aba _Gestor_Resumo contém dados não gerenciados. Preserve-a antes de gerar o resumo.');
    try{meta=JSON.parse(cab[2]||'{}');}catch(_){throw Error('Controle do resumo nativo inválido.');}if(meta.versao!==1||!Array.isArray(meta.migracoes)||meta.migracoes.length>61||meta.migracoes.some(m=>!m||!Number.isInteger(m.linha)||!Number.isInteger(m.coluna)||typeof m.gerada!=='string'||!formulaGerenciadaResumoGestor_(m.linha,m.coluna,m.mes,m.categoria)||m.gerada!==formulaGerenciadaResumoGestor_(m.linha,m.coluna,m.mes,m.categoria)||m.aceitas&&(!Array.isArray(m.aceitas)||m.aceitas.length>2||m.aceitas.some(f=>typeof f!=='string'||f.length>10000))))throw Error('Controle de fórmulas do resumo inválido.');
  }
  medir('resumoControleMs');
  const leituraLocal={},registros=registrosResumoNativoGestor_(ss,leituraLocal);medir('resumoLeituraMs');
  const grupos=agruparResumoNativoGestor_(registros),hash=hashGestor_(registros),dash=ss.getSheetByName('Dashboard & Resumo'),migracoes=meta.migracoes.slice();medir('resumoCalculoMs');
  const valoresDashboard=[],linhasDashboard=dash?Math.max(1,Math.min(41,dash.getLastRow())):0;
  if(dash&&linhasDashboard>=17){const categorias=leituraLocal.ss===ss&&leituraLocal.categorias?leituraLocal.categorias.slice(0,linhasDashboard-16):dash.getRange(17,2,linhasDashboard-16,1).getValues();categorias.forEach((r,i)=>{valoresDashboard[16+i]=['',r[0]];});}
  if(dash){const formulas=dash.getRange(1,1,linhasDashboard,8).getFormulas();for(let i=0;i<formulas.length;i++)for(let j=0;j<formulas[i].length;j++)if(formulas[i][j]){
    const anterior=migracoes.find(m=>m.linha===i+1&&m.coluna===j+1),reconhecida=reconhecerFormulaPadraoResumoGestor_(formulas[i][j],i+1,j+1,ss,valoresDashboard);
    if(!reconhecida&&(!anterior||formulas[i][j]!==anterior.gerada&&!(anterior.aceitas||[]).includes(formulas[i][j])))continue;
    const m=reconhecida||Object.assign({},anterior),categoria=m.linha>=17?String(valoresDashboard[m.linha-1]?.[1]||''):m.categoria,gerada=formulaGerenciadaResumoGestor_(m.linha,m.coluna,m.mes,categoria);if(!gerada)continue;
    Object.assign(m,{categoria:categoria,gerada:gerada,aceitas:Array.from(new Set([formulas[i][j],gerada]))});const pos=migracoes.findIndex(x=>x.linha===m.linha&&x.coluna===m.coluna);if(pos<0)migracoes.push(m);else migracoes[pos]=m;
  }}
  medir('resumoDashboardMs');
  if(!sh)sh=ss.insertSheet(ABA_RESUMO_NATIVO_GESTOR_);
  const linhas=[[MARCADOR_RESUMO_NATIVO_GESTOR_,propriedade_(CHAVE_ID_PLANILHA_GESTOR),JSON.stringify({versao:1,migracoes:migracoes})],['SHA256 dos dados',hash],['Atualizado em',new Date().toISOString()],CAB_RESUMO_NATIVO_GESTOR_,...grupos.map(g=>[g.ano,g.mes,g.forma,g.categoria,g.origem,g.total/100,g.pago/100,g.saldo/100,g.recebido/100,g.aReceber/100,g.quantidade,g.origem==='Pessoal'?rotuloPerfilRelatorioGestor_(g.perfilGasto?.tipo):'',g.origem==='Pessoal'?rotuloPerfilRelatorioGestor_(g.perfilGasto?.prioridade):''])];
  const gravado=gravarResumoConferidoGestor_(sh,linhas,tempos);if(gravado&&sh.setFrozenRows)sh.setFrozenRows(4);
  if(gravado&&grupos.length)sh.getRange(5,6,grupos.length,5).setNumberFormat('R$ #,##0.00');
  medir('resumoEscritaMs');
  // A marca é persistida primeiro: interrupção após uma célula pode retomar
  // apenas as fórmulas reconhecidas. Fórmulas particulares nunca são apagadas.
  if(dash){const atuais=dash.getRange(1,1,linhasDashboard,8).getFormulas();for(const m of migracoes){const atual=atuais[m.linha-1]?.[m.coluna-1]||'';if(atual!==m.gerada&&((m.aceitas||[]).includes(atual)||reconhecerFormulaPadraoResumoGestor_(atual,m.linha,m.coluna,ss,valoresDashboard)))dash.getRange(m.linha,m.coluna).setValue(m.gerada);}}
  medir('resumoFormulasMs');
  // Todas as entradas chamam sob a trava do projeto. Se a marca não puder
  // ser concluída, permanece pendente para repetir a materialização idempotente.
  concluirResumoAssincronoGestor_();
  return {sucesso:true,hash:hash,periodos:Array.from(new Set(registros.map(r=>r.mes))),grupos:grupos.length,formulasMigradas:migracoes.length};
}
function migrarResumoNativoGestor_(ss){return atualizarResumoNativoGestor_(ss);}
function precisaMigrarResumoNativoGestor_(ss){
  const sh=ss.getSheetByName('Dashboard & Resumo');if(!sh)return false;
  const formulas=sh.getDataRange().getFormulas();return formulas.some((r,i)=>r.some((f,j)=>f&&Boolean(reconhecerFormulaPadraoResumoGestor_(f,i+1,j+1,ss))));
}

function rotuloPerfilRelatorioGestor_(valor){return {fixo:'Fixo',variavel:'Variável',essencial:'Essencial',ajustavel:'Ajustável'}[valor]||'Não classificado';}
function escaparRelatorioPDFGestor_(texto){return String(texto??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function dadosPeriodoPDFGestor_(registros,periodo){
  if(!/^(?:\d{4}|\d{2}\/\d{4})$/.test(String(periodo)))throw Error('Período do relatório inválido.');
  if(String(periodo).includes('/')&&!parseMesFat(periodo).m)throw Error('Mês do relatório inválido.');
  const itens=registros.filter(r=>String(periodo).includes('/')?r.mes===periodo:String(r.ano)===String(periodo)),grupos=agruparResumoNativoGestor_(itens),hash=hashGestor_({versao:2,periodo:String(periodo),registros:itens});
  const comparacao=String(periodo).includes('/')?null:compararAnosGastosGestor_(registros.filter(r=>r.origem==='Pessoal').map(r=>({ano:r.ano,mes:parseMesFat(r.mes).m,total:r.total})),Number(periodo));
  return {periodo:String(periodo),hash:comparacao?hashGestor_({versao:3,hash:hash,comparacao:comparacao}):hash,comparacaoAnterior:comparacao,grupos:grupos,quantidade:itens.length,perfilGastos:resumoPerfilGastosGestor_(itens.filter(r=>r.origem==='Pessoal').map(r=>{const raw=[];raw[7]=r.total/100;raw[8]=r.mes;raw[9]='Em Aberto';definirPerfilGastoGestor_(raw,r.perfilGasto||{tipo:'',prioridade:''});return raw;}),String(periodo))};
}
function htmlRelatorioPDFGestor_(dados,geradoEm){
  const e=escaparRelatorioPDFGestor_,totais={pessoal:0,terceiros:0,pago:0,saldo:0,recebido:0,aReceber:0};for(const g of dados.grupos){totais[g.origem==='Pessoal'?'pessoal':'terceiros']+=g.total;for(const k of ['pago','saldo','recebido','aReceber'])totais[k]+=g[k];}
  const dinheiro=n=>e(formatBRL(n/100)),tabela=origem=>dados.grupos.filter(g=>g.origem===origem).map(g=>'<tr><td>'+e(g.mes)+'</td><td>'+e(g.forma)+'</td><td>'+e(g.categoria)+'</td><td>'+dinheiro(g.total)+'</td><td>'+dinheiro(g.pago)+'</td><td>'+dinheiro(g.saldo)+'</td>'+(origem==='Pessoal'?'<td>'+e(rotuloPerfilRelatorioGestor_(g.perfilGasto?.tipo))+'</td><td>'+e(rotuloPerfilRelatorioGestor_(g.perfilGasto?.prioridade))+'</td>':'')+(origem==='Terceiros'?'<td>'+dinheiro(g.recebido)+'</td><td>'+dinheiro(g.aReceber)+'</td>':'')+'</tr>').join('');
  const cab='<th>Mês</th><th>Forma</th><th>Categoria</th><th>Registrado</th><th>Pago ao banco</th><th>Saldo ao banco</th>';
  return '<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4 landscape;margin:14mm}body{font:11px Arial,sans-serif;color:#172033}h1{font-size:23px}h2{font-size:16px;margin-top:22px}table{border-collapse:collapse;width:100%;margin-top:10px}th,td{border-bottom:1px solid #d8dfe8;text-align:left;padding:7px}th{background:#eef2f7}td:nth-child(n+4):nth-child(-n+6){text-align:right}.perfil td:nth-child(n+2){text-align:right}h2,h3{page-break-after:avoid}thead{display:table-header-group}tr{page-break-inside:avoid}.sub{color:#53627a;font-size:10px}.totais{line-height:1.8}</style></head><body><h1>Gestor de Gastos — '+e(dados.periodo)+'</h1><p class="sub">Resumo de consulta · Gerado em '+e(geradoEm)+' · '+e(dados.quantidade)+' registro(s)</p><p class="totais">Gastos pessoais: <strong>'+dinheiro(totais.pessoal)+'</strong> · Gastos de terceiros: <strong>'+dinheiro(totais.terceiros)+'</strong><br>Pago ao banco: '+dinheiro(totais.pago)+' · Saldo ao banco: '+dinheiro(totais.saldo)+'<br>Recebido de pessoas: '+dinheiro(totais.recebido)+' · A receber de pessoas: '+dinheiro(totais.aReceber)+'</p>'+(dados.comparacaoAnterior?'<h2>Comparação com o ano anterior</h2><p><strong>'+e(dados.comparacaoAnterior.texto)+'</strong> · '+e(dados.comparacaoAnterior.intervalo)+'</p><p class="sub">'+e(dados.comparacaoAnterior.criterio)+'</p>':'')+htmlPerfilRelatorioPDFGestor_(dados.perfilGastos)+'<h2>Gastos pessoais</h2><table><thead><tr>'+cab+'<th>Tipo</th><th>Prioridade</th></tr></thead><tbody>'+tabela('Pessoal')+'</tbody></table><h2>Gastos de terceiros</h2><table><thead><tr>'+cab+'<th>Recebido</th><th>A receber</th></tr></thead><tbody>'+tabela('Terceiros')+'</tbody></table><p class="sub">Competência do gasto e situação atual na data de geração. Receber da pessoa e pagar ao banco são controles separados. Correções e recebimentos posteriores geram outra revisão, sem apagar este arquivo. Este PDF é um resumo de leitura; o JSON é necessário para restauração.</p><p class="sub">Revisão dos dados: '+e(dados.hash)+'</p></body></html>';
}
function htmlPerfilRelatorioPDFGestor_(perfil){
  if(!perfil)return '<h2>Perfil dos gastos pessoais</h2><p>Classificação indisponível nesta revisão.</p>';
  const e=escaparRelatorioPDFGestor_,dinheiro=n=>e(formatBRL(n/100));
  const tabela=(campo,nome,chaves)=>'<h3>'+nome+'</h3><table class="perfil"><thead><tr><th>Classificação</th><th>Gasto pessoal</th><th>Participação</th></tr></thead><tbody>'+chaves.map(k=>'<tr><td>'+e(rotuloPerfilRelatorioGestor_(k))+'</td><td>'+dinheiro(perfil[campo][k])+'</td><td>'+(perfil.total?100*perfil[campo][k]/perfil.total:0).toFixed(1).replace('.',',')+'%</td></tr>').join('')+'</tbody></table>';
  return '<h2>Perfil dos gastos pessoais</h2><p class="sub">Pagos e em aberto; exclui terceiros, cancelados e previsões. Tipo e prioridade são leituras do mesmo total, não valores a somar.</p>'+tabela('tipo','Tipo de gasto',['fixo','variavel','naoClassificado'])+tabela('prioridade','Prioridade',['essencial','ajustavel','naoClassificado'])+'<p>Total pessoal analisado: <strong>'+dinheiro(perfil.total)+'</strong></p><p class="sub">Classificação registrada em cada lançamento. Mudar o padrão de uma categoria não reclassifica o passado.</p>';
}
function hashBlobRelatorioPDFGestor_(blob){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,blob.getBytes()).map(n=>(n<0?n+256:n).toString(16).padStart(2,'0')).join('');}
function conferirArquivoPDFRelatorioGestor_(arquivo,hash){const blob=arquivo.getBlob(),bytes=blob.getBytes();if(bytes.length<5||[37,80,68,70,45].some((b,i)=>(bytes[i]<0?bytes[i]+256:bytes[i])!==b)||hashBlobRelatorioPDFGestor_(blob)!==hash)throw Error('O PDF existente não passou na conferência. Preserve o arquivo e a identificação para revisão.');return arquivo;}
function retomarRelatoriosPDFGestor_(ss,pasta,limite){
  const tabela=abaTecnicaProtecaoGestor_(ss,ABA_RELATORIOS_PDF_GESTOR_,CAB_RELATORIOS_PDF_GESTOR_,false),retomados=[];if(!tabela)return retomados;
  const linhas=tabela.getDataRange().getValues(),origem=propriedade_(CHAVE_ID_PLANILHA_GESTOR),prefixo='pdf-'+hashGestor_(origem).slice(0,12)+'-';
  for(let i=1;i<linhas.length&&retomados.length<limite;i++){const r=linhas[i];if(r[3]!=='PREPARANDO')continue;
    if(!String(r[0]).startsWith(prefixo)||!/^[a-f0-9]{64}$/.test(r[2])||!/^[a-f0-9]{64}$/.test(r[5]))throw Error('Preparação de PDF não reconhecida. Preserve o controle.');
    const arquivos=pasta.getFilesByName(String(r[4]));if(!arquivos.hasNext())continue;const arquivo=arquivos.next();if(arquivos.hasNext())throw Error('Há PDFs repetidos na preparação. Preserve os arquivos.');
    conferirArquivoPDFRelatorioGestor_(arquivo,r[5]);r[3]='CONFIRMADO';r[4]=arquivo.getId();tabela.getRange(i+1,1,1,8).setValues([r]);SpreadsheetApp.flush();retomados.push({periodo:r[1],arquivoId:arquivo.getId(),url:arquivo.getUrl(),hashDados:r[2],retomado:true});
  }return retomados;
}
function emitirRelatorioPDFGestor_(ss,pasta,dados){
  const origem=propriedade_(CHAVE_ID_PLANILHA_GESTOR),prefixo=hashGestor_(origem).slice(0,12),id='pdf-'+prefixo+'-'+dados.periodo.replace('/','-')+'-'+dados.hash.slice(0,32),tabela=abaTecnicaProtecaoGestor_(ss,ABA_RELATORIOS_PDF_GESTOR_,CAB_RELATORIOS_PDF_GESTOR_,true),achados=localizarLinhasTecnicasGestor_(tabela,1,id);
  if(achados.length>1)throw Error('Identificação repetida na lista de PDFs. Preserve a aba.');
  const linha=achados[0]||tabela.getLastRow()+1,anterior=achados.length?tabela.getRange(linha,1,1,8).getValues()[0]:null;
  if(anterior&&(anterior[1]!==dados.periodo||anterior[2]!==dados.hash||!['PREPARANDO','CONFIRMADO'].includes(anterior[3])))throw Error('Preparação do PDF incompatível.');
  if(anterior?.[3]==='CONFIRMADO'){const arquivo=conferirArquivoPDFRelatorioGestor_(DriveApp.getFileById(anterior[4]),anterior[5]);return {periodo:dados.periodo,arquivoId:arquivo.getId(),url:arquivo.getUrl(),hashDados:dados.hash,repetido:true};}
  const geradoEm=anterior?.[6]||new Date().toISOString(),nome='Gestor_Resumo_'+dados.periodo.replace('/','-')+'_'+prefixo+'_'+dados.hash.slice(0,24)+'.pdf',encontrados=pasta.getFilesByName(nome);let arquivo;
  if(encontrados.hasNext()){arquivo=encontrados.next();if(encontrados.hasNext()||!anterior)throw Error('Nome de PDF já utilizado sem uma preparação única. Preserve os arquivos.');conferirArquivoPDFRelatorioGestor_(arquivo,anterior[5]);}
  else {
    const blob=Utilities.newBlob(htmlRelatorioPDFGestor_(dados,geradoEm),'text/html',nome+'.html').getAs('application/pdf').setName(nome),hash=hashBlobRelatorioPDFGestor_(blob);
    tabela.getRange(linha,1,1,8).setValues([[id,dados.periodo,dados.hash,'PREPARANDO',nome,hash,geradoEm,JSON.stringify({versao:1,origem:origem,quantidade:dados.quantidade,bytes:blob.getBytes().length})]]);SpreadsheetApp.flush();arquivo=pasta.createFile(blob);conferirArquivoPDFRelatorioGestor_(arquivo,hash);
  }
  const preparada=tabela.getRange(linha,1,1,8).getValues()[0];preparada[3]='CONFIRMADO';preparada[4]=arquivo.getId();tabela.getRange(linha,1,1,8).setValues([preparada]);SpreadsheetApp.flush();
  return {periodo:dados.periodo,arquivoId:arquivo.getId(),url:arquivo.getUrl(),hashDados:dados.hash,repetido:false};
}
function gerarRelatoriosPDFProgramadosGestor_(ss,pasta,limite){
  if(configProtecaoGestor_().pdfAutomatico!==true)return {ativo:false,gerados:[],pendentes:0};
  const gerados=[];try{
    const quantidade=Math.min(2,Math.max(1,Number(limite)||2));gerados.push(...retomarRelatoriosPDFGestor_(ss,pasta,quantidade));
    const registros=registrosResumoNativoGestor_(ss),hoje=getHojeSeguro(),inicio=new Date(hoje.getFullYear(),hoje.getMonth(),1).getTime(),periodos=new Set();
    for(const r of registros){if(parseMesFat(r.mes).time<inicio)periodos.add(r.mes);if(r.ano<hoje.getFullYear())periodos.add(String(r.ano));}
    const tabela=abaTecnicaProtecaoGestor_(ss,ABA_RELATORIOS_PDF_GESTOR_,CAB_RELATORIOS_PDF_GESTOR_,false),linhas=(tabela?.getDataRange().getValues()||[]).slice(1),confirmados=new Set(linhas.filter(r=>r[3]==='CONFIRMADO').map(r=>r[1]+'|'+r[2]));
    // Se o último lançamento do período for excluído, a revisão zerada também
    // precisa existir. O PDF anterior permanece como retrato da revisão antiga.
    for(const r of linhas){const p=String(r[1]);if(/^\d{2}\/\d{4}$/.test(p)){const info=parseMesFat(p);if(info.time&&info.time<inicio)periodos.add(p);}else if(/^\d{4}$/.test(p)&&Number(p)>=ANO_MIN_COMPETENCIA_GESTOR_&&Number(p)<hoje.getFullYear())periodos.add(p);}
    const candidatos=Array.from(periodos).map(p=>dadosPeriodoPDFGestor_(registros,p)).filter(d=>!confirmados.has(d.periodo+'|'+d.hash)).sort((a,b)=>{const fim=p=>p.includes('/')?parseMesFat(p).time:new Date(Number(p),11,1).getTime();return fim(b.periodo)-fim(a.periodo)||a.periodo.length-b.periodo.length;});
    const novos=candidatos.slice(0,quantidade-gerados.length);for(const d of novos)gerados.push(emitirRelatorioPDFGestor_(ss,pasta,d));
    return {sucesso:true,ativo:true,gerados:gerados,pendentes:Math.max(0,candidatos.length-novos.length)};
  }catch(erro){return {sucesso:false,ativo:true,gerados:gerados,erro:String(erro.message||erro).slice(0,500)};}
}
function atualizarRelatoriosContinuosGestor_(ss,pasta){
  atualizarResumoNativoGestor_(ss);
  const resultado=gerarRelatoriosPDFProgramadosGestor_(ss,pasta,2),config=configProtecaoGestor_();
  config.erroRelatorios=resultado.erro||'';config.relatoriosPDF={data:new Date().toISOString(),pendentes:resultado.pendentes||0,gerados:resultado.gerados||[]};salvarConfigProtecaoGestor_(config);return resultado;
}
