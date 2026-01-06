// =============================================
// POCKETPAL - FRONTEND ONLY VERSION
// =============================================

// Application state - now using shared data manager
const state = {
    user: null,
    walletBalance: 0,
    budgets: {},
    expenses: [],
    splits: [],
    groups: [],
    notifications: [],
    spendingData: Array(12).fill(0)
};

// Use shared data manager for consistent data handling
const dataManager = window.PocketPalDataManager;
const STORAGE_KEYS = dataManager.STORAGE_KEYS;

// Wrapper functions for backward compatibility
function saveToStorage(key, data) {
    // Use the data manager's save methods based on key type
    switch(key) {
        case STORAGE_KEYS.USER:
            return dataManager.setUser(data);
        case STORAGE_KEYS.WALLET:
            return dataManager.setWalletBalance(data);
        case STORAGE_KEYS.BUDGETS:
            return dataManager.setBudgets(data);
        case STORAGE_KEYS.EXPENSES:
            return dataManager.setExpenses(data);
        case STORAGE_KEYS.NOTIFICATIONS:
            return dataManager.setNotifications(data);
        default:
            try {
                localStorage.setItem(key, JSON.stringify(data));
                return true;
            } catch (error) {
                console.error('Failed to save to localStorage:', error);
                if (typeof showToast === 'function') {
                    showToast('Failed to save data. Please check your storage space.', 'error');
                }
                return false;
            }
    }
}

function loadFromStorage(key, defaultValue = null) {
    // Use the data manager's load methods based on key type
    switch(key) {
        case STORAGE_KEYS.USER:
            return dataManager.getUser();
        case STORAGE_KEYS.WALLET:
            return dataManager.getWalletBalance();
        case STORAGE_KEYS.BUDGETS:
            return dataManager.getBudgets();
        case STORAGE_KEYS.EXPENSES:
            return dataManager.getExpenses();
        case STORAGE_KEYS.NOTIFICATIONS:
            return dataManager.getNotifications();
        default:
            try {
                const data = localStorage.getItem(key);
                return data ? JSON.parse(data) : defaultValue;
            } catch (error) {
                console.error('Failed to load from localStorage:', error);
                return defaultValue;
            }
    }
}

// Clear old sample data if it exists
function clearOldSampleData() {
    const wallet = loadFromStorage(STORAGE_KEYS.WALLET, 0);
    const expenses = loadFromStorage(STORAGE_KEYS.EXPENSES, []);
    const budgets = loadFromStorage(STORAGE_KEYS.BUDGETS, {});
    
    // Check if there's sample data (wallet = 2500, or sample budgets like food: 3000)
    const hasSampleData = (
        wallet === 2500 || 
        budgets.food === 3000 || 
        (expenses.length > 0 && expenses.some(e => e.description === 'Lunch at campus cafeteria'))
    );
    
    if (hasSampleData) {
        console.log('Clearing old sample data...');
        // Clear the sample data
        saveToStorage(STORAGE_KEYS.WALLET, 0);
        saveToStorage(STORAGE_KEYS.EXPENSES, []);
        saveToStorage(STORAGE_KEYS.BUDGETS, {
            food: 0,
            travel: 0,
            entertainment: 0,
            study: 0,
            other: 0
        });
        
        // Clear notifications and add welcome notification
        state.notifications = [];
        createNotification(
            'Welcome to PocketPal! Start by adding money to your wallet.',
            'info'
        );
        
        showToast('Sample data cleared. Starting with a clean wallet!', 'info');
    }
}

// Force reset all data and start fresh
function forceReset() {
    // Clear ALL localStorage data
    localStorage.clear();
    
    showToast('All data cleared! Starting with a clean slate.', 'success');
    
    // Remove reset parameter from URL
    const url = new URL(window.location);
    url.searchParams.delete('reset');
    window.history.replaceState({}, document.title, url);
    
    // Reload the page to start fresh
    setTimeout(() => {
        window.location.reload();
    }, 1500);
}

// Initialize basic user data if first time user (Clean Start)
function initializeSampleData() {
    const hasData = localStorage.getItem(STORAGE_KEYS.USER);
    if (!hasData) {
        // Just set basic user data - no sample transactions or budgets
        const basicUser = {
            username: 'PocketPal User',
            email: 'user@pocketpal.com',
            profilePicture: ''
        };
        saveToStorage(STORAGE_KEYS.USER, basicUser);
        
        // Initialize empty arrays/objects for clean start
        saveToStorage(STORAGE_KEYS.WALLET, 0);
        saveToStorage(STORAGE_KEYS.EXPENSES, []);
        saveToStorage(STORAGE_KEYS.BUDGETS, {
            food: 0,
            travel: 0,
            entertainment: 0,
            study: 0,
            other: 0
        });
        saveToStorage(STORAGE_KEYS.GROUPS, []);
        
        // Add a simple welcome notification
        createNotification(
            'Welcome to PocketPal! Start by adding money to your wallet.',
            'info'
        );
        
        showToast('Welcome to PocketPal! Your digital wallet is ready to use.', 'success');
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    // Check if we're on notifications page
    if (window.location.pathname.includes('notifications.html')) {
        return;
    }

    initializeMainApp();
});

