// Nome do Service Worker
self.addEventListener('install', function(event) {
    event.waitUntil(
      caches.open('meu-app-cache')
        .then(function(cache) {
          return cache.addAll([
            './',
            './index.html',
            './cards.html',
            './tables.html',
            './src/styles/index.css',
            './src/styles/cards.css',
            './src/styles/root.css',
            './src/styles/style.css',

            './src/scripts/cards.js',
            './src/scripts/tables.js',
            './img/icon.jpg',
            './img/tl.png',
          ]);
        })
    );
  });
  
  // Interceptação de requisições de rede
  self.addEventListener('fetch', function(event) {
    event.respondWith(
      caches.match(event.request)
        .then(function(response) {
          if (response) {
            // Retorna o recurso do cache se disponível
            return response;
          }
          return fetch(event.request)
            .then(function(response) {
              // Armazena o novo recurso no cache
              let armaz = response.clone()
              caches.open('meu-app-cache')
                .then(function(cache) {
                  cache.put(event.request, armaz);
                });
              return response;
            });
        })
    );
  });
  
  // Notificação quando o Service Worker for atualizado
  self.addEventListener('activate', function(event) {
    event.waitUntil(
      caches.keys()
        .then(function(cacheNames) {
          return Promise.all(
            cacheNames.map(function(cacheName) {
              if (cacheName !== 'meu-app-cache') {
                // Exclui caches antigos
                return caches.delete(cacheName);
              }
            })
          );
        })
    );
  });
  