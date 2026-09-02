/*!
 * SM Filter — list
 * Category filtering for Squarespace blog collections, without page reloads.
 *
 * Triggers are authored by NAME, not by URL:
 *
 *   <div class="sm-cats">
 *     <button type="button" data-category="">All</button>
 *     <button type="button" data-category="Opinion">Opinion</button>
 *   </div>
 *
 * No URLs to author: the script builds its own request URL from the name, so
 * there is no path to keep in sync. Squarespace's own category pills still
 * work as triggers too — only the name is read off them.
 *
 * Filtering happens on the server, so it covers every post in the collection,
 * not just the ones loaded. That keeps it correct alongside "load more".
 *
 * Usage (Settings > Advanced > Code Injection > Footer):
 *   <script src="https://cdn.jsdelivr.net/gh/StudioMesa/sm-filter@main/list.js" defer></script>
 *
 * Optional config, declared BEFORE the script tag:
 *   <script>window.SM_FILTER = { prefetch: false };</script>
 *
 * Fires `sm:list-replaced` on document after each swap so a pagination script
 * can rebind.
 */
(function () {
  'use strict';

  var DEFAULTS = {
    list: '.collection-content-wrapper',
    param: 'category',
    trigger: '[data-category]',
    activeClass: 'is-active',
    pills: true,        // treat Squarespace's own category pills as triggers
    history: true,      // update the address bar so filters are shareable
    lite: true,         // request format=main-content (about half the bytes)
    prefetch: true,     // warm the cache on hover and keyboard focus
    scroll: true,
    debug: false
  };

  var cfg = {}, k;
  for (k in DEFAULTS) if (Object.prototype.hasOwnProperty.call(DEFAULTS, k)) cfg[k] = DEFAULTS[k];
  var user = window.SM_FILTER || {};
  for (k in user) if (Object.prototype.hasOwnProperty.call(user, k)) cfg[k] = user[k];

  var PILL = 'a[href*="' + cfg.param + '="]';
  var list, listIndex, busy = false;
  var cache = {}, inflight = {};

  function all(root, sel) { return [].slice.call(root.querySelectorAll(sel)); }

  function log() {
    if (cfg.debug && window.console) console.log.apply(console, ['[sm-filter]'].concat([].slice.call(arguments)));
  }

  function active() {
    return new URLSearchParams(location.search).get(cfg.param) || '';
  }

  /* Shown in the address bar. */
  function displayUrl(cat) {
    return location.pathname + (cat ? '?' + cfg.param + '=' + encodeURIComponent(cat) : '');
  }

  /* Actually requested. `lite` asks Squarespace for the content fragment. */
  function fetchUrl(cat, lite) {
    var q = [];
    if (cat) q.push(cfg.param + '=' + encodeURIComponent(cat));
    if (lite) q.push('format=main-content');
    return location.pathname + (q.length ? '?' + q.join('&') : '');
  }

  function catOf(el) {
    if (el.hasAttribute('data-category')) return el.getAttribute('data-category') || '';
    try {
      return new URL(el.href, location.href).searchParams.get(cfg.param) || '';
    } catch (e) { return ''; }
  }

  function clean(node) {
    // Squarespace's animation observer runs once at load, so nodes added later
    // are never observed and can sit at opacity 0 forever.
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

  function grab(url) {
    return fetch(url, { credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var lists = all(doc, cfg.list);
        var el = lists[listIndex] || lists[0];
        if (!el) throw new Error('no list in response');
        return el;
      });
  }

  /* One request per category per page view; repeat visits are instant. */
  function fetchList(cat) {
    if (cache[cat]) return Promise.resolve(cache[cat]);
    if (inflight[cat]) return inflight[cat];

    var p = grab(fetchUrl(cat, cfg.lite))
      .catch(function (err) {
        // format=main-content is undocumented. If it ever stops returning the
        // list, fall back to the full page rather than failing outright.
        if (!cfg.lite) throw err;
        log('lite fetch failed, retrying full page', err);
        return grab(fetchUrl(cat, false));
      })
      .then(function (el) {
        cache[cat] = el;
        delete inflight[cat];
        return el;
      }, function (err) {
        delete inflight[cat];
        throw err;
      });

    inflight[cat] = p;
    return p;
  }

  function prefetch(el) {
    if (!cfg.prefetch) return;
    var cat = catOf(el);
    if (cache[cat] || inflight[cat]) return;
    log('prefetching', cat || '(all)');
    fetchList(cat).catch(function () {});
  }

  /* Mark triggers outside the list. Pills inside it are skipped: once a filter
     is on, every visible row shares that category, so lighting them all is noise. */
  function mark() {
    var cur = active();
    all(document, cfg.trigger).forEach(function (el) {
      if (list && list.contains(el)) return;
      var on = catOf(el) === cur;
      el.classList[on ? 'add' : 'remove'](cfg.activeClass);
      // Buttons are toggles, links are navigation. Announce each correctly.
      if (el.tagName === 'BUTTON') el.setAttribute('aria-pressed', on ? 'true' : 'false');
      else if (on) el.setAttribute('aria-current', 'page');
      else el.removeAttribute('aria-current');
    });
  }

  function go(cat, push) {
    if (busy) return;
    busy = true;

    var warm = !!cache[cat];
    if (!warm) list.classList.add('is-filtering');
    log('filtering to', cat || '(all)', warm ? '(cached)' : '');

    fetchList(cat)
      .then(function (fresh) {
        if (cfg.history && push) history.pushState({ smCat: cat }, '', displayUrl(cat));

        while (list.firstChild) list.removeChild(list.firstChild);
        [].slice.call(fresh.children).forEach(function (node) {
          list.appendChild(clean(document.importNode(node, true)));
        });
        hydrate(list);
        mark();

        busy = false;
        list.classList.remove('is-filtering');

        try {
          document.dispatchEvent(new CustomEvent('sm:list-replaced', {
            detail: { list: list, category: cat }
          }));
        } catch (e) { log('event failed', e); }

        if (cfg.scroll && list.getBoundingClientRect().top < 0) {
          var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          list.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        }
      })
      .catch(function (err) {
        log('failed', err);
        busy = false;
        list.classList.remove('is-filtering');
        // Fall back to a real navigation only on the live site. Inside the
        // Squarespace editor the page runs in an iframe, and navigating there
        // bounces a logged-in owner to /config, which reads as a redirect bug.
        if (window.self === window.top) location.href = displayUrl(cat);
      });
  }

  function triggerFor(target) {
    if (!target || !target.closest) return null;
    var el = target.closest(cfg.trigger);
    if (el) return el;
    if (!cfg.pills) return null;
    el = target.closest(PILL);
    // Pagination links also carry a query string. Not ours.
    if (el && (el.getAttribute('href') || '').indexOf('offset=') !== -1) return null;
    return el;
  }

  function onClick(e) {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;

    var el = triggerFor(e.target);
    if (!el || el.hasAttribute('data-sm-skip')) return;
    if (el.target && el.target !== '_self') return;

    e.preventDefault();
    var cat = catOf(el);
    if (cat === active()) return;
    go(cat, true);
  }

  function onHover(e) {
    var el = triggerFor(e.target);
    if (el && !el.hasAttribute('data-sm-skip')) prefetch(el);
  }

  function init() {
    var lists = all(document, cfg.list);
    list = lists.filter(function (el) { return el.getClientRects().length; })[0];
    if (!list) { log('no visible collection list'); return; }

    listIndex = Math.max(0, lists.indexOf(list));
    mark();

    // Capture phase: the Squarespace editor swallows clicks on the preview
    // before they bubble, so a bubble-phase listener never sees them.
    document.addEventListener('click', onClick, true);
    document.addEventListener('pointerover', onHover, true);
    document.addEventListener('focusin', onHover, true);
    window.addEventListener('popstate', function () { go(active(), false); });

    log('ready');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.SMFilter = { go: go, init: init, config: cfg, cache: cache };
})();
