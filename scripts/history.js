// Enhanced History Page - Fully Connected to Data Manager

// Use shared data manager
const dataManager = window.PocketPalDataManager;

// State management
const historyState = {
    transactions: [],
    filteredTransactions: [],
    currentPage: 1,
    transactionsPerPage: 10,
    isInitialized: false
};

document.addEventListener('DOMContentLoaded', function () {
    initHistoryPage();
});

function initHistoryPage() {
    try {
        // Wait for data manager to be available
        if (!window.PocketPalDataManager) {
            console.log('Waiting for data manager...');
            setTimeout(initHistoryPage, 100);
            return;
        }

        setupHistoryDataListeners();
        loadTransactionsFromStorage();
        setupHistoryUI();
        historyState.isInitialized = true;

        console.log('History page initialized successfully');
    } catch (error) {
        console.error('Failed to load history:', error);
        showError('Failed to load transaction history');
    }
}

// Enhanced real-time data listeners
function setupHistoryDataListeners() {
    // Listen for transaction changes (primary source)
    dataManager.addEventListener('transactions', function (newTransactions) {
        console.log('History page: Transactions updated -', newTransactions.length, 'transactions');
        if (historyState.isInitialized) {
            loadTransactionsFromStorage();
            applyCurrentFiltersAndUpdate();
        }
    });

    // Listen for expense changes (triggers transaction updates)
    dataManager.addEventListener('expenses', function (newExpenses) {
        console.log('History page: Expenses updated -', newExpenses.length, 'expenses');
        if (historyState.isInitialized) {
            loadTransactionsFromStorage();
            applyCurrentFiltersAndUpdate();
        }
    });

    // Listen for wallet changes (affects income transactions)
    dataManager.addEventListener('wallet', function (newBalance) {
        console.log('History page: Wallet balance updated -', newBalance);
        if (historyState.isInitialized) {
            loadTransactionsFromStorage();
            applyCurrentFiltersAndUpdate();
        }
    });

    // Listen for budget changes (affects UI context)
    dataManager.addEventListener('budgets', function (newBudgets) {
        console.log('History page: Budgets updated');
        if (historyState.isInitialized) {
            // Budget changes don't require reloading transactions, but might affect display
            updateSummary();
        }
    });

    // Listen for user changes
    dataManager.addEventListener('user', function (newUser) {
        console.log('History page: User updated -', newUser.username);
        // Update any user-specific UI elements if needed
        updateUserDisplay();
    });
}

function applyCurrentFiltersAndUpdate() {
    const currentFilters = getCurrentFilters();
    historyState.filteredTransactions = filterTransactions(historyState.transactions, currentFilters);
    historyState.currentPage = 1; // Reset to first page
    updateHistoryTable();
    updateSummary();
}

// Enhanced transaction loading with better error handling
function loadTransactionsFromStorage() {
    try {
        // Load all transactions using the shared data manager
        const allTransactions = dataManager.getTransactions();

        // Enhanced transaction formatting
        const formattedTransactions = allTransactions.map(transaction => ({
            ...transaction,
            // Ensure proper amount formatting based on type
            amount: transaction.type === 'expense' ? -Math.abs(transaction.amount) : Math.abs(transaction.amount),
            // Ensure date is properly formatted
            date: transaction.date || new Date().toISOString(),
            // Ensure description exists
            description: transaction.description || (transaction.type === 'expense' ? 'Expense' : 'Income'),
            // Ensure category exists
            category: transaction.category || 'other'
        }));

        // Sort by date (newest first) and then by timestamp
        historyState.transactions = formattedTransactions.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            if (dateA.getTime() === dateB.getTime()) {
                // If dates are the same, sort by timestamp (newer first)
                return (b.timestamp || 0) - (a.timestamp || 0);
            }
            return dateB - dateA;
        });

        // Update filtered transactions
        historyState.filteredTransactions = [...historyState.transactions];

        console.log('History: Loaded', historyState.transactions.length, 'transactions');

        // Show status message if no transactions
        if (historyState.transactions.length === 0) {
            showEmptyState();
        }

    } catch (error) {
        console.error('Failed to load transactions from storage:', error);
        historyState.transactions = [];
        historyState.filteredTransactions = [];
        showError('Failed to load transaction data');
    }
}

