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
                    alert('请先登录');
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

        document.querySelectorAll('[data-status]').forEach(function(link) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                document.querySelectorAll('[data-status]').forEach(function(l) { l.classList.remove('active'); });
                link.classList.add('active');
                market.currentStatus = link.dataset.status;
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
        var categoryList = document.getElementById('categoryList');
        var productCategory = document.getElementById('productCategory');
        if (!categoryList) return;

        var html = '<li class="category-item"><a href="#" class="category-link active" data-category="all">全部分类</a></li>';
        var selectHtml = '<option value="">请选择分类</option>';

        appConfig.productCategories.forEach(function(category) {
            html += '<li class="category-item"><a href="#" class="category-link" data-category="' + category.id + '">' + category.icon + ' ' + category.name + '</a></li>';
            selectHtml += '<option value="' + category.id + '">' + category.icon + ' ' + category.name + '</option>';
        });

        categoryList.innerHTML = html;
        if (productCategory) productCategory.innerHTML = selectHtml;

        document.querySelectorAll('.category-link').forEach(function(link) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                document.querySelectorAll('.category-link').forEach(function(l) { l.classList.remove('active'); });
                link.classList.add('active');
                market.currentCategory = link.dataset.category === 'all' ? null : link.dataset.category;
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
            productsList.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🛒</div><h3>暂无商品</h3><p>成为第一个发布商品的人吧！</p></div>';
            return;
        }

        var html = '';
        filtered.forEach(function(product) {
            var seller = users.find(function(u) { return u.id === product.sellerId; }) || {};
            var category = appConfig.productCategories.find(function(c) { return c.id === product.category; });

            html += '<article class="product-item">' +
                '<img src="../' + (product.images && product.images[0] ? product.images[0] : 'images/default-product.png') + '" alt="' + product.title + '" class="product-item-image">' +
                '<div class="product-item-info">' +
                (category ? '<span class="post-category">' + category.icon + ' ' + category.name + '</span>' : '') +
                '<h3 class="product-item-title"><a href="product.html?id=' + product.id + '">' + product.title + '</a></h3>' +
                '<div class="product-item-price">¥' + product.price.toFixed(2) +
                (product.originalPrice ? '<span class="product-item-original-price">¥' + product.originalPrice.toFixed(2) + '</span>' : '') +
                '</div>' +
                '<div class="product-item-meta">' +
                '<div class="product-item-seller"><img src="../' + (seller.avatar || 'images/default-avatar.png') + '" alt=""><span>' + (seller.username || '匿名卖家') + '</span></div>' +
                '<div class="product-item-stats"><span>👁 ' + (product.viewsCount || 0) + '</span></div>' +
                '</div>' +
                '<div class="product-item-actions">' +
                '<button class="btn btn-primary btn-sm buy-now" onclick="market.buyNow(\'' + product.id + '\')">立即购买</button>' +
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
            alert('请先登录后再发布商品');
            authModule.showModal('login');
            return;
        }

        var category = document.getElementById('productCategory').value;
        var title = document.getElementById('productTitle').value.trim();
        var description = document.getElementById('productDescription').value.trim();
        var price = parseFloat(document.getElementById('productPrice').value);
        var originalPrice = parseFloat(document.getElementById('originalPrice').value) || null;
        var condition = document.getElementById('productCondition').value;
        var imageInput = document.getElementById('productImages');

        if (!category) { alert('请选择分类'); return; }
        if (!title) { alert('请输入商品名称'); return; }
        if (!description) { alert('请输入商品描述'); return; }
        if (isNaN(price) || price <= 0) { alert('请输入有效的价格'); return; }

        var images = [];
        if (imageInput && imageInput.files && imageInput.files.length > 0) {
            images = await utils.processImageFiles(imageInput.files, 5);
        }

        var user = authModule.getCurrentUser();
        if (!user) { alert('请先登录'); return; }
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
            status: 'active',
            createdAt: new Date().toISOString()
        };

        products.push(newProduct);
        localStorage.setItem('products', JSON.stringify(products));

        document.getElementById('sellModal').style.display = 'none';
        document.getElementById('sellForm').reset();
        alert('商品发布成功');
        this.loadProducts();
    },

    buyNow(productId) {
        window.location.href = 'checkout.html?product=' + productId;
    }
};

document.addEventListener('DOMContentLoaded', function() {
    market.init();
});