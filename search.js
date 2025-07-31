// Search functionality
let currentPage = 1;
let hasMoreResults = true;
let currentFilters = {};

document.addEventListener('DOMContentLoaded', function() {
    // Initialize navigation
    initializeNavigation();
    
    // Setup search form
    setupSearchForm();
    
    // Setup filters
    setupFilters();
    
    // Load initial results
    loadInitialResults();
});

async function initializeNavigation() {
    try {
        const response = await fetch('check_login.php');
        const result = await response.json();
        
        if (result.success && result.logged_in) {
            showUserNavigation(result.user);
        } else {
            showGuestNavigation();
        }
    } catch (error) {
        console.error('Navigation initialization error:', error);
        showGuestNavigation();
    }
}

function showUserNavigation(user) {
    document.querySelectorAll('.nav-item-guest').forEach(item => {
        item.style.display = 'none';
    });
    
    document.querySelectorAll('.nav-item-user').forEach(item => {
        item.classList.remove('hidden');
    });
    
    const userNameElement = document.getElementById('user-name');
    if (userNameElement) {
        userNameElement.textContent = `${user.first_name} ${user.last_name}`;
    }
    
    const dashboardLink = document.getElementById('dashboard-link');
    if (dashboardLink) {
        if (user.role === 'admin') {
            dashboardLink.href = 'admin_dashboard.html';
            dashboardLink.textContent = 'Admin Panel';
        } else if (user.role === 'seller') {
            dashboardLink.href = 'seller_dashboard.html';
            dashboardLink.textContent = 'My Sales';
        } else {
            dashboardLink.href = 'profile.html';
            dashboardLink.textContent = 'My Account';
        }
    }
    
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

function showGuestNavigation() {
    document.querySelectorAll('.nav-item-guest').forEach(item => {
        item.style.display = 'block';
    });
    
    document.querySelectorAll('.nav-item-user').forEach(item => {
        item.classList.add('hidden');
    });
}

async function handleLogout() {
    try {
        const response = await fetch('logout.php', { method: 'POST' });
        const result = await response.json();
        
        if (result.success) {
            localStorage.removeItem('user');
            showAlert('Logged out successfully', 'success');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    } catch (error) {
        console.error('Logout error:', error);
    }
}

function setupSearchForm() {
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    
    // Get query from URL if present
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');
    const category = urlParams.get('category');
    
    if (query) {
        searchInput.value = query;
        currentFilters.query = query;
    }
    
    if (category) {
        currentFilters.category = category;
        highlightCategoryButton(category);
    }
    
    searchForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const query = searchInput.value.trim();
        
        if (query !== currentFilters.query) {
            currentFilters.query = query;
            resetSearch();
            performSearch();
        }
    });
}

function setupFilters() {
    const typeFilter = document.getElementById('type-filter');
    const priceFilter = document.getElementById('price-filter');
    const sortFilter = document.getElementById('sort-filter');
    const categoryButtons = document.querySelectorAll('.category-btn');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const loadMoreBtn = document.getElementById('load-more-btn');
    
    // Filter change handlers
    typeFilter.addEventListener('change', function() {
        currentFilters.type = this.value;
        resetSearch();
        performSearch();
    });
    
    priceFilter.addEventListener('change', function() {
        currentFilters.price = this.value;
        resetSearch();
        performSearch();
    });
    
    sortFilter.addEventListener('change', function() {
        currentFilters.sort = this.value;
        resetSearch();
        performSearch();
    });
    
    // Category button handlers
    categoryButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const category = this.dataset.category;
            
            if (currentFilters.category === category) {
                // Deselect if already selected
                delete currentFilters.category;
                this.classList.remove('btn-primary');
                this.classList.add('btn-outline');
            } else {
                // Select new category
                currentFilters.category = category;
                highlightCategoryButton(category);
            }
            
            resetSearch();
            performSearch();
        });
    });
    
    // Clear filters
    clearFiltersBtn.addEventListener('click', function() {
        currentFilters = {};
        document.getElementById('search-input').value = '';
        typeFilter.value = '';
        priceFilter.value = '';
        sortFilter.value = 'newest';
        
        categoryButtons.forEach(btn => {
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-outline');
        });
        
        this.style.display = 'none';
        resetSearch();
        performSearch();
    });
    
    // Load more button
    loadMoreBtn.addEventListener('click', function() {
        currentPage++;
        performSearch(true); // append results
    });
}

