/**
 * Main Application Module
 * Orchestrates all modules and handles UI interactions
 */

const App = {
    /**
     * Initialize the application
     */
    init() {
        // Initialize authentication
        Auth.init();

        // Set up event listeners
        this.setupEventListeners();

        // Set default dates
        this.setDefaultDates();

        // Hide loading overlay after a short delay
        setTimeout(() => {
            document.getElementById('loading-overlay').classList.add('fade-out');
        }, 500);
    },

    /**
     * Handle authentication state changes
     */
    handleAuthStateChange(user) {
        const landingPage = document.getElementById('landing-page');
        const appPage = document.getElementById('app-page');
        const authModal = document.getElementById('auth-modal');

        if (user) {
            // User is signed in
            landingPage.classList.add('hidden');
            appPage.classList.remove('hidden');
            authModal.classList.add('hidden');

            // Update user info in header
            this.updateUserInfo(user);

            // Initialize activities and dashboard
            const date = new Date(document.getElementById('activity-date').value);
            Activities.init(date);
            Dashboard.init(date);
        } else {
            // User is signed out
            landingPage.classList.remove('hidden');
            appPage.classList.add('hidden');

            // Cleanup modules
            Activities.cleanup();
            Dashboard.cleanup();
        }
    },

    /**
     * Update user info in the header
     */
    updateUserInfo(user) {
        const avatar = document.getElementById('user-avatar');
        const name = document.getElementById('user-name');

        name.textContent = user.displayName || user.email?.split('@')[0] || 'User';
        
        if (user.photoURL) {
            avatar.src = user.photoURL;
        } else {
            // Generate a placeholder avatar
            avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name.textContent)}&background=6366f1&color=fff`;
        }
    },

    /**
     * Set default dates to today
     */
    setDefaultDates() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('activity-date').value = today;
        document.getElementById('dashboard-date').value = today;
    },

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Landing page buttons
        document.getElementById('nav-login-btn').addEventListener('click', () => this.openAuthModal());
        document.getElementById('hero-get-started').addEventListener('click', () => this.openAuthModal('register'));
        document.getElementById('hero-learn-more').addEventListener('click', () => {
            document.querySelector('.landing-features').scrollIntoView({ behavior: 'smooth' });
        });

        // Auth modal
        document.getElementById('close-auth-modal').addEventListener('click', () => this.closeAuthModal());
        document.querySelector('#auth-modal .modal-backdrop').addEventListener('click', () => this.closeAuthModal());

        // Auth tabs
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchAuthTab(e.target.dataset.tab));
        });

        // Auth forms
        document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('register-form').addEventListener('submit', (e) => this.handleRegister(e));
        document.getElementById('google-signin').addEventListener('click', () => this.handleGoogleSignIn());

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => this.handleLogout());

        // Date pickers
        document.getElementById('activity-date').addEventListener('change', (e) => {
            const date = new Date(e.target.value);
            Activities.init(date);
        });

        document.getElementById('dashboard-date').addEventListener('change', (e) => {
            const date = new Date(e.target.value);
            Dashboard.init(date);
        });

        // Add activity form
        document.getElementById('add-activity-form').addEventListener('submit', (e) => this.handleAddActivity(e));

        // Analyse button
        document.getElementById('analyse-btn').addEventListener('click', () => this.handleAnalyse());

        // Start logging button (in no-data view)
        document.getElementById('start-logging-btn').addEventListener('click', () => {
            const activitiesDate = document.getElementById('activity-date').value;
            document.getElementById('dashboard-date').value = activitiesDate;
            document.getElementById('activity-name').focus();
        });

        // Edit modal
        document.getElementById('close-edit-modal').addEventListener('click', () => this.closeEditModal());
        document.querySelector('#edit-modal .modal-backdrop').addEventListener('click', () => this.closeEditModal());
        document.getElementById('edit-activity-form').addEventListener('submit', (e) => this.handleEditActivity(e));
        document.getElementById('delete-activity-btn').addEventListener('click', () => this.handleDeleteActivity());
    },

    /**
     * Open auth modal
     */
    openAuthModal(tab = 'login') {
        document.getElementById('auth-modal').classList.remove('hidden');
        this.switchAuthTab(tab);
        this.clearAuthError();
    },

    /**
     * Close auth modal
     */
    closeAuthModal() {
        document.getElementById('auth-modal').classList.add('hidden');
        this.clearAuthForms();
    },

    /**
     * Switch auth tab
     */
    switchAuthTab(tab) {
        // Update tabs
        document.querySelectorAll('.auth-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tab);
        });

        // Update forms
        document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
        document.getElementById('register-form').classList.toggle('hidden', tab !== 'register');

        // Update header
        const title = document.getElementById('auth-title');
        const subtitle = document.getElementById('auth-subtitle');
        
        if (tab === 'login') {
            title.textContent = 'Welcome Back';
            subtitle.textContent = 'Sign in to continue tracking your time';
        } else {
            title.textContent = 'Create Account';
            subtitle.textContent = 'Start your journey to better time management';
        }

        this.clearAuthError();
    },

    /**
     * Clear auth forms
     */
    clearAuthForms() {
        document.getElementById('login-form').reset();
        document.getElementById('register-form').reset();
        this.clearAuthError();
    },

    /**
     * Show auth error
     */
    showAuthError(message) {
        const errorEl = document.getElementById('auth-error');
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
    },

    /**
     * Clear auth error
     */
    clearAuthError() {
        const errorEl = document.getElementById('auth-error');
        errorEl.textContent = '';
        errorEl.classList.add('hidden');
    },

    /**
     * Handle login form submission
     */
    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Signing in...';

        const result = await Auth.signInWithEmail(email, password);
        
        btn.disabled = false;
        btn.textContent = 'Sign In';

        if (!result.success) {
            this.showAuthError(result.error);
        }
    },

    /**
     * Handle register form submission
     */
    async handleRegister(e) {
        e.preventDefault();
        
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;

        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Creating account...';

        const result = await Auth.registerWithEmail(email, password, name);
        
        btn.disabled = false;
        btn.textContent = 'Create Account';

        if (!result.success) {
            this.showAuthError(result.error);
        }
    },

    /**
     * Handle Google sign in
     */
    async handleGoogleSignIn() {
        const btn = document.getElementById('google-signin');
        btn.disabled = true;

        const result = await Auth.signInWithGoogle();
        
        btn.disabled = false;

        if (!result.success) {
            this.showAuthError(result.error);
        }
    },

    /**
     * Handle logout
     */
    async handleLogout() {
        await Auth.signOut();
        this.showToast('Successfully signed out', 'success');
    },

    /**
     * Handle add activity form submission
     */
    async handleAddActivity(e) {
        e.preventDefault();

        const name = document.getElementById('activity-name').value.trim();
        const category = document.getElementById('activity-category').value;
        const duration = parseInt(document.getElementById('activity-duration').value);

        if (!name || !category || !duration) {
            this.showToast('Please fill all fields', 'error');
            return;
        }

        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Adding...';

        const result = await Activities.addActivity(name, category, duration);

        btn.disabled = false;
        btn.textContent = 'Add Activity';

        if (result.success) {
            e.target.reset();
            this.showToast('Activity added successfully', 'success');
        } else {
            this.showToast(result.error, 'error');
        }
    },

    /**
     * Handle analyse button click
     */
    handleAnalyse() {
        const activityDate = document.getElementById('activity-date').value;
        document.getElementById('dashboard-date').value = activityDate;
        
        const date = new Date(activityDate);
        Dashboard.init(date);

        // Scroll to dashboard on mobile
        if (window.innerWidth < 1200) {
            document.querySelector('.dashboard-panel').scrollIntoView({ behavior: 'smooth' });
        }

        this.showToast('Dashboard updated', 'info');
    },

    /**
     * Open edit modal
     */
    openEditModal(activity) {
        document.getElementById('edit-modal').classList.remove('hidden');
        document.getElementById('edit-activity-id').value = activity.id;
        document.getElementById('edit-name').value = activity.name;
        document.getElementById('edit-category').value = activity.category;
        document.getElementById('edit-duration').value = activity.duration;
    },

    /**
     * Close edit modal
     */
    closeEditModal() {
        document.getElementById('edit-modal').classList.add('hidden');
    },

    /**
     * Handle edit activity form submission
     */
    async handleEditActivity(e) {
        e.preventDefault();

        const id = document.getElementById('edit-activity-id').value;
        const name = document.getElementById('edit-name').value.trim();
        const category = document.getElementById('edit-category').value;
        const duration = parseInt(document.getElementById('edit-duration').value);

        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Saving...';

        const result = await Activities.updateActivity(id, name, category, duration);

        btn.disabled = false;
        btn.textContent = '💾 Save Changes';

        if (result.success) {
            this.closeEditModal();
            this.showToast('Activity updated', 'success');
        } else {
            this.showToast(result.error, 'error');
        }
    },

    /**
     * Handle delete activity
     */
    async handleDeleteActivity() {
        const id = document.getElementById('edit-activity-id').value;

        if (!confirm('Are you sure you want to delete this activity?')) {
            return;
        }

        const result = await Activities.deleteActivity(id);

        if (result.success) {
            this.closeEditModal();
            this.showToast('Activity deleted', 'success');
        } else {
            this.showToast(result.error, 'error');
        }
    },

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${icons[type]}</span>
            <span class="toast-message">${message}</span>
        `;

        container.appendChild(toast);

        // Auto remove after 4 seconds
        setTimeout(() => {
            toast.classList.add('toast-exit');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());