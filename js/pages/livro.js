/* Página: Detalhes do Livro (?id=&titulo=) */
(function (ns) {
  'use strict';

  var ui = ns.ui;

  ui.montarLayout('');

  var elBreadcrumb = document.querySelector('[data-breadcrumb]');
  var elLivro = document.querySelector('[data-livro]');

  var id = ui.queryParam('id');
  var tituloDica = ui.queryParam('titulo');

  function normalizar(texto) {
    return String(texto || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  /* Tenta associar uma categoria da API a uma das 25 categorias do site */
  function casarCategoria(livro) {
    var termos = (livro.categorias || []).map(normalizar);
    for (var i = 0; i < ns.CATEGORIAS.length; i++) {
      var cat = ns.CATEGORIAS[i];
      var alvo = normalizar(cat.nome);
      if (termos.some(function (t) { return t.indexOf(alvo) !== -1 || alvo.indexOf(t) !== -1; })) {
        return cat;
      }
    }
    return null;
  }

  function renderBreadcrumb(livro, cat) {
    var itens = [{ label: 'Home', href: 'index.html' }];
    if (cat) {
      itens.push({ label: cat.nome, href: 'categoria.html?slug=' + cat.slug });
    } else {
      itens.push({ label: 'Todos os Livros', href: 'livros.html' });
    }
    itens.push({ label: livro.titulo });
    elBreadcrumb.innerHTML = ui.breadcrumb(itens);
  }

  /* Autor principal, normalizado para um único nome e a chave Open Library. */
  function primeiroAutor(livro) {
    var lista = livro.autores || [];
    if (lista.length && lista[0].nome) return lista[0];
    var nome = String(livro.autor || '').split(',')[0].trim();
    return nome ? { nome: nome, key: '' } : null;
  }

  function linkAutor(livro) {
    var autor = primeiroAutor(livro);
    if (!autor || !autor.nome || autor.nome === 'Autor desconhecido') return '';
    var href = 'autor.html?nome=' + encodeURIComponent(autor.nome);
    if (autor.key) {
      href = 'autor.html?id=' + encodeURIComponent(autor.key) +
        '&nome=' + encodeURIComponent(autor.nome);
    }
    return '<a class="livro__autor-link" href="' + href + '">' +
      ui.escapar(autor.nome) + '</a>';
  }

  function renderMeta(livro) {
    var linhas = [];
    function add(rotulo, valor) {
      if (valor) linhas.push('<dt>' + ui.escapar(rotulo) + '</dt><dd>' + ui.escapar(valor) + '</dd>');
    }
    var autor = linkAutor(livro);
    if (autor) linhas.push('<dt>Autor</dt><dd>' + autor + '</dd>');
    add('Editora', livro.editora);
    add('Ano', livro.ano);
    add('ISBN', livro.isbn);
    add('Páginas', livro.paginas ? livro.paginas : '');
    add('Idioma', livro.idioma ? livro.idioma.toUpperCase() : '');
    return linhas.length ? '<dl class="livro__meta">' + linhas.join('') + '</dl>' : '';
  }

  function renderSinopse(livro) {
    if (!livro.sinopse) {
      return '<p class="livro__sinopse">Sinopse não disponível para este título.</p>';
    }
    var paragrafos = livro.sinopse.split(/\n+/).filter(function (p) { return p.trim(); });
    return '<div class="livro__sinopse">' + paragrafos.map(function (p) {
      return '<p>' + ui.escapar(p.trim()) + '</p>';
    }).join('') + '</div>';
  }

  function ctaAutor(livro) {
    var autor = primeiroAutor(livro);
    if (!autor || !autor.nome || autor.nome === 'Autor desconhecido') return '';
    var href = 'autor.html?nome=' + encodeURIComponent(autor.nome);
    if (autor.key) {
      href = 'autor.html?id=' + encodeURIComponent(autor.key) +
        '&nome=' + encodeURIComponent(autor.nome);
    }
    return '<p class="livro__autor-cta">' +
      '<a class="btn btn--outline" href="' + href + '">Ver todos os livros de ' +
      ui.escapar(autor.nome) + '</a></p>';
  }

  function renderVer(livro) {
    var titulo = ui.escapar(livro.titulo);
    var capa = livro.capa
      ? '<img class="livro__capa" data-capa data-fallback="livro__capa--fallback" data-titulo="' + titulo +
        '" src="' + ui.escapar(livro.capa) + '" alt="Capa de ' + titulo + '">'
      : '<div class="livro__capa livro__capa--fallback">' + titulo + '</div>';

    var verso = '<div class="livro__capa livro__capa--fallback">Verso<br><small>imagem indisponível</small></div>';

    var badges = (livro.categorias || []).slice(0, 4).map(function (c) {
      return '<span class="badge badge--mutado">' + ui.escapar(c) + '</span>';
    }).join(' ');

    return '' +
      '<div class="livro__capas">' + capa + verso + '</div>' +
      '<div>' +
        '<h1 class="livro__titulo">' + titulo + '</h1>' +
        (livro.subtitulo ? '<p class="livro__meta" style="display:block;margin-top:8px;color:var(--cor-texto-mutado)">' +
          ui.escapar(livro.subtitulo) + '</p>' : '') +
        (badges ? '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">' + badges + '</div>' : '') +
        renderMeta(livro) +
        ctaAutor(livro) +
        '<h2 class="section__title" style="font-size:1.25rem;margin-top:16px">Sinopse</h2>' +
        renderSinopse(livro) +
        '<h2 class="section__title" style="font-size:1.25rem;margin-top:24px">Comparar preços</h2>' +
        ui.tabelaPrecos(livro) +
      '</div>';
  }

  function render(livro) {
    var cat = casarCategoria(livro);
    renderBreadcrumb(livro, cat);
    document.title = livro.titulo + ' — EconomizaLeitor';
    elLivro.innerHTML = renderVer(livro);
    ui.ligarFallbackCapas(elLivro);
  }

  if (!id) {
    elLivro.innerHTML = '<div style="grid-column:1/-1">' +
      ui.estado('Livro não informado', 'Volte para a lista de livros e escolha um título.') +
      '</div>';
    return;
  }

  ns.buscarPorId(id, tituloDica)
    .then(function (livro) {
      /*
       * O índice de busca do Open Library entrega editora, ano, páginas e ISBN
       * que a obra (works) não traz. O stash feito na listagem preserva esses
       * campos ao navegar para o detalhe.
       */
      var extra = ui.livroLembrado(id);
      if (extra) {
        livro.editora = livro.editora || extra.editora;
        livro.ano = livro.ano || extra.ano;
        livro.paginas = livro.paginas || extra.paginas;
        livro.isbn = livro.isbn || extra.isbn;
        livro.idioma = livro.idioma || extra.idioma;
      }
      return livro;
    })
    .then(render)
    .catch(function () {
      elLivro.innerHTML = '<div style="grid-column:1/-1">' +
        ui.estado('Livro não encontrado',
          'Não conseguimos carregar este título. Tente novamente pela busca.') +
        '</div>';
    });

})(window.ECONOMIZALEITOR);
