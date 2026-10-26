const CACHE_NAME = 'gestor-gastos-v45';

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

  // Para o HTML / Página principal: Tenta a rede primeiro; se falhar (offline), usa a cache
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(
      fetch(event.request)
        .then(async response => {
          // Erros temporários e páginas de login nunca substituem o app salvo.
          const mesmaOrigem = !response.url || new URL(response.url).origin === url.origin;
          if (!mesmaOrigem || !(await ehPaginaDoGestor(response))) {
            return (await caches.match(event.request)) || response;
          }
          try { const cache = await caches.open(CACHE_NAME); await cache.put(event.request, response.clone()); }
          catch (erro) { /* Falha de armazenamento não impede a abertura pela rede. */ }
          return response;
        })
        .catch(async () => (await caches.match(event.request)) || new Response('Não foi possível abrir a cópia offline. Conecte-se à internet e aguarde o carregamento completo do app.', { status: 503, headers: { 'Content-Type': 'text/plain;charset=utf-8' } }))
    );
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
