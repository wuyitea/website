// 论坛模块
const forum = {
    currentPage: 1,
    postsPerPage: 10,
    currentFilter: 'latest',
    currentCategory: null,
    
    // 初始化论坛
    init() {
        this.loadCategories();
        this.loadPosts();
        this.loadForumStats();
        this.setupEventListeners();
    },
    
    // 设置事件监听
    setupEventListeners() {
        // 发帖按钮
        const newPostBtn = document.getElementById('newPostBtn');
        if (newPostBtn) {
            newPostBtn.addEventListener('click', () => {
                if (!authModule.isLoggedIn()) {
                    utils.showNotification('请先登录', 'warning');
                    return;
                }
                this.showNewPostModal();
            });
        }
        
        // 发帖表单
        const newPostForm = document.getElementById('newPostForm');
        if (newPostForm) {
            newPostForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitPost();
            });
        }
        
        // 筛选标签
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentFilter = tab.dataset.filter;
                this.currentPage = 1;
                this.loadPosts();
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
        const postCategory = document.getElementById('postCategory');
        
        if (!categoryList) return;
        
        let html = '<li class="category-item"><a href="#" class="category-link active" data-category="all">全部分类</a></li>';
        let selectHtml = '<option value="">请选择分类</option>';
        
        appConfig.postCategories.forEach(category => {
            html += `
                <li class="category-item">
                    <a href="#" class="category-link" data-category="${category.id}">
                        ${category.icon} ${category.name}
                        <span class="category-count" id="count-${category.id}">0</span>
                    </a>
                </li>
            `;
            selectHtml += `<option value="${category.id}">${category.icon} ${category.name}</option>`;
        });
        
        categoryList.innerHTML = html;
        if (postCategory) {
            postCategory.innerHTML = selectHtml;
        }
        
        // 加载分类计数
        this.loadCategoryCounts();
        
        // 分类点击事件
        document.querySelectorAll('.category-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('.category-link').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                
                const category = link.dataset.category;
                this.currentCategory = category === 'all' ? null : category;
                this.currentPage = 1;
                this.loadPosts();
            });
        });
    },
    
    // 加载分类计数
    async loadCategoryCounts() {
        try {
            const snapshot = await postsRef.get();
            const counts = {};
            
            snapshot.forEach(doc => {
                const category = doc.data().category;
                counts[category] = (counts[category] || 0) + 1;
            });
            
            // 更新计数显示
            appConfig.postCategories.forEach(category => {
                const countElement = document.getElementById(`count-${category.id}`);
                if (countElement) {
                    countElement.textContent = counts[category.id] || 0;
                }
            });
            
            // 更新总数
            const totalPostsElement = document.getElementById('totalPosts');
            if (totalPostsElement) {
                totalPostsElement.textContent = snapshot.size;
            }
        } catch (error) {
            console.error('加载分类计数失败:', error);
        }
    },
    
    // 加载帖子
    async loadPosts() {
        const postsList = document.getElementById('postsList');
        if (!postsList) return;
        
        utils.showLoading(postsList);
        
        try {
            let query = postsRef;
            
            // 分类筛选
            if (this.currentCategory) {
                query = query.where('category', '==', this.currentCategory);
            }
            
            // 排序
            switch (this.currentFilter) {
                case 'latest':
                    query = query.orderBy('createdAt', 'desc');
                    break;
                case 'hot':
                    query = query.orderBy('likesCount', 'desc');
                    break;
                case 'essence':
                    query = query.where('isEssence', '==', true).orderBy('createdAt', 'desc');
                    break;
                case 'noanswer':
                    query = query.where('commentsCount', '==', 0).orderBy('createdAt', 'desc');
                    break;
            }
            
            // 分页
            const offset = (this.currentPage - 1) * this.postsPerPage;
            query = query.offset(offset).limit(this.postsPerPage);
            
            const snapshot = await query.get();
            
            if (snapshot.empty) {
                postsList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">📝</div>
                        <h3>暂无帖子</h3>
                        <p>成为第一个发帖的人吧！</p>
                    </div>
                `;
                this.loadPagination(0);
                return;
            }
            
            let html = '';
            for (const doc of snapshot.docs) {
                const post = doc.data();
                const userDoc = await usersRef.doc(post.authorId).get();
                const userData = userDoc.data();
                
                html += this.createPostItem(post, userData);
            }
            
            postsList.innerHTML = html;
            this.setupPostActions();
            
            // 加载分页
            this.loadPagination(await this.getTotalPosts());
        } catch (error) {
            console.error('加载帖子失败:', error);
            postsList.innerHTML = '<div class="empty-state"><p>加载失败，请稍后再试</p></div>';
        }
    },
    
    // 创建帖子项
    createPostItem(post, userData) {
        const category = appConfig.postCategories.find(c => c.id === post.category);
        const timeAgo = utils.formatDate(post.createdAt);
        const tags = post.tags ? post.tags.map(tag => `<span class="tag">${tag}</span>`).join('') : '';
        
        return `
            <article class="post-item">
                <div class="post-item-header">
                    <img src="${userData?.avatar || '../images/default-avatar.png'}" 
                         alt="${userData?.username || '用户'}" 
                         class="post-item-avatar">
                    <div class="post-item-meta">
                        <div class="post-item-author">${userData?.username || '匿名用户'}</div>
                        <div class="post-item-time">${timeAgo}</div>
                    </div>
                    ${category ? `<span class="post-category">${category.icon} ${category.name}</span>` : ''}
                </div>
                <h2 class="post-item-title">
                    <a href="post.html?id=${post.id}">${post.title}</a>
                </h2>
                <p class="post-item-content">${utils.truncateText(post.content, 300)}</p>
                <div class="post-item-footer">
                    <div class="post-item-stats">
                        <span>👍 ${post.likesCount || 0}</span>
                        <span>💬 ${post.commentsCount || 0}</span>
                        <span>👁 ${post.viewsCount || 0}</span>
                    </div>
                    <div class="post-item-tags">${tags}</div>
                </div>
            </article>
        `;
    },
    
    // 设置帖子操作
    setupPostActions() {
        // 这里可以添加帖子列表的操作事件
    },
    
    // 获取总帖子数
    async getTotalPosts() {
        try {
            let query = postsRef;
            if (this.currentCategory) {
                query = query.where('category', '==', this.currentCategory);
            }
            const snapshot = await query.get();
            return snapshot.size;
        } catch (error) {
            console.error('获取总帖子数失败:', error);
            return 0;
        }
    },
    
    // 加载分页
    loadPagination(totalPosts) {
        const pagination = document.getElementById('pagination');
        if (!pagination) return;
        
        const totalPages = Math.ceil(totalPosts / this.postsPerPage);
        
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
                this.loadPosts();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        });
    },
    
    // 显示发帖模态框
    showNewPostModal() {
        const modal = document.getElementById('newPostModal');
        if (modal) {
            modal.style.display = 'block';
        }
    },
    
    // 提交帖子
    async submitPost() {
        const category = document.getElementById('postCategory').value;
        const title = document.getElementById('postTitle').value.trim();
        const content = document.getElementById('postContent').value.trim();
        const tagsInput = document.getElementById('postTags').value.trim();
        
        // 验证
        if (!category) {
            utils.showNotification('请选择分类', 'error');
            return;
        }
        
        if (!title) {
            utils.showNotification('请输入标题', 'error');
            return;
        }
        
        if (!content) {
            utils.showNotification('请输入内容', 'error');
            return;
        }
        
        // 处理标签
        const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
        
        try {
            const user = authModule.getCurrentUser();
            
            // 创建帖子
            const postRef = await postsRef.add({
                title: title,
                content: content,
                category: category,
                tags: tags,
                authorId: user.uid,
                likesCount: 0,
                commentsCount: 0,
                viewsCount: 0,
                isEssence: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // 更新用户帖子计数
            await usersRef.doc(user.uid).update({
                postsCount: firebase.firestore.FieldValue.increment(1)
            });
            
            // 关闭模态框并刷新帖子列表
            document.getElementById('newPostModal').style.display = 'none';
            document.getElementById('newPostForm').reset();
            
            utils.showNotification('发帖成功', 'success');
            this.loadPosts();
            this.loadCategoryCounts();
        } catch (error) {
            console.error('发帖失败:', error);
            utils.showNotification('发帖失败，请稍后再试', 'error');
        }
    },
    
    // 加载论坛统计
    async loadForumStats() {
        try {
            // 用户总数
            const usersSnapshot = await usersRef.get();
            const totalUsersElement = document.getElementById('totalUsers');
            if (totalUsersElement) {
                totalUsersElement.textContent = usersSnapshot.size;
            }
            
            // 今日新帖
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todaySnapshot = await postsRef
                .where('createdAt', '>=', today)
                .get();
            const todayPostsElement = document.getElementById('todayPosts');
            if (todayPostsElement) {
                todayPostsElement.textContent = todaySnapshot.size;
            }
        } catch (error) {
            console.error('加载论坛统计失败:', error);
        }
    }
};

// 页面加载完成后初始化论坛模块
document.addEventListener('DOMContentLoaded', () => {
    forum.init();
});