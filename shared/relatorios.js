// Resumos derivados: a fonte financeira continua sendo registros + ajustes e
// arquivos anuais conferidos. Esta aba e os PDFs nunca substituem o backup.
const ABA_RESUMO_NATIVO_GESTOR_='_Gestor_Resumo';
const MARCADOR_RESUMO_NATIVO_GESTOR_='Resumo gerenciado pelo Gestor — v1';
const CAB_RESUMO_NATIVO_GESTOR_=['Ano','Mês','Forma','Categoria','Origem','Registrado','Pago ao banco','Saldo ao banco','Recebido de pessoas','A receber de pessoas','Quantidade'];
const ABA_RELATORIOS_PDF_GESTOR_='_Gestor_RelatoriosPDF';
const CAB_RELATORIOS_PDF_GESTOR_=['Identificação','Período','Hash dos dados','Estado','Arquivo ou nome','SHA256 PDF','Gerado em','Metadados JSON'];

function registrosResumoNativoGestor_(ss){
  const categorias=listarNomesCategoriasConfig(ss.getSheetByName('Dashboard & Resumo')),registros=[],ids=new Set();
  const incluir=function(nome,r){
    if(!r.some(v=>v!==''&&v!=null))return;
    const id=String(r[11]||'');if(!id||ids.has(id))throw Error('O resumo encontrou registro sem identificação ou repetido. Atualize os dados antes de gerar relatórios.');ids.add(id);
    const mes=formatarCelulaRegistroGestor_(r[8],'MM/yyyy'),info=parseMesFat(mes),total=centavosGestor_(r[7]),emp=nome==='Empréstimos';
    if(!info.time)throw Error('Competência inválida no resumo. Nenhum período será omitido.');
    if(isStatusCancelado(r[9])||total<=0)return;
    const pago=centavosGestor_(valorPagoBancoGestor_(r,emp));
    registros.push({id:id,ano:info.a,mes:mes,forma:nomeFormaLeituraGestor_(r[emp?3:2],ss),categoria:emp?'Empréstimos a terceiros':resolverCategoria(r[3],categorias),origem:emp?'Terceiros':'Pessoal',total:total,pago:pago,saldo:total-pago,recebido:emp&&r[9]==='Recebido'?total:0,aReceber:emp&&r[9]!=='Recebido'?total:0});
  };
  for(const nome of ['Lançamentos','Empréstimos']){
    const valores=typeof ativoAnualGestor_==='function'&&ativoAnualGestor_(ss)?matrizFinanceiraAnualGestor_(ss,nome):ss.getSheetByName(nome)?.getDataRange().getValues()||[];
    valores.slice(1).forEach(r=>incluir(nome,r));
  }
  for(const e of catalogoAnualProtecaoGestor_(ss))for(const a of dadosArquivoAnualProtecaoGestor_(e).abas)a.valores.slice(1).forEach(r=>incluir(a.nome,r));
  return registros.sort((a,b)=>a.id.localeCompare(b.id));
}
function agruparResumoNativoGestor_(registros){
  const grupos=new Map();for(const r of registros){const chave=JSON.stringify([r.ano,r.mes,r.forma,r.categoria,r.origem]);if(!grupos.has(chave))grupos.set(chave,{ano:r.ano,mes:r.mes,forma:r.forma,categoria:r.categoria,origem:r.origem,total:0,pago:0,saldo:0,recebido:0,aReceber:0,quantidade:0});const g=grupos.get(chave);for(const k of ['total','pago','saldo','recebido','aReceber'])g[k]+=r[k];g.quantidade++;}
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
function reconhecerFormulaPadraoResumoGestor_(formula,linha,coluna,ss){
  const f=normalizarFormulaResumoGestor_(formula),comparar=t=>f===normalizarFormulaResumoGestor_(t),l="'Lançamentos'!";
  if(linha===3){const modelos={2:'=SUMIFS('+l+'H:H;'+l+'J:J;"<>Pago";'+l+'J:J;"<>Assinatura Cancelada")',4:'=SUMIFS('+l+'H:H;'+l+'J:J;"Pago")',6:'=SUMIFS('+l+'H:H;'+l+'I:I;TEXT(TODAY();"mm/yyyy");'+l+'J:J;"<>Assinatura Cancelada")',8:'=SUMIFS('+l+'H:H;'+l+'J:J;"<>Assinatura Cancelada")'};return modelos[coluna]&&comparar(modelos[coluna])?{linha:linha,coluna:coluna}:null;}
  if(linha>=7&&linha<=14&&coluna>=3&&coluna<=6){const m=String(formula).match(/"(\d{2}\/\d{4})"\s*\)\s*$/);if(m&&parseMesFat(m[1]).time&&comparar('=SUMIFS('+l+'$H:$H;'+l+'$C:$C;$B'+linha+';'+l+'$I:$I;"'+m[1]+'")'))return {linha:linha,coluna:coluna,mes:m[1]};}
  if(linha>=17&&linha<=41&&coluna===3&&comparar('=SUMIFS('+l+'H:H;'+l+'D:D;B'+linha+';'+l+'I:I;TEXT(TODAY();"mm/yyyy");'+l+'J:J;"<>Assinatura Cancelada")'))return {linha:linha,coluna:coluna,categoria:String(ss.getSheetByName('Dashboard & Resumo').getRange(linha,2).getValue()||'')};
  return null;
}
function atualizarResumoNativoGestor_(ss){
  let sh=ss.getSheetByName(ABA_RESUMO_NATIVO_GESTOR_),meta={migracoes:[]};
  if(sh&&sh.getLastRow()){
    const cab=sh.getRange(1,1,1,3).getValues()[0];if(cab[0]!==MARCADOR_RESUMO_NATIVO_GESTOR_||cab[1]!==propriedade_(CHAVE_ID_PLANILHA_GESTOR))throw Error('A aba _Gestor_Resumo contém dados não gerenciados. Preserve-a antes de gerar o resumo.');
    try{meta=JSON.parse(cab[2]||'{}');}catch(_){throw Error('Controle do resumo nativo inválido.');}if(meta.versao!==1||!Array.isArray(meta.migracoes)||meta.migracoes.length>61||meta.migracoes.some(m=>!m||!Number.isInteger(m.linha)||!Number.isInteger(m.coluna)||typeof m.gerada!=='string'||!formulaGerenciadaResumoGestor_(m.linha,m.coluna,m.mes,m.categoria)||m.gerada!==formulaGerenciadaResumoGestor_(m.linha,m.coluna,m.mes,m.categoria)||m.aceitas&&(!Array.isArray(m.aceitas)||m.aceitas.length>2||m.aceitas.some(f=>typeof f!=='string'||f.length>10000))))throw Error('Controle de fórmulas do resumo inválido.');
  }
  const registros=registrosResumoNativoGestor_(ss),grupos=agruparResumoNativoGestor_(registros),hash=hashGestor_(registros),dash=ss.getSheetByName('Dashboard & Resumo'),migracoes=meta.migracoes.slice();
  if(dash){const formulas=dash.getDataRange().getFormulas();for(let i=0;i<formulas.length;i++)for(let j=0;j<formulas[i].length;j++)if(formulas[i][j]){
    const anterior=migracoes.find(m=>m.linha===i+1&&m.coluna===j+1),reconhecida=reconhecerFormulaPadraoResumoGestor_(formulas[i][j],i+1,j+1,ss);
    if(!reconhecida&&(!anterior||formulas[i][j]!==anterior.gerada&&!(anterior.aceitas||[]).includes(formulas[i][j])))continue;
    const m=reconhecida||Object.assign({},anterior),categoria=m.linha>=17?String(dash.getRange(m.linha,2).getValue()||''):m.categoria,gerada=formulaGerenciadaResumoGestor_(m.linha,m.coluna,m.mes,categoria);if(!gerada)continue;
    Object.assign(m,{categoria:categoria,gerada:gerada,aceitas:Array.from(new Set([formulas[i][j],gerada]))});const pos=migracoes.findIndex(x=>x.linha===m.linha&&x.coluna===m.coluna);if(pos<0)migracoes.push(m);else migracoes[pos]=m;
  }}
  if(!sh)sh=ss.insertSheet(ABA_RESUMO_NATIVO_GESTOR_);
  const linhas=[[MARCADOR_RESUMO_NATIVO_GESTOR_,propriedade_(CHAVE_ID_PLANILHA_GESTOR),JSON.stringify({versao:1,migracoes:migracoes})],['SHA256 dos dados',hash],['Atualizado em',new Date().toISOString()],CAB_RESUMO_NATIVO_GESTOR_,...grupos.map(g=>[g.ano,g.mes,g.forma,g.categoria,g.origem,g.total/100,g.pago/100,g.saldo/100,g.recebido/100,g.aReceber/100,g.quantidade])];
  gravarMatrizProtecaoGestor_(sh,linhas);if(sh.setFrozenRows)sh.setFrozenRows(4);
  if(grupos.length)sh.getRange(5,6,grupos.length,5).setNumberFormat('R$ #,##0.00');
  // A marca é persistida primeiro: interrupção após uma célula pode retomar
  // apenas as fórmulas reconhecidas. Fórmulas particulares nunca são apagadas.
  if(dash)for(const m of migracoes){const atual=dash.getRange(m.linha,m.coluna).getFormulas()[0][0];if(atual===m.gerada||(m.aceitas||[]).includes(atual)||reconhecerFormulaPadraoResumoGestor_(atual,m.linha,m.coluna,ss))dash.getRange(m.linha,m.coluna).setValue(m.gerada);}
  return {sucesso:true,hash:hash,periodos:Array.from(new Set(registros.map(r=>r.mes))),grupos:grupos.length,formulasMigradas:migracoes.length};
}
function migrarResumoNativoGestor_(ss){return atualizarResumoNativoGestor_(ss);}
function precisaMigrarResumoNativoGestor_(ss){
  const sh=ss.getSheetByName('Dashboard & Resumo');if(!sh)return false;
  const formulas=sh.getDataRange().getFormulas();return formulas.some((r,i)=>r.some((f,j)=>f&&Boolean(reconhecerFormulaPadraoResumoGestor_(f,i+1,j+1,ss))));
}

