// 论坛模块（localStorage 版本）
const forum = {
    currentPage: 1,
    postsPerPage: 10,
    currentFilter: 'latest',
    currentCategory: null,

    init() {
        this.loadCategories();
        this.loadPosts();
        this.setupEventListeners();
    },

    setupEventListeners() {
        var newPostBtn = document.getElementById('newPostBtn');
        if (newPostBtn) {
            newPostBtn.addEventListener('click', function() {
                if (!authModule.isLoggedIn()) {
                    alert('请先登录');
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

        document.querySelectorAll('.filter-tab').forEach(function(tab) {
            tab.addEventListener('click', function() {
                document.querySelectorAll('.filter-tab').forEach(function(t) { t.classList.remove('active'); });
                tab.classList.add('active');
                forum.currentFilter = tab.dataset.filter;
                forum.currentPage = 1;
                forum.loadPosts();
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
        var postCategory = document.getElementById('postCategory');
        if (!categoryList) return;

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

        var html = '<li class="category-item"><a href="#" class="category-link active" data-category="all">全部分类 <span class="category-count">' + posts.length + '</span></a></li>';
        var selectHtml = '<option value="">请选择分类</option>';

        appConfig.postCategories.forEach(function(category) {
            html += '<li class="category-item"><a href="#" class="category-link" data-category="' + category.id + '">' + category.icon + ' ' + category.name + ' <span class="category-count">' + (counts[category.id] || 0) + '</span></a></li>';
            selectHtml += '<option value="' + category.id + '">' + category.icon + ' ' + category.name + '</option>';
        });

        categoryList.innerHTML = html;
        if (postCategory) postCategory.innerHTML = selectHtml;

        document.querySelectorAll('.category-link').forEach(function(link) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                document.querySelectorAll('.category-link').forEach(function(l) { l.classList.remove('active'); });
                link.classList.add('active');
                forum.currentCategory = link.dataset.category === 'all' ? null : link.dataset.category;
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
        }

        if (filtered.length === 0) {
            postsList.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📝</div><h3>暂无帖子</h3><p>成为第一个发帖的人吧！</p></div>';
            return;
        }

        var html = '';
        filtered.forEach(function(post) {
            var author = users.find(function(u) { return u.id === post.authorId; }) || {};
            var category = appConfig.postCategories.find(function(c) { return c.id === post.category; });
            var timeAgo = utils.formatDate(post.createdAt);
            var tags = post.tags ? post.tags.map(function(t) { return '<span class="tag">' + t + '</span>'; }).join('') : '';

            var avatarUrl = author.avatar || 'images/default-avatar.png';
            if (avatarUrl.indexOf('data:') !== 0) avatarUrl = '../' + avatarUrl;
            html += '<article class="post-item">' +
                '<div class="post-item-header">' +
                '<img src="' + avatarUrl + '" alt="" class="post-item-avatar">' +
                '<div class="post-item-meta">' +
                '<div class="post-item-author">' + (author.username || '匿名用户') + '</div>' +
                '<div class="post-item-time">' + timeAgo + '</div>' +
                '</div>' +
                (category ? '<span class="post-category">' + category.icon + ' ' + category.name + '</span>' : '') +
                '</div>' +
                '<h2 class="post-item-title"><a href="post.html?id=' + post.id + '">' + post.title + '</a></h2>' +
                '<p class="post-item-content">' + utils.truncateText(post.content, 300) + '</p>' +
                '<div class="post-item-footer">' +
                '<div class="post-item-stats">' +
                '<span>👍 ' + (post.likesCount || 0) + '</span>' +
                '<span>💬 ' + (post.commentsCount || 0) + '</span>' +
                '<span>👁 ' + (post.viewsCount || 0) + '</span>' +
                '</div>' +
                '<div class="post-item-tags">' + tags + '</div>' +
                '</div>' +
                '</article>';
        });

        postsList.innerHTML = html;
    },

    showNewPostModal() {
        var modal = document.getElementById('newPostModal');
        if (modal) modal.style.display = 'block';
    },

    submitPost() {
        var category = document.getElementById('postCategory').value;
        var title = document.getElementById('postTitle').value.trim();
        var content = document.getElementById('postContent').value.trim();
        var tagsInput = document.getElementById('postTags').value.trim();

        if (!authModule.isLoggedIn()) {
            alert('请先登录后再发帖');
            authModule.showModal('login');
            return;
        }

        var savedForum = JSON.parse(localStorage.getItem('admin_settings_forum') || '{}');
        if (savedForum.forumAllowPost === false) {
            alert('管理员已关闭发帖功能');
            return;
        }

        if (!category) { alert('请选择分类'); return; }
        if (!title) { alert('请输入标题'); return; }
        if (!content) { alert('请输入内容'); return; }

        var tags = tagsInput ? tagsInput.split(',').map(function(t) { return t.trim(); }).filter(function(t) { return t; }) : [];
        var user = authModule.getCurrentUser();
        if (!user) { alert('请先登录'); return; }

        var needReview = savedForum.forumNeedReview === true;

        var posts = JSON.parse(localStorage.getItem('posts') || '[]');
        var newPost = {
            id: Date.now().toString(),
            title: title,
            content: content,
            category: category,
            tags: tags,
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
        alert(needReview ? '发帖成功，等待管理员审核' : '发帖成功');
        this.loadPosts();
        this.loadCategories();
    },
};

document.addEventListener('DOMContentLoaded', function() {
    forum.init();
});