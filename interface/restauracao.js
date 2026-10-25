// Restauração é substituição, sempre precedida de prévia vinculada ao conteúdo
// e à geração da seleção. Importações grandes mantêm só uma referência local.
const LIMITE_ARQUIVO_RESTAURACAO_UI_GESTOR = 8 * 1024 * 1024;

async function lerExportacaoPreparadaGestor(ref,api,progresso) {
  const textos=[];let parte=1;
  while(parte<=ref.totalPartes){
    const r=await api('obterPartesImportacaoBackupWeb',{...ref,parte,quantidade:20},1),chunks=r.chunks;
    if(r.importacaoId!==ref.importacaoId||r.hashImportacao!==ref.hashImportacao||r.totalPartes!==ref.totalPartes||!Array.isArray(chunks)||!chunks.length||chunks.length>20||parte+chunks.length-1>ref.totalPartes||chunks.some((p,i)=>p.parte!==parte+i||typeof p.chunk!=='string'||p.chunk.length>12000))throw Error('O arquivo preparado está incompleto. Tente exportar novamente.');
    textos.push(...chunks.map(p=>p.chunk));parte+=chunks.length;progresso?.(Math.min(ref.totalPartes,parte-1),ref.totalPartes);
  }
  const texto=textos.join('');
  if(new TextEncoder().encode(texto).length!==ref.bytes||await hashTextoRestauracaoGestor(texto)!==ref.hashImportacao)throw Error('O comprovante do backup não confere. O arquivo não foi baixado.');
  return JSON.parse(texto);
}
const exportarAntesRestauracaoCompletaGestor=window.exportarBackupDados;
window.exportarBackupDados=async function(formato='json') {
  if(formato!=='json')return exportarAntesRestauracaoCompletaGestor(formato);
  if(window.exportarBackupDados.emAndamento)return;
  window.exportarBackupDados.emAndamento=true;
  const botoes=Array.from(document.querySelectorAll('[data-exportar-dados]')),estados=botoes.map(b=>b.disabled);botoes.forEach(b=>b.disabled=true);
  const status=document.getElementById('estadoExportacaoCompletaGestor');let ref;
  try {
    if(!navigator.onLine)throw Error('Conecte-se para preparar um backup atualizado da planilha.');
    if(status)status.textContent='Preparando o arquivo de dados. A planilha não será alterada…';
    ref=await apiCall('prepararExportacaoBackupWeb',{importacaoId:novoRequestIdGestor()},1);
    const dados=await lerExportacaoPreparadaGestor(ref,(...a)=>apiCall(...a),(valor,total)=>{if(status)status.textContent='Conferindo backup: '+Math.round(valor/total*100)+'%';});
    baixarJSONRestauracaoGestor(dados,'Backup_Gestor_'+new Date().toISOString().slice(0,10)+'.json');
    if(status)status.textContent='Backup conferido e preparado para baixar. O histórico técnico continua preservado na planilha.';
    mostrarAviso('Backup pronto','O arquivo JSON contém os dados restauráveis do app. Guarde-o em um local de confiança.');
  }catch(e){if(status)status.textContent=mensagemErroRestauracaoGestor(e);mostrarAviso('Backup não concluído',mensagemErroRestauracaoGestor(e));}
  finally {
    if(ref)try{await apiCall('descartarImportacaoBackupWeb',ref,1);}catch(_){}
    botoes.forEach((b,i)=>b.disabled=estados[i]);window.exportarBackupDados.emAndamento=false;
  }
};

async function hashTextoRestauracaoGestor(texto) {
  if (!window.crypto?.subtle) throw new Error('Abra o app no endereço seguro para conferir a integridade do backup.');
  const bytes=await window.crypto.subtle.digest('SHA-256',new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}

function compactarBackupRestauracaoGestor(original) {
  if (!original || original.formato!=='gestor-financeiro-backup-v1' || !Array.isArray(original.abas)) throw new Error('Selecione um arquivo JSON de backup exportado pelo Gestor. CSV serve para consulta e não restaura o app.');
  return {formato:original.formato,geradoEm:original.geradoEm,fusoHorario:original.fusoHorario,planilha:original.planilha,observacao:original.observacao,abas:original.abas.filter(a=>a && a.nome!=='_Gestor_Atividade').map(a=>({nome:a.nome,valores:a.valores,formulas:a.formulas}))};
}

function mensagemErroRestauracaoGestor(erro) {return erro?.message || 'Não foi possível conferir a restauração. Preserve o arquivo e tente a conferência novamente.';}
function dataLegivelBackupGestor(valor){
  const texto=String(valor || '');if(!texto)return 'data não informada';
  const local=texto.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}:\d{2})(?::\d{2})?$/);
  if(local)return local[3]+'/'+local[2]+'/'+local[1]+' '+local[4];
  if(/^\d{4}-\d{2}-\d{2}T/.test(texto)){const d=new Date(texto);if(Number.isFinite(d.getTime()))return d.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});}
  return texto;
}

