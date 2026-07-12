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
    
    async loadProduct() {
        if (!this.productId) {
            utils.showNotification('商品不存在', 'error');
            return;
        }
        
        try {
            const productDoc = await productsRef.doc(this.productId).get();
            if (!productDoc.exists) {
                utils.showNotification('商品不存在', 'error');
                return;
            }
            
            this.productData = productDoc.data();
            
            await productsRef.doc(this.productId).update({
                viewsCount: firebase.firestore.FieldValue.increment(1)
            });
            
            await this.loadSeller();
            this.updateUI();
        } catch (error) {
            console.error('加载商品失败:', error);
            utils.showNotification('加载失败', 'error');
        }
    },
    
    async loadSeller() {
        try {
            const sellerDoc = await usersRef.doc(this.productData.sellerId).get();
            if (sellerDoc.exists) {
                this.sellerData = sellerDoc.data();
            }
        } catch (error) {
            console.error('加载卖家信息失败:', error);
        }
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
            document.getElementById('mainImage').src = this.productData.images[0];
            
            const thumbnailList = document.getElementById('thumbnailList');
            thumbnailList.innerHTML = this.productData.images.map((img, index) => `
                <img src="${img}" alt="商品图片${index + 1}" class="thumbnail ${index === 0 ? 'active' : ''}" data-index="${index}">
            `).join('');
            
            thumbnailList.querySelectorAll('.thumbnail').forEach(thumb => {
                thumb.addEventListener('click', () => {
                    document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
                    thumb.classList.add('active');
                    document.getElementById('mainImage').src = this.productData.images[thumb.dataset.index];
                });
            });
        }
        
        if (this.sellerData) {
            document.getElementById('sellerAvatar').src = this.sellerData.avatar || '../images/default-avatar.png';
            document.getElementById('sellerName').textContent = this.sellerData.username;
            document.getElementById('sellerStats').textContent = `${this.sellerData.postsCount || 0}帖 · ${this.sellerData.productsCount || 0}商品`;
            document.getElementById('sellerLink').href = `profile.html?id=${this.productData.sellerId}`;
        }
        
        document.title = `${this.productData.title} - 社区平台`;
    },
    
    async addToCart() {
        if (!authModule.isLoggedIn()) {
            utils.showNotification('请先登录', 'warning');
            return;
        }
        
        try {
            const userId = authModule.getCurrentUser().uid;
            const cartRef = db.collection('carts').doc(userId);
            const cartDoc = await cartRef.get();
            
            if (cartDoc.exists) {
                const items = cartDoc.data().items || [];
                const existingItem = items.find(item => item.productId === this.productId);
                
                if (existingItem) {
                    existingItem.quantity += 1;
                    await cartRef.update({ items: items });
                } else {
                    await cartRef.update({
                        items: firebase.firestore.FieldValue.arrayUnion({
                            productId: this.productId,
                            quantity: 1
                        })
                    });
                }
            } else {
                await cartRef.set({
                    userId: userId,
                    items: [{
                        productId: this.productId,
                        quantity: 1
                    }],
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            utils.showNotification('已加入购物车', 'success');
        } catch (error) {
            console.error('加入购物车失败:', error);
            utils.showNotification('操作失败', 'error');
        }
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