function initializeMainApp() {
    setupDOMReferences();
    initializeAuth();
    setupEventListeners();
    setupDataListeners();

    // Check URL parameter for force reset
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('reset') === 'true') {
        forceReset();
        return;
    }

    // Initialize clean data for new users if needed
    // (Data manager handles clearing old sample data automatically)
    
    // Load user data from localStorage
    loadUserData();
    updateUI();
    
    // Manage welcome banner visibility
    manageWelcomeBanner();
}

function loadUserData() {
    try {
        // Load all data using the data manager
        state.user = dataManager.getUser();
        state.walletBalance = dataManager.getWalletBalance();
        state.expenses = dataManager.getExpenses();
        state.budgets = dataManager.getBudgets();
        state.notifications = dataManager.getNotifications();
        state.groups = loadFromStorage(STORAGE_KEYS.GROUPS, []); // Keep this for now

        // Calculate spending data
        calculateSpendingData();

        updateUI();
    } catch (error) {
        console.error('Failed to load user data:', error);
        showToast('Failed to load data from storage', 'warning');
    }
}

function calculateSpendingData() {
    const monthlyData = Array(12).fill(0);
    const currentDate = new Date();
    
    state.expenses.forEach(expense => {
        const expenseDate = new Date(expense.date);
        const month = expenseDate.getMonth();
        monthlyData[month] += expense.amount;
    });
    
    state.spendingData = monthlyData;
}

// =============================================
// CORE FUNCTIONALITY
// =============================================

function setupDOMReferences() {
    // Wallet elements
    state.dom = {
        walletBalance: document.getElementById('walletBalance'),
        addMoneyBtn: document.getElementById('addMoneyBtn'),
        addMoneyForm: document.getElementById('addMoneyForm'),
        addAmount: document.getElementById('addAmount'),

        // Expense elements
        expenseForm: document.getElementById('expenseForm'),
        expenseAmount: document.getElementById('expenseAmount'),
        expenseCategory: document.getElementById('expenseCategory'),
        expenseDescription: document.getElementById('expenseDescription'),
        expenseDate: document.getElementById('expenseDate'),
        expenseList: document.getElementById('expenseList'),

        // Budget elements
        budgetCategories: document.getElementById('budgetCategories'),
        setBudgetBtn: document.getElementById('setBudgetBtn'),
        budgetForm: document.getElementById('budgetForm'),

        // User elements
        userControls: document.querySelector('.user-controls'),
        userProfile: document.getElementById('userProfile'),
        loginBtn: document.getElementById('loginBtn'),
        logoutBtn: document.getElementById('logoutBtn'),
        profileBtn: document.getElementById('profileBtn'),

        // Notification elements
        notificationBell: document.getElementById('notificationBell'),
        notificationCounter: document.getElementById('notificationCounter'),

        // Insight elements
        insightsContainer: document.getElementById('insightsContainer'),

        // Auth forms
        loginForm: document.getElementById('loginForm'),
        registerForm: document.getElementById('registerForm'),
        showRegisterLink: document.getElementById('showRegister'),
        showLoginLink: document.getElementById('showLogin'),

        // Profile modal
        profileModal: document.getElementById('profileModal'),
        profileForm: document.getElementById('profileForm'),
        profileUsername: document.getElementById('profileUsername'),
        profileEmail: document.getElementById('profileEmail'),
        profilePassword: document.getElementById('profilePassword'),
        profilePictureFile: document.getElementById('profilePictureFile'),
        profilePreview: document.getElementById('profilePreview'),
        removeProfilePicBtn: document.getElementById('removeProfilePic'),
        cancelProfileBtn: document.getElementById('cancelProfileBtn')
    };
}

function initializeAuth() {
    // Set today's date as default for expense form (Sep 10, 2025)
    const today = new Date(2025, 8, 10).toISOString().split('T')[0]; // September 10, 2025
    if (state.dom.expenseDate) state.dom.expenseDate.value = today;
}

// =============================================
// AUTHENTICATION FUNCTIONS (REMOVED - NO LOGIN REQUIRED)
// =============================================

// Authentication is no longer needed in this frontend-only version
// Users can directly use the app without logging in

function logout() {
    // Use data manager to clear all data
    dataManager.clearAllData();
    localStorage.removeItem('pocketpal_returning_user');

    // Reset local state
    state.user = dataManager.getUser();
    state.walletBalance = dataManager.getWalletBalance();
    state.budgets = dataManager.getBudgets();
    state.expenses = dataManager.getExpenses();
    state.notifications = dataManager.getNotifications();
    state.splits = [];
    state.groups = [];
    state.spendingData = Array(12).fill(0);

    showToast('All data cleared! Starting fresh.', 'info');
    
    // Update UI
    updateUI();
    
    // Show welcome banner again
    const welcomeBanner = document.getElementById('welcomeBanner');
    if (welcomeBanner) {
        welcomeBanner.style.display = 'block';
        welcomeBanner.style.opacity = '1';
    }
}

// =============================================
// WALLET AND EXPENSE FUNCTIONS
// =============================================

