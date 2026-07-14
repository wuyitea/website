// 应用配置
const SITE_VERSION = '14';
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
    },

    readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            if (!appConfig.allowedImageTypes.includes(file.type)) {
                reject(new Error('不支持的图片格式'));
                return;
            }
            if (file.size > appConfig.maxImageSize) {
                reject(new Error('图片大小不能超过5MB'));
                return;
            }
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('读取图片失败'));
            reader.readAsDataURL(file);
        });
    },

    async processImageFiles(files, maxCount) {
        const result = [];
        const fileArray = Array.from(files).slice(0, maxCount);
        for (const file of fileArray) {
            try {
                const dataURL = await this.readFileAsDataURL(file);
                result.push(dataURL);
            } catch (e) {
                utils.showNotification(e.message, 'error');
            }
        }
        return result;
    },

    imagePath(url, prefix) {
        if (!url) return (prefix || '') + 'images/default-avatar.png';
        if (url.indexOf('data:') === 0) return url;
        return (prefix || '') + url;
    },

    applyTheme() {
        var saved = localStorage.getItem('site_theme');
        if (!saved) return;
        try {
            var theme = JSON.parse(saved);
            var root = document.documentElement;
            if (theme.primaryColor) {
                root.style.setProperty('--primary-color', theme.primaryColor);
                var r = parseInt(theme.primaryColor.slice(1, 3), 16);
                var g = parseInt(theme.primaryColor.slice(3, 5), 16);
                var b = parseInt(theme.primaryColor.slice(5, 7), 16);
                root.style.setProperty('--primary-dark', 'rgb(' + Math.max(0, r - 15) + ',' + Math.max(0, g - 15) + ',' + Math.max(0, b - 15) + ')');
                root.style.setProperty('--primary-light', 'rgb(' + Math.min(255, r + 20) + ',' + Math.min(255, g + 20) + ',' + Math.min(255, b + 20) + ')');
            }
            if (theme.secondaryColor) root.style.setProperty('--secondary-color', theme.secondaryColor);
            if (theme.successColor) root.style.setProperty('--success-color', theme.successColor);
            if (theme.warningColor) root.style.setProperty('--warning-color', theme.warningColor);
            if (theme.dangerColor) root.style.setProperty('--danger-color', theme.dangerColor);
            if (theme.infoColor) root.style.setProperty('--info-color', theme.infoColor);
            if (theme.borderRadius) root.style.setProperty('--border-radius', theme.borderRadius);
            if (theme.borderRadiusLg) root.style.setProperty('--border-radius-lg', theme.borderRadiusLg);
            if (theme.fontFamily) root.style.setProperty('--font-family', theme.fontFamily);
            if (theme.bgPrimary) root.style.setProperty('--bg-primary', theme.bgPrimary);
            if (theme.bgSecondary) root.style.setProperty('--bg-secondary', theme.bgSecondary);
            if (theme.textPrimary) root.style.setProperty('--text-primary', theme.textPrimary);
            if (theme.textSecondary) root.style.setProperty('--text-secondary', theme.textSecondary);
        } catch (e) {}
    }
};

utils.applyTheme();

utils.applyGeneralSettings = function() {
    var saved = localStorage.getItem('admin_settings_general');
    if (!saved) return;
    try {
        var s = JSON.parse(saved);
        if (s.siteName) {
            document.querySelectorAll('[data-setting="siteName"]').forEach(function(el) {
                el.textContent = s.siteName;
            });
            var titleParts = document.title.split(' - ');
            if (titleParts.length > 1) {
                titleParts[titleParts.length - 1] = s.siteName;
                document.title = titleParts.join(' - ');
            } else {
                document.title = s.siteName;
            }
        }
        if (s.siteDesc) {
            var meta = document.querySelector('meta[name="description"]');
            if (meta) meta.setAttribute('content', s.siteDesc);
        }
        if (s.siteICP) {
            document.querySelectorAll('[data-setting="siteICP"]').forEach(function(el) {
                el.textContent = s.siteICP;
                el.style.display = '';
            });
        } else {
            document.querySelectorAll('[data-setting="siteICP"]').forEach(function(el) {
                el.style.display = 'none';
            });
        }
        if (s.siteEmail) {
            document.querySelectorAll('[data-setting="siteEmail"]').forEach(function(el) {
                el.textContent = s.siteEmail;
            });
        }
    } catch (e) {}
};

