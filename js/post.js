// 帖子详情模块
const post = {
    postId: null,
    postData: null,
    authorData: null,
    
    // 初始化帖子详情
    init() {
        this.getPostId();
        this.loadPost();
        this.setupEventListeners();
    },
    
    // 获取帖子ID
    getPostId() {
        const urlParams = new URLSearchParams(window.location.search);
        this.postId = urlParams.get('id');
    },
    
    // 设置事件监听
    setupEventListeners() {
        // 点赞按钮
        const likeBtn = document.getElementById('likeBtn');
        if (likeBtn) {
            likeBtn.addEventListener('click', () => this.toggleLike());
        }
        
        // 收藏按钮
        const bookmarkBtn = document.getElementById('bookmarkBtn');
        if (bookmarkBtn) {
            bookmarkBtn.addEventListener('click', () => this.toggleBookmark());
        }
        
        // 分享按钮
        const shareBtn = document.getElementById('shareBtn');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => this.sharePost());
        }
        
        // 提交评论按钮
        const submitCommentBtn = document.getElementById('submitCommentBtn');
        if (submitCommentBtn) {
            submitCommentBtn.addEventListener('click', () => this.submitComment());
        }
    },
    
    // 加载帖子
    async loadPost() {
        if (!this.postId) {
            utils.showNotification('帖子不存在', 'error');
            return;
        }
        
        try {
            const postDoc = await postsRef.doc(this.postId).get();
            if (!postDoc.exists) {
                utils.showNotification('帖子不存在', 'error');
                return;
            }
            
            this.postData = postDoc.data();
            
            // 增加浏览量
            await postsRef.doc(this.postId).update({
                viewsCount: firebase.firestore.FieldValue.increment(1)
            });
            
            // 加载作者信息
            await this.loadAuthor();
            
            // 更新UI
            this.updatePostUI();
            
            // 加载评论
            this.loadComments();
            
            // 加载相关帖子
            this.loadRelatedPosts();
            
            // 检查用户状态
            if (authModule.isLoggedIn()) {
                await this.checkLikeStatus();
                await this.checkBookmarkStatus();
            }
            
            // 更新页面标题
            document.title = `${this.postData.title} - 社区平台`;
        } catch (error) {
            console.error('加载帖子失败:', error);
            utils.showNotification('加载失败', 'error');
        }
    },
    
    // 加载作者信息
    async loadAuthor() {
        try {
            const authorDoc = await usersRef.doc(this.postData.authorId).get();
            if (authorDoc.exists) {
                this.authorData = authorDoc.data();
                this.updateAuthorUI();
            }
        } catch (error) {
            console.error('加载作者信息失败:', error);
        }
    },
    
    // 更新帖子UI
    updatePostUI() {
        const postAvatar = document.getElementById('postAvatar');
        const postAuthor = document.getElementById('postAuthor');
        const postTime = document.getElementById('postTime');
        const postCategory = document.getElementById('postCategory');
        const postTitle = document.getElementById('postTitle');
        const postContent = document.getElementById('postContent');
        const postTags = document.getElementById('postTags');
        const likesCount = document.getElementById('likesCount');
        const commentsCount = document.getElementById('commentsCount');
        
        if (postAvatar) postAvatar.src = this.authorData?.avatar || '../images/default-avatar.png';
        if (postAuthor) postAuthor.textContent = this.authorData?.username || '匿名用户';
        if (postTime) postTime.textContent = utils.formatDate(this.postData.createdAt);
        
        const category = appConfig.postCategories.find(c => c.id === this.postData.category);
        if (postCategory && category) {
            postCategory.textContent = `${category.icon} ${category.name}`;
        }
        
        if (postTitle) postTitle.textContent = this.postData.title;
        if (postContent) postContent.textContent = this.postData.content;
        if (likesCount) likesCount.textContent = this.postData.likesCount || 0;
        if (commentsCount) commentsCount.textContent = `(${this.postData.commentsCount || 0})`;
        
        // 标签
        if (postTags && this.postData.tags) {
            postTags.innerHTML = this.postData.tags
                .map(tag => `<span class="tag">${tag}</span>`)
                .join('');
        }
    },
    
    // 更新作者UI
    updateAuthorUI() {
        const authorAvatar = document.getElementById('authorAvatar');
        const authorName = document.getElementById('authorName');
        const authorBio = document.getElementById('authorBio');
        const authorLink = document.getElementById('authorLink');
        
        if (authorAvatar) authorAvatar.src = this.authorData?.avatar || '../images/default-avatar.png';
        if (authorName) authorName.textContent = this.authorData?.username || '匿名用户';
        if (authorBio) authorBio.textContent = this.authorData?.bio || '这个人很懒，什么都没写';
        if (authorLink) authorLink.href = `profile.html?id=${this.postData.authorId}`;
    },
    
    // 检查点赞状态
    async checkLikeStatus() {
        if (!authModule.isLoggedIn()) return;
        
        const userId = authModule.getCurrentUser().uid;
        const likeDoc = await db.collection('likes').doc(`${this.postId}_${userId}`).get();
        
        const likeBtn = document.getElementById('likeBtn');
        if (likeBtn && likeDoc.exists) {
            likeBtn.classList.add('active');
        }
    },
    
    // 检查收藏状态
    async checkBookmarkStatus() {
        if (!authModule.isLoggedIn()) return;
        
        const userId = authModule.getCurrentUser().uid;
        const bookmarkDoc = await db.collection('bookmarks').doc(`${this.postId}_${userId}`).get();
        
        const bookmarkBtn = document.getElementById('bookmarkBtn');
        if (bookmarkBtn && bookmarkDoc.exists) {
            bookmarkBtn.classList.add('active');
        }
    },
    
    // 切换点赞
    async toggleLike() {
        if (!authModule.isLoggedIn()) {
            utils.showNotification('请先登录', 'warning');
            return;
        }
        
        const userId = authModule.getCurrentUser().uid;
        const likeRef = db.collection('likes').doc(`${this.postId}_${userId}`);
        
        try {
            const likeDoc = await likeRef.get();
            
            if (likeDoc.exists) {
                // 取消点赞
                await likeRef.delete();
                await postsRef.doc(this.postId).update({
                    likesCount: firebase.firestore.FieldValue.increment(-1)
                });
                
                document.getElementById('likeBtn').classList.remove('active');
                document.getElementById('likesCount').textContent = this.postData.likesCount - 1;
                this.postData.likesCount--;
                
                utils.showNotification('已取消点赞', 'info');
            } else {
                // 点赞
                await likeRef.set({
                    postId: this.postId,
                    userId: userId,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                await postsRef.doc(this.postId).update({
                    likesCount: firebase.firestore.FieldValue.increment(1)
                });
                
                document.getElementById('likeBtn').classList.add('active');
                document.getElementById('likesCount').textContent = this.postData.likesCount + 1;
                this.postData.likesCount++;
                
                utils.showNotification('点赞成功', 'success');
            }
        } catch (error) {
            console.error('点赞操作失败:', error);
            utils.showNotification('操作失败', 'error');
        }
    },
    
    // 切换收藏
    async toggleBookmark() {
        if (!authModule.isLoggedIn()) {
            utils.showNotification('请先登录', 'warning');
            return;
        }
        
        const userId = authModule.getCurrentUser().uid;
        const bookmarkRef = db.collection('bookmarks').doc(`${this.postId}_${userId}`);
        
        try {
            const bookmarkDoc = await bookmarkRef.get();
            
            if (bookmarkDoc.exists) {
                // 取消收藏
                await bookmarkRef.delete();
                document.getElementById('bookmarkBtn').classList.remove('active');
                utils.showNotification('已取消收藏', 'info');
            } else {
                // 收藏
                await bookmarkRef.set({
                    postId: this.postId,
                    userId: userId,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                document.getElementById('bookmarkBtn').classList.add('active');
                utils.showNotification('收藏成功', 'success');
            }
        } catch (error) {
            console.error('收藏操作失败:', error);
            utils.showNotification('操作失败', 'error');
        }
    },
    
    // 分享帖子
    sharePost() {
        const url = window.location.href;
        const title = this.postData.title;
        
        if (navigator.share) {
            navigator.share({
                title: title,
                url: url
            });
        } else {
            // 复制链接
            navigator.clipboard.writeText(url).then(() => {
                utils.showNotification('链接已复制', 'success');
            }).catch(() => {
                utils.showNotification('复制失败', 'error');
            });
        }
    },
    
    // 加载评论
    async loadComments() {
        const commentsList = document.getElementById('commentsList');
        if (!commentsList) return;
        
        try {
            const snapshot = await commentsRef
                .where('postId', '==', this.postId)
                .orderBy('createdAt', 'desc')
                .get();
            
            if (snapshot.empty) {
                commentsList.innerHTML = `
                    <div class="empty-state">
                        <p>暂无评论，快来发表第一条评论吧！</p>
                    </div>
                `;
                return;
            }
            
            let html = '';
            for (const doc of snapshot.docs) {
                const comment = doc.data();
                const userDoc = await usersRef.doc(comment.authorId).get();
                const userData = userDoc.data();
                
                html += this.createCommentItem(comment, userData);
            }
            
            commentsList.innerHTML = html;
        } catch (error) {
            console.error('加载评论失败:', error);
            commentsList.innerHTML = '<div class="empty-state"><p>加载评论失败</p></div>';
        }
    },
    
    // 创建评论项
    createCommentItem(comment, userData) {
        const timeAgo = utils.formatDate(comment.createdAt);
        
        return `
            <div class="comment-item">
                <div class="comment-header">
                    <img src="${userData?.avatar || '../images/default-avatar.png'}" 
                         alt="${userData?.username || '用户'}" 
                         class="comment-avatar">
                    <div class="comment-meta">
                        <div class="comment-author">${userData?.username || '匿名用户'}</div>
                        <div class="comment-time">${timeAgo}</div>
                    </div>
                </div>
                <div class="comment-content">${comment.content}</div>
                <div class="comment-actions">
                    <button class="comment-action reply-btn" data-id="${comment.id}" data-author="${userData?.username || '用户'}">
                        回复
                    </button>
                    <button class="comment-action like-comment-btn" data-id="${comment.id}">
                        👍 ${comment.likesCount || 0}
                    </button>
                </div>
            </div>
        `;
    },
    
    // 提交评论
    async submitComment() {
        if (!authModule.isLoggedIn()) {
            utils.showNotification('请先登录', 'warning');
            return;
        }
        
        const content = document.getElementById('commentContent').value.trim();
        if (!content) {
            utils.showNotification('请输入评论内容', 'error');
            return;
        }
        
        try {
            const user = authModule.getCurrentUser();
            
            // 创建评论
            await commentsRef.add({
                postId: this.postId,
                authorId: user.uid,
                content: content,
                likesCount: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // 更新帖子评论计数
            await postsRef.doc(this.postId).update({
                commentsCount: firebase.firestore.FieldValue.increment(1)
            });
            
            // 清空输入框
            document.getElementById('commentContent').value = '';
            
            // 刷新评论列表
            await this.loadComments();
            
            // 更新评论计数
            this.postData.commentsCount = (this.postData.commentsCount || 0) + 1;
            document.getElementById('commentsCount').textContent = `(${this.postData.commentsCount})`;
            
            utils.showNotification('评论成功', 'success');
        } catch (error) {
            console.error('提交评论失败:', error);
            utils.showNotification('评论失败', 'error');
        }
    },
    
    // 加载相关帖子
    async loadRelatedPosts() {
        const relatedPosts = document.getElementById('relatedPosts');
        if (!relatedPosts) return;
        
        try {
            const snapshot = await postsRef
                .where('category', '==', this.postData.category)
                .where('id', '!=', this.postId)
                .orderBy('createdAt', 'desc')
                .limit(5)
                .get();
            
            if (snapshot.empty) {
                relatedPosts.innerHTML = '<p>暂无相关帖子</p>';
                return;
            }
            
            let html = '';
            for (const doc of snapshot.docs) {
                const relatedPost = doc.data();
                html += `
                    <a href="post.html?id=${doc.id}" class="related-post">
                        <div>
                            <div class="related-post-title">${relatedPost.title}</div>
                            <div class="related-post-meta">${utils.formatDate(relatedPost.createdAt)} · 👍 ${relatedPost.likesCount || 0}</div>
                        </div>
                    </a>
                `;
            }
            
            relatedPosts.innerHTML = html;
        } catch (error) {
            console.error('加载相关帖子失败:', error);
        }
    }
};

// 页面加载完成后初始化帖子详情模块
document.addEventListener('DOMContentLoaded', () => {
    post.init();
});