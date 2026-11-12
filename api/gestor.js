const { CATALOGO_ACOES_GESTOR } = require('../shared/acoes.js');
const ACAO_PERMITIDA = new Set(Object.keys(CATALOGO_ACOES_GESTOR));

module.exports = async function gestor(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Preview e Production exigem Vercel Authentication em All Deployments.
  // O destino e o token são próprios de cada ambiente e ficam no servidor.
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

    const r=payload.diagnostico;
    const diagnostico=r?.versao===1&&typeof r.chamada==='string'&&typeof r.pagina==='string'&&/^[a-f0-9]{32}$/.test(r.chamada)&&/^[a-f0-9]{32}$/.test(r.pagina)?{versao:1,chamada:r.chamada,pagina:r.pagina}:undefined;
    if(diagnostico){res.setHeader('X-Gestor-Chamada',diagnostico.chamada);res.setHeader('X-Gestor-Pagina',diagnostico.pagina);}
    const resposta = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: payload.action, param: payload.param ?? null, apiToken: token, ...(diagnostico?{diagnostico}:{}) }),
      redirect: 'follow',
      signal: AbortSignal.timeout(55000)
    });
    const cabecalhosMs=Math.max(0,Date.now()-inicio),inicioCorpo=Date.now();
    const texto = await resposta.text();
    const corpoMs=Math.max(0,Date.now()-inicioCorpo);
    if(Number.isInteger(resposta.status))res.setHeader('X-Gestor-Upstream-Status',String(resposta.status));
    res.setHeader('X-Gestor-Response-Bytes',String(Buffer.byteLength(texto,'utf8')));
    res.setHeader('X-Gestor-Tempos',JSON.stringify({cabecalhosMs,corpoMs}));
    res.setHeader('Server-Timing', 'upstream;dur=' + Math.max(0,Date.now()-inicio));
    let dados;
    try { dados = JSON.parse(texto); } catch (_) {
      res.setHeader('X-Gestor-Proxy-Codigo','RESPOSTA_INVALIDA');
      return res.status(502).json({ sucesso: false, codigo: 'RESPOSTA_INVALIDA', erro: 'Resposta inválida do serviço de dados.' });
    }
    if(!resposta.ok)res.setHeader('X-Gestor-Proxy-Codigo','HTTP_GOOGLE');
    return res.status(resposta.ok ? 200 : 502).json(dados);
  } catch (erro) {
    res.setHeader('Server-Timing', 'upstream;dur=' + Math.max(0,Date.now()-inicio));
    res.setHeader('X-Gestor-Proxy-Codigo',erro && (erro.name==='TimeoutError'||erro.name==='AbortError')?'TIMEOUT_PROXY':'FALHA_CONEXAO');
    if (erro && (erro.name === 'TimeoutError' || erro.name === 'AbortError')) return res.status(504).json({ sucesso: false, codigo: 'TIMEOUT_PROXY', erro: 'O serviço de dados demorou demais para responder.' });
    return res.status(502).json({ sucesso: false, codigo: 'FALHA_CONEXAO', erro: 'Não foi possível conectar ao serviço de dados.' });
  }
};
