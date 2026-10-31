// Corrige somente conversão de texto em Date depois de um bloco já aplicado.
// A igualdade do hash integral é obrigatória antes e depois da escrita.
function recuperarDatasTextoPlanoGestor_(ss,plano){
 for(const m of plano.mudancas||[]){
  const campos=m.nome==='Anotações'?[[3,'dd/MM/yyyy',/^\d{2}\/\d{2}\/\d{4}$/]]:m.nome==='Planejamento'?[[5,'yyyy-MM-dd',/^\d{4}-\d{2}-\d{2}$/]]:ehAbaRegistrosGestor_(m.nome)?[[0,'dd/MM/yyyy',/^\d{2}\/\d{2}\/\d{4}$/],[6,'d/M',/^\d{1,2}\/\d{1,2}$/],[8,'MM/yyyy',/^\d{2}\/\d{4}$/]]:[];
  if(!campos.length||m.modo==='anexar')continue;
  const destino=destinoMudancaAnualGestor_(ss,m,plano),sh=destino.getSheetByName(m.nome);if(!sh)continue;
  const atual=lerEstadoAbaGestor_(sh);if(hashEstadoGestor_(atual)===m.depois)continue;
  const normalizado=copiarGestor_(atual),reparos=[],fuso=destino.getSpreadsheetTimeZone();
  for(const [i,r]of m.alteracoes||[])for(const [coluna,formato,padrao]of campos){const v=atual[i]?.[coluna],esperado=r?.[coluna];if(i>0&&v instanceof Date&&typeof esperado==='string'&&padrao.test(esperado)&&Utilities.formatDate(v,fuso,formato)===esperado&&Utilities.formatDate(v,fuso,'HH:mm:ss')==='00:00:00'){normalizado[i][coluna]=esperado;reparos.push([i+1,coluna+1,esperado]);}}
  if(!reparos.length||hashEstadoGestor_(normalizado)!==m.depois)continue;
  // Releitura protege contra alterações entre a conferência e a reparação.
  if(hashEstadoGestor_(lerEstadoAbaGestor_(sh))!==hashEstadoGestor_(atual))throw Error('Os registros mudaram durante a conferência. Consulte novamente.');
  for(const [linha,coluna,texto]of reparos)sh.getRange(linha,coluna).setValue("'"+texto);
  SpreadsheetApp.flush();if(hashEstadoGestor_(lerEstadoAbaGestor_(sh))!==m.depois)throw Error('A conversão da data ainda precisa de conferência. O diário foi preservado.');
 }
}
