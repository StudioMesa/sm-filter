document.addEventListener('DOMContentLoaded', function() {
    const grid = document.querySelector('.sqs-gallery-design-autogrid');
    imagesLoaded(grid, function() {
        // Append category classes to items
        document.querySelectorAll('.summary-item').forEach(item => {
            item.querySelectorAll('.summary-metadata-item--cats a').forEach(categoryElement => {
                const category = categoryElement.textContent.trim().replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9-_]/g, '');
                item.classList.add(category);
            });
        });

        const iso = new Isotope(grid, {
            itemSelector: '.summary-item',
            layoutMode: 'fitRows',
            fitRows: {gutter: 50},
            getSortData: {
                name: '.summary-title-link a'
            },
            transitionDuration: '0.4s'
        });

        // Filter functionality
        document.querySelectorAll('.filter-button').forEach(button => {
            button.addEventListener('click', function() {
                this.classList.toggle('active');
                const activeFilters = Array.from(document.querySelectorAll('.filter-button.active')).map(btn => '.' + btn.textContent.trim().replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9-_]/g, ''));
                const filterValue = activeFilters.length ? activeFilters.join(', ') : '*';
                iso.arrange({ filter: filterValue });
            });
        });

        // Reset filters
        document.querySelector('#reset').addEventListener('click', () => {
            document.querySelectorAll('.filter-button').forEach(btn => btn.classList.remove('active'));
            iso.arrange({ filter: '*' });
        });

        // Adjusted Sorting to work with the custom dropdown
        document.querySelectorAll('#filter-select-wrap .option').forEach(option => {
            option.addEventListener('click', function() {
                const sortByValue = this.getAttribute('value');
                let sortAscending = true; // Ascending by default
                if (sortByValue.includes('desc')) {
                    sortAscending = false; // Descending if 'desc' is in the value
                }
                const sortBy = sortByValue.split(':')[0]; // Extracting 'name' from 'name:desc'
                iso.arrange({
                    sortBy: sortBy,
                    sortAscending: sortAscending
                });
                // Update the select-trigger text
                document.querySelector('.select-trigger').textContent = this.textContent;
            });
        });
    });
});


