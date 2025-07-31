// Content detail page functionality
let currentContent = null;
let currentUser = null;

document.addEventListener('DOMContentLoaded', function() {
    // Get content ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const contentId = urlParams.get('id');
    
    if (!contentId) {
        showError('No content ID provided');
        return;
    }
    
    // Initialize page
    initializeNavigation();
    loadContentDetails(contentId);
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

async function loadContentDetails(contentId) {
    try {
        const response = await fetch(`get_content_details.php?id=${contentId}`);
        const result = await response.json();
        
        if (result.success) {
            currentContent = result.content;
            displayContentDetails(result.content);
            loadRelatedContent(result.content);
        } else {
            showError(result.message || 'Content not found');
        }
    } catch (error) {
        console.error('Error loading content details:', error);
        showError('Failed to load content details');
    }
}

function displayContentDetails(content) {
    // Hide loading, show content
    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('content-details').classList.remove('hidden');
    
    // Update page title
    document.title = `${content.title} - SpecialStock AI`;
    
    // Breadcrumb
    document.getElementById('breadcrumb-title').textContent = content.title;
    
    // Media container
    displayMedia(content);
    
    // Content information
    document.getElementById('content-title').textContent = content.title;
    document.getElementById('content-price').textContent = content.is_free ? 'Free' : formatCurrency(content.price);
    document.getElementById('content-seller').textContent = content.seller_name;
    document.getElementById('upload-date').textContent = new Date(content.created_at).toLocaleDateString();
    document.getElementById('download-count').textContent = content.downloads_count.toLocaleString();
    
    // Description
    document.getElementById('content-description').textContent = content.description || 'No description available.';
    
    // File info
    document.getElementById('file-type').textContent = content.file_type.toUpperCase();
    document.getElementById('file-size').textContent = formatFileSize(content.file_size);
    
    if (content.width && content.height) {
        document.getElementById('dimensions').textContent = `${content.width} × ${content.height}px`;
    } else {
        document.getElementById('dimensions').textContent = 'N/A';
    }
    
    // Tags
    displayTags(content.tags);
    
    // Purchase/Download buttons
    setupPurchaseButtons(content);
}

function displayMedia(content) {
    const mediaContainer = document.getElementById('media-container');
    const imageUrl = content.watermarked_path || content.thumbnail_path || `uploads/${content.file_path}`;
    
    if (content.file_type === 'image') {
        mediaContainer.innerHTML = `
            <img src="${imageUrl}" 
                 alt="${content.title}" 
                 style="width: 100%; height: auto; display: block; cursor: pointer;"
                 onclick="openLightbox('${imageUrl}', 'image')">
            <div style="position: absolute; bottom: 1rem; right: 1rem; background: rgba(0,0,0,0.7); color: white; padding: 0.5rem; border-radius: 4px; font-size: 0.9rem;">
                Click to enlarge
            </div>
        `;
    } else {
        mediaContainer.innerHTML = `
            <video controls style="width: 100%; height: auto; display: block;">
                <source src="${imageUrl}" type="video/${content.file_extension}">
                Your browser does not support the video tag.
            </video>
        `;
    }
}

function displayTags(tags) {
    const tagsContainer = document.getElementById('content-tags');
    
    if (tags && tags.length > 0) {
        tagsContainer.innerHTML = tags.map(tag => 
            `<span onclick="searchByTag('${tag}')" style="background: #f0f0f0; padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.9rem; cursor: pointer; border: 1px solid #ddd;">${tag}</span>`
        ).join('');
    } else {
        tagsContainer.innerHTML = '<span style="color: #666;">No tags</span>';
    }
}

function searchByTag(tag) {
    window.location.href = `search.html?category=${encodeURIComponent(tag)}`;
}

function setupPurchaseButtons(content) {
    const freeDownload = document.getElementById('free-download');
    const paidPurchase = document.getElementById('paid-purchase');
    const alreadyPurchased = document.getElementById('already-purchased');
    
    // Hide all sections first
    freeDownload.classList.add('hidden');
    paidPurchase.classList.add('hidden');
    alreadyPurchased.classList.add('hidden');
    
    if (content.is_free) {
        freeDownload.classList.remove('hidden');
        setupFreeDownload(content);
    } else {
        // Check if user already purchased (would need to implement this check)
        paidPurchase.classList.remove('hidden');
        setupPaidPurchase(content);
    }
}

function setupFreeDownload(content) {
    const downloadBtn = document.getElementById('download-free-btn');
    
    downloadBtn.addEventListener('click', async function() {
        if (!currentUser) {
            showAlert('Please log in to download content', 'info');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            return;
        }
        
        try {
            showLoading(true);
            
            const response = await fetch('download_content.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content_id: content.id,
                    type: 'free'
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Trigger download
                const link = document.createElement('a');
                link.href = result.download_url;
                link.download = content.original_filename || `${content.title}.${content.file_extension}`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                showAlert('Download started!', 'success');
            } else {
                showAlert(result.message || 'Download failed', 'error');
            }
        } catch (error) {
            console.error('Download error:', error);
            showAlert('Download failed', 'error');
        } finally {
            showLoading(false);
        }
    });
}

function setupPaidPurchase(content) {
    const addToCartBtn = document.getElementById('add-to-cart-btn');
    const buyNowBtn = document.getElementById('buy-now-btn');
    
    addToCartBtn.addEventListener('click', function() {
        Cart.addItem({
            id: content.id,
            title: content.title,
            price: content.price,
            image: content.watermarked_path || content.thumbnail_path,
            seller: content.seller_name
        });
    });
    
    buyNowBtn.addEventListener('click', function() {
        if (!currentUser) {
            showAlert('Please log in to purchase content', 'info');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            return;
        }
        
        // Add to cart and go to checkout
        Cart.addItem({
            id: content.id,
            title: content.title,
            price: content.price,
            image: content.watermarked_path || content.thumbnail_path,
            seller: content.seller_name
        });
        
        window.location.href = 'checkout.html';
    });
}

async function loadRelatedContent(content) {
    try {
        // Search for content with similar tags
        const tags = content.tags && content.tags.length > 0 ? content.tags[0] : '';
        const response = await fetch(`search.php?category=${encodeURIComponent(tags)}&limit=4`);
        const result = await response.json();
        
        if (result.success && result.content.length > 0) {
            // Filter out current content
            const relatedContent = result.content.filter(item => item.id !== content.id);
            displayRelatedContent(relatedContent.slice(0, 4));
        } else {
            document.getElementById('related-content').innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; color: #666;">
                    No related content found
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading related content:', error);
        document.getElementById('related-content').innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; color: #666;">
                Failed to load related content
            </div>
        `;
    }
}

function displayRelatedContent(content) {
    const container = document.getElementById('related-content');
    
    if (content.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; color: #666;">
                No related content found
            </div>
        `;
        return;
    }
    
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
                        <span class="text-sm" style="color: #666;">${item.file_type}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function openLightbox(imageUrl, type) {
    const lightboxContent = document.getElementById('lightbox-content');
    
    if (type === 'image') {
        lightboxContent.innerHTML = `
            <img src="${imageUrl}" 
                 alt="Full size preview" 
                 style="max-width: 100%; max-height: 100%; object-fit: contain;">
        `;
    }
    
    openModal('lightbox-modal');
}

function showError(message) {
    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('error-state').classList.remove('hidden');
    
    if (message !== 'Content not found') {
        document.querySelector('#error-state .alert p').textContent = message;
    }
}