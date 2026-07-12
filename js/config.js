// Firebase 配置
// 注意：在实际部署时，请替换为你自己的Firebase配置
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// 初始化 Firebase
firebase.initializeApp(firebaseConfig);

// 导出 Firebase 服务
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// 数据库集合引用
const usersRef = db.collection('users');
const postsRef = db.collection('posts');
const productsRef = db.collection('products');
const commentsRef = db.collection('comments');
const messagesRef = db.collection('messages');
const ordersRef = db.collection('orders');

// 存储引用
const avatarsRef = storage.ref('avatars');
const imagesRef = storage.ref('images');
const productsImagesRef = storage.ref('products');

// 应用配置
const appConfig = {
    siteName: '社区平台',
    siteUrl: 'https://yourdomain.com',
    postsPerPage: 10,
    productsPerPage: 12,
    maxImageSize: 5 * 1024 * 1024, // 5MB
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    
    // 论坛分类
    postCategories: [
        { id: 'general', name: '综合讨论', icon: '💬' },
        { id: 'tech', name: '技术交流', icon: '💻' },
        { id: 'life', name: '生活分享', icon: '🏠' },
        { id: 'market', name: '交易信息', icon: '🛒' },
        { id: 'help', name: '求助问答', icon: '❓' },
        { id: 'feedback', name: '建议反馈', icon: '📝' }
    ],
    
    // 商品分类
    productCategories: [
        { id: 'electronics', name: '电子产品', icon: '📱' },
        { id: 'clothing', name: '服装鞋帽', icon: '👕' },
        { id: 'home', name: '家居日用', icon: '🏠' },
        { id: 'books', name: '图书音像', icon: '📚' },
        { id: 'sports', name: '运动户外', icon: '⚽' },
        { id: 'beauty', name: '美妆护肤', icon: '💄' },
        { id: 'other', name: '其他', icon: '📦' }
    ],
    
    // 用户角色
    userRoles: {
        user: '普通用户',
        seller: '卖家',
        admin: '管理员'
    }
};

// 工具函数
const utils = {
    // 格式化日期
    formatDate(date) {
        if (!date) return '';
        const d = date.toDate ? date.toDate() : new Date(date);
        const now = new Date();
        const diff = now - d;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (seconds < 60) return '刚刚';
        if (minutes < 60) return `${minutes}分钟前`;
        if (hours < 24) return `${hours}小时前`;
        if (days < 7) return `${days}天前`;
        
        return d.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },
    
    // 格式化价格
    formatPrice(price) {
        return `¥${price.toFixed(2)}`;
    },
    
    // 生成唯一ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },
    
    // 验证邮箱
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },
    
    // 验证密码强度
    validatePassword(password) {
        return password.length >= 6;
    },
    
    // 截断文本
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substr(0, maxLength) + '...';
    },
    
    // 显示通知
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    },
    
    // 显示/隐藏加载状态
    showLoading(element) {
        element.innerHTML = '<div class="loading"></div>';
    },
    
    hideLoading(element, content) {
        element.innerHTML = content;
    },
    
    // 防抖函数
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // 节流函数
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
};