function handleAddMoney(e) {
    e.preventDefault();
    const amount = parseFloat(state.dom.addAmount.value);

    if (!amount || amount <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
    }

    try {
        // Use data manager to add money
        if (dataManager.addMoney(amount)) {
            // Update local state
            state.walletBalance = dataManager.getWalletBalance();
            
            // Add notification using data manager
            dataManager.addNotification(
                `Added ₹${amount.toFixed(2)} to your wallet. New balance: ₹${state.walletBalance.toFixed(2)}`,
                'success'
            );

            // Reset form and close modal
            state.dom.addAmount.value = '';
            document.getElementById('addMoneyModal').style.display = 'none';

            showToast(`Added ₹${amount.toFixed(2)} to your wallet`, 'success');
            updateUI();
        } else {
            throw new Error('Failed to save wallet balance');
        }
    } catch (error) {
        console.error('Failed to add money:', error);
        showToast('Failed to add money', 'error');
    }
}

function handleAddExpense(e) {
    e.preventDefault();
    const amount = parseFloat(state.dom.expenseAmount.value);
    const category = state.dom.expenseCategory.value;
    const description = state.dom.expenseDescription.value || 'No description';
    const date = state.dom.expenseDate.value;

    if (!amount || amount <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
    }

    if (!category) {
        showToast('Please select a category', 'error');
        return;
    }

    // Check if user has enough balance using data manager
    const currentBalance = dataManager.getWalletBalance();
    if (currentBalance < amount) {
        showToast('Insufficient balance! Please add money to your wallet first.', 'error');
        return;
    }

    try {
        // Subtract money from wallet using data manager
        if (dataManager.subtractMoney(amount)) {
            // Add expense using data manager
            const newExpense = dataManager.addExpense({
                amount: amount,
                category: category,
                description: description,
                date: date
            });
            
            if (newExpense) {
                // Update local state
                state.walletBalance = dataManager.getWalletBalance();
                state.expenses = dataManager.getExpenses();
                
                // Add notification using data manager
                dataManager.addNotification(
                    `Expense added: ${description} (-₹${amount.toFixed(2)}). Remaining balance: ₹${state.walletBalance.toFixed(2)}`,
                    'info'
                );

                // Check budget warnings
                checkBudgetWarnings(category, amount);

                // Reset form
                state.dom.expenseForm.reset();
                state.dom.expenseDate.value = new Date(2025, 8, 10).toISOString().split('T')[0]; // September 10, 2025

                showToast(`Added expense: ${description} (₹${amount.toFixed(2)})`, 'success');
                
                // Update spending data and UI
                calculateSpendingData();
                updateUI();
            } else {
                throw new Error('Failed to add expense');
            }
        } else {
            throw new Error('Failed to update wallet balance');
        }
    } catch (error) {
        console.error('Failed to add expense:', error);
        showToast('Failed to add expense', 'error');
    }
}

// Manage welcome banner visibility
function manageWelcomeBanner() {
    const isReturningUser = localStorage.getItem('pocketpal_returning_user');
    const welcomeBanner = document.getElementById('welcomeBanner');
    
    if (isReturningUser && welcomeBanner) {
        // Hide banner for returning users but add a subtle fade effect
        setTimeout(() => {
            welcomeBanner.style.opacity = '0';
            welcomeBanner.style.transition = 'opacity 0.5s ease';
            setTimeout(() => {
                welcomeBanner.style.display = 'none';
            }, 500);
        }, 2000); // Show for 2 seconds then fade out
    } else if (!isReturningUser && welcomeBanner) {
        // Mark as returning user after 10 seconds
        setTimeout(() => {
            localStorage.setItem('pocketpal_returning_user', 'true');
        }, 10000);
    }
}

// Helper function to check budget warnings
function checkBudgetWarnings(category, amount) {
    if (!state.budgets[category] || state.budgets[category] <= 0) {
        return; // No budget set for this category
    }
    
    // Calculate total spent in this category
    const totalSpent = state.expenses
        .filter(expense => expense.category === category)
        .reduce((sum, expense) => sum + expense.amount, 0);
    
    const budget = state.budgets[category];
    const percentage = (totalSpent / budget) * 100;
    
    let warningMessage = null;
    let warningType = 'warning';
    
    if (percentage >= 100) {
        warningMessage = `Budget exceeded! You've spent ₹${totalSpent.toFixed(2)} of your ₹${budget.toFixed(2)} ${getCategoryName(category)} budget.`;
        warningType = 'error';
    } else if (percentage >= 80) {
        warningMessage = `Budget warning! You've used ${percentage.toFixed(0)}% of your ${getCategoryName(category)} budget.`;
        warningType = 'warning';
    }
    
    if (warningMessage) {
        // Create notification using data manager
        dataManager.addNotification(warningMessage, warningType);
        
        showToast(warningMessage, warningType);
    }
}

// =============================================
// BUDGET FUNCTIONS
// =============================================

