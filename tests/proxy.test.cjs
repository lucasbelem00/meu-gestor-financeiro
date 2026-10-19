const { test } = require('node:test');
const assert = require('node:assert/strict');
const gestor = require('../api/gestor.js');

// Todos os endereços, tokens e respostas deste teste são fictícios.
async function chamar({ body = { action: 'getDadosCompletos' }, method = 'POST', env = {}, upstream } = {}) {
  const anteriores = { ...process.env }, fetchAnterior = global.fetch;
  const chamadas = [];
  Object.assign(process.env, { VERCEL_ENV: 'preview', GESTOR_API_URL: 'https://script.google.com/macros/s/FAKE_TEST/exec', GESTOR_API_TOKEN: 'token-ficticio', ...env });
  global.fetch = async (url, opcoes) => { chamadas.push({ url: String(url), ...opcoes }); if(upstream instanceof Error)throw upstream; return upstream || { ok: true, text: async () => JSON.stringify({ sucesso: true, dados: { exemplo: 1 } }) }; };
  const resposta = { headers: {}, statusCode: 200, setHeader(k, v) { this.headers[k] = v; }, status(n) { this.statusCode = n; return this; }, json(v) { this.body = v; return this; } };
  try { await gestor({ method, body }, resposta); return { ...resposta, chamadas }; }
  finally { global.fetch = fetchAnterior; for (const k of Object.keys(process.env)) if (!(k in anteriores)) delete process.env[k]; Object.assign(process.env, anteriores); }
}

test('produção bloqueia acesso à API antes de consultar o backend', async () => {
  const r = await chamar({ env: { VERCEL_ENV: 'production' } }); assert.equal(r.statusCode, 404); assert.equal(r.chamadas.length, 0);
});
test('aceita somente POST', async () => {
  const r = await chamar({ method: 'GET' }); assert.equal(r.statusCode, 405); assert.equal(r.headers.Allow, 'POST'); assert.equal(r.chamadas.length, 0);
});
test('configuração ausente ou destino externo não recebe o token', async () => {
  for (const env of [{ GESTOR_API_TOKEN: '' }, { GESTOR_API_URL: 'https://example.invalid/exec' }]) {
    const r = await chamar({ env }); assert.equal(r.statusCode, 503); assert.equal(r.chamadas.length, 0);
  }
});
test('JSON quebrado, array e ação não permitida são rejeitados', async () => {
  for (const body of ['{"action":', [], { action: 'apagarTudo' }]) {
    const r = await chamar({ body }); assert.equal(r.statusCode, 400); assert.equal(r.chamadas.length, 0);
  }
});
test('limite de payload impede encaminhar lotes excessivos', async () => {
  const r = await chamar({ body: { action: 'salvarNotasWeb', param: { texto: 'a'.repeat(1024 * 1024) } } });
  assert.equal(r.statusCode, 413); assert.equal(r.chamadas.length, 0);
});
test('proxy preserva requestId e usa exclusivamente o token do servidor', async () => {
  const r = await chamar({ body: { action: 'salvarEmprestimoWeb', param: { requestId: 'operacao-teste-001', valorTotal: 120 }, apiToken: 'token-do-cliente' } });
  assert.equal(r.statusCode, 200); assert.deepEqual(r.body, { sucesso: true, dados: { exemplo: 1 } });
  const enviado = JSON.parse(r.chamadas[0].body);
  assert.equal(enviado.param.requestId, 'operacao-teste-001'); assert.equal(enviado.apiToken, 'token-ficticio');
  assert.equal(r.headers['Cache-Control'], 'no-store, max-age=0'); assert.equal(r.headers['X-Content-Type-Options'], 'nosniff');
});
test('HTML de erro ou autenticação não é devolvido como sucesso JSON', async () => {
  const r = await chamar({ upstream: { ok: true, text: async () => '<html>Login fictício</html>' } }); assert.equal(r.statusCode, 502); assert.equal(r.body.sucesso, false);
});
test('falha HTTP no backend é sinalizada ao app', async () => {
  const r = await chamar({ upstream: { ok: false, text: async () => JSON.stringify({ sucesso: false, erro: 'falha fictícia' }) } }); assert.equal(r.statusCode, 502);
});

test('proxy informa duração técnica sem expor destino ou token',async()=>{const r=await chamar();assert.match(r.headers['Server-Timing'],/^upstream;dur=\d+$/);assert(!r.headers['Server-Timing'].includes('token'));});

test('timeout do serviço recebe código próprio em vez de erro genérico',async()=>{const e=Error('timeout');e.name='TimeoutError';const r=await chamar({upstream:e});assert.equal(r.statusCode,504);assert.equal(r.body.sucesso,false);});
