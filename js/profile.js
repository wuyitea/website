// 个人资料模块
const profile = {
    userId: null,
    userData: null,
    currentTab: 'posts',
    
    // 初始化个人资料
    init() {
        this.getUserId();
        this.loadProfile();
        this.setupEventListeners();
    },
    
    // 获取用户ID
    getUserId() {
        const urlParams = new URLSearchParams(window.location.search);
        this.userId = urlParams.get('id');
        
        // 如果没有指定ID，使用当前用户
        if (!this.userId && authModule.isLoggedIn()) {
            this.userId = authModule.getCurrentUser().uid;
        }
    },
    
    // 设置事件监听
    setupEventListeners() {
        // 标签切换
        document.querySelectorAll('.profile-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentTab = tab.dataset.tab;
                this.loadTabContent();
            });
        });
        
        // 关注按钮
        const followBtn = document.getElementById('followBtn');
        if (followBtn) {
            followBtn.addEventListener('click', () => this.toggleFollow());
        }
        
        // 发消息按钮
        const messageBtn = document.getElementById('messageBtn');
        if (messageBtn) {
            messageBtn.addEventListener('click', () => {
                window.location.href = `messages.html?user=${this.userId}`;
            });
        }
        
        // 编辑资料按钮
        const editProfileBtn = document.getElementById('editProfileBtn');
        if (editProfileBtn) {
            editProfileBtn.addEventListener('click', () => this.showEditModal());
        }
        
        // 编辑资料表单
        const editProfileForm = document.getElementById('editProfileForm');
        if (editProfileForm) {
            editProfileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.updateProfile();
            });
        }
        
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
    
    // 加载个人资料
    async loadProfile() {
        if (!this.userId) {
            utils.showNotification('用户不存在', 'error');
            return;
        }
        
        try {
            const userDoc = await usersRef.doc(this.userId).get();
            if (!userDoc.exists) {
                utils.showNotification('用户不存在', 'error');
                return;
            }
            
            this.userData = userDoc.data();
            this.updateProfileUI();
            this.loadTabContent();
            
            // 检查是否是当前用户
            if (authModule.isLoggedIn()) {
                const currentUser = authModule.getCurrentUser();
                const isOwner = currentUser.uid === this.userId;
                
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
                    
                    // 检查是否已关注
                    await this.checkFollowStatus();
                }
            }
        } catch (error) {
            console.error('加载个人资料失败:', error);
            utils.showNotification('加载失败', 'error');
        }
    },
    
    // 更新个人资料UI
    updateProfileUI() {
        const profileAvatar = document.getElementById('profileAvatar');
        const profileUsername = document.getElementById('profileUsername');
        const profileBio = document.getElementById('profileBio');
        const postsCount = document.getElementById('postsCount');
        const productsCount = document.getElementById('productsCount');
        const followersCount = document.getElementById('followersCount');
        const followingCount = document.getElementById('followingCount');
        
        if (profileAvatar) profileAvatar.src = this.userData.avatar || '../images/default-avatar.png';
        if (profileUsername) profileUsername.textContent = this.userData.username;
        if (profileBio) profileBio.textContent = this.userData.bio || '这个人很懒，什么都没写';
        if (postsCount) postsCount.textContent = this.userData.postsCount || 0;
        if (productsCount) productsCount.textContent = this.userData.productsCount || 0;
        if (followersCount) followersCount.textContent = this.userData.followersCount || 0;
        if (followingCount) followingCount.textContent = this.userData.followingCount || 0;
        
        // 更新页面标题
        document.title = `${this.userData.username} - 社区平台`;
    },
    
    // 加载标签内容
    async loadTabContent() {
        const content = document.getElementById('profileContent');
        if (!content) return;
        
        utils.showLoading(content);
        
        try {
            switch (this.currentTab) {
                case 'posts':
                    await this.loadUserPosts(content);
                    break;
                case 'products':
                    await this.loadUserProducts(content);
                    break;
                case 'likes':
                    await this.loadUserLikes(content);
                    break;
                case 'bookmarks':
                    await this.loadUserBookmarks(content);
                    break;
            }
        } catch (error) {
            console.error('加载标签内容失败:', error);
            content.innerHTML = '<div class="empty-state"><p>加载失败，请稍后再试</p></div>';
        }
    },
    
    // 加载用户帖子
    async loadUserPosts(container) {
        const snapshot = await postsRef
            .where('authorId', '==', this.userId)
            .orderBy('createdAt', 'desc')
            .get();
        
        if (snapshot.empty) {
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
        for (const doc of snapshot.docs) {
            const post = doc.data();
            html += this.createPostItem(post);
        }
        html += '</div>';
        
        container.innerHTML = html;
    },
    
    // 创建帖子项
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
    
    // 加载用户商品
    async loadUserProducts(container) {
        const snapshot = await productsRef
            .where('sellerId', '==', this.userId)
            .orderBy('createdAt', 'desc')
            .get();
        
        if (snapshot.empty) {
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
        for (const doc of snapshot.docs) {
            const product = doc.data();
            html += this.createProductItem(product);
        }
        html += '</div>';
        
        container.innerHTML = html;
    },
    
    // 创建商品项
    createProductItem(product) {
        const category = appConfig.productCategories.find(c => c.id === product.category);
        
        return `
            <article class="product-card">
                <img src="${product.images?.[0] || '../images/default-product.png'}" 
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
    
    // 加载用户点赞
    async loadUserLikes(container) {
        const snapshot = await db.collection('likes')
            .where('userId', '==', this.userId)
            .get();
        
        if (snapshot.empty) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">👍</div>
                    <h3>暂无点赞</h3>
                    <p>该用户还没有点赞过任何帖子</p>
                </div>
            `;
            return;
        }
        
        const postIds = snapshot.docs.map(doc => doc.data().postId);
        const postsSnapshot = await postsRef.where(firebase.firestore.FieldPath.documentId(), 'in', postIds).get();
        
        let html = '<div class="posts-list">';
        for (const doc of postsSnapshot.docs) {
            const post = doc.data();
            html += this.createPostItem(post);
        }
        html += '</div>';
        
        container.innerHTML = html;
    },
    
    // 加载用户收藏
    async loadUserBookmarks(container) {
        const snapshot = await db.collection('bookmarks')
            .where('userId', '==', this.userId)
            .get();
        
        if (snapshot.empty) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">⭐</div>
                    <h3>暂无收藏</h3>
                    <p>该用户还没有收藏过任何帖子</p>
                </div>
            `;
            return;
        }
        
        const postIds = snapshot.docs.map(doc => doc.data().postId);
        const postsSnapshot = await postsRef.where(firebase.firestore.FieldPath.documentId(), 'in', postIds).get();
        
        let html = '<div class="posts-list">';
        for (const doc of postsSnapshot.docs) {
            const post = doc.data();
            html += this.createPostItem(post);
        }
        html += '</div>';
        
        container.innerHTML = html;
    },
    
    // 检查关注状态
    async checkFollowStatus() {
        if (!authModule.isLoggedIn()) return;
        
        const currentUser = authModule.getCurrentUser();
        const followDoc = await db.collection('follows')
            .doc(`${currentUser.uid}_${this.userId}`)
            .get();
        
        const followBtn = document.getElementById('followBtn');
        if (followBtn) {
            if (followDoc.exists) {
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
    
    // 切换关注
    async toggleFollow() {
        if (!authModule.isLoggedIn()) {
            utils.showNotification('请先登录', 'warning');
            return;
        }
        
        const currentUser = authModule.getCurrentUser();
        const followRef = db.collection('follows').doc(`${currentUser.uid}_${this.userId}`);
        
        try {
            const followDoc = await followRef.get();
            
            if (followDoc.exists) {
                // 取消关注
                await followRef.delete();
                await usersRef.doc(this.userId).update({
                    followersCount: firebase.firestore.FieldValue.increment(-1)
                });
                await usersRef.doc(currentUser.uid).update({
                    followingCount: firebase.firestore.FieldValue.increment(-1)
                });
                
                utils.showNotification('已取消关注', 'info');
            } else {
                // 关注
                await followRef.set({
                    followerId: currentUser.uid,
                    followingId: this.userId,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                await usersRef.doc(this.userId).update({
                    followersCount: firebase.firestore.FieldValue.increment(1)
                });
                await usersRef.doc(currentUser.uid).update({
                    followingCount: firebase.firestore.FieldValue.increment(1)
                });
                
                utils.showNotification('关注成功', 'success');
            }
            
            await this.checkFollowStatus();
            await this.loadProfile();
        } catch (error) {
            console.error('关注操作失败:', error);
            utils.showNotification('操作失败', 'error');
        }
    },
    
    // 显示编辑资料模态框
    showEditModal() {
        const modal = document.getElementById('editProfileModal');
        if (modal) {
            // 填充当前数据
            document.getElementById('editUsername').value = this.userData.username || '';
            document.getElementById('editBio').value = this.userData.bio || '';
            
            modal.style.display = 'block';
        }
    },
    
    // 更新个人资料
    async updateProfile() {
        const username = document.getElementById('editUsername').value.trim();
        const bio = document.getElementById('editBio').value.trim();
        const avatarInput = document.getElementById('editAvatar');
        
        if (!username) {
            utils.showNotification('请输入用户名', 'error');
            return;
        }
        
        try {
            const user = authModule.getCurrentUser();
            const updateData = {
                username: username,
                bio: bio,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // 上传新头像
            if (avatarInput.files.length > 0) {
                const file = avatarInput.files[0];
                if (file.size > appConfig.maxImageSize) {
                    utils.showNotification('头像文件过大', 'error');
                    return;
                }
                
                const fileRef = avatarsRef.child(`${user.uid}/${Date.now()}_${file.name}`);
                await fileRef.put(file);
                const avatarUrl = await fileRef.getDownloadURL();
                updateData.avatar = avatarUrl;
            }
            
            // 更新用户文档
            await usersRef.doc(user.uid).update(updateData);
            
            // 关闭模态框并刷新
            document.getElementById('editProfileModal').style.display = 'none';
            utils.showNotification('资料更新成功', 'success');
            
            await this.loadProfile();
        } catch (error) {
            console.error('更新资料失败:', error);
            utils.showNotification('更新失败', 'error');
        }
    }
};

// 页面加载完成后初始化个人资料模块
document.addEventListener('DOMContentLoaded', () => {
    profile.init();
});