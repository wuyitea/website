// 主应用模块
const app = {
    init() {
        this.setupEventListeners();
        this.loadHotPosts();
        this.loadFeaturedProducts();
        this.loadActiveUsers();
        this.setupSearch();
        this.setupNavigation();
    },

    setupEventListeners() {
        const userAvatar = document.getElementById('userAvatar');
        const userDropdown = document.querySelector('.user-dropdown');

        if (userAvatar && userDropdown) {
            userAvatar.addEventListener('click', () => {
                userDropdown.classList.toggle('show');
            });

            document.addEventListener('click', (e) => {
                if (!e.target.closest('.user-profile')) {
                    userDropdown.classList.remove('show');
                }
            });
        }
    },

    setupSearch() {
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');

        if (searchInput && searchBtn) {
            const performSearch = utils.debounce(() => {
                const query = searchInput.value.trim();
                if (query) {
                    this.search(query);
                }
            }, 500);

            searchInput.addEventListener('input', performSearch);
            searchBtn.addEventListener('click', () => {
                const query = searchInput.value.trim();
                if (query) {
                    this.search(query);
                }
            });

            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const query = searchInput.value.trim();
                    if (query) {
                        this.search(query);
                    }
                }
            });
        }
    },

    setupNavigation() {
        const navToggle = document.getElementById('navToggle');
        const navMenu = document.querySelector('.nav-menu');
        const navSearch = document.querySelector('.nav-search');
        const userActions = document.querySelector('.user-actions');

        if (navToggle) {
            navToggle.addEventListener('click', () => {
                navMenu.classList.toggle('show');
                if (navSearch) navSearch.classList.toggle('show');
                if (userActions) userActions.classList.toggle('show');
            });
        }
    },

    search(query) {
        const posts = JSON.parse(localStorage.getItem('posts') || '[]');
        const products = JSON.parse(localStorage.getItem('products') || '[]');

        const matchedPosts = posts.filter(p => p.title.includes(query)).slice(0, 10);
        const matchedProducts = products.filter(p => p.title.includes(query)).slice(0, 10);

        console.log('搜索结果:', {
            posts: matchedPosts.length,
            products: matchedProducts.length
        });
    },

    loadHotPosts() {
        const container = document.getElementById('hotPosts');
        if (!container) return;

        utils.showLoading(container);

        const posts = JSON.parse(localStorage.getItem('posts') || '[]');
        const users = JSON.parse(localStorage.getItem('users') || '[]');

        if (posts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📝</div>
                    <h3>暂无帖子</h3>
                    <p>成为第一个发帖的人吧！</p>
                </div>
            `;
            return;
        }

        const hotPosts = posts.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0)).slice(0, 6);

        let html = '';
        for (const post of hotPosts) {
            const userData = users.find(u => u.id === post.authorId);
            html += this.createPostCard(post, userData);
        }

        container.innerHTML = html;
        this.setupPostActions();
    },

    createPostCard(post, userData) {
        const category = appConfig.postCategories.find(c => c.id === post.category);
        const timeAgo = utils.formatDate(post.createdAt);

        return `
            <article class="post-card" data-id="${post.id}">
                <div class="post-header">
                    <img src="${utils.imagePath(userData?.avatar, '')}" 
                         alt="${userData?.username || '用户'}" 
                         class="post-avatar">
                    <div class="post-meta">
                        <div class="post-author">${userData?.username || '匿名用户'}</div>
                        <div class="post-time">${timeAgo}</div>
                    </div>
                </div>
                ${category ? `<span class="post-category">${category.icon} ${category.name}</span>` : ''}
                <h3 class="post-title">
                    <a href="pages/post.html?id=${post.id}">${post.title}</a>
                </h3>
                <p class="post-excerpt">${utils.truncateText(post.content, 150)}</p>
                <div class="post-footer">
                    <div class="post-stats">
                        <span>👍 ${post.likesCount || 0}</span>
                        <span>💬 ${post.commentsCount || 0}</span>
                        <span>👁 ${post.viewsCount || 0}</span>
                    </div>
                    <div class="post-actions">
                        <button class="post-action like-btn" data-id="${post.id}" title="点赞">
                            👍
                        </button>
                        <button class="post-action bookmark-btn" data-id="${post.id}" title="收藏">
                            ⭐
                        </button>
                    </div>
                </div>
            </article>
        `;
    },

    setupPostActions() {
        document.querySelectorAll('.like-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (!authModule.isLoggedIn()) {
                    utils.showNotification('请先登录', 'warning');
                    return;
                }

                const postId = btn.dataset.id;
                this.toggleLike(postId, btn);
            });
        });

        document.querySelectorAll('.bookmark-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (!authModule.isLoggedIn()) {
                    utils.showNotification('请先登录', 'warning');
                    return;
                }

                const postId = btn.dataset.id;
                this.toggleBookmark(postId, btn);
            });
        });
    },

    toggleLike(postId, btn) {
        const userId = authModule.getCurrentUser().id;
        const likes = JSON.parse(localStorage.getItem('likes') || '[]');
        const posts = JSON.parse(localStorage.getItem('posts') || '[]');
        const likeKey = `${postId}_${userId}`;
        const existingIndex = likes.findIndex(l => l.postId === postId && l.userId === userId);

        if (existingIndex !== -1) {
            likes.splice(existingIndex, 1);
            localStorage.setItem('likes', JSON.stringify(likes));

            const postIndex = posts.findIndex(p => p.id === postId);
            if (postIndex !== -1) {
                posts[postIndex].likesCount = Math.max((posts[postIndex].likesCount || 1) - 1, 0);
                localStorage.setItem('posts', JSON.stringify(posts));
            }

            btn.classList.remove('active');
            utils.showNotification('已取消点赞', 'info');
        } else {
            likes.push({
                postId: postId,
                userId: userId,
                createdAt: new Date().toISOString()
            });
            localStorage.setItem('likes', JSON.stringify(likes));

            const postIndex = posts.findIndex(p => p.id === postId);
            if (postIndex !== -1) {
                posts[postIndex].likesCount = (posts[postIndex].likesCount || 0) + 1;
                localStorage.setItem('posts', JSON.stringify(posts));
            }

            btn.classList.add('active');
            utils.showNotification('点赞成功', 'success');
        }
    },

    toggleBookmark(postId, btn) {
        const userId = authModule.getCurrentUser().id;
        const bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
        const existingIndex = bookmarks.findIndex(b => b.postId === postId && b.userId === userId);

        if (existingIndex !== -1) {
            bookmarks.splice(existingIndex, 1);
            localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
            btn.classList.remove('active');
            utils.showNotification('已取消收藏', 'info');
        } else {
            bookmarks.push({
                postId: postId,
                userId: userId,
                createdAt: new Date().toISOString()
            });
            localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
            btn.classList.add('active');
            utils.showNotification('收藏成功', 'success');
        }
    },

    loadFeaturedProducts() {
        const container = document.getElementById('featuredProducts');
        if (!container) return;

        utils.showLoading(container);

        const products = JSON.parse(localStorage.getItem('products') || '[]');
        const users = JSON.parse(localStorage.getItem('users') || '[]');

        if (products.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🛒</div>
                    <h3>暂无商品</h3>
                    <p>快来发布你的第一个商品吧！</p>
                </div>
            `;
            return;
        }

        const recentProducts = products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8);

        let html = '';
        for (const product of recentProducts) {
            const userData = users.find(u => u.id === product.sellerId);
            html += this.createProductCard(product, userData);
        }

        container.innerHTML = html;
    },

    createProductCard(product, userData) {
        const category = appConfig.productCategories.find(c => c.id === product.category);

        return `
            <article class="product-card" data-id="${product.id}">
                <img src="${utils.imagePath(product.images?.[0], '')}" 
                     alt="${product.title}" 
                     class="product-image">
                <div class="product-info">
                    ${category ? `<span class="post-category">${category.icon} ${category.name}</span>` : ''}
                    <h3 class="product-title">
                        <a href="pages/product.html?id=${product.id}">${product.title}</a>
                    </h3>
                    <div class="product-price">
                        ${utils.formatPrice(product.price)}
                        ${product.originalPrice ? `<span class="product-original-price">${utils.formatPrice(product.originalPrice)}</span>` : ''}
                    </div>
                    <div class="product-seller">
                        <img src="${utils.imagePath(userData?.avatar, '')}" 
                             alt="${userData?.username || '卖家'}">
                        <span>${userData?.username || '匿名卖家'}</span>
                    </div>
                    <div class="product-actions">
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

    loadActiveUsers() {
        const container = document.getElementById('activeUsers');
        if (!container) return;

        utils.showLoading(container);

        const users = JSON.parse(localStorage.getItem('users') || '[]');

        if (users.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">👥</div>
                    <h3>暂无用户</h3>
                    <p>成为第一个加入社区的用户吧！</p>
                </div>
            `;
            return;
        }

        const activeUsers = users.sort((a, b) => (b.postsCount || 0) - (a.postsCount || 0)).slice(0, 6);

        let html = '';
        for (const user of activeUsers) {
            html += this.createUserCard(user);
        }

        container.innerHTML = html;
    },

    createUserCard(user) {
        return `
            <article class="user-card">
                <img src="${utils.imagePath(user.avatar, '')}" 
                     alt="${user.username}" 
                     class="user-avatar">
                <h3>${user.username}</h3>
                <p>${user.bio || '这个人很懒，什么都没写'}</p>
                <div class="user-stats">
                    <div class="user-stat">
                        <div class="user-stat-value">${user.postsCount || 0}</div>
                        <div class="user-stat-label">帖子</div>
                    </div>
                    <div class="user-stat">
                        <div class="user-stat-value">${user.followersCount || 0}</div>
                        <div class="user-stat-label">粉丝</div>
                    </div>
                    <div class="user-stat">
                        <div class="user-stat-value">${user.productsCount || 0}</div>
                        <div class="user-stat-label">商品</div>
                    </div>
                </div>
                <a href="pages/profile.html?id=${user.id}" class="btn btn-outline btn-sm btn-block">
                    查看主页
                </a>
            </article>
        `;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
