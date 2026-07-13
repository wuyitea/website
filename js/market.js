// 市场模块（localStorage 版本）
const market = {
    currentPage: 1,
    productsPerPage: 12,
    currentCategory: null,
    currentSort: 'latest',
    currentStatus: 'all',
    minPrice: null,
    maxPrice: null,

    init() {
        this.loadCategories();
        this.loadProducts();
        this.setupEventListeners();
    },

    setupEventListeners() {
        var sellBtn = document.getElementById('sellBtn');
        if (sellBtn) {
            sellBtn.addEventListener('click', function() {
                if (!authModule.isLoggedIn()) {
                    utils.showNotification('请先登录', 'warning');
                    authModule.showModal('login');
                    return;
                }
                market.showSellModal();
            });
        }

        var sellForm = document.getElementById('sellForm');
        if (sellForm) {
            sellForm.addEventListener('submit', function(e) {
                e.preventDefault();
                market.submitProduct();
            });
        }

        var sortSelect = document.getElementById('sortSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', function() {
                market.currentSort = sortSelect.value;
                market.currentPage = 1;
                market.loadProducts();
            });
        }

        var filterPriceBtn = document.getElementById('filterPriceBtn');
        if (filterPriceBtn) {
            filterPriceBtn.addEventListener('click', function() {
                market.minPrice = document.getElementById('minPrice').value || null;
                market.maxPrice = document.getElementById('maxPrice').value || null;
                market.currentPage = 1;
                market.loadProducts();
            });
        }

        document.querySelectorAll('[data-status]').forEach(function(btn) {
            btn.addEventListener('click', function() {
                document.querySelectorAll('[data-status]').forEach(function(b) { b.classList.remove('active'); });
                btn.classList.add('active');
                market.currentStatus = btn.dataset.status;
                market.currentPage = 1;
                market.loadProducts();
            });
        });

        document.querySelectorAll('.close-modal').forEach(function(btn) {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.modal').forEach(function(modal) {
                    modal.style.display = 'none';
                });
            });
        });

        window.addEventListener('click', function(e) {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    },

    loadCategories() {
        var categoryFilters = document.getElementById('categoryFilters');
        var productCategory = document.getElementById('productCategory');
        if (!categoryFilters) return;

        var savedMarket = JSON.parse(localStorage.getItem('admin_settings_market') || '{}');
        if (savedMarket.marketCategories) {
            var customNames = savedMarket.marketCategories.split('\n').map(function(s) { return s.trim(); }).filter(function(s) { return s; });
            appConfig.productCategories = customNames.map(function(name, i) {
                return { id: 'pcat_' + i, name: name, icon: '📦' };
            });
        }

        var html = '<button class="forum-filter-btn active" data-category="all">全部分类</button>';
        var selectHtml = '<option value="">请选择分类</option>';

        appConfig.productCategories.forEach(function(category) {
            html += '<button class="forum-filter-btn" data-category="' + category.id + '">' + category.icon + ' ' + category.name + '</button>';
            selectHtml += '<option value="' + category.id + '">' + category.icon + ' ' + category.name + '</option>';
        });

        categoryFilters.innerHTML = html;
        if (productCategory) productCategory.innerHTML = selectHtml;

        document.querySelectorAll('.forum-filter-btn[data-category]').forEach(function(btn) {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.forum-filter-btn[data-category]').forEach(function(b) { b.classList.remove('active'); });
                btn.classList.add('active');
                market.currentCategory = btn.dataset.category === 'all' ? null : btn.dataset.category;
                market.currentPage = 1;
                market.loadProducts();
            });
        });
    },

    loadProducts() {
        var productsList = document.getElementById('productsList');
        if (!productsList) return;

        var products = JSON.parse(localStorage.getItem('products') || '[]');
        var users = JSON.parse(localStorage.getItem('users') || '[]');

        var filtered = products;

        if (this.currentCategory) {
            filtered = filtered.filter(function(p) { return p.category === market.currentCategory; });
        }

        if (this.currentStatus !== 'all') {
            filtered = filtered.filter(function(p) { return p.condition === market.currentStatus; });
        }

        if (this.minPrice) {
            filtered = filtered.filter(function(p) { return p.price >= parseFloat(market.minPrice); });
        }
        if (this.maxPrice) {
            filtered = filtered.filter(function(p) { return p.price <= parseFloat(market.maxPrice); });
        }

        switch (this.currentSort) {
            case 'latest':
                filtered.sort(function(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
                break;
            case 'price-low':
                filtered.sort(function(a, b) { return a.price - b.price; });
                break;
            case 'price-high':
                filtered.sort(function(a, b) { return b.price - a.price; });
                break;
            case 'popular':
                filtered.sort(function(a, b) { return (b.viewsCount || 0) - (a.viewsCount || 0); });
                break;
        }

        if (filtered.length === 0) {
            productsList.innerHTML = '<div class="empty-state" style="grid-column:1/-1;text-align:center;padding:3rem"><div><i class="ti ti-shopping-bag" style="font-size:3rem;color:var(--text-secondary)"></i></div><h3 style="margin:1rem 0 0.5rem">暂无商品</h3><p style="color:var(--text-secondary)">成为第一个发布商品的人吧！</p></div>';
            return;
        }

        var html = '';
        filtered.forEach(function(product) {
            var seller = users.find(function(u) { return u.id === product.sellerId; }) || {};
            var category = appConfig.productCategories.find(function(c) { return c.id === product.category; });

            var imgSrc = (product.images && product.images[0]) ? product.images[0] : '../images/default-product.png';
            if (imgSrc.indexOf('data:') !== 0 && imgSrc.indexOf('http') !== 0) imgSrc = '../' + imgSrc;

            var sellerAvatar = seller.avatar || '../images/default-avatar.png';
            if (sellerAvatar.indexOf('data:') !== 0 && sellerAvatar.indexOf('http') !== 0) sellerAvatar = '../' + sellerAvatar;

            html += '<article class="product-card">' +
                '<div style="position:relative">' +
                '<img src="' + imgSrc + '" alt="' + product.title + '" class="product-image" onerror="this.src=\'../images/default-product.png\'">' +
                (product.condition === 'new' ? '<span class="badge badge-success" style="position:absolute;top:0.75rem;right:0.75rem"><i class="ti ti-sparkles"></i> 全新</span>' : '') +
                '</div>' +
                '<div class="product-info">' +
                (category ? '<span class="post-category" style="margin-bottom:0.5rem;display:inline-block">' + category.icon + ' ' + category.name + '</span>' : '') +
                '<h3 class="product-title"><a href="product.html?id=' + product.id + '">' + product.title + '</a></h3>' +
                '<div class="product-price">¥' + product.price.toFixed(2) +
                (product.originalPrice ? '<span style="font-size:0.875rem;color:var(--text-secondary);text-decoration:line-through;margin-left:0.5rem">¥' + product.originalPrice.toFixed(2) + '</span>' : '') +
                '</div>' +
                '<div class="product-meta">' +
                '<div style="display:flex;align-items:center;gap:0.5rem">' +
                '<img src="' + sellerAvatar + '" alt="" style="width:20px;height:20px;border-radius:50%">' +
                '<span>' + (seller.username || '匿名卖家') + '</span>' +
                '</div>' +
                '<span><i class="ti ti-eye"></i> ' + (product.viewsCount || 0) + '</span>' +
                '</div>' +
                '<div class="product-actions">' +
                '<button class="btn btn-primary btn-sm buy-now" onclick="market.buyNow(\'' + product.id + '\')"><i class="ti ti-shopping-cart"></i> 立即购买</button>' +
                '</div>' +
                '</div>' +
                '</article>';
        });

        productsList.innerHTML = html;
    },

    showSellModal() {
        var modal = document.getElementById('sellModal');
        if (modal) modal.style.display = 'block';
    },

    async submitProduct() {
        if (!authModule.isLoggedIn()) {
            utils.showNotification('请先登录后再发布商品', 'warning');
            authModule.showModal('login');
            return;
        }

        var savedMarket = JSON.parse(localStorage.getItem('admin_settings_market') || '{}');
        if (savedMarket.marketAllowSell === false) {
            utils.showNotification('管理员已关闭商品发布功能', 'error');
            return;
        }

        var category = document.getElementById('productCategory').value;
        var title = document.getElementById('productTitle').value.trim();
        var description = document.getElementById('productDescription').value.trim();
        var price = parseFloat(document.getElementById('productPrice').value);
        var originalPrice = parseFloat(document.getElementById('originalPrice').value) || null;
        var condition = document.getElementById('productCondition').value;
        var imageInput = document.getElementById('productImages');

        if (!category) { utils.showNotification('请选择分类', 'warning'); return; }
        if (!title) { utils.showNotification('请输入商品名称', 'warning'); return; }
        if (!description) { utils.showNotification('请输入商品描述', 'warning'); return; }
        if (isNaN(price) || price <= 0) { utils.showNotification('请输入有效的价格', 'warning'); return; }

        var images = [];
        if (imageInput && imageInput.files && imageInput.files.length > 0) {
            images = await utils.processImageFiles(imageInput.files, 5);
        }

        var user = authModule.getCurrentUser();
        if (!user) { utils.showNotification('请先登录', 'warning'); return; }

        var needReview = savedMarket.marketNeedReview === true;

        var products = JSON.parse(localStorage.getItem('products') || '[]');
        var newProduct = {
            id: Date.now().toString(),
            title: title,
            description: description,
            category: category,
            price: price,
            originalPrice: originalPrice,
            condition: condition,
            images: images,
            sellerId: user.id,
            viewsCount: 0,
            likesCount: 0,
            salesCount: 0,
            status: needReview ? 'pending' : 'active',
            createdAt: new Date().toISOString()
        };

        products.push(newProduct);
        localStorage.setItem('products', JSON.stringify(products));

        document.getElementById('sellModal').style.display = 'none';
        document.getElementById('sellForm').reset();
        utils.showNotification(needReview ? '商品发布成功，等待管理员审核' : '商品发布成功', 'success');
        this.loadProducts();
    },

    buyNow(productId) {
        window.location.href = 'checkout.html?product=' + productId;
    }
};

document.addEventListener('DOMContentLoaded', function() {
    market.init();
});
