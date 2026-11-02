// Pula uma competência da série sem encerrar a recorrência ou desfazer pagamentos.
// A prévia é revalidada dentro da operação financeira, antes de qualquer escrita.
function planoPularMesFixoGestor_(dados) {
  if (!dados || !dados.registroId) throw Error('Atualize a tela para identificar a despesa fixa.');
  const ss = obterPlanilhaGestor_(), sheet = ss.getSheetByName('Lançamentos'), lido = lerAbaCompleta(sheet, COLUNAS_GESTOR_);
  const idx = localizarIndiceSeguro(lido.disp, dados.linhaBase, dados.descricao, '', '∞/∞');
  if (idx < 0 || limparApostrofo(lido.disp[idx][6]) !== '∞/∞') throw Error('Despesa fixa não localizada. Atualize a tela.');
  const grupo = indicesMesmaCompra(lido.disp, idx), linhas = grupo.map(function(i) { return lido.raw[i]; });
  if (linhas.some(function(r) { return serieRecorrenteGestor_(r).invalida || serieRecorrenteGestor_(r).encerrada || ['Assinatura Cancelada','Pago (Cancelada)'].includes(r[9]); })) throw Error('Esta recorrência está encerrada ou precisa de conferência.');
  const hoje = getHojeSeguro(), atual = pad2(hoje.getMonth()+1)+'/'+hoje.getFullYear();
  const primeiro = linhas.map(function(r) { return formatarCelulaRegistroGestor_(r[8], 'MM/yyyy'); }).sort(function(a,b) { return parseMesFat(a).time-parseMesFat(b).time; })[0];
  const mes = validarMesFaturaWeb_(dados.mesFatura || (parseMesFat(primeiro).time>parseMesFat(atual).time?primeiro:atual));
  const tempo = parseMesFat(mes).time;
  const alvos = grupo.filter(function(i) { return formatarCelulaRegistroGestor_(lido.raw[i][8], 'MM/yyyy')===mes; });
  if (alvos.length>1) throw Error('Há mais de uma ocorrência desta série no mês. Confira os registros antes de pular.');
  const ref = referenciaRecorrenteNoMesGestor_(linhas, mes);
  if (!ref) throw Error('A despesa fixa ainda não começou nesse mês.');
  const alvo = alvos.length ? alvos[0] : -1, r = alvo>=0 ? lido.raw[alvo] : null;
  const motivo = r && (isStatusPago(r[9]) || centavosGestor_(valorPagoBancoGestor_(r,false))>0) ? 'pago' : r && r[9]==='Ocorrência Pulada' ? 'pulado' : '';
  if (r && !motivo && isStatusCancelado(r[9])) throw Error('Esta ocorrência está cancelada. Confira o Histórico.');
  const proxima = new Date(tempo); proxima.setMonth(proxima.getMonth()+1);
  const proximoMes = proxima.getFullYear()<=2200 ? pad2(proxima.getMonth()+1)+'/'+proxima.getFullYear() : '';
  return {ss:ss,sheet:sheet,lido:lido,alvo:alvo,ref:ref,linhas:linhas,mes:mes,motivo:motivo,proximoMes:proximoMes,hash:hashGestor_({mes:mes,linhas:linhas})};
}
function previaPularMesFixoWeb(dados) {
  return executarOperacaoGestor_('previaPularMesFixoWeb',dados,function() {
    const p=planoPularMesFixoGestor_(dados);
    return {mesFatura:p.mes,podePular:!p.motivo,motivo:p.motivo,proximoMes:p.proximoMes,versaoPrevia:p.hash,descricao:limparApostrofo(p.ref[1]),forma:limparApostrofo(p.ref[2])};
  },true);
}
function pularMesFixoWeb(dados) {
  return executarOperacaoGestor_('pularMesFixoWeb',dados,function() {
    const p=planoPularMesFixoGestor_(dados);
    if (!dados.mesFatura || dados.versaoPrevia!==p.hash) throw Error('A despesa fixa mudou. Confira novamente o mês antes de pular.');
    if (p.motivo==='pago') throw Error('Este mês já tem pagamento registrado. Nenhum pagamento foi alterado.');
    if (p.motivo==='pulado') throw Error('Este mês já foi pulado. Confira novamente antes de escolher outro.');
    const nova=p.alvo>=0?p.lido.raw[p.alvo].slice():montarLinhaLanc(valoresExibidosRegistroGestor_(p.ref,p.ref),p.ref,{mes:p.mes,status:'Ocorrência Pulada'});
    if (p.alvo<0) {
      const original=parseDataBR(formatarCelulaRegistroGestor_(p.ref[0],'dd/MM/yyyy')),mesOriginal=parseMesFat(formatarCelulaRegistroGestor_(p.ref[8],'MM/yyyy')),destino=parseMesFat(p.mes);
      if(!original || !mesOriginal.m)throw Error('Confira a data da despesa fixa antes de pular um mês futuro.');
      const data=new Date(original.getFullYear(),original.getMonth()+(destino.a-mesOriginal.a)*12+destino.m-mesOriginal.m,1);
      const dia=diaReferenciaSerieGestor_(p.linhas);
      nova[0]="'"+pad2(Math.min(dia,new Date(data.getFullYear(),data.getMonth()+1,0).getDate()))+'/'+pad2(data.getMonth()+1)+'/'+data.getFullYear();
      nova[11]=gerarIdGestor_();nova[13]=1;
      definirSerieRecorrenteGestor_(nova,{diaReferencia:dia,encerrada:false});
    }
    nova[9]='Ocorrência Pulada';nova[14]='Em Aberto';nova[17]=0;
    escreverLinhaPlanilha(p.sheet,p.alvo>=0?p.alvo+2:Math.max(2,p.sheet.getLastRow()+1),nova);
    organizarEAtualizarPlanilha(p.sheet,p.ss.getSheetByName('Formas de Pagamento'));
    return {sucesso:true,pulada:true,mesFatura:p.mes};
  },false);
}