function escaparRelatorioPDFGestor_(texto){return String(texto??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function dadosPeriodoPDFGestor_(registros,periodo){
  if(!/^(?:\d{4}|\d{2}\/\d{4})$/.test(String(periodo)))throw Error('Período do relatório inválido.');
  if(String(periodo).includes('/')&&!parseMesFat(periodo).time)throw Error('Mês do relatório inválido.');
  const itens=registros.filter(r=>String(periodo).includes('/')?r.mes===periodo:String(r.ano)===String(periodo)),grupos=agruparResumoNativoGestor_(itens),hash=hashGestor_({versao:1,periodo:String(periodo),registros:itens});
  return {periodo:String(periodo),hash:hash,grupos:grupos,quantidade:itens.length};
}
function htmlRelatorioPDFGestor_(dados,geradoEm){
  const e=escaparRelatorioPDFGestor_,totais={pessoal:0,terceiros:0,pago:0,saldo:0,recebido:0,aReceber:0};for(const g of dados.grupos){totais[g.origem==='Pessoal'?'pessoal':'terceiros']+=g.total;for(const k of ['pago','saldo','recebido','aReceber'])totais[k]+=g[k];}
  const dinheiro=n=>e(formatBRL(n/100)),tabela=origem=>dados.grupos.filter(g=>g.origem===origem).map(g=>'<tr><td>'+e(g.mes)+'</td><td>'+e(g.forma)+'</td><td>'+e(g.categoria)+'</td><td>'+dinheiro(g.total)+'</td><td>'+dinheiro(g.pago)+'</td><td>'+dinheiro(g.saldo)+'</td>'+(origem==='Terceiros'?'<td>'+dinheiro(g.recebido)+'</td><td>'+dinheiro(g.aReceber)+'</td>':'')+'</tr>').join('');
  const cab='<th>Mês</th><th>Forma</th><th>Categoria</th><th>Registrado</th><th>Pago ao banco</th><th>Saldo ao banco</th>';
  return '<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4 landscape;margin:14mm}body{font:11px Arial,sans-serif;color:#172033}h1{font-size:23px}h2{font-size:16px;margin-top:22px}table{border-collapse:collapse;width:100%;margin-top:10px}th,td{border-bottom:1px solid #d8dfe8;text-align:left;padding:7px}th{background:#eef2f7}td:nth-child(n+4){text-align:right}thead{display:table-header-group}tr{page-break-inside:avoid}.sub{color:#53627a;font-size:10px}.totais{line-height:1.8}</style></head><body><h1>Gestor de Gastos — '+e(dados.periodo)+'</h1><p class="sub">Resumo de consulta · Gerado em '+e(geradoEm)+' · '+e(dados.quantidade)+' registro(s)</p><p class="totais">Gastos pessoais: <strong>'+dinheiro(totais.pessoal)+'</strong> · Gastos de terceiros: <strong>'+dinheiro(totais.terceiros)+'</strong><br>Pago ao banco: '+dinheiro(totais.pago)+' · Saldo ao banco: '+dinheiro(totais.saldo)+'<br>Recebido de pessoas: '+dinheiro(totais.recebido)+' · A receber de pessoas: '+dinheiro(totais.aReceber)+'</p><h2>Gastos pessoais</h2><table><thead><tr>'+cab+'</tr></thead><tbody>'+tabela('Pessoal')+'</tbody></table><h2>Gastos de terceiros</h2><table><thead><tr>'+cab+'<th>Recebido</th><th>A receber</th></tr></thead><tbody>'+tabela('Terceiros')+'</tbody></table><p class="sub">Competência do gasto e situação atual na data de geração. Receber da pessoa e pagar ao banco são controles separados. Correções e recebimentos posteriores geram outra revisão, sem apagar este arquivo. Este PDF é um resumo de leitura; o JSON é necessário para restauração.</p><p class="sub">Revisão dos dados: '+e(dados.hash)+'</p></body></html>';
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
    for(const r of linhas){const p=String(r[1]);if(/^\d{2}\/\d{4}$/.test(p)){const info=parseMesFat(p);if(info.time&&info.time<inicio)periodos.add(p);}else if(/^\d{4}$/.test(p)&&Number(p)>=2000&&Number(p)<hoje.getFullYear())periodos.add(p);}
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
