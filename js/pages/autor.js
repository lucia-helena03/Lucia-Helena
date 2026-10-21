/* Página: Detalhe do Autor (?id=OL...A&nome=) */
(function (ns) {
  'use strict';

  var ui = ns.ui;

  ui.montarLayout('autores');

  var elBreadcrumb = document.querySelector('[data-breadcrumb]');
  var elAutor = document.querySelector('[data-autor]');
  var elLivros = document.querySelector('[data-livros]');

  var id = ui.queryParam('id');
  var nome = ui.queryParam('nome');

  function erro(titulo, texto) {
    if (elAutor) {
      elAutor.innerHTML = '<div style="grid-column:1/-1">' +
        ui.estado(titulo, texto) + '</div>';
    }
  }

  /* Sem id: tenta resolver pela busca de autores. */
  function resolverId() {
    if (id) return Promise.resolve(id);
    if (!nome) return Promise.reject(new Error('sem id'));
    return ns.buscarAutores(nome, 1, 1).then(function (resultado) {
      var lista = (resultado && resultado.autores) || [];
      if (!lista.length) throw new Error('autor não encontrado');
      return lista[0].key;
    });
  }

  function renderCabecalho(autor) {
    var nome = ui.escapar(autor.nome);

    var foto = autor.foto
      ? '<img class="autor__foto" src="' + ui.escapar(autor.foto) + '" alt="Foto de ' + nome + '">'
      : '<div class="autor__foto autor__foto--fallback" aria-hidden="true">' +
        ui.escapar((autor.nome || '?').charAt(0).toUpperCase()) + '</div>';

    var datas = [];
    if (autor.nascimento) datas.push(ui.escapar(autor.nascimento));
    if (autor.morte) datas.push(ui.escapar(autor.morte));
    var blocoDatas = datas.length
      ? '<p class="autor__datas">' + datas.join(' – ') + '</p>'
      : '';

    var metricas = [];
    if (autor.obras) metricas.push(autor.obras + (autor.obras === 1 ? ' obra' : ' obras'));
    if (autor.nota) metricas.push('Nota média ' + autor.nota.toFixed(1));
    if (autor.avaliacoes) metricas.push(autor.avaliacoes.toLocaleString('pt-BR') + ' avaliações');
    var blocoMetricas = metricas.length
      ? '<ul class="autor__metricas">' + metricas.map(function (m) {
        return '<li>' + ui.escapar(m) + '</li>';
      }).join('') + '</ul>'
      : '';

    var blocoBio = autor.bio
      ? '<div class="autor__bio">' + autor.bio.split(/\n+/).filter(function (p) { return p.trim(); })
        .map(function (p) { return '<p>' + ui.escapar(p.trim()) + '</p>'; }).join('') + '</div>'
      : '<p class="autor__bio">Biografia não disponível para este autor.</p>';

    var links = (autor.links || []).length
      ? '<ul class="autor__links">' + autor.links.map(function (l) {
        return '<li><a href="' + ui.escapar(l.url) + '" target="_blank" rel="noopener nofollow">' +
          ui.escapar(l.title) + '</a></li>';
      }).join('') + '</ul>'
      : '';

    var alternativo = (autor.nomesAlternativos || []).length
      ? '<p class="autor__alternativos">Também conhecido como: ' +
        ui.escapar(autor.nomesAlternativos.slice(0, 4).join(', ')) + '</p>'
      : '';

    return '' +
      '<div class="autor__cabecalho">' +
        foto +
        '<div>' +
          '<h1 class="autor__nome">' + nome + '</h1>' +
          blocoDatas +
          alternativo +
          blocoMetricas +
          blocoBio +
          links +
        '</div>' +
      '</div>';
  }

  function render(autor) {
    document.title = autor.nome + ' — EconomizaLeitor';

    if (elBreadcrumb) {
      elBreadcrumb.innerHTML = ui.breadcrumb([
        { label: 'Home', href: 'index.html' },
        { label: 'Autores', href: 'autores.html' },
        { label: autor.nome }
      ]);
    }

    if (elAutor) {
      elAutor.innerHTML = renderCabecalho(autor) +
        '<section class="autor__obras">' +
          '<h2 class="section__title">Livros de ' + ui.escapar(autor.nome) + '</h2>' +
          '<div class="grid grid--cards" data-livros aria-live="polite"></div>' +
        '</section>';
      elLivros = document.querySelector('[data-livros]');
    }

    carregarLivros(autor);
  }

  function carregarLivros(autor) {
    if (!elLivros) return;
    elLivros.innerHTML = ui.skeletonCards(4);

    ns.buscarLivrosPorAutor(autor.nome, (ns.CONFIG && ns.CONFIG.PAGINA_AUTORES) || 24)
      .then(function (livros) {
        if (!livros.length) {
          elLivros.innerHTML = ui.estado('Nenhum livro encontrado',
            'Não encontramos títulos cadastrados para este autor.');
          return;
        }
        ui.renderCards(elLivros, livros);
      })
      .catch(function () {
        elLivros.innerHTML = ui.estadoErro();
      });
  }

  if (!id && !nome) {
    erro('Autor não informado', 'Volte para o diretório de autores e escolha um nome.');
    return;
  }

  resolverId()
    .then(function (chave) {
      id = chave;
      return ns.buscarAutorPorId(id, nome);
    })
    .then(render)
    .catch(function () {
      erro('Autor não encontrado',
        'Não conseguimos carregar este autor. Tente novamente pela busca.');
    });

})(window.ECONOMIZALEITOR);