function handleSetBudget(e) {
    e.preventDefault();

    const budgets = {
        food: parseFloat(document.getElementById('foodBudget').value) || 0,
        travel: parseFloat(document.getElementById('travelBudget').value) || 0,
        entertainment: parseFloat(document.getElementById('entertainmentBudget').value) || 0,
        study: parseFloat(document.getElementById('studyBudget').value) || 0,
        other: parseFloat(document.getElementById('otherBudget').value) || 0
    };

    try {
        // Update budgets in state and localStorage
        state.budgets = budgets;
        saveToStorage(STORAGE_KEYS.BUDGETS, budgets);
        
        // Add notification using new function
        const totalBudget = Object.values(budgets).reduce((sum, budget) => sum + budget, 0);
        if (totalBudget > 0) {
            createNotification(
                `Monthly budgets updated! Total budget: ₹${totalBudget.toFixed(2)}`,
                'success'
            );
        }

        document.getElementById('budgetModal').style.display = 'none';

        showToast('Monthly budgets updated successfully', 'success');
        updateUI();
    } catch (error) {
        console.error('Failed to update budgets:', error);
        showToast('Failed to update budgets', 'error');
    }
}

function updateBudgetDisplay() {
    if (!state.dom.budgetCategories) return;

    // Calculate spending per category
    const spent = Object.fromEntries(
        Object.keys(state.budgets).map(cat => [cat, 0])
    );

    state.expenses.forEach(expense => {
        if (spent.hasOwnProperty(expense.category)) {
            spent[expense.category] += expense.amount;
        }
    });

    // Generate budget cards
    const activeBudgets = Object.entries(state.budgets).filter(([_, budget]) => budget > 0);

    if (activeBudgets.length === 0) {
        state.dom.budgetCategories.innerHTML = `
            <div class="category-card">
                <div class="category-header">
                    <span class="category-name">Set your budgets</span>
                </div>
                <p style="text-align: center; color: var(--gray-color);">No budgets set yet</p>
            </div>
        `;
        return;
    }

    state.dom.budgetCategories.innerHTML = activeBudgets
        .map(([category, budget]) => {
            const amountSpent = spent[category] || 0;
            const percentage = Math.min(100, (amountSpent / budget) * 100);

            let progressClass = '';
            if (percentage > 90) progressClass = 'danger';
            else if (percentage > 70) progressClass = 'warning';

            return `
                <div class="category-card ${category}">
                    <div class="category-header">
                        <span class="category-name">${getCategoryName(category)}</span>
                        <span class="category-amount">₹${amountSpent.toFixed(2)}/₹${budget.toFixed(2)}</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill ${progressClass}" style="width: ${percentage}%"></div>
                    </div>
                    <small>${percentage.toFixed(0)}% spent</small>
                </div>
            `;
        })
        .join('');
}

// =============================================
// NOTIFICATION SYSTEM
// =============================================

function setupNotificationNavigation() {
    if (state.dom.notificationBell) {
        state.dom.notificationBell.addEventListener('click', function (e) {
            e.preventDefault();
            // Save current page state
            localStorage.setItem('pocketpal_previous_page', window.location.pathname);
            // Navigate to notifications page
            window.location.href = 'notifications.html';
        });
    }
}

function updateNotificationCounter() {
    // Try to find the notification counter (it might be recreated)
    const notificationCounter = document.getElementById('notificationCounter');
    if (notificationCounter && state.notifications) {
        const unreadCount = state.notifications.filter(n => !n.read).length;
        notificationCounter.textContent = unreadCount;
        notificationCounter.style.display = unreadCount > 0 ? 'flex' : 'none';
        
        // Debug info
        console.log(`Notifications: ${state.notifications.length}, Unread: ${unreadCount}`);
        
        // Update the bell color to show activity
        const notificationBell = document.getElementById('notificationBell');
        if (notificationBell) {
            if (unreadCount > 0) {
                notificationBell.style.color = '#dc3545'; // Red when there are notifications
            } else {
                notificationBell.style.color = ''; // Default color when no notifications
            }
        }
    } else {
        console.log('Notification counter element not found or no notifications');
    }
}

// =============================================
// ENHANCED NOTIFICATION FUNCTIONS
// =============================================

// Create a new notification
function createNotification(message, type = 'info', autoRead = false) {
    const notification = {
        id: Date.now(),
        message: message,
        type: type, // 'success', 'info', 'warning', 'error'
        read: autoRead,
        date: new Date().toISOString()
    };
    
    // Add to state
    state.notifications.unshift(notification);
    
    // Save to localStorage
    saveToStorage(STORAGE_KEYS.NOTIFICATIONS, state.notifications);
    
    // Update UI
    updateNotificationCounter();
    
    return notification;
}

// Mark notification as read
function markNotificationAsRead(notificationId) {
    const notification = state.notifications.find(n => n.id === notificationId);
    if (notification) {
        notification.read = true;
        saveToStorage(STORAGE_KEYS.NOTIFICATIONS, state.notifications);
        updateNotificationCounter();
    }
}

// Mark all notifications as read
function markAllNotificationsAsRead() {
    state.notifications.forEach(notification => {
        notification.read = true;
    });
    saveToStorage(STORAGE_KEYS.NOTIFICATIONS, state.notifications);
    updateNotificationCounter();
}

