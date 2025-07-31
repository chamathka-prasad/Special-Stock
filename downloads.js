// Downloads page functionality
let currentUser = null;
let allDownloads = [];

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    checkAuthAndInitialize();
});

async function checkAuthAndInitialize() {
    try {
        const response = await fetch('check_login.php');
        const result = await response.json();
        
        if (!result.success || !result.logged_in) {
            showAlert('Please log in to view your downloads', 'error');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            return;
        }
        
        currentUser = result.user;
        initializeDownloads();
    } catch (error) {
        console.error('Auth check error:', error);
        showAlert('Error checking authentication', 'error');
    }
}

function initializeDownloads() {
    // Update user name in navigation
    const userNameElement = document.getElementById('user-name');
    if (userNameElement && currentUser) {
        userNameElement.textContent = `${currentUser.first_name} ${currentUser.last_name}`;
    }
    
    // Setup logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Setup filters
    setupFilters();
    
    // Load downloads
    loadDownloads();
    
    // Get CSRF token
    fetch('get_csrf_token.php')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.querySelector('meta[name="csrf-token"]').setAttribute('content', data.token);
            }
        })
        .catch(console.error);
}

async function handleLogout() {
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
}

function setupFilters() {
    const typeFilter = document.getElementById('type-filter');
    const sortFilter = document.getElementById('sort-filter');
    
    typeFilter.addEventListener('change', function() {
        applyFilters();
    });
    
    sortFilter.addEventListener('change', function() {
        applyFilters();
    });
}

async function loadDownloads() {
    try {
        const response = await fetch('get_user_downloads.php');
        const result = await response.json();
        
        if (result.success) {
            allDownloads = result.downloads;
            
            if (allDownloads.length === 0) {
                showEmptyState();
            } else {
                showDownloadsContent();
                applyFilters();
                displayDownloadHistory(allDownloads);
            }
        } else {
            throw new Error(result.message || 'Failed to load downloads');
        }
    } catch (error) {
        console.error('Error loading downloads:', error);
        showAlert('Failed to load downloads', 'error');
        showEmptyState();
    } finally {
        document.getElementById('loading-state').classList.add('hidden');
    }
}

function showEmptyState() {
    document.getElementById('empty-downloads').classList.remove('hidden');
}

function showDownloadsContent() {
    document.getElementById('downloads-content').classList.remove('hidden');
}

function applyFilters() {
    const typeFilter = document.getElementById('type-filter').value;
    const sortFilter = document.getElementById('sort-filter').value;
    
    let filteredDownloads = [...allDownloads];
    
    // Apply type filter
    if (typeFilter) {
        filteredDownloads = filteredDownloads.filter(item => item.file_type === typeFilter);
    }
    
    // Apply sorting
    filteredDownloads.sort((a, b) => {
        switch (sortFilter) {
            case 'oldest':
                return new Date(a.first_downloaded_at) - new Date(b.first_downloaded_at);
            case 'title':
                return a.title.localeCompare(b.title);
            case 'newest':
            default:
                return new Date(b.first_downloaded_at) - new Date(a.first_downloaded_at);
        }
    });
    
    displayDownloads(filteredDownloads);
    updateDownloadCount(filteredDownloads.length);
}

function displayDownloads(downloads) {
    const grid = document.getElementById('downloads-grid');
    
    if (downloads.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #666;">
                No downloads match your current filters
            </div>
        `;
        return;
    }
    
    grid.innerHTML = downloads.map(item => {
        const imageUrl = item.watermarked_path || item.thumbnail_path || `uploads/${item.file_path}`;
        const isPaid = item.transaction_id !== null;
        
        return `
            <div class="card">
                <img src="${imageUrl}" alt="${item.title}" class="card-image" loading="lazy">
                <div class="card-content">
                    <h3 class="card-title">${item.title}</h3>
                    <p class="card-description">By ${item.seller_name}</p>
                    <div style="margin-bottom: 1rem; font-size: 0.9rem; color: #666;">
                        <span>${item.file_type.toUpperCase()}</span> • 
                        <span>${formatFileSize(item.file_size)}</span> • 
                        <span>${isPaid ? 'Purchased' : 'Free'}</span>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="downloadContent(${item.content_id})" class="btn btn-primary" style="flex: 1; padding: 0.5rem;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 0.5rem;">
                                <path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"/>
                            </svg>
                            Download
                        </button>
                        <button onclick="viewLicense(${item.content_id})" class="btn btn-outline" style="padding: 0.5rem;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M11,9H13V7H11M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,17H13V11H11V17Z"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function displayDownloadHistory(downloads) {
    const tbody = document.getElementById('download-history');
    
    tbody.innerHTML = downloads.map(item => {
        const isPaid = item.transaction_id !== null;
        
        return `
            <tr>
                <td style="padding: 1rem; border-bottom: 1px solid #eee;">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <img src="${item.watermarked_path || item.thumbnail_path}" 
                             alt="${item.title}" 
                             style="width: 50px; height: 35px; object-fit: cover; border-radius: 4px;">
                        <div>
                            <div style="font-weight: 500;">${item.title}</div>
                            <div style="color: #666; font-size: 0.9rem;">By ${item.seller_name}</div>
                        </div>
                    </div>
                </td>
                <td style="padding: 1rem; border-bottom: 1px solid #eee;">${item.file_type.toUpperCase()}</td>
                <td style="padding: 1rem; border-bottom: 1px solid #eee;">${new Date(item.first_downloaded_at).toLocaleDateString()}</td>
                <td style="padding: 1rem; border-bottom: 1px solid #eee;">${item.download_count}</td>
                <td style="padding: 1rem; border-bottom: 1px solid #eee;">
                    <button onclick="downloadContent(${item.content_id})" class="btn btn-outline" style="padding: 0.5rem 1rem;">
                        Download Again
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function updateDownloadCount(count) {
    document.getElementById('download-count').textContent = `${count} item${count !== 1 ? 's' : ''}`;
}

async function downloadContent(contentId) {
    try {
        showLoading(true);
        
        const response = await fetch('download_content.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
            },
            body: JSON.stringify({
                content_id: contentId,
                type: 'purchased'
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Create download link
            const link = document.createElement('a');
            link.href = result.download_url;
            link.download = result.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showAlert('Download started!', 'success');
            
            // Refresh downloads to update download count
            setTimeout(() => {
                loadDownloads();
            }, 1000);
        } else {
            throw new Error(result.message || 'Download failed');
        }
        
    } catch (error) {
        console.error('Download error:', error);
        showAlert(error.message, 'error');
    } finally {
        showLoading(false);
    }
}

function viewLicense(contentId) {
    openModal('license-modal');
}