/* Página: Diretório de Autores (busca + paginação) */
(function (ns) {
  'use strict';

  var ui = ns.ui;

  ui.montarLayout('autores');

  var POR_PAGINA = (ns.CONFIG && ns.CONFIG.PAGINA_AUTORES) || 24;

  var elForm = document.querySelector('[data-busca-autores]');
  var elAutores = document.querySelector('[data-autores]');
  var elTotal = document.querySelector('[data-total]');
  var elPaginacao = document.querySelector('[data-paginacao]');

  var estado = {
    q: ui.queryParam('q'),
    pagina: 1
  };

  function titulo() {
    return estado.q ? 'Autores: “' + estado.q + '”' : 'Autores';
  }

  function carregar() {
    if (elAutores) elAutores.innerHTML = ui.skeletonCards(8);
    if (elPaginacao) elPaginacao.innerHTML = '';

    /*
     * Sem termo de busca a listagem parte da semente curada de autores
     * (ns.AUTORES_DESTAQUE) — o índice completo do Open Library começa por
     * conjuntos editoriais, não por pessoas. Com termo, a busca alcança o
     * índice inteiro.
     */
    var promessa = estado.q
      ? ns.buscarAutores(estado.q, estado.pagina, POR_PAGINA)
      : ns.autoresDestaque();

    promessa
      .then(function (resultado) {
        var autores = (resultado && resultado.autores) || [];

        if (elTotal) {
          elTotal.textContent = estado.q
            ? (resultado && resultado.total
              ? resultado.total.toLocaleString('pt-BR') + ' autores encontrados'
              : '')
            : 'Autores em destaque — use a busca para ver todos';
        }

        if (!autores.length) {
          if (elAutores) {
            elAutores.innerHTML = ui.estado('Nenhum autor encontrado',
              'Tente outro nome ou grafia diferente.');
          }
          return;
        }

        ui.renderAutorCards(elAutores, autores);
        renderPaginacao(resultado.total || 0);
      })
      .catch(function () {
        if (elAutores) {
          elAutores.innerHTML = ui.estadoErro();
        }
      });
  }

  function renderPaginacao(total) {
    if (!elPaginacao) return;

    var totalPaginas = Math.ceil(total / POR_PAGINA);
    if (totalPaginas <= 1) {
      elPaginacao.innerHTML = '';
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

  /* Busca */
  if (elForm) {
    elForm.q.value = estado.q;
    elForm.addEventListener('submit', function (e) {
      e.preventDefault();
      estado.q = elForm.q.value.trim();
      estado.pagina = 1;
      var url = 'autores.html';
      if (estado.q) url += '?q=' + encodeURIComponent(estado.q);
      window.history.replaceState(null, '', url);
      carregar();
    });
  }

  /* Paginação */
  if (elPaginacao) {
    elPaginacao.addEventListener('click', function (e) {
      var alvo = e.target.closest('button[data-pagina]');
      if (!alvo || alvo.disabled) return;
      estado.pagina = parseInt(alvo.getAttribute('data-pagina'), 10);
      carregar();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  document.title = titulo() + ' — EconomizaLeitor';
  carregar();

})(window.ECONOMIZALEITOR);