// Delete a notification
function deleteNotification(notificationId) {
    const index = state.notifications.findIndex(n => n.id === notificationId);
    if (index > -1) {
        state.notifications.splice(index, 1);
        saveToStorage(STORAGE_KEYS.NOTIFICATIONS, state.notifications);
        updateNotificationCounter();
    }
}

// Clear all notifications
function clearAllNotifications() {
    state.notifications = [];
    saveToStorage(STORAGE_KEYS.NOTIFICATIONS, state.notifications);
    updateNotificationCounter();
}

// Get unread notifications
function getUnreadNotifications() {
    return state.notifications.filter(n => !n.read);
}

// Test function to add a notification (for debugging)
function addTestNotification() {
    createNotification(
        'Test notification - ' + new Date().toLocaleTimeString(),
        'info'
    );
    showToast('Test notification added!', 'info');
}

// Make test function available globally for debugging
window.addTestNotification = addTestNotification;
window.clearAllNotifications = clearAllNotifications;
window.markAllNotificationsAsRead = markAllNotificationsAsRead;

// Debug function for button issues
window.debugButtons = function() {
    console.log('=== Button Debug Info ===');
    const buttons = document.querySelectorAll('button, .btn, [role="button"]');
    buttons.forEach((btn, index) => {
        const rect = btn.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(btn);
        console.log(`Button ${index + 1}:`, {
            element: btn,
            text: btn.textContent?.trim(),
            classes: btn.className,
            pointerEvents: computedStyle.pointerEvents,
            zIndex: computedStyle.zIndex,
            display: computedStyle.display,
            visibility: computedStyle.visibility,
            disabled: btn.disabled,
            rect: { width: rect.width, height: rect.height, top: rect.top, left: rect.left }
        });
    });
};

// =============================================
// UI UPDATE FUNCTIONS
// =============================================

function updateUI() {
    updateUserProfile();
    updateWalletBalance();
    updateBudgetDisplay();
    updateExpenseList();
    updateInsights();
    updateNotificationCounter();
    renderUserControls();
}

function updateUserProfile() {
    if (state.dom.userProfile) {
        const displayName = state.user ? state.user.username : 'Guest';
        const avatarImg = document.getElementById('avatarImg');
        if (avatarImg) {
            if (state.user && state.user.profilePicture) {
                avatarImg.src = state.user.profilePicture;
                avatarImg.style.display = 'inline-block';
            } else {
                avatarImg.style.display = 'none';
            }
        }
        const nameSpan = state.dom.userProfile.querySelector('span');
        if (nameSpan) nameSpan.innerHTML = `<i class="fas fa-user-circle"></i> ${displayName}`;
    }
}

// =============================================
// COMBINED USER MENU (Avatar + Name + Dropdown)
// =============================================

function ensureUserMenuStyles() {
    if (document.getElementById('user-menu-styles')) return;
    const style = document.createElement('style');
    style.id = 'user-menu-styles';
    style.textContent = `
        .user-menu { position: relative; }
        .user-menu-toggle { display:flex; align-items:center; gap:8px; padding:8px 12px; border-radius:12px; background:#f3f5f9; cursor:pointer; border:none; }
        .user-menu-toggle img { width:28px; height:28px; border-radius:50%; object-fit:cover; }
        .user-menu-dropdown { position:absolute; top:110%; right:0; background:#fff; border:1px solid #e6e8ee; border-radius:10px; min-width:200px; box-shadow:0 6px 24px rgba(0,0,0,0.08); display:none; z-index:1000; }
        .user-menu.open .user-menu-dropdown { display:block; }
        .user-menu-item { display:flex; align-items:center; gap:10px; padding:10px 12px; cursor:pointer; text-decoration:none; color:#222; }
        .user-menu-item:hover { background:#f7f9fc; }
        .user-menu-badge { background:#e02424; color:#fff; font-size:11px; padding:0 6px; border-radius:10px; margin-left:6px; }
    `;
    document.head.appendChild(style);
}

