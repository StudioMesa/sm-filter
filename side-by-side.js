/*SM Filter — Updated 04/07/25*/

document.addEventListener("DOMContentLoaded", function() {
  // Create filter buttons from archive links
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

  // Get all blog items
  var blogItems = document.querySelectorAll('.blog-item');
  if (!blogItems.length) {
    console.warn("No blog items found with class '.blog-item'.");
    return;
  }

  // Determine the container using the parent of the first blog item,
  // unless a container with class .blog-side-by-side-wrapper exists.
  var container = blogItems[0].parentElement;
  var wrapper = document.querySelector('.blog-side-by-side-wrapper');
  if (wrapper) {
    container = wrapper;
  }

  // Initialize data attributes for each blog item
  blogItems.forEach(function(item) {
    // Categories
    var categories = [];
    var catElements = item.querySelectorAll('.blog-categories-list a');
    catElements.forEach(function(catElem) {
      var catText = catElem.textContent.trim();
      if (catText) {
        var category = catText.replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9-_]/g, '');
        categories.push(category);
      }
    });
    item.setAttribute('data-category', categories.join(' '));

    // Title
    var titleElement = item.querySelector('.blog-title');
    if (titleElement) {
      var title = titleElement.textContent.trim();
      item.setAttribute('data-name', title);
    } else {
      console.warn('Missing .blog-title element for item:', item);
    }

    // Date - use datetime attribute if available, else the text content
    var timeElement = item.querySelector('time[pubdate]');
    if (timeElement) {
      var dateValue = timeElement.getAttribute('datetime') || timeElement.textContent.trim();
      var date = new Date(dateValue);
      if (!isNaN(date)) {
        item.setAttribute('data-date', date.toISOString().split('T')[0]);
      } else {
        console.error('Invalid date for item:', dateValue);
      }
    } else {
      console.warn('Missing time element with pubdate for item:', item);
    }
  });

  // Filtering function: show items that match any active filter
  function updateItemVisibility() {
    var activeFilters = Array.from(document.querySelectorAll('.filter-button.active')).map(function(button) {
      return button.textContent.trim().replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9-_]/g, '');
    });
    blogItems.forEach(function(item) {
      if (activeFilters.length === 0) {
        item.classList.remove('hidden');
      } else {
        var itemCategories = item.getAttribute('data-category').split(' ');
        var match = activeFilters.some(function(filter) {
          return itemCategories.indexOf(filter) !== -1;
        });
        if (match) {
          item.classList.remove('hidden');
        } else {
          item.classList.add('hidden');
        }
      }
    });
  }

  // Sorting function
  function sortItems(sortBy, sortAscending) {
    var itemsArray = Array.from(blogItems);
    itemsArray.sort(function(a, b) {
      var aVal = a.getAttribute('data-' + sortBy) || '';
      var bVal = b.getAttribute('data-' + sortBy) || '';
      if (sortBy === 'date') {
        var aDate = new Date(aVal);
        var bDate = new Date(bVal);
        return sortAscending ? aDate - bDate : bDate - aDate;
      } else {
        return sortAscending ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
    });
    // Re-append sorted items to the container
    itemsArray.forEach(function(item) {
      container.appendChild(item);
    });
  }

  // Default sort: date descending (newest first)
  sortItems('date', false);

  // Filter button click: toggle active class and update filtering
  document.querySelectorAll('.filter-button').forEach(function(button) {
    button.addEventListener('click', function() {
      this.classList.toggle('active');
      updateItemVisibility();
    });
  });

  // Reset button handler
  var resetButton = document.getElementById('reset');
  if (resetButton) {
    resetButton.addEventListener('click', function() {
      document.querySelectorAll('.filter-button').forEach(function(btn) {
        btn.classList.remove('active');
      });
      var selectTrigger = document.querySelector('.select-trigger');
      if (selectTrigger) {
        selectTrigger.textContent = 'Sort Collection';
      }
      updateItemVisibility();
      sortItems('date', false);
    });
  }

  // Dropdown sorting logic
  var selectWrap = document.getElementById('filter-select-wrap');
  if (selectWrap) {
    var selectTrigger = selectWrap.querySelector('.select-trigger');
    var options = selectWrap.querySelectorAll('.option');

    selectTrigger.addEventListener('click', function(e) {
      e.stopPropagation();
      selectWrap.classList.toggle('open');
      var filterSelect = selectWrap.querySelector('.filter-select');
      if (filterSelect) {
        filterSelect.style.display = selectWrap.classList.contains('open') ? 'block' : 'none';
      }
    });

    options.forEach(function(option) {
      option.addEventListener('click', function() {
        selectTrigger.textContent = this.textContent;
        selectWrap.classList.remove('open');
        var filterSelect = selectWrap.querySelector('.filter-select');
        if (filterSelect) {
          filterSelect.style.display = 'none';
        }
        var sortByValue = this.getAttribute('value');
        var parts = sortByValue.split(':');
        var sortBy = parts[0];
        var order = parts[1];
        // The condition below is based on your original logic. Adjust as needed.
        var sortAscending = (order === 'asc' && sortBy !== 'posts') || (sortBy === 'posts' && order === 'old');
        sortItems(sortBy === 'posts' ? 'date' : sortBy, sortAscending);
      });
    });

    // Close dropdown if clicking outside of it
    document.addEventListener('click', function(e) {
      if (!selectWrap.contains(e.target)) {
        selectWrap.classList.remove('open');
        var filterSelect = selectWrap.querySelector('.filter-select');
        if (filterSelect) {
          filterSelect.style.display = 'none';
        }
      }
    });
  }
});
