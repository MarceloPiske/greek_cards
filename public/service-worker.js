// Nome do Service Worker
const CACHE_NAME = 'site-cache-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './src/html/cards.html',
  './src/html/tables.html',
  './src/styles/index.css',
  './src/styles/cards.css',
  './src/styles/root.css',
  './src/styles/style.css',

  './src/scripts/cards.js',
  './src/scripts/tables.js',

  './img/icon.jpg',
  './img/tl.png',

  './src/html/conteudo/genitivo_absoluto/genitivo_absoluto.html',
  './src/html/conteudo/modo_optativo/modo_optativo_morfologia.html',
  './src/html/conteudo/modo_optativo/modo_optativo_sintaxe.html',
  './src/html/conteudo/subjuntivo/subjuntivo_morfologia.html',
  './src/html/conteudo/subjuntivo/subjuntivo_sintaxe.html',
  './src/html/conteudo/participio/participio_morfologia.html',
  './src/html/conteudo/participio/participio_sintaxe.html',
  './src/html/conteudo/oracoes_condicionais/oracoes_condicionais.html'
];

// Evento 'install' – adiciona arquivos ao cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Arquivos em cache');
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
});

// Evento 'fetch' – serve arquivos do cache e tenta atualizar em segundo plano
self.addEventListener('fetch', event => {
  event.respondWith(
      caches.match(event.request).then(cachedResponse => {
          const fetchPromise = fetch(event.request).then(networkResponse => {
              // Se a resposta da rede for válida, atualiza o cache
              if (networkResponse && networkResponse.status === 200) {
                  const responseClone = networkResponse.clone();  // Clona a resposta da rede
                  caches.open(CACHE_NAME).then(cache => {
                      cache.put(event.request, responseClone);
                  });
              }
              return networkResponse;
          }).catch(() => {
              // Em caso de falha na rede, retorna o cache (offline)
              return cachedResponse;
          });

          // Retorna o cache, mas também tenta atualizar em segundo plano
          return cachedResponse || fetchPromise;
      })
  );
});

// Evento 'activate' – remove caches antigos
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});