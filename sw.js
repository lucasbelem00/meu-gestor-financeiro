const CACHE_NAME = 'gestor-gastos-v68';

async function buscarManifestoAtualGestor(request){
  const controlador=new AbortController(),prazo=setTimeout(()=>controlador.abort(),8000);
  try{
    const resposta=await fetch(request,{cache:'no-cache',signal:controlador.signal});
    if(resposta.ok&&!resposta.redirected&&(resposta.headers.get('content-type')||'').includes('json')){
      const manifesto=await resposta.clone().json();
      if(typeof manifesto.name==='string'&&Array.isArray(manifesto.icons)&&manifesto.icons.length){
        try{const cache=await caches.open(CACHE_NAME);await cache.put(request,resposta.clone());}catch(_){}
        return resposta;
      }
    }
  }catch(_){}finally{clearTimeout(prazo);}
  return (await caches.match(request))||Response.error();
}

function ehEnderecoInicialGestor(url){return url.origin===self.location.origin&&['/','/index.html'].includes(url.pathname);}
async function buscarCopiaPaginaGestor(request){
  const exata=await caches.match(request);if(exata&&await ehPaginaDoGestor(exata))return exata;
  if(ehEnderecoInicialGestor(new URL(request.url))){
    const raiz=await caches.match(new Request(new URL('/',self.location.origin).href));
    if(raiz&&await ehPaginaDoGestor(raiz))return raiz;
  }
  return null;
}
async function navegarPaginaGestor(request,event){
  const controlador=new AbortController();
  const limiteRede=setTimeout(()=>controlador.abort(),8000);
  const rede=(async()=>{
    try{
      const resposta=await fetch(request,{signal:controlador.signal}),url=new URL(request.url);
      const mesmaOrigem=!resposta.url||new URL(resposta.url).origin===url.origin;
      if(mesmaOrigem&&await ehPaginaDoGestor(resposta)){
        try{const cache=await caches.open(CACHE_NAME);await cache.put(request,resposta.clone());if(ehEnderecoInicialGestor(url)&&url.href!==new URL('/',self.location.origin).href)await cache.put(new Request(new URL('/',self.location.origin).href),resposta.clone());}catch(_){}
        return resposta;
      }
      return (await buscarCopiaPaginaGestor(request))||resposta;
    }catch(_){return null;}finally{clearTimeout(limiteRede);}
  })();
  // A atualização tem seu próprio prazo. A cópia local não precisa aguardar
  // esse prazo inteiro para abrir, e a API privada continua fora do cache.
  if(event.waitUntil)event.waitUntil(rede.then(()=>{}));
  let prazoAbertura;const resposta=await Promise.race([rede,new Promise(resolve=>{prazoAbertura=setTimeout(()=>resolve(null),3500);})]);clearTimeout(prazoAbertura);
  const copia=resposta?null:await buscarCopiaPaginaGestor(request);
  return resposta||copia||(await rede)||new Response('Não foi possível abrir a cópia offline. Conecte-se à internet e aguarde o carregamento completo do app.',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}});
}

async function ehPaginaDoGestor(resposta) {
  if (!resposta.ok || resposta.redirected || !(resposta.headers.get('content-type') || '').includes('text/html')) return false;
  try {
    const html = await resposta.clone().text();
    return html.includes('id="formLancamento"') && html.includes('id="view-dashboard"');
  } catch (_) { return false; }
}

async function prepararPaginaInicialGestor(cache) {
  const controlador = new AbortController();
  const prazo = setTimeout(() => controlador.abort(), 8000);
  try {
    const pedido = new Request(new URL('/', self.location.origin).href, { credentials: 'same-origin', cache: 'reload' });
    const resposta = await fetch(pedido, { signal: controlador.signal });
    const mesmaOrigem = !resposta.url || new URL(resposta.url).origin === self.location.origin;
    if (mesmaOrigem && await ehPaginaDoGestor(resposta)) await cache.put(pedido, resposta);
  } catch (_) {
    // Uma falha de rede não apaga a versão offline anterior nem impede a ativação.
  } finally { clearTimeout(prazo); }
}

// Instalação do Service Worker
self.addEventListener('install', event => {
  self.skipWaiting();
});

// Ativação e limpeza imediata de caches antigas
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    // Preserva o app offline durante a troca de versão, antes da próxima navegação.
    const atual = await caches.open(CACHE_NAME);
    for (const nome of await caches.keys()) {
      if (!nome.startsWith('gestor-gastos-') || nome === CACHE_NAME) continue;
      try {
        const anterior = await caches.open(nome);
        for (const request of await anterior.keys()) {
          if (await atual.match(request)) continue;
          const resposta = await anterior.match(request);
          const endereco = new URL(request.url);
          const pagina = request.mode === 'navigate' || endereco.pathname === '/' || endereco.pathname.endsWith('.html');
          if (pagina && resposta && !(await ehPaginaDoGestor(resposta))) continue;
          if (resposta && (resposta.ok || resposta.type === 'opaque')) await atual.put(request, resposta);
        }
        await caches.delete(nome);
      } catch (erro) { /* Mantém a cache anterior se a transferência não puder ser concluída. */ }
    }
    // A primeira navegação aconteceu antes do registro do worker. Preparar o HTML
    // aqui permite reabrir offline sem exigir uma segunda visita com internet.
    await prepararPaginaInicialGestor(atual);
    await self.clients.claim();
  })());
});

// Estratégia Inteligente: Rede primeiro para o HTML (Garante atualizações instantâneas)
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Requisições de gravação e a API privada nunca entram no cache offline.
  if (event.request.method !== 'GET' || (url.origin === self.location.origin && url.pathname.startsWith('/api/'))) {
    return;
  }

  // Deixa as chamadas à API do Google Apps Script passarem direto sem cache
  if (url.hostname === 'script.google.com' || url.hostname === 'script.googleusercontent.com') {
    return;
  }

  // A identidade instalada precisa receber o manifesto novo, mesmo com cache antigo.
  if(url.origin===self.location.origin&&url.pathname==='/manifest.json'){
    event.respondWith(buscarManifestoAtualGestor(event.request));return;
  }

  // Para o HTML / Página principal: Tenta a rede primeiro; se falhar (offline), usa a cache
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(navegarPaginaGestor(event.request,event));
    return;
  }

  // Para outros recursos estáticos (CDNs, fontes, etc.): Cache primeiro, depois rede
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).then(async networkResponse => {
        if (networkResponse.ok || networkResponse.type === 'opaque') {
          try { const cache = await caches.open(CACHE_NAME); await cache.put(event.request, networkResponse.clone()); }
          catch (erro) { /* A rede continua utilizável se o cache estiver cheio. */ }
        }
        return networkResponse;
      });
    }).catch(() => Response.error())
  );
});
