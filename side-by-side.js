/*SM Filter — Updated 07/11/25*/

document.addEventListener("DOMContentLoaded", function () {
  window.addEventListener("load", function () {
    const getSlug = str =>
      str.trim().replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9-_]/g, '');

    const buttonWrap = document.getElementById('button-wrap');
    const archiveLinks = document.querySelectorAll('.archive-block-wrapper .archive-group-name-link');
    const selectWrap = document.getElementById('filter-select-wrap');
    const trigger = selectWrap?.querySelector('.select-trigger');
    const options = selectWrap?.querySelectorAll('.option');

    // Create filter buttons
    archiveLinks.forEach(link => {
      const text = link.textContent.trim();
      if (text) {
        const button = document.createElement('div');
        button.className = 'filter-button';
        button.textContent = text;
        button.setAttribute('data-filter', getSlug(text));
        buttonWrap.appendChild(button);
      }
    });

    const blogItems = document.querySelectorAll('.blog-item');
    if (!blogItems.length) return;

    const container = document.querySelector('.blog-side-by-side-wrapper') || blogItems[0].parentElement;

    // Tag items with categories, title, date
    blogItems.forEach(item => {
      const cats = Array.from(item.querySelectorAll('.blog-categories-list a')).map(cat => getSlug(cat.textContent));
      item.setAttribute('data-category', cats.join(' '));

      const title = item.querySelector('.blog-title');
      if (title) item.setAttribute('data-name', title.textContent.trim());

      const dateElem = item.querySelector('time[pubdate]');
      if (dateElem) {
        const dateValue = dateElem.getAttribute('datetime') || dateElem.textContent.trim();
        const date = new Date(dateValue);
        if (!isNaN(date)) item.setAttribute('data-date', date.toISOString().split('T')[0]);
      }
    });

    const sortItems = (sortBy = 'date', asc = false) => {
      const items = Array.from(document.querySelectorAll('.blog-item'));
      items.sort((a, b) => {
        const aVal = a.getAttribute(`data-${sortBy}`) || '';
        const bVal = b.getAttribute(`data-${sortBy}`) || '';

        if (sortBy === 'date') {
          return asc ? new Date(aVal) - new Date(bVal) : new Date(bVal) - new Date(aVal);
        } else {
          return asc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
      });
      items.forEach(item => container.appendChild(item));
    };

    const updateItemVisibility = () => {
      const active = Array.from(document.querySelectorAll('.filter-button.active')).map(btn => btn.getAttribute('data-filter'));
      document.querySelectorAll('.blog-item').forEach(item => {
        const cats = item.getAttribute('data-category')?.split(' ') || [];
        const matches = active.some(f => cats.includes(f));
        item.classList.toggle('hidden', active.length > 0 && !matches);
      });
      updateURL(active);
    };

    const updateURL = (filters) => {
      const params = new URLSearchParams(window.location.search);
      if (filters.length > 0) {
        params.set('category-filter', filters.join(','));
      } else {
        params.delete('category-filter');
      }
      const newURL = `${window.location.pathname}?${params.toString()}`;
      history.replaceState({}, '', newURL);
    };

    document.addEventListener('click', function (e) {
      if (e.target.classList.contains('filter-button') && e.target.id !== 'reset') {
        e.target.classList.toggle('active');
        updateItemVisibility();
      }
    });

    document.querySelector('#reset')?.addEventListener('click', () => {
      document.querySelectorAll('.filter-button').forEach(btn => btn.classList.remove('active'));
      updateItemVisibility();
      sortItems('date', false);
      if (trigger) trigger.textContent = 'Sort Collection';
    });

    trigger?.addEventListener('click', () => {
      selectWrap.classList.toggle('open');
      const dropdown = selectWrap.querySelector('.filter-select');
      if (dropdown) dropdown.style.display = selectWrap.classList.contains('open') ? 'block' : 'none';
    });

    options?.forEach(option => {
      option.addEventListener('click', function () {
        const value = this.getAttribute('value');
        const [sortBy, order] = value.split(':');
        const asc = (order === 'asc' && sortBy !== 'posts') || (sortBy === 'posts' && order === 'old');
        if (trigger) trigger.textContent = this.textContent;
        sortItems(sortBy === 'posts' ? 'date' : sortBy, asc);
        selectWrap.classList.remove('open');
        const dropdown = selectWrap.querySelector('.filter-select');
        if (dropdown) dropdown.style.display = 'none';
      });
    });

    document.addEventListener('click', e => {
      if (!selectWrap.contains(e.target)) {
        selectWrap.classList.remove('open');
        const dropdown = selectWrap.querySelector('.filter-select');
        if (dropdown) dropdown.style.display = 'none';
      }
    });

    const params = new URLSearchParams(window.location.search);
    const categoryParam = params.get('category-filter');
    if (categoryParam) {
      const slugs = categoryParam.split(',').map(getSlug);
      slugs.forEach(slug => {
        const match = document.querySelector(`.filter-button[data-filter="${slug}"]`);
        if (match) match.classList.add('active');
      });
    }

    updateItemVisibility();
    sortItems('date', false);
  });
});
