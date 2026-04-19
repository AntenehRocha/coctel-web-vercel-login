/* ── api.js — Centraliza todas las llamadas HTTP ── */

const API = (function() {
  const COCKTAIL_DB = 'https://www.thecocktaildb.com/api/json/v1/1';
  const BACKEND =
    (window.__HC_BACKEND__ && String(window.__HC_BACKEND__).trim()) ||
    (localStorage.getItem('hc-backend') || '').trim() ||
    'http://localhost:3001';

  // ── Token JWT (fallback cuando las cookies cross-origin no llegan) ──
  // El backend devuelve el token en la respuesta Y lo setea como cookie.
  // Lo guardamos en memoria (no localStorage, más seguro) como respaldo.
  let _memToken = null;

  function setToken(t)  { _memToken = t; }
  function clearToken() { _memToken = null; }
  function getAuthHeaders() {
    return _memToken ? { Authorization: 'Bearer ' + _memToken } : {};
  }

  // ── CocktailDB ─────────────────────────────────────────────
  async function getRandom() {
    const res = await $.ajax({
      url: COCKTAIL_DB + '/random.php',
      dataType: 'json',
      cache: false,
      data: { _r: Date.now() + '_' + Math.random() }
    });
    return res.drinks[0];
  }

  async function getRandomBatch(n = 8) {
    const promises = [];
    for (let i = 0; i < n; i++) {
      promises.push(
        $.ajax({ url: COCKTAIL_DB + '/random.php', dataType: 'json', cache: false,
                 data: { _r: Date.now() + '_' + i + '_' + Math.random() } })
      );
    }
    const results = await Promise.all(promises);
    const drinks  = results.map(r => r.drinks[0]);
    // Dedup
    const seen = new Set();
    return drinks.filter(d => { if (seen.has(d.idDrink)) return false; seen.add(d.idDrink); return true; });
  }

  async function searchByName(query) {
    const res = await $.getJSON(COCKTAIL_DB + '/search.php', { s: query });
    return res.drinks || [];
  }

  async function getById(id) {
    const res = await $.getJSON(COCKTAIL_DB + '/lookup.php', { i: id });
    return res.drinks ? res.drinks[0] : null;
  }

  async function searchByCategory(category) {
    const res = await $.getJSON(COCKTAIL_DB + '/filter.php', { c: category });
    const list = res.drinks || [];
    if (list.length === 0) return [];
    const ids = list.slice(0, 24).map(d => d.idDrink);
    const full = await Promise.all(ids.map(id => getById(id).catch(() => null)));
    return full.filter(Boolean);
  }

  async function getCategories() {
    const res = await $.getJSON(COCKTAIL_DB + '/list.php', { c: 'list' });
    return res.drinks || [];
  }

  // ── Backend ────────────────────────────────────────────────
  async function backendRequest(method, path, data) {
    return $.ajax({
      url: BACKEND + path,
      method,
      contentType: 'application/json',
      data: data ? JSON.stringify(data) : undefined,
      xhrFields:   { withCredentials: true },  // envía cookies
      headers:     getAuthHeaders(),            // fallback Bearer token
    });
  }

  // ── Auth ───────────────────────────────────────────────────
  async function register(username, email, password) {
    const res = await backendRequest('POST', '/auth/register', { username, email, password });
    if (res.token) setToken(res.token);
    return res;
  }
  async function login(email, password) {
    const res = await backendRequest('POST', '/auth/login', { email, password });
    if (res.token) setToken(res.token);
    return res;
  }
  async function logout() {
    clearToken();
    return backendRequest('POST', '/auth/logout');
  }
  async function getMe() {
    return backendRequest('GET', '/auth/me');
  }

  // ── Favorites ──────────────────────────────────────────────
  async function getFavorites() {
    return backendRequest('GET', '/favorites');
  }
  async function addFavorite(cocktailId, cocktailName, thumbUrl) {
    return backendRequest('POST', '/favorites', { cocktail_id: cocktailId, cocktail_name: cocktailName, thumb_url: thumbUrl });
  }
  async function removeFavorite(cocktailId) {
    return backendRequest('DELETE', '/favorites/' + cocktailId);
  }
  async function checkFavorite(cocktailId) {
    return backendRequest('GET', '/favorites/check/' + cocktailId);
  }

  return {
    getRandom, getRandomBatch, searchByName, getById, searchByCategory, getCategories,
    register, login, logout, getMe,
    getFavorites, addFavorite, removeFavorite, checkFavorite
  };
})();
