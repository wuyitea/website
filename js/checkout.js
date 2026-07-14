// 结算模块（localStorage 版本 - 简化版）
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

    loadProducts() {
        const orderItems = document.getElementById('orderItems');
        if (!orderItems) return;

        if (this.productIds.length === 0) {
            orderItems.innerHTML = '<div class="empty-state"><p>购物车为空</p></div>';
            return;
        }

        const allProducts = JSON.parse(localStorage.getItem('products') || '[]');

        let html = '';
        let subtotal = 0;

        for (const productId of this.productIds) {
            const productData = allProducts.find(p => p.id === productId);
            if (productData) {
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

        if (this.products.length === 0) {
            orderItems.innerHTML = '<div class="empty-state"><p>商品不存在</p></div>';
            return;
        }

        orderItems.innerHTML = html;

        this.shippingFee = subtotal > 99 ? 0 : 10;
        const total = subtotal + this.shippingFee;

        document.getElementById('subtotal').textContent = utils.formatPrice(subtotal);
        document.getElementById('shipping').textContent = this.shippingFee === 0 ? '免运费' : utils.formatPrice(this.shippingFee);
        document.getElementById('totalPrice').textContent = utils.formatPrice(total);
    },

    submitOrder() {
        const receiverName = document.getElementById('receiverName').value.trim();
        const receiverPhone = document.getElementById('receiverPhone').value.trim();
        const receiverAddress = document.getElementById('receiverAddress').value.trim();
        const paymentInput = document.querySelector('input[name="payment"]:checked');
        const paymentMethod = paymentInput ? paymentInput.value : 'alipay';

        if (!receiverName || !receiverPhone || !receiverAddress) {
            utils.showNotification('请填写完整的收货信息', 'error');
            return;
        }

        const user = authModule.getCurrentUser();
        const orders = JSON.parse(localStorage.getItem('orders') || '[]');
        const products = JSON.parse(localStorage.getItem('products') || '[]');

        for (const product of this.products) {
            orders.push({
                id: utils.generateId(),
                productId: product.id,
                buyerId: user.id,
                sellerId: product.sellerId,
                receiverName: receiverName,
                receiverPhone: receiverPhone,
                receiverAddress: receiverAddress,
                paymentMethod: paymentMethod,
                amount: product.price,
                status: 'pending',
                createdAt: new Date().toISOString()
            });

            const pIndex = products.findIndex(p => p.id === product.id);
            if (pIndex !== -1) {
                products[pIndex].status = 'sold';
                products[pIndex].salesCount = (products[pIndex].salesCount || 0) + 1;
            }
        }

        localStorage.setItem('orders', JSON.stringify(orders));
        localStorage.setItem('products', JSON.stringify(products));

        utils.showNotification('下单成功', 'success');
        setTimeout(() => {
            window.location.href = 'market.html';
        }, 1500);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    checkout.init();
});
