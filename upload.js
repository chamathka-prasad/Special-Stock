// Upload functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in and authorized
    checkUploadAuthorization();
    
    // Initialize upload form
    initializeUploadForm();
});

async function checkUploadAuthorization() {
    try {
        const response = await fetch('check_login.php');
        const result = await response.json();
        
        if (!result.success || !result.logged_in) {
            showAlert('Please log in to upload content', 'error');
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

function initializeUploadForm() {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('fileInput');
    const uploadForm = document.getElementById('uploadForm');
    const pricingRadios = document.querySelectorAll('input[name="pricing_type"]');
    const priceInputGroup = document.getElementById('price-input-group');
    const logoutBtn = document.getElementById('logout-btn');

    // Get CSRF token
    fetch('get_csrf_token.php')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.querySelector('meta[name="csrf-token"]').setAttribute('content', data.token);
            }
        })
        .catch(console.error);

    // Setup logout
    if (logoutBtn) {
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
    }

    // File upload area interactions
    uploadArea.addEventListener('click', function() {
        fileInput.click();
    });

    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.style.borderColor = '#000';
        this.style.backgroundColor = '#f8f8f8';
    });

    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        this.style.borderColor = '#ccc';
        this.style.backgroundColor = 'transparent';
    });

    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        this.style.borderColor = '#ccc';
        this.style.backgroundColor = 'transparent';
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            handleFileSelect(files[0]);
        }
    });

    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });

    // Pricing type change
    pricingRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'paid') {
                priceInputGroup.classList.remove('hidden');
                document.getElementById('price').required = true;
            } else {
                priceInputGroup.classList.add('hidden');
                document.getElementById('price').required = false;
                document.getElementById('price').value = '';
            }
        });
    });

    // Form submission
    uploadForm.addEventListener('submit', handleFormSubmission);
}

function handleFileSelect(file) {
    const placeholder = document.getElementById('upload-placeholder');
    const preview = document.getElementById('upload-preview');
    const previewImage = document.getElementById('preview-image');
    const previewVideo = document.getElementById('preview-video');
    const fileInfo = document.getElementById('file-info');

    // Validate file
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
        showAlert('File size must be less than 50MB', 'error');
        return;
    }

    const allowedTypes = [
        'image/jpeg', 'image/png', 'image/webp',
        'video/mp4', 'video/avi', 'video/mov'
    ];
    
    if (!allowedTypes.includes(file.type)) {
        showAlert('Unsupported file type. Please use JPG, PNG, WebP, MP4, AVI, or MOV.', 'error');
        return;
    }

    // Show preview
    placeholder.classList.add('hidden');
    preview.classList.remove('hidden');

    // Display file info
    fileInfo.textContent = `${file.name} (${formatFileSize(file.size)})`;

    // Show appropriate preview
    if (file.type.startsWith('image/')) {
        previewImage.classList.remove('hidden');
        previewVideo.classList.add('hidden');
        
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    } else if (file.type.startsWith('video/')) {
        previewImage.classList.add('hidden');
        previewVideo.classList.remove('hidden');
        
        const reader = new FileReader();
        reader.onload = function(e) {
            previewVideo.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // Auto-generate title from filename
    const titleInput = document.getElementById('title');
    if (!titleInput.value) {
        const filename = file.name.split('.')[0];
        titleInput.value = filename.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
}

async function handleFormSubmission(e) {
    e.preventDefault();
    
    const fileInput = document.getElementById('fileInput');
    const titleInput = document.getElementById('title');
    const descriptionInput = document.getElementById('description');
    const tagsInput = document.getElementById('tags');
    const pricingType = document.querySelector('input[name="pricing_type"]:checked').value;
    const priceInput = document.getElementById('price');
    const rightsCheck = document.getElementById('rights');

    // Validate form
    if (!fileInput.files[0]) {
        showAlert('Please select a file to upload', 'error');
        return;
    }

    if (!titleInput.value.trim()) {
        showAlert('Please enter a title', 'error');
        return;
    }

    if (pricingType === 'paid' && (!priceInput.value || parseFloat(priceInput.value) <= 0)) {
        showAlert('Please enter a valid price', 'error');
        return;
    }

    if (!rightsCheck.checked) {
        showAlert('Please confirm that you own the rights to this content', 'error');
        return;
    }

    try {
        showUploadProgress(true);
        
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        formData.append('title', titleInput.value.trim());
        formData.append('description', descriptionInput.value.trim());
        formData.append('tags', tagsInput.value.trim());
        formData.append('pricing_type', pricingType);
        
        if (pricingType === 'paid') {
            formData.append('price', priceInput.value);
        }
        
        formData.append('model_release', document.getElementById('model-release').checked ? '1' : '0');
        formData.append('property_release', document.getElementById('property-release').checked ? '1' : '0');
        formData.append('csrf_token', document.querySelector('meta[name="csrf-token"]').getAttribute('content'));

        // Upload with progress
        const result = await uploadWithProgress(formData, 'upload.php');
        
        if (result.success) {
            showAlert('Content uploaded successfully! It will be reviewed before appearing on the platform.', 'success');
            
            // Reset form
            document.getElementById('uploadForm').reset();
            document.getElementById('upload-placeholder').classList.remove('hidden');
            document.getElementById('upload-preview').classList.add('hidden');
            document.getElementById('price-input-group').classList.add('hidden');
            
            // Redirect to dashboard after delay
            setTimeout(() => {
                window.location.href = 'seller_dashboard.html';
            }, 3000);
        } else {
            throw new Error(result.message || 'Upload failed');
        }
        
    } catch (error) {
        console.error('Upload error:', error);
        showAlert(error.message, 'error');
    } finally {
        showUploadProgress(false);
    }
}

function uploadWithProgress(formData, url) {
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', function(e) {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                progressBar.style.width = percentComplete + '%';
                progressText.textContent = `Uploading... ${Math.round(percentComplete)}%`;
            }
        });
        
        xhr.addEventListener('load', function() {
            if (xhr.status === 200) {
                try {
                    const result = JSON.parse(xhr.responseText);
                    resolve(result);
                } catch (e) {
                    reject(new Error('Invalid response format'));
                }
            } else {
                reject(new Error('Upload failed'));
            }
        });
        
        xhr.addEventListener('error', function() {
            reject(new Error('Upload failed'));
        });
        
        xhr.open('POST', url);
        xhr.send(formData);
    });
}

function showUploadProgress(show) {
    const uploadProgress = document.getElementById('upload-progress');
    const submitBtn = document.getElementById('submit-btn');
    
    if (show) {
        uploadProgress.classList.remove('hidden');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Uploading...';
    } else {
        uploadProgress.classList.add('hidden');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Upload Content';
        
        // Reset progress
        document.getElementById('progress-bar').style.width = '0%';
        document.getElementById('progress-text').textContent = 'Uploading...';
    }
}