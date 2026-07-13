// 设置模块
const settings = {
    userData: null,

    init() {
        this.checkAuth();
        this.loadUserData();
        this.setupEventListeners();
        this.setupNavigation();
    },

    checkAuth() {
        if (!authModule.isLoggedIn()) {
            utils.showNotification('请先登录', 'warning');
            window.location.href = '../index.html';
            return;
        }
    },

    loadUserData() {
        const user = authModule.getCurrentUser();
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        this.userData = users.find(u => u.id === user.id);

        if (this.userData) {
            this.populateForm();
        }
    },

    populateForm() {
        const username = document.getElementById('username');
        const email = document.getElementById('email');
        const bio = document.getElementById('bio');

        if (username) username.value = this.userData.username || '';
        if (email) email.value = this.userData.email || '';
        if (bio) bio.value = this.userData.bio || '';
    },

    setupEventListeners() {
        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.updateProfile();
            });
        }

        const passwordForm = document.getElementById('passwordForm');
        if (passwordForm) {
            passwordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.updatePassword();
            });
        }

        const notificationsForm = document.getElementById('notificationsForm');
        if (notificationsForm) {
            notificationsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.updateNotificationSettings();
            });
        }

        const privacyForm = document.getElementById('privacyForm');
        if (privacyForm) {
            privacyForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.updatePrivacySettings();
            });
        }

        const deleteAccountBtn = document.getElementById('deleteAccountBtn');
        if (deleteAccountBtn) {
            deleteAccountBtn.addEventListener('click', () => this.deleteAccount());
        }
    },

    setupNavigation() {
        document.querySelectorAll('.settings-nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();

                document.querySelectorAll('.settings-nav-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');

                const targetId = item.getAttribute('href').substring(1);
                document.querySelectorAll('.settings-section').forEach(section => {
                    section.style.display = 'none';
                });
                document.getElementById(targetId).style.display = 'block';
            });
        });
    },

    async updateProfile() {
        const username = document.getElementById('username').value.trim();
        const bio = document.getElementById('bio').value.trim();
        const avatarInput = document.getElementById('avatar');

        if (!username) {
            utils.showNotification('请输入用户名', 'error');
            return;
        }

        const user = authModule.getCurrentUser();
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const userIndex = users.findIndex(u => u.id === user.id);

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
        currentUser.username = username;
        currentUser.bio = bio;
        if (users[userIndex].avatar) currentUser.avatar = users[userIndex].avatar;
        localStorage.setItem('current_user', JSON.stringify(currentUser));
        authModule.currentUser = currentUser;

        utils.showNotification('个人资料更新成功', 'success');
        this.loadUserData();
    },

    updatePassword() {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (!currentPassword || !newPassword || !confirmPassword) {
            utils.showNotification('请填写所有字段', 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            utils.showNotification('两次输入的密码不一致', 'error');
            return;
        }

        if (newPassword.length < 6) {
            utils.showNotification('密码至少需要6个字符', 'error');
            return;
        }

        const user = authModule.getCurrentUser();
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const userIndex = users.findIndex(u => u.id === user.id);

        if (userIndex === -1) {
            utils.showNotification('用户不存在', 'error');
            return;
        }

        if (users[userIndex].password !== currentPassword) {
            utils.showNotification('当前密码错误', 'error');
            return;
        }

        users[userIndex].password = newPassword;
        localStorage.setItem('users', JSON.stringify(users));

        document.getElementById('passwordForm').reset();
        utils.showNotification('密码修改成功', 'success');
    },

    updateNotificationSettings() {
        const user = authModule.getCurrentUser();
        const emailNotifications = document.getElementById('emailNotifications').checked;
        const pushNotifications = document.getElementById('pushNotifications').checked;
        const messageNotifications = document.getElementById('messageNotifications').checked;

        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const userIndex = users.findIndex(u => u.id === user.id);

        if (userIndex !== -1) {
            users[userIndex].settings = {
                ...users[userIndex].settings,
                emailNotifications: emailNotifications,
                pushNotifications: pushNotifications,
                messageNotifications: messageNotifications
            };
            localStorage.setItem('users', JSON.stringify(users));
        }

        utils.showNotification('通知设置保存成功', 'success');
    },

    updatePrivacySettings() {
        const user = authModule.getCurrentUser();
        const showProfile = document.getElementById('showProfile').checked;
        const showPosts = document.getElementById('showPosts').checked;
        const allowMessages = document.getElementById('allowMessages').checked;

        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const userIndex = users.findIndex(u => u.id === user.id);

        if (userIndex !== -1) {
            users[userIndex].settings = {
                ...users[userIndex].settings,
                showProfile: showProfile,
                showPosts: showPosts,
                allowMessages: allowMessages
            };
            localStorage.setItem('users', JSON.stringify(users));
        }

        utils.showNotification('隐私设置保存成功', 'success');
    },

    deleteAccount() {
        if (!confirm('确定要删除账户吗？此操作不可恢复！')) {
            return;
        }

        const user = authModule.getCurrentUser();

        // 删除用户数据
        let users = JSON.parse(localStorage.getItem('users') || '[]');
        users = users.filter(u => u.id !== user.id);
        localStorage.setItem('users', JSON.stringify(users));

        // 删除用户帖子
        let posts = JSON.parse(localStorage.getItem('posts') || '[]');
        posts = posts.filter(p => p.authorId !== user.id);
        localStorage.setItem('posts', JSON.stringify(posts));

        // 删除用户商品
        let products = JSON.parse(localStorage.getItem('products') || '[]');
        products = products.filter(p => p.sellerId !== user.id);
        localStorage.setItem('products', JSON.stringify(products));

        // 清除登录状态
        authModule.currentUser = null;
        authModule.userRole = null;
        localStorage.removeItem('current_user');

        utils.showNotification('账户已删除', 'success');
        window.location.href = '../index.html';
    }
};

document.addEventListener('DOMContentLoaded', () => {
    settings.init();
});
