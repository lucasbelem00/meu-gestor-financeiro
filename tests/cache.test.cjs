const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const fonte = fs.readFileSync(path.resolve(__dirname, '../sw.js'), 'utf8');
const htmlApp = '<html><form id="formLancamento"></form><div id="view-dashboard"></div></html>';
const pagina = (body = htmlApp, status = 200) => new Response(body, { status, headers: { 'Content-Type': 'text/html' } });
function ambiente(fetchFalso, inicial, extras={}) {
  const handlers = {}, itens = new Map();
  if (inicial) itens.set('https://app.test/', inicial);
  const cache = { match: async request => itens.get(request.url)?.clone(), put: async (request, resposta) => itens.set(request.url, resposta.clone()), keys: async () => [...itens.keys()].map(url => ({ url, mode: 'navigate' })) };
  const caches = { open: async () => cache, match: cache.match, keys: async () => [], delete: async () => true };
  const ctx = vm.createContext({ URL, Response, Request, AbortController, setTimeout, clearTimeout, ...extras, caches, fetch: fetchFalso, self: { location: { origin: 'https://app.test' }, addEventListener: (n, f) => { handlers[n] = f; }, clients: { claim() {} }, skipWaiting() {} } });
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

test('parâmetros na página inicial e index.html usam a cópia canônica offline',async()=>{
 const a=ambiente(async()=>{throw Error('offline');},pagina());for(const url of ['https://app.test/?origem=atalho','https://app.test/index.html?origem=atalho'])assert.equal(await(await a.carregar({url})).text(),htmlApp);
 assert.equal((await a.carregar({url:'https://app.test/outra.html?origem=atalho'})).status,503);
});
test('rede presa devolve a cópia local no prazo e uma resposta posterior atualiza o cache',async()=>{
 const tarefas=new Map();let n=0,resolver;const a=ambiente(()=>new Promise(r=>resolver=r),pagina(),{setTimeout:(fn,ms)=>{tarefas.set(++n,{fn,ms});return n;},clearTimeout:id=>tarefas.delete(id)});
 const p=a.carregar();await new Promise(r=>setImmediate(r));const prazo=[...tarefas.values()].find(t=>t.ms===3500);assert(prazo);prazo.fn();assert.equal(await(await p).text(),htmlApp);
 resolver(pagina(htmlApp+'<!-- atualização -->'));await new Promise(r=>setImmediate(r));assert.match(await a.itens.get('https://app.test/').clone().text(),/atualização/);assert.equal(tarefas.size,0);
});
test('sem cópia espera o prazo da rede antes de mostrar erro',async()=>{
 const tarefas=new Map();let n=0,terminou=false;const a=ambiente((_req,{signal})=>new Promise((_r,reject)=>signal.addEventListener('abort',()=>reject(Error('prazo')))),null,{setTimeout:(fn,ms)=>{tarefas.set(++n,{fn,ms});return n;},clearTimeout:id=>tarefas.delete(id)});
 const p=a.carregar().then(r=>{terminou=true;return r;});await new Promise(r=>setImmediate(r));[...tarefas.values()].find(t=>t.ms===3500).fn();await new Promise(r=>setImmediate(r));assert.equal(terminou,false);[...tarefas.values()].find(t=>t.ms===8000).fn();assert.equal((await p).status,503);
});
test('resposta válida lenta abre sem cache e sem repetir a requisição',async()=>{
 const tarefas=new Map();let n=0,resolver,chamadas=0;const a=ambiente(()=>{chamadas++;return new Promise(r=>resolver=r);},null,{setTimeout:(fn,ms)=>{tarefas.set(++n,{fn,ms});return n;},clearTimeout:id=>tarefas.delete(id)});
 const p=a.carregar();await new Promise(r=>setImmediate(r));[...tarefas.values()].find(t=>t.ms===3500).fn();await new Promise(r=>setImmediate(r));resolver(pagina());const r=await p;assert.equal(r.status,200);assert.equal(await r.text(),htmlApp);assert.equal(chamadas,1);
});
test('uma página inicial com parâmetros atualiza também a cópia canônica',async()=>{
 const novo=htmlApp+'<!-- versão atual -->',a=ambiente(async()=>pagina(novo),pagina());await a.carregar({url:'https://app.test/?origem=atalho'});assert.equal(await a.itens.get('https://app.test/').clone().text(),novo);
});
