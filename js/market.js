// 市场模块
const market = {
    currentPage: 1,
    productsPerPage: 12,
    currentCategory: null,
    currentSort: 'latest',
    currentStatus: 'all',
    minPrice: null,
    maxPrice: null,
    
    // 初始化市场
    init() {
        this.loadCategories();
        this.loadProducts();
        this.setupEventListeners();
    },
    
    // 设置事件监听
    setupEventListeners() {
        // 发布商品按钮
        const sellBtn = document.getElementById('sellBtn');
        if (sellBtn) {
            sellBtn.addEventListener('click', () => {
                if (!authModule.isLoggedIn()) {
                    utils.showNotification('请先登录', 'warning');
                    return;
                }
                this.showSellModal();
            });
        }
        
        // 发布商品表单
        const sellForm = document.getElementById('sellForm');
        if (sellForm) {
            sellForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitProduct();
            });
        }
        
        // 排序选择
        const sortSelect = document.getElementById('sortSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', () => {
                this.currentSort = sortSelect.value;
                this.currentPage = 1;
                this.loadProducts();
            });
        }
        
        // 价格筛选
        const filterPriceBtn = document.getElementById('filterPriceBtn');
        if (filterPriceBtn) {
            filterPriceBtn.addEventListener('click', () => {
                this.minPrice = document.getElementById('minPrice').value || null;
                this.maxPrice = document.getElementById('maxPrice').value || null;
                this.currentPage = 1;
                this.loadProducts();
            });
        }
        
        // 状态筛选
        document.querySelectorAll('[data-status]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('[data-status]').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                this.currentStatus = link.dataset.status;
                this.currentPage = 1;
                this.loadProducts();
            });
        });
        
        // 模态框关闭
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.modal').forEach(modal => {
                    modal.style.display = 'none';
                });
            });
        });
        
        // 点击模态框外部关闭
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    },
    
    // 加载分类
    async loadCategories() {
        const categoryList = document.getElementById('categoryList');
        const productCategory = document.getElementById('productCategory');
        
        if (!categoryList) return;
        
        let html = '<li class="category-item"><a href="#" class="category-link active" data-category="all">全部分类</a></li>';
        let selectHtml = '<option value="">请选择分类</option>';
        
        appConfig.productCategories.forEach(category => {
            html += `
                <li class="category-item">
                    <a href="#" class="category-link" data-category="${category.id}">
                        ${category.icon} ${category.name}
                    </a>
                </li>
            `;
            selectHtml += `<option value="${category.id}">${category.icon} ${category.name}</option>`;
        });
        
        categoryList.innerHTML = html;
        if (productCategory) {
            productCategory.innerHTML = selectHtml;
        }
        
        // 分类点击事件
        document.querySelectorAll('.category-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('.category-link').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                
                const category = link.dataset.category;
                this.currentCategory = category === 'all' ? null : category;
                this.currentPage = 1;
                this.loadProducts();
            });
        });
    },
    
    // 加载商品
    async loadProducts() {
        const productsList = document.getElementById('productsList');
        if (!productsList) return;
        
        utils.showLoading(productsList);
        
        try {
            let query = productsRef;
            
            // 分类筛选
            if (this.currentCategory) {
                query = query.where('category', '==', this.currentCategory);
            }
            
            // 状态筛选
            if (this.currentStatus !== 'all') {
                query = query.where('condition', '==', this.currentStatus);
            }
            
            // 价格筛选
            if (this.minPrice) {
                query = query.where('price', '>=', parseFloat(this.minPrice));
            }
            if (this.maxPrice) {
                query = query.where('price', '<=', parseFloat(this.maxPrice));
            }
            
            // 排序
            switch (this.currentSort) {
                case 'latest':
                    query = query.orderBy('createdAt', 'desc');
                    break;
                case 'price-low':
                    query = query.orderBy('price', 'asc');
                    break;
                case 'price-high':
                    query = query.orderBy('price', 'desc');
                    break;
                case 'popular':
                    query = query.orderBy('viewsCount', 'desc');
                    break;
            }
            
            // 分页
            const offset = (this.currentPage - 1) * this.productsPerPage;
            query = query.offset(offset).limit(this.productsPerPage);
            
            const snapshot = await query.get();
            
            if (snapshot.empty) {
                productsList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">🛒</div>
                        <h3>暂无商品</h3>
                        <p>成为第一个发布商品的人吧！</p>
                    </div>
                `;
                this.loadPagination(0);
                return;
            }
            
            let html = '';
            for (const doc of snapshot.docs) {
                const product = doc.data();
                const userDoc = await usersRef.doc(product.sellerId).get();
                const userData = userDoc.data();
                
                html += this.createProductItem(product, userData);
            }
            
            productsList.innerHTML = html;
            this.setupProductActions();
            
            // 加载分页
            this.loadPagination(await this.getTotalProducts());
        } catch (error) {
            console.error('加载商品失败:', error);
            productsList.innerHTML = '<div class="empty-state"><p>加载失败，请稍后再试</p></div>';
        }
    },
    
    // 创建商品项
    createProductItem(product, userData) {
        const category = appConfig.productCategories.find(c => c.id === product.category);
        const timeAgo = utils.formatDate(product.createdAt);
        
        return `
            <article class="product-item">
                <img src="${product.images?.[0] || '../images/default-product.png'}" 
                     alt="${product.title}" 
                     class="product-item-image">
                <div class="product-item-info">
                    ${category ? `<span class="post-category">${category.icon} ${category.name}</span>` : ''}
                    <h3 class="product-item-title">
                        <a href="product.html?id=${product.id}">${product.title}</a>
                    </h3>
                    <div class="product-item-price">
                        ${utils.formatPrice(product.price)}
                        ${product.originalPrice ? `<span class="product-item-original-price">${utils.formatPrice(product.originalPrice)}</span>` : ''}
                    </div>
                    <div class="product-item-meta">
                        <div class="product-item-seller">
                            <img src="${userData?.avatar || '../images/default-avatar.png'}" 
                                 alt="${userData?.username || '卖家'}">
                            <span>${userData?.username || '匿名卖家'}</span>
                        </div>
                        <div class="product-item-stats">
                            <span>👁 ${product.viewsCount || 0}</span>
                        </div>
                    </div>
                    <div class="product-item-actions">
                        <button class="btn btn-primary btn-sm add-to-cart" data-id="${product.id}">
                            加入购物车
                        </button>
                        <button class="btn btn-outline btn-sm buy-now" data-id="${product.id}">
                            立即购买
                        </button>
                    </div>
                </div>
            </article>
        `;
    },
    
    // 设置商品操作
    setupProductActions() {
        // 加入购物车按钮
        document.querySelectorAll('.add-to-cart').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                if (!authModule.isLoggedIn()) {
                    utils.showNotification('请先登录', 'warning');
                    return;
                }
                
                const productId = btn.dataset.id;
                await this.addToCart(productId);
            });
        });
        
        // 立即购买按钮
        document.querySelectorAll('.buy-now').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                if (!authModule.isLoggedIn()) {
                    utils.showNotification('请先登录', 'warning');
                    return;
                }
                
                const productId = btn.dataset.id;
                await this.buyNow(productId);
            });
        });
    },
    
    // 加入购物车
    async addToCart(productId) {
        try {
            const userId = authModule.getCurrentUser().uid;
            const cartRef = db.collection('carts').doc(userId);
            const cartDoc = await cartRef.get();
            
            if (cartDoc.exists) {
                // 更新购物车
                await cartRef.update({
                    items: firebase.firestore.FieldValue.arrayUnion({
                        productId: productId,
                        quantity: 1,
                        addedAt: new Date()
                    })
                });
            } else {
                // 创建购物车
                await cartRef.set({
                    userId: userId,
                    items: [{
                        productId: productId,
                        quantity: 1,
                        addedAt: new Date()
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
    
    // 立即购买
    async buyNow(productId) {
        // 这里可以跳转到结算页面
        window.location.href = `checkout.html?product=${productId}`;
    },
    
    // 获取总商品数
    async getTotalProducts() {
        try {
            let query = productsRef;
            if (this.currentCategory) {
                query = query.where('category', '==', this.currentCategory);
            }
            if (this.currentStatus !== 'all') {
                query = query.where('condition', '==', this.currentStatus);
            }
            const snapshot = await query.get();
            return snapshot.size;
        } catch (error) {
            console.error('获取总商品数失败:', error);
            return 0;
        }
    },
    
    // 加载分页
    loadPagination(totalProducts) {
        const pagination = document.getElementById('pagination');
        if (!pagination) return;
        
        const totalPages = Math.ceil(totalProducts / this.productsPerPage);
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }
        
        let html = '';
        
        // 上一页按钮
        html += `<button class="page-btn" ${this.currentPage === 1 ? 'disabled' : ''} data-page="${this.currentPage - 1}">上一页</button>`;
        
        // 页码按钮
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                html += `<button class="page-btn ${i === this.currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                html += '<span class="page-ellipsis">...</span>';
            }
        }
        
        // 下一页按钮
        html += `<button class="page-btn" ${this.currentPage === totalPages ? 'disabled' : ''} data-page="${this.currentPage + 1}">下一页</button>`;
        
        pagination.innerHTML = html;
        
        // 分页点击事件
        pagination.querySelectorAll('.page-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.disabled) return;
                this.currentPage = parseInt(btn.dataset.page);
                this.loadProducts();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        });
    },
    
    // 显示发布商品模态框
    showSellModal() {
        const modal = document.getElementById('sellModal');
        if (modal) {
            modal.style.display = 'block';
        }
    },
    
    // 提交商品
    async submitProduct() {
        const category = document.getElementById('productCategory').value;
        const title = document.getElementById('productTitle').value.trim();
        const description = document.getElementById('productDescription').value.trim();
        const price = parseFloat(document.getElementById('productPrice').value);
        const originalPrice = parseFloat(document.getElementById('originalPrice').value) || null;
        const condition = document.getElementById('productCondition').value;
        const imagesInput = document.getElementById('productImages');
        
        // 验证
        if (!category) {
            utils.showNotification('请选择分类', 'error');
            return;
        }
        
        if (!title) {
            utils.showNotification('请输入商品名称', 'error');
            return;
        }
        
        if (!description) {
            utils.showNotification('请输入商品描述', 'error');
            return;
        }
        
        if (isNaN(price) || price <= 0) {
            utils.showNotification('请输入有效的价格', 'error');
            return;
        }
        
        if (imagesInput.files.length === 0) {
            utils.showNotification('请上传商品图片', 'error');
            return;
        }
        
        if (imagesInput.files.length > 5) {
            utils.showNotification('最多上传5张图片', 'error');
            return;
        }
        
        try {
            const user = authModule.getCurrentUser();
            
            // 上传图片
            const imageUrls = [];
            for (let i = 0; i < imagesInput.files.length; i++) {
                const file = imagesInput.files[i];
                if (file.size > appConfig.maxImageSize) {
                    utils.showNotification(`图片 ${file.name} 超过5MB限制`, 'error');
                    return;
                }
                
                const fileRef = productsImagesRef.child(`${user.uid}/${Date.now()}_${file.name}`);
                await fileRef.put(file);
                const url = await fileRef.getDownloadURL();
                imageUrls.push(url);
            }
            
            // 创建商品
            const productRef = await productsRef.add({
                title: title,
                description: description,
                category: category,
                price: price,
                originalPrice: originalPrice,
                condition: condition,
                images: imageUrls,
                sellerId: user.uid,
                viewsCount: 0,
                likesCount: 0,
                salesCount: 0,
                status: 'active',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // 更新用户商品计数
            await usersRef.doc(user.uid).update({
                productsCount: firebase.firestore.FieldValue.increment(1)
            });
            
            // 关闭模态框并刷新商品列表
            document.getElementById('sellModal').style.display = 'none';
            document.getElementById('sellForm').reset();
            
            utils.showNotification('商品发布成功', 'success');
            this.loadProducts();
        } catch (error) {
            console.error('发布商品失败:', error);
            utils.showNotification('发布失败，请稍后再试', 'error');
        }
    }
};

// 页面加载完成后初始化市场模块
document.addEventListener('DOMContentLoaded', () => {
    market.init();
});