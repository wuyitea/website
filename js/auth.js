// 用户认证模块
const authModule = {
    currentUser: null,
    userRole: null,
    
    // 初始化认证状态监听
    init() {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                this.currentUser = user;
                await this.loadUserProfile(user.uid);
                this.updateUI(true);
            } else {
                this.currentUser = null;
                this.userRole = null;
                this.updateUI(false);
            }
        });
        
        this.setupEventListeners();
    },
    
    // 设置事件监听
    setupEventListeners() {
        // 登录按钮
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const showRegister = document.getElementById('showRegister');
        const showLogin = document.getElementById('showLogin');
        
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.showModal('login'));
        }
        
        if (registerBtn) {
            registerBtn.addEventListener('click', () => this.showModal('register'));
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
        
        // 表单提交
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
        
        // 模态框关闭
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                this.hideAllModals();
            });
        });
        
        // 点击模态框外部关闭
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideAllModals();
            }
        });
    },
    
    // 登录
    async login() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        if (!email || !password) {
            utils.showNotification('请填写邮箱和密码', 'error');
            return;
        }
        
        try {
            await auth.signInWithEmailAndPassword(email, password);
            this.hideModal('login');
            utils.showNotification('登录成功', 'success');
        } catch (error) {
            console.error('登录失败:', error);
            let message = '登录失败';
            switch (error.code) {
                case 'auth/user-not-found':
                    message = '用户不存在';
                    break;
                case 'auth/wrong-password':
                    message = '密码错误';
                    break;
                case 'auth/invalid-email':
                    message = '邮箱格式不正确';
                    break;
                case 'auth/too-many-requests':
                    message = '登录尝试次数过多，请稍后再试';
                    break;
            }
            utils.showNotification(message, 'error');
        }
    },
    
    // 注册
    async register() {
        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;
        
        // 验证
        if (!username || !email || !password || !confirmPassword) {
            utils.showNotification('请填写所有字段', 'error');
            return;
        }
        
        if (!utils.validateEmail(email)) {
            utils.showNotification('邮箱格式不正确', 'error');
            return;
        }
        
        if (!utils.validatePassword(password)) {
            utils.showNotification('密码至少需要6个字符', 'error');
            return;
        }
        
        if (password !== confirmPassword) {
            utils.showNotification('两次输入的密码不一致', 'error');
            return;
        }
        
        try {
            // 创建用户
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // 创建用户文档
            await usersRef.doc(user.uid).set({
                username: username,
                email: email,
                avatar: 'images/default-avatar.png',
                bio: '',
                role: 'user',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                postsCount: 0,
                productsCount: 0,
                followersCount: 0,
                followingCount: 0
            });
            
            this.hideModal('register');
            utils.showNotification('注册成功', 'success');
        } catch (error) {
            console.error('注册失败:', error);
            let message = '注册失败';
            switch (error.code) {
                case 'auth/email-already-in-use':
                    message = '该邮箱已被注册';
                    break;
                case 'auth/invalid-email':
                    message = '邮箱格式不正确';
                    break;
                case 'auth/weak-password':
                    message = '密码强度不够';
                    break;
            }
            utils.showNotification(message, 'error');
        }
    },
    
    // 退出登录
    async logout() {
        try {
            await auth.signOut();
            utils.showNotification('已退出登录', 'info');
        } catch (error) {
            console.error('退出失败:', error);
            utils.showNotification('退出失败', 'error');
        }
    },
    
    // 加载用户资料
    async loadUserProfile(uid) {
        try {
            const doc = await usersRef.doc(uid).get();
            if (doc.exists) {
                this.userRole = doc.data().role;
                return doc.data();
            }
        } catch (error) {
            console.error('加载用户资料失败:', error);
        }
        return null;
    },
    
    // 更新UI状态
    updateUI(isLoggedIn) {
        const userActions = document.getElementById('userActions');
        const userProfile = document.getElementById('userProfile');
        const userAvatar = document.getElementById('userAvatar');
        
        if (isLoggedIn && this.currentUser) {
            if (userActions) userActions.style.display = 'none';
            if (userProfile) {
                userProfile.style.display = 'block';
                // 这里可以加载用户头像
                // userAvatar.src = this.currentUser.photoURL || 'images/default-avatar.png';
            }
        } else {
            if (userActions) userActions.style.display = 'flex';
            if (userProfile) userProfile.style.display = 'none';
        }
    },
    
    // 显示模态框
    showModal(type) {
        const modal = document.getElementById(`${type}Modal`);
        if (modal) {
            modal.style.display = 'block';
        }
    },
    
    // 隐藏模态框
    hideModal(type) {
        const modal = document.getElementById(`${type}Modal`);
        if (modal) {
            modal.style.display = 'none';
        }
    },
    
    // 隐藏所有模态框
    hideAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    },
    
    // 获取当前用户
    getCurrentUser() {
        return this.currentUser;
    },
    
    // 检查是否已登录
    isLoggedIn() {
        return !!this.currentUser;
    },
    
    // 检查是否是管理员
    isAdmin() {
        return this.userRole === 'admin';
    },
    
    // 检查是否是卖家
    isSeller() {
        return this.userRole === 'seller' || this.userRole === 'admin';
    }
};

// 页面加载时初始化认证模块
document.addEventListener('DOMContentLoaded', () => {
    authModule.init();
});