/* Página: Todos os Livros (busca, filtro, ordenação, paginação) */
(function (ns) {
  'use strict';

  var ui = ns.ui;
  var POR_PAGINA = (ns.CONFIG && ns.CONFIG.PAGINA_LIVROS) || 20;

  ui.montarLayout('livros');

  var elTitulo = document.querySelector('[data-titulo]');
  var elTotal = document.querySelector('[data-total]');
  var elLivros = document.querySelector('[data-livros]');
  var elPaginacao = document.querySelector('[data-paginacao]');
  var elFiltro = document.querySelector('[data-filtro]');
  var elOrdenar = document.querySelector('[data-ordenar]');

  var estado = {
    q: ui.queryParam('q'),
    categoria: ui.queryParam('categoria'),
    ordenar: 'menor-preco',
    pagina: 1
  };

  var livros = [];

  /* Preenche o select de categorias */
  if (elFiltro) {
    ns.CATEGORIAS.forEach(function (c) {
      var opt = document.createElement('option');
      opt.value = c.slug;
      opt.textContent = c.nome;
      elFiltro.appendChild(opt);
    });
    elFiltro.value = estado.categoria;
  }

  /* Busca livros conforme o estado atual */
  function carregar() {
    elLivros.innerHTML = ui.skeletonCards(8);
    elPaginacao.innerHTML = '';

    var promessa;
    if (estado.categoria) {
      promessa = ns.buscarPorCategoria(estado.categoria, 40);
    } else if (estado.q) {
      promessa = ns.buscarLivros(estado.q, 40);
    } else {
      promessa = carregarPadrao();
    }

    return promessa
      .then(function (resultado) {
        livros = resultado || [];
        estado.pagina = 1;
        aplicar();
      })
      .catch(function () {
        elLivros.innerHTML = ui.estadoErro();
      });
  }

  /* Conjunto padrão quando não há busca nem filtro */
  function carregarPadrao() {
    var slugs = ['literatura-brasileira', 'romance', 'fantasia', 'tecnologia'];
    var vistos = {};
    return Promise.all(
      slugs.map(function (s) { return ns.buscarPorCategoria(s, 16); })
    ).then(function (listas) {
      var combinado = [];
      listas.forEach(function (lista) {
        (lista || []).forEach(function (livro) {
          if (!vistos[livro.id]) {
            vistos[livro.id] = true;
            combinado.push(livro);
          }
        });
      });
      return combinado;
    });
  }

  function ordenarLista() {
    var lista = livros.slice();
    if (estado.ordenar === 'titulo') {
      lista.sort(function (a, b) { return a.titulo.localeCompare(b.titulo, 'pt-BR'); });
    } else {
      lista.sort(function (a, b) {
        var pa = a.melhor ? a.melhor.preco : Infinity;
        var pb = b.melhor ? b.melhor.preco : Infinity;
        return pa - pb;
      });
    }
    return lista;
  }

  function aplicar() {
    var lista = ordenarLista();

    if (elTitulo) {
      if (estado.categoria) {
        var cat = ns.getCategoriaPorSlug(estado.categoria);
        elTitulo.textContent = cat ? cat.nome : 'Categoria';
      } else if (estado.q) {
        elTitulo.textContent = 'Resultados para “' + estado.q + '”';
      } else {
        elTitulo.textContent = 'Todos os Livros';
      }
    }

    if (elTotal) {
      elTotal.textContent = lista.length + ' resultado' + (lista.length === 1 ? '' : 's');
    }

    if (!lista.length) {
      elLivros.innerHTML = ui.estado('Nenhum livro encontrado',
        'Tente outro termo de busca ou selecione outra categoria.');
      return;
    }

    var totalPaginas = Math.ceil(lista.length / POR_PAGINA);
    if (estado.pagina > totalPaginas) estado.pagina = totalPaginas;
    var inicio = (estado.pagina - 1) * POR_PAGINA;
    var pagina = lista.slice(inicio, inicio + POR_PAGINA);

    ui.renderCards(elLivros, pagina);
    renderPaginacao(totalPaginas);
  }

  function renderPaginacao(totalPaginas) {
    if (!elPaginacao || totalPaginas <= 1) {
      if (elPaginacao) elPaginacao.innerHTML = '';
      return;
    }

    var botoes = [];
    botoes.push(botao(estado.pagina - 1, '‹', estado.pagina === 1));

    for (var p = 1; p <= totalPaginas; p++) {
      botoes.push(botao(p, String(p), false, p === estado.pagina));
    }

    botoes.push(botao(estado.pagina + 1, '›', estado.pagina === totalPaginas));
    elPaginacao.innerHTML = botoes.join('');
  }

  function botao(pagina, rotulo, desabilitado, atual) {
    return '<button type="button" data-pagina="' + pagina + '"' +
      (desabilitado ? ' disabled' : '') +
      (atual ? ' aria-current="true"' : '') +
      '>' + rotulo + '</button>';
  }

  /* Eventos */
  if (elPaginacao) {
    elPaginacao.addEventListener('click', function (e) {
      var alvo = e.target.closest('button[data-pagina]');
      if (!alvo || alvo.disabled) return;
      estado.pagina = parseInt(alvo.getAttribute('data-pagina'), 10);
      aplicar();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  if (elFiltro) {
    elFiltro.addEventListener('change', function () {
      estado.categoria = elFiltro.value;
      estado.q = '';
      carregar();
    });
  }

  if (elOrdenar) {
    elOrdenar.addEventListener('change', function () {
      estado.ordenar = elOrdenar.value;
      estado.pagina = 1;
      aplicar();
    });
  }

  carregar();

})(window.ECONOMIZALEITOR);
