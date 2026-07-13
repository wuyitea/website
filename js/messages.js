// 消息模块（localStorage 版本 - 简化版）
const messages = {
    init() {
        this.setupEventListeners();
        this.loadConversations();
        this.checkUrlParams();
    },

    setupEventListeners() {
        document.querySelectorAll('.messages-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.messages-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.loadConversations();
            });
        });
    },

    checkUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('user');
        if (userId) {
            this.showChatArea('暂无消息');
        }
    },

    loadConversations() {
        const messagesList = document.getElementById('messagesList');
        if (!messagesList) return;

        if (!authModule.isLoggedIn()) {
            messagesList.innerHTML = '<div class="empty-state" style="text-align:center;padding:3rem"><i class="ti ti-login" style="font-size:3rem;color:var(--text-secondary)"></i><h3 style="margin:1rem 0 0.5rem">请先登录</h3><p style="color:var(--text-secondary)">登录后即可查看消息</p></div>';
            return;
        }

        messagesList.innerHTML = `
            <div class="empty-state" style="text-align:center;padding:3rem">
                <i class="ti ti-message" style="font-size:3rem;color:var(--text-secondary)"></i>
                <h3 style="margin:1rem 0 0.5rem">暂无消息</h3>
                <p style="color:var(--text-secondary)">开始与社区成员互动吧！</p>
            </div>
        `;
    },

    showChatArea(message) {
        const chatArea = document.getElementById('chatArea');
        if (!chatArea) return;

        chatArea.innerHTML = `
            <div style="padding:1rem;border-bottom:1px solid var(--border-color)">
                <div style="font-weight:600;color:var(--text-primary)"><i class="ti ti-message"></i> 消息</div>
            </div>
            <div style="padding:2rem;text-align:center;color:var(--text-secondary)">
                <p>${message}</p>
            </div>
        `;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    messages.init();
});
