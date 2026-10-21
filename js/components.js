/* ============================================================
   EconomizaLeitor — Componentes de UI
   ============================================================ */

window.ECONOMIZALEITOR = window.ECONOMIZALEITOR || {};

(function (ns) {
  'use strict';

  var ui = ns.ui = {};

  /* ---------- utilitários ---------- */

  ui.escapar = function (texto) {
    if (texto == null) return '';
    return String(texto)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  ui.formatarPreco = ns.formatarPreco;

  /* ---------- header ---------- */

  var PAGINAS = [
    { href: 'index.html', label: 'Início', match: 'home' },
    { href: 'livros.html', label: 'Todos os Livros', match: 'livros' },
    { href: 'categorias.html', label: 'Categorias', match: 'categorias' },
    { href: 'autores.html', label: 'Autores', match: 'autores' }
  ];

  function htmlHeader(paginaAtual) {
    var links = PAGINAS.map(function (p) {
      var atual = p.match === paginaAtual ? ' aria-current="page"' : '';
      return '<a class="nav__link" href="' + p.href + '"' + atual + '>' +
        ui.escapar(p.label) + '</a>';
    }).join('');

    return '' +
      '<div class="container header__inner">' +
        '<a class="logo" href="index.html">Economiza<span>Leitor</span></a>' +
        '<div class="header__search">' +
          '<form class="search" role="search" data-busca>' +
            '<svg class="search__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
              '<circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/>' +
              '<path d="M20 20l-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
            '</svg>' +
            '<input class="search__input" type="search" name="q" placeholder="Buscar por título ou autor" aria-label="Buscar livros">' +
          '</form>' +
        '</div>' +
        '<nav class="nav" data-nav aria-label="Principal">' + links + '</nav>' +
        '<button class="header__toggle" type="button" data-toggle aria-label="Abrir menu" aria-expanded="false">☰</button>' +
      '</div>';
  }

  /* ---------- footer ---------- */

  function htmlFooter() {
    return '' +
      '<div class="container">' +
        '<div class="footer__grid">' +
          '<div>' +
            '<div class="footer__marca">EconomizaLeitor</div>' +
            '<p class="footer__texto">Ache o menor preço para a sua próxima leitura. Comparamos livros em várias lojas para você decidir com economia.</p>' +
          '</div>' +
          '<div>' +
            '<div class="footer__titulo">Navegar</div>' +
            '<div class="footer__lista">' +
              '<a href="index.html">Início</a>' +
              '<a href="livros.html">Todos os Livros</a>' +
              '<a href="categorias.html">Categorias</a>' +
              '<a href="autores.html">Autores</a>' +
            '</div>' +
          '</div>' +
          '<div>' +
            '<div class="footer__titulo">Institucional</div>' +
            '<div class="footer__lista">' +
              '<a href="#">Sobre</a>' +
              '<a href="#">Termos de uso</a>' +
              '<a href="#">Contato</a>' +
            '</div>' +
          '</div>' +
          '<div>' +
            '<div class="footer__titulo">Redes</div>' +
            '<div class="footer__lista">' +
              '<a href="#">Instagram</a>' +
              '<a href="#">X</a>' +
              '<a href="#">YouTube</a>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="footer__bottom">© ' + new Date().getFullYear() +
          ' EconomizaLeitor. Preços meramente ilustrativos (dados de demonstração).' +
          '<span class="footer__aviso" data-aviso-api hidden></span></div>' +
      '</div>';
  }

  /* ---------- cards ---------- */

  ui.cardLivro = function (livro) {
    var id = ui.escapar(livro.id);
    var titulo = ui.escapar(livro.titulo);
    var dica = encodeURIComponent(livro.titulo);
    var melhor = livro.melhor;
    var precoHtml = melhor
      ? '<div class="book-card__preco preco--melhor">' + ui.formatarPreco(melhor.preco) +
        '<small>a partir de · ' + ui.escapar(melhor.loja) + '</small></div>'
      : '<div class="book-card__preco"><small>preço indisponível</small></div>';

    var capa = livro.capa
      ? '<img class="book-card__capa" data-capa data-fallback="book-card__capa--fallback" data-titulo="' + titulo +
        '" loading="lazy" src="' + ui.escapar(livro.capa) + '" alt="Capa de ' + titulo + '">'
      : '<div class="book-card__capa book-card__capa--fallback">' + titulo + '</div>';

    return '' +
      '<article class="book-card">' +
        '<a href="livro.html?id=' + id + '&titulo=' + dica + '" aria-label="Ver ' + titulo + '">' + capa + '</a>' +
        '<div class="book-card__body">' +
          '<h3 class="book-card__titulo"><a href="livro.html?id=' + id + '&titulo=' + dica + '">' + titulo + '</a></h3>' +
          '<p class="book-card__autor">' + ui.escapar(livro.autor) + '</p>' +
          precoHtml +
        '</div>' +
      '</article>';
  };

  ui.cardCategoria = function (cat) {
    var contagem = ns.contagemCategoria(cat.slug);
    return '' +
      '<a class="cat-card" href="categoria.html?slug=' + ui.escapar(cat.slug) + '">' +
        '<span class="cat-card__nome">' + ui.escapar(cat.nome) + '</span>' +
        '<span class="cat-card__contagem">' + contagem + ' livros</span>' +
      '</a>';
  };

  ui.cardAutor = function (autor) {
    var nome = ui.escapar(autor.nome);
    var href = 'autor.html?id=' + encodeURIComponent(autor.key || '') +
      '&nome=' + encodeURIComponent(autor.nome || '');

    var datas = [];
    if (autor.nascimento) datas.push(ui.escapar(autor.nascimento));
    if (autor.morte) datas.push(ui.escapar(autor.morte));

    var metricas = [];
    if (autor.obras) metricas.push(autor.obras + (autor.obras === 1 ? ' obra' : ' obras'));
    if (autor.nota) metricas.push('★ ' + autor.nota.toFixed(1));

    return '' +
      '<a class="autor-card" href="' + href + '">' +
        '<span class="autor-card__nome">' + nome + '</span>' +
        (datas.length ? '<span class="autor-card__datas">' + datas.join(' – ') + '</span>' : '') +
        (metricas.length ? '<span class="autor-card__stats">' + ui.escapar(metricas.join(' · ')) + '</span>' : '') +
        (autor.obraPrincipal
          ? '<span class="autor-card__obra">Obra principal: ' + ui.escapar(autor.obraPrincipal) + '</span>'
          : '') +
      '</a>';
  };

  /*
   * Guarda os metadados de um livro listado para a página de detalhe.
   * O índice de busca do Open Library entrega editora, ano, páginas e ISBN
   * que a obra (works) não traz; sem esse stash esses campos sumiriam ao
   * navegar para o detalhe.
   */
  var STASH_PREFIX = 'economizaleitor:stash:';

  ui.lembrarLivro = function (livro) {
    if (!livro || !livro.id) return;
    try {
      sessionStorage.setItem(STASH_PREFIX + livro.id, JSON.stringify({
        editora: livro.editora || '',
        ano: livro.ano || '',
        paginas: livro.paginas || 0,
        isbn: livro.isbn || '',
        idioma: livro.idioma || ''
      }));
    } catch (e) { /* stash é opcional */ }
  };

  ui.lembrarLivros = function (livros) {
    (livros || []).forEach(ui.lembrarLivro);
  };

  ui.livroLembrado = function (id) {
    if (!id) return null;
    try {
      var bruto = sessionStorage.getItem(STASH_PREFIX + id);
      return bruto ? JSON.parse(bruto) : null;
    } catch (e) {
      return null;
    }
  };

  ui.skeletonCard = function () {
    return '' +
      '<div class="skeleton-card" aria-hidden="true">' +
        '<div class="skeleton skeleton-card__capa"></div>' +
        '<div class="skeleton-card__body">' +
          '<div class="skeleton skeleton-line" style="width:90%"></div>' +
          '<div class="skeleton skeleton-line" style="width:60%"></div>' +
          '<div class="skeleton skeleton-line" style="width:40%"></div>' +
        '</div>' +
      '</div>';
  };

  ui.skeletonCards = function (n) {
    var out = '';
    for (var i = 0; i < n; i++) out += ui.skeletonCard();
    return out;
  };

  ui.estado = function (titulo, texto) {
    return '<div class="estado"><p class="estado__titulo">' + ui.escapar(titulo) +
      '</p><p>' + ui.escapar(texto || '') + '</p></div>';
  };

  ui.estadoErro = function () {
    return ui.estado('Não foi possível carregar os livros',
      'Verifique sua conexão e tente novamente.');
  };

  /* Substitui imagens de capa quebradas pelo placeholder textual */
  ui.ligarFallbackCapas = function (scope) {
    var raiz = scope || document;
    var imgs = raiz.querySelectorAll('img[data-capa]');
    Array.prototype.forEach.call(imgs, function (img) {
      img.addEventListener('error', function () {
        var div = document.createElement('div');
        div.className = img.className + ' ' + (img.getAttribute('data-fallback') || '');
        div.textContent = img.getAttribute('data-titulo') || 'Sem capa';
        img.replaceWith(div);
      });
    });
  };

  /* ---------- breadcrumb ---------- */

  ui.breadcrumb = function (itens) {
    var partes = itens.map(function (item, i) {
      var conteudo = item.href
        ? '<a href="' + ui.escapar(item.href) + '">' + ui.escapar(item.label) + '</a>'
        : '<span aria-current="page">' + ui.escapar(item.label) + '</span>';
      var sep = i < itens.length - 1 ? '<span class="breadcrumb__sep">›</span>' : '';
      return conteudo + sep;
    }).join('');
    return '<nav class="breadcrumb" aria-label="Trilha de navegação">' + partes + '</nav>';
  };

  /* ---------- tabela de preços ---------- */

  ui.tabelaPrecos = function (livro) {
    var precos = livro.precos.slice().sort(function (a, b) { return a.preco - b.preco; });

    var linhas = precos.map(function (p) {
      var melhor = livro.melhor && p.loja === livro.melhor.loja;
      var frete = p.disponivel
        ? (p.frete === 0 ? '<span class="badge">Frete grátis</span>' : ui.formatarPreco(p.frete))
        : '<span class="badge badge--mutado">Indisponível</span>';
      var cta = p.disponivel
        ? '<a class="btn btn--primary" href="' + ui.escapar(p.url) + '" target="_blank" rel="noopener nofollow sponsored">Ir para a loja</a>'
        : '<button class="btn btn--outline" type="button" disabled>Indisponível</button>';

      return '<tr>' +
        '<td class="loja">' + ui.escapar(p.loja) +
          (melhor ? ' <span class="badge">Melhor preço</span>' : '') + '</td>' +
        '<td class="preco' + (melhor ? ' preco--melhor' : '') + '">' + ui.formatarPreco(p.preco) + '</td>' +
        '<td>' + frete + '</td>' +
        '<td>' + cta + '</td>' +
      '</tr>';
    }).join('');

    return '' +
      '<div class="tabela-precos__wrapper">' +
        '<caption>Comparação de preços em ' + precos.length + ' lojas</caption>' +
        '<table class="tabela-precos">' +
          '<thead><tr>' +
            '<th scope="col">Loja</th>' +
            '<th scope="col">Preço</th>' +
            '<th scope="col">Frete</th>' +
            '<th scope="col">Ação</th>' +
          '</tr></thead>' +
          '<tbody>' + linhas + '</tbody>' +
        '</table>' +
      '</div>';
  };

  /* ---------- layout ---------- */

  /* Aviso discreto quando a cota da API do Google Books acaba e o site
     passa a usar o Open Library. */
  ui.mostrarAvisoApi = function () {
    var el = document.querySelector('[data-aviso-api]');
    if (!el) return;
    var status = ns.statusProvedores ? ns.statusProvedores() : null;
    if (status && !status.google && status.aviso) {
      el.textContent = status.aviso;
      el.hidden = false;
    }
  };

  ui.montarLayout = function (pagina) {
    var header = document.querySelector('[data-component="header"]');
    var footer = document.querySelector('[data-component="footer"]');
    if (header) {
      header.className = 'header';
      header.innerHTML = htmlHeader(pagina);

      var form = header.querySelector('[data-busca]');
      if (form) {
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var termo = form.q.value.trim();
          if (termo) {
            window.location.href = 'livros.html?q=' + encodeURIComponent(termo);
          }
        });
      }

      var toggle = header.querySelector('[data-toggle]');
      var nav = header.querySelector('[data-nav]');
      if (toggle && nav) {
        toggle.addEventListener('click', function () {
          var aberto = nav.classList.toggle('is-open');
          toggle.setAttribute('aria-expanded', String(aberto));
        });
      }
    }

    if (footer) {
      footer.className = 'footer';
      footer.innerHTML = htmlFooter();
    }

    if (ns.aoMudarStatus) ns.aoMudarStatus(ui.mostrarAvisoApi);
    ui.mostrarAvisoApi();
  };

  /* ---------- helpers de página ---------- */

  ui.renderCards = function (container, livros) {
    if (!container) return;
    if (!livros || !livros.length) {
      container.innerHTML = ui.estado('Nenhum livro encontrado',
        'Tente outro termo ou outra categoria.');
      return;
    }
    ui.lembrarLivros(livros);
    container.innerHTML = livros.map(ui.cardLivro).join('');
    ui.ligarFallbackCapas(container);
  };

  ui.renderAutorCards = function (container, autores) {
    if (!container) return;
    if (!autores || !autores.length) {
      container.innerHTML = ui.estado('Nenhum autor encontrado',
        'Tente outro nome ou grafia diferente.');
      return;
    }
    container.innerHTML = autores.map(ui.cardAutor).join('');
  };

  ui.queryParam = function (nome) {
    return new URLSearchParams(window.location.search).get(nome) || '';
  };

})(window.ECONOMIZALEITOR);
