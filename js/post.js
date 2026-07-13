// 帖子详情模块
const post = {
    postId: null,
    postData: null,
    authorData: null,

    init() {
        this.getPostId();
        this.loadPost();
        this.setupEventListeners();
    },

    getPostId() {
        const urlParams = new URLSearchParams(window.location.search);
        this.postId = urlParams.get('id');
    },

    setupEventListeners() {
        const likeBtn = document.getElementById('likeBtn');
        if (likeBtn) {
            likeBtn.addEventListener('click', () => this.toggleLike());
        }

        const bookmarkBtn = document.getElementById('bookmarkBtn');
        if (bookmarkBtn) {
            bookmarkBtn.addEventListener('click', () => this.toggleBookmark());
        }

        const shareBtn = document.getElementById('shareBtn');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => this.sharePost());
        }

        const submitCommentBtn = document.getElementById('submitCommentBtn');
        if (submitCommentBtn) {
            submitCommentBtn.addEventListener('click', () => this.submitComment());
        }
    },

    loadPost() {
        if (!this.postId) {
            utils.showNotification('帖子不存在', 'error');
            return;
        }

        const posts = JSON.parse(localStorage.getItem('posts') || '[]');
        const postIndex = posts.findIndex(p => p.id === this.postId);

        if (postIndex === -1) {
            utils.showNotification('帖子不存在', 'error');
            return;
        }

        this.postData = posts[postIndex];

        posts[postIndex].viewsCount = (posts[postIndex].viewsCount || 0) + 1;
        localStorage.setItem('posts', JSON.stringify(posts));
        this.postData = posts[postIndex];

        this.loadAuthor();
        this.updatePostUI();
        this.loadComments();
        this.loadRelatedPosts();

        if (authModule.isLoggedIn()) {
            this.checkLikeStatus();
            this.checkBookmarkStatus();
        }

        document.title = `${this.postData.title} - 社区平台`;
    },

    loadAuthor() {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        this.authorData = users.find(u => u.id === this.postData.authorId) || null;
        this.updateAuthorUI();
    },

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

        if (postAvatar) {
            const av = this.authorData?.avatar || '../images/default-avatar.png';
            postAvatar.src = (av && av.indexOf('data:') === 0) ? av : '../' + av.replace(/^\.\.\//, '');
        }
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

        if (postTags && this.postData.tags) {
            postTags.innerHTML = this.postData.tags
                .map(tag => `<span class="tag">${tag}</span>`)
                .join('');
        }
    },

    updateAuthorUI() {
        const authorAvatar = document.getElementById('authorAvatar');
        const authorName = document.getElementById('authorName');
        const authorBio = document.getElementById('authorBio');
        const authorLink = document.getElementById('authorLink');

        if (authorAvatar) {
            const av = this.authorData?.avatar || '../images/default-avatar.png';
            authorAvatar.src = (av && av.indexOf('data:') === 0) ? av : '../' + av.replace(/^\.\.\//, '');
        }
        if (authorName) authorName.textContent = this.authorData?.username || '匿名用户';
        if (authorBio) authorBio.textContent = this.authorData?.bio || '这个人很懒，什么都没写';
        if (authorLink) authorLink.href = `profile.html?id=${this.postData.authorId}`;
    },

    checkLikeStatus() {
        if (!authModule.isLoggedIn()) return;

        const userId = authModule.getCurrentUser().id;
        const likes = JSON.parse(localStorage.getItem('likes') || '[]');
        const liked = likes.some(l => l.postId === this.postId && l.userId === userId);

        const likeBtn = document.getElementById('likeBtn');
        if (likeBtn && liked) {
            likeBtn.classList.add('active');
        }
    },

    checkBookmarkStatus() {
        if (!authModule.isLoggedIn()) return;

        const userId = authModule.getCurrentUser().id;
        const bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
        const bookmarked = bookmarks.some(b => b.postId === this.postId && b.userId === userId);

        const bookmarkBtn = document.getElementById('bookmarkBtn');
        if (bookmarkBtn && bookmarked) {
            bookmarkBtn.classList.add('active');
        }
    },

    toggleLike() {
        if (!authModule.isLoggedIn()) {
            utils.showNotification('请先登录', 'warning');
            return;
        }

        const userId = authModule.getCurrentUser().id;
        const likes = JSON.parse(localStorage.getItem('likes') || '[]');
        const posts = JSON.parse(localStorage.getItem('posts') || '[]');
        const existingIndex = likes.findIndex(l => l.postId === this.postId && l.userId === userId);
        const postIndex = posts.findIndex(p => p.id === this.postId);

        if (existingIndex !== -1) {
            likes.splice(existingIndex, 1);
            localStorage.setItem('likes', JSON.stringify(likes));

            if (postIndex !== -1) {
                posts[postIndex].likesCount = Math.max((posts[postIndex].likesCount || 1) - 1, 0);
                localStorage.setItem('posts', JSON.stringify(posts));
                this.postData.likesCount = posts[postIndex].likesCount;
            }

            document.getElementById('likeBtn').classList.remove('active');
            document.getElementById('likesCount').textContent = this.postData.likesCount;
            utils.showNotification('已取消点赞', 'info');
        } else {
            likes.push({
                postId: this.postId,
                userId: userId,
                createdAt: new Date().toISOString()
            });
            localStorage.setItem('likes', JSON.stringify(likes));

            if (postIndex !== -1) {
                posts[postIndex].likesCount = (posts[postIndex].likesCount || 0) + 1;
                localStorage.setItem('posts', JSON.stringify(posts));
                this.postData.likesCount = posts[postIndex].likesCount;
            }

            document.getElementById('likeBtn').classList.add('active');
            document.getElementById('likesCount').textContent = this.postData.likesCount;
            utils.showNotification('点赞成功', 'success');
        }
    },

    toggleBookmark() {
        if (!authModule.isLoggedIn()) {
            utils.showNotification('请先登录', 'warning');
            return;
        }

        const userId = authModule.getCurrentUser().id;
        const bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
        const existingIndex = bookmarks.findIndex(b => b.postId === this.postId && b.userId === userId);

        if (existingIndex !== -1) {
            bookmarks.splice(existingIndex, 1);
            localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
            document.getElementById('bookmarkBtn').classList.remove('active');
            utils.showNotification('已取消收藏', 'info');
        } else {
            bookmarks.push({
                postId: this.postId,
                userId: userId,
                createdAt: new Date().toISOString()
            });
            localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
            document.getElementById('bookmarkBtn').classList.add('active');
            utils.showNotification('收藏成功', 'success');
        }
    },

    sharePost() {
        const url = window.location.href;
        const title = this.postData.title;

        if (navigator.share) {
            navigator.share({
                title: title,
                url: url
            });
        } else {
            navigator.clipboard.writeText(url).then(() => {
                utils.showNotification('链接已复制', 'success');
            }).catch(() => {
                utils.showNotification('复制失败', 'error');
            });
        }
    },

    loadComments() {
        const commentsList = document.getElementById('commentsList');
        if (!commentsList) return;

        const comments = JSON.parse(localStorage.getItem('comments') || '[]');
        const users = JSON.parse(localStorage.getItem('users') || '[]');

        const postComments = comments
            .filter(c => c.postId === this.postId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (postComments.length === 0) {
            commentsList.innerHTML = `
                <div class="empty-state" style="text-align:center;padding:2rem;color:var(--text-secondary)">
                    <i class="ti ti-message" style="font-size:2rem;display:block;margin-bottom:0.5rem"></i>
                    <p>暂无评论，快来发表第一条评论吧！</p>
                </div>
            `;
            return;
        }

        let html = '';
        for (const comment of postComments) {
            const userData = users.find(u => u.id === comment.authorId);
            html += this.createCommentItem(comment, userData);
        }

        commentsList.innerHTML = html;
    },

    createCommentItem(comment, userData) {
        const timeAgo = utils.formatDate(comment.createdAt);

        const commentAv = userData?.avatar || '../images/default-avatar.png';
        const commentSrc = (commentAv && commentAv.indexOf('data:') === 0) ? commentAv : '../' + commentAv.replace(/^\.\.\//, '');

        return `
            <div class="comment-item" style="padding:1rem;background:var(--bg-secondary);border-radius:var(--border-radius);margin-bottom:0.75rem">
                <div class="comment-header" style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem">
                    <img src="${commentSrc}" 
                         alt="${userData?.username || '用户'}" 
                         class="comment-avatar" style="width:36px;height:36px;border-radius:50%">
                    <div class="comment-meta">
                        <div class="comment-author" style="font-weight:600;color:var(--text-primary)">${userData?.username || '匿名用户'}</div>
                        <div class="comment-time" style="font-size:0.75rem;color:var(--text-secondary)">${timeAgo}</div>
                    </div>
                </div>
                <div class="comment-content" style="color:var(--text-primary);line-height:1.6;margin-bottom:0.5rem">${comment.content}</div>
                <div class="comment-actions" style="display:flex;gap:1rem">
                    <button class="comment-action reply-btn" data-id="${comment.id}" data-author="${userData?.username || '用户'}" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:0.875rem;display:flex;align-items:center;gap:0.25rem">
                        <i class="ti ti-message"></i> 回复
                    </button>
                    <button class="comment-action like-comment-btn" data-id="${comment.id}" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:0.875rem;display:flex;align-items:center;gap:0.25rem">
                        <i class="ti ti-thumb-up"></i> ${comment.likesCount || 0}
                    </button>
                </div>
            </div>
        `;
    },

    submitComment() {
        if (!authModule.isLoggedIn()) {
            utils.showNotification('请先登录', 'warning');
            return;
        }

        const content = document.getElementById('commentContent').value.trim();
        if (!content) {
            utils.showNotification('请输入评论内容', 'error');
            return;
        }

        const user = authModule.getCurrentUser();
        const comments = JSON.parse(localStorage.getItem('comments') || '[]');
        const posts = JSON.parse(localStorage.getItem('posts') || '[]');

        const newComment = {
            id: utils.generateId(),
            postId: this.postId,
            authorId: user.id,
            content: content,
            likesCount: 0,
            createdAt: new Date().toISOString()
        };

        comments.push(newComment);
        localStorage.setItem('comments', JSON.stringify(comments));

        const postIndex = posts.findIndex(p => p.id === this.postId);
        if (postIndex !== -1) {
            posts[postIndex].commentsCount = (posts[postIndex].commentsCount || 0) + 1;
            localStorage.setItem('posts', JSON.stringify(posts));
            this.postData.commentsCount = posts[postIndex].commentsCount;
        }

        document.getElementById('commentContent').value = '';
        this.loadComments();

        document.getElementById('commentsCount').textContent = `(${this.postData.commentsCount})`;
        utils.showNotification('评论成功', 'success');
    },

    loadRelatedPosts() {
        const relatedPosts = document.getElementById('relatedPosts');
        if (!relatedPosts) return;

        const posts = JSON.parse(localStorage.getItem('posts') || '[]');

        const related = posts
            .filter(p => p.category === this.postData.category && p.id !== this.postId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);

        if (related.length === 0) {
            relatedPosts.innerHTML = '<p style="color:var(--text-secondary);font-size:0.875rem;text-align:center;padding:1rem">暂无相关帖子</p>';
            return;
        }

        let html = '';
        for (const rp of related) {
            html += `
                <a href="post.html?id=${rp.id}" class="related-post" style="display:block;padding:0.5rem;border-radius:var(--border-radius);text-decoration:none;transition:var(--transition);margin-bottom:0.25rem">
                    <div class="related-post-title" style="font-weight:500;color:var(--text-primary);margin-bottom:0.25rem;font-size:0.875rem">${rp.title}</div>
                    <div class="related-post-meta" style="font-size:0.75rem;color:var(--text-secondary)"><i class="ti ti-clock"></i> ${utils.formatDate(rp.createdAt)} · <i class="ti ti-thumb-up"></i> ${rp.likesCount || 0}</div>
                </a>
            `;
        }

        relatedPosts.innerHTML = html;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    post.init();
});