// Enhanced UI setup with better error handling
function setupHistoryUI() {
    // DOM elements with existence checks
    const elements = {
        historyTable: document.getElementById('historyTable'),
        tbody: document.querySelector('#historyTable tbody'),
        totalTransactionsEl: document.getElementById('totalTransactions'),
        totalExpensesEl: document.getElementById('totalExpenses'),
        totalIncomeEl: document.getElementById('totalIncome'),
        pageInfoEl: document.getElementById('pageInfo'),
        prevPageBtn: document.getElementById('prevPage'),
        nextPageBtn: document.getElementById('nextPage'),
        applyFiltersBtn: document.getElementById('applyFilters'),
        resetFiltersBtn: document.getElementById('resetFilters'),
        startDateInput: document.getElementById('startDate'),
        endDateInput: document.getElementById('endDate'),
        categoryFilter: document.getElementById('categoryFilter'),
        typeFilter: document.getElementById('typeFilter')
    };

    // Check if required elements exist
    if (!elements.tbody) {
        console.error('History table not found - check HTML structure');
        showError('History table not found in page');
        return;
    }

    // Set default date range
    setupDefaultDateRange(elements);

    // Setup event listeners with null checks
    setupEventListeners(elements);

    // Initial render
    const initialFilters = getCurrentFilters();
    historyState.filteredTransactions = filterTransactions(historyState.transactions, initialFilters);
    updateHistoryTable();
    updateSummary();
}

function setupDefaultDateRange(elements) {
    // Set default date range to show all data (past year)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);

    if (elements.startDateInput) {
        elements.startDateInput.valueAsDate = startDate;
    }
    if (elements.endDateInput) {
        elements.endDateInput.valueAsDate = endDate;
    }
}

function setupEventListeners(elements) {
    // Apply filters with debouncing
    if (elements.applyFiltersBtn) {
        elements.applyFiltersBtn.addEventListener('click', function () {
            historyState.currentPage = 1;
            const filters = getCurrentFilters();
            historyState.filteredTransactions = filterTransactions(historyState.transactions, filters);
            updateHistoryTable();
            updateSummary();
            showToast('Filters applied successfully', 'info');
        });
    }

    // Reset filters
    if (elements.resetFiltersBtn) {
        elements.resetFiltersBtn.addEventListener('click', function () {
            setupDefaultDateRange(elements);

            if (elements.categoryFilter) elements.categoryFilter.value = 'all';
            if (elements.typeFilter) elements.typeFilter.value = 'all';

            historyState.currentPage = 1;
            const filters = getCurrentFilters();
            historyState.filteredTransactions = filterTransactions(historyState.transactions, filters);
            updateHistoryTable();
            updateSummary();
            showToast('Filters reset', 'info');
        });
    }

    // Pagination controls
    if (elements.prevPageBtn) {
        elements.prevPageBtn.addEventListener('click', function () {
            if (historyState.currentPage > 1) {
                historyState.currentPage--;
                updateHistoryTable();
            }
        });
    }

    if (elements.nextPageBtn) {
        elements.nextPageBtn.addEventListener('click', function () {
            const totalPages = Math.ceil(historyState.filteredTransactions.length / historyState.transactionsPerPage);
            if (historyState.currentPage < totalPages) {
                historyState.currentPage++;
                updateHistoryTable();
            }
        });
    }

    // Live filtering (optional - applies filters as you type/change)
    const liveFilterElements = [elements.categoryFilter, elements.typeFilter];
    liveFilterElements.forEach(element => {
        if (element) {
            element.addEventListener('change', function () {
                // Auto-apply filters on change (optional)
                if (document.getElementById('autoFilter')?.checked) {
                    elements.applyFiltersBtn?.click();
                }
            });
        }
    });
}

