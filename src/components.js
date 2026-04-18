/* ── components.js — Componentes reutilizables de UI ── */

const UI = (function() {
  // ── Toast ──────────────────────────────────────────────────
  function toast(msg, type = 'info') {
    const $t = $('<div>').addClass('toast ' + type);
    $t.append($('<span>').addClass('toast-dot'), $('<span>').text(msg));
    $('#toastContainer').append($t);
    setTimeout(() => {
      $t.addClass('out');
      setTimeout(() => $t.remove(), 350);
    }, 3200);
  }

  // ── Badge helper ──────────────────────────────────────────
  function getCategoryClass(cat) {
    const map = { 'Cocktail':'badge-cocktail','Shot':'badge-shot',
      'Ordinary Drink':'badge-ordinary','Punch / Party Drink':'badge-punch',
      'Coffee / Tea':'badge-coffee','Beer':'badge-beer' };
    return map[cat] || 'badge-default';
  }

  // ── Ingredient extractor ──────────────────────────────────
  function getIngredients(drink) {
    const list = [];
    for (let i = 1; i <= 15; i++) {
      const name = drink['strIngredient' + i];
      const measure = drink['strMeasure' + i];
      if (name && name.trim()) list.push({ name: name.trim(), measure: (measure || '').trim() });
    }
    return list;
  }

  // ── Cocktail Card (Liquid Glass) ──────────────────────────
  function buildCard(drink, animDelay = 0) {
    const ings = getIngredients(drink).slice(0, 3).map(i => i.name).join(', ');
    const more = getIngredients(drink).length > 3 ? ' +' + (getIngredients(drink).length - 3) : '';
    const isFav = Auth.isFav(drink.idDrink);

    const $card = $('<article>').addClass('cocktail-card').attr('data-id', drink.idDrink)
      .css('animation-delay', animDelay + 'ms');

    // Image
    const $imgWrap = $('<div>').addClass('card-img-wrap');
    const $img = $('<img>').addClass('card-img')
      .attr({ src: drink.strDrinkThumb + '/preview', alt: drink.strDrink, loading: 'lazy' });

    // Glass overlay
    const $glass = $('<div>').addClass('card-img-glass');
    const $view  = $('<button>').addClass('card-quick-view').text('Ver receta');
    $glass.append($view);

    // Fav button
    const $fav = $('<button>').addClass('card-fav-btn' + (isFav ? ' active' : ''))
      .attr('data-fav-id', drink.idDrink)
      .attr('title', isFav ? 'Quitar de favoritos' : 'Añadir a favoritos')
      .text('♡');

    $imgWrap.append($img, $glass, $fav);

    // Body
    const $body  = $('<div>').addClass('card-body');
    const $brow  = $('<div>').addClass('card-badges');
    const $badge = $('<span>').addClass('badge ' + getCategoryClass(drink.strCategory)).text(drink.strCategory || 'Cóctel');
    const $alc   = $('<span>').addClass('badge badge-alc').text(drink.strAlcoholic === 'Alcoholic' ? '🍸' : '🥤');
    $brow.append($badge, $alc);

    const $name  = $('<h4>').addClass('card-name').text(drink.strDrink);
    const $gls   = $('<p>').addClass('card-glass').text('⌾ ' + (drink.strGlass || ''));
    const $ilist = $('<p>').addClass('card-ings').text(ings + more);

    $body.append($brow, $name, $gls, $ilist);
    $card.append($imgWrap, $body);

    // Fav toggle
    $fav.on('click', async function(e) {
      e.stopPropagation();
      await Auth.toggleFav(drink.idDrink, drink.strDrink, drink.strDrinkThumb);
    });

    // Open modal
    $card.on('click', function() { Modal.open(drink.idDrink); });
    $view.on('click', function(e) { e.stopPropagation(); Modal.open(drink.idDrink); });

    return $card;
  }

  // ── Skeleton cards ─────────────────────────────────────────
  function renderSkeletons($grid, n = 8) {
    $grid.empty();
    for (let i = 0; i < n; i++) {
      const $sk = $('<div>').addClass('skeleton-card');
      $sk.append($('<div>').addClass('ske-img'));
      const $b = $('<div>').addClass('ske-body');
      $b.append(
        $('<div>').addClass('ske-line short'),
        $('<div>').addClass('ske-line'),
        $('<div>').addClass('ske-line mid')
      );
      $sk.append($b);
      $grid.append($sk);
    }
  }

  // ── Render cards into grid ─────────────────────────────────
  function renderCards($grid, drinks) {
    $grid.empty();
    if (!drinks || drinks.length === 0) {
      $grid.append(
        $('<div>').addClass('empty-state').append(
          $('<div>').addClass('empty-icon').text('🍹'),
          $('<h3>').addClass('empty-title').text('No encontramos nada'),
          $('<p>').addClass('empty-sub').text('Prueba con otro nombre, como "Mojito" o "Negroni"')
        )
      );
      return;
    }
    drinks.forEach((d, i) => $grid.append(buildCard(d, i * 65)));
  }

  return { toast, buildCard, renderSkeletons, renderCards, getIngredients, getCategoryClass };
})();

