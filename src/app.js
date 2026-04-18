/* ── app.js — Bootstrap de la aplicación ── */

$(document).ready(async function () {

  // ── Cursor personalizado ──────────────────────────────────
  const $cursor    = $('#cursor');
  const $cursorDot = $('#cursorDot');
  let mouseX = 0, mouseY = 0;
  let curX = 0, curY = 0;

  $(document).on('mousemove', function(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    $cursorDot.css({ left: mouseX, top: mouseY });
  });

  // Suavizado del cursor grande
  function animCursor() {
    curX += (mouseX - curX) * 0.15;
    curY += (mouseY - curY) * 0.15;
    $cursor.css({ left: curX, top: curY });
    requestAnimationFrame(animCursor);
  }
  animCursor();

  $(document).on('mouseenter', 'a, button, [role="button"]', () => $cursor.addClass('active'));
  $(document).on('mouseleave', 'a, button, [role="button"]', () => $cursor.removeClass('active'));
  $('body').on('mouseleave', () => $cursor.addClass('hidden')).on('mouseenter', () => $cursor.removeClass('hidden'));

  // ── Tema ──────────────────────────────────────────────────
  const savedTheme = localStorage.getItem('hc-theme') || 'dark';
  $('html').attr('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  $('#themeBtn').on('click', function() {
    const current = $('html').attr('data-theme');
    const next    = current === 'dark' ? 'light' : 'dark';
    $('html').attr('data-theme', next);
    localStorage.setItem('hc-theme', next);
    updateThemeIcon(next);
  });

  function updateThemeIcon(theme) {
    if (theme === 'dark') {
      $('.theme-sun').css({ opacity: 0, transform: 'translateY(100%)', position: 'absolute' });
      $('.theme-moon').css({ opacity: 1, transform: 'none', position: '' });
    } else {
      $('.theme-moon').css({ opacity: 0, transform: 'translateY(-100%)', position: 'absolute' });
      $('.theme-sun').css({ opacity: 1, transform: 'none', position: '' });
    }
  }

  // ── Mobile menu ───────────────────────────────────────────
  $('#mobileMenuBtn').on('click', function() {
    $('#mobileNav').toggleClass('open');
  });
  $(document).on('click', function(e) {
    if (!$(e.target).closest('.glass-header').length) $('#mobileNav').removeClass('open');
  });

  // Nav links (cierra mobile nav)
  $(document).on('click', '.mobile-nav .nav-link', () => $('#mobileNav').removeClass('open'));

  // ── Header scroll effect ──────────────────────────────────
  $(window).on('scroll', function() {
    if ($(this).scrollTop() > 20) {
      $('.glass-header').css('border-bottom-color', 'rgba(200,168,75,0.15)');
    } else {
      $('.glass-header').css('border-bottom-color', '');
    }
  });

  // ── Init componentes ──────────────────────────────────────
  Modal.setup();
  Auth.setupDrawerEvents();

  // ── Auth init (comprueba sesión existente) ────────────────
  await Auth.init();

  // Recarga favoritos page si el usuario hace login/logout
  $(document).on('auth:login auth:logout', function() {
    const path = window.location.hash.replace('#', '') || '/';
    if (path.includes('favorites')) Pages.renderFavorites();
  });

  // ── Router init ───────────────────────────────────────────
  Router.init();

  // ── Ocultar loader ────────────────────────────────────────
  setTimeout(() => $('#pageLoader').addClass('hidden'), 900);
});