// Enhanced filter function with better date handling
function filterTransactions(transactions, filters = null) {
    if (!filters) {
        filters = getCurrentFilters();
    }

    return transactions.filter(transaction => {
        // Date filter
        if (filters.startDate && filters.endDate) {
            const startDate = new Date(filters.startDate);
            const endDate = new Date(filters.endDate);
            const transactionDate = new Date(transaction.date);

            // Set end date to end of day for inclusive filtering
            endDate.setHours(23, 59, 59, 999);

            if (transactionDate < startDate || transactionDate > endDate) {
                return false;
            }
        }

        // Category filter
        if (filters.category !== 'all' && transaction.category !== filters.category) {
            return false;
        }

        // Type filter
        if (filters.type === 'expense' && transaction.amount >= 0) {
            return false;
        }
        if (filters.type === 'income' && transaction.amount < 0) {
            return false;
        }

        return true;
    });
}

// Enhanced table update with better UX
function updateHistoryTable() {
    const tbody = document.querySelector('#historyTable tbody');
    if (!tbody) return;

    const startIndex = (historyState.currentPage - 1) * historyState.transactionsPerPage;
    const endIndex = startIndex + historyState.transactionsPerPage;
    const pageTransactions = historyState.filteredTransactions.slice(startIndex, endIndex);

    // Show loading state briefly for better UX
    tbody.innerHTML = '<tr><td colspan="5" class="loading-state">Loading transactions...</td></tr>';

    setTimeout(() => {
        // Clear table
        tbody.innerHTML = '';

        if (pageTransactions.length === 0) {
            tbody.innerHTML = `
                <tr class="no-results">
                    <td colspan="5" class="empty-state">
                        <div class="empty-state-content">
                            <i class="fas fa-receipt" style="font-size: 2rem; color: #ccc; margin-bottom: 1rem;"></i>
                            <p>No transactions found matching your filters</p>
                            <small style="color: #999;">Try adjusting your date range or category filters</small>
                        </div>
                    </td>
                </tr>
            `;
        } else {
            // Add transactions to table with enhanced formatting
            pageTransactions.forEach((transaction, index) => {
                const row = document.createElement('tr');
                row.className = 'transaction-row';

                // Add slight delay for smooth loading animation
                row.style.opacity = '0';
                row.style.transform = 'translateY(10px)';

                const transactionDate = new Date(transaction.date);
                const dateString = transactionDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
                const timeString = transactionDate.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                });

                const isExpense = transaction.amount < 0;
                const amount = Math.abs(transaction.amount).toFixed(2);
                const amountClass = isExpense ? 'transaction-expense' : 'transaction-income';
                const amountSign = isExpense ? '-' : '+';
                const typeText = isExpense ? 'Expense' : 'Income';
                const typeIcon = isExpense ? 'fas fa-minus-circle' : 'fas fa-plus-circle';

                const categoryClass = `category-${transaction.category || 'other'}`;
                const categoryName = getCategoryName(transaction.category);

                row.innerHTML = `
                    <td class="transaction-date-cell">
                        <div class="transaction-date">${dateString}</div>
                        <div class="transaction-time">${timeString}</div>
                    </td>
                    <td class="transaction-description">
                        <div class="description-text">${escapeHTML(transaction.description || 'No description')}</div>
                        ${transaction.expenseId ? '<small class="expense-link">Linked to expense</small>' : ''}
                    </td>
                    <td class="transaction-category">
                        <span class="category-badge ${categoryClass}">
                            <i class="${getCategoryIcon(transaction.category)}"></i>
                            ${categoryName}
                        </span>
                    </td>
                    <td class="transaction-amount ${amountClass}">
                        <span class="amount-value">${amountSign}₹${amount}</span>
                    </td>
                    <td class="transaction-type">
                        <span class="type-badge ${isExpense ? 'type-expense' : 'type-income'}">
                            <i class="${typeIcon}"></i>
                            ${typeText}
                        </span>
                    </td>
                `;

                tbody.appendChild(row);

                // Animate row entrance
                setTimeout(() => {
                    row.style.transition = 'all 0.3s ease';
                    row.style.opacity = '1';
                    row.style.transform = 'translateY(0)';
                }, index * 50);
            });
        }

        // Update pagination after table is rendered
        updatePaginationControls();
    }, 100);
}

