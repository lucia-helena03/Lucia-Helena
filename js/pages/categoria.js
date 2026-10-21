/* Página: Categoria específica (?slug=) */
(function (ns) {
  'use strict';

  var ui = ns.ui;

  ui.montarLayout('categorias');

  var slug = ui.queryParam('slug');
  var cat = ns.getCategoriaPorSlug(slug);

  var elTitulo = document.querySelector('[data-titulo]');
  var elBreadcrumb = document.querySelector('[data-breadcrumb]');
  var elLivros = document.querySelector('[data-livros]');
  var elOrdenar = document.querySelector('[data-ordenar]');

  var livros = [];

  function ordenar() {
    var criterio = elOrdenar ? elOrdenar.value : 'menor-preco';
    var lista = livros.slice();
    if (criterio === 'titulo') {
      lista.sort(function (a, b) { return a.titulo.localeCompare(b.titulo, 'pt-BR'); });
    } else {
      lista.sort(function (a, b) {
        var pa = a.melhor ? a.melhor.preco : Infinity;
        var pb = b.melhor ? b.melhor.preco : Infinity;
        return pa - pb;
      });
    }
    ui.renderCards(elLivros, lista);
  }

  if (!cat) {
    if (elTitulo) elTitulo.textContent = 'Categoria não encontrada';
    if (elLivros) {
      elLivros.innerHTML = ui.estado('Categoria não encontrada',
        'Volte para a página de categorias e escolha uma opção.');
    }
    return;
  }

  document.title = cat.nome + ' — EconomizaLeitor';
  if (elTitulo) elTitulo.textContent = cat.nome;
  if (elBreadcrumb) {
    elBreadcrumb.insertAdjacentHTML('beforeend',
      '<span class="breadcrumb__sep">›</span><span aria-current="page">' +
      ui.escapar(cat.nome) + '</span>');
  }

  if (elLivros) elLivros.innerHTML = ui.skeletonCards(8);

  ns.buscarPorCategoria(slug, 24)
    .then(function (resultado) {
      livros = resultado || [];
      if (!livros.length) {
        elLivros.innerHTML = ui.estado('Nenhum livro nesta categoria',
          'Ainda não encontramos títulos para exibir.');
        return;
      }
      ordenar();
    })
    .catch(function () {
      if (elLivros) elLivros.innerHTML = ui.estadoErro();
    });

  if (elOrdenar) elOrdenar.addEventListener('change', ordenar);

})(window.ECONOMIZALEITOR);
