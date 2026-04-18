/* ── router.js — SPA hash router ── */

const Router = (function() {
  const routes = [
    { pattern: /^\/$|^$|^#\/?$/,              page: 'home',      handler: () => Pages.renderHome() },
    { pattern: /^\/search/,                    page: 'search',    handler: (p) => {
        const q = new URLSearchParams(p.split('?')[1] || '').get('q') || '';
        Pages.renderSearch(q);
      }
    },
    { pattern: /^\/favorites/,                page: 'favorites', handler: () => Pages.renderFavorites() },
    { pattern: /^\/cocktail\/(.+)/,           page: 'home',      handler: (p) => {
        const id = p.split('/cocktail/')[1];
        Pages.renderHome();
        setTimeout(() => Modal.open(id), 400);
      }
    },
  ];

  function getPath() {
    const hash = window.location.hash.replace(/^#/, '') || '/';
    return hash;
  }

  function resolve() {
    const path = getPath();
    for (const route of routes) {
      if (route.pattern.test(path)) {
        updateActiveNav(route.page);
        route.handler(path);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }
    Pages.render404();
  }

  function navigate(path) {
    window.location.hash = path;
  }

  function updateActiveNav(page) {
    $('.header-nav .nav-link').removeClass('active');
    $(`.header-nav .nav-link[data-page="${page}"]`).addClass('active');
  }

  function init() {
    $(window).on('hashchange', resolve);
    resolve();
  }

  return { init, navigate };
})();
