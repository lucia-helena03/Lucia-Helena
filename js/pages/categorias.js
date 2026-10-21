/* Página: Categorias */
(function (ns) {
  'use strict';

  var ui = ns.ui;

  ui.montarLayout('categorias');

  var grid = document.querySelector('[data-categorias]');
  var total = document.querySelector('[data-total]');

  if (grid) {
    grid.innerHTML = ns.CATEGORIAS.map(ui.cardCategoria).join('');
    var soma = ns.CATEGORIAS.reduce(function (acc, c) {
      return acc + ns.contagemCategoria(c.slug);
    }, 0);
    if (total) total.textContent = soma.toLocaleString('pt-BR') + ' livros';
  }

})(window.ECONOMIZALEITOR);
