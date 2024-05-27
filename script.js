/*SM Filter — Updated 5/26/24*/

document.addEventListener('DOMContentLoaded', function() {
const grid = document.querySelector('.blog-basic-grid');
imagesLoaded(grid, function() {
console.log('Images are loaded, initializing Isotope now.');
document.querySelectorAll('.blog-basic-grid--container').forEach(item => {
item.querySelectorAll('.blog-categories-list a').forEach(categoryElement => {
const category = categoryElement.textContent.trim().replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9-_]/g, '');
item.classList.add(category);
});
});

const iso = new Isotope(grid, {
itemSelector: '.blog-basic-grid--container',
layoutMode: 'masonry',
masonry: {
columnWidth: '.blog-basic-grid--container',
gutter: 20
},
getSortData: {
name: function(itemElem) {
return itemElem.querySelector('.blog-title').textContent;
}
},
transitionDuration: '0.4s'
});

document.querySelectorAll('.filter-button').forEach(button => {
button.addEventListener('click', function() {
this.classList.toggle('active');
const activeFilters = Array.from(document.querySelectorAll('.filter-button.active')).map(btn => '.' + btn.textContent.trim().replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9-_]/g, ''));
const filterValue = activeFilters.length ? activeFilters.join(', ') : '*';
iso.arrange({ filter: filterValue });
});
});

document.querySelector('#reset').addEventListener('click', () => {
document.querySelectorAll('.filter-button').forEach(btn => btn.classList.remove('active'));
iso.arrange({ filter: '*' });
});

document.querySelectorAll('#filter-select-wrap .option').forEach(option => {
option.addEventListener('click', function() {
const sortByValue = this.getAttribute('value');
let sortAscending = true;
if (sortByValue.includes('desc')) {
sortAscending = false;
}
const sortBy = sortByValue.split(':')[0];
iso.arrange({
sortBy: sortBy,
sortAscending: sortAscending
});
document.querySelector('.select-trigger').textContent = this.textContent;
});
});
});
});