// ── Modal ─────────────────────────────────────────────────────
const Modal = (function() {
  function open(drinkId) {
    $('#modalBody').html($('<div>').addClass('modal-loading').append($('<span>').addClass('spinner')));
    $('#modalBg').addClass('open');
    $('body').addClass('no-scroll');

    API.getById(drinkId).then(drink => {
      if (!drink) { UI.toast('No se pudo cargar el cóctel', 'error'); return; }
      $('#modalBody').html($('<div>').addClass('modal-layout').append(
        buildLeft(drink), buildRight(drink)
      ));
      // Sync fav button
      const $favBtn = $('.modal-fav-btn');
      $favBtn.toggleClass('active', Auth.isFav(drink.idDrink));
      $favBtn.text(Auth.isFav(drink.idDrink) ? '♡ En favoritos' : '♡ Guardar en favoritos');
      $favBtn.on('click', async function() {
        await Auth.toggleFav(drink.idDrink, drink.strDrink, drink.strDrinkThumb);
        const fav = Auth.isFav(drink.idDrink);
        $favBtn.toggleClass('active', fav).text(fav ? '♡ En favoritos' : '♡ Guardar en favoritos');
      });
    });
  }

  function buildLeft(drink) {
    const $wrap = $('<div>').addClass('modal-img-wrap');
    $wrap.append($('<img>').addClass('modal-img').attr({ src: drink.strDrinkThumb, alt: drink.strDrink }));
    $wrap.append($('<p>').addClass('modal-glass-tag').text('🥃 ' + (drink.strGlass || '')));
    $wrap.append($('<button>').addClass('modal-fav-btn').attr('data-fav-id', drink.idDrink).text('♡ Guardar en favoritos'));
    return $wrap;
  }

  function buildRight(drink) {
    const ings = UI.getIngredients(drink);
    const $r   = $('<div>').addClass('modal-right');

    const $badges = $('<div>').addClass('modal-badges');
    $badges.append(
      $('<span>').addClass('badge ' + UI.getCategoryClass(drink.strCategory)).text(drink.strCategory || 'Cóctel'),
      $('<span>').addClass('badge badge-alc').text(drink.strAlcoholic === 'Alcoholic' ? '🍸 Alcohólico' : '🥤 Sin alcohol')
    );

    const $name = $('<h2>').addClass('modal-name').text(drink.strDrink);

    const $ingLabel = $('<p>').addClass('modal-section-label').text('Ingredientes');
    const $ingList  = $('<ul>').addClass('modal-ingredients');
    ings.forEach(ing => {
      const $li = $('<li>').addClass('ing-row');
      $li.append(
        $('<span>').addClass('ing-dot'),
        $('<span>').addClass('ing-name').text(ing.name),
        $('<span>').addClass('ing-measure').text(ing.measure)
      );
      $ingList.append($li);
    });

    const $instrLabel = $('<p>').addClass('modal-section-label').text('Preparación');
    const $instr      = $('<p>').addClass('modal-instructions').text(drink.strInstructions || 'Sin instrucciones.');

    $r.append($badges, $name, $ingLabel, $ingList, $instrLabel, $instr);
    return $r;
  }

  function close() {
    $('#modalBg').removeClass('open');
    $('body').removeClass('no-scroll');
  }

  function setup() {
    $('#modalCloseBtn').on('click', close);
    $('#modalBg').on('click', e => { if ($(e.target).is('#modalBg')) close(); });
    $(document).on('keydown', e => { if (e.key === 'Escape') close(); });
  }

  return { open, close, setup };
})();
