// =============================================
// POCKETPAL - SHARED DATA MANAGER
// =============================================

// Centralized data management system for PocketPal
// This ensures all pages use the same data consistently

const PocketPalDataManager = (function() {
    'use strict';
    
    // Storage keys - centralized definition
    const STORAGE_KEYS = {
        USER: 'pocketpal_user',
        WALLET: 'pocketpal_wallet',
        BUDGETS: 'pocketpal_budgets', 
        EXPENSES: 'pocketpal_expenses',
        TRANSACTIONS: 'pocketpal_transactions',
        GROUPS: 'pocketpal_groups',
        NOTIFICATIONS: 'pocketpal_notifications',
        RETURNING_USER: 'pocketpal_returning_user'
    };
    
    // Default data structures
    const DEFAULT_DATA = {
        user: {
            username: 'PocketPal User',
            email: 'user@pocketpal.com',
            profilePicture: ''
        },
        wallet: 0,
        budgets: {
            food: 0,
            travel: 0,
            entertainment: 0,
            study: 0,
            other: 0
        },
        expenses: [],
        transactions: [],
        groups: [],
        notifications: []
    };
    
    // Event listeners for data changes
    const listeners = {
        wallet: [],
        expenses: [],
        transactions: [],
        budgets: [],
        notifications: [],
        user: []
    };
    
    // =============================================
    // CORE DATA FUNCTIONS
    // =============================================
    
    // Safe localStorage operations
    function saveToStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
            return false;
        }
    }
    
    function loadFromStorage(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error('Failed to load from localStorage:', error);
            return defaultValue;
        }
    }
    
    // Clear old sample data if detected
    function clearOldSampleData() {
        try {
            const wallet = loadFromStorage(STORAGE_KEYS.WALLET, 0);
            const expenses = loadFromStorage(STORAGE_KEYS.EXPENSES, []);
            const transactions = loadFromStorage(STORAGE_KEYS.TRANSACTIONS, []);
            
            // Check for sample data indicators
            const hasSampleExpenses = expenses.some(e => 
                e.description && (
                    e.description.includes('campus cafeteria') ||
                    e.description.includes('Coffee at Starbucks') ||
                    e.description.includes('Bus fare to college')
                )
            );
            
            const hasSampleTransactions = transactions.some(t => 
                t.description && (
                    t.description.includes('Coffee at Starbucks') ||
                    t.description.includes('Bus fare to college')
                )
            );
            
            if (hasSampleExpenses || hasSampleTransactions || wallet === 2500) {
                console.log('Clearing old sample data...');
                
                // Clear all sample data
                saveToStorage(STORAGE_KEYS.WALLET, 0);
                saveToStorage(STORAGE_KEYS.EXPENSES, []);
                saveToStorage(STORAGE_KEYS.TRANSACTIONS, []);
                saveToStorage(STORAGE_KEYS.BUDGETS, DEFAULT_DATA.budgets);
                saveToStorage(STORAGE_KEYS.NOTIFICATIONS, []);
                
                console.log('Sample data cleared successfully');
            }
        } catch (error) {
            console.error('Error clearing sample data:', error);
        }
    }
    
    // Initialize data if not present with validation
    function initializeData() {
        try {
            // First clear any old sample data
            clearOldSampleData();
            // Validate and initialize user data
            const userData = loadFromStorage(STORAGE_KEYS.USER);
            if (!userData || typeof userData !== 'object' || !userData.username) {
                console.log('Initializing user data');
                saveToStorage(STORAGE_KEYS.USER, DEFAULT_DATA.user);
            }
            
            // Validate and initialize wallet
            const wallet = loadFromStorage(STORAGE_KEYS.WALLET);
            if (wallet === null || typeof wallet !== 'number' || isNaN(wallet)) {
                console.log('Initializing wallet balance');
                saveToStorage(STORAGE_KEYS.WALLET, DEFAULT_DATA.wallet);
            }
            
            // Validate and initialize budgets
            const budgets = loadFromStorage(STORAGE_KEYS.BUDGETS);
            if (!budgets || typeof budgets !== 'object' || Array.isArray(budgets)) {
                console.log('Initializing budgets');
                saveToStorage(STORAGE_KEYS.BUDGETS, DEFAULT_DATA.budgets);
            } else {
                // Ensure all required budget categories exist
                const mergedBudgets = { ...DEFAULT_DATA.budgets, ...budgets };
                saveToStorage(STORAGE_KEYS.BUDGETS, mergedBudgets);
            }
            
            // Validate and initialize expenses
            const expenses = loadFromStorage(STORAGE_KEYS.EXPENSES);
            if (!Array.isArray(expenses)) {
                console.log('Initializing expenses array');
                saveToStorage(STORAGE_KEYS.EXPENSES, DEFAULT_DATA.expenses);
            } else {
                // Validate expense structure and clean invalid entries
                const validExpenses = expenses.filter(expense => {
                    return expense && 
                           typeof expense === 'object' && 
                           typeof expense.amount === 'number' && 
                           expense.id && 
                           expense.category && 
                           expense.date;
                });
                
                if (validExpenses.length !== expenses.length) {
                    console.log('Cleaned', expenses.length - validExpenses.length, 'invalid expenses');
                    saveToStorage(STORAGE_KEYS.EXPENSES, validExpenses);
                }
            }
            
            // Validate and initialize groups
            const groups = loadFromStorage(STORAGE_KEYS.GROUPS);
            if (!Array.isArray(groups)) {
                console.log('Initializing groups array');
                saveToStorage(STORAGE_KEYS.GROUPS, DEFAULT_DATA.groups);
            }
            
            // Validate and initialize transactions
            const transactions = loadFromStorage(STORAGE_KEYS.TRANSACTIONS);
            if (!Array.isArray(transactions)) {
                console.log('Initializing transactions array');
                saveToStorage(STORAGE_KEYS.TRANSACTIONS, DEFAULT_DATA.transactions);
            } else {
                // Validate transaction structure
                const validTransactions = transactions.filter(transaction => {
                    return transaction && 
                           typeof transaction === 'object' && 
                           transaction.id && 
                           transaction.type && 
                           typeof transaction.amount === 'number' &&
                           transaction.date;
                });
                
                if (validTransactions.length !== transactions.length) {
                    console.log('Cleaned', transactions.length - validTransactions.length, 'invalid transactions');
                    saveToStorage(STORAGE_KEYS.TRANSACTIONS, validTransactions);
                }
            }
            
            // Validate and initialize notifications
            const notifications = loadFromStorage(STORAGE_KEYS.NOTIFICATIONS);
            if (!Array.isArray(notifications)) {
                console.log('Initializing notifications array');
                saveToStorage(STORAGE_KEYS.NOTIFICATIONS, DEFAULT_DATA.notifications);
            } else {
                // Validate notification structure
                const validNotifications = notifications.filter(notification => {
                    return notification && 
                           typeof notification === 'object' && 
                           notification.id && 
                           notification.message && 
                           notification.date;
                });
                
                if (validNotifications.length !== notifications.length) {
                    console.log('Cleaned', notifications.length - validNotifications.length, 'invalid notifications');
                    saveToStorage(STORAGE_KEYS.NOTIFICATIONS, validNotifications);
                }
            }
            
            console.log('Data initialization and validation complete');
        } catch (error) {
            console.error('Error during data initialization:', error);
            // Reset to defaults if there's a critical error
            Object.entries(DEFAULT_DATA).forEach(([key, value]) => {
                const storageKey = STORAGE_KEYS[key.toUpperCase()];
                if (storageKey) {
                    saveToStorage(storageKey, value);
                }
            });
        }
    }
    
    // =============================================
    // EVENT SYSTEM FOR REAL-TIME UPDATES
    // =============================================
    
    function addEventListener(dataType, callback) {
        if (listeners[dataType]) {
            listeners[dataType].push(callback);
        }
    }
    
    function removeEventListener(dataType, callback) {
        if (listeners[dataType]) {
            const index = listeners[dataType].indexOf(callback);
            if (index > -1) {
                listeners[dataType].splice(index, 1);
            }
        }
    }
    
    function triggerEvent(dataType, data) {
        if (listeners[dataType]) {
            listeners[dataType].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Error in data listener:', error);
                }
            });
        }
        
        // Also broadcast to other windows/tabs
        try {
            window.postMessage({
                type: 'POCKETPAL_DATA_UPDATE',
                dataType: dataType,
                data: data
            }, window.location.origin);
        } catch (error) {
            console.error('Error broadcasting data update:', error);
        }
    }
    
    // =============================================
    // USER DATA METHODS
    // =============================================
    
    function getUser() {
        return loadFromStorage(STORAGE_KEYS.USER, DEFAULT_DATA.user);
    }
    
    function setUser(userData) {
        const updatedUser = { ...DEFAULT_DATA.user, ...userData };
        if (saveToStorage(STORAGE_KEYS.USER, updatedUser)) {
            triggerEvent('user', updatedUser);
            return true;
        }
        return false;
    }
    
    function updateUser(updates) {
        const currentUser = getUser();
        const updatedUser = { ...currentUser, ...updates };
        return setUser(updatedUser);
    }
    
    // =============================================
    // WALLET METHODS
    // =============================================
    
    function getWalletBalance() {
        return loadFromStorage(STORAGE_KEYS.WALLET, DEFAULT_DATA.wallet);
    }
    
    function setWalletBalance(amount) {
        const balance = parseFloat(amount) || 0;
        if (saveToStorage(STORAGE_KEYS.WALLET, balance)) {
            triggerEvent('wallet', balance);
            return true;
        }
        return false;
    }
    
    function addMoney(amount) {
        const currentBalance = getWalletBalance();
        const newBalance = currentBalance + parseFloat(amount);
        
        if (setWalletBalance(newBalance)) {
            // Add transaction record for money addition
            addTransaction({
                type: 'income',
                amount: parseFloat(amount),
                description: 'Added money to wallet',
                category: 'income',
                date: new Date().toISOString()
            });
            return true;
        }
        return false;
    }
    
    function subtractMoney(amount) {
        const currentBalance = getWalletBalance();
        const newBalance = currentBalance - parseFloat(amount);
        return setWalletBalance(newBalance);
    }
    
    // =============================================
    // EXPENSE METHODS
    // =============================================
    
    function getExpenses() {
        return loadFromStorage(STORAGE_KEYS.EXPENSES, DEFAULT_DATA.expenses);
    }
    
    function setExpenses(expenses) {
        const expensesArray = Array.isArray(expenses) ? expenses : [];
        if (saveToStorage(STORAGE_KEYS.EXPENSES, expensesArray)) {
            triggerEvent('expenses', expensesArray);
            return true;
        }
        return false;
    }
    
    function addExpense(expense) {
        const expenses = getExpenses();
        const newExpense = {
            id: Date.now() + Math.random(), // Ensure unique ID
            amount: parseFloat(expense.amount) || 0,
            category: expense.category || 'other',
            description: expense.description || 'No description',
            date: expense.date ? new Date(expense.date).toISOString() : new Date().toISOString(),
            timestamp: Date.now()
        };
        
        expenses.unshift(newExpense); // Add to beginning
        
        if (setExpenses(expenses)) {
            // Also add as a transaction record
            addTransaction({
                type: 'expense',
                amount: newExpense.amount,
                description: newExpense.description,
                category: newExpense.category,
                date: newExpense.date,
                expenseId: newExpense.id
            });
            return newExpense;
        }
        return null;
    }
    
    function removeExpense(expenseId) {
        const expenses = getExpenses();
        const filteredExpenses = expenses.filter(expense => expense.id !== expenseId);
        return setExpenses(filteredExpenses);
    }
    
    function updateExpense(expenseId, updates) {
        const expenses = getExpenses();
        const expenseIndex = expenses.findIndex(expense => expense.id === expenseId);
        
        if (expenseIndex > -1) {
            expenses[expenseIndex] = { ...expenses[expenseIndex], ...updates };
            return setExpenses(expenses);
        }
        return false;
    }
    
    // Get expenses for a specific period
    function getExpensesByPeriod(startDate, endDate) {
        const expenses = getExpenses();
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        return expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate >= start && expenseDate <= end;
        });
    }
    
    // Get expenses by category
    function getExpensesByCategory(category) {
        const expenses = getExpenses();
        if (category === 'all') return expenses;
        return expenses.filter(expense => expense.category === category);
    }
    
    // =============================================
    // TRANSACTION METHODS
    // =============================================
    
    function getTransactions() {
        return loadFromStorage(STORAGE_KEYS.TRANSACTIONS, DEFAULT_DATA.transactions);
    }
    
    function setTransactions(transactions) {
        const transactionsArray = Array.isArray(transactions) ? transactions : [];
        if (saveToStorage(STORAGE_KEYS.TRANSACTIONS, transactionsArray)) {
            triggerEvent('transactions', transactionsArray);
            return true;
        }
        return false;
    }
    
    function addTransaction(transaction) {
        const transactions = getTransactions();
        const newTransaction = {
            id: Date.now() + Math.random(),
            type: transaction.type || 'expense', // 'income' or 'expense'
            amount: parseFloat(transaction.amount) || 0,
            description: transaction.description || 'No description',
            category: transaction.category || 'other',
            date: transaction.date ? new Date(transaction.date).toISOString() : new Date().toISOString(),
            timestamp: Date.now(),
            expenseId: transaction.expenseId || null // Link to expense if applicable
        };
        
        transactions.unshift(newTransaction); // Add to beginning
        
        if (setTransactions(transactions)) {
            return newTransaction;
        }
        return null;
    }
    
    function getTransactionsByType(type) {
        const transactions = getTransactions();
        if (type === 'all') return transactions;
        return transactions.filter(transaction => transaction.type === type);
    }
    
    function getTransactionsByPeriod(startDate, endDate) {
        const transactions = getTransactions();
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        return transactions.filter(transaction => {
            const transactionDate = new Date(transaction.date);
            return transactionDate >= start && transactionDate <= end;
        });
    }
    
    // =============================================
    // BUDGET METHODS
    // =============================================
    
    function getBudgets() {
        return loadFromStorage(STORAGE_KEYS.BUDGETS, DEFAULT_DATA.budgets);
    }
    
    function setBudgets(budgets) {
        const budgetData = { ...DEFAULT_DATA.budgets, ...budgets };
        if (saveToStorage(STORAGE_KEYS.BUDGETS, budgetData)) {
            triggerEvent('budgets', budgetData);
            return true;
        }
        return false;
    }
    
    function updateBudget(category, amount) {
        const budgets = getBudgets();
        budgets[category] = parseFloat(amount) || 0;
        return setBudgets(budgets);
    }
    
    // =============================================
    // NOTIFICATION METHODS
    // =============================================
    
    function getNotifications() {
        return loadFromStorage(STORAGE_KEYS.NOTIFICATIONS, DEFAULT_DATA.notifications);
    }
    
    function setNotifications(notifications) {
        const notificationsArray = Array.isArray(notifications) ? notifications : [];
        if (saveToStorage(STORAGE_KEYS.NOTIFICATIONS, notificationsArray)) {
            triggerEvent('notifications', notificationsArray);
            return true;
        }
        return false;
    }
    
    function addNotification(message, type = 'info', autoRead = false) {
        const notifications = getNotifications();
        const newNotification = {
            id: Date.now() + Math.random(),
            message: message,
            type: type,
            read: autoRead,
            date: new Date().toISOString(),
            timestamp: Date.now()
        };
        
        notifications.unshift(newNotification);
        
        if (setNotifications(notifications)) {
            return newNotification;
        }
        return null;
    }
    
    function markNotificationAsRead(notificationId) {
        const notifications = getNotifications();
        const notification = notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.read = true;
            return setNotifications(notifications);
        }
        return false;
    }
    
    function markAllNotificationsAsRead() {
        const notifications = getNotifications();
        notifications.forEach(notification => {
            notification.read = true;
        });
        return setNotifications(notifications);
    }
    
    function deleteNotification(notificationId) {
        const notifications = getNotifications();
        const filteredNotifications = notifications.filter(n => n.id !== notificationId);
        return setNotifications(filteredNotifications);
    }
    
    function clearAllNotifications() {
        return setNotifications([]);
    }
    
    function getUnreadNotifications() {
        return getNotifications().filter(n => !n.read);
    }
    
    // =============================================
    // UTILITY METHODS
    // =============================================
    
    function getAllData() {
        return {
            user: getUser(),
            wallet: getWalletBalance(),
            expenses: getExpenses(),
            transactions: getTransactions(),
            budgets: getBudgets(),
            notifications: getNotifications()
        };
    }
    
    function clearAllData() {
        Object.values(STORAGE_KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
        initializeData();
        
        // Trigger events for all data types
        triggerEvent('user', getUser());
        triggerEvent('wallet', getWalletBalance());
        triggerEvent('expenses', getExpenses());
        triggerEvent('budgets', getBudgets());
        triggerEvent('notifications', getNotifications());
        
        return true;
    }
    
    function exportData() {
        return JSON.stringify(getAllData(), null, 2);
    }
    
    function importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            
            if (data.user) setUser(data.user);
            if (typeof data.wallet === 'number') setWalletBalance(data.wallet);
            if (data.expenses) setExpenses(data.expenses);
            if (data.budgets) setBudgets(data.budgets);
            if (data.notifications) setNotifications(data.notifications);
            
            return true;
        } catch (error) {
            console.error('Failed to import data:', error);
            return false;
        }
    }
    
    // Data validation
    function validateData() {
        const issues = [];
        
        // Check wallet balance
        const wallet = getWalletBalance();
        if (typeof wallet !== 'number') {
            issues.push('Invalid wallet balance');
        }
        
        // Check expenses format
        const expenses = getExpenses();
        if (!Array.isArray(expenses)) {
            issues.push('Invalid expenses data');
        } else {
            expenses.forEach((expense, index) => {
                if (!expense.id || typeof expense.amount !== 'number') {
                    issues.push(`Invalid expense at index ${index}`);
                }
            });
        }
        
        return issues;
    }
    
    // =============================================
    // INITIALIZATION AND EVENT SETUP
    // =============================================
    
    // Initialize on first load
    initializeData();
    
    // Listen for storage events from other tabs/windows
    window.addEventListener('storage', function(e) {
        if (e.key && e.key.startsWith('pocketpal_')) {
            const dataType = e.key.replace('pocketpal_', '').replace('s', ''); // remove 's' for consistency
            try {
                const newValue = e.newValue ? JSON.parse(e.newValue) : null;
                triggerEvent(dataType, newValue);
            } catch (error) {
                console.error('Error handling storage event:', error);
            }
        }
    });
    
    // Listen for postMessage events for cross-window communication
    window.addEventListener('message', function(e) {
        if (e.data && e.data.type === 'POCKETPAL_DATA_UPDATE') {
            // Re-broadcast the event locally
            if (listeners[e.data.dataType]) {
                listeners[e.data.dataType].forEach(callback => {
                    try {
                        callback(e.data.data);
                    } catch (error) {
                        console.error('Error in cross-window data listener:', error);
                    }
                });
            }
        }
    });
    
    // =============================================
    // PUBLIC API
    // =============================================
    
    return {
        // Storage keys
        STORAGE_KEYS,
        
        // Core functions
        initializeData,
        addEventListener,
        removeEventListener,
        
        // User methods
        getUser,
        setUser,
        updateUser,
        
        // Wallet methods
        getWalletBalance,
        setWalletBalance,
        addMoney,
        subtractMoney,
        
        // Expense methods
        getExpenses,
        setExpenses,
        addExpense,
        removeExpense,
        updateExpense,
        getExpensesByPeriod,
        getExpensesByCategory,
        
        // Transaction methods
        getTransactions,
        setTransactions,
        addTransaction,
        getTransactionsByType,
        getTransactionsByPeriod,
        
        // Budget methods
        getBudgets,
        setBudgets,
        updateBudget,
        
        // Notification methods
        getNotifications,
        setNotifications,
        addNotification,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        deleteNotification,
        clearAllNotifications,
        getUnreadNotifications,
        
        // Utility methods
        getAllData,
        clearAllData,
        exportData,
        importData,
        validateData
    };
})();

// Make it globally available
window.PocketPalDataManager = PocketPalDataManager;

// Add global functions for debugging/testing
window.clearAllPocketPalData = function() {
    if (confirm('Are you sure you want to clear all PocketPal data? This cannot be undone.')) {
        PocketPalDataManager.clearAllData();
        alert('All data cleared! Please refresh the page.');
    }
};

window.showPocketPalData = function() {
    const data = PocketPalDataManager.getAllData();
    console.log('PocketPal Data:', data);
    alert('Check console for complete data. Wallet: ₹' + data.wallet + ', Expenses: ' + data.expenses.length + ', Transactions: ' + data.transactions.length);
};

console.log('PocketPal Data Manager initialized');
console.log('Debug functions available: clearAllPocketPalData(), showPocketPalData()');
