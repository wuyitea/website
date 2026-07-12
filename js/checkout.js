// 结算模块
const checkout = {
    productIds: [],
    products: [],
    shippingFee: 0,
    
    init() {
        this.checkAuth();
        this.getProductIds();
        this.loadProducts();
        this.setupEventListeners();
    },
    
    checkAuth() {
        if (!authModule.isLoggedIn()) {
            utils.showNotification('请先登录', 'warning');
            window.location.href = '../index.html';
        }
    },
    
    getProductIds() {
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('product');
        if (productId) {
            this.productIds = [productId];
        }
    },
    
    setupEventListeners() {
        document.querySelectorAll('.payment-method').forEach(method => {
            method.addEventListener('click', () => {
                document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('selected'));
                method.classList.add('selected');
                method.querySelector('input').checked = true;
            });
        });
        
        const submitOrderBtn = document.getElementById('submitOrderBtn');
        if (submitOrderBtn) {
            submitOrderBtn.addEventListener('click', () => this.submitOrder());
        }
    },
    
    async loadProducts() {
        const orderItems = document.getElementById('orderItems');
        if (!orderItems) return;
        
        if (this.productIds.length === 0) {
            orderItems.innerHTML = '<div class="empty-state"><p>购物车为空</p></div>';
            return;
        }
        
        try {
            let html = '';
            let subtotal = 0;
            
            for (const productId of this.productIds) {
                const productDoc = await productsRef.doc(productId).get();
                if (productDoc.exists) {
                    const productData = productDoc.data();
                    this.products.push({ id: productId, ...productData });
                    
                    subtotal += productData.price;
                    
                    html += `
                        <div class="order-item">
                            <img src="${productData.images?.[0] || '../images/default-product.png'}" 
                                 alt="${productData.title}" class="order-image">
                            <div class="order-info">
                                <div class="order-title">${productData.title}</div>
                                <div class="order-meta">x1</div>
                            </div>
                            <div class="order-price">${utils.formatPrice(productData.price)}</div>
                        </div>
                    `;
                }
            }
            
            orderItems.innerHTML = html;
            
            this.shippingFee = subtotal > 99 ? 0 : 10;
            const total = subtotal + this.shippingFee;
            
            document.getElementById('subtotal').textContent = utils.formatPrice(subtotal);
            document.getElementById('shipping').textContent = this.shippingFee === 0 ? '免运费' : utils.formatPrice(this.shippingFee);
            document.getElementById('totalPrice').textContent = utils.formatPrice(total);
        } catch (error) {
            console.error('加载商品失败:', error);
            orderItems.innerHTML = '<div class="empty-state"><p>加载失败</p></div>';
        }
    },
    
    async submitOrder() {
        const receiverName = document.getElementById('receiverName').value.trim();
        const receiverPhone = document.getElementById('receiverPhone').value.trim();
        const receiverAddress = document.getElementById('receiverAddress').value.trim();
        const paymentMethod = document.querySelector('input[name="payment"]:checked').value;
        
        if (!receiverName || !receiverPhone || !receiverAddress) {
            utils.showNotification('请填写完整的收货信息', 'error');
            return;
        }
        
        try {
            const user = authModule.getCurrentUser();
            
            for (const product of this.products) {
                await ordersRef.add({
                    productId: product.id,
                    buyerId: user.uid,
                    sellerId: product.sellerId,
                    receiverName: receiverName,
                    receiverPhone: receiverPhone,
                    receiverAddress: receiverAddress,
                    paymentMethod: paymentMethod,
                    amount: product.price,
                    status: 'pending',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                await productsRef.doc(product.id).update({
                    status: 'sold',
                    salesCount: firebase.firestore.FieldValue.increment(1)
                });
            }
            
            utils.showNotification('订单提交成功', 'success');
            setTimeout(() => {
                window.location.href = 'profile.html';
            }, 1500);
        } catch (error) {
            console.error('提交订单失败:', error);
            utils.showNotification('提交失败，请稍后再试', 'error');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    checkout.init();
});