utils.applyGeneralSettings();

utils.applyCopySettings = function() {
    var saved = localStorage.getItem('admin_settings_copy');
    if (!saved) return;
    var skipNavKeys = {'navHome':1,'navForum':1,'navMarket':1,'navDisplay1':1,'navDisplay2':1,'navAbout':1};
    try {
        var s = JSON.parse(saved);
        Object.keys(s).forEach(function(key) {
            if (!s[key] || skipNavKeys[key]) return;
            var els = document.querySelectorAll('[data-copy="' + key + '"]');
            els.forEach(function(el) {
                if (key === 'heroSubtitle') {
                    el.innerHTML = s[key].replace(/\n/g, '<br>');
                } else if (key === 'footerCopyright') {
                    var siteNameEl = el.querySelector('[data-setting="siteName"]');
                    var icpEl = el.querySelector('[data-setting="siteICP"]');
                    var parts = s[key].split('社区平台');
                    el.textContent = '';
                    if (parts[0]) el.appendChild(document.createTextNode(parts[0]));
                    if (siteNameEl) {
                        var snClone = siteNameEl.cloneNode(true);
                        snClone.removeAttribute('data-setting');
                        el.appendChild(snClone);
                    }
                    if (parts[1]) {
                        var midParts = parts[1].split('社区平台');
                        el.appendChild(document.createTextNode(midParts[0]));
                        if (midParts[1]) el.appendChild(document.createTextNode(midParts[1]));
                    }
                    if (icpEl) el.appendChild(icpEl);
                } else {
                    el.textContent = s[key];
                }
            });
        });
        document.querySelectorAll('[data-copy-link]').forEach(function(el) {
            var key = el.getAttribute('data-copy-link');
            if (s[key]) el.href = s[key];
        });
    } catch (e) {}
};

utils.applyCopySettings();

// ========== GitHub 远程同步 ==========
var GITHUB_OWNER = 'wuyitea';
var GITHUB_REPO = 'website';
var CONFIG_PATH = 'data/site-config.json';
var CONFIG_RAW_URL = 'https://api.github.com/repos/' + GITHUB_OWNER + '/' + GITHUB_REPO + '/contents/' + CONFIG_PATH;
var GITHUB_API = 'https://api.github.com/repos/' + GITHUB_OWNER + '/' + GITHUB_REPO + '/contents/' + CONFIG_PATH;

var _lsKeyMap = {
    general: 'admin_settings_general',
    copy: 'admin_settings_copy',
    theme: 'site_theme',
    slides: 'admin_homepage_slides',
    banners: 'admin_market_banners',
    shopLinks: 'admin_shop_links',
    forum: 'admin_settings_forum',
    forumSlides: 'admin_forum_slides',
    forumHeight: 'admin_forum_height',
    display1: 'admin_settings_display1',
    display1Slides: 'admin_display1_slides',
    display1Height: 'admin_display1_height',
    display2: 'admin_settings_display2',
    display2Slides: 'admin_display2_slides',
    display2Height: 'admin_display2_height',
    display3: 'admin_settings_display3',
    display3Slides: 'admin_display3_slides',
    display3Height: 'admin_display3_height',
    display4: 'admin_settings_display4',
    display4Slides: 'admin_display4_slides',
    display4Height: 'admin_display4_height',
    display5: 'admin_settings_display5',
    display5Slides: 'admin_display5_slides',
    display5Height: 'admin_display5_height',
    display6: 'admin_settings_display6',
    display6Slides: 'admin_display6_slides',
    display6Height: 'admin_display6_height',
    market: 'admin_settings_market',
    security: 'admin_settings_security',
    notifications: 'admin_settings_notifications',
    navConfig: 'admin_nav_config'
};

