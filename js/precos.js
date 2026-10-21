/* ============================================================
   EconomizaLeitor — Adapter de preços
   Os preços são SIMULADOS (dados de demonstração).
   Esta é a única fronteira do site que toca em valores de loja:
   trocar a origem por uma API de afiliados exige alterar apenas
   este arquivo. Nenhuma outra camada conhece a origem do preço.
   ============================================================ */

window.ECONOMIZALEITOR = window.ECONOMIZALEITOR || {};

(function (ns) {
  'use strict';

  var precos = ns.precos = {};

  /* Lojas comparadas (preços são mock). */
  var LOJAS = [
    { nome: 'Amazon', dominio: 'amazon.com.br' },
    { nome: 'Mercado Livre', dominio: 'mercadolivre.com.br' },
    { nome: 'Magalu', dominio: 'magazineluiza.com.br' },
    { nome: 'Editora', dominio: 'editora.example.com' }
  ];

  var PRECO_MINIMO = 24.9;
  var FAIXA_PRECO = 110;           /* 24,90 a 134,90 */
  var VARIACAO = 0.35;             /* ±17% por loja */
  var CHANCE_INDISPONIVEL = 0.08;
  var FRETE_GRATIS = 0;
  var FRETE = 9.9;

  /**
   * Gera a lista de preços de um livro.
   * Determinístico: a mesma chave devolve sempre os mesmos valores.
   *
   * @param {string} chave  identificador estável do livro (id)
   * @param {string} titulo título, usado na URL de destino da loja
   * @returns {Array<{loja:string, preco:number, frete:number, disponivel:boolean, url:string}>}
   */
  precos.obter = function (chave, titulo) {
    var base = ns.util.hash(String(chave || titulo || 'livro'));
    var precoBase = PRECO_MINIMO + Math.floor(ns.util.rng(base)() * FAIXA_PRECO) + 0.9;

    return LOJAS.map(function (loja, i) {
      var r = ns.util.rng(base + i * 7919);
      var variacao = (r() - 0.5) * VARIACAO;
      var preco = precoBase * (1 + variacao);
      var frete = r() > 0.5 ? FRETE_GRATIS : FRETE;
      var slugTitulo = encodeURIComponent(String(titulo || chave || '').trim());
      return {
        loja: loja.nome,
        preco: Math.round(preco * 100) / 100,
        frete: frete,
        disponivel: r() > CHANCE_INDISPONIVEL,
        url: 'https://' + loja.dominio + '/busca?q=' + slugTitulo
      };
    });
  };

  /**
   * Melhor oferta: menor preço entre as lojas com estoque.
   * O frete não entra no cálculo.
   *
   * @param {Array} lista lista devolvida por precos.obter
   * @returns {object|null}
   */
  precos.melhor = function (lista) {
    var disponiveis = (lista || []).filter(function (p) { return p.disponivel; });
    if (!disponiveis.length) return null;
    return disponiveis.reduce(function (menor, p) {
      return p.preco < menor.preco ? p : menor;
    });
  };

  /* Nomes das lojas, para filtros futuros. */
  precos.lojas = LOJAS.map(function (l) { return l.nome; });

})(window.ECONOMIZALEITOR);
