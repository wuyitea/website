// 论坛模块（localStorage 版本）
const forum = {
    currentPage: 1,
    postsPerPage: 10,
    currentFilter: 'latest',
    currentCategory: null,

    init() {
        this.loadCategories();
        this.loadPosts();
        this.loadForumStats();
        this.setupEventListeners();
    },

    setupEventListeners() {
        var newPostBtn = document.getElementById('newPostBtn');
        if (newPostBtn) {
            newPostBtn.addEventListener('click', function() {
                if (!authModule.isLoggedIn()) {
                    utils.showNotification('请先登录', 'warning');
                    authModule.showModal('login');
                    return;
                }
                forum.showNewPostModal();
            });
        }

        var newPostForm = document.getElementById('newPostForm');
        if (newPostForm) {
            newPostForm.addEventListener('submit', function(e) {
                e.preventDefault();
                forum.submitPost();
            });
        }

        // 排序筛选
        document.querySelectorAll('.forum-filter-btn[data-filter]').forEach(function(btn) {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.forum-filter-btn[data-filter]').forEach(function(b) {
                    b.classList.remove('active');
                });
                btn.classList.add('active');
                forum.currentFilter = btn.dataset.filter;
                forum.currentPage = 1;
                forum.loadPosts();
            });
        });

        // 关闭模态框
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
        var postCategory = document.getElementById('postCategory');
        if (!categoryFilters) return;

        var savedForum = JSON.parse(localStorage.getItem('admin_settings_forum') || '{}');
        if (savedForum.forumCategories) {
            var customNames = savedForum.forumCategories.split('\n').map(function(s) { return s.trim(); }).filter(function(s) { return s; });
            appConfig.postCategories = customNames.map(function(name, i) {
                return { id: 'cat_' + i, name: name, icon: '📁' };
            });
        }

        var posts = JSON.parse(localStorage.getItem('posts') || '[]');
        var counts = {};
        posts.forEach(function(p) {
            counts[p.category] = (counts[p.category] || 0) + 1;
        });

        var html = '<button class="forum-filter-btn active" data-category="all">全部 (' + posts.length + ')</button>';
        var selectHtml = '<option value="">请选择分类</option>';

        appConfig.postCategories.forEach(function(category) {
            html += '<button class="forum-filter-btn" data-category="' + category.id + '">' + category.icon + ' ' + category.name + ' (' + (counts[category.id] || 0) + ')</button>';
            selectHtml += '<option value="' + category.id + '">' + category.icon + ' ' + category.name + '</option>';
        });

        categoryFilters.innerHTML = html;
        if (postCategory) postCategory.innerHTML = selectHtml;

        // 分类筛选点击
        document.querySelectorAll('.forum-filter-btn[data-category]').forEach(function(btn) {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.forum-filter-btn[data-category]').forEach(function(b) {
                    b.classList.remove('active');
                });
                btn.classList.add('active');
                forum.currentCategory = btn.dataset.category === 'all' ? null : btn.dataset.category;
                forum.currentPage = 1;
                forum.loadPosts();
            });
        });
    },

    loadPosts() {
        var postsList = document.getElementById('postsList');
        if (!postsList) return;

        var posts = JSON.parse(localStorage.getItem('posts') || '[]');
        var users = JSON.parse(localStorage.getItem('users') || '[]');

        // 筛选
        var filtered = posts;
        if (this.currentCategory) {
            filtered = filtered.filter(function(p) { return p.category === forum.currentCategory; });
        }

        // 排序
        switch (this.currentFilter) {
            case 'latest':
                filtered.sort(function(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
                break;
            case 'hot':
                filtered.sort(function(a, b) { return (b.likesCount || 0) - (a.likesCount || 0); });
                break;
            case 'essence':
                filtered = filtered.filter(function(p) { return p.isEssence; });
                filtered.sort(function(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
                break;
        }

        if (filtered.length === 0) {
            postsList.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon"><i class="ti ti-pencil" style="font-size:3rem"></i></div><h3>暂无帖子</h3><p>成为第一个发帖的人吧！</p></div>';
            return;
        }

        var html = '';
        filtered.forEach(function(post) {
            var author = users.find(function(u) { return u.id === post.authorId; }) || {};
            var category = appConfig.postCategories.find(function(c) { return c.id === post.category; });
            var timeAgo = utils.formatDate(post.createdAt);

            var avatarUrl = author.avatar || '../images/default-avatar.png';
            if (avatarUrl.indexOf('data:') !== 0 && avatarUrl.indexOf('http') !== 0) avatarUrl = '../' + avatarUrl;

            html += '<article class="post-card">' +
                '<div class="post-header">' +
                '<img src="' + avatarUrl + '" alt="" class="post-avatar" onerror="this.src=\'../images/default-avatar.png\'">' +
                '<div class="post-meta">' +
                '<div class="post-author">' + (author.username || '匿名用户') + '</div>' +
                '<div class="post-time">' + timeAgo + '</div>' +
                '</div>' +
                (category ? '<span class="post-category">' + category.icon + ' ' + category.name + '</span>' : '') +
                '</div>' +
                '<h3 class="post-title"><a href="post.html?id=' + post.id + '">' + post.title + '</a></h3>' +
                '<p class="post-excerpt">' + utils.truncateText(post.content, 150) + '</p>' +
                '<div class="post-footer">' +
                '<div class="post-stats">' +
                '<span><i class="ti ti-thumb-up"></i> ' + (post.likesCount || 0) + '</span>' +
                '<span><i class="ti ti-message"></i> ' + (post.commentsCount || 0) + '</span>' +
                '<span><i class="ti ti-eye"></i> ' + (post.viewsCount || 0) + '</span>' +
                '</div>' +
                (post.isEssence ? '<span class="badge badge-primary"><i class="ti ti-star"></i> 精华</span>' : '') +
                '</div>' +
                '</article>';
        });

        postsList.innerHTML = html;
    },

    loadForumStats() {
        var statsEl = document.getElementById('forumStats');
        if (!statsEl) return;

        var posts = JSON.parse(localStorage.getItem('posts') || '[]');
        var users = JSON.parse(localStorage.getItem('users') || '[]');

        var totalComments = 0;
        posts.forEach(function(p) { totalComments += (p.commentsCount || 0); });

        statsEl.innerHTML =
            '<p><span>帖子总数</span><span>' + posts.length + '</span></p>' +
            '<p><span>评论总数</span><span>' + totalComments + '</span></p>' +
            '<p><span>社区成员</span><span>' + users.length + '</span></p>' +
            '<p><span>今日新帖</span><span>' + this.getTodayPosts(posts) + '</span></p>';
    },

    getTodayPosts(posts) {
        var today = new Date().toDateString();
        return posts.filter(function(p) {
            return new Date(p.createdAt).toDateString() === today;
        }).length;
    },

    showNewPostModal() {
        var modal = document.getElementById('newPostModal');
        if (modal) modal.style.display = 'block';
    },

    submitPost() {
        var category = document.getElementById('postCategory').value;
        var title = document.getElementById('postTitle').value.trim();
        var content = document.getElementById('postContent').value.trim();

        if (!authModule.isLoggedIn()) {
            utils.showNotification('请先登录后再发帖', 'warning');
            authModule.showModal('login');
            return;
        }

        var savedForum = JSON.parse(localStorage.getItem('admin_settings_forum') || '{}');
        if (savedForum.forumAllowPost === false) {
            utils.showNotification('管理员已关闭发帖功能', 'error');
            return;
        }

        if (!category) { utils.showNotification('请选择分类', 'warning'); return; }
        if (!title) { utils.showNotification('请输入标题', 'warning'); return; }
        if (!content) { utils.showNotification('请输入内容', 'warning'); return; }

        var user = authModule.getCurrentUser();
        if (!user) { utils.showNotification('请先登录', 'warning'); return; }

        var needReview = savedForum.forumNeedReview === true;

        var posts = JSON.parse(localStorage.getItem('posts') || '[]');
        var newPost = {
            id: Date.now().toString(),
            title: title,
            content: content,
            category: category,
            authorId: user.id,
            likesCount: 0,
            commentsCount: 0,
            viewsCount: 0,
            isEssence: false,
            status: needReview ? 'pending' : 'published',
            createdAt: new Date().toISOString()
        };

        posts.push(newPost);
        localStorage.setItem('posts', JSON.stringify(posts));

        document.getElementById('newPostModal').style.display = 'none';
        document.getElementById('newPostForm').reset();
        utils.showNotification(needReview ? '发帖成功，等待管理员审核' : '发帖成功', 'success');
        this.loadPosts();
        this.loadCategories();
        this.loadForumStats();
    }
};

document.addEventListener('DOMContentLoaded', function() {
    forum.init();
});