function highlightCategoryButton(category) {
    const categoryButtons = document.querySelectorAll('.category-btn');
    
    categoryButtons.forEach(btn => {
        if (btn.dataset.category === category) {
            btn.classList.remove('btn-outline');
            btn.classList.add('btn-primary');
        } else {
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-outline');
        }
    });
}

function loadInitialResults() {
    performSearch();
}

function resetSearch() {
    currentPage = 1;
    hasMoreResults = true;
    document.getElementById('load-more-btn').style.display = 'none';
}

async function performSearch(append = false) {
    try {
        if (!append) {
            showLoadingState();
        }
        
        const params = new URLSearchParams({
            page: currentPage,
            limit: 12,
            ...currentFilters
        });
        
        const response = await fetch(`search.php?${params}`);
        const result = await response.json();
        
        if (result.success) {
            displayResults(result.content, result.total, append);
            hasMoreResults = result.content.length === 12; // Check if we got a full page
            updateLoadMoreButton();
            updateFiltersUI();
        } else {
            showErrorState(result.message || 'Search failed');
        }
        
    } catch (error) {
        console.error('Search error:', error);
        showErrorState('Search failed. Please try again.');
    }
}

function showLoadingState() {
    document.getElementById('search-results').innerHTML = `
        <div class="text-center" style="grid-column: 1 / -1; padding: 2rem;">
            <div class="spinner" style="margin: 0 auto;"></div>
            <p>Searching...</p>
        </div>
    `;
}

function showErrorState(message) {
    document.getElementById('search-results').innerHTML = `
        <div class="alert alert-error" style="grid-column: 1 / -1;">
            ${message}
        </div>
    `;
}

function displayResults(content, total, append = false) {
    const resultsContainer = document.getElementById('search-results');
    const resultsTitle = document.getElementById('results-title');
    const resultsCount = document.getElementById('results-count');
    
    // Update title and count
    if (currentFilters.query) {
        resultsTitle.textContent = `Search Results for "${currentFilters.query}"`;
    } else if (currentFilters.category) {
        resultsTitle.textContent = `${currentFilters.category.charAt(0).toUpperCase() + currentFilters.category.slice(1)} Content`;
    } else {
        resultsTitle.textContent = 'Browse All Content';
    }
    
    resultsCount.textContent = `${total} ${total === 1 ? 'item' : 'items'} found`;
    
    // Display content
    if (content.length === 0 && !append) {
        resultsContainer.innerHTML = `
            <div class="card text-center" style="grid-column: 1 / -1; padding: 3rem;">
                <h3>No results found</h3>
                <p>Try adjusting your search terms or filters</p>
            </div>
        `;
        return;
    }
    
    const contentHTML = content.map(item => createContentCard(item)).join('');
    
    if (append) {
        resultsContainer.innerHTML += contentHTML;
    } else {
        resultsContainer.innerHTML = contentHTML;
    }
}

function createContentCard(item) {
    const imageUrl = item.watermarked_path || item.thumbnail_path || 'assets/images/placeholder.jpg';
    const price = item.is_free ? 'Free' : formatCurrency(item.price);
    
    return `
        <div class="card" onclick="viewContent(${item.id})" style="cursor: pointer;">
            <img src="${imageUrl}" alt="${item.title}" class="card-image" loading="lazy">
            <div class="card-content">
                <h3 class="card-title">${item.title}</h3>
                <p class="card-description">${item.description ? item.description.substring(0, 80) + '...' : ''}</p>
                <div class="flex justify-between items-center">
                    <span class="card-price">${price}</span>
                    <div class="flex items-center gap-2">
                        <span class="text-sm" style="color: #666;">${item.file_type}</span>
                        <button onclick="event.stopPropagation(); addToCart(${item.id})" 
                                class="btn btn-outline" 
                                style="padding: 0.25rem 0.5rem; font-size: 0.8rem;"
                                ${item.is_free ? 'title="Download Free"' : 'title="Add to Cart"'}>
                            ${item.is_free ? '↓' : '+'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function updateLoadMoreButton() {
    const loadMoreBtn = document.getElementById('load-more-btn');
    
    if (hasMoreResults) {
        loadMoreBtn.style.display = 'block';
    } else {
        loadMoreBtn.style.display = 'none';
    }
}

function updateFiltersUI() {
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const hasFilters = Object.keys(currentFilters).length > 0;
    
    clearFiltersBtn.style.display = hasFilters ? 'block' : 'none';
}

function viewContent(contentId) {
    window.location.href = `content_detail.html?id=${contentId}`;
}

function addToCart(contentId) {
    // This would be implemented with the shopping cart system
    showAlert('Feature coming soon!', 'info');
}