utils.syncFromGitHub = function() {
    var url = CONFIG_RAW_URL + '?t=' + Date.now();
    return fetch(url, { headers: { 'Accept': 'application/vnd.github.v3.raw' } }).then(function(r) {
        if (!r.ok) throw new Error('fetch failed');
        return r.json();
    }).then(function(data) {
        Object.keys(_lsKeyMap).forEach(function(k) {
            if (data[k] !== undefined && data[k] !== null) {
                var raw = data[k];
                var isEmpty = (typeof raw === 'object' && raw !== null && Object.keys(raw).length === 0) || (Array.isArray(raw) && raw.length === 0) || raw === '' || raw === '{}';
                if (!isEmpty) {
                    var v = typeof raw === 'string' ? raw : JSON.stringify(raw);
                    localStorage.setItem(_lsKeyMap[k], v);
                }
            }
        });
        utils.applyTheme();
        utils.applyGeneralSettings();
utils.applyCopySettings();

// ========== 导航栏配置 ==========
utils.applyNavConfig = function() {
    var saved = localStorage.getItem('admin_nav_config');
    if (!saved) return;
    try {
        var config = JSON.parse(saved);
        if (!Array.isArray(config) || !config.length) return;
        var isIndex = /\/index\.html$/.test(location.pathname) || location.pathname.endsWith('/') || location.pathname.split('/').pop() === '';
        var navHrefs = {
            home: isIndex ? 'index.html' : '../index.html',
            forum: isIndex ? 'pages/forum.html' : 'forum.html',
            market: isIndex ? 'pages/market.html' : 'market.html',
            display1: isIndex ? 'pages/display1.html' : 'display1.html',
            display2: isIndex ? 'pages/display2.html' : 'display2.html',
            display3: isIndex ? 'pages/display3.html' : 'display3.html',
            display4: isIndex ? 'pages/display4.html' : 'display4.html',
            display5: isIndex ? 'pages/display5.html' : 'display5.html',
            display6: isIndex ? 'pages/display6.html' : 'display6.html',
            about: isIndex ? 'pages/about.html' : 'about.html'
        };
        document.querySelectorAll('.nav-links').forEach(function(ul) {
            var existing = {};
            ul.querySelectorAll('li[data-nav]').forEach(function(li) {
                existing[li.getAttribute('data-nav')] = li;
            });
            var newOrder = [];
            config.forEach(function(item) {
                if (existing[item.id]) {
                    var li = existing[item.id];
                    var a = li.querySelector('a');
                    if (a) {
                        if (navHrefs[item.id]) a.href = navHrefs[item.id];
                        var icon = a.querySelector('i');
                        if (icon) icon.className = item.icon;
                        var span = a.querySelector('span');
                        if (span && item.label) span.textContent = item.label;
                    }
                    newOrder.push(li);
                }
            });
            newOrder.forEach(function(li) { ul.appendChild(li); });
        });
    } catch (e) {}
};

utils.applyNavConfig();
        utils.applyNavConfig();
        window._siteConfigReady = true;
    }).catch(function() {
        window._siteConfigReady = true;
    });
};

utils.syncFromGitHub();

utils.saveConfigToGitHub = function(token) {
    var payload = {};
    Object.keys(_lsKeyMap).forEach(function(k) {
        var raw = localStorage.getItem(_lsKeyMap[k]);
        if (raw) {
            try { payload[k] = JSON.parse(raw); } catch(e) { payload[k] = raw; }
        } else {
            payload[k] = typeof {} === 'object' ? {} : '';
        }
    });
    var content = btoa(unescape(encodeURIComponent(JSON.stringify(payload, null, 2))));
    return fetch(GITHUB_API, {
        method: 'GET',
        headers: { 'Authorization': 'token ' + token, 'Accept': 'application/vnd.github.v3+json' }
    }).then(function(r) { return r.json(); }).then(function(file) {
        var sha = file.sha || '';
        var body = { message: 'update site config', content: content, branch: 'main' };
        if (sha) body.sha = sha;
        return fetch(GITHUB_API, {
            method: 'PUT',
            headers: { 'Authorization': 'token ' + token, 'Content-Type': 'application/json', 'Accept': 'application/vnd.github.v3+json' },
            body: JSON.stringify(body)
        });
    }).then(function(r) { return r.json(); });
};

(function() {
    function setActiveNav() {
        var path = location.pathname.split('/').pop() || 'index.html';
        document.querySelectorAll('.nav-links a').forEach(function(a) {
            a.classList.remove('active');
            var href = a.getAttribute('href');
            if (href) {
                var h = href.split('/').pop().split('?')[0];
                if (h === path) a.classList.add('active');
            }
        });
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setActiveNav);
    } else {
        setActiveNav();
    }
    setTimeout(setActiveNav, 500);
})();