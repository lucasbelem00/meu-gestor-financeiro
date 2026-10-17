const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const fonte = fs.readFileSync(path.resolve(__dirname, '../sw.js'), 'utf8');
const htmlApp = '<html><form id="formLancamento"></form><div id="view-dashboard"></div></html>';
const pagina = (body = htmlApp, status = 200) => new Response(body, { status, headers: { 'Content-Type': 'text/html' } });
function ambiente(fetchFalso, inicial) {
  const handlers = {}, itens = new Map();
  if (inicial) itens.set('https://app.test/', inicial);
  const cache = { match: async request => itens.get(request.url)?.clone(), put: async (request, resposta) => itens.set(request.url, resposta.clone()), keys: async () => [...itens.keys()].map(url => ({ url, mode: 'navigate' })) };
  const caches = { open: async () => cache, match: cache.match, keys: async () => [], delete: async () => true };
  const ctx = vm.createContext({ URL, Response, caches, fetch: fetchFalso, self: { location: { origin: 'https://app.test' }, addEventListener: (n, f) => { handlers[n] = f; }, clients: { claim() {} }, skipWaiting() {} } });
  vm.runInContext(fonte, ctx);
  return { itens, cache, async carregar(extra = {}) { let resposta; handlers.fetch({ request: { url: 'https://app.test/', mode: 'navigate', method: 'GET', ...extra }, respondWith: p => { resposta = p; } }); return resposta; } };
}
test('503 preserva a página boa disponível offline', async () => {
  let offline = false;
  const a = ambiente(async () => { if (offline) throw Error('offline'); return pagina('Erro temporário', 503); }, pagina());
  assert.equal(await (await a.carregar()).text(), htmlApp); offline = true;
  assert.equal(await (await a.carregar()).text(), htmlApp);
});
test('HTML 200 de login ou manutenção não substitui o app', async () => {
  const a = ambiente(async () => pagina('<html>Login ou manutenção</html>'), pagina());
  assert.equal(await (await a.carregar()).text(), htmlApp); assert.equal(await a.itens.get('https://app.test/').clone().text(), htmlApp);
});
test('HTML válido da nova versão pode atualizar o cache', async () => {
  const novo = htmlApp + '<!-- nova versão -->'; const a = ambiente(async () => pagina(novo), pagina());
  assert.equal(await (await a.carregar()).text(), novo); assert.equal(await a.itens.get('https://app.test/').clone().text(), novo);
});
test('quota de armazenamento não impede receber a página online', async () => {
  const a = ambiente(async () => pagina()); a.cache.put = async () => { throw Error('quota'); };
  assert.equal(await (await a.carregar()).text(), htmlApp);
});
test('gravações e consultas da API nunca entram no cache', async () => {
  const a = ambiente(async () => { throw Error('não deveria interceptar'); });
  assert.equal(await a.carregar({ method: 'POST' }), undefined);
  assert.equal(await a.carregar({ url: 'https://app.test/api/gestor' }), undefined);
});
test('sem cache e sem rede responde com mensagem clara', async () => {
  const a = ambiente(async () => { throw Error('offline'); }); const r = await a.carregar();
  assert.equal(r.status, 503); assert((await r.text()).includes('internet'));
});
