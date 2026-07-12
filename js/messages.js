// 消息模块
const messages = {
    currentTab: 'private',
    currentConversation: null,
    messagesListener: null,
    
    // 初始化消息模块
    init() {
        this.setupEventListeners();
        this.loadConversations();
        this.checkUrlParams();
    },
    
    // 设置事件监听
    setupEventListeners() {
        // 标签切换
        document.querySelectorAll('.messages-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.messages-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentTab = tab.dataset.tab;
                this.loadConversations();
            });
        });
    },
    
    // 检查URL参数
    checkUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('user');
        if (userId) {
            this.startConversation(userId);
        }
    },
    
    // 加载对话列表
    async loadConversations() {
        const messagesList = document.getElementById('messagesList');
        if (!messagesList) return;
        
        if (!authModule.isLoggedIn()) {
            messagesList.innerHTML = '<div class="empty-state"><p>请先登录</p></div>';
            return;
        }
        
        const currentUser = authModule.getCurrentUser();
        
        try {
            let query;
            
            switch (this.currentTab) {
                case 'private':
                    query = messagesRef
                        .where('participants', 'array-contains', currentUser.uid)
                        .where('type', '==', 'private')
                        .orderBy('lastMessage.time', 'desc');
                    break;
                case 'system':
                    query = messagesRef
                        .where('recipientId', '==', currentUser.uid)
                        .where('type', '==', 'system')
                        .orderBy('createdAt', 'desc');
                    break;
                case 'interaction':
                    query = messagesRef
                        .where('recipientId', '==', currentUser.uid)
                        .where('type', 'in', ['like', 'comment', 'follow'])
                        .orderBy('createdAt', 'desc');
                    break;
            }
            
            const snapshot = await query.get();
            
            if (snapshot.empty) {
                messagesList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">💬</div>
                        <h3>暂无消息</h3>
                        <p>开始与社区成员互动吧！</p>
                    </div>
                `;
                return;
            }
            
            let html = '';
            for (const doc of snapshot.docs) {
                const conversation = doc.data();
                html += await this.createConversationItem(doc.id, conversation);
            }
            
            messagesList.innerHTML = html;
            this.setupConversationEvents();
        } catch (error) {
            console.error('加载对话列表失败:', error);
            messagesList.innerHTML = '<div class="empty-state"><p>加载失败</p></div>';
        }
    },
    
    // 创建对话项
    async createConversationItem(conversationId, conversation) {
        const currentUser = authModule.getCurrentUser();
        const otherUserId = conversation.participants?.find(id => id !== currentUser.uid);
        
        let otherUser = null;
        if (otherUserId) {
            const userDoc = await usersRef.doc(otherUserId).get();
            otherUser = userDoc.data();
        }
        
        const lastMessage = conversation.lastMessage;
        const timeAgo = lastMessage?.time ? utils.formatDate(lastMessage.time) : '';
        const isUnread = lastMessage?.senderId !== currentUser.uid && !lastMessage?.read;
        
        if (this.currentTab === 'private') {
            return `
                <div class="message-item ${isUnread ? 'unread' : ''}" data-id="${conversationId}" data-user="${otherUserId}">
                    <div class="message-avatar">
                        <img src="${otherUser?.avatar || '../images/default-avatar.png'}" 
                             alt="${otherUser?.username || '用户'}">
                        ${isUnread ? '<div class="unread-dot"></div>' : ''}
                    </div>
                    <div class="message-info">
                        <div class="message-name">${otherUser?.username || '匿名用户'}</div>
                        <div class="message-preview">${lastMessage?.content || '暂无消息'}</div>
                    </div>
                    <div class="message-time">${timeAgo}</div>
                </div>
            `;
        } else {
            return `
                <div class="message-item ${isUnread ? 'unread' : ''}" data-id="${conversationId}">
                    <div class="message-avatar">
                        <img src="${conversation.senderAvatar || '../images/default-avatar.png'}" 
                             alt="${conversation.senderName || '系统'}">
                        ${isUnread ? '<div class="unread-dot"></div>' : ''}
                    </div>
                    <div class="message-info">
                        <div class="message-name">${conversation.senderName || '系统'}</div>
                        <div class="message-preview">${conversation.content || '暂无内容'}</div>
                    </div>
                    <div class="message-time">${timeAgo}</div>
                </div>
            `;
        }
    },
    
    // 设置对话事件
    setupConversationEvents() {
        document.querySelectorAll('.message-item').forEach(item => {
            item.addEventListener('click', () => {
                const conversationId = item.dataset.id;
                const userId = item.dataset.user;
                
                // 移除其他选中状态
                document.querySelectorAll('.message-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                
                // 加载对话
                if (this.currentTab === 'private' && userId) {
                    this.loadConversation(conversationId, userId);
                } else {
                    this.loadNotification(conversationId);
                }
            });
        });
    },
    
    // 开始新对话
    async startConversation(userId) {
        if (!authModule.isLoggedIn()) {
            utils.showNotification('请先登录', 'warning');
            return;
        }
        
        const currentUser = authModule.getCurrentUser();
        
        try {
            // 检查是否已有对话
            const existingConversation = await messagesRef
                .where('participants', 'array-contains', currentUser.uid)
                .where('type', '==', 'private')
                .get();
            
            let conversationId = null;
            
            for (const doc of existingConversation.docs) {
                const participants = doc.data().participants;
                if (participants.includes(userId)) {
                    conversationId = doc.id;
                    break;
                }
            }
            
            // 如果没有对话，创建新对话
            if (!conversationId) {
                const conversationRef = await messagesRef.add({
                    participants: [currentUser.uid, userId],
                    type: 'private',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastMessage: null
                });
                conversationId = conversationRef.id;
            }
            
            // 加载对话
            this.loadConversation(conversationId, userId);
            
            // 刷新对话列表
            this.loadConversations();
        } catch (error) {
            console.error('开始对话失败:', error);
            utils.showNotification('操作失败', 'error');
        }
    },
    
    // 加载私聊对话
    async loadConversation(conversationId, otherUserId) {
        const chatArea = document.getElementById('chatArea');
        if (!chatArea) return;
        
        try {
            // 获取对方用户信息
            const userDoc = await usersRef.doc(otherUserId).get();
            const userData = userDoc.data();
            
            // 更新聊天头部
            chatArea.innerHTML = `
                <div class="chat-header">
                    <img src="${userData?.avatar || '../images/default-avatar.png'}" 
                         alt="${userData?.username || '用户'}" 
                         class="chat-avatar">
                    <div class="chat-user-info">
                        <div class="chat-username">${userData?.username || '匿名用户'}</div>
                        <div class="chat-status">在线</div>
                    </div>
                    <a href="profile.html?id=${otherUserId}" class="btn btn-outline btn-sm">查看资料</a>
                </div>
                <div class="chat-messages" id="chatMessages"></div>
                <div class="chat-input">
                    <textarea id="messageInput" placeholder="输入消息..."></textarea>
                    <button class="btn btn-primary" id="sendMessageBtn">发送</button>
                </div>
            `;
            
            // 加载消息
            await this.loadMessages(conversationId);
            
            // 设置发送消息事件
            this.setupMessageEvents(conversationId);
            
            // 监听新消息
            this.listenForMessages(conversationId);
        } catch (error) {
            console.error('加载对话失败:', error);
        }
    },
    
    // 加载系统通知
    async loadNotification(notificationId) {
        const chatArea = document.getElementById('chatArea');
        if (!chatArea) return;
        
        try {
            const notificationDoc = await messagesRef.doc(notificationId).get();
            const notification = notificationDoc.data();
            
            chatArea.innerHTML = `
                <div class="chat-header">
                    <img src="${notification.senderAvatar || '../images/default-avatar.png'}" 
                         alt="${notification.senderName || '系统'}" 
                         class="chat-avatar">
                    <div class="chat-user-info">
                        <div class="chat-username">${notification.senderName || '系统'}</div>
                        <div class="chat-status">${utils.formatDate(notification.createdAt)}</div>
                    </div>
                </div>
                <div class="chat-messages">
                    <div class="chat-message received">
                        <div class="chat-message-content">${notification.content}</div>
                        <div class="chat-message-time">${utils.formatDate(notification.createdAt)}</div>
                    </div>
                </div>
            `;
            
            // 标记为已读
            await messagesRef.doc(notificationId).update({
                read: true
            });
            
            // 刷新列表
            this.loadConversations();
        } catch (error) {
            console.error('加载通知失败:', error);
        }
    },
    
    // 加载消息
    async loadMessages(conversationId) {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;
        
        try {
            const snapshot = await messagesRef.doc(conversationId)
                .collection('messages')
                .orderBy('createdAt', 'asc')
                .get();
            
            if (snapshot.empty) {
                chatMessages.innerHTML = '<div class="empty-state"><p>暂无消息，开始聊天吧！</p></div>';
                return;
            }
            
            const currentUser = authModule.getCurrentUser();
            let html = '';
            
            for (const doc of snapshot.docs) {
                const message = doc.data();
                const isSent = message.senderId === currentUser.uid;
                
                html += `
                    <div class="chat-message ${isSent ? 'sent' : 'received'}">
                        <div class="chat-message-content">${message.content}</div>
                        <div class="chat-message-time">${utils.formatDate(message.createdAt)}</div>
                    </div>
                `;
            }
            
            chatMessages.innerHTML = html;
            chatMessages.scrollTop = chatMessages.scrollHeight;
        } catch (error) {
            console.error('加载消息失败:', error);
        }
    },
    
    // 设置消息事件
    setupMessageEvents(conversationId) {
        const sendMessageBtn = document.getElementById('sendMessageBtn');
        const messageInput = document.getElementById('messageInput');
        
        if (sendMessageBtn && messageInput) {
            const sendMessage = async () => {
                const content = messageInput.value.trim();
                if (!content) return;
                
                const currentUser = authModule.getCurrentUser();
                
                try {
                    // 添加消息
                    await messagesRef.doc(conversationId)
                        .collection('messages')
                        .add({
                            senderId: currentUser.uid,
                            content: content,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    
                    // 更新对话最后消息
                    await messagesRef.doc(conversationId).update({
                        lastMessage: {
                            content: content,
                            senderId: currentUser.uid,
                            time: firebase.firestore.FieldValue.serverTimestamp(),
                            read: false
                        }
                    });
                    
                    // 清空输入框
                    messageInput.value = '';
                    
                    // 重新加载消息
                    await this.loadMessages(conversationId);
                } catch (error) {
                    console.error('发送消息失败:', error);
                    utils.showNotification('发送失败', 'error');
                }
            };
            
            sendMessageBtn.addEventListener('click', sendMessage);
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                }
            });
        }
    },
    
    // 监听新消息
    listenForMessages(conversationId) {
        // 移除之前的监听器
        if (this.messagesListener) {
            this.messagesListener();
        }
        
        this.messagesListener = messagesRef.doc(conversationId)
            .collection('messages')
            .orderBy('createdAt', 'asc')
            .onSnapshot((snapshot) => {
                const chatMessages = document.getElementById('chatMessages');
                if (!chatMessages) return;
                
                const currentUser = authModule.getCurrentUser();
                
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        const message = change.doc.data();
                        const isSent = message.senderId === currentUser.uid;
                        
                        const messageElement = document.createElement('div');
                        messageElement.className = `chat-message ${isSent ? 'sent' : 'received'}`;
                        messageElement.innerHTML = `
                            <div class="chat-message-content">${message.content}</div>
                            <div class="chat-message-time">${utils.formatDate(message.createdAt)}</div>
                        `;
                        
                        chatMessages.appendChild(messageElement);
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                    }
                });
            });
    }
};

// 页面加载完成后初始化消息模块
document.addEventListener('DOMContentLoaded', () => {
    messages.init();
});