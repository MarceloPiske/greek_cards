self.addEventListener('install', function(event) {
    event.waitUntil(
      caches.open('meu-app-cache')
        .then(function(cache) {
          return buscarArquivosRecursivamente('/')
            .then(function(arquivos) {
              return cache.addAll(arquivos);
            });
        })
    );
  });
  
  // Função para buscar arquivos recursivamente
  async function buscarArquivosRecursivamente(caminho) {
    const arquivos = [];
    const diretorio = await caches.open('/');
    const response = await diretorio.head(caminho);
  
    if (response.ok) {
      if (response.headers.get('content-type').startsWith('text/')) {
        arquivos.push(caminho);
      }
  
      const subdiretorios = await response.text();
      for (const subdiretorio of subdiretorios.split('\n')) {
        if (subdiretorio.trim()) {
          const subcaminho = `${caminho}${subdiretorio}/`;
          const subarquivos = await buscarArquivosRecursivamente(subcaminho);
          arquivos.push(...subarquivos);
        }
      }
    }
  
    return arquivos;
  }