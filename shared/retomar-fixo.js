// Retomar cria outra série. Nenhum registro da série encerrada é alterado.
function dadosRetomadaSerieGestor_(linhas) {
  const hoje=getHojeSeguro();let inicio=new Date(hoje.getFullYear(),hoje.getMonth(),1);
  linhas.forEach(function(r){
    if(isStatusCancelado(r[9]))return;
    const m=parseMesFat(formatarCelulaRegistroGestor_(r[8],'MM/yyyy'));
    if(m.m&&m.time>=inicio.getTime())inicio=new Date(m.a,m.m,1);
  });
  return {diaCobranca:diaReferenciaSerieGestor_(linhas),retomarAPartir:inicio.getFullYear()<=2200?pad2(inicio.getMonth()+1)+'/'+inicio.getFullYear():''};
}
function retomarAssinaturaWeb(dados) {
  return executarOperacaoGestor_('retomarAssinaturaWeb',dados,function(){
    if(!dados||!dados.registroId)throw Error('Atualize a tela para identificar a assinatura encerrada.');
    const ss=obterPlanilhaGestor_(),sheet=ss.getSheetByName('Lançamentos'),lido=lerAbaCompleta(sheet,COLUNAS_GESTOR_);
    const idx=localizarIndiceSeguro(lido.disp,dados.linhaBase,dados.descOriginal,'','∞/∞');
    if(idx<0||limparApostrofo(lido.disp[idx][6])!=='∞/∞')throw Error('Assinatura não localizada. Atualize a tela.');
    const linhas=indicesMesmaCompra(lido.disp,idx).map(function(i){return lido.raw[i];});
    if(linhas.some(function(r){return serieRecorrenteGestor_(r).invalida;}))throw Error('Confira o controle da recorrência antes de retomar.');
    if(linhas.some(function(r){return !serieRecorrenteGestor_(r).encerrada&&!['Assinatura Cancelada','Pago (Cancelada)'].includes(r[9]);}))throw Error('Esta assinatura ainda está ativa. Edite a assinatura existente.');
    const origem=String(serieRecorrenteGestor_(lido.raw[idx]).origemRetomada||lido.raw[idx][12]);
    if(lido.raw.some(function(r){const info=serieRecorrenteGestor_(r);return limparApostrofo(r[6])==='∞/∞'&&String(info.origemRetomada||r[12])===origem&&!info.encerrada&&!['Assinatura Cancelada','Pago (Cancelada)'].includes(r[9]);}))throw Error('Esta assinatura já foi retomada e está ativa. Edite a retomada existente.');
    const mes=validarMesFaturaWeb_(dados.mesRetorno),m=parseMesFat(mes),limite=dadosRetomadaSerieGestor_(linhas).retomarAPartir;
    if(!limite||m.time<parseMesFat(limite).time)throw Error('Escolha '+(limite||'outro período válido')+' ou um mês posterior. O histórico e as cobranças anteriores serão preservados.');
    const dia=Number(dados.diaCobranca);
    if(!Number.isInteger(dia)||dia<1||dia>31)throw Error('Informe um dia de cobrança entre 1 e 31.');
    const descricao=formatarTituloInteligente(dados.descricao),forma=validarFormaAtualGestor_(dados.formaPagto,{novaCompra:true}),categoria=validarCategoriaAtualGestor_(dados.categoria),valor=centavosGestor_(dados.valorMensal)/100;
    const data=pad2(Math.min(dia,new Date(m.a,m.m,0).getDate()))+'/'+mes;
    validarLancamentoWeb_({dataCompra:data,descricao:descricao,formaPagto:forma,categoria:categoria,valorTotal:valor,isAssinatura:true,numParcelas:1,mesPrimeiraFatura:mes});
    if(lido.disp.some(function(r){return limparApostrofo(r[6])==='∞/∞'&&!serieRecorrenteGestor_(r).encerrada&&!['Assinatura Cancelada','Pago (Cancelada)'].includes(r[9])&&normalizarTexto(r[1])===normalizarTexto(descricao)&&chaveFormaGestor_(r[2])===chaveFormaGestor_(forma);}))throw Error('Já existe uma assinatura ativa com esta descrição e forma de pagamento.');
    const id=gerarIdGestor_(),compraId=gerarIdGestor_();
    const nova=["'"+data,descricao,forma,categoria,'','','∞/∞',valor,"'"+mes,'Assinatura Ativa',lido.raw[idx][10]||'',id,compraId,1,'Em Aberto','','',0];
    definirSerieRecorrenteGestor_(nova,{diaReferencia:dia,encerrada:false,origemRetomada:origem});
    escreverLinhaPlanilha(sheet,Math.max(2,sheet.getLastRow()+1),nova);
    organizarEAtualizarPlanilha(sheet,ss.getSheetByName('Formas de Pagamento'));
    return {sucesso:true,mesRetorno:mes,diaCobranca:dia,registroId:id,compraId:compraId};
  },false);
}
