// 商品详情模块
const product = {
    productId: null,
    productData: null,
    sellerData: null,

    init() {
        this.getProductId();
        this.loadProduct();
        this.setupEventListeners();
    },

    getProductId() {
        const urlParams = new URLSearchParams(window.location.search);
        this.productId = urlParams.get('id');
    },

    setupEventListeners() {
        const addToCartBtn = document.getElementById('addToCartBtn');
        if (addToCartBtn) {
            addToCartBtn.addEventListener('click', () => this.addToCart());
        }

        const buyNowBtn = document.getElementById('buyNowBtn');
        if (buyNowBtn) {
            buyNowBtn.addEventListener('click', () => this.buyNow());
        }
    },

    loadProduct() {
        if (!this.productId) {
            utils.showNotification('商品不存在', 'error');
            return;
        }

        const products = JSON.parse(localStorage.getItem('products') || '[]');
        const productIndex = products.findIndex(p => p.id === this.productId);

        if (productIndex === -1) {
            utils.showNotification('商品不存在', 'error');
            return;
        }

        products[productIndex].viewsCount = (products[productIndex].viewsCount || 0) + 1;
        localStorage.setItem('products', JSON.stringify(products));
        this.productData = products[productIndex];

        this.loadSeller();
        this.updateUI();
    },

    loadSeller() {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        this.sellerData = users.find(u => u.id === this.productData.sellerId) || null;
    },

    updateUI() {
        const category = appConfig.productCategories.find(c => c.id === this.productData.category);

        document.getElementById('productCategory').textContent = category ? `${category.icon} ${category.name}` : '';
        document.getElementById('productTitle').textContent = this.productData.title;
        document.getElementById('productPrice').textContent = utils.formatPrice(this.productData.price);
        document.getElementById('productDescription').textContent = this.productData.description;
        document.getElementById('viewsCount').textContent = this.productData.viewsCount || 0;
        document.getElementById('publishTime').textContent = utils.formatDate(this.productData.createdAt);

        const condition = this.productData.condition === 'new' ? '全新' : '二手';
        document.getElementById('productCondition').textContent = condition;

        if (this.productData.originalPrice) {
            document.getElementById('originalPrice').textContent = utils.formatPrice(this.productData.originalPrice);
            const discount = Math.round((1 - this.productData.price / this.productData.originalPrice) * 100);
            document.getElementById('discountBadge').textContent = `省${discount}%`;
            document.getElementById('discountBadge').style.display = 'inline-block';
        }

        if (this.productData.images && this.productData.images.length > 0) {
            var mainImg = this.productData.images[0];
            document.getElementById('mainImage').src = (mainImg && mainImg.indexOf('data:') === 0) ? mainImg : '../' + mainImg.replace(/^\.\.\//, '');

            const thumbnailList = document.getElementById('thumbnailList');
            thumbnailList.innerHTML = this.productData.images.map((img, index) => {
                const src = (img && img.indexOf('data:') === 0) ? img : '../' + img.replace(/^\.\.\//, '');
                return `<img src="${src}" alt="商品图片${index + 1}" class="thumbnail ${index === 0 ? 'active' : ''}" data-index="${index}">`;
            }).join('');

            thumbnailList.querySelectorAll('.thumbnail').forEach(thumb => {
                thumb.addEventListener('click', () => {
                    document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
                    thumb.classList.add('active');
                    const idx = thumb.dataset.index;
                    const src = this.productData.images[idx];
                    document.getElementById('mainImage').src = (src && src.indexOf('data:') === 0) ? src : '../' + src.replace(/^\.\.\//, '');
                });
            });
        }

        if (this.sellerData) {
            const sav = this.sellerData.avatar || '../images/default-avatar.png';
            document.getElementById('sellerAvatar').src = (sav && sav.indexOf('data:') === 0) ? sav : '../' + sav.replace(/^\.\.\//, '');
            document.getElementById('sellerName').textContent = this.sellerData.username;
            document.getElementById('sellerStats').textContent = `${this.sellerData.postsCount || 0}帖 · ${this.sellerData.productsCount || 0}商品`;
            document.getElementById('sellerLink').href = `profile.html?id=${this.productData.sellerId}`;
        }

        document.title = `${this.productData.title} - 社区平台`;
    },

    addToCart() {
        if (!authModule.isLoggedIn()) {
            utils.showNotification('请先登录', 'warning');
            return;
        }

        const userId = authModule.getCurrentUser().id;
        const carts = JSON.parse(localStorage.getItem('carts') || '{}');

        if (!carts[userId]) {
            carts[userId] = { items: [] };
        }

        const existingItem = carts[userId].items.find(item => item.productId === this.productId);

        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            carts[userId].items.push({
                productId: this.productId,
                quantity: 1
            });
        }

        localStorage.setItem('carts', JSON.stringify(carts));
        utils.showNotification('已加入购物车', 'success');
    },

    buyNow() {
        if (!authModule.isLoggedIn()) {
            utils.showNotification('请先登录', 'warning');
            return;
        }
        window.location.href = `checkout.html?product=${this.productId}`;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    product.init();
});
