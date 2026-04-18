/* ── auth.js — Gestión de sesión y drawer de auth ── */

const Auth = (function() {
  let currentUser = null;
  let userFavIds  = new Set(); // IDs de cócteles favoritos del usuario actual

  // ── Estado ─────────────────────────────────────────────────
  function getUser()   { return currentUser; }
  function isLoggedIn(){ return currentUser !== null; }
  function getFavIds() { return userFavIds; }
  function isFav(id)   { return userFavIds.has(String(id)); }

  // ── Inicializar sesión al cargar ───────────────────────────
  async function init() {
    try {
      const res = await API.getMe();
      currentUser = res.user;
      await loadFavIds();
    } catch (_) {
      currentUser = null;
    }
    renderAuthArea();
  }

  async function loadFavIds() {
    if (!currentUser) { userFavIds = new Set(); return; }
    try {
      const res = await API.getFavorites();
      userFavIds = new Set(res.favorites.map(f => String(f.cocktail_id)));
    } catch (_) { userFavIds = new Set(); }
  }

  // ── Render área de auth en el header ──────────────────────
  function renderAuthArea() {
    const $area = $('#authArea');
    $area.empty();
    if (!currentUser) {
      const $login = $('<button>').addClass('btn-login').text('Entrar');
      const $reg   = $('<button>').addClass('btn-register').text('Registrarse');
      $login.on('click', () => openDrawer('login'));
      $reg.on('click',   () => openDrawer('register'));
      $area.append($login, $reg);
    } else {
      const initials = currentUser.username.slice(0, 2).toUpperCase();
      const $wrap   = $('<div>').css('position', 'relative');
      const $avatar = $('<button>').addClass('user-avatar-btn').text(initials).attr('title', currentUser.username);
      const $menu   = $('<div>').addClass('user-menu');

      const $favItem  = buildMenuItem('♡ Mis favoritos',   () => { Router.navigate('/favorites'); $menu.removeClass('open'); });
      const $outItem  = buildMenuItem('Cerrar sesión', () => doLogout(), true);
      $menu.append($favItem, $outItem);

      $avatar.on('click', e => { e.stopPropagation(); $menu.toggleClass('open'); });
      $(document).on('click.usermenu', () => $menu.removeClass('open'));
      $wrap.append($avatar, $menu);
      $area.append($wrap);
    }
  }

  function buildMenuItem(label, fn, danger = false) {
    const $btn = $('<button>').addClass('user-menu-item' + (danger ? ' danger' : '')).text(label);
    $btn.on('click', fn);
    return $btn;
  }

  // ── Auth Drawer ────────────────────────────────────────────
  function openDrawer(mode) {
    renderDrawer(mode);
    $('#drawerBg').addClass('open');
    $('body').addClass('no-scroll');
  }
  function closeDrawer() {
    $('#drawerBg').removeClass('open');
    $('body').removeClass('no-scroll');
  }

  function renderDrawer(mode) {
    const $c = $('#drawerContent');
    $c.empty();

    const $logo = $('<div>').addClass('auth-logo').html(
      `<span class="auth-logo-hex">⬡</span><span class="auth-logo-name">HelpCoctel</span>`
    );

    if (mode === 'login') {
      $c.append($logo, buildLoginForm());
    } else {
      $c.append($logo, buildRegisterForm());
    }
  }

  function buildLoginForm() {
    const $wrap = $('<div>');
    $wrap.append(
      $('<h2>').addClass('auth-title').text('Bienvenido de nuevo'),
      $('<p>').addClass('auth-sub').text('Accede a tu cuenta para gestionar tus favoritos.')
    );

    const $email    = formField('email', 'Email', 'email', 'tu@email.com');
    const $password = formField('password', 'Contraseña', 'password', '••••••');
    const $errMsg   = $('<p>').addClass('form-error').attr('id', 'loginError');
    const $btn      = $('<button>').addClass('btn-primary').attr('id', 'loginBtn').text('Entrar');
    const $switch   = $('<p>').addClass('auth-switch').html('¿No tienes cuenta? <a href="#">Regístrate</a>');

    $switch.find('a').on('click', e => { e.preventDefault(); renderDrawer('register'); });
    $btn.on('click', () => doLogin($email.find('input').val(), $password.find('input').val(), $errMsg, $btn));

    // Enter key
    $wrap.on('keydown', e => { if (e.key === 'Enter') $btn.trigger('click'); });

    $wrap.append($email, $password, $errMsg, $btn, $('<div>').addClass('auth-divider').html('<span>o</span>'), $switch);
    return $wrap;
  }

  function buildRegisterForm() {
    const $wrap = $('<div>');
    $wrap.append(
      $('<h2>').addClass('auth-title').text('Crea tu cuenta'),
      $('<p>').addClass('auth-sub').text('Guarda tus cócteles favoritos y crea tu colección personal.')
    );

    const $name     = formField('username', 'Nombre de usuario', 'text', 'micoctelero');
    const $email    = formField('email', 'Email', 'email', 'tu@email.com');
    const $password = formField('password', 'Contraseña', 'password', 'Mín. 6 caracteres');
    const $errMsg   = $('<p>').addClass('form-error').attr('id', 'registerError');
    const $btn      = $('<button>').addClass('btn-primary').attr('id', 'registerBtn').text('Crear cuenta');
    const $switch   = $('<p>').addClass('auth-switch').html('¿Ya tienes cuenta? <a href="#">Inicia sesión</a>');

    $switch.find('a').on('click', e => { e.preventDefault(); renderDrawer('login'); });
    $btn.on('click', () => doRegister(
      $name.find('input').val(), $email.find('input').val(),
      $password.find('input').val(), $errMsg, $btn
    ));

    $wrap.append($name, $email, $password, $errMsg, $btn, $('<div>').addClass('auth-divider').html('<span>o</span>'), $switch);
    return $wrap;
  }

  function formField(id, label, type, placeholder) {
    return $('<div>').addClass('form-group').append(
      $('<label>').addClass('form-label').attr('for', 'field-' + id).text(label),
      $('<input>').addClass('form-input').attr({ type, id: 'field-' + id, placeholder })
    );
  }

  // ── Auth actions ───────────────────────────────────────────
  async function doLogin(email, password, $err, $btn) {
    $err.hide(); $btn.prop('disabled', true).text('Entrando...');
    try {
      const res = await API.login(email, password);
      currentUser = res.user;
      await loadFavIds();
      renderAuthArea();
      closeDrawer();
      UI.toast('¡Bienvenido, ' + currentUser.username + '!', 'success');
      $(document).trigger('auth:login');
    } catch (err) {
      const msg = err.responseJSON?.error || 'Error iniciando sesión';
      $err.text(msg).show();
    } finally {
      $btn.prop('disabled', false).text('Entrar');
    }
  }

  async function doRegister(username, email, password, $err, $btn) {
    $err.hide(); $btn.prop('disabled', true).text('Creando cuenta...');
    try {
      const res = await API.register(username, email, password);
      currentUser = res.user;
      await loadFavIds();
      renderAuthArea();
      closeDrawer();
      UI.toast('¡Cuenta creada! Bienvenido, ' + currentUser.username, 'success');
      $(document).trigger('auth:login');
    } catch (err) {
      const msg = err.responseJSON?.error || 'Error creando la cuenta';
      $err.text(msg).show();
    } finally {
      $btn.prop('disabled', false).text('Crear cuenta');
    }
  }

  async function doLogout() {
    try { await API.logout(); } catch (_) {}
    currentUser = null;
    userFavIds  = new Set();
    renderAuthArea();
    UI.toast('Sesión cerrada', 'info');
    $(document).trigger('auth:logout');
    Router.navigate('/');
  }

  // ── Toggle fav (card y modal) ──────────────────────────────
  async function toggleFav(cocktailId, cocktailName, thumbUrl) {
    if (!isLoggedIn()) {
      openDrawer('login');
      UI.toast('Inicia sesión para guardar favoritos', 'info');
      return false;
    }
    const id = String(cocktailId);
    try {
      if (isFav(id)) {
        await API.removeFavorite(id);
        userFavIds.delete(id);
        UI.toast('Eliminado de favoritos', 'info');
      } else {
        await API.addFavorite(id, cocktailName, thumbUrl);
        userFavIds.add(id);
        UI.toast('Añadido a favoritos ♡', 'success');
      }
      // Actualiza todos los botones de fav con ese id
      $('[data-fav-id="' + id + '"]').toggleClass('active', isFav(id));
      return true;
    } catch (err) {
      const msg = err.responseJSON?.error || 'Error actualizando favoritos';
      UI.toast(msg, 'error');
      return false;
    }
  }

  // ── Setup eventos globales del drawer ──────────────────────
  function setupDrawerEvents() {
    $('#drawerCloseBtn').on('click', closeDrawer);
    $('#drawerBg').on('click', e => { if ($(e.target).is('#drawerBg')) closeDrawer(); });
    $(document).on('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
  }

  return { init, getUser, isLoggedIn, getFavIds, isFav, toggleFav, openDrawer, closeDrawer, setupDrawerEvents, loadFavIds };
})();
