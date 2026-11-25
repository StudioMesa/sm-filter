/*SM Filter — Updated 07/11/25*/

document.addEventListener("DOMContentLoaded", function () {
  window.addEventListener("load", function () {
    const getSlug = str =>
      str.trim().replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9-_]/g, '');

    const buttonWrap = document.getElementById('button-wrap');
    const archiveLinks = document.querySelectorAll('.archive-block-wrapper .archive-group-name-link');
    const grid = document.querySelector('.blog-basic-grid');
    const select = document.getElementById('filter-select-wrap');
    const trigger = select?.querySelector('.select-trigger');
    const options = select?.querySelectorAll('.option');

    // 1. Create filter buttons
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

    // 2. Tag blog items
    document.querySelectorAll('.blog-basic-grid--container').forEach(item => {
      const categories = [];
      item.querySelectorAll('.blog-categories-list a').forEach(cat => {
        categories.push(getSlug(cat.textContent));
      });
      item.setAttribute('data-category', categories.join(' '));

      const title = item.querySelector('.blog-title');
      if (title) item.setAttribute('data-name', title.textContent.trim());

      const date = item.querySelector('time[pubdate]');
      if (date) {
        const d = new Date(date.textContent.trim());
        if (!isNaN(d)) item.setAttribute('data-date', d.toISOString().split('T')[0]);
      }
    });

    // 3. Sort items
    const sortItems = (sortBy = 'date', asc = false) => {
      const items = Array.from(document.querySelectorAll('.blog-basic-grid--container'));
      items.sort((a, b) => {
        const aVal = a.getAttribute(`data-${sortBy}`) || '';
        const bVal = b.getAttribute(`data-${sortBy}`) || '';

        if (sortBy === 'date') {
          return asc ? new Date(aVal) - new Date(bVal) : new Date(bVal) - new Date(aVal);
        } else {
          return asc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
      });
      items.forEach(item => grid.appendChild(item));
    };

    sortItems('date', false); // Default sort

    // 4. Update visible items
    const updateItemVisibility = () => {
      const activeFilters = Array.from(document.querySelectorAll('.filter-button.active'))
        .map(btn => btn.getAttribute('data-filter'));

      document.querySelectorAll('.blog-basic-grid--container').forEach(item => {
        const itemCategories = item.getAttribute('data-category')?.split(' ') || [];
        const matches = activeFilters.some(f => itemCategories.includes(f));
        item.classList.toggle('hidden', activeFilters.length > 0 && !matches);
      });

      updateURL(activeFilters);
    };

    // 5. Update the URL with active filters
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

    // 6. Click filter buttons (multi-select)
    document.addEventListener('click', function (e) {
      if (e.target.classList.contains('filter-button') && e.target.id !== 'reset') {
        e.target.classList.toggle('active');
        updateItemVisibility();
      }
    });

    // 7. Reset button
    document.querySelector('#reset')?.addEventListener('click', () => {
      document.querySelectorAll('.filter-button').forEach(btn => btn.classList.remove('active'));
      updateItemVisibility();
      sortItems('date', false);
      trigger.textContent = 'Sort Collection';
    });

    // 8. Dropdown toggle
    trigger?.addEventListener('click', () => {
      select.classList.toggle('open');
      const dropdown = select.querySelector('.filter-select');
      dropdown.style.display = select.classList.contains('open') ? 'block' : 'none';
    });

    // 9. Sort option click
    options?.forEach(option => {
      option.addEventListener('click', function () {
        const value = this.getAttribute('value');
        const [sortBy, order] = value.split(':');
        const asc = (order === 'asc' && sortBy !== 'posts') || (sortBy === 'posts' && order === 'old');

        trigger.textContent = this.textContent;
        sortItems(sortBy === 'posts' ? 'date' : sortBy, asc);

        select.classList.remove('open');
        select.querySelector('.filter-select').style.display = 'none';
      });
    });

    // 10. Close dropdown on outside click
    document.addEventListener('click', function (e) {
      if (!select.contains(e.target)) {
        select.classList.remove('open');
        select.querySelector('.filter-select').style.display = 'none';
      }
    });

    // 11. Load filters from URL (multi)
    const params = new URLSearchParams(window.location.search);
    const categoryParam = params.get('category-filter');
    if (categoryParam) {
      const slugs = categoryParam.split(',').map(getSlug);
      slugs.forEach(slug => {
        const match = document.querySelector(`.filter-button[data-filter="${slug}"]`);
        if (match) match.classList.add('active');
      });
    }

    updateItemVisibility(); // Initial visibility
  });
});
