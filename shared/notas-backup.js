// Compatibilidade de Anotações: reconhece o esquema antigo sem descartar
// revisão ou exclusão. Conteúdo desconhecido em E/F exige conferência.
const CABECALHO_NOTAS_GESTOR_=['ID','Texto','Concluída','Data','Versão','Excluída'];
function normalizarAbaNotasBackupGestor_(aba){
  if(!aba||aba.nome!=='Anotações')return aba;
  if(!Array.isArray(aba.valores)||!aba.valores.length||!Array.isArray(aba.valores[0]))throw Error('Estrutura de Anotações incompleta.');
  const cab=aba.valores[0];
  if(cab.length<4)throw Error('Estrutura de Anotações incompleta.');
  if(CABECALHO_NOTAS_GESTOR_.slice(0,4).some(function(t,i){return cab[i]!==t;})||[4,5].some(function(i){return cab[i]!=null&&cab[i]!==''&&cab[i]!==CABECALHO_NOTAS_GESTOR_[i];}))throw Error('Cabeçalho de Anotações não reconhecido. Preserve a aba para conferência.');
  const cols=Math.max(6,cab.length),valores=aba.valores.map(function(r,i){
    if(!Array.isArray(r)||r.length!==cab.length)throw Error('Linhas incompatíveis em Anotações.');
    const linha=Array.from({length:cols},function(_,j){return r[j]==null?'':r[j];});
    if(!i){CABECALHO_NOTAS_GESTOR_.forEach(function(t,j){linha[j]=t;});return linha;}
    if(!linha.some(function(v){return v!=='';}))return linha;
    if(typeof linha[0]!=='string'||!linha[0]||typeof linha[1]!=='string'||![true,false,''].includes(linha[2])||![true,false,''].includes(linha[5])||linha[4]!==''&&(!Number.isSafeInteger(linha[4])||linha[4]<1))throw Error('Versão, exclusão ou conteúdo de Anotações não reconhecido. Preserve os dados para conferência.');
    if(linha[4]==='')linha[4]=1;
    return linha;
  });
  const formulas=aba.formulas;
  if(Array.isArray(formulas)&&formulas.some(function(r){return Array.isArray(r)&&r.slice(0,6).some(Boolean);}))throw Error('Anotações contém fórmulas nos campos de dados. Preserve a aba para conferência.');
  const normalizada=Object.assign({},aba,{valores:valores});
  if(formulas)normalizada.formulas=formulas.map(function(r){return Array.from({length:cols},function(_,j){return r[j]||'';});});
  return normalizada;
}
function garantirCabecalhoNotasGestor_(sh){
  if(!sh)return;
  const range=sh.getDataRange(),aba=normalizarAbaNotasBackupGestor_({nome:'Anotações',valores:range.getValues(),formulas:range.getFormulas()});
  const antes=range.getValues()[0];
  if(CABECALHO_NOTAS_GESTOR_.some(function(t,i){return antes[i]!==t;}))sh.getRange(1,1,1,6).setValues([CABECALHO_NOTAS_GESTOR_]);
  return aba;
}
function normalizarNotasBackupRestauracaoGestor_(backup){
  if(!backup||!Array.isArray(backup.abas))return backup;
  return Object.assign({},backup,{abas:backup.abas.map(normalizarAbaNotasBackupGestor_)});
}
