/*!
 * SM Filter — collection
 * Server-backed category filtering for Squarespace blog collections.
 *
 * Any link pointing at the current collection path becomes an instant filter:
 * the category pills already printed on each post, a hand-written row of
 * buttons, an inline text link, anything. No archive block, no category
 * source to configure, nothing that deselects when a site is duplicated.
 *
 * Filtering is done by Squarespace, not in the browser, so it covers every
 * post in the collection and not just the ones currently loaded. That means it
 * stays correct alongside paginated "load more".
 *
 * Usage (Settings > Advanced > Code Injection > Footer):
 *   <script src="https://cdn.jsdelivr.net/gh/StudioMesa/sm-filter@main/collection.js" defer></script>
 *
 * Optional config, declared BEFORE the script tag:
 *   <script>window.SM_FILTER = { clearLabel: 'Show all' };</script>
 *
 * Fires `sm:list-replaced` on document after each swap, so a pagination
 * script can rebind. Degrades to ordinary navigation on any failure.
 */
(function () {
  'use strict';

  var DEFAULTS = {
    list: '.collection-content-wrapper',
    param: 'category',
    clearBar: true,
    clearLabel: 'Clear',
    scroll: true,
    debug: false
  };

  var cfg = {}, k;
  for (k in DEFAULTS) if (Object.prototype.hasOwnProperty.call(DEFAULTS, k)) cfg[k] = DEFAULTS[k];
  var user = window.SM_FILTER || {};
  for (k in user) if (Object.prototype.hasOwnProperty.call(user, k)) cfg[k] = user[k];

  var BASE = location.pathname;
  var list, listIndex, busy = false;

  function all(root, sel) { return [].slice.call(root.querySelectorAll(sel)); }

  function log() {
    if (cfg.debug && window.console) console.log.apply(console, ['[sm-filter]'].concat([].slice.call(arguments)));
  }

  function current() {
    return new URLSearchParams(location.search).get(cfg.param) || '';
  }

  function clean(node) {
    // Squarespace's animation observer runs once at load, so nodes added later
    // never get observed and can sit at opacity 0 forever.
    node.removeAttribute('data-animation-role');
    all(node, '[data-animation-role]').forEach(function (n) { n.removeAttribute('data-animation-role'); });
    return node;
  }

  function hydrate(scope) {
    // Lazy-loaded images are only handed to ImageLoader at page load.
    all(scope, 'img[data-src]').forEach(function (img) {
      if (window.ImageLoader) window.ImageLoader.load(img, { load: true });
      else if (!img.getAttribute('src')) img.src = img.getAttribute('data-src');
      img.classList.add('loaded');
      img.classList.remove('loading');
    });
    try { window.dispatchEvent(new Event('resize')); } catch (e) {}
  }

  /* Mark filter links outside the list. Pills inside it are skipped: when a
     filter is active every visible row shares that category, so lighting them
     all up is noise. */
  function mark() {
    var active = current();
    all(document, 'a[href]').forEach(function (a) {
      if (list.contains(a)) return;

      var u;
      try { u = new URL(a.href, location.href); } catch (e) { return; }
      if (u.origin !== location.origin || u.pathname !== BASE) return;
      if ((a.getAttribute('href') || '').indexOf('offset=') !== -1) return;

      if ((u.searchParams.get(cfg.param) || '') === active) {
        a.classList.add('sm-filter--active');
        a.setAttribute('aria-current', 'page');
      } else {
        a.classList.remove('sm-filter--active');
        a.removeAttribute('aria-current');
      }
    });
  }

  /* Shown only while a filter is active, so the default view stays clean. */
  function bar() {
    if (!cfg.clearBar) return;

    var cat = current();
    var existing = document.querySelector('.sm-filter-bar');

    if (!cat) {
      if (existing) existing.parentNode.removeChild(existing);
      return;
    }

    var el = existing || document.createElement('div');
    el.className = 'sm-filter-bar';
    while (el.firstChild) el.removeChild(el.firstChild);

    var label = document.createElement('span');
    label.className = 'sm-filter-bar__label';
    label.textContent = cat;   // textContent, never innerHTML: this came from the URL

    var clear = document.createElement('a');
    clear.className = 'sm-filter-bar__clear';
    clear.href = BASE;
    clear.textContent = cfg.clearLabel;

    el.appendChild(label);
    el.appendChild(clear);

    if (!existing) list.parentNode.insertBefore(el, list);
  }

  function go(url, push) {
    if (busy) return;
    busy = true;
    list.classList.add('is-filtering');
    log('fetching', url);

    fetch(url, { credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var lists = all(doc, cfg.list);
        var fresh = lists[listIndex] || lists[0];
        if (!fresh) throw new Error('no list in fetched page');

        if (push) history.pushState({ sm: 1 }, '', url);

        while (list.firstChild) list.removeChild(list.firstChild);
        [].slice.call(fresh.children).forEach(function (node) {
          list.appendChild(clean(document.importNode(node, true)));
        });
        hydrate(list);

        bar();
        mark();
