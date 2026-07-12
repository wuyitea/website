// 设置模块
const settings = {
    userData: null,
    
    // 初始化设置页面
    init() {
        this.checkAuth();
        this.loadUserData();
        this.setupEventListeners();
        this.setupNavigation();
    },
    
    // 检查认证状态
    checkAuth() {
        if (!authModule.isLoggedIn()) {
            utils.showNotification('请先登录', 'warning');
            window.location.href = '../index.html';
            return;
        }
    },
    
    // 加载用户数据
    async loadUserData() {
        try {
            const user = authModule.getCurrentUser();
            const userDoc = await usersRef.doc(user.uid).get();
            
            if (userDoc.exists) {
                this.userData = userDoc.data();
                this.populateForm();
            }
        } catch (error) {
            console.error('加载用户数据失败:', error);
        }
    },
    
    // 填充表单
    populateForm() {
        const username = document.getElementById('username');
        const email = document.getElementById('email');
        const bio = document.getElementById('bio');
        
        if (username) username.value = this.userData.username || '';
        if (email) email.value = this.userData.email || '';
        if (bio) bio.value = this.userData.bio || '';
    },
    
    // 设置事件监听
    setupEventListeners() {
        // 个人资料表单
        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.updateProfile();
            });
        }
        
        // 密码表单
        const passwordForm = document.getElementById('passwordForm');
        if (passwordForm) {
            passwordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.updatePassword();
            });
        }
        
        // 通知设置表单
        const notificationsForm = document.getElementById('notificationsForm');
        if (notificationsForm) {
            notificationsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.updateNotificationSettings();
            });
        }
        
        // 隐私设置表单
        const privacyForm = document.getElementById('privacyForm');
        if (privacyForm) {
            privacyForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.updatePrivacySettings();
            });
        }
        
        // 删除账户按钮
        const deleteAccountBtn = document.getElementById('deleteAccountBtn');
        if (deleteAccountBtn) {
            deleteAccountBtn.addEventListener('click', () => this.deleteAccount());
        }
    },
    
    // 设置导航
    setupNavigation() {
        document.querySelectorAll('.settings-nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                
                // 更新活动状态
                document.querySelectorAll('.settings-nav-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                
                // 显示对应部分
                const targetId = item.getAttribute('href').substring(1);
                document.querySelectorAll('.settings-section').forEach(section => {
                    section.style.display = 'none';
                });
                document.getElementById(targetId).style.display = 'block';
            });
        });
    },
    
    // 更新个人资料
    async updateProfile() {
        const username = document.getElementById('username').value.trim();
        const bio = document.getElementById('bio').value.trim();
        const avatarInput = document.getElementById('avatar');
        
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
            
            utils.showNotification('个人资料更新成功', 'success');
            await this.loadUserData();
        } catch (error) {
            console.error('更新个人资料失败:', error);
            utils.showNotification('更新失败', 'error');
        }
    },
    
    // 更新密码
    async updatePassword() {
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
        
        try {
            const user = authModule.getCurrentUser();
            
            // 重新认证
            const credential = firebase.auth.EmailAuthProvider.credential(
                user.email,
                currentPassword
            );
            await user.reauthenticateWithCredential(credential);
            
            // 更新密码
            await user.updatePassword(newPassword);
            
            // 清空表单
            document.getElementById('passwordForm').reset();
            
            utils.showNotification('密码修改成功', 'success');
        } catch (error) {
            console.error('修改密码失败:', error);
            let message = '修改失败';
            if (error.code === 'auth/wrong-password') {
                message = '当前密码错误';
            }
            utils.showNotification(message, 'error');
        }
    },
    
    // 更新通知设置
    async updateNotificationSettings() {
        try {
            const user = authModule.getCurrentUser();
            const emailNotifications = document.getElementById('emailNotifications').checked;
            const pushNotifications = document.getElementById('pushNotifications').checked;
            const messageNotifications = document.getElementById('messageNotifications').checked;
            
            await usersRef.doc(user.uid).update({
                settings: {
                    emailNotifications: emailNotifications,
                    pushNotifications: pushNotifications,
                    messageNotifications: messageNotifications
                },
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            utils.showNotification('通知设置保存成功', 'success');
        } catch (error) {
            console.error('保存通知设置失败:', error);
            utils.showNotification('保存失败', 'error');
        }
    },
    
    // 更新隐私设置
    async updatePrivacySettings() {
        try {
            const user = authModule.getCurrentUser();
            const showProfile = document.getElementById('showProfile').checked;
            const showPosts = document.getElementById('showPosts').checked;
            const allowMessages = document.getElementById('allowMessages').checked;
            
            await usersRef.doc(user.uid).update({
                settings: {
                    showProfile: showProfile,
                    showPosts: showPosts,
                    allowMessages: allowMessages
                },
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            utils.showNotification('隐私设置保存成功', 'success');
        } catch (error) {
            console.error('保存隐私设置失败:', error);
            utils.showNotification('保存失败', 'error');
        }
    },
    
    // 删除账户
    async deleteAccount() {
        if (!confirm('确定要删除账户吗？此操作不可恢复！')) {
            return;
        }
        
        try {
            const user = authModule.getCurrentUser();
            
            // 删除用户数据
            await usersRef.doc(user.uid).delete();
            
            // 删除用户帖子
            const postsSnapshot = await postsRef.where('authorId', '==', user.uid).get();
            for (const doc of postsSnapshot.docs) {
                await doc.ref.delete();
            }
            
            // 删除用户商品
            const productsSnapshot = await productsRef.where('sellerId', '==', user.uid).get();
            for (const doc of productsSnapshot.docs) {
                await doc.ref.delete();
            }
            
            // 删除Firebase认证用户
            await user.delete();
            
            utils.showNotification('账户已删除', 'success');
            window.location.href = '../index.html';
        } catch (error) {
            console.error('删除账户失败:', error);
            let message = '删除失败';
            if (error.code === 'auth/requires-recent-login') {
                message = '请重新登录后再试';
            }
            utils.showNotification(message, 'error');
        }
    }
};

// 页面加载完成后初始化设置模块
document.addEventListener('DOMContentLoaded', () => {
    settings.init();
});