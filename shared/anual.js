// Organização por competência. O controle permanente mantém o diário e os
// cadastros; anos fechados são imutáveis e alterações posteriores viram ajustes.
// Nenhuma escrita financeira externa acontece fora de um plano recuperável.
const ABA_ANOS_GESTOR_='_Gestor_Anos';
const CAB_ANOS_GESTOR_=['Ano','Planilha ID','Estado','SHA256 fechamento','Fechado em','Origem'];
const ABA_AJUSTES_ANUAIS_GESTOR_='_Gestor_AjustesAnuais';
const CAB_AJUSTES_ANUAIS_GESTOR_=['Aba','Registro ID','Ano original','SHA256 original','Estado','Registro JSON'];
function principalAnualGestor_(ss){return ss||(CONTEXTO_GESTOR_?CONTEXTO_GESTOR_.ssReal:obterPlanilhaGestor_());}
function ativoAnualGestor_(ss){return configProtecaoGestor_().organizacaoAnual===true||Boolean(principalAnualGestor_(ss).getSheetByName(ABA_ANOS_GESTOR_));}
function catalogoAnosGestor_(ss){
  const sh=ss.getSheetByName(ABA_ANOS_GESTOR_);if(!sh||!sh.getLastRow())return [];
  const linhas=sh.getDataRange().getValues();if(hashGestor_(linhas[0])!==hashGestor_(CAB_ANOS_GESTOR_))throw Error('Catálogo dos anos incompatível. Preserve a base de controle.');
  const anos=new Set(),ids=new Set();return linhas.slice(1).filter(r=>r.some(v=>v!==''&&v!=null)).map(function(r){
    const ano=Number(r[0]),id=String(r[1]);if(!Number.isInteger(ano)||ano<2000||ano>2200||anos.has(ano)||ids.has(id)||!/^[A-Za-z0-9_-]{8,160}$/.test(id)||!['ABERTO','FECHADO'].includes(r[2])||r[5]!==propriedade_(CHAVE_ID_PLANILHA_GESTOR)||(r[2]==='FECHADO'&&!/^[a-f0-9]{64}$/.test(r[3])))throw Error('Destino anual inválido ou repetido. Preserve o catálogo.');
    anos.add(ano);ids.add(id);return {ano:ano,id:id,estado:r[2],hash:String(r[3]||''),fechadoEm:r[4]||'',origem:r[5]};
  }).sort((a,b)=>a.ano-b.ano);
}
function linhaCatalogoAnoGestor_(e){return [e.ano,e.id,e.estado,e.hash||'',e.fechadoEm||'',propriedade_(CHAVE_ID_PLANILHA_GESTOR)];}
function dadosAnoGestor_(e){
  const ctx=CONTEXTO_GESTOR_,chave=e.ano+':'+e.id+':'+e.estado+':'+e.hash;
  if(ctx){ctx.cacheAnosConferidos=ctx.cacheAnosConferidos||new Map();if(ctx.cacheAnosConferidos.has(chave))return copiarGestor_(ctx.cacheAnosConferidos.get(chave));}
  const ss=SpreadsheetApp.openById(e.id),info=ss.getSheetByName('Leia-me');
  if(!info||info.getRange(2,2).getValue()!==propriedade_(CHAVE_ID_PLANILHA_GESTOR)||Number(info.getRange(3,2).getValue())!==e.ano)throw Error('A planilha anual não pertence a esta base de controle.');
  const dados={ano:e.ano,abas:['Lançamentos','Empréstimos'].map(function(nome){const sh=ss.getSheetByName(nome);if(!sh)throw Error('Ano sem a aba '+nome);const rg=sh.getDataRange();if(rg.getFormulas().some(r=>r.some(Boolean)))throw Error('Há fórmulas nos registros anuais. Preserve a personalização antes de continuar.');return {nome:nome,valores:rg.getValues()};})};
  if(e.estado==='FECHADO'&&hashGestor_(dados)!==e.hash)throw Error('O ano fechado '+e.ano+' foi alterado. Nenhum registro divergente será misturado.');if(ctx)ctx.cacheAnosConferidos.set(chave,copiarGestor_(dados));return dados;
}
function cabFinanceiroAnualGestor_(ss,nome){const sh=ss.getSheetByName(nome);return normalizarMatrizProtecaoGestor_([sh?.getDataRange().getValues()[0]||Array(COLUNAS_GESTOR_).fill('')],COLUNAS_GESTOR_)[0];}
function novaPlanilhaAnoGestor_(ss,pasta,ano,lote,dados){
  const nome='Gestor '+ano+' — '+hashGestor_(propriedade_(CHAVE_ID_PLANILHA_GESTOR)).slice(0,10)+' — '+lote;
  const candidatos=pasta.getFilesByName(nome);let destino;
  if(candidatos.hasNext()){const f=candidatos.next();if(candidatos.hasNext())throw Error('Há destinos anuais repetidos. Preserve os arquivos.');destino=SpreadsheetApp.openById(f.getId());}
  else {destino=SpreadsheetApp.create(nome);DriveApp.getFileById(destino.getId()).moveTo(pasta);}
  const existentes=destino.getSheetByName('Leia-me');
  if(existentes&&(existentes.getRange(2,2).getValue()!==propriedade_(CHAVE_ID_PLANILHA_GESTOR)||Number(existentes.getRange(3,2).getValue())!==ano))throw Error('A preparação anual encontrou outro destino.');
  for(const n of ['Lançamentos','Empréstimos']){
    const a=dados?.abas.find(a=>a.nome===n),valores=a?a.valores:[cabFinanceiroAnualGestor_(ss,n)];let sh=destino.getSheetByName(n);
    if(!sh){sh=destino.insertSheet(n);gravarMatrizProtecaoGestor_(sh,valores);}
    else if(hashEstadoGestor_(lerEstadoAbaGestor_(sh))!==hashEstadoGestor_(valores))throw Error('O destino anual preparado já contém dados diferentes.');
  }
  if(!existentes)gravarMatrizProtecaoGestor_(destino.insertSheet('Leia-me'),[['Gestor — ano financeiro','Gerenciado pelo webapp'],['Controle',propriedade_(CHAVE_ID_PLANILHA_GESTOR)],['Ano',ano],['Regra','Cadastros e notas ficam na base de controle. Fechamento preserva o retrato; movimentos posteriores são ajustes vinculados.']]);
  return {ano:ano,id:destino.getId(),estado:'ABERTO',hash:'',fechadoEm:''};
}
function garantirAnoGestor_(ss,ano){
  const atual=catalogoAnosGestor_(ss).find(e=>e.ano===ano);if(atual)return atual;
  const e=novaPlanilhaAnoGestor_(ss,pastaProtecaoGestor_(),ano,'preparado-v1'),tabela=abaTecnicaProtecaoGestor_(ss,ABA_ANOS_GESTOR_,CAB_ANOS_GESTOR_,true);
  tabela.getRange(tabela.getLastRow()+1,1,1,6).setValues([linhaCatalogoAnoGestor_(e)]);SpreadsheetApp.flush();return e;
}
function ajustesAnuaisGestor_(ss){
  const sh=ss.getSheetByName(ABA_AJUSTES_ANUAIS_GESTOR_);if(!sh||!sh.getLastRow())return [];
  const linhas=sh.getDataRange().getValues();if(hashGestor_(linhas[0])!==hashGestor_(CAB_AJUSTES_ANUAIS_GESTOR_))throw Error('Controle de ajustes anuais incompatível.');
  const vistos=new Set();return linhas.slice(1).filter(r=>r.some(v=>v!==''&&v!=null)).map(function(r){const chave=r[0]+':'+r[1];if(!ehAbaRegistrosGestor_(r[0])||vistos.has(chave)||!r[1]||!['ATUALIZADO','EXCLUIDO'].includes(r[4]))throw Error('Ajuste anual inválido ou repetido.');vistos.add(chave);return r;});
}
function matrizFinanceiraAnualGestor_(ss,nome){
  const original=ss.getSheetByName(nome),cab=cabFinanceiroAnualGestor_(ss,nome),mapa=new Map();
  const incluir=r=>{if(!r.some(v=>v!==''&&v!=null))return;if(!r[11]||mapa.has(String(r[11])))throw Error('Registro sem identificação ou repetido entre os anos.');mapa.set(String(r[11]),copiarGestor_(r));};
  for(const e of catalogoAnosGestor_(ss)){
    let dados;try{dados=dadosAnoGestor_(e);}catch(erro){if(!['previaRestauracaoBackupWeb','restaurarBackupDadosWeb'].includes(CONTEXTO_GESTOR_?.action))throw erro;(CONTEXTO_GESTOR_.anosIndisponiveis||(CONTEXTO_GESTOR_.anosIndisponiveis=new Set())).add(e.ano);continue;}
    for(const r of dados.abas.find(a=>a.nome===nome).valores.slice(1))incluir(r);
  }
  if(CONTEXTO_GESTOR_?.importarLegadoAnual)for(const e of catalogoAnualProtecaoGestor_(ss))for(const r of dadosArquivoAnualProtecaoGestor_(e).abas.find(a=>a.nome===nome).valores.slice(1))incluir(r);
  for(const r of ajustesAnuaisGestor_(ss).filter(r=>r[0]===nome)){
    const antes=mapa.get(String(r[1]));if(r[3]!=='NOVO'&&(!antes||hashGestor_(antes)!==r[3])){if(CONTEXTO_GESTOR_?.anosIndisponiveis?.has(Number(r[2])))continue;throw Error('O ajuste não corresponde ao registro do ano fechado.');}
    if(r[4]==='EXCLUIDO')mapa.delete(String(r[1]));else {let valor;try{valor=desserializarGestor_(JSON.parse(r[5]));}catch(_){throw Error('Conteúdo do ajuste anual inválido.');}if(valor[11]!==r[1])throw Error('Identidade do ajuste incompatível.');mapa.set(String(r[1]),valor);}
  }
  if(original)for(const r of original.getDataRange().getValues().slice(1))incluir(r);
  return [cab,...mapa.values()];
}
function folhaLeituraAnualGestor_(ss,nome){
  if(!ehAbaRegistrosGestor_(nome)||!ativoAnualGestor_(ss))return ss.getSheetByName(nome);
  const valores=matrizFinanceiraAnualGestor_(ss,nome),colunas=Math.max(COLUNAS_GESTOR_,...valores.map(r=>r.length));
  const folha={getName:()=>nome,getLastRow:()=>valores.length};
  folha.getRange=function(l,c,n=1,m=1){if(typeof l==='string'){const a=l.match(/^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/);if(!a)throw Error('Intervalo anual inválido.');const num=s=>s.split('').reduce((x,y)=>x*26+y.charCodeAt(0)-64,0);l=Number(a[2]);c=num(a[1]);n=a[4]?Number(a[4])-l+1:1;m=a[3]?num(a[3])-c+1:1;}
    const ler=()=>Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>copiarGestor_(valores[l-1+i]?.[c-1+j]??'')));
    return {getValues:ler,getValue:()=>ler()[0][0],getFormulas:()=>Array.from({length:n},()=>Array(m).fill('')),getNumberFormats:()=>Array.from({length:n},()=>Array(m).fill('General')),getDisplayValues:()=>ler().map(r=>r.map((v,j)=>v instanceof Date?Utilities.formatDate(v,getTimezone(),c+j===1?'dd/MM/yyyy':'MM/yyyy'):String(v??'').replace(/^'/,'')))};
  };folha.getDataRange=()=>folha.getRange(1,1,valores.length,colunas);return folha;
}
function mudancaMatrizAnualGestor_(ss,nome,depois,destino){
  const banco=destino?SpreadsheetApp.openById(destino.id):ss,antes=lerEstadoAbaGestor_(banco.getSheetByName(nome));
  if(hashEstadoGestor_(antes)===hashEstadoGestor_(depois))return null;
  const colunas=Math.max(1,...antes.map(r=>r.length),...depois.map(r=>r.length)),alteracoes=[];
  for(let i=0;i<Math.max(antes.length,depois.length);i++)if(hashEstadoGestor_([antes[i]||[]])!==hashEstadoGestor_([depois[i]||[]]))alteracoes.push([i,depois[i]||[]]);
  const m={nome:nome,antes:hashEstadoGestor_(antes),depois:hashEstadoGestor_(depois),linhas:depois.length,colunas:colunas,alteracoes:alteracoes};m.recuperacaoBlocos=prepararRecuperacaoBlocosGestor_(antes,depois,m);
  if(destino){m.destinoAnual={ano:destino.ano,id:destino.id};}return m;
}
function desdobrarPlanoAnualGestor_(ctx,mudancas){
  // Uma prévia degradada não pode transformar a visão parcial em exclusões.
  if(ctx.action==='previaRestauracaoBackupWeb'&&ctx.anosIndisponiveis?.size)return mudancas.filter(m=>!ehAbaRegistrosGestor_(m.nome));
  if(!ativoAnualGestor_(ctx.ssReal)&&!ctx.anosRestaurados)return mudancas;
  if(!mudancas.some(m=>ehAbaRegistrosGestor_(m.nome))&&!ctx.anosRestaurados&&!ctx.importarLegadoAnual&&!['Lançamentos','Empréstimos'].some(n=>(ctx.ssReal.getSheetByName(n)?.getLastRow()||0)>1))return mudancas;
  const ss=ctx.ssReal,novas=[],catalogo=ctx.anosRestaurados||catalogoAnosGestor_(ss),ajustes=ajustesAnuaisGestor_(ss).filter(r=>!ctx.ss.abas[r[0]]);
  for(const nome of ['Lançamentos','Empréstimos']){
    const aba=ctx.ss.abas[nome];if(!aba)continue;
    const fechados=new Map(),porAno=new Map();
    for(const e of catalogo)if(e.estado==='FECHADO')for(const r of dadosAnoGestor_(e).abas.find(a=>a.nome===nome).valores.slice(1))fechados.set(String(r[11]),{r:r,ano:e.ano});
    const vistos=new Set();for(const [indice,r0] of aba.valores.slice(1).entries()){
      if(!r0.some(v=>v!==''&&v!=null))continue;const r=copiarGestor_(r0),id=String(r[11]);if(!id||vistos.has(id))throw Error('Identificação anual repetida.');vistos.add(id);
      const ano=parseMesFat(r[8]).a;if(!Number.isInteger(ano)||ano<2000||ano>2200)throw Error('Competência anual inválida em '+nome+' (registro '+(indice+1)+'). Confira o campo Mês Fatura (MM/AAAA).');
      const original=fechados.get(id),e=catalogo.find(e=>e.ano===ano);
      if(original||e?.estado==='FECHADO'){
        if(!original||hashGestor_(r)!==hashGestor_(original.r))ajustes.push([nome,id,original?.ano||ano,original?hashGestor_(original.r):'NOVO','ATUALIZADO',JSON.stringify(serializarGestor_(r))]);
      }else {if(!porAno.has(ano))porAno.set(ano,[]);porAno.get(ano).push(r);}
    }
    for(const [id,o] of fechados)if(!vistos.has(id))ajustes.push([nome,id,o.ano,hashGestor_(o.r),'EXCLUIDO','']);
    for(const ano of porAno.keys())if(!catalogo.some(e=>e.ano===ano)){const e=garantirAnoGestor_(ss,ano);catalogo.push(e);}
    for(const e of catalogo.filter(e=>e.estado==='ABERTO')){
      const cab=dadosAnoGestor_(e).abas.find(a=>a.nome===nome).valores[0],depois=normalizarMatrizProtecaoGestor_([cab,...(porAno.get(e.ano)||[])],COLUNAS_GESTOR_);
      const m=mudancaMatrizAnualGestor_(ss,nome,depois,e);if(m)novas.push(m);
    }
    const m=mudancaMatrizAnualGestor_(ss,nome,[normalizarMatrizProtecaoGestor_([aba.valores[0]],COLUNAS_GESTOR_)[0]]);if(m)novas.push(m);
  }
  if(['Lançamentos','Empréstimos'].some(n=>ctx.ss.abas[n])){const m=mudancaMatrizAnualGestor_(ss,ABA_AJUSTES_ANUAIS_GESTOR_,[CAB_AJUSTES_ANUAIS_GESTOR_,...ajustes]);if(m)novas.push(m);}
  if(ctx.anosRestaurados){const m=mudancaMatrizAnualGestor_(ss,ABA_ANOS_GESTOR_,[CAB_ANOS_GESTOR_,...catalogo.map(linhaCatalogoAnoGestor_)]);if(m){m.anosPreparados=ctx.anosPreparados;novas.unshift(m);}}
  return mudancas.filter(m=>!ehAbaRegistrosGestor_(m.nome)).concat(novas);
}
function destinoMudancaAnualGestor_(ss,m,plano){
  if(!m.destinoAnual)return ss;
  if(!ehAbaRegistrosGestor_(m.nome)||!Number.isInteger(m.destinoAnual.ano))throw Error('Destino externo incompatível no diário.');
  let destinos=catalogoAnosGestor_(ss);const mudanca=plano?.mudancas.find(x=>x.nome===ABA_ANOS_GESTOR_);
  if(mudanca){const linhas=copiarGestor_(lerEstadoAbaGestor_(ss.getSheetByName(ABA_ANOS_GESTOR_)));mudanca.alteracoes.forEach(a=>linhas[a[0]]=a[1]);linhas.length=mudanca.linhas;destinos=linhas.slice(1).map(r=>({ano:Number(r[0]),id:r[1],estado:r[2]}));}
  const e=destinos.find(e=>e.ano===m.destinoAnual.ano&&e.id===m.destinoAnual.id&&e.estado==='ABERTO');if(!e)throw Error('O destino anual da operação não está aberto ou não pertence ao catálogo.');dadosAnoGestor_(e);return SpreadsheetApp.openById(e.id);
}
function conferirDestinosAnuaisPlanoGestor_(ss,plano){
  const m=plano?.mudancas.find(m=>m.nome===ABA_ANOS_GESTOR_);if(!m)return;
  const linhas=copiarGestor_(lerEstadoAbaGestor_(ss.getSheetByName(ABA_ANOS_GESTOR_)));m.alteracoes.forEach(a=>linhas[a[0]]=a[1]);linhas.length=m.linhas;
  if(hashEstadoGestor_(linhas)!==m.depois||hashGestor_(linhas[0])!==hashGestor_(CAB_ANOS_GESTOR_))throw Error('O catálogo preparado dos anos está incompleto.');
  const anos=new Set(),ids=new Set();for(const r of linhas.slice(1)){
    if(!Number.isInteger(r[0])||r[0]<2000||r[0]>2200||anos.has(r[0])||ids.has(r[1])||r[5]!==propriedade_(CHAVE_ID_PLANILHA_GESTOR)||!['ABERTO','FECHADO'].includes(r[2]))throw Error('O destino da restauração anual é incompatível.');
    anos.add(r[0]);ids.add(r[1]);dadosAnoGestor_({ano:r[0],id:r[1],estado:r[2],hash:r[3]});
    if(m.anosPreparados){const preparado=m.anosPreparados.find(e=>e.ano===r[0]&&e.id===r[1]);if(!preparado||!Array.isArray(preparado.abas)||preparado.abas.length!==2)throw Error('Falta a conferência integral do destino anual preparado.');const banco=SpreadsheetApp.openById(r[1]);for(const a of preparado.abas){const atual=lerEstadoAbaGestor_(banco.getSheetByName(a.nome)),hash=hashEstadoGestor_(atual),mudanca=plano.mudancas.find(x=>x.destinoAnual?.id===r[1]&&x.nome===a.nome);if(!ehAbaRegistrosGestor_(a.nome)||(!mudanca&&hash!==a.hash)||(mudanca&&(mudanca.antes!==a.hash||hash!==mudanca.antes&&hash!==mudanca.depois&&!estadoRecuperacaoBlocosGestor_(atual,mudanca))))throw Error('O destino anual preparado foi alterado depois da conferência. A restauração foi preservada sem substituir os demais dados.');}}
  }
}
function gravarPlanoOrganizacaoAnualGestor_(ss){
  const importarLegado=catalogoAnualProtecaoGestor_(ss).length>0;
  const ctx={action:'organizarAnos',param:{},idsIniciais:new Set(),registrosIniciais:Object.create(null),ssReal:ss,importarLegadoAnual:importarLegado};ctx.ss=criarPlanilhaVirtualGestor_(ss,ctx);
  let mudancas;try{CONTEXTO_GESTOR_=ctx;for(const n of ['Lançamentos','Empréstimos'])ctx.ss.getSheetByName(n);mudancas=finalizarPlanoGestor_(ctx);}finally{CONTEXTO_GESTOR_=null;}
  if(importarLegado){const m=mudancaMatrizAnualGestor_(ss,ABA_ARQUIVOS_ANUAIS_GESTOR_,[CAB_ARQUIVOS_ANUAIS_GESTOR_]);if(m)mudancas.push(m);}
  if(!mudancas.length)return;const plano={mudancas:mudancas,resultado:{sucesso:true}},texto=JSON.stringify(serializarGestor_(plano)),partes=texto.match(/[\s\S]{1,12000}/g)||[''],diario=abrirDiarioGestor_(ss),inicio=diario.getLastRow()+1,id='organizarAnos:'+gerarIdGestor_();
  diario.getRange(inicio,1,1,6).setValues([[id,hashGestor_(plano),'PREPARANDO',partes.length,'',new Date()]]);diario.getRange(inicio+1,1,partes.length,6).setValues(partes.map((p,i)=>[id,'','PARTE',i+1,JSON.stringify(p),'']));SpreadsheetApp.flush();diario.getRange(inicio,3).setValue('PRONTO');SpreadsheetApp.flush();aplicarPlanoGestor_(ss,plano);diario.getRange(inicio,3).setValue('CONFIRMADO');SpreadsheetApp.flush();
}
function ativarOrganizacaoAnualWeb(){return comLockProtecaoGestor_(function(ss){
  recuperarPlanosAtivacaoAnualGestor_(ss);
  conferirSemPendenciasProtecaoGestor_(ss);const c=configProtecaoGestor_();if(!c.ativo||c.planilhaId!==propriedade_(CHAVE_ID_PLANILHA_GESTOR))throw Error('Ative primeiro a proteção e confira a base de destino.');
  if(c.organizacaoAnual){if(!c.pdfAutomatico){c.pdfAutomatico=true;salvarConfigProtecaoGestor_(c);}if(lerAtivacaoAnualGestor_()?.estado==='EXECUTANDO'){etapaAtivacaoAnualGestor_('Concluindo a organização dos anos');cicloAnualGestor_(ss,pastaProtecaoGestor_());}return {sucesso:true,repetido:true};}
  etapaAtivacaoAnualGestor_('Conferindo fórmulas e dados');
  conferirFormulasOutrasAbasProtecaoGestor_(ss);
  etapaAtivacaoAnualGestor_('Guardando e conferindo o backup');
  const copia=backupMensalProtecaoGestor_(ss,pastaProtecaoGestor_(),'antes-organizacao-'+hashGestor_(['Lançamentos','Empréstimos'].map(n=>lerEstadoAbaGestor_(ss.getSheetByName(n)))) .slice(0,28));
  if(copia.restauravel!==true)throw Error('A cópia foi preservada, mas há colunas ou fórmulas particulares que exigem conferência. A organização anual não foi ativada nem removeu os dados.');
  const atual=configProtecaoGestor_();atual.organizacaoAnual=true;atual.pdfAutomatico=true;salvarConfigProtecaoGestor_(atual);etapaAtivacaoAnualGestor_('Preparando e organizando as planilhas dos anos');cicloAnualGestor_(ss,pastaProtecaoGestor_());
  if(!ss.getSheetByName('Leia-me do Gestor'))gravarMatrizProtecaoGestor_(ss.insertSheet('Leia-me do Gestor'),[['Gestor de Gastos','Controle permanente'],['Onde estão os lançamentos?','As planilhas financeiras por ano estão listadas em Menu → Exportar dados e backup no webapp.'],['Esta base conserva','Cadastros, categorias, notas, provas das operações, catálogo e ajustes posteriores ao fechamento.'],['Anos fechados','São retratos preservados. Recebimentos e pagamentos posteriores aparecem vinculados no app.'],['Notas excluídas','A marca Excluída impede que uma cópia antiga recupere a nota. Não apague essas linhas manualmente.'],['Cópias','JSON restaura os dados. PDF serve para consulta. Nenhuma cópia é apagada automaticamente.']]);
  return {sucesso:true,mensagem:'Organização anual ativada. O endereço do app permanece o mesmo.'};
});}
function cicloAnualGestor_(ss,pasta){
  garantirAnoGestor_(ss,getHojeSeguro().getFullYear());gravarPlanoOrganizacaoAnualGestor_(ss);
  // Fecha apenas anos passados. Pendências de envio impedem o ciclo; saldos em
  // aberto permanecem consultáveis/editáveis por ajustes na base de controle.
  const catalogo=catalogoAnosGestor_(ss);for(const e of catalogo)if(e.estado==='ABERTO'&&e.ano<getHojeSeguro().getFullYear()){
    backupMensalProtecaoGestor_(ss,pasta,'antes-fechar-'+e.ano+'-'+hashGestor_(dadosAnoGestor_(e)).slice(0,24));
    const d=dadosAnoGestor_(e);e.estado='FECHADO';e.hash=hashGestor_(d);e.fechadoEm=new Date().toISOString();
    const tabela=ss.getSheetByName(ABA_ANOS_GESTOR_),linha=localizarLinhasTecnicasGestor_(tabela,1,String(e.ano))[0];if(!linha)throw Error('Ano ausente no fechamento.');tabela.getRange(linha,1,1,6).setValues([linhaCatalogoAnoGestor_(e)]);SpreadsheetApp.flush();
  }return {sucesso:true,anos:catalogo.map(e=>({ano:e.ano,estado:e.estado}))};
}
function assinaturaManutencaoAnualGestor_(ss){return hashGestor_({catalogo:catalogoAnosGestor_(ss),financeiro:['Lançamentos','Empréstimos'].map(n=>matrizFinanceiraAnualGestor_(ss,n)),ajustes:ajustesAnuaisGestor_(ss)});}
function backupOrganizacaoAnualGestor_(backup,ss){
  if(!ativoAnualGestor_(ss))return backup;
  // O retrato no Drive continua intacto; só a cópia JSON recebe o formato de
  // datas já aceito pelo restaurador. Date.toJSON() perderia essa informação.
  const fuso=backup.fusoHorario||getTimezone();
  const indisponiveis=[],catalogo=catalogoAnosGestor_(ss),anos=catalogo.map(function(e){try{const d=dadosAnoGestor_(e);return {ano:e.ano,estado:e.estado,fechadoEm:e.fechadoEm,dados:{ano:d.ano,abas:d.abas.map(a=>({nome:a.nome,valores:valoresCelulasBackupGestor_(a.valores,fuso)}))}};}catch(erro){if(CONTEXTO_GESTOR_?.action!=='restaurarBackupDadosWeb')throw erro;let original;try{const d=SpreadsheetApp.openById(e.id);original=['Lançamentos','Empréstimos'].map(n=>({nome:n,valores:valoresCelulasBackupGestor_(d.getSheetByName(n)?.getDataRange().getValues()||[],fuso)}));}catch(_){}indisponiveis.push({ano:e.ano,id:e.id,erro:String(erro.message||erro),original:original});return null;}}).filter(Boolean);
  const resultado=Object.assign({},backup,{formato:'gestor-financeiro-backup-v3',anos:anos});if(indisponiveis.length)resultado.recuperacaoAnos={aviso:'Cópia parcial anterior à recuperação; preserve também o JSON completo utilizado.',catalogo:catalogo,indisponiveis:indisponiveis,ajustes:ajustesAnuaisGestor_(ss)};resultado.hashOrganizacao=assinaturaBackupAnualGestor_(resultado);return resultado;
}
function assinaturaBackupAnualGestor_(b){return hashGestor_({abas:b.abas.filter(a=>a.nome!=='_Gestor_Atividade').map(a=>({nome:a.nome,valores:a.valores,formulas:a.formulas||[]})),arquivosAnuais:b.arquivosAnuais||[],anos:b.anos});}
function validarBackupAnualGestor_(backup){
  if(!Array.isArray(backup.anos)||backup.anos.length>201||backup.hashOrganizacao!==assinaturaBackupAnualGestor_(backup))throw Error('O catálogo anual do backup está incompleto ou alterado.');
  const base=Object.assign({},backup,{formato:backup.arquivosAnuais?'gestor-financeiro-backup-v2':'gestor-financeiro-backup-v1'});delete base.anos;delete base.hashOrganizacao;
  const abas=validarBackupRestauracaoGestor_(base),vistos=new Set();let celulas=abas.reduce((s,a)=>s+a.valores.reduce((t,r)=>t+r.length,0),0);const idsSnapshot=new Set();
  abas.anos=backup.anos.map(function(e){
    if(!Number.isInteger(e.ano)||e.ano<2000||e.ano>2200||vistos.has(e.ano)||!['ABERTO','FECHADO'].includes(e.estado)||!e.dados||e.dados.ano!==e.ano||!Array.isArray(e.dados.abas)||e.dados.abas.length!==2||!['Lançamentos','Empréstimos'].every(n=>e.dados.abas.some(a=>a.nome===n)))throw Error('Estrutura de ano incompatível.');vistos.add(e.ano);
    const copia=Object.assign({},base,{formato:'gestor-financeiro-backup-v1',abas:base.abas.filter(a=>!ehAbaRegistrosGestor_(a.nome)).concat(e.dados.abas)}),dados=validarBackupRestauracaoGestor_(copia).filter(a=>ehAbaRegistrosGestor_(a.nome));
    dados.forEach(a=>a.valores.slice(1).forEach(r=>{if(parseMesFat(r[8]).a!==e.ano||!r[11]||idsSnapshot.has(r[11]))throw Error('Registro duplicado ou fora do ano no backup.');idsSnapshot.add(r[11]);}));
    celulas+=dados.reduce((s,a)=>s+a.valores.length*COLUNAS_GESTOR_,0);return {ano:e.ano,estado:e.estado,fechadoEm:e.fechadoEm||'',dados:{ano:e.ano,abas:dados.map(a=>({nome:a.nome,valores:a.valores}))}};
  });if(celulas>500000)throw Error('O backup anual excede 500 mil células; preserve-o para recuperação em lotes.');return abas;
}
function prepararRestauracaoAnosGestor_(abas,ss){
  if(!abas.anos&&!ativoAnualGestor_(CONTEXTO_GESTOR_.ssReal))return;
  if(!['Lançamentos','Empréstimos'].every(n=>abas.some(a=>a.nome===n)))throw Error('Restaurar uma base anual exige as duas abas financeiras no backup.');
  const real=CONTEXTO_GESTOR_.ssReal,pasta=pastaProtecaoGestor_(),lote='restaurar-'+CONTEXTO_GESTOR_.param.requestId,entradas=[];
  for(const a of abas.anos||[]){const e=novaPlanilhaAnoGestor_(real,pasta,a.ano,lote,a.dados);e.estado=a.estado;e.fechadoEm=a.fechadoEm;if(e.estado==='FECHADO')e.hash=hashGestor_(a.dados);entradas.push(e);}
  CONTEXTO_GESTOR_.anosRestaurados=entradas;
  CONTEXTO_GESTOR_.anosPreparados=entradas.map(e=>({ano:e.ano,id:e.id,abas:['Lançamentos','Empréstimos'].map(nome=>({nome:nome,hash:hashEstadoGestor_(lerEstadoAbaGestor_(SpreadsheetApp.openById(e.id).getSheetByName(nome)))}))}));
}
function diagnosticoRecuperacaoAnosGestor_(ss,backup){
  const catalogo=catalogoAnosGestor_(ss),indisponiveis=[],estados=[];
  for(const e of catalogo){try{estados.push([e.ano,hashGestor_(dadosAnoGestor_(e))]);}catch(erro){indisponiveis.push({ano:e.ano,id:e.id,motivo:String(erro.message||erro)});}}
  if(indisponiveis.length&&(backup.formato!=='gestor-financeiro-backup-v3'||!['Lançamentos','Empréstimos'].every(n=>backup.abas.some(a=>a.nome===n))||indisponiveis.some(e=>!backup.anos.some(a=>a.ano===e.ano))))throw Error('Há ano indisponível. Selecione um backup completo v3 com as duas abas financeiras e todos os anos afetados; nada foi substituído.');
  return {necessaria:indisponiveis.length>0,indisponiveis:indisponiveis,assinatura:hashGestor_({catalogo:catalogo,estados:estados,indisponiveis:indisponiveis})};
}
function informarOrigemAnualResultadoGestor_(resultado,ctx){
  if(!resultado||typeof resultado!=='object'||!ativoAnualGestor_(ctx.ssReal)||ctx.anosIndisponiveis?.size)return;
  const mapa=new Map(),fechados=new Map(catalogoAnosGestor_(ctx.ssReal).filter(e=>e.estado==='FECHADO').map(e=>[e.ano,e]));
  for(const e of fechados.values()){
    const chave=e.ano+':'+e.id+':'+e.estado+':'+e.hash,dados=ctx.cacheAnosConferidos?.get(chave)||dadosAnoGestor_(e);
    for(const a of dados.abas)for(const r of a.valores.slice(1))mapa.set(String(r[11]),{r:r,e:e,emprestimo:a.nome==='Empréstimos'});
  }
  const atuais=new Map();for(const nome of ['Lançamentos','Empréstimos'])for(const r of ctx.ss.abas[nome]?.valores.slice(1)||[])atuais.set(String(r[11]),r);
  function estado(id){const o=mapa.get(String(id)),r=atuais.get(String(id))||o?.r,e=o?.e||fechados.get(parseMesFat(r?.[8]).a);if(!e)return null;return {ano:e.ano,fechadoEm:e.fechadoEm,incluidoDepois:!o,alteradoDepois:!o||hashGestor_(r)!==hashGestor_(o.r),pagoBancoNoFechamento:o?valorPagoBancoGestor_(o.r,o.emprestimo):null,recebidoNoFechamento:o?.emprestimo?o.r[9]==='Recebido':null};}
  function visitar(valor){if(!valor||typeof valor!=='object')return;if(Array.isArray(valor)){if(valor.length>=17&&typeof valor[13]==='string'){const e=estado(valor[13]);if(e)valor[valor.length>=19?20:18]=e;return;}valor.forEach(visitar);}else{if(valor.registroId){const e=estado(valor.registroId);if(e)valor.estadoAno=e;}for(const k of Object.keys(valor))if(k!=='estadoAno')visitar(valor[k]);}}
  visitar(resultado);
}
