// 个人资料模块
const profile = {
    userId: null,
    userData: null,
    currentTab: 'posts',

    init() {
        this.getUserId();
        this.loadProfile();
        this.setupEventListeners();
    },

    getUserId() {
        const urlParams = new URLSearchParams(window.location.search);
        this.userId = urlParams.get('id');

        if (!this.userId && authModule.isLoggedIn()) {
            this.userId = authModule.getCurrentUser().id;
        }
    },

    setupEventListeners() {
        document.querySelectorAll('.profile-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentTab = tab.dataset.tab;
                this.loadTabContent();
            });
        });

        const followBtn = document.getElementById('followBtn');
        if (followBtn) {
            followBtn.addEventListener('click', () => this.toggleFollow());
        }

        const messageBtn = document.getElementById('messageBtn');
        if (messageBtn) {
            messageBtn.addEventListener('click', () => {
                window.location.href = `messages.html?user=${this.userId}`;
            });
        }

        const editProfileBtn = document.getElementById('editProfileBtn');
        if (editProfileBtn) {
            editProfileBtn.addEventListener('click', () => this.showEditModal());
        }

        const editProfileForm = document.getElementById('editProfileForm');
        if (editProfileForm) {
            editProfileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.updateProfile();
            });
        }

        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.modal').forEach(modal => {
                    modal.style.display = 'none';
                });
            });
        });

        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    },

    loadProfile() {
        if (!this.userId) {
            utils.showNotification('用户不存在', 'error');
            return;
        }

        const users = JSON.parse(localStorage.getItem('users') || '[]');
        this.userData = users.find(u => u.id === this.userId);

        if (!this.userData) {
            utils.showNotification('用户不存在', 'error');
            return;
        }

        this.updateProfileUI();
        this.loadTabContent();

        if (authModule.isLoggedIn()) {
            const currentUser = authModule.getCurrentUser();
            const isOwner = currentUser.id === this.userId;

            const editProfileBtn = document.getElementById('editProfileBtn');
            const followBtn = document.getElementById('followBtn');
            const messageBtn = document.getElementById('messageBtn');

            if (isOwner) {
                if (editProfileBtn) editProfileBtn.style.display = 'inline-block';
                if (followBtn) followBtn.style.display = 'none';
                if (messageBtn) messageBtn.style.display = 'none';
            } else {
                if (editProfileBtn) editProfileBtn.style.display = 'none';
                if (followBtn) followBtn.style.display = 'inline-block';
                if (messageBtn) messageBtn.style.display = 'inline-block';

                this.checkFollowStatus();
            }
        }
    },

    updateProfileUI() {
        const profileAvatar = document.getElementById('profileAvatar');
        const profileUsername = document.getElementById('profileUsername');
        const profileBio = document.getElementById('profileBio');
        const postsCount = document.getElementById('postsCount');
        const productsCount = document.getElementById('productsCount');
        const followersCount = document.getElementById('followersCount');
        const followingCount = document.getElementById('followingCount');

        if (profileAvatar) {
            const av = this.userData.avatar || '../images/default-avatar.png';
            profileAvatar.src = (av && av.indexOf('data:') === 0) ? av : '../' + av.replace(/^\.\.\//, '');
        }
        if (profileUsername) profileUsername.textContent = this.userData.username;
        if (profileBio) profileBio.textContent = this.userData.bio || '这个人很懒，什么都没写';
        if (postsCount) postsCount.textContent = this.userData.postsCount || 0;
        if (productsCount) productsCount.textContent = this.userData.productsCount || 0;
        if (followersCount) followersCount.textContent = this.userData.followersCount || 0;
        if (followingCount) followingCount.textContent = this.userData.followingCount || 0;

        document.title = `${this.userData.username} - 社区平台`;
    },

    loadTabContent() {
        const content = document.getElementById('profileContent');
        if (!content) return;

        utils.showLoading(content);

        switch (this.currentTab) {
            case 'posts':
                this.loadUserPosts(content);
                break;
            case 'products':
                this.loadUserProducts(content);
                break;
            case 'likes':
                this.loadUserLikes(content);
                break;
            case 'bookmarks':
                this.loadUserBookmarks(content);
                break;
        }
    },

    loadUserPosts(container) {
        const posts = JSON.parse(localStorage.getItem('posts') || '[]');
        const userPosts = posts
            .filter(p => p.authorId === this.userId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (userPosts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📝</div>
                    <h3>暂无帖子</h3>
                    <p>该用户还没有发布过帖子</p>
                </div>
            `;
            return;
        }

        let html = '<div class="posts-list">';
        for (const post of userPosts) {
            html += this.createPostItem(post);
        }
        html += '</div>';

        container.innerHTML = html;
    },

    createPostItem(post) {
        const category = appConfig.postCategories.find(c => c.id === post.category);
        const timeAgo = utils.formatDate(post.createdAt);

        return `
            <article class="post-item">
                <div class="post-item-header">
                    <div class="post-item-meta">
                        <div class="post-item-time">${timeAgo}</div>
                    </div>
                    ${category ? `<span class="post-category">${category.icon} ${category.name}</span>` : ''}
                </div>
                <h3 class="post-item-title">
                    <a href="post.html?id=${post.id}">${post.title}</a>
                </h3>
                <p class="post-item-content">${utils.truncateText(post.content, 200)}</p>
                <div class="post-item-footer">
                    <div class="post-item-stats">
                        <span>👍 ${post.likesCount || 0}</span>
                        <span>💬 ${post.commentsCount || 0}</span>
                        <span>👁 ${post.viewsCount || 0}</span>
                    </div>
                </div>
            </article>
        `;
    },

    loadUserProducts(container) {
        const products = JSON.parse(localStorage.getItem('products') || '[]');
        const userProducts = products
            .filter(p => p.sellerId === this.userId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (userProducts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🛒</div>
                    <h3>暂无商品</h3>
                    <p>该用户还没有发布过商品</p>
                </div>
            `;
            return;
        }

        let html = '<div class="products-grid">';
        for (const product of userProducts) {
            html += this.createProductItem(product);
        }
        html += '</div>';

        container.innerHTML = html;
    },

    createProductItem(product) {
        const category = appConfig.productCategories.find(c => c.id === product.category);
        const imgSrc = product.images?.[0] || '../images/default-product.png';
        const imgFinal = (imgSrc && imgSrc.indexOf('data:') === 0) ? imgSrc : '../' + imgSrc.replace(/^\.\.\//, '');

        return `
            <article class="product-card">
                <img src="${imgFinal}" 
                     alt="${product.title}" 
                     class="product-image">
                <div class="product-info">
                    ${category ? `<span class="post-category">${category.icon} ${category.name}</span>` : ''}
                    <h3 class="product-title">
                        <a href="product.html?id=${product.id}">${product.title}</a>
                    </h3>
                    <div class="product-price">
                        ${utils.formatPrice(product.price)}
                        ${product.originalPrice ? `<span class="product-original-price">${utils.formatPrice(product.originalPrice)}</span>` : ''}
                    </div>
                    <div class="product-actions">
                        <button class="btn btn-primary btn-sm">加入购物车</button>
                        <button class="btn btn-outline btn-sm">立即购买</button>
                    </div>
                </div>
            </article>
        `;
    },

    loadUserLikes(container) {
        const likes = JSON.parse(localStorage.getItem('likes') || '[]');
        const posts = JSON.parse(localStorage.getItem('posts') || '[]');

        const userLikes = likes.filter(l => l.userId === this.userId);
        const postIds = userLikes.map(l => l.postId);
        const likedPosts = posts.filter(p => postIds.includes(p.id));

        if (likedPosts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">👍</div>
                    <h3>暂无点赞</h3>
                    <p>该用户还没有点赞过任何帖子</p>
                </div>
            `;
            return;
        }

        let html = '<div class="posts-list">';
        for (const post of likedPosts) {
            html += this.createPostItem(post);
        }
        html += '</div>';

        container.innerHTML = html;
    },

    loadUserBookmarks(container) {
        const bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
        const posts = JSON.parse(localStorage.getItem('posts') || '[]');

        const userBookmarks = bookmarks.filter(b => b.userId === this.userId);
        const postIds = userBookmarks.map(b => b.postId);
        const bookmarkedPosts = posts.filter(p => postIds.includes(p.id));

        if (bookmarkedPosts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">⭐</div>
                    <h3>暂无收藏</h3>
                    <p>该用户还没有收藏过任何帖子</p>
                </div>
            `;
            return;
        }

        let html = '<div class="posts-list">';
        for (const post of bookmarkedPosts) {
            html += this.createPostItem(post);
        }
        html += '</div>';

        container.innerHTML = html;
    },

    checkFollowStatus() {
        if (!authModule.isLoggedIn()) return;

        const currentUser = authModule.getCurrentUser();
        const follows = JSON.parse(localStorage.getItem('follows') || '[]');
        const isFollowing = follows.some(f => f.followerId === currentUser.id && f.followingId === this.userId);

        const followBtn = document.getElementById('followBtn');
        if (followBtn) {
            if (isFollowing) {
                followBtn.textContent = '取消关注';
                followBtn.classList.remove('btn-primary');
                followBtn.classList.add('btn-outline');
            } else {
                followBtn.textContent = '关注';
                followBtn.classList.remove('btn-outline');
                followBtn.classList.add('btn-primary');
            }
        }
    },

    toggleFollow() {
        if (!authModule.isLoggedIn()) {
            utils.showNotification('请先登录', 'warning');
            return;
        }

        const currentUser = authModule.getCurrentUser();
        const follows = JSON.parse(localStorage.getItem('follows') || '[]');
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const existingIndex = follows.findIndex(f => f.followerId === currentUser.id && f.followingId === this.userId);

        if (existingIndex !== -1) {
            follows.splice(existingIndex, 1);
            localStorage.setItem('follows', JSON.stringify(follows));

            const targetIndex = users.findIndex(u => u.id === this.userId);
            if (targetIndex !== -1) {
                users[targetIndex].followersCount = Math.max((users[targetIndex].followersCount || 1) - 1, 0);
            }
            const selfIndex = users.findIndex(u => u.id === currentUser.id);
            if (selfIndex !== -1) {
                users[selfIndex].followingCount = Math.max((users[selfIndex].followingCount || 1) - 1, 0);
            }
            localStorage.setItem('users', JSON.stringify(users));

            utils.showNotification('已取消关注', 'info');
        } else {
            follows.push({
                followerId: currentUser.id,
                followingId: this.userId,
                createdAt: new Date().toISOString()
            });
            localStorage.setItem('follows', JSON.stringify(follows));

            const targetIndex = users.findIndex(u => u.id === this.userId);
            if (targetIndex !== -1) {
                users[targetIndex].followersCount = (users[targetIndex].followersCount || 0) + 1;
            }
            const selfIndex = users.findIndex(u => u.id === currentUser.id);
            if (selfIndex !== -1) {
                users[selfIndex].followingCount = (users[selfIndex].followingCount || 0) + 1;
            }
            localStorage.setItem('users', JSON.stringify(users));

            utils.showNotification('关注成功', 'success');
        }

        this.checkFollowStatus();
        this.loadProfile();
    },

    showEditModal() {
        const modal = document.getElementById('editProfileModal');
        if (modal) {
            document.getElementById('editUsername').value = this.userData.username || '';
            document.getElementById('editBio').value = this.userData.bio || '';
            modal.style.display = 'block';
        }
    },

    async updateProfile() {
        const username = document.getElementById('editUsername').value.trim();
        const bio = document.getElementById('editBio').value.trim();
        const avatarInput = document.getElementById('editAvatar');

        if (!username) {
            utils.showNotification('请输入用户名', 'error');
            return;
        }

        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const userIndex = users.findIndex(u => u.id === this.userId);

        if (userIndex === -1) {
            utils.showNotification('用户不存在', 'error');
            return;
        }

        if (avatarInput && avatarInput.files && avatarInput.files[0]) {
            try {
                const dataURL = await utils.readFileAsDataURL(avatarInput.files[0]);
                users[userIndex].avatar = dataURL;
            } catch (e) {
                utils.showNotification(e.message, 'error');
                return;
            }
        }

        users[userIndex].username = username;
        users[userIndex].bio = bio;
        localStorage.setItem('users', JSON.stringify(users));

        const currentUser = authModule.getCurrentUser();
        if (currentUser && currentUser.id === this.userId) {
            currentUser.username = username;
            currentUser.bio = bio;
            if (users[userIndex].avatar) currentUser.avatar = users[userIndex].avatar;
            localStorage.setItem('current_user', JSON.stringify(currentUser));
            authModule.currentUser = currentUser;
        }

        document.getElementById('editProfileModal').style.display = 'none';
        utils.showNotification('资料更新成功', 'success');
        this.loadProfile();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    profile.init();
});
