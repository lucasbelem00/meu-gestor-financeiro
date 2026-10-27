// Fonte da proteção de longo prazo. Incorporada em Backend/Code.gs pelo build.
// Nenhuma cópia é removida automaticamente. Jobs só substituem um estado que
// ainda coincide integralmente com o estado conferido antes ou depois.
const CONFIG_PROTECAO_GESTOR_='GESTOR_PROTECAO_V1';
const ABA_ARQUIVOS_ANUAIS_GESTOR_='_Gestor_ArquivosAnuais';
const ABA_MANUTENCAO_PROTECAO_GESTOR_='_Gestor_Manutencao';
const CAB_ARQUIVOS_ANUAIS_GESTOR_=['Ano','Arquivo ID','SHA256','Resumo JSON','Gerado em','Lote'];
const CAB_MANUTENCAO_PROTECAO_GESTOR_=['Operação','Estado','Arquivo do plano','SHA256','Data','Detalhe'];
const NOME_PASTA_BACKUPS_GESTOR_='Backups do Gestor de Gastos';
function realProtecaoGestor_(){return CONTEXTO_GESTOR_?CONTEXTO_GESTOR_.ssReal:obterPlanilhaGestor_();}
function configProtecaoGestor_(){
  const texto=propriedade_(CONFIG_PROTECAO_GESTOR_);if(!texto)return {versao:1,ativo:false};
  let c;try{c=JSON.parse(texto);}catch(_){throw Error('A configuração de backups está inválida. Preserve a propriedade para conferência.');}
  if(c.versao!==1)throw Error('Configuração de backups incompatível.');return c;
}
function salvarConfigProtecaoGestor_(c){PropertiesService.getScriptProperties().setProperty(CONFIG_PROTECAO_GESTOR_,JSON.stringify(c));}
function comLockProtecaoGestor_(fn){
  if(CONTEXTO_GESTOR_)throw Error('A manutenção precisa de uma execução separada das gravações financeiras.');
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try{const ss=obterPlanilhaGestor_();retomarManutencaoProtecaoGestor_(ss);return fn(ss);}finally{lock.releaseLock();}
}
function normalizarMatrizProtecaoGestor_(linhas,colunas){return linhas.map(function(r){return Array.from({length:colunas},function(_,i){return r[i]==null?'':r[i];});});}
function abaTecnicaProtecaoGestor_(ss,nome,cab,criar){
  let sh=ss.getSheetByName(nome);
  if(!sh&&criar){sh=ss.insertSheet(nome);gravarMatrizProtecaoGestor_(sh,[cab]);if(sh.hideSheet)sh.hideSheet();}
  if(sh&&hashGestor_(sh.getRange(1,1,1,cab.length).getValues()[0])!==hashGestor_(cab))throw Error('Estrutura incompatível em '+nome+'. Preserve a aba para conferência.');return sh;
}
function gravarMatrizProtecaoGestor_(sh,linhas,formulas){
  const colunas=Math.max(1,...linhas.map(function(r){return r.length;})),n=Math.max(1,linhas.length),anterior=sh.getLastRow();
  if(sh.getMaxRows&&n>sh.getMaxRows())sh.insertRowsAfter(sh.getMaxRows(),n-sh.getMaxRows());
  if(sh.getMaxColumns&&colunas>sh.getMaxColumns())sh.insertColumnsAfter(sh.getMaxColumns(),colunas-sh.getMaxColumns());
  // Uma gravação única inclui a cauda vazia: a recuperação não aceita um
  // prefixo parcialmente escrito nem sobrescreve divergências externas.
  const dados=normalizarMatrizProtecaoGestor_(linhas,colunas);
  while(dados.length<anterior)dados.push(Array(colunas).fill(''));
  if(dados.length)sh.getRange(1,1,dados.length,colunas).setValues(dados.map(function(r,i){return r.map(function(v,j){
    const formula=formulas?.[i]?.[j];
    if(formula){if(typeof formula!=='string'||formula[0]!=='='||formula!==v)throw Error('Fórmula original incompatível com o plano de manutenção.');return formula;}
    return typeof v==='string'&&/^[=+@]/.test(v)?"'"+v:v;
  });}));
  SpreadsheetApp.flush();
}
function pastaProtecaoGestor_(pastaId,criar){
  const c=configProtecaoGestor_();let id=String(pastaId||c.pastaId||'').trim();
  if(id.includes('/folders/'))id=id.split('/folders/')[1].split(/[?#/]/)[0];
  let pasta;
  if(id){if(!/^[A-Za-z0-9_-]{8,160}$/.test(id))throw Error('Informe o endereço da pasta de backups.');pasta=DriveApp.getFolderById(id);}
  else {
    const encontrados=DriveApp.getFoldersByName(NOME_PASTA_BACKUPS_GESTOR_);
    if(encontrados.hasNext()){pasta=encontrados.next();if(encontrados.hasNext())throw Error('Há mais de uma pasta de backups com esse nome. Informe o endereço da pasta desejada.');}
    else if(criar)pasta=DriveApp.createFolder(NOME_PASTA_BACKUPS_GESTOR_);
    else throw Error('Configure a pasta de backups no Apps Script.');
  }
  if(!pasta||pasta.isTrashed&&pasta.isTrashed())throw Error('A pasta de backups não está disponível.');
  if(pasta.getSharingAccess&&pasta.getSharingAccess()!==DriveApp.Access.PRIVATE)throw Error('Use uma pasta de backups privada, sem compartilhamento por link.');
  if(pasta.getEditors&&pasta.getEditors().length||pasta.getViewers&&pasta.getViewers().length)throw Error('A pasta de backups deve ser particular, sem outros editores ou leitores.');
  if(pasta.getOwner&&Session.getEffectiveUser){const dono=pasta.getOwner()?.getEmail(),conta=Session.getEffectiveUser()?.getEmail();if(dono&&conta&&dono!==conta)throw Error('Use uma pasta da própria conta que executa o Apps Script.');}
  return pasta;
}
function salvarJsonProtecaoGestor_(pasta,nome,dados){
  const texto=JSON.stringify(serializarGestor_(dados)),hash=hashTextoBackupGestor_(texto);
  const arquivo=pasta.createFile(nome,texto,'application/json');
  const lido=arquivo.getBlob().getDataAsString('UTF-8');
  if(hashTextoBackupGestor_(lido)!==hash)throw Error('A cópia no Drive não passou na conferência. A origem foi preservada.');
  return {id:arquivo.getId(),hash:hash,url:arquivo.getUrl(),bytes:Utilities.newBlob(texto).getBytes().length};
}
function lerJsonProtecaoGestor_(ref){
  if(!ref||!/^[A-Za-z0-9_-]{8,160}$/.test(String(ref.id||''))||!/^[a-f0-9]{64}$/.test(String(ref.hash||'')))throw Error('Referência de arquivo inválida.');
  const texto=DriveApp.getFileById(ref.id).getBlob().getDataAsString('UTF-8');
  if(hashTextoBackupGestor_(texto)!==ref.hash)throw Error('O arquivo de segurança mudou ou está incompleto. Preserve a origem para conferência.');
  return desserializarGestor_(JSON.parse(texto));
}
function destinosPlanoProtecaoGestor_(plano){
  const destinos=[];
  (plano.mudancas||[]).forEach(function(m){
    if(m.nome===ABA_ARQUIVOS_ANUAIS_GESTOR_)(m.valores||[]).slice(1).forEach(function(r){destinos.push({tipo:'anual',ano:Number(r[0]),id:String(r[1]),hash:String(r[2])});});
    if(m.nome===ABA_DIARIO_GESTOR_||m.nome===ABA_ATIVIDADE_GESTOR_)(m.valores||[]).slice(1).forEach(function(r){
      const tecnico=m.nome===ABA_DIARIO_GESTOR_&&r[2]==='ARQUIVADO'||m.nome===ABA_ATIVIDADE_GESTOR_&&r[4]==='EVENTO_ARQUIVADO';if(!tecnico)return;
      const ref=JSON.parse(String(r[m.nome===ABA_DIARIO_GESTOR_?4:5]));
      if(ref.versao!==1||ref.chave!==String(r[0])||!['operacoes','eventos'].includes(ref.tipo))throw Error('Referência técnica incompatível no plano de manutenção.');
      destinos.push({tipo:'tecnico',id:ref.id,hash:ref.hash,conteudo:ref.tipo,chave:ref.chave});
    });
  });return destinos;
}
function conferirDestinosPlanoProtecaoGestor_(plano){
  const referencias=destinosPlanoProtecaoGestor_(plano),destinos=plano.versao===1?referencias:plano.destinos,conferidos=new Map();
  if(!Array.isArray(destinos)||destinos.some(function(d){return !referencias.some(function(r){return hashGestor_(r)===hashGestor_(d);});}))throw Error('Destinos incompatíveis no plano de manutenção.');
  destinos.forEach(function(d){try{
    if(d.tipo==='anual'){
      if(!Number.isInteger(d.ano)||d.ano<2000||d.ano>2200)throw Error('Ano incompatível.');
      const chave='anual:'+d.id+':'+d.hash;if(!conferidos.has(chave))conferidos.set(chave,dadosArquivoAnualProtecaoGestor_(d,true));
    }else if(d.tipo==='tecnico'){
      const chave='tecnico:'+d.id+':'+d.hash;if(!conferidos.has(chave))conferidos.set(chave,lerJsonProtecaoGestor_(d));
      const bundle=conferidos.get(chave);if(bundle.versao!==1||bundle.planilhaId!==plano.planilhaId||!Object.prototype.hasOwnProperty.call(bundle[d.conteudo]||{},d.chave))throw Error('Conteúdo técnico incompleto.');
    }else throw Error('Tipo de destino inválido.');
  }catch(erro){const e=Error('O arquivo de destino da manutenção não pôde ser conferido. A origem não será substituída nesta etapa. Confira os backups e preserve os arquivos. Detalhe: '+String(erro.message||erro));e.codigo='DESTINO_MANUTENCAO_INVALIDO';throw e;}});
}
function formulaConstanteProtecaoGestor_(formula){
  if(!formula)return true;
  const expressao=String(formula).replace(/^=/,'').replace(/"(?:[^"]|"")*"/g,'0').replace(/\d+(?:[.,]\d+)?(?:[Ee][+-]?\d+)?/g,'0').replace(/\b(?:TRUE|FALSE)\b/gi,'0');
  return /^[\s0()+\-*/^%&<>=]+$/.test(expressao);
}
function conferirFormulasCompactacaoProtecaoGestor_(formulas,nome){
  if((formulas||[]).some(function(r){return r.some(function(f){return f&&!formulaConstanteProtecaoGestor_(f);});}))throw Error('Há fórmulas personalizadas com referências ou funções não constantes em '+nome+'. O arquivamento foi interrompido para não deslocar essas referências. Os dados continuam na principal.');
}
function conferirDestinosRestauracaoGestor_(plano,ss){
  const catalogo=(plano.mudancas||[]).find(function(m){return m.nome===ABA_ARQUIVOS_ANUAIS_GESTOR_;});
  if(!catalogo){if(plano.destinosAnuaisRestauracao)throw Error('Plano de restauração anual incompatível.');return;}
  // Planos antigos guardam o catálogo inteiro nas alterações de linhas.
  const base=lerEstadoAbaGestor_(ss.getSheetByName(ABA_ARQUIVOS_ANUAIS_GESTOR_));
  const linhas=Array.from({length:catalogo.linhas},function(_,i){return base[i]||null;});
  (catalogo.alteracoes||[]).forEach(function(a){if(Number.isInteger(a[0])&&a[0]>=0&&a[0]<linhas.length)linhas[a[0]]=a[1];});
  if(!linhas.length||linhas.some(function(r){return !Array.isArray(r);})||hashGestor_(linhas[0])!==hashGestor_(CAB_ARQUIVOS_ANUAIS_GESTOR_))throw Error('Catálogo do plano de restauração incompleto. Preserve o diário para conferência.');
  const destinos=linhas.slice(1).map(function(r){return {ano:Number(r[0]),id:String(r[1]),hash:String(r[2])};});
  if(plano.destinosAnuaisRestauracao&&hashGestor_(plano.destinosAnuaisRestauracao)!==hashGestor_(destinos))throw Error('Destinos incompatíveis na restauração.');
  destinos.forEach(function(d){try{
    if(!Number.isInteger(d.ano)||d.ano<2000||d.ano>2200||!/^[A-Za-z0-9_-]{8,160}$/.test(d.id)||!/^[a-f0-9]{64}$/.test(d.hash))throw Error('Referência anual incompatível.');
    dadosArquivoAnualProtecaoGestor_(d,true);
  }catch(erro){const e=Error('O arquivo anual de destino da restauração não pôde ser conferido. A etapa foi preservada; confira os backups antes de retomar. Detalhe: '+String(erro.message||erro));e.codigo='DESTINO_RESTAURACAO_INVALIDO';throw e;}});
}
function conferirFormulasOutrasAbasProtecaoGestor_(ss){
  const nomes=(typeof ss.getNamedRanges==='function'?ss.getNamedRanges():[]).filter(function(n){return ['Lançamentos','Empréstimos'].includes(n.getRange().getSheet().getName());}).map(function(n){return n.getName().toUpperCase();});
  ss.getSheets().filter(function(sh){return !['Lançamentos','Empréstimos'].includes(sh.getName());}).forEach(function(sh){
    const formulas=sh.getDataRange().getFormulas();
    // Fórmulas com endereço de outra aba ou indireção precisam de revisão.
    // Fórmulas locais, como limites cadastrados em B2, continuam permitidas.
    if(formulas.some(function(r){return r.some(function(f){if(!f)return false;const texto=String(f).replace(/"(?:[^"]|"")*"/g,'');const folhas=Array.from(texto.matchAll(/(?:'((?:[^']|'')+)'|([A-Z_\u00C0-\uFFFF][A-Z0-9_.\u00C0-\uFFFF]*))!/gi));return folhas.some(function(m){return ['lançamentos','empréstimos'].includes((m[1]||m[2]).replace(/''/g,"'").toLowerCase());})||/\b(?:INDIRECT|INDIRETO|OFFSET|DESLOC|IMPORTRANGE)\s*\(/i.test(texto)||nomes.some(function(nome){return texto.toUpperCase().split(/[^A-Z0-9_.]/).includes(nome);});});}))throw Error('Há fórmulas com referências entre abas ou indiretas em '+sh.getName()+'. Preserve essa personalização antes de arquivar; os registros continuam na principal.');
  });
}
function registrarPlanoProtecaoGestor_(ss,pasta,mudancas,tipo,destinos){
  if(!mudancas.length)return {sucesso:true,semMudancas:true};
  const id='manutencao-'+gerarIdGestor_(),plano={versao:2,id:id,planilhaId:propriedade_(CHAVE_ID_PLANILHA_GESTOR),tipo:tipo,mudancas:mudancas};
  plano.destinos=destinos||destinosPlanoProtecaoGestor_(plano);conferirDestinosPlanoProtecaoGestor_(plano);
  const ref=salvarJsonProtecaoGestor_(pasta,'Gestor_Plano_'+id+'.json',plano);
  const sh=abaTecnicaProtecaoGestor_(ss,ABA_MANUTENCAO_PROTECAO_GESTOR_,CAB_MANUTENCAO_PROTECAO_GESTOR_,true);
  sh.getRange(sh.getLastRow()+1,1,1,6).setValues([[id,'PRONTO',ref.id,ref.hash,new Date(),'']]);SpreadsheetApp.flush();
  retomarManutencaoProtecaoGestor_(ss);return {sucesso:true,operacaoId:id,tipo:tipo};
}
function assinaturaFormulasProtecaoGestor_(formulas){
  const celulas=[];(formulas||[]).forEach(function(r,i){r.forEach(function(f,j){if(f)celulas.push([i,j,f]);});});return hashGestor_(celulas);
}
function formulasAbaProtecaoGestor_(sh){return sh&&sh.getLastRow()?sh.getDataRange().getFormulas():[];}
function mudancaProtecaoGestor_(ss,nome,depois,formulas){
  const sh=ss.getSheetByName(nome);
  return {nome:nome,antes:hashEstadoGestor_(lerEstadoAbaGestor_(sh)),depois:hashEstadoGestor_(depois),valores:depois,
    antesFormulas:assinaturaFormulasProtecaoGestor_(formulasAbaProtecaoGestor_(sh)),depoisFormulas:assinaturaFormulasProtecaoGestor_(formulas),formulas:formulas||[]};
}
function retomarManutencaoProtecaoGestor_(ss){
  const sh=abaTecnicaProtecaoGestor_(ss,ABA_MANUTENCAO_PROTECAO_GESTOR_,CAB_MANUTENCAO_PROTECAO_GESTOR_,false);if(!sh||sh.getLastRow()<2)return;
  const pendentes=localizarLinhasTecnicasGestor_(sh,2,'PRONTO');
  pendentes.forEach(function(linha){
    const r=sh.getRange(linha,1,1,6).getValues()[0],plano=lerJsonProtecaoGestor_({id:r[2],hash:r[3]});
    const permitidas=['Lançamentos','Empréstimos',ABA_ARQUIVOS_ANUAIS_GESTOR_,ABA_DIARIO_GESTOR_,ABA_ATIVIDADE_GESTOR_];
    if(![1,2].includes(plano.versao)||plano.id!==r[0]||plano.planilhaId!==propriedade_(CHAVE_ID_PLANILHA_GESTOR)||!Array.isArray(plano.mudancas)||plano.mudancas.some(function(m){return !permitidas.includes(m.nome)||!Array.isArray(m.valores)||hashEstadoGestor_(m.valores)!==m.depois;}))throw Error('Plano de manutenção incompatível. Nenhuma divergência será sobrescrita.');
    // A expressão e a natureza da célula fazem parte da conferência. Texto
    // literal "=..." nunca é promovido a fórmula por semelhança de conteúdo.
    const coincide=function(m,sh,lado){const f=formulasAbaProtecaoGestor_(sh);return hashEstadoGestor_(lerEstadoAbaGestor_(sh))===m[lado]&&(m[lado+'Formulas']?assinaturaFormulasProtecaoGestor_(f)===m[lado+'Formulas']:!f.some(function(r){return r.some(Boolean);}));};
    plano.mudancas.forEach(function(m){if(m.depoisFormulas&&assinaturaFormulasProtecaoGestor_(m.formulas)!==m.depoisFormulas)throw Error('Plano de fórmulas incompatível.');const alvo=ss.getSheetByName(m.nome);if(!coincide(m,alvo,'antes')&&!coincide(m,alvo,'depois'))throw Error('A manutenção encontrou alteração externa ou fórmula não conferida em '+m.nome+'. Preserve os dados para conferência.');});
    conferirDestinosPlanoProtecaoGestor_(plano);
    if(plano.tipo==='arquivo-anual')conferirFormulasOutrasAbasProtecaoGestor_(ss);
    plano.mudancas.forEach(function(m){let alvo=ss.getSheetByName(m.nome);if(coincide(m,alvo,'depois'))return;conferirDestinosPlanoProtecaoGestor_(plano);if(plano.tipo==='arquivo-anual'&&['Lançamentos','Empréstimos'].includes(m.nome))conferirFormulasCompactacaoProtecaoGestor_(m.formulas,m.nome);if(!alvo)alvo=ss.insertSheet(m.nome);gravarMatrizProtecaoGestor_(alvo,m.valores,m.formulas);if(!coincide(m,alvo,'depois'))throw Error('A manutenção ainda precisa de conferência em '+m.nome+'.');});
    conferirDestinosPlanoProtecaoGestor_(plano);
    sh.getRange(linha,2).setValue('CONFIRMADO');SpreadsheetApp.flush();
  });
}
function conferirSemPendenciasProtecaoGestor_(ss){
  const d=ss.getSheetByName(ABA_DIARIO_GESTOR_);if(!d)return;
  if(['PRONTO','PREPARANDO'].some(function(e){return localizarLinhasTecnicasGestor_(d,3,e).length;}))throw Error('Resolva os envios em conferência antes da manutenção ou do backup automático.');
}
function ativarProtecaoPeloMenuGestor(){const r=configurarProtecaoAutomaticaGestor();SpreadsheetApp.getUi().alert('Proteção automática ativada',r.mensagem,SpreadsheetApp.getUi().ButtonSet.OK);}
function backupPeloMenuGestor(){const r=executarBackupProtegidoWeb({requestId:'manual-'+gerarIdGestor_()});SpreadsheetApp.getUi().alert('Backup confirmado no Drive',r.url,SpreadsheetApp.getUi().ButtonSet.OK);}
function catalogoAnualProtecaoGestor_(ss,conferirResumo=true){
  const sh=abaTecnicaProtecaoGestor_(ss||obterPlanilhaGestor_(),ABA_ARQUIVOS_ANUAIS_GESTOR_,CAB_ARQUIVOS_ANUAIS_GESTOR_,false);
  if(!sh||sh.getLastRow()<2)return [];
  const vistos=new Set();return sh.getRange(2,1,sh.getLastRow()-1,6).getValues().map(function(r){
    const ano=Number(r[0]);let resumo;try{resumo=JSON.parse(String(r[3]));}catch(_){throw Error('Resumo do arquivo anual inválido.');}
    if(!Number.isInteger(ano)||ano<2000||ano>2200||vistos.has(ano)||!/^[A-Za-z0-9_-]{8,160}$/.test(String(r[1]))||!/^[a-f0-9]{64}$/.test(String(r[2]))||resumo.versao!==1||!Array.isArray(resumo.meses))throw Error('Catálogo anual incompatível. Preserve os arquivos.');
    vistos.add(ano);const e={ano:ano,id:String(r[1]),hash:String(r[2]),resumo:resumo,data:r[4],lote:String(r[5])};return conferirResumo?conferirResumoAnualProtecaoGestor_(e):e;
  }).sort(function(a,b){return a.ano-b.ano;});
}
function conferirResumoAnualProtecaoGestor_(entrada){
  // Um comprovante por ano evita reler todos os arquivos a cada abertura.
  // Só pode ser criado a partir do conteúdo anual conferido, nunca do resumo.
  const chave='GESTOR_RESUMO_ANUAL_V1:'+entrada.ano,assinatura=function(e){return hashGestor_([e.ano,e.id,e.hash,e.resumo]);};
  if(propriedade_(chave)===assinatura(entrada))return entrada;
  const resumo=resumoArquivoAnualProtecaoGestor_(dadosArquivoAnualProtecaoGestor_(entrada)),e=Object.assign({},entrada,{resumo:resumo});
  PropertiesService.getScriptProperties().setProperty(chave,assinatura(e));return e;
}
function catalogoParaRecuperacaoProtecaoGestor_(ss){
  const sh=ss.getSheetByName(ABA_ARQUIVOS_ANUAIS_GESTOR_),original=lerEstadoAbaGestor_(sh);
  try{return {catalogo:catalogoAnualProtecaoGestor_(ss,false),original:original,danificado:false,erro:''};}catch(erro){
    const valores=sh?sh.getDataRange().getValues():[],refs=new Map();
    valores.forEach(function(r,i){
      if(!i&&hashGestor_(r.slice(0,6))===hashGestor_(CAB_ARQUIVOS_ANUAIS_GESTOR_))return;
      if(!r.some(function(v){return v!==''&&v!=null;}))return;
      if(!i&&!Number.isInteger(Number(r[0])))return; // Cabeçalho danificado, guardado integralmente.
      const ano=Number(r[0]),id=String(r[1]||''),hash=String(r[2]||'');
      if(!Number.isInteger(ano)||ano<2000||ano>2200||!/^[A-Za-z0-9_-]{8,160}$/.test(id)||!/^[a-f0-9]{64}$/.test(hash))throw Error('O catálogo contém uma referência anual sem ano, arquivo ou comprovante identificável. Preserve a aba para recuperação assistida; nenhum dado foi substituído.');
      if(refs.has(ano)&&(refs.get(ano).id!==id||refs.get(ano).hash!==hash))throw Error('Há referências conflitantes para o mesmo ano. Preserve o catálogo para recuperação assistida.');
      refs.set(ano,{ano:ano,id:id,hash:hash,resumo:null,data:r[4],lote:String(r[5]||'')});
    });
    if(!refs.size&&original.length>1)throw Error('O catálogo está danificado e seus anos não puderam ser identificados. Preserve a aba para recuperação assistida.');
    return {catalogo:Array.from(refs.values()).sort(function(a,b){return a.ano-b.ano;}),original:original,danificado:true,erro:String(erro.message||erro)};
  }
}
function dadosArquivoAnualProtecaoGestor_(entrada,reler=false){
  const ctx=CONTEXTO_GESTOR_,chave=entrada.ano+':'+entrada.id+':'+entrada.hash;if(ctx){ctx.cacheAnualProtecao=ctx.cacheAnualProtecao||new Map();if(!reler&&ctx.cacheAnualProtecao.has(chave))return ctx.cacheAnualProtecao.get(chave);}
  const ss=SpreadsheetApp.openById(entrada.id),abas=['Lançamentos','Empréstimos'].map(function(nome){
    const sh=ss.getSheetByName(nome);if(!sh)throw Error('Arquivo anual sem a aba '+nome+'.');
    const raw=sh.getDataRange().getValues();if(raw.some(function(r){return r.slice(COLUNAS_GESTOR_).some(function(v){return v!==''&&v!=null;});}))throw Error('O arquivo anual contém colunas adicionais. Preserve a personalização no Drive antes de recuperar seus dados.');
    const valores=normalizarMatrizProtecaoGestor_(raw,COLUNAS_GESTOR_);return {nome:nome,valores:valores};
  });
  const dados={ano:entrada.ano,abas:abas};
  if(hashGestor_(dados)!==entrada.hash)throw Error('O arquivo anual de '+entrada.ano+' mudou. Seus valores não foram misturados à consulta; confira a cópia no Drive.');
  if(ctx)ctx.cacheAnualProtecao.set(chave,dados);return dados;
}
function resumoArquivoAnualProtecaoGestor_(dados){
  let total=0,qtd=0;const meses=new Set(),categorias=Object.create(null),consumoMes=Object.create(null);
  dados.abas.forEach(function(aba){aba.valores.slice(1).forEach(function(r){const mes=limparApostrofo(r[8]);meses.add(mes);qtd++;if(aba.nome==='Lançamentos'&&!isStatusCancelado(r[9])){
    const valor=centavosGestor_(r[7]),cat=String(r[3]||'Outros');total+=valor;categorias[cat]=(categorias[cat]||0)+valor;
    consumoMes[mes]=consumoMes[mes]||Object.create(null);consumoMes[mes][cat]=(consumoMes[mes][cat]||0)+valor;
  }});});
  return {versao:1,meses:Array.from(meses).sort(function(a,b){return parseMesFat(a).time-parseMesFat(b).time;}),pessoalCentavos:total,quantidade:qtd,categoriasCentavos:categorias,consumoCatMesCentavos:consumoMes};
}
function criarArquivoAnualProtecaoGestor_(ss,pasta,dados,lote){
  const novo=SpreadsheetApp.create('Gestor — Arquivo '+dados.ano+' — '+lote.slice(-8));
  DriveApp.getFileById(novo.getId()).moveTo(pasta);
  ['Dashboard & Resumo','Formas de Pagamento','Anotações'].forEach(function(nome){
    const origem=ss.getSheetByName(nome);if(!origem)return;
    const valores=nome==='Anotações'?[origem.getDataRange().getValues()[0]]:origem.getDataRange().getValues();
    gravarMatrizProtecaoGestor_(novo.getSheetByName(nome)||novo.insertSheet(nome),valores);
  });
  dados.abas.forEach(function(aba){
    const sh=novo.getSheetByName(aba.nome)||novo.insertSheet(aba.nome);gravarMatrizProtecaoGestor_(sh,aba.valores);sh.setFrozenRows(1);
    const cab=sh.getRange(1,1,1,COLUNAS_GESTOR_);cab.setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
    if(sh.setColumnWidths){sh.setColumnWidths(1,COLUNAS_GESTOR_,120);sh.setColumnWidth(2,220);}
  });
  const info=novo.getSheetByName('Leia-me')||novo.insertSheet('Leia-me');
  gravarMatrizProtecaoGestor_(info,[['Arquivo anual do Gestor','Somente consulta'],['Ano',dados.ano],['Preservação','IDs, parcelas e pagamentos mantidos. Alterar estes dados invalida a conferência do app.'],['Origem',propriedade_(CHAVE_ID_PLANILHA_GESTOR)],['Lote',lote]]);
  SpreadsheetApp.flush();
  const entrada={ano:dados.ano,id:novo.getId(),hash:hashGestor_(dados),resumo:resumoArquivoAnualProtecaoGestor_(dados),data:new Date(),lote:lote};
  dadosArquivoAnualProtecaoGestor_(entrada); // Não remove da origem antes do readback.
  return entrada;
}
function lerRegistrosConsultaProtecaoGestor_(nome,anos){
  const ss=obterPlanilhaGestor_(),sh=ss.getSheetByName(nome),base=lerAbaCompleta(sh,11);
  const refs=base.raw.map(function(_,i){return {linha:i+2,arquivado:false};}),ids=new Set(base.raw.map(function(r){return String(r[11]||'');}).filter(Boolean));
  catalogoAnualProtecaoGestor_(ss).filter(function(e){return !Array.isArray(anos)||anos.includes(e.ano);}).forEach(function(e){
    const aba=dadosArquivoAnualProtecaoGestor_(e).abas.find(function(a){return a.nome===nome;});
    aba.valores.slice(1).forEach(function(r){
      if(!r[11]||ids.has(String(r[11])))throw Error('Identificação repetida entre a planilha principal e o arquivo anual.');ids.add(String(r[11]));
      base.raw.push(copiarGestor_(r));base.disp.push(valoresExibidosRegistroGestor_(r,r.map(function(v){return String(v==null?'':v);})));refs.push({linha:0,arquivado:true,ano:e.ano});
    });
  });base.refs=refs;return base;
}
function planejarArquivoAnualProtecaoGestor_(ss,anoLimite){
  const recentes=idsAlteradosRecentementeProtecaoGestor_(ss);
  const registros=['Lançamentos','Empréstimos'].map(function(nome){const sh=ss.getSheetByName(nome);return {nome:nome,antes:lerEstadoAbaGestor_(sh),raw:sh?sh.getDataRange().getValues():[],formulas:sh?sh.getDataRange().getFormulas():[]};});
  const grupos=new Map(),selecionados=new Set(),ids=new Set();let elegiveis=0;
  registros.forEach(function(aba){aba.raw.slice(1).forEach(function(r,i){
    if(!r.some(function(v){return v!==''&&v!==null&&v!==undefined;}))return;
    if(!r[11]||!r[12]||!r[16])throw Error('Atualize os dados do app antes de arquivar registros sem identificação.');
    if(ids.has(String(r[11])))throw Error('Há identificações repetidas na origem. Nenhum registro será arquivado.');ids.add(String(r[11]));
    if(r[16]!==hashRegistroGestor_(r))throw Error('Um registro mudou desde a última conferência. Atualize o app antes de arquivar.');
    const chave=aba.nome+'|'+r[12];if(!grupos.has(chave))grupos.set(chave,[]);grupos.get(chave).push({aba:aba,r:r,i:i+1});
  });});
  grupos.forEach(function(itens){
    // Mantém a compra inteira se ainda há alguma obrigação ou parcela futura.
    // Séries fixas ficam na principal com seus controles de geração/cancelamento.
    const encerrada=itens.every(function(it){const r=it.r,emp=it.aba.nome==='Empréstimos',mes=r[8] instanceof Date?Utilities.formatDate(r[8],getTimezone(),'MM/yyyy'):r[8],info=parseMesFat(mes);
      return info.time&&info.a<=anoLimite&&!recentes.has(String(r[11]))&&limparApostrofo(r[6])!=='∞/∞'&&
        (emp?r[9]==='Recebido'&&centavosGestor_(valorPagoBancoGestor_(r,true))===centavosGestor_(r[7]):isStatusPago(r[9]));
    });if(encerrada){
      itens.forEach(function(it){if(it.r.slice(COLUNAS_GESTOR_).some(function(v){return v!==''&&v!=null;}))throw Error('Há conteúdo em colunas adicionais de '+it.aba.nome+', linha '+(it.i+1)+'. O arquivamento foi bloqueado antes de mover os registros. Preserve essas colunas para recuperação assistida.');});
      if(itens.some(function(it){return (it.aba.formulas[it.i]||[]).some(Boolean);}))return;
      elegiveis+=itens.length;if(selecionados.size+itens.length<=2000)itens.forEach(function(it){selecionados.add(String(it.r[11]));});
    }
  });
  const anos=new Map();registros.forEach(function(aba){aba.raw.slice(1).forEach(function(r){if(!selecionados.has(String(r[11])))return;
    const exibido=valoresExibidosRegistroGestor_(r,r.map(function(v){return v==null?'':String(v);})),n=copiarGestor_(r);[0,6,8].forEach(function(i){n[i]=exibido[i];});n[16]=hashRegistroGestor_(n);
    const ano=parseMesFat(n[8]).a;if(!anos.has(ano))anos.set(ano,{ano:ano,abas:registros.map(function(a){return {nome:a.nome,valores:normalizarMatrizProtecaoGestor_([a.raw[0]||[]],COLUNAS_GESTOR_)};})});
    anos.get(ano).abas.find(function(a){return a.nome===aba.nome;}).valores.push(normalizarMatrizProtecaoGestor_([n],COLUNAS_GESTOR_)[0]);
  });});if(selecionados.size){registros.forEach(function(a){conferirFormulasCompactacaoProtecaoGestor_(a.formulas,a.nome);});conferirFormulasOutrasAbasProtecaoGestor_(ss);}return {registros:registros,selecionados:selecionados,anos:Array.from(anos.values()),restantes:elegiveis-selecionados.size};
}
function idsAlteradosRecentementeProtecaoGestor_(ss){
  const sh=ss.getSheetByName(ABA_ATIVIDADE_GESTOR_),ids=new Set();if(!sh||sh.getLastRow()<2)return ids;
  const corte=new Date(getHojeSeguro());corte.setDate(corte.getDate()-90);
  const linhas=sh.getRange(2,1,sh.getLastRow()-1,5).getValues(),posicoes=[];
  linhas.forEach(function(r,i){const data=r[1] instanceof Date?r[1]:new Date(r[1]);if(r[4]==='EVENTO'&&Number.isFinite(data.getTime())&&data>=corte)posicoes.push(i+2);});
  if(posicoes.length)lerEventosAtividadeGestor_(posicoes,indiceEventosAtividadeGestor_()).forEach(function(e){if(e.reversivel)(e.alteracoes||[]).forEach(function(a){ids.add(String(a.id));});});return ids;
}
function arquivarAnosProtecaoGestor_(ss,pasta){
  const plano=planejarArquivoAnualProtecaoGestor_(ss,getHojeSeguro().getFullYear()-1);if(!plano.selecionados.size)return {sucesso:true,quantidade:0};
  // Expressões constantes podem ser preservadas exatamente. Referências a
  // células exigiriam rebasing também nas outras abas: não adivinhar endereços
  // ao compactar linhas de uma planilha personalizada manualmente.
  plano.registros.forEach(function(a){conferirFormulasCompactacaoProtecaoGestor_(a.formulas,a.nome);});
  const catalogo=catalogoAnualProtecaoGestor_(ss),lote='anual-'+gerarIdGestor_(),destinos=[];
  plano.anos.forEach(function(dados){
    const anterior=catalogo.find(function(e){return e.ano===dados.ano;});
    if(anterior){const antigos=dadosArquivoAnualProtecaoGestor_(anterior);dados.abas.forEach(function(a){a.valores=antigos.abas.find(function(x){return x.nome===a.nome;}).valores.concat(a.valores.slice(1));});}
    const entrada=criarArquivoAnualProtecaoGestor_(ss,pasta,dados,lote);destinos.push({tipo:'anual',ano:entrada.ano,id:entrada.id,hash:entrada.hash});const i=catalogo.findIndex(function(e){return e.ano===dados.ano;});if(i<0)catalogo.push(entrada);else catalogo[i]=entrada;
  });
  const tabela=[CAB_ARQUIVOS_ANUAIS_GESTOR_].concat(catalogo.sort(function(a,b){return a.ano-b.ano;}).map(function(e){return [e.ano,e.id,e.hash,JSON.stringify(e.resumo),e.data,e.lote];}));
  const mudancas=[mudancaProtecaoGestor_(ss,ABA_ARQUIVOS_ANUAIS_GESTOR_,tabela)];
  plano.registros.forEach(function(a){const manter=function(r,i){return i===0||!plano.selecionados.has(String(a.antes[i][11]));};mudancas.push(mudancaProtecaoGestor_(ss,a.nome,a.antes.filter(manter),a.formulas.filter(manter)));});
  registrarPlanoProtecaoGestor_(ss,pasta,mudancas,'arquivo-anual',destinos);return {sucesso:true,quantidade:plano.selecionados.size,anos:plano.anos.map(function(a){return a.ano;}),temMais:plano.restantes>0};
}
function compactarHistoricoProtecaoGestor_(ss,pasta){
  const corte=new Date(getHojeSeguro());corte.setDate(corte.getDate()-180);
  const bundle={versao:1,planilhaId:propriedade_(CHAVE_ID_PLANILHA_GESTOR),operacoes:Object.create(null),eventos:Object.create(null)},selecionadas=new Set(),eventos=new Set();
  const diario=ss.getSheetByName(ABA_DIARIO_GESTOR_),atividade=ss.getSheetByName(ABA_ATIVIDADE_GESTOR_);
  const linhas=diario?diario.getDataRange().getValues():[],atv=atividade?atividade.getDataRange().getValues():[];
  let bytes=0;
  for(let i=1;i<linhas.length;){
    const r=linhas[i];if(r[2]==='PARTE')throw Error('Parte sem cabeçalho no diário. Preserve os dados antes da manutenção.');
    validarCabecalhoOperacaoGestor_(r);const qtd=Number(r[3]),proximo=i+1+qtd;
    if(proximo>linhas.length)throw Error('Diário incompleto.');
    if(r[2]==='CONFIRMADO'&&r[5] instanceof Date&&r[5]<corte&&selecionadas.size<100){
      const entrada=lerOperacaoTecnicaGestor_(diario,i+1),item={cabecalho:entrada.cabecalho,plano:entrada.plano},tam=Utilities.newBlob(JSON.stringify(serializarGestor_(item))).getBytes().length;
      if(bytes+tam<6*1024*1024){bundle.operacoes[r[0]]=item;selecionadas.add(String(r[0]));bytes+=tam;}
    }i=proximo;
  }
  if(atividade){
    const indice=indiceEventosAtividadeGestor_();
    indice.linhas.forEach(function(l){const r=atv[l-1],data=r[1] instanceof Date?r[1]:new Date(r[1]);if(r[4]!=='EVENTO'||!Number.isFinite(data.getTime())||data>=corte||eventos.size>=100)return;
      const evento=lerEventosAtividadeGestor_([l],indice)[0];if(!evento)throw Error('Evento incompleto.');
      const tam=Utilities.newBlob(JSON.stringify(serializarGestor_(evento))).getBytes().length;
      if(bytes+tam<6*1024*1024){bundle.eventos[r[0]]=evento;eventos.add(String(r[0]));bytes+=tam;}
    });
  }
  if(!selecionadas.size&&!eventos.size)return {sucesso:true,operacoes:0,eventos:0};
  const ref=salvarJsonProtecaoGestor_(pasta,'Gestor_HistoricoTecnico_'+gerarIdGestor_()+'.json',bundle),mudancas=[];
  function referencia(tipo,id){return JSON.stringify({versao:1,id:ref.id,hash:ref.hash,tipo:tipo,chave:String(id)});}
  if(selecionadas.size){
    const depois=[linhas[0]];for(let i=1;i<linhas.length;){const r=linhas[i],qtd=Number(r[3]);
      if(selecionadas.has(String(r[0])))depois.push([r[0],r[1],'ARQUIVADO',0,referencia('operacoes',r[0]),r[5]]);
      else Array.prototype.push.apply(depois,linhas.slice(i,i+1+qtd));i+=1+qtd;
    }mudancas.push(mudancaProtecaoGestor_(ss,ABA_DIARIO_GESTOR_,depois));
  }
  if(eventos.size){
    const depois=[atv[0]];for(let i=1;i<atv.length;){const r=atv[i];
      if(r[4]==='EVENTO'&&eventos.has(String(r[0]))){depois.push([r[0],r[1],r[2],r[3],'EVENTO_ARQUIVADO',referencia('eventos',r[0])]);i+=1+Number(r[5]);}
      else {depois.push(r);i++;}
    }mudancas.push(mudancaProtecaoGestor_(ss,ABA_ATIVIDADE_GESTOR_,depois));
  }
  const destinos=Array.from(selecionadas).map(function(id){return {tipo:'tecnico',id:ref.id,hash:ref.hash,conteudo:'operacoes',chave:id};}).concat(Array.from(eventos).map(function(id){return {tipo:'tecnico',id:ref.id,hash:ref.hash,conteudo:'eventos',chave:id};}));
  registrarPlanoProtecaoGestor_(ss,pasta,mudancas,'historico-tecnico',destinos);return {sucesso:true,operacoes:selecionadas.size,eventos:eventos.size,temMais:selecionadas.size===100||eventos.size===100};
}
function lerReferenciaTecnicaProtecaoGestor_(texto,tipo,chave){
  let ref;try{ref=JSON.parse(String(texto));}catch(_){throw Error('Comprovante técnico arquivado inválido.');}
  if(ref.versao!==1||ref.tipo!==tipo||ref.chave!==String(chave))throw Error('Identificação do arquivo técnico não confere.');
  const ctx=CONTEXTO_GESTOR_;let bundle;
  const chaveCache=ref.id+':'+ref.hash;
  if(ctx){ctx.cacheTecnicoProtecao=ctx.cacheTecnicoProtecao||new Map();bundle=ctx.cacheTecnicoProtecao.get(chaveCache);}
  if(!bundle){bundle=lerJsonProtecaoGestor_(ref);if(ctx)ctx.cacheTecnicoProtecao.set(chaveCache,bundle);}
  if(bundle.versao!==1||bundle.planilhaId!==propriedade_(CHAVE_ID_PLANILHA_GESTOR)||!Object.prototype.hasOwnProperty.call(bundle[tipo]||{},ref.chave))throw Error('Arquivo técnico não corresponde a esta planilha.');
  return bundle[tipo][ref.chave];
}
function backupComArquivosProtecaoGestor_(backup,ss,recuperacao){
  const catalogo=recuperacao?recuperacao.catalogo:catalogoAnualProtecaoGestor_(ss);if(!catalogo.length&&!recuperacao?.catalogoDanificado)return backup;
  const arquivos=recuperacao?recuperacao.legiveis:catalogo.map(function(e){return dadosArquivoAnualProtecaoGestor_(e);});
  const resultado=Object.assign({},backup,{formato:'gestor-financeiro-backup-v2',arquivosAnuais:arquivos});
  if(recuperacao?.necessaria)resultado.recuperacaoOrigem={aviso:'Cópia anterior de uma recuperação: preserve também o JSON completo utilizado. Conteúdos não conferidos permanecem separados.',catalogo:copiarGestor_(catalogo),catalogoOriginal:serializarGestor_(recuperacao.catalogoOriginal),erroCatalogo:recuperacao.erroCatalogo,indisponiveis:copiarGestor_(recuperacao.indisponiveis),arquivosNaoConferidos:serializarGestor_(recuperacao.naoConferidos||[])};
  resultado.hashFinanceiro=assinaturaFinanceiraBackupProtecaoGestor_(resultado);
  resultado.observacao+=' Inclui o conteúdo completo dos arquivos anuais, independente dos endereços do Drive.';return resultado;
}
function assinaturaFinanceiraBackupProtecaoGestor_(backup){
  return hashGestor_({abas:backup.abas.filter(function(a){return a.nome!=='_Gestor_Atividade';}).map(function(a){return {nome:a.nome,valores:a.valores,formulas:a.formulas||[]};}),arquivosAnuais:backup.arquivosAnuais});
}
const ABA_BACKUPS_PROTECAO_GESTOR_='_Gestor_Backups';
const CAB_BACKUPS_PROTECAO_GESTOR_=['Identificação','Período','Estado','Arquivo ou nome','SHA256','Metadados JSON'];
function backupMensalProtecaoGestor_(ss,pasta,manualId){
  conferirSemPendenciasProtecaoGestor_(ss);
  const periodo=Utilities.formatDate(getHojeSeguro(),getTimezone(),'yyyy-MM'),dados=montarBackupDadosGestor_(ss,{restauravel:true}),origem=propriedade_(CHAVE_ID_PLANILHA_GESTOR),prefixo=hashGestor_(origem).slice(0,12);dados.origemId=origem;
  const hashDados=hashGestor_({origem:origem,abas:dados.abas,arquivosAnuais:dados.arquivosAnuais||[]}),id=manualId||('mensal-'+prefixo+'-'+periodo+'-'+hashDados.slice(0,20));
  if(!/^[A-Za-z0-9_.:-]{8,160}$/.test(id))throw Error('Identificação do backup inválida.');
  const tabela=abaTecnicaProtecaoGestor_(ss,ABA_BACKUPS_PROTECAO_GESTOR_,CAB_BACKUPS_PROTECAO_GESTOR_,true),achados=localizarLinhasTecnicasGestor_(tabela,1,id);
  if(achados.length>1)throw Error('Identificação de backup repetida. Preserve a aba para conferência.');
  const linha=achados[0]||tabela.getLastRow()+1,anterior=achados.length?tabela.getRange(linha,1,1,6).getValues()[0]:null;
  if(anterior&&anterior[2]==='CONFIRMADO'){const arquivo=DriveApp.getFileById(anterior[3]);lerJsonProtecaoGestor_({id:arquivo.getId(),hash:anterior[4]});const c=configProtecaoGestor_(),meta=JSON.parse(anterior[5]);c.ultimoBackup={periodo:anterior[1],data:meta.geradoEm,arquivoId:arquivo.getId(),hash:anterior[4]};salvarConfigProtecaoGestor_(c);return {sucesso:true,id:id,url:arquivo.getUrl(),arquivoId:arquivo.getId(),periodo:anterior[1],repetido:true};}
  const meta=anterior?JSON.parse(anterior[5]):{geradoEm:dados.geradoEm,hashDados:hashDados};
  if(meta.hashDados!==hashDados)throw Error('Os dados mudaram desde a preparação deste backup. Inicie uma nova cópia; a anterior foi preservada.');
  dados.geradoEm=meta.geradoEm;dados.identificacaoBackup=id;
  const texto=JSON.stringify(serializarGestor_(dados)),hash=hashTextoBackupGestor_(texto),nome='Gestor_Backup_'+periodo+'_'+prefixo+'_'+id+'.json';
  if(anterior&&(anterior[2]!=='PREPARANDO'||anterior[4]!==hash))throw Error('Preparação de backup incompatível.');
  if(!anterior){tabela.getRange(linha,1,1,6).setValues([[id,periodo,'PREPARANDO',nome,hash,JSON.stringify(meta)]]);SpreadsheetApp.flush();}
  const encontrados=pasta.getFilesByName(nome);let arquivo;
  if(encontrados.hasNext()){arquivo=encontrados.next();if(encontrados.hasNext())throw Error('Há cópias repetidas com o mesmo nome. Confira a pasta.');}
  else arquivo=pasta.createFile(nome,texto,'application/json');
  if(hashTextoBackupGestor_(arquivo.getBlob().getDataAsString('UTF-8'))!==hash)throw Error('A cópia mensal não passou na conferência.');
  tabela.getRange(linha,1,1,6).setValues([[id,periodo,'CONFIRMADO',arquivo.getId(),hash,JSON.stringify(meta)]]);SpreadsheetApp.flush();
  const c=configProtecaoGestor_();c.ultimoBackup={periodo:periodo,data:meta.geradoEm,arquivoId:arquivo.getId(),hash:hash};salvarConfigProtecaoGestor_(c);
  return {sucesso:true,id:id,url:arquivo.getUrl(),arquivoId:arquivo.getId(),periodo:periodo};
}
function configurarProtecaoAutomaticaGestor(pastaUrl){
  return comLockProtecaoGestor_(function(ss){
    const pasta=pastaProtecaoGestor_(typeof pastaUrl==='string'?pastaUrl:'',true),gatilhos=ScriptApp.getProjectTriggers().filter(function(t){return t.getHandlerFunction()==='rotinaProtecaoProgramadaGestor';});
    if(!gatilhos.length)ScriptApp.newTrigger('rotinaProtecaoProgramadaGestor').timeBased().atHour(3).everyDays(1).inTimezone(getTimezone()).create();
    // Não apaga gatilhos de outras contas ou de outras funções.
    const c=configProtecaoGestor_(),origem=propriedade_(CHAVE_ID_PLANILHA_GESTOR);
    if(c.planilhaId&&c.planilhaId!==origem)['ultimoBackup','ultimaManutencao','ultimoMesArquivo','ultimoMesManutencao'].forEach(function(k){delete c[k];});
    Object.assign(c,{versao:1,ativo:true,pastaId:pasta.getId(),backupMensal:true,arquivoAnual:true,manutencao:true,planilhaId:origem});salvarConfigProtecaoGestor_(c);
    return {sucesso:true,pastaUrl:pasta.getUrl(),mensagem:'Rotina diária instalada: confirma o backup de cada mês e verifica o arquivamento anual. Faça o primeiro backup antes da manutenção.'};
  });
}
function obterStatusProtecaoWeb(){
  const c=configProtecaoGestor_(),ss=realProtecaoGestor_();
  const instalada=c.ativo===true&&c.planilhaId===propriedade_(CHAVE_ID_PLANILHA_GESTOR)&&ScriptApp.getProjectTriggers().some(function(t){return t.getHandlerFunction()==='rotinaProtecaoProgramadaGestor';});
  return {ativo:c.ativo===true,rotinaInstalada:instalada,pastaId:c.pastaId||'',pastaUrl:c.pastaId?'https://drive.google.com/drive/folders/'+c.pastaId:'',ultimoBackup:c.ultimoBackup||null,ultimaManutencao:c.ultimaManutencao||null,ultimoErro:c.ultimoErro||'',arquivos:catalogoAnualProtecaoGestor_(ss).map(function(e){return {ano:e.ano,id:e.id,quantidade:e.resumo.quantidade,pessoal:formatBRL(e.resumo.pessoalCentavos/100),url:'https://docs.google.com/spreadsheets/d/'+e.id+'/edit'};})};
}
function executarBackupProtegidoWeb(param){return comLockProtecaoGestor_(function(ss){const c=configProtecaoGestor_();if(!c.ativo)throw Error('Ative a proteção no Apps Script antes de gerar cópias no Drive.');return backupMensalProtecaoGestor_(ss,pastaProtecaoGestor_(),param&&param.requestId);});}
function previaManutencaoProtegidaWeb(){return comLockProtecaoGestor_(function(ss){conferirSemPendenciasProtecaoGestor_(ss);const plano=planejarArquivoAnualProtecaoGestor_(ss,getHojeSeguro().getFullYear()-1);return {assinatura:hashGestor_(['Lançamentos','Empréstimos',ABA_DIARIO_GESTOR_,ABA_ATIVIDADE_GESTOR_,ABA_ARQUIVOS_ANUAIS_GESTOR_].map(function(n){return [n,lerEstadoAbaGestor_(ss.getSheetByName(n))];})),quantidade:plano.selecionados.size,anos:plano.anos.map(function(a){return a.ano;}),regra:'Somente compras integralmente encerradas de anos anteriores. Fixos, pendências e compras com parcelas futuras permanecem na principal. Histórico técnico confirmado há mais de 180 dias pode ser compactado; nenhum comprovante de identificação é apagado.'};});}
function executarManutencaoProtegidaWeb(param){return comLockProtecaoGestor_(function(ss){
  const c=configProtecaoGestor_();if(!c.ativo)throw Error('Ative a proteção no Apps Script antes da manutenção.');conferirSemPendenciasProtecaoGestor_(ss);
  const assinatura=hashGestor_(['Lançamentos','Empréstimos',ABA_DIARIO_GESTOR_,ABA_ATIVIDADE_GESTOR_,ABA_ARQUIVOS_ANUAIS_GESTOR_].map(function(n){return [n,lerEstadoAbaGestor_(ss.getSheetByName(n))];}));
  if(!param||param.confirmacao!=='ARQUIVAR'||param.assinatura!==assinatura)throw Error('Confira uma nova prévia da manutenção.');
  const pasta=pastaProtecaoGestor_();backupMensalProtecaoGestor_(ss,pasta,'antes-manutencao-'+assinatura.slice(0,32));
  const anual=arquivarAnosProtecaoGestor_(ss,pasta),tecnico=compactarHistoricoProtecaoGestor_(ss,pasta);const atual=configProtecaoGestor_();atual.ultimaManutencao={data:new Date().toISOString(),anual:anual,tecnico:tecnico};atual.ultimoErro='';salvarConfigProtecaoGestor_(atual);return atual.ultimaManutencao;
});}
function rotinaProtecaoProgramadaGestor(){
  try{return comLockProtecaoGestor_(function(ss){
    const c=configProtecaoGestor_();if(!c.ativo)return {ativo:false};
    if(c.planilhaId!==propriedade_(CHAVE_ID_PLANILHA_GESTOR))throw Error('A planilha configurada mudou. Ative a rotina novamente para confirmar o destino.');
    conferirSemPendenciasProtecaoGestor_(ss);const pasta=pastaProtecaoGestor_(),hoje=getHojeSeguro(),periodo=Utilities.formatDate(hoje,getTimezone(),'yyyy-MM');
    if(c.backupMensal&&c.ultimoBackup?.periodo!==periodo)backupMensalProtecaoGestor_(ss,pasta);
    if(c.arquivoAnual&&c.ultimoMesArquivo!==periodo){
      if(planejarArquivoAnualProtecaoGestor_(ss,hoje.getFullYear()-1).selecionados.size)backupMensalProtecaoGestor_(ss,pasta,'antes-anual-'+periodo+'-'+hashGestor_(['Lançamentos','Empréstimos',ABA_ARQUIVOS_ANUAIS_GESTOR_].map(function(n){return lerEstadoAbaGestor_(ss.getSheetByName(n));})).slice(0,20));
      const anual=arquivarAnosProtecaoGestor_(ss,pasta);
      if(!anual.temMais)c.ultimoMesArquivo=periodo;c.ultimaManutencao={data:new Date().toISOString(),anual:anual};
    }
    if(c.manutencao&&c.ultimoMesManutencao!==periodo){
      const tecnico=compactarHistoricoProtecaoGestor_(ss,pasta);if(!tecnico.temMais)c.ultimoMesManutencao=periodo;c.ultimaManutencao=Object.assign({},c.ultimaManutencao||{},{data:new Date().toISOString(),tecnico:tecnico});
    }
    const atual=configProtecaoGestor_();Object.assign(atual,c,{ultimoBackup:atual.ultimoBackup||c.ultimoBackup,ultimoErro:''});salvarConfigProtecaoGestor_(atual);return {sucesso:true};
  });}catch(e){const c=configProtecaoGestor_();c.ultimoErro=String(e.message||e).slice(0,300);salvarConfigProtecaoGestor_(c);throw e;}
}
function obterEmprestimosArquivadosWeb(param){
  const ano=param&&param.ano?Number(param.ano):null;
  if(ano!==null&&(!Number.isInteger(ano)||ano<2000||ano>2200))throw Error('Ano inválido.');
  const lido=lerRegistrosConsultaProtecaoGestor_('Empréstimos',ano===null?undefined:[ano]);
  return {itens:lido.raw.map(function(r,i){
    if(!lido.refs[i].arquivado)return null;const d=lido.disp[i],valor=extractNum(r[7]);
    return {arquivado:true,anoArquivo:lido.refs[i].ano,linha:0,registroId:r[11],compraId:r[12],versao:Number(r[13]),estadoBanco:r[14],data:d[0],pessoa:d[1],descricao:d[2],forma:d[3],parcela:limparApostrofo(d[6]),valorRaw:valor,valorTotalRaw:extractNum(r[4]),valorFmt:formatBRL(valor),mesFatura:limparApostrofo(d[8]),status:d[9],observacoes:d[10],dataCombinada:dataCombinadaEmprestimoGestor_(r),timeFat:parseMesFat(d[8]).time};
  }).filter(Boolean)};
}
function validarParticoesBackupProtecaoGestor_(backup){
  if(!Array.isArray(backup.arquivosAnuais)||backup.arquivosAnuais.length>100||backup.hashFinanceiro!==assinaturaFinanceiraBackupProtecaoGestor_(backup))throw Error('Os arquivos anuais do backup estão incompletos ou foram alterados.');
  if(Utilities.newBlob(JSON.stringify(backup)).getBytes().length>LIMITE_BACKUP_RESTAURACAO_GESTOR_)throw Error('Este backup excede 8 MB. Preserve-o para recuperação assistida em lotes; nenhum conteúdo foi ignorado.');
  const base=Object.assign({},backup,{formato:'gestor-financeiro-backup-v1'});delete base.arquivosAnuais;delete base.hashFinanceiro;
  const abas=validarBackupRestauracaoGestor_(base),ids=new Set(),anos=new Set();let celulas=abas.reduce(function(s,a){return s+a.valores.length*a.valores[0].length;},0);
  abas.filter(function(a){return ehAbaRegistrosGestor_(a.nome);}).forEach(function(a){a.valores.slice(1).forEach(function(r){if(r[11])ids.add(String(r[11]));});});
  abas.arquivosAnuais=backup.arquivosAnuais.map(function(dados){
    if(!Number.isInteger(dados.ano)||dados.ano<2000||dados.ano>=getHojeSeguro().getFullYear()||anos.has(dados.ano)||!Array.isArray(dados.abas)||dados.abas.length!==2||!['Lançamentos','Empréstimos'].every(function(n){return dados.abas.some(function(a){return a.nome===n;});}))throw Error('Partição anual incompatível.');anos.add(dados.ano);
    const copia=Object.assign({},base,{abas:base.abas.filter(function(a){return !ehAbaRegistrosGestor_(a.nome);}).concat(dados.abas)}),conferidas=validarBackupRestauracaoGestor_(copia).filter(function(a){return ehAbaRegistrosGestor_(a.nome);});
    conferidas.forEach(function(a){celulas+=a.valores.length*a.valores[0].length;a.valores.slice(1).forEach(function(r){
      if(!r[11]||ids.has(String(r[11]))||parseMesFat(r[8]).a!==dados.ano||limparApostrofo(r[6])==='∞/∞'||(a.nome==='Lançamentos'?!isStatusPago(r[9]):r[9]!=='Recebido'||centavosGestor_(valorPagoBancoGestor_(r,true))!==centavosGestor_(r[7])))throw Error('Registro anual duplicado, pendente ou incompatível.');ids.add(String(r[11]));
    });});
    return {ano:dados.ano,abas:conferidas.map(function(a){return {nome:a.nome,valores:normalizarMatrizProtecaoGestor_(a.valores,COLUNAS_GESTOR_)};})};
  });
  if(celulas>500000)throw Error('O backup completo ultrapassa 500 mil células. Preserve o arquivo para recuperação assistida.');return abas;
}
function planejarAnuaisRestauracaoProtecaoGestor_(abas,backup,ss){
  const leitura=catalogoParaRecuperacaoProtecaoGestor_(ss),catalogo=leitura.catalogo,legiveis=[],indisponiveis=[],naoConferidos=[],recebidos=abas.arquivosAnuais||[];
  catalogo.forEach(function(e){try{legiveis.push(dadosArquivoAnualProtecaoGestor_(e));}catch(erro){
    indisponiveis.push({ano:e.ano,id:e.id,motivo:String(erro.message||erro).slice(0,500)});
    // Se o conteúdo ainda abre, preserva uma imagem sem confiar nela como
    // histórico financeiro. Nunca importa silenciosamente dados divergentes.
    try{const origem=SpreadsheetApp.openById(e.id),abasOriginais=['Lançamentos','Empréstimos'].map(function(nome){const sh=origem.getSheetByName(nome);if(!sh)return {nome:nome,ausente:true};const r=sh.getDataRange();return {nome:nome,valores:r.getValues(),formulas:r.getFormulas()};});naoConferidos.push({ano:e.ano,id:e.id,abas:abasOriginais});}catch(_){}
  }});
  const nomes=['Lançamentos','Empréstimos'],substituidas=new Set(abas.map(function(a){return a.nome;})),preservadas=nomes.filter(function(n){return !substituidas.has(n);});
  const necessaria=leitura.danificado||indisponiveis.length>0,exigidos=leitura.danificado?catalogo:indisponiveis;
  if(necessaria&&(backup.formato!=='gestor-financeiro-backup-v2'||preservadas.length||exigidos.some(function(e){return !recebidos.some(function(d){return d.ano===e.ano;});})))throw Error('Há arquivo ou catálogo anual indisponível. Para recuperar, selecione um JSON completo v2 que contenha Lançamentos, Empréstimos e os anos '+Array.from(new Set(exigidos.map(function(e){return e.ano;}))).join(', ')+'. Nada foi substituído.');
  const anos=new Set(recebidos.map(function(d){return d.ano;}));if(preservadas.length)legiveis.forEach(function(d){anos.add(d.ano);});
  const arquivos=Array.from(anos).sort(function(a,b){return a-b;}).map(function(ano){
    const novo=recebidos.find(function(d){return d.ano===ano;}),antigo=legiveis.find(function(d){return d.ano===ano;});
    return {ano:ano,abas:nomes.map(function(nome){
      const fonte=(!substituidas.has(nome)?antigo:novo)?.abas.find(function(a){return a.nome===nome;});
      const cab=fonte?.valores[0]||antigo?.abas.find(function(a){return a.nome===nome;})?.valores[0]||ss.getSheetByName(nome)?.getDataRange().getValues()[0]||Array(COLUNAS_GESTOR_).fill('');
      return {nome:nome,valores:copiarGestor_(fonte?fonte.valores:normalizarMatrizProtecaoGestor_([cab],COLUNAS_GESTOR_))};
    })};
  }).filter(function(d){return d.abas.some(function(a){return a.valores.length>1;});});
  const ids=new Set();let celulas=0;
  nomes.forEach(function(nome){const dados=abas.find(function(a){return a.nome===nome;}),sh=ss.getSheetByName(nome),linhas=dados?dados.valores:sh?.getDataRange().getValues()||[];celulas+=linhas.reduce(function(s,r){return s+r.length;},0);linhas.slice(1).forEach(function(r){if(r[11]){if(ids.has(String(r[11])))throw Error('Identificação repetida nos dados preservados da restauração.');ids.add(String(r[11]));}});});
  arquivos.forEach(function(d){d.abas.forEach(function(a){celulas+=a.valores.length*COLUNAS_GESTOR_;a.valores.slice(1).forEach(function(r){if(!r[11]||ids.has(String(r[11])))throw Error('Identificação repetida entre dados ativos e anuais preservados.');ids.add(String(r[11]));});});});
  if(celulas>500000)throw Error('Os dados restaurados e preservados excedem 500 mil células. Use recuperação assistida.');
  abas.arquivosAnuais=arquivos;
  abas.catalogoAnualAtual=catalogo;
  return {catalogo:catalogo,catalogoDanificado:leitura.danificado,catalogoOriginal:leitura.original,erroCatalogo:leitura.erro,necessaria:necessaria,legiveis:legiveis,indisponiveis:indisponiveis,naoConferidos:naoConferidos,preservadas:preservadas,assinatura:hashGestor_({catalogoOriginal:leitura.original,catalogo:catalogo,legiveis:legiveis.map(function(d){return [d.ano,hashGestor_(d)];}),indisponiveis:indisponiveis,naoConferidos:naoConferidos})};
}
function prepararArquivosRestauracaoProtecaoGestor_(abas,ss){
  const arquivos=abas.arquivosAnuais||[],atual=abas.catalogoAnualAtual||catalogoAnualProtecaoGestor_(ss);
  if(!arquivos.length&&!atual.length)return;
  const pasta=arquivos.length?pastaProtecaoGestor_():null,lote='restauracao-'+String(CONTEXTO_GESTOR_.param.requestId),entradas=arquivos.map(function(d){return criarArquivoAnualProtecaoGestor_(ss,pasta,d,lote);});
  CONTEXTO_GESTOR_.destinosAnuaisRestauracao=entradas.map(function(e){return {ano:e.ano,id:e.id,hash:e.hash};});
  const sh=ss.getSheetByName(ABA_ARQUIVOS_ANUAIS_GESTOR_)||ss.insertSheet(ABA_ARQUIVOS_ANUAIS_GESTOR_);
  sh.valores=[CAB_ARQUIVOS_ANUAIS_GESTOR_].concat(entradas.map(function(e){return [e.ano,e.id,e.hash,JSON.stringify(e.resumo),e.data,e.lote];}));sh.colunas=6;sh.alterados=Object.create(null);sh.valores.forEach(function(r,i){r.forEach(function(_,j){sh.alterados[i+':'+j]=true;});});
}