function renderUserControls() {
    if (!state.dom.userControls) return;
    ensureUserMenuStyles();

    const isLoggedIn = true; // Always true for demo mode
    const displayName = state.user?.username || 'Demo User';
    const avatar = state.user?.profilePicture || '';
    const unread = (state.notifications || []).filter(n => !n.read).length;

    // Always show user menu for demo mode (no login required)

    // Calculate unread notifications count
    const unreadCount = (state.notifications || []).filter(n => !n.read).length;
    
    // Restore notification bell at its original place (outside dropdown)
    state.dom.userControls.innerHTML = `
        <a href="notifications.html" class="notification-bell" id="notificationBell">
            <i class="fas fa-bell"></i>
            <span class="notification-count" id="notificationCounter" style="display: ${unreadCount > 0 ? 'flex' : 'none'}">${unreadCount}</span>
        </a>
        <div class="user-menu" id="userMenu">
            <button class="user-menu-toggle" id="userMenuToggle" aria-haspopup="true" aria-expanded="false">
                ${avatar ? `<img src="${avatar}" alt="Avatar">` : `<i class="fas fa-user-circle" style="font-size:22px;color:#596579;"></i>`}
                <span style="font-weight:600;">${escapeHTML(displayName)}</span>
            </button>
            <div class="user-menu-dropdown" role="menu">
                <a class="user-menu-item" id="menuProfile"><i class="fas fa-user-edit"></i> Profile</a>
                <a class="user-menu-item" id="menuClearData"><i class="fas fa-trash-alt"></i> Clear All Data</a>
                <a class="user-menu-item" id="menuLogout"><i class="fas fa-sign-out-alt"></i> Reset App</a>
            </div>
        </div>
    `;

    const toggle = document.getElementById('userMenuToggle');
    const menu = document.getElementById('userMenu');
    toggle?.addEventListener('click', (e) => {
        e.stopPropagation();
        menu?.classList.toggle('open');
    });
    document.addEventListener('click', () => menu?.classList.remove('open'));

    document.getElementById('menuProfile')?.addEventListener('click', () => {
        // Open existing profile modal
        if (state.dom.profileBtn) state.dom.profileBtn.click(); else {
            // Fallback populate and open
            if (state.dom.profileUsername) state.dom.profileUsername.value = state.user?.username || '';
            if (state.dom.profileEmail) state.dom.profileEmail.value = state.user?.email || '';
            if (state.dom.profilePassword) state.dom.profilePassword.value = '';
            if (state.dom.profilePictureFile) state.dom.profilePictureFile.value = '';
            if (state.dom.profilePreview) state.dom.profilePreview.src = state.user?.profilePicture || '';
            document.getElementById('profileModal').style.display = 'flex';
        }
    });
    
    document.getElementById('menuClearData')?.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
            logout();
        }
    });
    
    document.getElementById('menuLogout')?.addEventListener('click', logout);

    // Reconnect notification events and counter after re-render
    setupDOMReferences();
    setupNotificationNavigation();
    
    // Update notification counter with a small delay to ensure DOM is ready
    setTimeout(() => {
        updateNotificationCounter();
    }, 100);
}

function updateWalletBalance() {
    if (state.dom.walletBalance) {
        state.dom.walletBalance.textContent = `₹${state.walletBalance.toFixed(2)}`;
        state.dom.walletBalance.className = `balance-display ${state.walletBalance < 0 ? 'negative' : 'positive'}`;
    }
}

function updateExpenseList() {
    if (!state.dom.expenseList) return;

    if (state.expenses.length === 0) {
        state.dom.expenseList.innerHTML = '<li style="text-align: center; color: var(--gray-color); padding: 1rem;">No expenses yet</li>';
        return;
    }

    state.dom.expenseList.innerHTML = [...state.expenses]
        .slice(0, 5) // Show only recent 5 expenses
        .map(expense => {
            const date = new Date(expense.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });

            return `
                <li class="expense-item">
                    <div class="expense-details">
                        <div>${expense.description || 'No description'}</div>
                        <span class="expense-category ${expense.category}">${getCategoryName(expense.category)}</span>
                        <div class="expense-date">${date}</div>
                    </div>
                    <div class="expense-amount">-₹${expense.amount.toFixed(2)}</div>
                </li>
            `;
        })
        .join('');
}

function updateInsights() {
    if (!state.dom.insightsContainer) return;

    // Calculate spending per category
    const spent = Object.fromEntries(
        Object.keys(state.budgets).map(cat => [cat, 0])
    );
    state.expenses.forEach(expense => {
        if (spent.hasOwnProperty(expense.category)) {
            spent[expense.category] += expense.amount;
        }
    });

    // Generate insights
    const insights = [];

    // Food insight
    if (state.budgets.food > 0) {
        const percentage = (spent.food / state.budgets.food) * 100;
        const remaining = state.budgets.food - spent.food;

        let message;
        if (percentage > 80) message = `You've spent ${percentage.toFixed(0)}% of your food budget. Try cooking at home more.`;
        else if (percentage > 50) message = `You've spent ${percentage.toFixed(0)}% of your food budget. Watch your spending.`;
        else message = `You've only spent ${percentage.toFixed(0)}% of your food budget. Great job!`;

        insights.push(`
            <div class="insight-card food-insight">
                <h4><i class="fas fa-utensils"></i> Food Spending</h4>
                <p>${message}</p>
                <small>₹${remaining.toFixed(2)} remaining</small>
            </div>
        `);
    }

    // Study insight
    if (state.budgets.study > 0) {
        const percentage = (spent.study / state.budgets.study) * 100;
        const remaining = state.budgets.study - spent.study;

        let message;
        if (percentage < 30) message = `You have ${(100 - percentage).toFixed(0)}% remaining. Consider investing in resources.`;
        else if (percentage < 70) message = `You've spent ${percentage.toFixed(0)}% of your study budget. Good balance.`;
        else message = `You've spent ${percentage.toFixed(0)}% of your study budget. Ensure value from purchases.`;

        insights.push(`
            <div class="insight-card study-insight">
                <h4><i class="fas fa-book"></i> Study Budget</h4>
                <p>${message}</p>
                <small>₹${remaining.toFixed(2)} remaining</small>
            </div>
        `);
    }

    // Savings tip
    if (state.expenses.length > 0) {
        const totalSpent = Object.values(spent).reduce((a, b) => a + b, 0);
        const avgDaily = totalSpent / Math.max(1, new Date().getDate());
        const potential = (avgDaily * 30 * 0.15).toFixed(2);

        insights.push(`
            <div class="insight-card savings-insight">
                <h4><i class="fas fa-piggy-bank"></i> Savings Tip</h4>
                <p>You could save ₹${potential} this month by reducing expenses by 15%.</p>
            </div>
        `);
    }

    if (insights.length === 0) {
        // Show different messages based on user progress
        if (state.walletBalance === 0) {
            insights.push(`
                <div class="insight-card">
                    <h4><i class="fas fa-rocket"></i> Ready to Start!</h4>
                    <p><strong>Step 1:</strong> Add money to your wallet using the "Add Money" button above</p>
                    <p><strong>Step 2:</strong> Set monthly budgets for different spending categories</p>
                    <p><strong>Step 3:</strong> Start tracking your expenses to get smart insights!</p>
                    <div style="margin-top: 1rem; padding: 0.75rem; background: #f8f9fa; border-radius: 8px; font-size: 0.9rem; color: #6c757d;">
                        💡 <strong>Pro tip:</strong> PocketPal works best when you track all your expenses!
                    </div>
                </div>
            `);
        } else {
            insights.push(`
                <div class="insight-card">
                    <h4><i class="fas fa-chart-line"></i> Start Tracking!</h4>
                    <p>Great! You have ₹${state.walletBalance.toFixed(2)} in your wallet.</p>
                    <p>Now set your monthly budgets and start adding expenses to get personalized insights.</p>
                </div>
            `);
        }
    }

    state.dom.insightsContainer.innerHTML = insights.join('');
}

