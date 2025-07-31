// Checkout page functionality
let currentUser = null;
let orderTotal = 0;

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    checkAuthAndInitialize();
});

async function checkAuthAndInitialize() {
    try {
        const response = await fetch('check_login.php');
        const result = await response.json();
        
        if (!result.success || !result.logged_in) {
            showAlert('Please log in to proceed with checkout', 'error');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            return;
        }
        
        currentUser = result.user;
        initializeCheckout();
    } catch (error) {
        console.error('Auth check error:', error);
        showAlert('Error checking authentication', 'error');
    }
}

function initializeCheckout() {
    // Load cart items
    const cartItems = Cart.getItems();
    
    if (cartItems.length === 0) {
        document.getElementById('empty-checkout').classList.remove('hidden');
        return;
    }
    
    document.getElementById('checkout-content').classList.remove('hidden');
    
    // Populate user information
    populateUserInfo();
    
    // Display cart items
    displayCheckoutItems(cartItems);
    
    // Update order summary
    updateOrderSummary(cartItems);
    
    // Initialize PayPal button
    initializePayPal();
    
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

function populateUserInfo() {
    if (currentUser) {
        document.getElementById('firstName').value = currentUser.first_name || '';
        document.getElementById('lastName').value = currentUser.last_name || '';
        document.getElementById('email').value = currentUser.email || '';
    }
}

function displayCheckoutItems(items) {
    const container = document.getElementById('checkout-items');
    
    container.innerHTML = items.map(item => `
        <div style="display: flex; gap: 1rem; padding: 1rem 0; border-bottom: 1px solid #eee;">
            <div style="flex-shrink: 0;">
                <img src="${item.image || 'assets/images/placeholder.jpg'}" 
                     alt="${item.title}" 
                     style="width: 80px; height: 60px; object-fit: cover; border-radius: 4px;">
            </div>
            <div style="flex: 1;">
                <h4 style="margin: 0 0 0.5rem 0;">${item.title}</h4>
                <p style="color: #666; margin: 0; font-size: 0.9rem;">By ${item.seller}</p>
            </div>
            <div style="flex-shrink: 0; text-align: right;">
                <div style="font-weight: bold;">${formatCurrency(item.price)}</div>
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
    
    orderTotal = total;
    
    document.getElementById('summary-item-count').textContent = itemCount;
    document.getElementById('summary-subtotal').textContent = formatCurrency(subtotal);
    document.getElementById('summary-platform-fee').textContent = formatCurrency(platformFee);
    document.getElementById('summary-tax-amount').textContent = formatCurrency(taxAmount);
    document.getElementById('summary-total-amount').textContent = formatCurrency(total);
    
    // Update cart count in navigation
    Cart.updateCartCount();
}

function initializePayPal() {
    // This would normally use your actual PayPal client ID
    // For demo purposes, we'll create a mock PayPal integration
    
    const paypalContainer = document.getElementById('paypal-button-container');
    
    // Mock PayPal button (replace with actual PayPal SDK integration)
    paypalContainer.innerHTML = `
        <button id="mock-paypal-btn" class="btn btn-primary w-full" style="padding: 1rem; background: #0070ba; border: none;">
            <svg width="20" height="20" style="margin-right: 0.5rem;" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.272-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9L7.537 21.4c-.067.426.263.937.695.937h4.611c.428 0 .793-.31.862-.734l.035-.221.671-4.25.043-.289c.068-.424.434-.734.862-.734h.542c3.516 0 6.265-1.428 7.064-5.551.334-1.727.16-3.17-.676-4.195z"/>
            </svg>
            Pay with PayPal
        </button>
        <div class="text-center mt-2" style="font-size: 0.8rem; color: #666;">
            <p>Demo Mode - Click to simulate payment</p>
        </div>
    `;
    
    // Setup mock PayPal payment
    document.getElementById('mock-paypal-btn').addEventListener('click', handleMockPayment);
    
    // For production, you would use the actual PayPal SDK:
    /*
    paypal.Buttons({
        createOrder: function(data, actions) {
            return actions.order.create({
                purchase_units: [{
                    amount: {
                        value: orderTotal.toFixed(2)
                    }
                }]
            });
        },
        onApprove: function(data, actions) {
            return actions.order.capture().then(function(details) {
                handlePaymentSuccess(details);
            });
        },
        onError: function(err) {
            console.error('PayPal error:', err);
            showAlert('Payment failed. Please try again.', 'error');
        }
    }).render('#paypal-button-container');
    */
}

async function handleMockPayment() {
    // Validate billing form
    const form = document.getElementById('billing-form');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    try {
        showLoading(true);
        
        // Get cart items
        const cartItems = Cart.getItems();
        
        // Get billing information
        const billingData = new FormData(form);
        
        // Create order data
        const orderData = {
            items: cartItems,
            billing: Object.fromEntries(billingData.entries()),
            total: orderTotal,
            payment_method: 'paypal_mock',
            payment_id: 'MOCK_' + Date.now(),
            csrf_token: document.querySelector('meta[name="csrf-token"]').getAttribute('content')
        };
        
        // Process payment
        const response = await fetch('process_payment.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            handlePaymentSuccess(result);
        } else {
            throw new Error(result.message || 'Payment processing failed');
        }
        
    } catch (error) {
        console.error('Payment error:', error);
        showAlert(error.message, 'error');
    } finally {
        showLoading(false);
    }
}

function handlePaymentSuccess(paymentDetails) {
    // Clear cart
    Cart.clear();
    
    // Show success message
    document.getElementById('checkout-content').classList.add('hidden');
    document.getElementById('checkout-success').classList.remove('hidden');
    
    // Update page title
    document.title = 'Payment Successful - SpecialStock AI';
    
    // Log success
    console.log('Payment successful:', paymentDetails);
    
    // Update cart count in navigation
    Cart.updateCartCount();
    
    showAlert('Payment successful! You can now download your content.', 'success');
}