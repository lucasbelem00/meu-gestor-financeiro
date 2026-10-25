const ACAO_PERMITIDA = new Set([
  'ativarProtecaoAutomaticaWeb','obterStatusProtecaoWeb','executarBackupProtegidoWeb','previaManutencaoProtegidaWeb','executarManutencaoProtegidaWeb','obterEmprestimosArquivadosWeb',
  'previaRecuperacaoOperacaoWeb', 'concluirRecuperacaoOperacaoWeb', 'previaRachadinhaWeb', 'registrarRachadinhaWeb',
  'cancelarOperacaoWeb', 'previaPagamentoFaturaWeb',
  'previaAntecipacaoWeb', 'consultarOperacaoWeb', 'diagnosticarPendenciasWeb',
  'getDadosCompletos', 'salvarLancamentoWeb', 'sincronizarLoteWeb',
  'editarLancamentoLinhaWeb', 'excluirLancamentoWeb', 'adiantarParcelasWeb',
  'quitarFaturaWeb', 'salvarNotasWeb', 'salvarEmprestimoWeb',
  'alternarStatusEmprestimoWeb', 'excluirEmprestimoWeb', 'editarEmprestimoLinhaWeb',
  'dividirParcelaEmprestimoWeb', 'moverParaEmprestimosWeb', 'moverParaGastosPessoaisWeb',
  'editarAssinaturaWeb', 'cancelarAssinaturaWeb', 'salvarFormaPagamentoWeb',
  'reordenarFormasPagamentoWeb', 'excluirFormaPagamentoWeb', 'salvarCategoriasWeb',
  'obterRelatorioMes', 'obterRelatorioAnual', 'filtrarLancamentosWeb',
  'previaRestauracaoBackupWeb', 'restaurarBackupDadosWeb', 'obterBackupAnteriorWeb',
  'listarCopiasRestauracaoWeb','obterParteCopiaRestauracaoWeb','iniciarImportacaoBackupWeb',
  'enviarPartesBackupWeb','concluirImportacaoBackupWeb','descartarImportacaoBackupWeb',
  'prepararExportacaoBackupWeb','obterPartesImportacaoBackupWeb',
  'exportarBackupDadosWeb', 'obterAtividadeWeb', 'desfazerAtividadeWeb',
  'obterFaturaPagamentoWeb', 'registrarPagamentoFaturaWeb'
]);

module.exports = async function gestor(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // O plano gratuito protege os endereços de Preview com Vercel Authentication.
  // Mantemos o endereço de produção sem acesso à planilha.
  if (process.env.VERCEL_ENV === 'production') {
    return res.status(404).json({ sucesso: false, erro: 'Serviço indisponível.' });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ sucesso: false, erro: 'Método não permitido.' });
  }

  const destino = process.env.GESTOR_API_URL || '';
  const token = process.env.GESTOR_API_TOKEN || '';
  let url;
  try { url = new URL(destino); } catch (_) {}
  if (!token || !url || url.protocol !== 'https:' || url.hostname !== 'script.google.com' || !/\/macros\/s\/[^/]+\/exec\/?$/.test(url.pathname)) {
    return res.status(503).json({ sucesso: false, erro: 'A API ainda não foi configurada.' });
  }

  let payload = req.body;
  // Rejeita pedidos malformados antes de encaminhar uma operação à planilha.
  try {
    const serializado = typeof payload === 'string' ? payload : JSON.stringify(payload);
    if (!serializado || Buffer.byteLength(serializado, 'utf8') > 1024 * 1024) {
      return res.status(413).json({ sucesso: false, erro: 'Envio muito grande. Sincronize em lotes menores.' });
    }
    if (typeof payload === 'string') payload = JSON.parse(payload);
  } catch (_) {
    return res.status(400).json({ sucesso: false, erro: 'Solicitação inválida.' });
  }
  const inicio = Date.now();
  try {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload) || !ACAO_PERMITIDA.has(payload.action)) {
      return res.status(400).json({ sucesso: false, erro: 'Solicitação inválida.' });
    }

    const resposta = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: payload.action, param: payload.param ?? null, apiToken: token }),
      redirect: 'follow',
      signal: AbortSignal.timeout(55000)
    });
    const texto = await resposta.text();
    res.setHeader('Server-Timing', 'upstream;dur=' + Math.max(0,Date.now()-inicio));
    let dados;
    try { dados = JSON.parse(texto); } catch (_) {
      return res.status(502).json({ sucesso: false, codigo: 'RESPOSTA_INVALIDA', erro: 'Resposta inválida do serviço de dados.' });
    }
    return res.status(resposta.ok ? 200 : 502).json(dados);
  } catch (erro) {
    res.setHeader('Server-Timing', 'upstream;dur=' + Math.max(0,Date.now()-inicio));
    if (erro && (erro.name === 'TimeoutError' || erro.name === 'AbortError')) return res.status(504).json({ sucesso: false, codigo: 'TIMEOUT_PROXY', erro: 'O serviço de dados demorou demais para responder.' });
    return res.status(502).json({ sucesso: false, codigo: 'FALHA_CONEXAO', erro: 'Não foi possível conectar ao serviço de dados.' });
  }
};
