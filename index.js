// Homepage functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize page
    initializeNavigation();
    loadRecentContent();
    loadStatistics();
    setupHeroSearch();
    setupCategoryFilters();
});

// Initialize navigation based on user login status
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
    // Hide guest nav items
    document.querySelectorAll('.nav-item-guest').forEach(item => {
        item.style.display = 'none';
    });
    
    // Show user nav items
    document.querySelectorAll('.nav-item-user').forEach(item => {
        item.classList.remove('hidden');
    });
    
    // Set user name
    const userNameElement = document.getElementById('user-name');
    if (userNameElement) {
        userNameElement.textContent = `${user.first_name} ${user.last_name}`;
    }
    
    // Set dashboard link based on role
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
    
    // Show/hide seller-specific nav items
    const sellerNav = document.getElementById('nav-seller');
    if (sellerNav && (user.role === 'seller' || user.role === 'admin')) {
        sellerNav.classList.remove('hidden');
    }
    
    // Setup logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

function showGuestNavigation() {
    // Show guest nav items
    document.querySelectorAll('.nav-item-guest').forEach(item => {
        item.style.display = 'block';
    });
    
    // Hide user nav items
    document.querySelectorAll('.nav-item-user').forEach(item => {
        item.classList.add('hidden');
    });
}

// Handle logout
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
        showAlert('Error during logout', 'error');
    }
}

// Load recent content
async function loadRecentContent() {
    try {
        const response = await fetch('get_recent_content.php');
        const result = await response.json();
        
        const container = document.getElementById('recent-content');
        
        if (result.success && result.content.length > 0) {
            container.innerHTML = result.content.map(item => createContentCard(item)).join('');
        } else {
            container.innerHTML = `
                <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
                    <p>No content available yet. Be the first to upload!</p>
                    <a href="register.html" class="btn btn-primary mt-3">Get Started</a>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading recent content:', error);
        document.getElementById('recent-content').innerHTML = `
            <div class="alert alert-error" style="grid-column: 1 / -1;">
                Error loading content. Please refresh the page.
            </div>
        `;
    }
}

// Create content card HTML
function createContentCard(item) {
    const imageUrl = item.watermarked_path || item.thumbnail_path || 'assets/images/placeholder.jpg';
    const price = item.is_free ? 'Free' : formatCurrency(item.price);
    
    return `
        <div class="card" onclick="viewContent(${item.id})">
            <img src="${imageUrl}" alt="${item.title}" class="card-image">
            <div class="card-content">
                <h3 class="card-title">${item.title}</h3>
                <p class="card-description">${item.description ? item.description.substring(0, 80) + '...' : ''}</p>
                <div class="flex justify-between items-center">
                    <span class="card-price">${price}</span>
                    <span class="text-sm" style="color: #666;">${item.file_type}</span>
                </div>
            </div>
        </div>
    `;
}

// View content details
function viewContent(contentId) {
    window.location.href = `content_detail.html?id=${contentId}`;
}

// Load platform statistics
async function loadStatistics() {
    try {
        const response = await fetch('get_statistics.php');
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('total-images').textContent = result.stats.images.toLocaleString();
            document.getElementById('total-videos').textContent = result.stats.videos.toLocaleString();
            document.getElementById('total-contributors').textContent = result.stats.contributors.toLocaleString();
            document.getElementById('total-downloads').textContent = result.stats.downloads.toLocaleString();
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
        // Set default values
        document.getElementById('total-images').textContent = '0';
        document.getElementById('total-videos').textContent = '0';
        document.getElementById('total-contributors').textContent = '0';
        document.getElementById('total-downloads').textContent = '0';
    }
}

// Setup hero search
function setupHeroSearch() {
    const heroSearchForm = document.getElementById('hero-search-form');
    const heroSearchInput = document.getElementById('hero-search');
    
    if (heroSearchForm) {
        heroSearchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const query = heroSearchInput.value.trim();
            if (query) {
                window.location.href = `search.html?q=${encodeURIComponent(query)}`;
            }
        });
    }
}

// Setup category filters
function setupCategoryFilters() {
    const categories = document.querySelectorAll('#categories-grid .card');
    
    categories.forEach(card => {
        card.addEventListener('click', function() {
            const categoryTitle = this.querySelector('.card-title').textContent.toLowerCase();
            window.location.href = `search.html?category=${encodeURIComponent(categoryTitle)}`;
        });
        
        // Add hover effect
        card.style.cursor = 'pointer';
    });
}

// Add smooth scrolling for internal links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add loading animation for images
document.addEventListener('DOMContentLoaded', function() {
    const images = document.querySelectorAll('img[data-src]');
    
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('loading');
                imageObserver.unobserve(img);
            }
        });
    });
    
    images.forEach(img => {
        imageObserver.observe(img);
    });
});