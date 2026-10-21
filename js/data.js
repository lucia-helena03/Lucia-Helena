/* ============================================================
   EconomizaLeitor — Dados estáticos e mocks
   ============================================================ */

window.ECONOMIZALEITOR = window.ECONOMIZALEITOR || {};

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

  /*
   * Autores em destaque — semente da listagem padrão do diretório.
   * O índice de autores do Open Library tem 15 milhões de registros e o topo
   * por número de obras são conjuntos editoriais ("Great Britain", "Anonymous"),
   * não pessoas. A listagem padrão resolve estes nomes e só a busca livre
   * alcança o índice completo.
   */
  ns.AUTORES_DESTAQUE = [
    'Paulo Coelho',
    'Machado de Assis',
    'Clarice Lispector',
    'Jorge Amado',
    'Gabriel García Márquez',
    'George Orwell',
    'Harper Lee',
    'Stephen King',
    'Agatha Christie',
    'Jane Austen',
    'William Shakespeare',
    'Mark Twain',
    'Virginia Woolf',
    'Herman Melville',
    'Ray Bradbury',
    'Mary Shelley',
    'Leo Tolstoy',
    'Fyodor Dostoevsky',
    'Miguel de Cervantes',
    'J. R. R. Tolkien',
    'C. S. Lewis',
    'Aldous Huxley',
    'Ernest Hemingway',
    'Antoine de Saint-Exupéry'
  ];

  /* ---------- configuração ---------- */

  /*
   * Chave opcional da API do Google Books. Sem chave, a cota anônima do
   * Google se esgota e a API responde 429 — a camada de dados detecta isso
   * e passa a usar o Open Library pelo resto da sessão.
   */
  ns.CONFIG = {
    GOOGLE_BOOKS_API_KEY: '',
    LIMITE_CONCORRENCIA: 4,
    PAGINA_LIVROS: 20,
    PAGINA_AUTORES: 24
  };

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

  /* Utilitários compartilhados com o adapter de preços (js/precos.js). */
  ns.util = {
    hash: hashTexto,
    rng: rng
  };

  /* ---------- categorias ---------- */

  ns.getCategoriaPorSlug = function (slug) {
    return ns.CATEGORIAS.find(function (c) { return c.slug === slug; }) || null;
  };

  /* Contagem mock e estável de livros por categoria. */
  ns.contagemCategoria = function (slug) {
    var r = rng(hashTexto(slug));
    return 40 + Math.floor(r() * 260);
  };

  /* ---------- formatação ---------- */

  ns.formatarPreco = function (valor) {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

})(window.ECONOMIZALEITOR);
