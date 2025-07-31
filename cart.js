// Shopping cart functionality
let currentUser = null;
let itemToRemove = null;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize navigation
    initializeNavigation();
    
    // Load cart contents
    loadCartContents();
    
    // Setup event listeners
    setupEventListeners();
});

async function initializeNavigation() {
    try {
        const response = await fetch('check_login.php');
        const result = await response.json();
        
        if (result.success && result.logged_in) {
            currentUser = result.user;
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

function setupEventListeners() {
    const checkoutBtn = document.getElementById('checkout-btn');
    const confirmRemoveBtn = document.getElementById('confirm-remove-btn');
    
    checkoutBtn.addEventListener('click', function() {
        if (!currentUser) {
            showAlert('Please log in to proceed with checkout', 'info');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            return;
        }
        
        const cartItems = Cart.getItems();
        if (cartItems.length === 0) {
            showAlert('Your cart is empty', 'info');
            return;
        }
        
        window.location.href = 'checkout.html';
    });
    
    confirmRemoveBtn.addEventListener('click', function() {
        if (itemToRemove) {
            Cart.removeItem(itemToRemove);
            closeModal('remove-modal');
            loadCartContents(); // Refresh cart display
            itemToRemove = null;
        }
    });
}

function loadCartContents() {
    const cartItems = Cart.getItems();
    const emptyCart = document.getElementById('empty-cart');
    const cartContent = document.getElementById('cart-content');
    const relatedSection = document.getElementById('related-section');
    
    if (cartItems.length === 0) {
        emptyCart.classList.remove('hidden');
        cartContent.classList.add('hidden');
        relatedSection.classList.add('hidden');
        return;
    }
    
    emptyCart.classList.add('hidden');
    cartContent.classList.remove('hidden');
    relatedSection.classList.remove('hidden');
    
    displayCartItems(cartItems);
    updateOrderSummary(cartItems);
    loadRecommendedContent();
}

function displayCartItems(items) {
    const container = document.getElementById('cart-items');
    
    container.innerHTML = items.map(item => `
        <div class="card mb-3" data-item-id="${item.id}">
            <div style="display: flex; gap: 1rem; padding: 1rem;">
                <div style="flex-shrink: 0;">
                    <img src="${item.image || 'assets/images/placeholder.jpg'}" 
                         alt="${item.title}" 
                         style="width: 120px; height: 80px; object-fit: cover; border-radius: 4px;">
                </div>
                <div style="flex: 1;">
                    <h3 style="margin: 0 0 0.5rem 0;">
                        <a href="content_detail.html?id=${item.id}" style="color: #000; text-decoration: none;">
                            ${item.title}
                        </a>
                    </h3>
                    <p style="color: #666; margin: 0 0 0.5rem 0;">By ${item.seller}</p>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 1.25rem; font-weight: bold;">${formatCurrency(item.price)}</span>
                        <button onclick="confirmRemoveItem('${item.id}')" 
                                class="btn btn-outline" 
                                style="padding: 0.5rem 1rem; color: #dc3545; border-color: #dc3545;">
                            Remove
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function updateOrderSummary(items) {
    const itemCount = items.length;
    const subtotal = items.reduce((sum, item) => sum + parseFloat(item.price), 0);
    const platformFeeRate = 0.05; // 5% platform fee
    const taxRate = 0.08; // 8% tax
    
    const platformFee = subtotal * platformFeeRate;
    const taxAmount = (subtotal + platformFee) * taxRate;
    const total = subtotal + platformFee + taxAmount;
    
    document.getElementById('item-count').textContent = itemCount;
    document.getElementById('subtotal').textContent = formatCurrency(subtotal);
    document.getElementById('platform-fee').textContent = formatCurrency(platformFee);
    document.getElementById('tax-amount').textContent = formatCurrency(taxAmount);
    document.getElementById('total-amount').textContent = formatCurrency(total);
}

function confirmRemoveItem(itemId) {
    itemToRemove = itemId;
    openModal('remove-modal');
}

async function loadRecommendedContent() {
    try {
        // Get random content for recommendations
        const response = await fetch('search.php?limit=4&sort=newest');
        const result = await response.json();
        
        if (result.success && result.content.length > 0) {
            displayRecommendedContent(result.content);
        } else {
            document.getElementById('recommended-content').innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; color: #666;">
                    No recommendations available
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading recommended content:', error);
        document.getElementById('recommended-content').innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; color: #666;">
                Failed to load recommendations
            </div>
        `;
    }
}

function displayRecommendedContent(content) {
    const container = document.getElementById('recommended-content');
    
    container.innerHTML = content.map(item => {
        const imageUrl = item.watermarked_path || item.thumbnail_path || 'assets/images/placeholder.jpg';
        const price = item.is_free ? 'Free' : formatCurrency(item.price);
        
        return `
            <div class="card" onclick="window.location.href='content_detail.html?id=${item.id}'" style="cursor: pointer;">
                <img src="${imageUrl}" alt="${item.title}" class="card-image" loading="lazy">
                <div class="card-content">
                    <h3 class="card-title">${item.title}</h3>
                    <div class="flex justify-between items-center">
                        <span class="card-price">${price}</span>
                        <div class="flex items-center gap-2">
                            <span class="text-sm" style="color: #666;">${item.file_type}</span>
                            ${!item.is_free ? `
                                <button onclick="event.stopPropagation(); addToCartFromRecommended(${item.id}, '${item.title}', ${item.price}, '${imageUrl}', '${item.seller_name}')" 
                                        class="btn btn-outline" 
                                        style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">
                                    Add to Cart
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function addToCartFromRecommended(id, title, price, image, seller) {
    // Check if item is already in cart
    const cartItems = Cart.getItems();
    const existingItem = cartItems.find(item => item.id === id);
    
    if (existingItem) {
        showAlert('Item is already in your cart', 'info');
        return;
    }
    
    Cart.addItem({
        id: id,
        title: title,
        price: price,
        image: image,
        seller: seller
    });
    
    // Refresh cart display
    loadCartContents();
}