// 应用配置
const appConfig = {
    siteName: '社区平台',
    siteUrl: 'https://youtea.net',
    postsPerPage: 10,
    productsPerPage: 12,
    maxImageSize: 5 * 1024 * 1024,
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    
    postCategories: [
        { id: 'general', name: '综合讨论', icon: '💬' },
        { id: 'tech', name: '技术交流', icon: '💻' },
        { id: 'life', name: '生活分享', icon: '🏠' },
        { id: 'market', name: '交易信息', icon: '🛒' },
        { id: 'help', name: '求助问答', icon: '❓' },
        { id: 'feedback', name: '建议反馈', icon: '📝' }
    ],
    
    productCategories: [
        { id: 'electronics', name: '电子产品', icon: '📱' },
        { id: 'clothing', name: '服装鞋帽', icon: '👕' },
        { id: 'home', name: '家居日用', icon: '🏠' },
        { id: 'books', name: '图书音像', icon: '📚' },
        { id: 'sports', name: '运动户外', icon: '⚽' },
        { id: 'beauty', name: '美妆护肤', icon: '💄' },
        { id: 'other', name: '其他', icon: '📦' }
    ],
    
    userRoles: {
        user: '普通用户',
        seller: '卖家',
        admin: '管理员'
    }
};

// 工具函数
const utils = {
    formatDate(date) {
        if (!date) return '';
        const d = new Date(date);
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
    
    formatPrice(price) {
        return `¥${price.toFixed(2)}`;
    },
    
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },
    
    validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },
    
    validatePassword(password) {
        return password.length >= 6;
    },
    
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substr(0, maxLength) + '...';
    },
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = 'position:fixed;top:20px;right:20px;padding:12px 24px;border-radius:8px;font-size:14px;z-index:9999;animation:fadeIn 0.3s;' +
            (type === 'error' ? 'background:#fee2e2;color:#dc2626;' : type === 'success' ? 'background:#d1fae5;color:#059669;' : 'background:#eff6ff;color:#2563eb;');
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    },
    
    showLoading(element) {
        element.innerHTML = '<div class="loading"></div>';
    },
    
    hideLoading(element, content) {
        element.innerHTML = content;
    },
    
    debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    },
    
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