function getCategoryName(category) {
    const names = {
        food: 'Food & Dining',
        travel: 'Travel & Transport',
        entertainment: 'Entertainment',
        study: 'Study Materials',
        other: 'Other'
    };
    return names[category] || category;
}

// =============================================
// REAL-TIME DATA UPDATE LISTENERS
// =============================================

function setupDataListeners() {
    // Listen for wallet balance changes
    dataManager.addEventListener('wallet', function(newBalance) {
        console.log('Wallet balance updated:', newBalance);
        state.walletBalance = newBalance;
        updateWalletBalance();
    });
    
    // Listen for expense changes
    dataManager.addEventListener('expenses', function(newExpenses) {
        console.log('Expenses updated:', newExpenses.length, 'expenses');
        state.expenses = newExpenses;
        updateExpenseList();
        calculateSpendingData();
        updateInsights();
    });
    
    // Listen for transaction changes
    dataManager.addEventListener('transactions', function(newTransactions) {
        console.log('Transactions updated:', newTransactions.length, 'transactions');
        // Transactions include both income and expenses
        // Update UI elements that might depend on transaction history
    });
    
    // Listen for budget changes
    dataManager.addEventListener('budgets', function(newBudgets) {
        console.log('Budgets updated:', newBudgets);
        state.budgets = newBudgets;
        updateBudgetDisplay();
        updateInsights();
    });
    
    // Listen for notification changes
    dataManager.addEventListener('notifications', function(newNotifications) {
        console.log('Notifications updated:', newNotifications.length, 'notifications');
        state.notifications = newNotifications;
        updateNotificationCounter();
    });
    
    // Listen for user changes
    dataManager.addEventListener('user', function(newUser) {
        console.log('User updated:', newUser.username);
        state.user = newUser;
        updateUserProfile();
    });
}

// =============================================
// EVENT HANDLERS AND SETUP
// =============================================

