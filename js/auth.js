// 用户认证模块（localStorage 版本）
const authModule = {
    currentUser: null,
    userRole: null,

    init() {
        const saved = localStorage.getItem('current_user');
        if (saved) {
            this.currentUser = JSON.parse(saved);
            this.userRole = this.currentUser.role;
        }
        this.setupEventListeners();
        this.updateUI(!!this.currentUser);
    },

    setupEventListeners() {
        const loginBtn = document.getElementById('loginBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const showRegister = document.getElementById('showRegister');
        const showLogin = document.getElementById('showLogin');

        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.showModal('login'));
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }

        if (showRegister) {
            showRegister.addEventListener('click', (e) => {
                e.preventDefault();
                this.hideModal('login');
                this.showModal('register');
            });
        }

        if (showLogin) {
            showLogin.addEventListener('click', (e) => {
                e.preventDefault();
                this.hideModal('register');
                this.showModal('login');
            });
        }

        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.login();
            });
        }

        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.register();
            });
        }

        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                this.hideAllModals();
            });
        });

        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideAllModals();
            }
        });
    },

    login() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            this.showTip('请填写邮箱和密码', 'error');
            return;
        }

        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u => u.email === email && u.password === password);

        if (!user) {
            this.showTip('邮箱或密码错误', 'error');
            return;
        }

        this.currentUser = user;
        this.userRole = user.role;
        localStorage.setItem('current_user', JSON.stringify(user));
        this.hideModal('login');
        this.showTip('登录成功', 'success');
        this.updateUI(true);
    },

    register() {
        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;

        if (!username || !email || !password || !confirmPassword) {
            this.showTip('请填写所有字段', 'error');
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            this.showTip('邮箱格式不正确', 'error');
            return;
        }

        if (password.length < 6) {
            this.showTip('密码至少需要6个字符', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showTip('两次输入的密码不一致', 'error');
            return;
        }

        const users = JSON.parse(localStorage.getItem('users') || '[]');
        if (users.find(u => u.email === email)) {
            this.showTip('该邮箱已被注册', 'error');
            return;
        }

        const newUser = {
            id: Date.now().toString(),
            username: username,
            email: email,
            password: password,
            avatar: 'images/default-avatar.png',
            bio: '',
            role: 'user',
            createdAt: new Date().toISOString(),
            postsCount: 0,
            productsCount: 0
        };

        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));

        this.currentUser = newUser;
        this.userRole = newUser.role;
        localStorage.setItem('current_user', JSON.stringify(newUser));

        this.hideModal('register');
        this.showTip('注册成功', 'success');
        this.updateUI(true);
    },

    logout() {
        this.currentUser = null;
        this.userRole = null;
        localStorage.removeItem('current_user');
        this.showTip('已退出登录', 'info');
        this.updateUI(false);
        setTimeout(() => { window.location.href = '../index.html'; }, 500);
    },

    updateUI(isLoggedIn) {
        const userActions = document.getElementById('userActions');
        const userProfile = document.getElementById('userProfile');
        const userName = document.getElementById('userName');

        if (isLoggedIn && this.currentUser) {
            if (userActions) userActions.style.display = 'none';
            if (userProfile) {
                userProfile.style.display = 'flex';
                if (userName) userName.textContent = this.currentUser.username;
            }
        } else {
            if (userActions) userActions.style.display = 'flex';
            if (userProfile) userProfile.style.display = 'none';
        }
    },

    showModal(type) {
        const modal = document.getElementById(`${type}Modal`);
        if (modal) modal.style.display = 'block';
    },

    hideModal(type) {
        const modal = document.getElementById(`${type}Modal`);
        if (modal) modal.style.display = 'none';
    },

    hideAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    },

    showTip(message, type) {
        const existing = document.querySelector('.auth-tip');
        if (existing) existing.remove();

        const tip = document.createElement('div');
        tip.className = 'auth-tip';
        tip.textContent = message;
        tip.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);padding:12px 24px;border-radius:8px;font-size:14px;z-index:9999;animation:fadeIn 0.3s;' +
            (type === 'error' ? 'background:#fee2e2;color:#dc2626;' : 'background:#d1fae5;color:#059669;');
        document.body.appendChild(tip);
        setTimeout(() => tip.remove(), 3000);
    },

    getCurrentUser() { return this.currentUser; },
    isLoggedIn() { return !!this.currentUser; },
    isAdmin() { return this.userRole === 'admin'; },
    isSeller() { return this.userRole === 'seller' || this.userRole === 'admin'; }
};

// 社交登录（模拟）
function socialLogin(platform) {
    var platformName = platform === 'wechat' ? '微信' : 'QQ';
    var mockUser = {
        id: 'social_' + Date.now(),
        username: platformName + '用户' + Math.floor(Math.random() * 10000),
        email: platform + '_' + Date.now() + '@social.com',
        password: '',
        avatar: 'images/default-avatar.png',
        bio: '通过' + platformName + '注册的用户',
        role: 'user',
        createdAt: new Date().toISOString(),
        postsCount: 0,
        productsCount: 0,
        socialType: platform
    };

    var users = JSON.parse(localStorage.getItem('users') || '[]');
    users.push(mockUser);
    localStorage.setItem('users', JSON.stringify(users));

    authModule.currentUser = mockUser;
    authModule.userRole = mockUser.role;
    localStorage.setItem('current_user', JSON.stringify(mockUser));
    authModule.hideAllModals();
    authModule.showTip(platformName + '登录成功', 'success');
    authModule.updateUI(true);
}

document.addEventListener('DOMContentLoaded', () => {
    authModule.init();
});