const CACHE_NAME = 'gestor-gastos-v11';

// Instalação do Service Worker
self.addEventListener('install', event => {
  self.skipWaiting();
});

// Ativação e limpeza imediata de caches antigas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Estratégia Inteligente: Rede primeiro para o HTML (Garante atualizações instantâneas)
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Deixa as chamadas à API do Google Apps Script passarem direto sem cache
  if (url.origin.includes('script.google.com')) {
    return;
  }

  // Para o HTML / Página principal: Tenta a rede primeiro; se falhar (offline), usa a cache
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, response.clone());
            return response;
          });
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Para outros recursos estáticos (CDNs, fontes, etc.): Cache primeiro, depois rede
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).then(networkResponse => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      });
    }).catch(() => {})
  );
});
