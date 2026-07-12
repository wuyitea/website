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
            messagesList.innerHTML = '<div class="empty-state"><p>请先登录</p></div>';
            return;
        }

        messagesList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">💬</div>
                <h3>暂无消息</h3>
                <p>开始与社区成员互动吧！</p>
            </div>
        `;
    },

    showChatArea(message) {
        const chatArea = document.getElementById('chatArea');
        if (!chatArea) return;

        chatArea.innerHTML = `
            <div class="chat-header">
                <div class="chat-user-info">
                    <div class="chat-username">消息</div>
                </div>
            </div>
            <div class="chat-messages">
                <div class="empty-state">
                    <p>${message}</p>
                </div>
            </div>
        `;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    messages.init();
});
