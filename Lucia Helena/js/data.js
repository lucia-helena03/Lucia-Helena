/* ============================================================
   Livômetro — Dados estáticos e mocks
   ============================================================ */

window.LIVOMETRO = window.LIVOMETRO || {};

(function (ns) {
  'use strict';

  /* As 25 categorias. `query` é o termo enviado à API de livros. */
  ns.CATEGORIAS = [
    { slug: 'arte', nome: 'Arte', query: 'arte' },
    { slug: 'autoajuda', nome: 'Autoajuda', query: 'autoajuda' },
    { slug: 'biografia', nome: 'Biografia', query: 'biografia' },
    { slug: 'classicos', nome: 'Clássicos', query: 'classicos da literatura' },
    { slug: 'contos', nome: 'Contos', query: 'contos' },
    { slug: 'didaticos', nome: 'Didáticos', query: 'livros didaticos' },
    { slug: 'fantasia', nome: 'Fantasia', query: 'fantasia' },
    { slug: 'ficcao-cientifica', nome: 'Ficção Científica', query: 'ficcao cientifica' },
    { slug: 'filosofia', nome: 'Filosofia', query: 'filosofia' },
    { slug: 'gastronomia', nome: 'Gastronomia', query: 'gastronomia culinaria' },
    { slug: 'historia', nome: 'História', query: 'historia' },
    { slug: 'infantil', nome: 'Infantil', query: 'livros infantis' },
    { slug: 'juvenil', nome: 'Juvenil', query: 'livros juvenis' },
    { slug: 'literatura-brasileira', nome: 'Literatura Brasileira', query: 'literatura brasileira' },
    { slug: 'negocios', nome: 'Negócios', query: 'negocios' },
    { slug: 'poesia', nome: 'Poesia', query: 'poesia' },
    { slug: 'policial', nome: 'Policial', query: 'romance policial' },
    { slug: 'psicologia', nome: 'Psicologia', query: 'psicologia' },
    { slug: 'quadrinhos', nome: 'Quadrinhos', query: 'quadrinhos hq' },
    { slug: 'religiao', nome: 'Religião', query: 'religiao' },
    { slug: 'romance', nome: 'Romance', query: 'romance' },
    { slug: 'suspense', nome: 'Suspense', query: 'suspense' },
    { slug: 'tecnologia', nome: 'Tecnologia', query: 'tecnologia programacao' },
    { slug: 'terror', nome: 'Terror', query: 'terror horror' },
    { slug: 'viagens', nome: 'Viagens', query: 'viagens' }
  ];

  /* Lojas comparadas (preços são mock). */
  ns.LOJAS = [
    { nome: 'Amazon', dominio: 'amazon.com.br' },
    { nome: 'Mercado Livre', dominio: 'mercadolivre.com.br' },
    { nome: 'Magalu', dominio: 'magazineluiza.com.br' },
    { nome: 'Editora', dominio: 'editora.example.com' }
  ];

  /* Livros em destaque na Home (títulos conhecidos para a API). */
  ns.LIVROS_DESTAQUE = [
    'O Hobbit',
    'Dom Casmurro',
    '1984 George Orwell',
    'O Pequeno Príncipe',
    'A Revolução dos Bichos',
    'Harry Potter e a Pedra Filosofal',
    'Sapiens Uma Breve História da Humanidade',
    'O Poder do Hábito',
    'Cem Anos de Solidão',
    'O Alquimista Paulo Coelho'
  ];

  ns.DESTAQUES_QTD = 8;

  /* ---------- utilitários ---------- */

  function hashTexto(texto) {
    var h = 2166136261;
    for (var i = 0; i < texto.length; i++) {
      h ^= texto.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return Math.abs(h);
  }

  /* RNG determinístico a partir de uma semente. */
  function rng(semente) {
    var estado = semente % 2147483647;
    if (estado <= 0) estado += 2147483646;
    return function () {
      estado = (estado * 16807) % 2147483647;
      return (estado - 1) / 2147483646;
    };
  }

  /* ---------- categorias ---------- */

  ns.getCategoriaPorSlug = function (slug) {
    return ns.CATEGORIAS.find(function (c) { return c.slug === slug; }) || null;
  };

  /* Contagem mock e estável de livros por categoria. */
  ns.contagemCategoria = function (slug) {
    var r = rng(hashTexto(slug));
    return 40 + Math.floor(r() * 260);
  };

  /* ---------- preços ---------- */

  /* Gera preços mock determinísticos para um livro identificado por `chave`. */
  ns.gerarPrecos = function (chave, titulo) {
    var base = hashTexto(String(chave || titulo || 'livro'));
    var r = rng(base);
    var precoBase = 24.9 + Math.floor(r() * 110) + 0.9;

    return ns.LOJAS.map(function (loja, i) {
      var rl = rng(base + i * 7919);
      var variacao = (rl() - 0.5) * 0.35; /* -17% a +17% */
      var preco = precoBase * (1 + variacao);
      var frete = rl() > 0.5 ? 0 : 9.9;
      var slugTitulo = encodeURIComponent(String(titulo || chave || '').trim());
      return {
        loja: loja.nome,
        preco: Math.round(preco * 100) / 100,
        frete: frete,
        disponivel: rl() > 0.08,
        url: 'https://' + loja.dominio + '/busca?q=' + slugTitulo
      };
    });
  };

  ns.melhorPreco = function (precos) {
    var disponiveis = precos.filter(function (p) { return p.disponivel; });
    if (!disponiveis.length) return null;
    return disponiveis.reduce(function (menor, p) {
      return p.preco < menor.preco ? p : menor;
    });
  };

  /* ---------- formatação ---------- */

  ns.formatarPreco = function (valor) {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

})(window.LIVOMETRO);
