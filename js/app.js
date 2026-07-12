// 主应用模块
const app = {
    // 初始化应用
    init() {
        this.setupEventListeners();
        this.loadHotPosts();
        this.loadFeaturedProducts();
        this.loadActiveUsers();
        this.setupSearch();
        this.setupNavigation();
    },
    
    // 设置事件监听
    setupEventListeners() {
        // 用户下拉菜单
        const userAvatar = document.getElementById('userAvatar');
        const userDropdown = document.querySelector('.user-dropdown');
        
        if (userAvatar && userDropdown) {
            userAvatar.addEventListener('click', () => {
                userDropdown.classList.toggle('show');
            });
            
            // 点击外部关闭下拉菜单
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.user-profile')) {
                    userDropdown.classList.remove('show');
                }
            });
        }
    },
    
    // 设置搜索功能
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
    
    // 设置导航
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
    
    // 搜索
    async search(query) {
        try {
            // 搜索帖子
            const postsSnapshot = await postsRef
                .where('title', '>=', query)
                .where('title', '<=', query + '\uf8ff')
                .limit(10)
                .get();
            
            // 搜索商品
            const productsSnapshot = await productsRef
                .where('title', '>=', query)
                .where('title', '<=', query + '\uf8ff')
                .limit(10)
                .get();
            
            // 这里可以跳转到搜索结果页面或显示搜索结果
            console.log('搜索结果:', {
                posts: postsSnapshot.docs.length,
                products: productsSnapshot.docs.length
            });
        } catch (error) {
            console.error('搜索失败:', error);
        }
    },
    
    // 加载热门帖子
    async loadHotPosts() {
        const container = document.getElementById('hotPosts');
        if (!container) return;
        
        utils.showLoading(container);
        
        try {
            const snapshot = await postsRef
                .orderBy('likesCount', 'desc')
                .limit(6)
                .get();
            
            if (snapshot.empty) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">📝</div>
                        <h3>暂无帖子</h3>
                        <p>成为第一个发帖的人吧！</p>
                    </div>
                `;
                return;
            }
            
            let html = '';
            for (const doc of snapshot.docs) {
                const post = doc.data();
                const userDoc = await usersRef.doc(post.authorId).get();
                const userData = userDoc.data();
                
                html += this.createPostCard(post, userData);
            }
            
            container.innerHTML = html;
            this.setupPostActions();
        } catch (error) {
            console.error('加载热门帖子失败:', error);
            container.innerHTML = '<div class="empty-state"><p>加载失败，请稍后再试</p></div>';
        }
    },
    
    // 创建帖子卡片
    createPostCard(post, userData) {
        const category = appConfig.postCategories.find(c => c.id === post.category);
        const timeAgo = utils.formatDate(post.createdAt);
        
        return `
            <article class="post-card" data-id="${post.id}">
                <div class="post-header">
                    <img src="${userData?.avatar || 'images/default-avatar.png'}" 
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
    
    // 设置帖子操作
    setupPostActions() {
        // 点赞按钮
        document.querySelectorAll('.like-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                if (!authModule.isLoggedIn()) {
                    utils.showNotification('请先登录', 'warning');
                    return;
                }
                
                const postId = btn.dataset.id;
                await this.toggleLike(postId, btn);
            });
        });
        
        // 收藏按钮
        document.querySelectorAll('.bookmark-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                if (!authModule.isLoggedIn()) {
                    utils.showNotification('请先登录', 'warning');
                    return;
                }
                
                const postId = btn.dataset.id;
                await this.toggleBookmark(postId, btn);
            });
        });
    },
    
    // 切换点赞
    async toggleLike(postId, btn) {
        try {
            const userId = authModule.getCurrentUser().uid;
            const likeRef = db.collection('likes').doc(`${postId}_${userId}`);
            const likeDoc = await likeRef.get();
            
            if (likeDoc.exists) {
                // 取消点赞
                await likeRef.delete();
                await postsRef.doc(postId).update({
                    likesCount: firebase.firestore.FieldValue.increment(-1)
                });
                btn.classList.remove('active');
                utils.showNotification('已取消点赞', 'info');
            } else {
                // 点赞
                await likeRef.set({
                    postId: postId,
                    userId: userId,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                await postsRef.doc(postId).update({
                    likesCount: firebase.firestore.FieldValue.increment(1)
                });
                btn.classList.add('active');
                utils.showNotification('点赞成功', 'success');
            }
        } catch (error) {
            console.error('点赞操作失败:', error);
            utils.showNotification('操作失败', 'error');
        }
    },
    
    // 切换收藏
    async toggleBookmark(postId, btn) {
        try {
            const userId = authModule.getCurrentUser().uid;
            const bookmarkRef = db.collection('bookmarks').doc(`${postId}_${userId}`);
            const bookmarkDoc = await bookmarkRef.get();
            
            if (bookmarkDoc.exists) {
                // 取消收藏
                await bookmarkRef.delete();
                btn.classList.remove('active');
                utils.showNotification('已取消收藏', 'info');
            } else {
                // 收藏
                await bookmarkRef.set({
                    postId: postId,
                    userId: userId,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                btn.classList.add('active');
                utils.showNotification('收藏成功', 'success');
            }
        } catch (error) {
            console.error('收藏操作失败:', error);
            utils.showNotification('操作失败', 'error');
        }
    },
    
    // 加载推荐商品
    async loadFeaturedProducts() {
        const container = document.getElementById('featuredProducts');
        if (!container) return;
        
        utils.showLoading(container);
        
        try {
            const snapshot = await productsRef
                .orderBy('createdAt', 'desc')
                .limit(8)
                .get();
            
            if (snapshot.empty) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">🛒</div>
                        <h3>暂无商品</h3>
                        <p>快来发布你的第一个商品吧！</p>
                    </div>
                `;
                return;
            }
            
            let html = '';
            for (const doc of snapshot.docs) {
                const product = doc.data();
                const userDoc = await usersRef.doc(product.sellerId).get();
                const userData = userDoc.data();
                
                html += this.createProductCard(product, userData);
            }
            
            container.innerHTML = html;
        } catch (error) {
            console.error('加载推荐商品失败:', error);
            container.innerHTML = '<div class="empty-state"><p>加载失败，请稍后再试</p></div>';
        }
    },
    
    // 创建商品卡片
    createProductCard(product, userData) {
        const category = appConfig.productCategories.find(c => c.id === product.category);
        
        return `
            <article class="product-card" data-id="${product.id}">
                <img src="${product.images?.[0] || 'images/default-product.png'}" 
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
                        <img src="${userData?.avatar || 'images/default-avatar.png'}" 
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
    
    // 加载活跃用户
    async loadActiveUsers() {
        const container = document.getElementById('activeUsers');
        if (!container) return;
        
        utils.showLoading(container);
        
        try {
            const snapshot = await usersRef
                .orderBy('postsCount', 'desc')
                .limit(6)
                .get();
            
            if (snapshot.empty) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">👥</div>
                        <h3>暂无用户</h3>
                        <p>成为第一个加入社区的用户吧！</p>
                    </div>
                `;
                return;
            }
            
            let html = '';
            for (const doc of snapshot.docs) {
                const user = doc.data();
                html += this.createUserCard(user);
            }
            
            container.innerHTML = html;
        } catch (error) {
            console.error('加载活跃用户失败:', error);
            container.innerHTML = '<div class="empty-state"><p>加载失败，请稍后再试</p></div>';
        }
    },
    
    // 创建用户卡片
    createUserCard(user) {
        return `
            <article class="user-card">
                <img src="${user.avatar || 'images/default-avatar.png'}" 
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

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});