// Enhanced pagination with better info
function updatePaginationControls() {
    const totalTransactions = historyState.filteredTransactions.length;
    const totalPages = Math.ceil(totalTransactions / historyState.transactionsPerPage) || 1;
    const startIndex = (historyState.currentPage - 1) * historyState.transactionsPerPage + 1;
    const endIndex = Math.min(startIndex + historyState.transactionsPerPage - 1, totalTransactions);

    const pageInfoEl = document.getElementById('pageInfo');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');

    if (pageInfoEl) {
        if (totalTransactions === 0) {
            pageInfoEl.textContent = 'No transactions';
        } else {
            pageInfoEl.textContent = `Showing ${startIndex}-${endIndex} of ${totalTransactions} transactions (Page ${historyState.currentPage} of ${totalPages})`;
        }
    }

    if (prevPageBtn) {
        prevPageBtn.disabled = historyState.currentPage <= 1;
        prevPageBtn.title = historyState.currentPage <= 1 ? 'No previous page' : 'Go to previous page';
    }

    if (nextPageBtn) {
        nextPageBtn.disabled = historyState.currentPage >= totalPages;
        nextPageBtn.title = historyState.currentPage >= totalPages ? 'No next page' : 'Go to next page';
    }
}

// Enhanced summary with more insights
function updateSummary() {
    const totalTransactions = historyState.filteredTransactions.length;
    const expenses = historyState.filteredTransactions.filter(t => t.amount < 0);
    const income = historyState.filteredTransactions.filter(t => t.amount >= 0);

    const totalExpenses = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
    const netBalance = totalIncome - totalExpenses;

    // Update basic summary elements
    const totalTransactionsEl = document.getElementById('totalTransactions');
    const totalExpensesEl = document.getElementById('totalExpenses');
    const totalIncomeEl = document.getElementById('totalIncome');

    if (totalTransactionsEl) {
        totalTransactionsEl.textContent = totalTransactions;
    }
    if (totalExpensesEl) {
        totalExpensesEl.textContent = `₹${totalExpenses.toFixed(2)}`;
        totalExpensesEl.className = totalExpenses > 0 ? 'summary-expense' : '';
    }
    if (totalIncomeEl) {
        totalIncomeEl.textContent = `₹${totalIncome.toFixed(2)}`;
        totalIncomeEl.className = totalIncome > 0 ? 'summary-income' : '';
    }

    // Update net balance if element exists
    const netBalanceEl = document.getElementById('netBalance');
    if (netBalanceEl) {
        netBalanceEl.textContent = `₹${netBalance.toFixed(2)}`;
        netBalanceEl.className = netBalance >= 0 ? 'summary-positive' : 'summary-negative';
    }

    // Update period summary if element exists
    updatePeriodSummary();
}

function updatePeriodSummary() {
    const periodSummaryEl = document.getElementById('periodSummary');
    if (!periodSummaryEl) return;

    const filters = getCurrentFilters();
    let periodText = 'All Time';

    if (filters.startDate && filters.endDate) {
        const start = new Date(filters.startDate).toLocaleDateString();
        const end = new Date(filters.endDate).toLocaleDateString();
        periodText = `${start} to ${end}`;
    }

    periodSummaryEl.textContent = `Summary for: ${periodText}`;
}

// Helper functions with enhancements
function getCurrentFilters() {
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const categoryFilter = document.getElementById('categoryFilter');
    const typeFilter = document.getElementById('typeFilter');

    return {
        startDate: startDateInput?.value || '',
        endDate: endDateInput?.value || '',
        category: categoryFilter?.value || 'all',
        type: typeFilter?.value || 'all'
    };
}

function getCategoryName(category) {
    const names = {
        food: 'Food & Dining',
        travel: 'Travel & Transport',
        entertainment: 'Entertainment',
        study: 'Study Materials',
        income: 'Money Added',
        other: 'Other'
    };
    return names[category] || 'Other';
}

