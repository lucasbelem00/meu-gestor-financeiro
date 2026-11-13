// Catálogo único do contrato de rede. Uma consulta, uma preparação de arquivo
// e uma alteração financeira têm efeitos diferentes e não compartilham diário.
// Fonte incorporada no navegador; o proxy pode importar a mesma lista no Node.
const CATALOGO_ACOES_GESTOR = (() => {
  const mapa = Object.create(null);
  function grupo(tipo, nomes) {
    for (const nome of nomes.split(' ').filter(Boolean)) mapa[nome] = Object.freeze({
      tipo,
      diarioFinanceiro: tipo === 'financeira',
      repetirAutomaticamente: tipo === 'leitura',
      conferirIntegridade: ['financeira', 'temporaria', 'manutencao'].includes(tipo),
      exigeProtocoloAtual: ['financeira', 'temporaria', 'manutencao'].includes(tipo),
      alteraDados: tipo !== 'leitura',
      compartilhar: tipo === 'leitura',
      cacheavel: ['obterRelatorioMes', 'obterRelatorioAnual'].includes(nome)
    });
  }
  grupo('leitura', 'obterRecorrenciasWeb previaPularMesFixoWeb obterPlanejamentoWeb getDadosCompletos obterRelatorioMes obterRelatorioAnual filtrarLancamentosWeb exportarBackupDadosWeb previaRestauracaoBackupWeb obterBackupAnteriorWeb obterAtividadeWeb obterFaturaPagamentoWeb previaEdicaoEmprestimoWeb previaDatasDevolucaoWeb previaPagamentoFaturaWeb previaAntecipacaoWeb consultarOperacaoWeb diagnosticarPendenciasWeb previaRecuperacaoOperacaoWeb previaRachadinhaWeb obterStatusProtecaoWeb previaManutencaoProtegidaWeb obterEmprestimosArquivadosWeb obterPartesImportacaoBackupWeb listarCopiasRestauracaoWeb obterParteCopiaRestauracaoWeb');
  grupo('temporaria', 'prepararExportacaoBackupWeb iniciarImportacaoBackupWeb enviarPartesBackupWeb concluirImportacaoBackupWeb descartarImportacaoBackupWeb');
  grupo('manutencao', 'ativarProtecaoAutomaticaWeb executarBackupProtegidoWeb executarManutencaoProtegidaWeb ativarOrganizacaoAnualWeb');
  grupo('controle', 'cancelarOperacaoWeb concluirRecuperacaoOperacaoWeb');
  grupo('financeira', 'salvarLimitePessoalWeb salvarRecorrenciaWeb confirmarMesRecorrenciaWeb retomarAssinaturaWeb pularMesFixoWeb salvarPlanejamentoWeb registrarRachadinhaWeb salvarLancamentoWeb sincronizarLoteWeb editarLancamentoLinhaWeb excluirLancamentoWeb adiantarParcelasWeb quitarFaturaWeb salvarNotasWeb salvarEmprestimoWeb alternarStatusEmprestimoWeb excluirEmprestimoWeb editarEmprestimoLinhaWeb dividirParcelaEmprestimoWeb moverParaEmprestimosWeb moverParaGastosPessoaisWeb editarAssinaturaWeb cancelarAssinaturaWeb salvarFormaPagamentoWeb reordenarFormasPagamentoWeb excluirFormaPagamentoWeb salvarCategoriasWeb restaurarBackupDadosWeb desfazerAtividadeWeb registrarPagamentoFaturaWeb');
  return Object.freeze(mapa);
})();
function metadadosAcaoGestor(acao) {
  const meta = CATALOGO_ACOES_GESTOR[acao];
  if (!meta) throw new Error('Ação não reconhecida nesta versão do aplicativo. Atualize a página antes de continuar.');
  return meta;
}
function protocoloMinimoAcaoGestor(acao,param){
  const meta=metadadosAcaoGestor(acao);
  const escopo=['previaEdicaoEmprestimoWeb','editarEmprestimoLinhaWeb'].includes(acao)&&param?.escopoValorParcelas!==undefined;
  const pacote=['previaRachadinhaWeb','registrarRachadinhaWeb','previaRecuperacaoOperacaoWeb','concluirRecuperacaoOperacaoWeb'].includes(acao);
  return Math.max(meta.exigeProtocoloAtual?15:0,escopo?17:0,meta.diarioFinanceiro?5:0,pacote?6:0,['editarLancamentoLinhaWeb','editarEmprestimoLinhaWeb','editarAssinaturaWeb'].includes(acao)?7:0);
}
function acoesDoTipoGestor(tipo) {
  return Object.keys(CATALOGO_ACOES_GESTOR).filter(acao => CATALOGO_ACOES_GESTOR[acao].tipo === tipo);
}
if (typeof module !== 'undefined' && module.exports) module.exports = { CATALOGO_ACOES_GESTOR, metadadosAcaoGestor, acoesDoTipoGestor, protocoloMinimoAcaoGestor };
