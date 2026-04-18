/* ── pages.js — Renderizado de cada página ── */

const Pages = (function() {

  // ─── HOME ─────────────────────────────────────────────────
  function renderHome() {
    const $app = $('#app');
    $app.empty();

    // Hero
    const $hero = $('<section>').addClass('hero');
    $hero.append(
      $('<div>').addClass('orb orb-1'),
      $('<div>').addClass('orb orb-2'),
      $('<div>').addClass('orb orb-3')
    );

    const $hc = $('<div>').addClass('hero-content').css({ position: 'relative', zIndex: 1 });
    $hc.append(
      $('<p>').addClass('hero-eyebrow').text('Descubre tu próxima copa'),
      $('<h2>').addClass('hero-title').html('El arte de<br><em>la mezcla perfecta</em>'),
      $('<p>').addClass('hero-sub').text('Más de 600 recetas de cócteles en la palma de tu mano')
    );

    // Search bar
    const $sw   = $('<div>').addClass('search-wrap');
    const $sbar = $('<div>').addClass('search-glass');
    const $inp  = $('<input>').attr({ type: 'text', placeholder: 'Busca un cóctel… Mojito, Negroni, Margarita…', id: 'heroSearch', autocomplete: 'off' });
    const $sbtn = $('<button>').addClass('search-submit').text('Buscar');
    $sbar.append($inp, $sbtn);
    const $sdrop = $('<div>').addClass('suggestions-drop').attr('id', 'heroDrop');
    $sw.append($sbar, $sdrop);
    $hc.append($sw);
    $hero.append($hc);

    // Random section
    const $sec  = $('<section>').addClass('section').attr('id', 'randomSection');
    const $head = $('<div>').addClass('section-head');
    const $hl   = $('<div>');
    $hl.append(
      $('<p>').addClass('section-eyebrow').text('Para inspirarte'),
      $('<h3>').addClass('section-title').attr('id', 'sectionTitle').text('Cócteles del momento')
    );
    const $rfBtn = $('<button>').addClass('refresh-btn').attr('id', 'refreshBtn')
      .html('<span class="refresh-icon">↻</span> Nuevos cócteles');
    $head.append($hl, $rfBtn);
    const $grid = $('<div>').addClass('cards-grid').attr('id', 'randomGrid');
    $sec.append($head, $grid);

    $app.append($hero, $sec);
    setupHomeEvents($inp, $sbtn, $sdrop, $grid);
    loadRandomCocktails($grid);
  }

  function setupHomeEvents($inp, $sbtn, $sdrop, $grid) {
    // Search
    function doSearch(q) {
      if (!q.trim()) return;
      Router.navigate('/search?q=' + encodeURIComponent(q.trim()));
    }
    $sbtn.on('click', () => doSearch($inp.val()));
    $inp.on('keydown', e => { if (e.key === 'Enter') doSearch($inp.val()); });

    // Live suggestions
    let timer;
    $inp.on('input', function() {
      clearTimeout(timer);
      const val = $(this).val().trim();
      if (val.length < 2) { $sdrop.empty().removeClass('show'); return; }
      timer = setTimeout(async () => {
        const drinks = await API.searchByName(val);
        $sdrop.empty();
        if (drinks.length) {
          drinks.slice(0, 5).forEach(d => {
            const $item = $('<div>').addClass('sug-item');
            $item.append(
              $('<img>').addClass('sug-thumb').attr({ src: d.strDrinkThumb + '/preview', alt: '' }),
              $('<span>').addClass('sug-name').text(d.strDrink),
              $('<span>').addClass('sug-cat').text(d.strCategory)
            );
            $item.on('click', () => { $inp.val(d.strDrink); doSearch(d.strDrink); });
            $sdrop.append($item);
          });
          $sdrop.addClass('show');
        } else {
          $sdrop.removeClass('show');
        }
      }, 350);
    });
    $(document).on('click', e => {
      if (!$(e.target).closest('.search-wrap').length) $sdrop.removeClass('show');
    });

    // Refresh
    $('#refreshBtn').on('click', () => loadRandomCocktails($grid));
  }

  async function loadRandomCocktails($grid) {
    UI.renderSkeletons($grid, 8);
    const drinks = await API.getRandomBatch(8);
    UI.renderCards($grid, drinks);
  }

  // ─── SEARCH PAGE ──────────────────────────────────────────
  async function renderSearch(query) {
    const $app = $('#app');
    $app.empty();

    const $hero = $('<div>').addClass('search-page-hero');
    const $title = $('<h2>').addClass('search-page-title').text('Explorar cócteles');

    const $sw   = $('<div>').addClass('search-wrap').css('max-width', '560px').css('margin', '0 auto');
    const $sbar = $('<div>').addClass('search-glass');
    const $inp  = $('<input>').attr({ type: 'text', placeholder: 'Buscar…', id: 'searchPageInput', autocomplete: 'off' });
    if (query) $inp.val(query);
    const $sbtn = $('<button>').addClass('search-submit').text('Buscar');
    $sbar.append($inp, $sbtn);
    $sw.append($sbar);

    // Category filters
    const $filters = $('<div>').addClass('search-filters');
    const categories = ['Cocktail','Shot','Ordinary Drink','Punch / Party Drink','Coffee / Tea','Beer'];
    categories.forEach(cat => {
      const $pill = $('<button>').addClass('filter-pill').attr('data-cat', cat).text(cat);
      $pill.on('click', async function() {
        $filters.find('.filter-pill').removeClass('active');
        $(this).addClass('active');
        $inp.val('');
        updateSectionTitle('Categoría: ' + cat);
        UI.renderSkeletons($grid, 8);
        const drinks = await API.searchByCategory(cat);
        UI.renderCards($grid, drinks.slice(0, 24));
      });
      $filters.append($pill);
    });

    $hero.append($title, $sw, $filters);

    const $sec  = $('<section>').addClass('section');
    const $head = $('<div>').addClass('section-head');
    const $hl   = $('<div>');
    $hl.append(
      $('<p>').addClass('section-eyebrow').attr('id', 'searchEyebrow').text(query ? 'Resultados' : 'Aleatorios'),
      $('<h3>').addClass('section-title').attr('id', 'searchTitle').text(query ? '"' + query + '"' : 'Descubre algo nuevo')
    );
    $head.append($hl);
    const $grid = $('<div>').addClass('cards-grid');
    $sec.append($head, $grid);
    $app.append($hero, $sec);

    function updateSectionTitle(title, eyebrow) {
      $('#searchTitle').text(title);
      if (eyebrow) $('#searchEyebrow').text(eyebrow);
    }

    function doSearch(q) {
      if (!q.trim()) return;
      Router.navigate('/search?q=' + encodeURIComponent(q.trim()));
    }
    $sbtn.on('click', () => doSearch($inp.val()));
    $inp.on('keydown', e => { if (e.key === 'Enter') doSearch($inp.val()); });

    // Load results
    if (query) {
      UI.renderSkeletons($grid, 6);
      const drinks = await API.searchByName(query);
      UI.renderCards($grid, drinks);
      updateSectionTitle('"' + query + '"', 'Resultados para');
    } else {
      UI.renderSkeletons($grid, 8);
      const drinks = await API.getRandomBatch(8);
      UI.renderCards($grid, drinks);
    }
  }

  // ─── FAVORITES PAGE ───────────────────────────────────────
  async function renderFavorites() {
    const $app = $('#app');
    $app.empty();

    if (!Auth.isLoggedIn()) {
      const $empty = $('<div>').addClass('favs-empty');
      $empty.append(
        $('<div>').addClass('favs-empty-icon').text('🔒'),
        $('<h2>').addClass('favs-empty-title').text('Inicia sesión'),
        $('<p>').addClass('favs-empty-sub').text('Accede a tu cuenta para ver y gestionar tus cócteles favoritos.'),
        $('<button>').addClass('btn-explore').text('Entrar / Registrarse')
          .on('click', () => Auth.openDrawer('login'))
      );
      $app.append($empty);
      return;
    }

    // Header
    const $head = $('<div>').addClass('favs-hero');
    $head.append(
      $('<h1>').addClass('favs-hero-title').html('Mis <span>favoritos</span>'),
      $('<p>').addClass('favs-count').attr('id', 'favsCount').text('Cargando…')
    );
    const $sec  = $('<section>').addClass('section').css('padding-top', '1rem');
    const $grid = $('<div>').addClass('cards-grid');
    $sec.append($grid);
    $app.append($head, $sec);

    UI.renderSkeletons($grid, 4);
    try {
      const res = await API.getFavorites();
      const favs = res.favorites;
      $('#favsCount').text(favs.length + ' cóctel' + (favs.length !== 1 ? 'es' : '') + ' guardado' + (favs.length !== 1 ? 's' : ''));

      if (favs.length === 0) {
        $grid.html('');
        const $empty = $('<div>').addClass('favs-empty');
        $empty.append(
          $('<div>').addClass('favs-empty-icon').text('🍹'),
          $('<h2>').addClass('favs-empty-title').text('Sin favoritos aún'),
          $('<p>').addClass('favs-empty-sub').text('Explora cócteles y guarda los que más te gusten con el botón ♡.'),
          $('<button>').addClass('btn-explore').text('Explorar cócteles')
            .on('click', () => Router.navigate('/search'))
        );
        $sec.html($empty);
        return;
      }

      // Build mini-cards from stored data (sin llamar a la API)
      $grid.empty();
      favs.forEach((fav, i) => {
        const $card = $('<article>').addClass('cocktail-card').attr('data-id', fav.cocktail_id)
          .css('animation-delay', (i * 65) + 'ms');

        const $imgWrap = $('<div>').addClass('card-img-wrap');
        $imgWrap.append($('<img>').addClass('card-img').attr({ src: fav.thumb_url + '/preview', alt: fav.cocktail_name, loading: 'lazy' }));

        const $glass = $('<div>').addClass('card-img-glass');
        $glass.append($('<button>').addClass('card-quick-view').text('Ver receta'));
        const $fav = $('<button>').addClass('card-fav-btn active')
          .attr({ 'data-fav-id': fav.cocktail_id, title: 'Quitar de favoritos' }).text('♡');
        $imgWrap.append($glass, $fav);

        const $body = $('<div>').addClass('card-body');
        $body.append($('<h4>').addClass('card-name').text(fav.cocktail_name));
        $body.append($('<p>').addClass('card-ings card-glass').text('Guardado ' + new Date(fav.added_at).toLocaleDateString('es-ES')));

        $card.append($imgWrap, $body);

        $fav.on('click', async e => {
          e.stopPropagation();
          await Auth.toggleFav(fav.cocktail_id, fav.cocktail_name, fav.thumb_url);
          if (!Auth.isFav(fav.cocktail_id)) {
            $card.css({ opacity: 0, transform: 'scale(.9)' });
            setTimeout(() => { $card.remove(); updateFavCount(); }, 300);
          }
        });
        $card.on('click', () => Modal.open(fav.cocktail_id));

        $grid.append($card);
      });
    } catch (_) {
      UI.renderCards($grid, []);
    }

    function updateFavCount() {
      const n = $grid.find('.cocktail-card').length;
      $('#favsCount').text(n + ' cóctel' + (n !== 1 ? 'es' : '') + ' guardado' + (n !== 1 ? 's' : ''));
    }
  }

  // ─── 404 ──────────────────────────────────────────────────
  function render404() {
    $('#app').html(
      $('<div>').addClass('favs-empty').append(
        $('<div>').addClass('favs-empty-icon').text('🍸'),
        $('<h2>').addClass('favs-empty-title').text('Página no encontrada'),
        $('<p>').addClass('favs-empty-sub').text('Parece que esta copa no está en la carta.'),
        $('<button>').addClass('btn-explore').text('Volver al inicio').on('click', () => Router.navigate('/'))
      )
    );
  }

  return { renderHome, renderSearch, renderFavorites, render404 };
})();