function getCategoryIcon(category) {
    const icons = {
        food: 'fas fa-utensils',
        travel: 'fas fa-car',
        entertainment: 'fas fa-film',
        study: 'fas fa-book',
        income: 'fas fa-wallet',
        other: 'fas fa-question-circle'
    };
    return icons[category] || 'fas fa-question-circle';
}

function updateUserDisplay() {
    // Update any user-specific elements if they exist
    const userNameEl = document.getElementById('historyUserName');
    if (userNameEl && dataManager) {
        const user = dataManager.getUser();
        userNameEl.textContent = user?.username || 'User';
    }
}

function showEmptyState() {
    const tbody = document.querySelector('#historyTable tbody');
    if (tbody) {
        tbody.innerHTML = `
            <tr class="empty-state-row">
                <td colspan="5" class="empty-state">
                    <div class="empty-state-content">
                        <i class="fas fa-chart-line" style="font-size: 3rem; color: #ddd; margin-bottom: 1rem;"></i>
                        <h4>No transaction history yet</h4>
                        <p>Start by adding money to your wallet or recording expenses</p>
                        <div class="empty-state-actions">
                            <a href="index.html" class="btn btn-primary">Go to Dashboard</a>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }
}

// Enhanced utility functions
function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
}

function showError(message) {
    console.error('History Error:', message);
    const errorContainer = document.createElement('div');
    errorContainer.className = 'error-container';
    errorContainer.innerHTML = `
        <div class="card error-card" style="max-width: 500px; margin: 2rem auto; text-align: center;">
            <div class="card-header">
                <h3 style="color: #dc3545;">
                    <i class="fas fa-exclamation-triangle"></i>
                    Error Loading History
                </h3>
            </div>
            <div class="card-body">
                <p>${escapeHTML(message)}</p>
                <div style="margin-top: 1rem;">
                    <button onclick="location.reload()" class="btn btn-primary">
                        <i class="fas fa-redo"></i> Try Again
                    </button>
                    <a href="index.html" class="btn btn-secondary" style="margin-left: 0.5rem;">
                        <i class="fas fa-home"></i> Go to Dashboard
                    </a>
                </div>
            </div>
        </div>
    `;

    // Replace main content with error
    const mainContent = document.querySelector('.main-content') || document.body;
    mainContent.innerHTML = '';
    mainContent.appendChild(errorContainer);
}

function showToast(message, type = 'info') {
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
            
            /* Enhanced table styles for better UX */
            .transaction-row {
                transition: background-color 0.2s ease;
            }
            .transaction-row:hover {
                background-color: #f8f9fa;
            }
            .loading-state, .empty-state {
                text-align: center;
                padding: 2rem;
                color: #666;
            }
            .empty-state-content {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 1rem;
            }
            .category-badge {
                display: inline-flex;
                align-items: center;
                gap: 0.25rem;
                padding: 0.25rem 0.5rem;
                border-radius: 0.5rem;
                font-size: 0.875rem;
                font-weight: 500;
            }
            .type-badge {
                display: inline-flex;
                align-items: center;
                gap: 0.25rem;
                padding: 0.25rem 0.5rem;
                border-radius: 0.5rem;
                font-size: 0.875rem;
                font-weight: 500;
            }
            .type-expense {
                background-color: #fee;
                color: #c53030;
            }
            .type-income {
                background-color: #f0fff4;
                color: #38a169;
            }
            .summary-expense { color: #c53030; }
            .summary-income { color: #38a169; }
            .summary-positive { color: #38a169; }
            .summary-negative { color: #c53030; }
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

// Export functions for potential external use
window.historyPageManager = {
    refresh: () => {
        loadTransactionsFromStorage();
        applyCurrentFiltersAndUpdate();
    },
    getState: () => historyState,
    applyFilters: () => {
        const filters = getCurrentFilters();
        historyState.filteredTransactions = filterTransactions(historyState.transactions, filters);
        updateHistoryTable();
        updateSummary();
    }
};