function setupEventListeners() {
    // No auth events needed - frontend only version

    // Profile open/close
    if (state.dom.profileBtn) {
        state.dom.profileBtn.addEventListener('click', () => {
            if (state.dom.profileUsername) state.dom.profileUsername.value = state.user?.username || '';
            if (state.dom.profileEmail) state.dom.profileEmail.value = state.user?.email || '';
            if (state.dom.profilePassword) state.dom.profilePassword.value = '';
            if (state.dom.profilePictureFile) state.dom.profilePictureFile.value = '';
            if (state.dom.profilePreview) state.dom.profilePreview.src = state.user?.profilePicture || '';
            document.getElementById('profileModal').style.display = 'flex';
        });
    }

    if (state.dom.cancelProfileBtn) {
        state.dom.cancelProfileBtn.addEventListener('click', () => {
            document.getElementById('profileModal').style.display = 'none';
        });
    }

    if (state.dom.profileForm) {
        state.dom.profileForm.addEventListener('submit', handleProfileSave);
    }

    // Live preview for picture
    if (state.dom.profilePictureFile) {
        state.dom.profilePictureFile.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (file && state.dom.profilePreview) {
                const url = URL.createObjectURL(file);
                state.dom.profilePreview.src = url;
            }
        });
    }

    // Remove profile picture
    if (state.dom.removeProfilePicBtn) {
        state.dom.removeProfilePicBtn.addEventListener('click', () => {
            try {
                state.user.profilePicture = '';
                saveToStorage(STORAGE_KEYS.USER, state.user);
                if (state.dom.profilePreview) state.dom.profilePreview.src = '';
                updateUI();
                showToast('Profile picture removed', 'info');
            } catch (error) {
                showToast('Failed to remove profile picture', 'error');
            }
        });
    }

    // Authentication removed - frontend only version

    // Wallet events
    if (state.dom.addMoneyBtn) {
        state.dom.addMoneyBtn.addEventListener('click', () => {
            document.getElementById('addMoneyModal').style.display = 'flex';
        });
    }

    if (state.dom.addMoneyForm) {
        state.dom.addMoneyForm.addEventListener('submit', handleAddMoney);
    }

    // Expense events
    if (state.dom.expenseForm) {
        state.dom.expenseForm.addEventListener('submit', handleAddExpense);
    }

    // Budget events
    if (state.dom.setBudgetBtn) {
        state.dom.setBudgetBtn.addEventListener('click', () => {

            // Populate form with current budgets
            Object.entries(state.budgets).forEach(([category, amount]) => {
                const el = document.getElementById(`${category}Budget`);
                if (el) el.value = amount || '';
            });
            document.getElementById('budgetModal').style.display = 'flex';
        });
    }

    if (state.dom.budgetForm) {
        state.dom.budgetForm.addEventListener('submit', handleSetBudget);
    }

    // Notification events
    setupNotificationNavigation();

    // Modal close buttons
    document.querySelectorAll('.modal .btn-secondary').forEach(btn => {
        btn.addEventListener('click', function () {
            this.closest('.modal').style.display = 'none';
        });
    });

    // Close modals when clicking outside
    document.addEventListener('click', function (e) {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
    
    // Quick amount buttons
    document.querySelectorAll('.quick-amount-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const amount = this.getAttribute('data-amount');
            const addAmountInput = document.getElementById('addAmount');
            if (addAmountInput) {
                addAmountInput.value = amount;
                // Add visual feedback
                this.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    this.style.transform = 'scale(1)';
                }, 100);
            }
        });
    });
    
    // Welcome banner close button
    const welcomeCloseBtn = document.querySelector('.welcome-close-btn');
    if (welcomeCloseBtn) {
        welcomeCloseBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const welcomeBanner = this.closest('.welcome-banner');
            if (welcomeBanner) {
                welcomeBanner.style.opacity = '0';
                welcomeBanner.style.transition = 'opacity 0.3s ease';
                setTimeout(() => {
                    welcomeBanner.style.display = 'none';
                }, 300);
            }
        });
    }
}
// =============================================
// PROFILE FUNCTIONS
// =============================================

function handleProfileSave(e) {
    e.preventDefault();

    const username = state.dom.profileUsername?.value?.trim();
    const email = state.dom.profileEmail?.value?.trim();

    if (!username || !email) {
        showToast('Please fill in username and email', 'error');
        return;
    }

    try {
        // Update user profile
        state.user.username = username;
        state.user.email = email;
        
        // Handle profile picture if selected
        const fileInput = state.dom.profilePictureFile;
        if (fileInput && fileInput.files && fileInput.files[0]) {
            const file = fileInput.files[0];
            const reader = new FileReader();
            reader.onload = function(e) {
                state.user.profilePicture = e.target.result;
                saveToStorage(STORAGE_KEYS.USER, state.user);
                updateUI();
            };
            reader.readAsDataURL(file);
        } else {
            saveToStorage(STORAGE_KEYS.USER, state.user);
        }

        document.getElementById('profileModal').style.display = 'none';
        showToast('Profile updated successfully', 'success');
        updateUI();
    } catch (error) {
        console.error('Profile update failed:', error);
        showToast('Failed to update profile', 'error');
    }
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

function showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-message">${escapeHTML(message)}</div>
        <button class="toast-close" aria-label="Close">&times;</button>
    `;

    // Add styles if not already present
    if (!document.querySelector('#toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            .toast {
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                color: #333;
                padding: 12px 16px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10000;
                min-width: 300px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                animation: slideIn 0.3s ease;
                border-left: 4px solid #007bff;
            }
            .toast-success { border-left-color: #28a745; background: #d4edda; color: #155724; }
            .toast-error { border-left-color: #dc3545; background: #f8d7da; color: #721c24; }
            .toast-warning { border-left-color: #ffc107; background: #fff3cd; color: #856404; }
            .toast-info { border-left-color: #17a2b8; background: #d1ecf1; color: #0c5460; }
            .toast.fade-out { animation: slideOut 0.3s ease; }
            .toast-close {
                background: none;
                border: none;
                font-size: 18px;
                cursor: pointer;
                margin-left: 12px;
                opacity: 0.7;
            }
            .toast-close:hover { opacity: 1; }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(toast);

    const close = () => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    };

    toast.querySelector('.toast-close').addEventListener('click', close);
    setTimeout(close, 5000);
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Listen for updates from notifications page
window.addEventListener('message', function (e) {
    if (e.data.type === 'UPDATE_NOTIFICATIONS') {
        // Reload notifications when notified by notifications page
        loadUserData();
    }
});