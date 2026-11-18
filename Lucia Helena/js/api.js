/* ============================================================
   Livômetro — Camada de acesso a dados
   APIs públicas: Google Books (principal) + Open Library (fallback)
   Preços: mock determinístico (js/data.js)
   ============================================================ */

window.LIVOMETRO = window.LIVOMETRO || {};

(function (ns) {
  'use strict';

  var GOOGLE = 'https://www.googleapis.com/books/v1/volumes';
  var OPENLIB = 'https://openlibrary.org/search.json';
  var CACHE_PREFIX = 'livometro:cache:';
  var CACHE_TTL = 1000 * 60 * 60 * 12; /* 12h */

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

  /* ---------- fetch com timeout ---------- */

  function getJSON(url) {
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = controller
      ? setTimeout(function () { controller.abort(); }, 12000)
      : null;

    return fetch(url, controller ? { signal: controller.signal } : undefined)
      .then(function (resp) {
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
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

  function completar(livro) {
    livro.precos = ns.gerarPrecos(livro.id, livro.titulo);
    livro.melhor = ns.melhorPreco(livro.precos);
    return livro;
  }

  function doGoogle(v) {
    var info = v.volumeInfo || {};
    var imagem = info.imageLinks || {};
    return completar({
      id: v.id,
      isbn: isbnDe(info.industryIdentifiers),
      titulo: info.title || 'Título desconhecido',
      subtitulo: info.subtitle || '',
      autor: (info.authors && info.authors.join(', ')) || 'Autor desconhecido',
      editora: info.publisher || '',
      sinopse: info.description || '',
      capa: https(imagem.thumbnail || imagem.smallThumbnail || ''),
      categorias: info.categories || [],
      ano: anoDe(info.publishedDate),
      paginas: info.pageCount || 0,
      idioma: info.language || ''
    });
  }

  function doOpenLibrary(doc) {
    var key = doc.key || ('OL' + (doc.cover_edition_key || doc.edition_key) + 'W');
    var id = 'ol:' + key;
    var capa = doc.cover_i
      ? 'https://covers.openlibrary.org/b/id/' + doc.cover_i + '-L.jpg'
      : '';
    return completar({
      id: id,
      isbn: (doc.isbn && doc.isbn[0]) || '',
      titulo: doc.title || 'Título desconhecido',
      subtitulo: '',
      autor: (doc.author_name && doc.author_name.join(', ')) || 'Autor desconhecido',
      editora: (doc.publisher && doc.publisher[0]) || '',
      sinopse: '',
      capa: capa,
      categorias: (doc.subject && doc.subject.slice(0, 4)) || [],
      ano: doc.first_publish_year ? String(doc.first_publish_year) : '',
      paginas: doc.number_of_pages_median || 0,
      idioma: doc.language ? doc.language[0] : ''
    });
  }

  /* ---------- busca ---------- */

  function buscarGoogle(query, limite) {
    var url = GOOGLE + '?q=' + encodeURIComponent(query) + '&maxResults=' + limite + '&printType=books';
    return getJSON(url).then(function (dados) {
      var itens = (dados.items || []).map(doGoogle);
      if (!itens.length) throw new Error('vazio');
      return itens;
    });
  }

  function buscarOpenLibrary(query, limite) {
    var campos = 'key,title,author_name,first_publish_year,cover_i,isbn,publisher,subject,number_of_pages_median,language';
    var url = OPENLIB + '?q=' + encodeURIComponent(query) + '&limit=' + limite + '&fields=' + campos;
    return getJSON(url).then(function (dados) {
      return (dados.docs || []).map(doOpenLibrary);
    });
  }

  /* Busca com cache, tentando Google e caindo para Open Library. */
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

  function detalheGoogle(id) {
    return getJSON(GOOGLE + '/' + encodeURIComponent(id)).then(doGoogle);
  }

  function detalheOpenLibrary(key) {
    var id = 'ol:' + key;
    var olid = key.replace('/works/', '');
    return getJSON('https://openlibrary.org' + key + '.json')
      .catch(function () { return null; })
      .then(function (obra) {
        var descricao = '';
        if (obra && obra.description) {
          descricao = typeof obra.description === 'string'
            ? obra.description
            : (obra.description.value || '');
        }
        return completar({
          id: id,
          isbn: '',
          titulo: (obra && obra.title) || 'Título desconhecido',
          subtitulo: '',
          autor: 'Autor desconhecido',
          editora: '',
          sinopse: descricao,
          capa: 'https://covers.openlibrary.org/b/olid/' + olid + '-L.jpg',
          categorias: (obra && obra.subjects && obra.subjects.slice(0, 4)) || [],
          ano: '',
          paginas: 0,
          idioma: ''
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

})(window.LIVOMETRO);
