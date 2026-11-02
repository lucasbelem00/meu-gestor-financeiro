// Classificação independente de pagamento, parcelamento e recorrência.
const ABA_PERFIL_CATEGORIAS_GESTOR_='Perfil de Categorias';
const CAB_PERFIL_CATEGORIAS_GESTOR_=['Categoria','Tipo de gasto','Prioridade'];
function validarPerfilGastoGestor_(p){
  if(!p||typeof p!=='object'||Array.isArray(p)||!['','fixo','variavel'].includes(p.tipo)||!['','essencial','ajustavel'].includes(p.prioridade))throw Error('Confira o tipo e a prioridade do gasto.');
  return {tipo:p.tipo,prioridade:p.prioridade};
}
function lerPerfilGastoGestor_(r){
  let texto=String(r[15]||'');
  for(let n=0;n<8;n++){
    const m=/^gestor-(?:perfil|serie|devolucao)-v1:/.exec(texto);if(!m)break;
    let info;try{info=JSON.parse(texto.slice(m[0].length));}catch(e){if(m[0]==='gestor-perfil-v1:')throw Error('Classificação inválida no controle do lançamento.');break;}
    if(!info||typeof info!=='object')break;
    if(Object.prototype.hasOwnProperty.call(info,'perfilGasto'))return validarPerfilGastoGestor_(info.perfilGasto);
    texto=String(info.legado||'');
  }
  return {tipo:'',prioridade:''};
}
function definirPerfilGastoGestor_(r,p){
  const perfil=validarPerfilGastoGestor_(p),texto=String(r[15]||''),m=/^gestor-(?:perfil|serie|devolucao)-v1:/.exec(texto);let info={legado:texto},prefixo='gestor-perfil-v1:';
  const antigo=lerPerfilGastoGestor_(r);if(!perfil.tipo&&!perfil.prioridade&&!antigo.tipo&&!antigo.prioridade)return r;
  if(m){prefixo=m[0];try{info=JSON.parse(texto.slice(prefixo.length));}catch(e){throw Error('O controle deste lançamento precisa de conferência antes de classificar.');}if(!info||typeof info!=='object'||Array.isArray(info))throw Error('Controle do lançamento inválido.');}
  info.perfilGasto=perfil;r[15]=prefixo+JSON.stringify(info);return r;
}
function validarTabelaPerfilCategoriasGestor_(linhas){
  if(!Array.isArray(linhas)||!linhas.length||linhas.length>26||JSON.stringify(linhas[0])!==JSON.stringify(CAB_PERFIL_CATEGORIAS_GESTOR_))throw Error('Estrutura de Perfil de Categorias inválida.');
  const nomes=new Set();linhas.slice(1).forEach(function(r){const k=chaveCategoria(r[0]);if(r.length!==3||!k||typeof r[0]!=='string'||nomes.has(k))throw Error('Categoria inválida ou repetida na classificação.');nomes.add(k);validarPerfilGastoGestor_({tipo:r[1],prioridade:r[2]});});return linhas;
}
function lerPerfisCategoriasGestor_(ss){
  const sh=ss.getSheetByName(ABA_PERFIL_CATEGORIAS_GESTOR_),mapa=Object.create(null);if(!sh||!sh.getLastRow())return mapa;
  validarTabelaPerfilCategoriasGestor_(sh.getDataRange().getValues()).slice(1).forEach(function(r){mapa[chaveCategoria(r[0])]={tipo:r[1],prioridade:r[2]};});return mapa;
}
function perfilPadraoCategoriaGestor_(ss,nome){return lerPerfisCategoriasGestor_(ss)[chaveCategoria(nome)]||{tipo:'',prioridade:''};}
function perfilNovoLancamentoGestor_(ss,nome,escolha){
  const padrao=perfilPadraoCategoriaGestor_(ss,nome);if(escolha===undefined)return padrao;
  if(!escolha||typeof escolha!=='object'||Array.isArray(escolha))throw Error('Classificação do lançamento inválida.');
  return validarPerfilGastoGestor_({tipo:escolha.tipo===undefined?padrao.tipo:escolha.tipo,prioridade:escolha.prioridade===undefined?padrao.prioridade:escolha.prioridade});
}
function salvarPerfisCategoriasGestor_(ss,cats,renomeacoes){
  const anterior=lerPerfisCategoriasGestor_(ss),linhas=[CAB_PERFIL_CATEGORIAS_GESTOR_];
  cats.forEach(function(c){const ren=(renomeacoes||[]).find(function(r){return chaveCategoria(r.para)===chaveCategoria(c.nome);}),p=anterior[chaveCategoria(ren?ren.de:c.nome)]||{tipo:'',prioridade:''};
    const perfil=validarPerfilGastoGestor_({tipo:c.tipoGasto===undefined?p.tipo:c.tipoGasto,prioridade:c.prioridadeGasto===undefined?p.prioridade:c.prioridadeGasto});linhas.push([c.nome,perfil.tipo,perfil.prioridade]);});
  if(!ss.getSheetByName(ABA_PERFIL_CATEGORIAS_GESTOR_)&&!linhas.slice(1).some(r=>r[1]||r[2]))return;
  const sh=ss.getSheetByName(ABA_PERFIL_CATEGORIAS_GESTOR_)||ss.insertSheet(ABA_PERFIL_CATEGORIAS_GESTOR_);
  sh.valores=linhas.map(r=>r.map(v=>textoLiteralGestor_(v)));sh.colunas=3;sh.alterados=Object.create(null);sh.valores.forEach((r,i)=>r.forEach((_,j)=>sh.alterados[i+':'+j]=true));
}
function resumoPerfilGastosGestor_(itens,mes){
  const res={mes,total:0,tipo:{fixo:0,variavel:0,naoClassificado:0},prioridade:{essencial:0,ajustavel:0,naoClassificado:0},naoClassificados:0};
  for(const item of itens){const r=item.raw||item;if((String(mes).includes('/')?formatarCelulaRegistroGestor_(r[8],'MM/yyyy')!==mes:String(parseMesFat(r[8]).a)!==String(mes))||isStatusCancelado(r[9]))continue;const valor=centavosGestor_(r[7]);if(valor<=0)continue;const p=lerPerfilGastoGestor_(r);res.total+=valor;res.tipo[p.tipo||'naoClassificado']+=valor;res.prioridade[p.prioridade||'naoClassificado']+=valor;if(!p.tipo||!p.prioridade)res.naoClassificados+=valor;}
  return res;
}
function correspondePerfilGastoGestor_(r,f){
  if(!f.perfilCampo)return true;
  if(!['tipo','prioridade','pendentes'].includes(f.perfilCampo))throw Error('Filtro de classificação inválido.');
  if(isStatusCancelado(r[9])||centavosGestor_(r[7])<=0)return false;
  const p=lerPerfilGastoGestor_(r);if(f.perfilCampo==='pendentes')return !p.tipo||!p.prioridade;
  return p[f.perfilCampo]===(f.perfilValor==='naoClassificado'?'':f.perfilValor);
}
