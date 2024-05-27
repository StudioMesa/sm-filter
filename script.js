/*SM Filter — Updated 5/27/24*/

document.addEventListener("DOMContentLoaded", function() {
    // Dynamically create filter buttons based on archive links
    var archiveLinks = document.querySelectorAll('.archive-block-wrapper .archive-group-name-link');
    var buttonWrap = document.getElementById('button-wrap');
    archiveLinks.forEach(function(link) {
      var text = link.textContent.trim();
      if (text) {
        var button = document.createElement('div');
        button.className = 'filter-button';
        button.textContent = text;
        buttonWrap.appendChild(button);
      }
    });

    // Initialize data attributes on items
    document.querySelectorAll('.blog-basic-grid--container').forEach(item => {
      item.querySelectorAll('.blog-categories-list a').forEach(categoryElement => {
        const category = categoryElement.textContent.trim().replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9-_]/g, '');
        item.setAttribute('data-category', category);
      });

      // Assuming there's a title element with a class of 'blog-title'
      const titleElement = item.querySelector('.blog-title');
      if (titleElement) {
        const title = titleElement.textContent.trim();
        item.setAttribute('data-name', title);
      } else {
        console.warn('Missing .blog-title element for item:', item);
      }

      // Extract the date from the 'pubdate' attribute
      const dateElement = item.querySelector('time[pubdate]');
      if (dateElement) {
        const dateText = dateElement.textContent.trim();
        const date = new Date(dateText);
        if (!isNaN(date)) {
          item.setAttribute('data-date', date.toISOString().split('T')[0]); // Format date as yyyy-mm-dd
        } else {
          console.error(`Invalid date: ${dateText}`);
        }
      } else {
        console.warn('Missing pubdate element for item:', item);
      }
    });

    // Function to update item visibility based on active filters
    const updateItemVisibility = () => {
      const activeFilters = Array.from(document.querySelectorAll('.filter-button.active')).map(button => 
        button.textContent.trim().replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9-_]/g, '')
      );

      document.querySelectorAll('.blog-basic-grid--container').forEach(item => {
        if (activeFilters.length === 0) {
          item.classList.remove('hidden');
        } else {
          const itemCategories = item.getAttribute('data-category').split(' ');
          const matches = activeFilters.some(filter => itemCategories.includes(filter));
          if (matches) {
            item.classList.remove('hidden');
          } else {
            item.classList.add('hidden');
          }
        }
      });
    };

    // Function to sort items
    const sortItems = (sortBy, sortAscending) => {
      const items = Array.from(document.querySelectorAll('.blog-basic-grid--container'));
      items.sort((a, b) => {
        const aValue = a.getAttribute(`data-${sortBy}`) || '';
        const bValue = b.getAttribute(`data-${sortBy}`) || '';

        if (sortBy === 'date') { // Sort by date
          if (!aValue || !bValue) return 0;
          const aDate = new Date(aValue);
          const bDate = new Date(bValue);
          return sortAscending ? aDate - bDate : bDate - aDate;
        } else { // Sort by name
          return sortAscending ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        }
      });

      // Re-append sorted items
      const grid = document.querySelector('.blog-basic-grid');
      items.forEach(item => grid.appendChild(item));
    };

    // Initial default sort - Date (New)
    sortItems('date', false);

    // Filter button click handler
    document.querySelectorAll('.filter-button').forEach(button => {
      button.addEventListener('click', function() {
        this.classList.toggle('active');
        updateItemVisibility();
      });
    });

    // Reset button click handler
    document.querySelector('#reset').addEventListener('click', () => {
      document.querySelectorAll('.filter-button').forEach(btn => btn.classList.remove('active'));
      document.querySelector('.select-trigger').textContent = 'Sort Collection';
      updateItemVisibility();
      sortItems('date', false); // Default sort order
    });

    // Dropdown interaction and sorting
    const select = document.getElementById('filter-select-wrap');
    const trigger = select.querySelector('.select-trigger');
    const options = select.querySelectorAll('.option');

    // Toggle dropdown
    trigger.addEventListener('click', function() {
      select.classList.toggle('open');
      select.querySelector('.filter-select').style.display = select.classList.contains('open') ? 'block' : 'none';
    });

    // Option click
    options.forEach(option => {
      option.addEventListener('click', function() {
        trigger.textContent = this.textContent;
        select.classList.remove('open');
        select.querySelector('.filter-select').style.display = 'none';

        const sortByValue = this.getAttribute('value');
        const [sortBy, order] = sortByValue.split(':');
        const sortAscending = (order === 'asc' && sortBy !== 'posts') || (sortBy === 'posts' && order === 'old');

        sortItems(sortBy === 'posts' ? 'date' : sortBy, sortAscending);
      });
    });

    // Click outside to close dropdown
    document.addEventListener('click', function(e) {
      if (!select.contains(e.target)) {
        select.classList.remove('open');
        select.querySelector('.filter-select').style.display = 'none';
      }
    });
  });
