// Apresentação derivada. Nunca copia cadastros, automações ou dados da base para outro ano.
// O resumo consulta apenas as duas abas do destino. Ano fechado mostra o retrato
// do fechamento; ajustes posteriores permanecem no controle e no webapp.
// O marcador guarda os hashes anterior/esperado para retomar falhas sem aceitar
// personalizações como conteúdo gerado. Erros visuais viram aviso independente.
const MARCADOR_APRESENTACAO_ANUAL_GESTOR_='Gestor — apresentação anual v1';
function matrizResumoVisualAnualGestor_(ano,estado){
  if(!anoCompetenciaValidoGestor_(ano))throw Error('Ano inválido para o resumo anual.');
  const soma=(aba,coluna,mes,status)=>{
    const ref="'"+aba+"'!",situacao=ref+'J2:J',competencia=ref+'I2:I',normalizada='ARRAYFORMULA(IF(ISNUMBER('+competencia+');TEXT('+competencia+';"mm/yyyy");TRIM('+competencia+')))',st='LOWER(TRIM('+situacao+'))';
    const pago=['pago','assinatura paga','pago (cancelada)','recebido'].map(s=>'('+st+'="'+s+'")').join('+');
    const valor=coluna==='R'?'ARRAYFORMULA(IF('+pago+';'+ref+'H2:H;'+ref+'R2:R))':ref+coluna+'2:'+coluna;
    // IFNA trata somente mês sem linhas; erros de referência continuam visíveis.
    return '=IFNA(SUM(FILTER('+valor+';'+normalizada+'="'+mes+'";ARRAYFORMULA('+st+')<>"assinatura cancelada";ARRAYFORMULA('+st+')<>"ocorrência pulada"'+(status?';'+situacao+'="'+status+'"':'')+'));0)';
  };
  const linhas=[['Gestor de Gastos — '+ano],['Ano '+ano+' • '+(estado==='FECHADO'?'Fechado — retrato preservado':'Aberto — registros atualizados pelo webapp')],['Pagamentos ao banco e devoluções de pessoas são controles separados.'],['Gastos pessoais','Pago dos pessoais','Em aberto pessoal','Emprestado a terceiros','Recebido de terceiros','A receber de terceiros'],['=SUM(B9:B20)','=SUM(C9:C20)','=SUM(D9:D20)','=SUM(E9:E20)','=SUM(F9:F20)','=SUM(G9:G20)'],[],['Mês','Gastos pessoais','Pago dos pessoais','Em aberto pessoal','Emprestado a terceiros','Recebido de terceiros','A receber de terceiros']];
  for(let m=1;m<=12;m++){const mes=String(m).padStart(2,'0')+'/'+ano,r=m+8;linhas.push([mes,soma('Lançamentos','H',mes),soma('Lançamentos','R',mes),'=MAX(0;B'+r+'-C'+r+')',soma('Empréstimos','H',mes),soma('Empréstimos','H',mes,'Recebido'),'=MAX(0;E'+r+'-F'+r+')']);}
  return linhas.map(r=>Array.from({length:7},(_,i)=>r[i]??''));
}
function conteudoResumoVisualAnualGestor_(sh){
  const rg=sh.getRange(2,1,19,7),v=rg.getValues(),f=rg.getFormulas();return v.map((r,i)=>r.map((x,j)=>f[i][j]||x));
}
function hashResumoVisualAnualGestor_(linhas){return hashGestor_(linhas.map(r=>r.map(v=>typeof v==='string'&&v.startsWith('=')?normalizarFormulaResumoGestor_(v):v)));}
function atualizarResumoVisualAnualGestor_(destino,ano,estado){
  let sh=destino.getSheetByName('Dashboard & Resumo'),hashAtual;
  if(sh&&sh.getLastRow()){
    const cab=sh.getRange(1,1,1,6).getValues()[0];
    if(cab[0]!==MARCADOR_APRESENTACAO_ANUAL_GESTOR_||cab[1]!==propriedade_(CHAVE_ID_PLANILHA_GESTOR)||Number(cab[2])!==ano)throw Error('Há um Dashboard anual particular. Preserve-o antes de aplicar o modelo.');
    hashAtual=hashResumoVisualAnualGestor_(conteudoResumoVisualAnualGestor_(sh));
    if(cab[3]!==hashAtual&&!(cab[4]==='PREPARANDO'&&cab[5]===hashAtual))throw Error('O resumo anual foi personalizado. Nenhuma alteração particular será sobrescrita.');
  }
  const linhas=matrizResumoVisualAnualGestor_(ano,estado),hash=hashResumoVisualAnualGestor_(linhas);
  if(!sh)sh=destino.insertSheet('Dashboard & Resumo');
  if(sh.getRange(1,4).getValue()===hash&&sh.getRange(1,5).getValue()==='CONFIRMADO')return;
  hashAtual=hashAtual||hashResumoVisualAnualGestor_(conteudoResumoVisualAnualGestor_(sh));
  sh.getRange(1,1,1,6).setValues([[MARCADOR_APRESENTACAO_ANUAL_GESTOR_,propriedade_(CHAVE_ID_PLANILHA_GESTOR),ano,hash,'PREPARANDO',hashAtual]]);
  sh.getRange(2,1,linhas.length,7).setValues(linhas.map(r=>r.map(v=>typeof v==='string'&&/^\d{2}\/\d{4}$/.test(v)?"'"+v:v)));
  sh.getRange(2,1,19,7).setFontFamily('Roboto').setFontSize(10).setVerticalAlignment('middle');
  for(const r of [2,5,8])sh.getRange(r,1,1,7).setBackground('#1b365d').setFontColor('#ffffff').setFontWeight('bold');
  sh.getRange(6,1,1,6).setNumberFormat('R$ #,##0.00');sh.getRange(9,2,12,6).setNumberFormat('R$ #,##0.00');
  sh.setFrozenRows(8);if(sh.setColumnWidth)for(let c=1;c<=7;c++)sh.setColumnWidth(c,c===1?140:185);
  sh.getRange(1,1,1,6).setValues([[MARCADOR_APRESENTACAO_ANUAL_GESTOR_,propriedade_(CHAVE_ID_PLANILHA_GESTOR),ano,hash,'CONFIRMADO','']]);
}
function prepararApresentacaoAnoGestor_(origem,destino,ano,estado='ABERTO'){
  // Somente formatação; datas nativas e os 18 campos financeiros continuam intactos.
  const leia=destino.getSheetByName('Leia-me'),marca=leia?.getRange(5,1).getValue();
  if(marca!==MARCADOR_APRESENTACAO_ANUAL_GESTOR_){
    for(const nome of ['Lançamentos','Empréstimos']){
      const sh=destino.getSheetByName(nome),modelo=origem.getSheetByName(nome),cab=sh.getRange(1,1,1,COLUNAS_GESTOR_);
      cab.setBackground('#1b365d').setFontColor('#ffffff').setFontWeight('bold').setFontFamily('Roboto').setFontSize(10);
      if(modelo)for(const [get,set]of [['getBackgrounds','setBackgrounds'],['getFontColors','setFontColors'],['getFontFamilies','setFontFamilies'],['getFontSizes','setFontSizes'],['getHorizontalAlignments','setHorizontalAlignments']]){const rg=modelo.getRange(1,1,1,COLUNAS_GESTOR_);if(typeof rg[get]==='function'&&typeof cab[set]==='function')cab[set](rg[get]());}
      sh.setFrozenRows(1);
      if(sh.hideColumns)sh.hideColumns(12,7);
      if(sh.setColumnWidth)for(let c=1;c<=COLUNAS_GESTOR_;c++)sh.setColumnWidth(c,modelo?.getColumnWidth?modelo.getColumnWidth(c):([2,3,4,11].includes(c)?230:130));
      if(sh.getLastRow()>1)for(const c of [5,8,18]){const rg=sh.getRange(2,c,sh.getLastRow()-1,1);if(!rg.getValues().some(r=>r[0] instanceof Date))rg.setNumberFormat('R$ #,##0.00');}
      if(sh.getFilter&&sh.getMaxRows&&!sh.getFilter())sh.getRange(1,1,sh.getMaxRows(),11).createFilter();
    }
  }
  atualizarResumoVisualAnualGestor_(destino,ano,estado);
  if(leia&&marca!==MARCADOR_APRESENTACAO_ANUAL_GESTOR_)leia.getRange(5,1,1,2).setValues([[MARCADOR_APRESENTACAO_ANUAL_GESTOR_,'Dashboard do ano e dados gerenciados pelo webapp.']]);
}
function tentarApresentacaoAnoGestor_(origem,destino,ano,estado){
  try{prepararApresentacaoAnoGestor_(origem,destino,ano,estado);return {sucesso:true};}
  catch(e){try{const c=configProtecaoGestor_();c.avisoApresentacaoAnual='Ano '+ano+': '+String(e.message||e).slice(0,250);salvarConfigProtecaoGestor_(c);}catch(_){}return {sucesso:false,ano:ano};}
}
