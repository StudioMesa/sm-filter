/*!
 * SM Filter — list
 * Category filtering for Squarespace blog collections, without page reloads.
 *
 * Triggers are authored by NAME, not by URL:
 *
 *   <div class="sm-cats">
 *     <a href="#" data-category="">All</a>
 *     <a href="#" data-category="Opinion">Opinion</a>
 *     <a href="#" data-category="Essay">Essay</a>
 *   </div>
 *
 * The script builds the request URL itself, so there is no path to match and
 * nothing to keep in sync if the blog moves. Squarespace's own category pills
 * work as triggers too: only the category name is read off them, never the URL.
 *
 * Filtering happens on the server, so it covers every post in the collection,
 * not just the ones currently loaded. That keeps it correct alongside a
 * paginated "load more".
 *
 * Usage (Settings > Advanced > Code Injection > Footer):
 *   <script src="https://cdn.jsdelivr.net/gh/StudioMesa/sm-filter@main/list.js" defer></script>
 *
 * Optional config, declared BEFORE the script tag:
 *   <script>window.SM_FILTER = { history: false };</script>
 *
 * Fires `sm:list-replaced` on document after each swap so a pagination script
 * can rebind. Falls back to ordinary navigation if a fetch fails.
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
    scroll: true,
    debug: false
  };

  var cfg = {}, k;
  for (k in DEFAULTS) if (Object.prototype.hasOwnProperty.call(DEFAULTS, k)) cfg[k] = DEFAULTS[k];
  var user = window.SM_FILTER || {};
  for (k in user) if (Object.prototype.hasOwnProperty.call(user, k)) cfg[k] = user[k];

  var PILL = 'a[href*="' + cfg.param + '="]';
  var list, listIndex, busy = false;

  function all(root, sel) { return [].slice.call(root.querySelectorAll(sel)); }

  function log() {
    if (cfg.debug && window.console) console.log.apply(console, ['[sm-filter]'].concat([].slice.call(arguments)));
  }

  function active() {
    return new URLSearchParams(location.search).get(cfg.param) || '';
  }

  /* The one place a URL is constructed. Everything else deals in names. */
  function urlFor(cat) {
    return location.pathname + (cat ? '?' + cfg.param + '=' + encodeURIComponent(cat) : '');
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

  /* Mark triggers outside the list. Pills inside it are skipped: once a filter
     is on, every visible row shares that category, so lighting them all is noise. */
  function mark() {
    var cur = active();
    all(document, cfg.trigger).forEach(function (el) {
      if (list && list.contains(el)) return;
      var on = catOf(el) === cur;
      el.classList[on ? 'add' : 'remove'](cfg.activeClass);
      if (on) el.setAttribute('aria-current', 'page');
      else el.removeAttribute('aria-current');
    });
  }

  function go(cat, push) {
    if (busy) return;
    var url = urlFor(cat);
    busy = true;
    list.classList.add('is-filtering');
    log('filtering to', cat || '(all)', url);

    fetch(url, { credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var lists = all(doc, cfg.list);
        var fresh = lists[listIndex] || lists[0];
        if (!fresh) throw new Error('no list in fetched page');

        if (cfg.history && push) history.pushState({ smCat: cat }, '', url);

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
            detail: { list: list, category: cat, url: url }
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
        if (window.self === window.top) location.href = url;
      });
  }

  function onClick(e) {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;

    var el = e.target && e.target.closest ? e.target.closest(cfg.trigger) : null;
    if (!el && cfg.pills && e.target.closest) {
      el = e.target.closest(PILL);
      // Pagination links also carry a query string. Not ours.
      if (el && (el.getAttribute('href') || '').indexOf('offset=') !== -1) el = null;
    }
    if (!el || el.hasAttribute('data-sm-skip')) return;

    e.preventDefault();
    var cat = catOf(el);
    if (cat === active()) return;
    go(cat, true);
  }

  function init() {
    var lists = all(document, cfg.list);
    list = lists.filter(function (el) { return el.getClientRects().length; })[0];
    if (!list) { log('no visible collection list'); return; }

    listIndex = Math.max(0, lists.indexOf(list));

    mark();
    document.addEventListener('click', onClick);
    window.addEventListener('popstate', function () { go(active(), false); });

    log('ready');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.SMFilter = { go: go, init: init, config: cfg };
})();
