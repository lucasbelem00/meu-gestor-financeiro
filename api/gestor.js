const ACAO_PERMITIDA = new Set([
  'getDadosCompletos', 'salvarLancamentoWeb', 'sincronizarLoteWeb',
  'editarLancamentoLinhaWeb', 'excluirLancamentoWeb', 'adiantarParcelasWeb',
  'quitarFaturaWeb', 'salvarNotasWeb', 'salvarEmprestimoWeb',
  'alternarStatusEmprestimoWeb', 'excluirEmprestimoWeb', 'editarEmprestimoLinhaWeb',
  'dividirParcelaEmprestimoWeb', 'moverParaEmprestimosWeb', 'moverParaGastosPessoaisWeb',
  'editarAssinaturaWeb', 'cancelarAssinaturaWeb', 'salvarFormaPagamentoWeb',
  'reordenarFormasPagamentoWeb', 'excluirFormaPagamentoWeb', 'salvarCategoriasWeb',
  'obterRelatorioMes', 'obterRelatorioAnual', 'filtrarLancamentosWeb'
]);

module.exports = async function gestor(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

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
  try {
    if (typeof payload === 'string') payload = JSON.parse(payload);
    if (!payload || typeof payload !== 'object' || !ACAO_PERMITIDA.has(payload.action)) {
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
    let dados;
    try { dados = JSON.parse(texto); } catch (_) {
      return res.status(502).json({ sucesso: false, erro: 'Resposta inválida do serviço de dados.' });
    }
    return res.status(resposta.ok ? 200 : 502).json(dados);
  } catch (_) {
    return res.status(502).json({ sucesso: false, erro: 'Não foi possível conectar ao serviço de dados.' });
  }
};
