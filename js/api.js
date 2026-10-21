/* ============================================================
   EconomizaLeitor — Camada de acesso a dados
   APIs públicas: Google Books (principal) + Open Library (fallback)
   Preços: adapter isolado (js/precos.js)
   ============================================================ */

window.ECONOMIZALEITOR = window.ECONOMIZALEITOR || {};

(function (ns) {
  'use strict';

  var GOOGLE = 'https://www.googleapis.com/books/v1/volumes';
  var OPENLIB = 'https://openlibrary.org';
  var CACHE_PREFIX = 'economizaleitor:cache:';
  var CACHE_TTL = 1000 * 60 * 60 * 12; /* 12h */
  var TIMEOUT_MS = 12000;

  /* Status dos provedores na sessão. */
  var googleDisponivel = true;
  var googleAviso = '';

  /* ---------- cache ---------- */

  function lerCache(chave) {
    try {
      var bruto = localStorage.getItem(CACHE_PREFIX + chave);
      if (!bruto) return null;
      var item = JSON.parse(bruto);
      if (Date.now() - item.t > CACHE_TTL) {
        localStorage.removeItem(CACHE_PREFIX + chave);
        return null;
      }
      return item.v;
    } catch (e) {
      return null;
    }
  }

  function gravarCache(chave, valor) {
    try {
      localStorage.setItem(
        CACHE_PREFIX + chave,
        JSON.stringify({ t: Date.now(), v: valor })
      );
    } catch (e) { /* cache é opcional */ }
  }

  /* ---------- limite de concorrência ---------- */

  var MAX_CONCORRENCIA = (ns.CONFIG && ns.CONFIG.LIMITE_CONCORRENCIA) || 4;
  var emVoo = 0;
  var fila = [];

  function liberar() {
    emVoo--;
    var proximo = fila.shift();
    if (proximo) {
      emVoo++;
      proximo();
    }
  }

  /* Executa a tarefa respeitando o limite de requisições simultâneas. */
  function limitado(tarefa) {
    return new Promise(function (resolve, reject) {
      function executar() {
        Promise.resolve()
          .then(tarefa)
          .then(resolve, reject)
          .then(liberar);
      }
      if (emVoo < MAX_CONCORRENCIA) {
        emVoo++;
        executar();
      } else {
        fila.push(executar);
      }
    });
  }

  /* ---------- fetch com timeout ---------- */

  function getJSON(url) {
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = controller
      ? setTimeout(function () { controller.abort(); }, TIMEOUT_MS)
      : null;

    return fetch(url, controller ? { signal: controller.signal } : undefined)
      .then(function (resp) {
        if (!resp.ok) {
          var erro = new Error('HTTP ' + resp.status);
          erro.status = resp.status;
          throw erro;
        }
        return resp.json();
      })
      .finally(function () { if (timer) clearTimeout(timer); });
  }

  /* ---------- normalização ---------- */

  function https(url) {
    return url ? url.replace(/^http:\/\//, 'https://') : '';
  }

  function isbnDe(identifiers) {
    if (!identifiers || !identifiers.length) return '';
    var treze = identifiers.filter(function (i) { return i.type === 'ISBN_13'; })[0];
    var dez = identifiers.filter(function (i) { return i.type === 'ISBN_10'; })[0];
    return (treze && treze.identifier) || (dez && dez.identifier) || '';
  }

  function anoDe(data) {
    if (!data) return '';
    var m = String(data).match(/\d{4}/);
    return m ? m[0] : '';
  }

  function normalizarIsbn(isbn) {
    return String(isbn || '').replace(/[^0-9Xx]/g, '').toUpperCase();
  }

  function pareceIsbn(valor) {
    var limpo = normalizarIsbn(valor);
    if (limpo.length === 13) return /^\d{13}$/.test(limpo);
    if (limpo.length === 10) return /^\d{9}[\dX]$/.test(limpo);
    return false;
  }

  /* Chave de autor sem o prefixo de caminho: "OL66700A". */
  function chaveAutor(bruto) {
    return String(bruto || '').replace('/authors/', '').replace(/^\//, '');
  }

  /*
   * Remove marcação e devolve texto limpo.
   * O Google Books devolve HTML (<br>, <p>); o Open Library devolve markdown
   * com links [texto](url) e separadores "----------" colados de listas
   * importadas da Wikipédia.
   */
  function limparTexto(texto) {
    if (!texto) return '';
    var t = String(texto).replace(/\r\n/g, '\n');

    /* HTML (Google Books) */
    t = t.replace(/<br\s*\/?>/gi, '\n');
    t = t.replace(/<\/p>/gi, '\n\n');
    t = t.replace(/<[^>]+>/g, '');

    /* Markdown (Open Library) */
    t = t.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
    t = t.replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1');
    t = t.replace(/^[ \t]*-{4,}[^\n]*$/gm, '\n');

    t = t.replace(/[ \t]+/g, ' ');
    t = t.replace(/\n{3,}/g, '\n\n');
    return t.trim();
  }

  /* Descrição do Open Library: string ou { type, value }. */
  function descricaoDe(bruto) {
    if (!bruto) return '';
    if (typeof bruto === 'string') return bruto;
    return bruto.value || '';
  }

  /* Capa do Open Library: usa o id de capa (/b/id/), que devolve 404
     quando o id não existe — diferente de /b/olid/, que devolve 200 com
     uma imagem vazia e impediria o fallback textual. */
  function capaDe(covers) {
    if (!covers || !covers.length) return '';
    for (var i = 0; i < covers.length; i++) {
      if (covers[i] && covers[i] > 0) {
        return 'https://covers.openlibrary.org/b/id/' + covers[i] + '-L.jpg';
      }
    }
    return '';
  }

  function completar(livro) {
    livro.precos = ns.precos.obter(livro.id, livro.titulo);
    livro.melhor = ns.precos.melhor(livro.precos);
    return livro;
  }

  /* ---------- provedores ---------- */

  var ouvintes = [];

  /* Notifica a interface quando o status de um provedor muda. */
  ns.aoMudarStatus = function (fn) {
    if (typeof fn === 'function') ouvintes.push(fn);
  };

  function avisarStatus() {
    var status = ns.statusProvedores();
    ouvintes.forEach(function (fn) {
      try { fn(status); } catch (e) { /* ignora falhas de exibição */ }
    });
  }

  ns.statusProvedores = function () {
    return { google: googleDisponivel, aviso: googleAviso };
  };

  function chaveGoogle() {
    var k = ns.CONFIG && ns.CONFIG.GOOGLE_BOOKS_API_KEY;
    return k ? '&key=' + encodeURIComponent(k) : '';
  }

  /* ---------- Google Books ---------- */

  function doGoogle(v) {
    var info = v.volumeInfo || {};
    var imagem = info.imageLinks || {};
    var autores = (info.authors || []).map(function (nome) {
      return { nome: nome, key: '' };
    });
    return completar({
      id: v.id,
      isbn: isbnDe(info.industryIdentifiers),
      titulo: info.title || 'Título desconhecido',
      subtitulo: info.subtitle || '',
      autor: (info.authors && info.authors.join(', ')) || 'Autor desconhecido',
      autores: autores,
      editora: info.publisher || '',
      sinopse: limparTexto(info.description || ''),
      capa: https(imagem.thumbnail || imagem.smallThumbnail || ''),
      categorias: info.categories || [],
      ano: anoDe(info.publishedDate),
      paginas: info.pageCount || 0,
      idioma: info.language || ''
    });
  }

  function buscarGoogle(query, limite) {
    return limitado(function () {
      if (!googleDisponivel) throw new Error('google indisponível');
      var url = GOOGLE + '?q=' + encodeURIComponent(query) +
        '&maxResults=' + limite + '&printType=books' + chaveGoogle();
      return getJSON(url);
    }).then(function (dados) {
      var itens = (dados.items || []).map(doGoogle);
      if (!itens.length) throw new Error('vazio');
      return itens;
    }).catch(function (erro) {
      /* Cota do Google esgotada: não voltamos a tentar nesta sessão. */
      if (erro && erro.status === 429) {
        googleDisponivel = false;
        googleAviso = 'Cota da API do Google Books esgotada — usando o Open Library.';
        avisarStatus();
      }
      throw erro;
    });
  }

  function detalheGoogle(id) {
    return limitado(function () {
      if (!googleDisponivel) throw new Error('google indisponível');
      return getJSON(GOOGLE + '/' + encodeURIComponent(id) + chaveGoogle());
    }).then(doGoogle).catch(function (erro) {
      if (erro && erro.status === 429) {
        googleDisponivel = false;
        googleAviso = 'Cota da API do Google Books esgotada — usando o Open Library.';
        avisarStatus();
      }
      throw erro;
    });
  }

  /* ---------- Open Library: livros ---------- */

  function doOpenLibrary(doc) {
    var key = doc.key || ('OL' + (doc.cover_edition_key || doc.edition_key) + 'W');
    var id = 'ol:' + key;
    var capa = doc.cover_i
      ? 'https://covers.openlibrary.org/b/id/' + doc.cover_i + '-L.jpg'
      : '';
    var autores = (doc.author_name || []).map(function (nome, i) {
      return { nome: nome, key: chaveAutor((doc.author_key || [])[i]) };
    });
    return completar({
      id: id,
      isbn: (doc.isbn && doc.isbn[0]) || '',
      titulo: doc.title || 'Título desconhecido',
      subtitulo: '',
      autor: (doc.author_name && doc.author_name.join(', ')) || 'Autor desconhecido',
      autores: autores,
      editora: (doc.publisher && doc.publisher[0]) || '',
      sinopse: '',
      capa: capa,
      categorias: (doc.subject && doc.subject.slice(0, 4)) || [],
      ano: doc.first_publish_year ? String(doc.first_publish_year) : '',
      paginas: doc.number_of_pages_median || 0,
      idioma: doc.language ? doc.language[0] : ''
    });
  }

  var CAMPOS_BUSCA = 'key,title,author_name,author_key,cover_i,isbn,publisher,' +
    'subject,number_of_pages_median,language,first_publish_year';

  function buscarOpenLibrary(query, limite) {
    var url = OPENLIB + '/search.json?q=' + encodeURIComponent(query) +
      '&limit=' + limite + '&fields=' + CAMPOS_BUSCA;
    return limitado(function () { return getJSON(url); }).then(function (dados) {
      return (dados.docs || []).map(doOpenLibrary);
    });
  }

  /* ---------- Open Library: autores ---------- */

  function doAutor(doc) {
    return {
      key: chaveAutor(doc.key),
      nome: doc.name || 'Autor desconhecido',
      nomesAlternativos: doc.alternate_names || [],
      nascimento: doc.birth_date || '',
      morte: doc.death_date || '',
      obras: doc.work_count || 0,
      nota: doc.ratings_average || 0,
      avaliacoes: doc.ratings_count || 0,
      obraPrincipal: doc.top_work || '',
      assuntos: (doc.top_subjects || []).slice(0, 6)
    };
  }

  /*
   * Diretório de autores.
   * A ordem crua da API mistura homônimos: buscar "Paulo Coelho" devolve
   * primeiro "Paulo Coelho Netto" (historiador, 17 obras) e só depois o
   * romancista (767 obras). Por isso pedimos `sort=work_count desc` — é o
   * único campo ordenável no índice de autores — e mantemos a ordenação
   * local como rede de segurança.
   */
  ns.buscarAutores = function (termo, pagina, porPagina) {
    pagina = pagina || 1;
    porPagina = porPagina || ((ns.CONFIG && ns.CONFIG.PAGINA_AUTORES) || 24);
    var q = (termo || '').trim() || '*';
    var inicio = (pagina - 1) * porPagina;
    var chave = 'autores:' + q.toLowerCase() + ':' + inicio + ':' + porPagina;

    var cache = lerCache(chave);
    if (cache) return Promise.resolve(cache);

    var url = OPENLIB + '/search/authors.json?q=' + encodeURIComponent(q) +
      '&limit=' + porPagina + '&start=' + inicio + '&sort=work_count%20desc';

    return limitado(function () { return getJSON(url); }).then(function (dados) {
      var autores = (dados.docs || []).map(doAutor);
      autores.sort(function (a, b) { return b.obras - a.obras; });
      var resultado = { total: dados.numFound || 0, autores: autores };
      gravarCache(chave, resultado);
      return resultado;
    });
  };

  /*
   * Autores em destaque: resolve uma lista curada de nomes via busca.
   * O índice completo (`q=*`) tem 15 milhões de entradas e o topo por número
   * de obras são conjuntos editoriais ("Great Britain", "Phone Number List"),
   * não pessoas — por isso a listagem padrão parte de nomes conhecidos.
   */
  ns.autoresDestaque = function (nomes) {
    nomes = nomes || (ns.AUTORES_DESTAQUE || []);
    var chave = 'autores-destaque:' + nomes.join('|');
    var cache = lerCache(chave);
    if (cache) return Promise.resolve(cache);

    return Promise.all(nomes.map(function (nome) {
      return ns.buscarAutores(nome, 1, 3).then(function (r) {
        var candidatos = r.autores || [];
        if (!candidatos.length) return null;
        var exato = candidatos.filter(function (a) {
          return a.nome.toLowerCase() === nome.toLowerCase();
        });
        return exato[0] || candidatos[0];
      });
    })).then(function (lista) {
      var autores = lista.filter(Boolean);
      autores.sort(function (a, b) { return b.obras - a.obras; });
      var resultado = { total: autores.length, autores: autores };
      gravarCache(chave, resultado);
      return resultado;
    });
  };

  /* Ficha completa do autor: bio, foto, links e métricas. */
  ns.buscarAutorPorId = function (id, nome) {
    var chave = 'autor:' + id;
    var cache = lerCache(chave);
    if (cache) return Promise.resolve(cache);

    var promessaFicha = limitado(function () {
      return getJSON(OPENLIB + '/authors/' + encodeURIComponent(id) + '.json');
    });

    var promessaExtras = nome
      ? ns.buscarAutores(nome, 1, 50).catch(function () { return null; })
      : Promise.resolve(null);

    return Promise.all([promessaFicha, promessaExtras]).then(function (resultados) {
      var bruto = resultados[0] || {};
      var lista = resultados[1];

      var extra = null;
      if (lista && lista.autores) {
        for (var i = 0; i < lista.autores.length; i++) {
          if (lista.autores[i].key === id) { extra = lista.autores[i]; break; }
        }
      }

      var autor = extra || doAutor({ key: id, name: bruto.name });
      autor.nome = bruto.name || autor.nome;
      autor.nomePessoal = bruto.personal_name || '';
      autor.bio = limparTexto(bruto.bio || '');
      autor.foto = bruto.photos && bruto.photos[0] > 0
        ? 'https://covers.openlibrary.org/b/id/' + bruto.photos[0] + '-L.jpg'
        : '';
      autor.links = (bruto.links || []).filter(function (l) {
        return l.title && l.url;
      });
      if (bruto.alternate_names && bruto.alternate_names.length) {
        autor.nomesAlternativos = bruto.alternate_names;
      }
      gravarCache(chave, autor);
      return autor;
    });
  };

  /* Livros de um autor. */
  ns.buscarLivrosPorAutor = function (nome, limite) {
    limite = limite || ((ns.CONFIG && ns.CONFIG.PAGINA_AUTORES) || 24);
    var chave = 'livros-autor:' + nome.trim().toLowerCase() + ':' + limite;

    var cache = lerCache(chave);
    if (cache) return Promise.resolve(cache);

    var url = OPENLIB + '/search.json?author=' + encodeURIComponent(nome) +
      '&limit=' + limite + '&fields=' + CAMPOS_BUSCA;

    return limitado(function () { return getJSON(url); }).then(function (dados) {
      var livros = (dados.docs || []).map(doOpenLibrary);
      gravarCache(chave, livros);
      return livros;
    });
  };

  /* ---------- busca ---------- */

  /* Busca com cache, tentando Google e caindo para o Open Library. */
  ns.buscarLivros = function (query, limite) {
    limite = limite || 20;
    var chave = 'busca:' + query.trim().toLowerCase() + ':' + limite;

    var cache = lerCache(chave);
    if (cache) return Promise.resolve(cache);

    return buscarGoogle(query, limite)
      .catch(function () { return buscarOpenLibrary(query, limite); })
      .then(function (livros) {
        gravarCache(chave, livros);
        return livros;
      });
  };

  /* Categorias derivadas de uma busca. */
  ns.buscarPorCategoria = function (slug, limite) {
    var cat = ns.getCategoriaPorSlug(slug);
    if (!cat) return Promise.resolve([]);
    return ns.buscarLivros(cat.query, limite || 24);
  };

  /* ---------- detalhe ---------- */

  /* Nome do autor a partir da chave OL...A. */
  function nomeDeAutor(key) {
    var limpo = chaveAutor(key);
    if (!limpo) return Promise.resolve('');

    var chave = 'autor-nome:' + limpo;
    var cache = lerCache(chave);
    if (cache) return Promise.resolve(cache);

    return limitado(function () {
      return getJSON(OPENLIB + '/authors/' + encodeURIComponent(limpo) + '.json');
    }).then(function (dados) {
      var nome = dados.name || dados.personal_name || '';
      gravarCache(chave, nome);
      return nome;
    }).catch(function () { return ''; });
  }

  function detalheOpenLibrary(key) {
    var caminho = String(key || '').replace('/works/', '');
    return limitado(function () {
      return getJSON(OPENLIB + '/works/' + encodeURIComponent(caminho) + '.json');
    }).then(function (obra) {
      obra = obra || {};
      var chaves = (obra.authors || []).map(function (a) {
        return chaveAutor(a.author && a.author.key);
      }).filter(Boolean);

      return Promise.all(chaves.map(nomeDeAutor)).then(function (nomes) {
        var autores = chaves.map(function (k, i) {
          return { nome: nomes[i] || '', key: k };
        });

        return completar({
          id: 'ol:' + (obra.key || ('/works/' + caminho)),
          isbn: '',
          titulo: obra.title || 'Título desconhecido',
          subtitulo: '',
          autor: nomes[0] || 'Autor desconhecido',
          autores: autores,
          editora: '',
          sinopse: limparTexto(descricaoDe(obra.description)),
          capa: capaDe(obra.covers),
          categorias: (obra.subjects && obra.subjects.slice(0, 4)) || [],
          ano: anoDe(obra.first_publish_date),
          paginas: 0,
          idioma: ''
        });
      });
    });
  }

  /* Resolução por ISBN: openlibrary.org/isbn/{isbn}.json devolve a edição,
     que aponta para a obra. A sinopse vem da obra. */
  function detalheIsbn(isbn) {
    var limpo = normalizarIsbn(isbn);
    return limitado(function () {
      return getJSON(OPENLIB + '/isbn/' + encodeURIComponent(limpo) + '.json');
    }).then(function (reg) {
      reg = reg || {};
      var chaves = (reg.authors || []).map(function (a) { return chaveAutor(a.key); }).filter(Boolean);
      var obra = (reg.works && reg.works[0] && reg.works[0].key) || '';

      var promessaNomes = Promise.all(chaves.map(nomeDeAutor));
      /* A edição não traz sinopse nem assunto — buscamos na obra. */
      var promessaObra = obra
        ? limitado(function () {
          return getJSON(OPENLIB + obra + '.json').catch(function () { return null; });
        })
        : Promise.resolve(null);

      return Promise.all([promessaNomes, promessaObra]).then(function (resultados) {
        var nomes = resultados[0];
        var dados = resultados[1] || {};
        var autores = chaves.map(function (k, i) {
          return { nome: nomes[i] || '', key: k };
        });

        return completar({
          id: obra ? 'ol:' + obra : 'isbn:' + limpo,
          isbn: (reg.isbn_13 && reg.isbn_13[0]) || (reg.isbn_10 && reg.isbn_10[0]) || limpo,
          titulo: reg.title || 'Título desconhecido',
          subtitulo: reg.subtitle || '',
          autor: nomes[0] || 'Autor desconhecido',
          autores: autores,
          editora: (reg.publishers && reg.publishers[0]) || '',
          sinopse: limparTexto(descricaoDe(dados.description)),
          capa: capaDe(dados.covers) || capaDe(reg.covers),
          categorias: (dados.subjects && dados.subjects.slice(0, 4)) || [],
          ano: anoDe(reg.publish_date),
          paginas: reg.number_of_pages || 0,
          idioma: (reg.languages && reg.languages[0] && reg.languages[0].key || '')
            .replace('/languages/', '')
        });
      });
    });
  }

  ns.buscarPorId = function (id, tituloDica) {
    var chave = 'livro:' + id;
    var cache = lerCache(chave);
    if (cache) return Promise.resolve(cache);

    var promessa;
    if (id.indexOf('ol:') === 0) {
      promessa = detalheOpenLibrary(id.slice(3));
    } else if (id.indexOf('isbn:') === 0) {
      promessa = detalheIsbn(id.slice(5));
    } else if (pareceIsbn(id)) {
      promessa = detalheIsbn(id);
    } else {
      promessa = detalheGoogle(id);
    }

    return promessa
      .catch(function () {
        /* fallback: busca textual pelo título informado */
        if (tituloDica) {
          return ns.buscarLivros(tituloDica, 1).then(function (lista) {
            if (lista && lista.length) return lista[0];
            throw new Error('não encontrado');
          });
        }
        throw new Error('não encontrado');
      })
      .then(function (livro) {
        gravarCache(chave, livro);
        return livro;
      });
  };

})(window.ECONOMIZALEITOR);