function criarControleRestauracaoGestor(opcoes={}) {
  const api=opcoes.api || ((...args)=>apiCall(...args)), hash=opcoes.hash || hashTextoRestauracaoGestor;
  const ler=opcoes.ler || (chave=>{try{return JSON.parse(localStorage.getItem(chave) || 'null');}catch(_){return null;}});
  const salvar=opcoes.salvar || ((chave,dados)=>gravarArmazenamentoGestor(chave,JSON.stringify(dados)));
  const guardarBloqueio=opcoes.guardarBloqueio || (id=>gravarArmazenamentoGestor('gestorRestauracaoEmAndamentoV1',id));
  const remover=opcoes.remover || (chave=>localStorage.removeItem(chave));
  const idNovo=opcoes.idNovo || novoRequestIdGestor;
  const estado={geracao:0,ocupado:false,aplicando:false,ref:null,resumo:null,nome:'',mensagem:'',erro:false,progresso:null,preparacao:null};
  const notificar=()=>opcoes.onChange?.(estado);
  const atual=g=>g===estado.geracao;
  const informar=(g,mensagem,progresso=null)=>{if(atual(g)){estado.mensagem=mensagem;estado.progresso=progresso;notificar();}};
  function iniciar(nome) {
    if (estado.aplicando) throw new Error('Aguarde a confirmação da restauração atual.');
    const g=++estado.geracao;Object.assign(estado,{ocupado:true,ref:null,resumo:null,nome:nome,erro:false,mensagem:'Conferindo a seleção…',progresso:null,preparacao:null});notificar();return g;
  }
  function falhou(g,erro) {if(atual(g)){estado.erro=true;estado.mensagem=mensagemErroRestauracaoGestor(erro);estado.ref=null;estado.resumo=null;estado.progresso=null;}}
  function disponibilidade() {
    if (opcoes.validarDisponibilidade) {opcoes.validarDisponibilidade();return;}
    if (!navigator.onLine) throw new Error('Conecte-se para conferir os dados atuais da planilha. O arquivo continua preservado.');
    if (listarPendenciasAtividadeGestor().length || localStorage.getItem('gestorRestauracaoEmAndamentoV1')) throw new Error('Resolva os envios pendentes em Atividade e sincronização antes de restaurar.');
  }
  async function prepararConteudo(original,nome,g) {
    const backup=compactarBackupRestauracaoGestor(original),texto=JSON.stringify(backup),bytes=new TextEncoder().encode(texto).length;
    if (bytes>LIMITE_ARQUIVO_RESTAURACAO_UI_GESTOR) throw new Error('Os dados do backup excedem 8 MB. Preserve o arquivo para recuperação assistida.');
    let ref;
    // A operação incerta pequena cabe no diário local; a grande guarda só ID e hash.
    if (new TextEncoder().encode(JSON.stringify({backup})).length<=300000) ref={backup};
    else {
      const hashImportacao=await hash(texto);if(!atual(g))return;
      const chave='gestorImportacaoBackupV1:'+hashImportacao,anterior=ler(chave),chunks=texto.match(/[\s\S]{1,12000}/g) || [''];
      const reutilizar=anterior?.hashImportacao===hashImportacao && anterior.totalPartes===chunks.length && anterior.bytes===bytes && (anterior.expiraEm || anterior.atualizadoEm+86400000)>Date.now() && /^[A-Za-z0-9_.:-]{8,160}$/.test(anterior.importacaoId || '');
      const importacao={importacaoId:reutilizar?anterior.importacaoId:idNovo(),hashImportacao:hashImportacao,totalPartes:chunks.length,bytes:bytes,nome:nome,atualizadoEm:reutilizar?anterior.atualizadoEm:Date.now()};
      if (!salvar(chave,importacao)) throw new Error('Não foi possível guardar a referência de recuperação neste aparelho. Libere espaço antes de continuar; o arquivo não foi alterado.');
      estado.preparacao=importacao;
      informar(g,'Preparando envio protegido do arquivo…',{valor:0,total:chunks.length});
      const inicio=await api('iniciarImportacaoBackupWeb',importacao,1);if(!atual(g))return;
      importacao.expiraEm=inicio.expiraEm || importacao.atualizadoEm+86400000;salvar(chave,importacao);
      const recebidas=new Set(inicio.recebidas || []),faltantes=chunks.map((chunk,i)=>({parte:i+1,chunk})).filter(p=>!recebidas.has(p.parte));
      informar(g,'Enviando backup. Se interromper, selecione o mesmo arquivo para continuar.',{valor:recebidas.size,total:chunks.length});
      for(let i=0;i<faltantes.length;i+=20) {
        if(!atual(g))return;
        await api('enviarPartesBackupWeb',{importacaoId:importacao.importacaoId,hashImportacao,partes:faltantes.slice(i,i+20)},1);
        if(!atual(g))return;
        informar(g,'Enviando backup. O conteúdo financeiro ainda não foi substituído.',{valor:Math.min(chunks.length,recebidas.size+i+20),total:chunks.length});
      }
      await api('concluirImportacaoBackupWeb',{importacaoId:importacao.importacaoId,hashImportacao},1);if(!atual(g))return;
      ref={importacaoId:importacao.importacaoId,hashImportacao};
    }
    informar(g,'Comparando o backup com a planilha atual…');
    const resumo=await api('previaRestauracaoBackupWeb',ref,1);if(!atual(g))return;
    estado.ref=ref;estado.resumo=resumo;estado.mensagem='Prévia pronta. Confira o destino, os totais e as diferenças antes de confirmar.';estado.progresso=null;
  }
  async function selecionarArquivo(file) {
    const g=iniciar(file?.name || 'Arquivo JSON');
    try {
      if(!file) {estado.mensagem='Selecione um arquivo JSON de backup.';return;}
      disponibilidade();if(file.size>LIMITE_ARQUIVO_RESTAURACAO_UI_GESTOR) throw new Error('O limite de leitura é 8 MB. Preserve arquivos maiores para recuperação assistida.');
      const texto=await file.text();if(!atual(g))return;let conteudo;
      try{conteudo=JSON.parse(texto);}catch(_){throw new Error('Este arquivo não é um JSON válido. Selecione o backup original exportado pelo Gestor.');}
      await prepararConteudo(conteudo,file.name,g);
    }catch(e){falhou(g,e);}finally{if(atual(g)){estado.ocupado=false;notificar();}}
  }
  async function lerCopia(id,g) {
    const textos=[];let parte=1,total=1,hashEsperado='',integridade='';
    while(parte<=total) {
      const resposta=await api('obterParteCopiaRestauracaoWeb',{copiaId:id,parte,quantidade:20},1);if(!atual(g))return null;
      const chunks=resposta.chunks || [{parte:resposta.parte,chunk:resposta.chunk}];
      if(resposta.copiaId!==id || !Number.isInteger(resposta.totalPartes) || resposta.totalPartes<1 || resposta.totalPartes>1000 || (parte>1 && (resposta.totalPartes!==total || resposta.hashCopia!==hashEsperado))) throw new Error('A cópia mudou durante a leitura. Confira o catálogo novamente.');
      total=resposta.totalPartes;hashEsperado=resposta.hashCopia || '';integridade=resposta.integridade;
      if(!chunks.length || chunks.length>20 || parte+chunks.length-1>total || chunks.some((p,i)=>p.parte!==parte+i || typeof p.chunk!=='string' || p.chunk.length>12000)) throw new Error('A sequência de partes da cópia está incompleta. Preserve a planilha para conferência.');
      textos.push(...chunks.map(p=>p.chunk));parte+=chunks.length;
      informar(g,'Conferindo a cópia preservada…',{valor:Math.min(total,parte-1),total});
    }
    const texto=textos.join('');if(new TextEncoder().encode(texto).length>LIMITE_ARQUIVO_RESTAURACAO_UI_GESTOR)throw new Error('A cópia excede o limite de 8 MB.');
    if(hashEsperado && await hash(texto)!==hashEsperado)throw new Error('O comprovante de integridade da cópia não confere. Nenhum dado foi restaurado.');
    if(!atual(g))return null;let conteudo;
    try{conteudo=JSON.parse(texto);}catch(_){throw new Error('A cópia preservada está incompleta ou incompatível.');}
    return {conteudo,legado:integridade==='legado'};
  }
  async function selecionarCopia(id,baixar=false) {
    const g=iniciar('Cópia preservada '+id);
    try {
      if(!id)throw new Error('Selecione uma cópia anterior no catálogo.');
      disponibilidade();const copia=await lerCopia(id,g);if(!copia || !atual(g))return;
      if(baixar){(opcoes.baixar || baixarJSONRestauracaoGestor)(copia.conteudo,'Backup_Anterior_'+id.replace(/[^A-Za-z0-9_-]/g,'_')+'.json');estado.mensagem='Cópia conferida e preparada para baixar. Nenhum dado da planilha foi substituído.';}
      else {await prepararConteudo(copia.conteudo,estado.nome,g);if(atual(g) && copia.legado && estado.resumo) estado.resumo.avisos=['Esta cópia é antiga e não possui o comprovante original de integridade. Confira cuidadosamente os valores antes de restaurar.',...(estado.resumo.avisos || [])];}
    }catch(e){falhou(g,e);}finally{if(atual(g)){estado.ocupado=false;notificar();}}
  }
  function capturarConfirmacao() {
    if(estado.ocupado || estado.aplicando || !estado.resumo || !estado.ref)return null;
    return {geracao:estado.geracao,resumo:estado.resumo,ref:estado.ref,requestId:idNovo()};
  }
  async function confirmar(snapshot) {
    if(!snapshot || estado.aplicando || estado.ocupado || snapshot.geracao!==estado.geracao || snapshot.resumo!==estado.resumo || snapshot.ref!==estado.ref)throw new Error('A seleção mudou. Confira a prévia atual antes de confirmar.');
    disponibilidade();estado.aplicando=true;estado.ocupado=true;estado.erro=false;estado.mensagem='Guardando a cópia anterior e restaurando os dados. Aguarde a confirmação…';notificar();
    try {
      if(!guardarBloqueio(snapshot.requestId))throw new Error('Não foi possível guardar a identificação de recuperação. A restauração não foi enviada. Libere espaço antes de continuar.');
      await api('restaurarBackupDadosWeb',{...snapshot.ref,hashBackup:snapshot.resumo.hashBackup,versaoAtual:snapshot.resumo.versaoAtual,confirmacao:'RESTAURAR',requestId:snapshot.requestId},1);
      if(snapshot.ref.hashImportacao){try{await api('descartarImportacaoBackupWeb',snapshot.ref,1);remover('gestorImportacaoBackupV1:'+snapshot.ref.hashImportacao);estado.preparacao=null;}catch(_){/* A restauração já foi confirmada. A preparação pode ser descartada depois. */}}
      estado.ref=null;estado.resumo=null;estado.progresso=null;estado.mensagem='Restauração confirmada. A cópia anterior está no catálogo abaixo.';
      let atualizou=false;
      try{atualizou=await (opcoes.aposConfirmar || carregarDados)();}catch(_){/* Gravação confirmada: falha de leitura não desfaz a restauração. */}
      if(atualizou===false)estado.mensagem+=' Os dados foram restaurados, mas a tela ainda precisa atualizar. Confira a conexão e atualize o app.';
      return true;
    }catch(e){estado.erro=true;estado.mensagem=e.resultadoIncerto?'A confirmação ainda não chegou. Abra Atividade e sincronização e consulte ou repita o mesmo envio protegido. Não crie outra restauração.':mensagemErroRestauracaoGestor(e);estado.resumo=null;estado.ref=null;return false;}
    finally{estado.aplicando=false;estado.ocupado=false;notificar();}
  }
  async function descartarPreparacao(){
    if(estado.ocupado || estado.aplicando || !estado.preparacao)return false;
    disponibilidade();const ref=estado.preparacao,g=estado.geracao;estado.ocupado=true;notificar();
    try{await api('descartarImportacaoBackupWeb',ref,1);remover('gestorImportacaoBackupV1:'+ref.hashImportacao);if(atual(g)){estado.preparacao=null;estado.ref=null;estado.resumo=null;estado.mensagem='Preparação descartada. Os dados financeiros e as cópias preservadas não foram alterados.';}return true;}
    finally{if(atual(g)){estado.ocupado=false;notificar();}}
  }
  return {estado,selecionarArquivo,selecionarCopia,capturarConfirmacao,confirmar,descartarPreparacao};
}

