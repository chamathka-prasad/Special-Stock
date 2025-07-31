// Seller dashboard functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check seller authorization
    checkSellerAuthorization();
    
    // Initialize dashboard
    initializeDashboard();
});

async function checkSellerAuthorization() {
    try {
        const response = await fetch('check_login.php');
        const result = await response.json();
        
        if (!result.success || !result.logged_in) {
            showAlert('Please log in to access your dashboard', 'error');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            return;
        }
        
        // Update user name in navigation
        const userNameElement = document.getElementById('user-name');
        if (userNameElement && result.user) {
            userNameElement.textContent = `${result.user.first_name} ${result.user.last_name}`;
        }
        
    } catch (error) {
        console.error('Authorization check error:', error);
        showAlert('Error checking authorization', 'error');
    }
}

function initializeDashboard() {
    // Get CSRF token
    fetch('get_csrf_token.php')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.querySelector('meta[name="csrf-token"]').setAttribute('content', data.token);
            }
        })
        .catch(console.error);

    // Load dashboard data
    loadSellerStats();
    loadMyContent();
    
    // Setup event listeners
    setupEventListeners();
}

function setupEventListeners() {
    const statusFilter = document.getElementById('status-filter');
    const logoutBtn = document.getElementById('logout-btn');
    const exportEarningsBtn = document.getElementById('export-earnings-btn');

    // Status filter change
    statusFilter.addEventListener('change', function() {
        loadMyContent(this.value);
    });

    // Logout button
    logoutBtn.addEventListener('click', async function() {
        try {
            const response = await fetch('logout.php', { method: 'POST' });
            const result = await response.json();
            
            if (result.success) {
                localStorage.removeItem('user');
                showAlert('Logged out successfully', 'success');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            }
        } catch (error) {
            console.error('Logout error:', error);
        }
    });

    // Export earnings button
    exportEarningsBtn.addEventListener('click', function() {
        showAlert('Export feature coming soon!', 'info');
    });
}

async function loadSellerStats() {
    try {
        const response = await fetch('get_seller_stats.php');
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('total-uploads').textContent = result.stats.total_uploads.toLocaleString();
            document.getElementById('approved-uploads').textContent = result.stats.approved_uploads.toLocaleString();
            document.getElementById('total-downloads').textContent = result.stats.total_downloads.toLocaleString();
            document.getElementById('total-earnings').textContent = formatCurrency(result.stats.total_earnings);
        }
    } catch (error) {
        console.error('Error loading seller stats:', error);
    }
}

async function loadMyContent(status = 'all') {
    try {
        const params = new URLSearchParams();
        if (status !== 'all') {
            params.append('status', status);
        }
        
        const response = await fetch(`get_my_content.php?${params}`);
        const result = await response.json();
        
        const container = document.getElementById('my-content');
        
        if (result.success && result.content.length > 0) {
            container.innerHTML = result.content.map(item => createMyContentItem(item)).join('');
        } else {
            container.innerHTML = `
                <div class="card text-center" style="padding: 2rem;">
                    <p>No content found.</p>
                    <a href="upload.html" class="btn btn-primary mt-3">Upload Your First Content</a>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading my content:', error);
        document.getElementById('my-content').innerHTML = `
            <div class="alert alert-error">
                Error loading your content. Please refresh the page.
            </div>
        `;
    }
}

function createMyContentItem(item) {
    const statusBadge = getStatusBadge(item.status);
    const imageUrl = item.watermarked_path || item.thumbnail_path || `uploads/${item.file_path}`;
    const price = item.is_free ? 'Free' : formatCurrency(item.price);
    
    return `
        <div class="card mb-3">
            <div style="display: flex; gap: 1rem; padding: 1rem;">
                <div style="flex-shrink: 0;">
                    ${item.file_type === 'image' ? 
                        `<img src="${imageUrl}" alt="${item.title}" style="width: 120px; height: 80px; object-fit: cover; border-radius: 4px;">` :
                        `<div style="width: 120px; height: 80px; background: #f0f0f0; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
                            <span style="font-size: 2rem;">🎥</span>
                        </div>`
                    }
                </div>
                <div style="flex: 1;">
                    <div class="flex justify-between items-start mb-2">
                        <h3 style="margin: 0;">${item.title}</h3>
                        ${statusBadge}
                    </div>
                    <p style="color: #666; margin-bottom: 0.5rem;">${item.description || 'No description'}</p>
                    <div style="display: flex; gap: 1rem; font-size: 0.9rem; color: #666;">
                        <span>Type: ${item.file_type}</span>
                        <span>Price: ${price}</span>
                        <span>Downloads: ${item.downloads_count}</span>
                        <span>Uploaded: ${new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                    ${item.status === 'rejected' ? `
                        <div class="mt-2">
                            <strong style="color: #dc3545;">Rejection Reason:</strong>
                            <p style="color: #666; margin: 0.5rem 0;">${item.rejection_reason}</p>
                        </div>
                    ` : ''}
                </div>
                <div style="flex-shrink: 0; display: flex; flex-direction: column; gap: 0.5rem;">
                    ${item.status === 'approved' ? `
                        <button onclick="viewContent(${item.id})" class="btn btn-outline" style="padding: 0.5rem 1rem;">View</button>
                    ` : ''}
                    ${item.status === 'rejected' ? `
                        <button onclick="resubmitContent(${item.id})" class="btn btn-primary" style="padding: 0.5rem 1rem;">Edit & Resubmit</button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

function getStatusBadge(status) {
    const badges = {
        'pending': '<span style="background: #ffa500; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem;">Pending Review</span>',
        'approved': '<span style="background: #28a745; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem;">Approved</span>',
        'rejected': '<span style="background: #dc3545; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem;">Rejected</span>'
    };
    return badges[status] || '';
}

function viewContent(contentId) {
    window.location.href = `content_detail.html?id=${contentId}`;
}

function resubmitContent(contentId) {
    showAlert('Edit and resubmit feature coming soon!', 'info');
}