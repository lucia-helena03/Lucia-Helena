/* Página: Home */
(function (ns) {
  'use strict';

  var ui = ns.ui;

  ui.montarLayout('home');

  /* Busca do hero */
  var form = document.querySelector('[data-busca-hero]');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var termo = form.q.value.trim();
      if (termo) {
        window.location.href = 'livros.html?q=' + encodeURIComponent(termo);
      }
    });
  }

  /* Categorias */
  var gridCategorias = document.querySelector('[data-categorias]');
  if (gridCategorias) {
    gridCategorias.innerHTML = ns.CATEGORIAS.map(ui.cardCategoria).join('');
  }

  /* Destaques: busca os livros curados na API */
  var gridDestaques = document.querySelector('[data-destaques]');
  if (gridDestaques) {
    gridDestaques.innerHTML = ui.skeletonCards(ns.DESTAQUES_QTD);

    var titulos = ns.LIVROS_DESTAQUE.slice(0, ns.DESTAQUES_QTD);
    Promise.all(titulos.map(function (t) {
      return ns.buscarLivros(t, 1)
        .then(function (lista) { return lista[0] || null; })
        .catch(function () { return null; });
    })).then(function (livros) {
      var validos = livros.filter(Boolean);
      ui.renderCards(gridDestaques, validos);
    });
  }

})(window.ECONOMIZALEITOR);