document.addEventListener('DOMContentLoaded',()=>{
  const modal=document.getElementById('modalExportarDados');if(!modal?.firstElementChild)return;
  const elemento=(tag,texto,classe='')=>{const e=document.createElement(tag);e.textContent=texto;e.className=classe;return e;};
  const botao=(texto,classe='')=>{const e=elemento('button',texto,'rounded-xl border border-slate-600 px-3 py-3 text-xs font-bold disabled:opacity-50 '+classe);e.type='button';return e;};
  const painel=elemento('section','','border-t border-slate-700 pt-4 space-y-3');painel.id='painelRestauracaoCompleta';
  const exportacaoStatus=elemento('p','','text-xs text-slate-300');exportacaoStatus.id='estadoExportacaoCompletaGestor';exportacaoStatus.setAttribute('aria-live','polite');modal.firstElementChild.append(exportacaoStatus);
  const titulo=elemento('h4','Restaurar backup','text-sm font-bold text-white');
  const ajuda=elemento('p','1. Selecione um JSON ou uma cópia anterior. 2. Confira a comparação. 3. Digite RESTAURAR e confirme. A restauração substitui dados; não junta lançamentos. Sincronize as pendências e feche o app nos outros aparelhos.','text-xs text-slate-300');
  const arquivo=document.createElement('input');arquivo.type='file';arquivo.accept='.json,application/json';arquivo.className='block w-full max-w-full text-xs text-slate-200';arquivo.setAttribute('aria-label','Arquivo JSON de backup, até 8 MB');
  const status=elemento('p','','text-xs text-slate-200');status.setAttribute('aria-live','polite');
  const progresso=document.createElement('progress');progresso.className='w-full';progresso.hidden=true;progresso.setAttribute('aria-label','Progresso da preparação do backup');
  const previa=elemento('div','','space-y-3'),descartar=botao('Descartar preparação deste arquivo','w-full text-slate-200');descartar.hidden=true;
  const label=elemento('label','Para confirmar esta prévia, digite RESTAURAR','block text-xs text-slate-300');
  const confirmar=document.createElement('input');confirmar.type='text';confirmar.autocomplete='off';confirmar.spellcheck=false;confirmar.className='mt-1 block w-full rounded-xl border border-slate-600 bg-slate-900 p-3 text-white';confirmar.setAttribute('aria-label','Digite RESTAURAR para confirmar a prévia');label.append(confirmar);label.hidden=true;
  const executar=botao('Restaurar os dados conferidos','w-full border-rose-500/50 bg-rose-800 text-white');executar.disabled=true;executar.hidden=true;
  const historico=elemento('details','','rounded-xl border border-slate-700 p-3');historico.append(elemento('summary','Cópias anteriores e recuperação','cursor-pointer text-xs font-bold text-sky-200'));
  const carregar=botao('Consultar cópias preservadas','w-full mt-3 text-sky-200'),lista=document.createElement('select');lista.className='mt-2 w-full rounded-xl border border-slate-600 bg-slate-900 p-3 text-xs text-white';lista.setAttribute('aria-label','Cópia anterior à restauração');lista.hidden=true;
  const acoes=elemento('div','','grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2'),verCopia=botao('Conferir para restaurar','text-sky-200'),baixar=botao('Baixar cópia','text-slate-200');acoes.append(verCopia,baixar);acoes.hidden=true;
  const listaStatus=elemento('p','','mt-2 text-xs text-slate-300'),mais=botao('Ver mais cópias','w-full mt-2 text-slate-200');mais.hidden=true;
  const conferirPendente=botao('Conferir restauração interrompida','w-full mt-3 text-slate-200'),atividade=botao('Abrir Atividade e sincronização','w-full mt-2 text-sky-200');
  historico.append(carregar,lista,acoes,listaStatus,mais,conferirPendente,atividade);
  painel.append(titulo,ajuda,arquivo,status,progresso,descartar,previa,label,executar,historico);modal.firstElementChild.append(painel);
  let ultimaPrevia=null,escolhas=[],carregandoCatalogo=false;
  function renderizar(estado) {
    status.textContent=estado.mensagem;status.className='text-xs '+(estado.erro?'text-amber-200':'text-slate-200');
    arquivo.disabled=estado.aplicando;lista.disabled=estado.aplicando;verCopia.disabled=estado.ocupado;baixar.disabled=estado.ocupado;
    descartar.hidden=!estado.preparacao || estado.aplicando;descartar.disabled=estado.ocupado;
    confirmar.disabled=estado.ocupado;label.hidden=!estado.resumo;executar.hidden=!estado.resumo;executar.disabled=estado.ocupado || !estado.resumo || confirmar.value!=='RESTAURAR';
    progresso.hidden=!estado.progresso;if(estado.progresso){progresso.max=estado.progresso.total;progresso.value=estado.progresso.valor;}
    if(ultimaPrevia===estado.resumo)return;ultimaPrevia=estado.resumo;previa.replaceChildren();confirmar.value='';executar.disabled=true;
    if(!estado.resumo)return;
    const r=estado.resumo;previa.append(elemento('p','Destino: '+r.planilha+' · Backup: '+dataLegivelBackupGestor(r.geradoEm)+' · '+estado.nome,'text-xs font-bold text-white'));
    if(r.origem && r.origem!==r.planilha)previa.append(elemento('p','A origem “'+r.origem+'” é diferente do destino. Confira se esta é a planilha que deseja substituir.','text-xs text-amber-200'));
    for(const aviso of r.avisos || [])previa.append(elemento('p',aviso,'text-xs text-amber-200'));
    for(const aba of r.abas || []) {
      const cartao=elemento('details','','rounded-xl border border-slate-700 bg-slate-900/50 p-3 text-xs text-slate-200');
      const resumo=elemento('summary',aba.nome+': '+aba.atual.registros+' → '+aba.backup.registros+' registros','cursor-pointer font-bold text-white');cartao.append(resumo);
      const d=aba.diferencas || {};cartao.append(elemento('p',(d.incluidos || 0)+' incluídos · '+(d.alterados || 0)+' alterados · '+(d.removidos || 0)+' removidos · '+(d.mantidos || 0)+' mantidos','mt-2'));
      for(const [campo,rotulo]of [['total','Total registrado'],['pagoBanco','Pago ao banco'],['saldoBanco','Saldo no banco'],['recebido','Recebido das pessoas'],['aReceber','A receber das pessoas'],['valorCancelado','Fora do total: cancelados/pulados']])if(aba.backup[campo]!=null)cartao.append(elemento('p',rotulo+': '+formatBRL(aba.atual[campo] || 0)+' → '+formatBRL(aba.backup[campo]),'mt-1'));
      for(const a of d.amostras || [])cartao.append(elemento('p',({incluidos:'Incluir',alterados:'Alterar',removidos:'Remover'}[a.tipo] || a.tipo)+': '+a.descricao,'mt-1 text-slate-300'));
      previa.append(cartao);
    }
    previa.append(elemento('p','As abas listadas serão substituídas. As ausentes serão preservadas. O diário atual e os comprovantes dos envios continuam guardados. Uma cópia anterior será salva antes da mudança. Código, permissões, preferências locais e chave Pix deste aparelho não são substituídos.','text-xs text-amber-200'));
  }
  const controle=criarControleRestauracaoGestor({onChange:renderizar});
  descartar.onclick=()=>mostrarConfirmacao('Descartar a preparação do arquivo?','Isso remove somente as partes temporárias deste arquivo. Os lançamentos, o diário financeiro e as cópias anteriores continuam preservados.',async()=>{try{await controle.descartarPreparacao();}catch(e){mostrarAviso('Preparação preservada',mensagemErroRestauracaoGestor(e));}},false,'Descartar preparação','neutral');
  arquivo.addEventListener('change',()=>controle.selecionarArquivo(arquivo.files?.[0]));
  confirmar.addEventListener('input',()=>{executar.disabled=controle.estado.ocupado || !controle.estado.resumo || confirmar.value!=='RESTAURAR';});
  executar.addEventListener('click',()=>{
    if(confirmar.value!=='RESTAURAR')return;const snapshot=controle.capturarConfirmacao();if(!snapshot)return;
    mostrarConfirmacao('Substituir os dados conferidos?','A planilha “'+snapshot.resumo.planilha+'” receberá os dados desta prévia. A cópia anterior será guardada antes da substituição. O pagamento ao banco e o recebimento das pessoas continuam separados.',async()=>{
      if(confirmar.value!=='RESTAURAR'){mostrarAviso('Confira a confirmação','Digite RESTAURAR na prévia atual.');return;}
      try{if(await controle.confirmar(snapshot)){arquivo.value='';mostrarAviso('Restauração confirmada','Os dados foram restaurados e a cópia anterior foi preservada.');}}
      catch(e){mostrarAviso('Confira a prévia atual',mensagemErroRestauracaoGestor(e));}
    },false,'Restaurar dados');
  });
  async function catalogo(append=false) {
    if(carregandoCatalogo || controle.estado.aplicando)return;carregandoCatalogo=true;carregar.disabled=true;mais.disabled=true;
    try {
      const selecionada=lista.value,r=await apiCall('listarCopiasRestauracaoWeb',{offset:append?escolhas.length:0,limite:10},1);escolhas=append?escolhas.concat(r.itens):r.itens;lista.replaceChildren();
      for(const copia of escolhas){const o=document.createElement('option');o.value=copia.id;o.disabled=!copia.disponivel;o.textContent=dataLegivelBackupGestor(copia.data)+' · '+copia.id.slice(0,8)+(copia.integridade==='legado'?' · legada':'')+(!copia.disponivel?' · indisponível':'');lista.append(o);}
      const primeira=escolhas.find(c=>c.disponivel);if(primeira)lista.value=escolhas.some(c=>c.id===selecionada && c.disponivel)?selecionada:primeira.id;
      lista.hidden=!escolhas.length;acoes.hidden=!escolhas.length;verCopia.disabled=baixar.disabled=!primeira;mais.hidden=!r.temMais;
      listaStatus.textContent=escolhas.length?'Selecione uma cópia para conferir antes de restaurar ou somente baixar. Cópias legadas não têm o comprovante original; cópias incompatíveis ficam bloqueadas.':'Nenhuma restauração anterior. Ao restaurar, a cópia dos dados atuais aparecerá aqui.';
      const problemas=escolhas.filter(c=>!c.disponivel);if(problemas.length)listaStatus.textContent+=' '+problemas.length+' cópia(s) indisponíveis: '+problemas.map(c=>c.motivo).join(' ');
    }catch(e){listaStatus.textContent=mensagemErroRestauracaoGestor(e);}finally{carregandoCatalogo=false;carregar.disabled=false;mais.disabled=false;}
  }
  carregar.onclick=()=>catalogo(false);mais.onclick=()=>catalogo(true);
  verCopia.onclick=()=>{arquivo.value='';controle.selecionarCopia(lista.value);};baixar.onclick=()=>controle.selecionarCopia(lista.value,true);
  atividade.onclick=()=>{modal.classList.add('hidden');abrirAtividadeGestor();};
  conferirPendente.onclick=async()=>{
    if(controle.estado.aplicando)return;conferirPendente.disabled=true;
    try {
      const id=localStorage.getItem('gestorRestauracaoEmAndamentoV1');
      if(id){const r=await apiCall('consultarOperacaoWeb',{action:'restaurarBackupDadosWeb',requestId:id},1);if(r.estado==='confirmado' || r.estado==='cancelado'){if(r.estado==='confirmado')limparCachesAposRestauracaoGestor();localStorage.removeItem('gestorRestauracaoEmAndamentoV1');await carregarDados();status.textContent=r.estado==='confirmado'?'Restauração confirmada e dados consultados.':'O envio foi cancelado com segurança.';}else status.textContent='A restauração ainda precisa de confirmação. Abra Atividade e sincronização e mantenha o envio original. Não crie outra restauração.';}
      else if(listarPendenciasAtividadeGestor().length){status.textContent='Há envios pendentes. Abra Atividade e sincronização para consultar a confirmação ou repetir o envio protegido.';}
      else {const aplicou=await carregarDados();status.textContent=aplicou===false?'A consulta não atualizou a tela. Confira a conexão e tente novamente.':'Dados consultados. Não há restauração pendente neste aparelho.';}
    }catch(e){status.textContent=mensagemErroRestauracaoGestor(e);}finally{conferirPendente.disabled=false;}
  };
});
