// Admin dashboard functionality
let currentContentId = null;

document.addEventListener('DOMContentLoaded', function() {
    // Check admin authorization
    checkAdminAuthorization();
    
    // Initialize dashboard
    initializeDashboard();
});

async function checkAdminAuthorization() {
    try {
        const response = await fetch('check_login.php');
        const result = await response.json();
        
        if (!result.success || !result.logged_in || result.user.role !== 'admin') {
            showAlert('Admin access required', 'error');
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
    loadAdminStats();
    loadContentQueue();
    loadUsers();
    loadRecentTransactions();
    
    // Setup event listeners
    setupEventListeners();
}

function setupEventListeners() {
    const statusFilter = document.getElementById('status-filter');
    const refreshBtn = document.getElementById('refresh-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const exportUsersBtn = document.getElementById('export-users-btn');

    // Status filter change
    statusFilter.addEventListener('change', function() {
        loadContentQueue(this.value);
    });

    // Refresh button
    refreshBtn.addEventListener('click', function() {
        loadContentQueue(statusFilter.value);
        loadAdminStats();
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

    // Export users button
    exportUsersBtn.addEventListener('click', function() {
        window.open('export_users.php', '_blank');
    });

    // Modal event listeners
    document.getElementById('approve-btn').addEventListener('click', handleApprove);
    document.getElementById('reject-btn').addEventListener('click', () => openModal('rejection-modal'));
    document.getElementById('rejection-form').addEventListener('submit', handleReject);
}

async function loadAdminStats() {
    try {
        const response = await fetch('get_admin_stats.php');
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('pending-count').textContent = result.stats.pending.toLocaleString();
            document.getElementById('approved-count').textContent = result.stats.approved.toLocaleString();
            document.getElementById('users-count').textContent = result.stats.users.toLocaleString();
            document.getElementById('revenue-count').textContent = formatCurrency(result.stats.revenue);
        }
    } catch (error) {
        console.error('Error loading admin stats:', error);
    }
}

async function loadContentQueue(status = 'pending') {
    try {
        const response = await fetch(`get_pending_content.php?status=${status}`);
        const result = await response.json();
        
        const container = document.getElementById('content-queue');
        
        if (result.success && result.content.length > 0) {
            container.innerHTML = result.content.map(item => createContentQueueItem(item)).join('');
        } else {
            container.innerHTML = `
                <div class="card text-center" style="padding: 2rem;">
                    <p>No ${status} content found.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading content queue:', error);
        document.getElementById('content-queue').innerHTML = `
            <div class="alert alert-error">
                Error loading content queue. Please refresh the page.
            </div>
        `;
    }
}

function createContentQueueItem(item) {
    const statusBadge = getStatusBadge(item.status);
    const imageUrl = item.file_path ? `uploads/${item.file_path}` : 'assets/images/placeholder.jpg';
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
                        <span>By: ${item.seller_name}</span>
                        <span>Type: ${item.file_type}</span>
                        <span>Price: ${price}</span>
                        <span>Uploaded: ${new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
                <div style="flex-shrink: 0; display: flex; flex-direction: column; gap: 0.5rem;">
                    <button onclick="reviewContent(${item.id})" class="btn btn-outline" style="padding: 0.5rem 1rem;">Review</button>
                    ${item.status === 'pending' ? `
                        <button onclick="quickApprove(${item.id})" class="btn btn-primary" style="padding: 0.5rem 1rem;">Quick Approve</button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

function getStatusBadge(status) {
    const badges = {
        'pending': '<span style="background: #ffa500; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem;">Pending</span>',
        'approved': '<span style="background: #28a745; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem;">Approved</span>',
        'rejected': '<span style="background: #dc3545; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem;">Rejected</span>'
    };
    return badges[status] || '';
}

async function reviewContent(contentId) {
    try {
        currentContentId = contentId;
        const response = await fetch(`get_content_details.php?id=${contentId}&admin=1`);
        const result = await response.json();
        
        if (result.success) {
            const content = result.content;
            const imageUrl = content.file_path ? `uploads/${content.file_path}` : 'assets/images/placeholder.jpg';
            const price = content.is_free ? 'Free' : formatCurrency(content.price);
            
            document.getElementById('modal-content').innerHTML = `
                <div style="display: flex; gap: 2rem;">
                    <div style="flex-shrink: 0;">
                        ${content.file_type === 'image' ? 
                            `<img src="${imageUrl}" alt="${content.title}" style="max-width: 300px; max-height: 300px; border-radius: 4px;">` :
                            `<video src="${imageUrl}" controls style="max-width: 300px; max-height: 300px; border-radius: 4px;"></video>`
                        }
                    </div>
                    <div style="flex: 1;">
                        <h3>${content.title}</h3>
                        <p><strong>Description:</strong> ${content.description || 'No description'}</p>
                        <p><strong>Seller:</strong> ${content.seller_name}</p>
                        <p><strong>File Type:</strong> ${content.file_type}</p>
                        <p><strong>Price:</strong> ${price}</p>
                        <p><strong>File Size:</strong> ${formatFileSize(content.file_size)}</p>
                        ${content.width && content.height ? `<p><strong>Dimensions:</strong> ${content.width} x ${content.height}px</p>` : ''}
                        <p><strong>Uploaded:</strong> ${new Date(content.created_at).toLocaleDateString()}</p>
                        ${content.tags ? `<p><strong>Tags:</strong> ${content.tags.join(', ')}</p>` : ''}
                        ${content.status === 'rejected' ? `<p><strong>Rejection Reason:</strong> ${content.rejection_reason}</p>` : ''}
                    </div>
                </div>
            `;
            
            openModal('review-modal');
        } else {
            showAlert('Error loading content details', 'error');
        }
    } catch (error) {
        console.error('Error reviewing content:', error);
        showAlert('Error loading content details', 'error');
    }
}

async function quickApprove(contentId) {
    if (!confirm('Are you sure you want to approve this content?')) {
        return;
    }
    
    try {
        const response = await fetch('approve_content.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
            },
            body: JSON.stringify({
                content_id: contentId,
                action: 'approve'
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert('Content approved successfully!', 'success');
            loadContentQueue(document.getElementById('status-filter').value);
            loadAdminStats();
        } else {
            showAlert(result.message || 'Approval failed', 'error');
        }
    } catch (error) {
        console.error('Approval error:', error);
        showAlert('Error approving content', 'error');
    }
}

async function handleApprove() {
    if (!currentContentId) return;
    
    try {
        const response = await fetch('approve_content.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
            },
            body: JSON.stringify({
                content_id: currentContentId,
                action: 'approve'
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert('Content approved successfully!', 'success');
            closeModal('review-modal');
            loadContentQueue(document.getElementById('status-filter').value);
            loadAdminStats();
        } else {
            showAlert(result.message || 'Approval failed', 'error');
        }
    } catch (error) {
        console.error('Approval error:', error);
        showAlert('Error approving content', 'error');
    }
}

async function handleReject(e) {
    e.preventDefault();
    
    if (!currentContentId) return;
    
    const reason = document.getElementById('rejection-reason').value.trim();
    if (!reason) {
        showAlert('Please provide a rejection reason', 'error');
        return;
    }
    
    try {
        const response = await fetch('approve_content.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
            },
            body: JSON.stringify({
                content_id: currentContentId,
                action: 'reject',
                reason: reason
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert('Content rejected', 'success');
            closeModal('rejection-modal');
            closeModal('review-modal');
            document.getElementById('rejection-form').reset();
            loadContentQueue(document.getElementById('status-filter').value);
            loadAdminStats();
        } else {
            showAlert(result.message || 'Rejection failed', 'error');
        }
    } catch (error) {
        console.error('Rejection error:', error);
        showAlert('Error rejecting content', 'error');
    }
}

async function loadUsers() {
    try {
        const response = await fetch('get_users.php');
        const result = await response.json();
        
        const tbody = document.getElementById('users-table');
        
        if (result.success && result.users.length > 0) {
            tbody.innerHTML = result.users.map(user => `
                <tr>
                    <td style="padding: 1rem; border-bottom: 1px solid #eee;">${user.id}</td>
                    <td style="padding: 1rem; border-bottom: 1px solid #eee;">${user.first_name} ${user.last_name}</td>
                    <td style="padding: 1rem; border-bottom: 1px solid #eee;">${user.email}</td>
                    <td style="padding: 1rem; border-bottom: 1px solid #eee;">${user.role}</td>
                    <td style="padding: 1rem; border-bottom: 1px solid #eee;">
                        <span style="color: ${user.is_active ? 'green' : 'red'};">
                            ${user.is_active ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                    <td style="padding: 1rem; border-bottom: 1px solid #eee;">${new Date(user.created_at).toLocaleDateString()}</td>
                    <td style="padding: 1rem; border-bottom: 1px solid #eee;">
                        <button onclick="toggleUserStatus(${user.id}, ${user.is_active})" class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">
                            ${user.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="7" style="padding: 2rem; text-align: center;">No users found</td></tr>';
        }
    } catch (error) {
        console.error('Error loading users:', error);
        document.getElementById('users-table').innerHTML = 
            '<tr><td colspan="7" style="padding: 2rem; text-align: center;">Error loading users</td></tr>';
    }
}

async function loadRecentTransactions() {
    try {
        const response = await fetch('get_recent_transactions.php');
        const result = await response.json();
        
        const tbody = document.getElementById('transactions-table');
        
        if (result.success && result.transactions.length > 0) {
            tbody.innerHTML = result.transactions.map(transaction => `
                <tr>
                    <td style="padding: 1rem; border-bottom: 1px solid #eee;">${transaction.id}</td>
                    <td style="padding: 1rem; border-bottom: 1px solid #eee;">${transaction.buyer_name}</td>
                    <td style="padding: 1rem; border-bottom: 1px solid #eee;">${transaction.content_title}</td>
                    <td style="padding: 1rem; border-bottom: 1px solid #eee;">${formatCurrency(transaction.amount)}</td>
                    <td style="padding: 1rem; border-bottom: 1px solid #eee;">${transaction.status}</td>
                    <td style="padding: 1rem; border-bottom: 1px solid #eee;">${new Date(transaction.created_at).toLocaleDateString()}</td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="6" style="padding: 2rem; text-align: center;">No transactions found</td></tr>';
        }
    } catch (error) {
        console.error('Error loading transactions:', error);
        document.getElementById('transactions-table').innerHTML = 
            '<tr><td colspan="6" style="padding: 2rem; text-align: center;">Error loading transactions</td></tr>';
    }
}

async function toggleUserStatus(userId, currentStatus) {
    const action = currentStatus ? 'deactivate' : 'activate';
    
    if (!confirm(`Are you sure you want to ${action} this user?`)) {
        return;
    }
    
    try {
        const response = await fetch('toggle_user_status.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
            },
            body: JSON.stringify({
                user_id: userId,
                active: !currentStatus
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert(`User ${action}d successfully`, 'success');
            loadUsers();
        } else {
            showAlert(result.message || `Failed to ${action} user`, 'error');
        }
    } catch (error) {
        console.error('Error toggling user status:', error);
        showAlert('Error updating user status', 'error');
    }
}