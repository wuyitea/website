const app = {
    init() {
        this.setupEventListeners();
        this.setupNavigation();
    },

    setupEventListeners() {
        const userAvatar = document.getElementById('userAvatar');
        const userDropdown = document.querySelector('.user-dropdown');
        if (userAvatar && userDropdown) {
            userAvatar.addEventListener('click', () => userDropdown.classList.toggle('show'));
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.user-profile')) userDropdown.classList.remove('show');
            });
        }
    },

    setupNavigation() {
        const navToggle = document.getElementById('navToggle');
        const navMenu = document.getElementById('navMenu');
        const navSearch = document.getElementById('navSearch');
        const userActions = document.getElementById('userActions');
        if (navToggle) {
            navToggle.addEventListener('click', () => {
                navMenu.classList.toggle('show');
                if (navSearch) navSearch.classList.toggle('show');
                if (userActions) userActions.classList.toggle('show');
            });
        }
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());
