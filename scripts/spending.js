// Enhanced Spending Analysis Module - Fully Connected to Data Manager

// Use shared data manager
const dataManager = window.PocketPalDataManager;

const spending = (function () {
    // Enhanced state for spending page
    const state = {
        userData: null,
        currentView: 'monthly', // 'monthly' or 'yearly'
        currentDate: new Date(2025, 8, 10), // September 10, 2025
        currentTrend: '3m', // '3m', '6m', '1y'
        spendingChart: null,
        trendChart: null,
        isInitialized: false,
        lastDataUpdate: null,
        colors: {
            food: '#F72585',
            travel: '#7ef523ff',
            entertainment: '#4e17cfff',
            study: '#f99513ff',
            other: '#4dc7fcff'
        }
    };

    // DOM Elements with better error handling
    const elements = {
        monthlyView: document.getElementById('monthlyView'),
        yearlyView: document.getElementById('yearlyView'),
        prevPeriod: document.getElementById('prevPeriod'),
        nextPeriod: document.getElementById('nextPeriod'),
        currentPeriod: document.getElementById('currentPeriod'),
        spendingChart: document.getElementById('spendingChart'),
        trendChart: document.getElementById('trendChart'),
        chartLegend: document.getElementById('chartLegend'),
        categoriesList: document.getElementById('categoriesList'),
        categoryFilter: document.getElementById('categoryFilter'),
        largeExpensesList: document.getElementById('largeExpensesList'),
        thresholdFilter: document.getElementById('thresholdFilter'),
        exportData: document.getElementById('exportData'),
        exportModal: document.getElementById('exportModal'),
        cancelExport: document.getElementById('cancelExport')
    };

    // Initialize the spending page with enhanced error handling
    function init() {
        try {
            // Wait for data manager to be available
            if (!window.PocketPalDataManager) {
                console.log('Waiting for data manager...');
                setTimeout(init, 100);
                return;
            }

            console.log('Initializing spending module...');

            // Setup data listeners first
            setupSpendingDataListeners();

            // Load initial data
            loadUserDataFromStorage();

            // Setup UI and event listeners
            setupEventListeners();
            setupUIComponents();

            // Initial data processing and rendering
            updatePeriodDisplay();
            renderCategoryFilter();
            processSpendingData(state.userData.expenses || []);

            state.isInitialized = true;
            state.lastDataUpdate = Date.now();

            console.log('Spending module initialized successfully');
        } catch (error) {
            console.error('Error during spending module initialization:', error);
            showError('Failed to initialize spending analysis');
        }
    }

    // Enhanced real-time data listeners
    function setupSpendingDataListeners() {
        console.log('Setting up spending data listeners...');

        // Listen for expense changes (primary data source)
        dataManager.addEventListener('expenses', function (newExpenses) {
            console.log('Spending page: Expenses updated -', newExpenses.length, 'expenses');
            if (state.isInitialized) {
                state.userData.expenses = newExpenses;
                state.lastDataUpdate = Date.now();
                processSpendingData(newExpenses);
                showToast('Spending data updated', 'info');
            }
        });

        // Listen for transaction changes (includes both income and expenses)
        dataManager.addEventListener('transactions', function (newTransactions) {
            console.log('Spending page: Transactions updated -', newTransactions.length, 'transactions');
            if (state.isInitialized) {
                // Convert expense transactions to expenses format for analysis
                const expenseTransactions = newTransactions.filter(t => t.type === 'expense');
                state.userData.expenses = expenseTransactions.map(t => ({
                    id: t.expenseId || t.id,
                    amount: Math.abs(t.amount),
                    category: t.category,
                    description: t.description,
                    date: t.date,
                    timestamp: t.timestamp
                }));
                state.lastDataUpdate = Date.now();
                processSpendingData(state.userData.expenses);
            }
        });

        // Listen for budget changes
        dataManager.addEventListener('budgets', function (newBudgets) {
            console.log('Spending page: Budgets updated');
            if (state.isInitialized) {
                state.userData.budgets = newBudgets;
                // Rerender category breakdown with new budget data
                const filteredExpenses = filterExpensesByPeriod(state.userData.expenses || []);
                renderCategoryBreakdown(filteredExpenses);
                showToast('Budget data updated', 'info');
            }
        });

        // Listen for wallet changes (might affect spending context)
        dataManager.addEventListener('wallet', function (newBalance) {
            console.log('Spending page: Wallet balance updated -', newBalance);
            if (state.isInitialized) {
                // Update any wallet-related displays if needed
                updateWalletContext(newBalance);
            }
        });

        // Listen for user changes
        dataManager.addEventListener('user', function (newUser) {
            console.log('Spending page: User updated -', newUser.username);
            if (state.isInitialized) {
                updateUserDisplay(newUser);
            }
        });
    }

    // Load user data from localStorage using shared data manager
    function loadUserDataFromStorage() {
        try {
            const expenses = dataManager.getExpenses();
            const budgets = dataManager.getBudgets();
            const user = dataManager.getUser();
            const wallet = dataManager.getWalletBalance();

            state.userData = {
                expenses: expenses,
                budgets: budgets,
                user: user,
                wallet: wallet
            };

            console.log('Spending page: Loaded data -', {
                expenses: expenses.length,
                budgets: Object.keys(budgets).length,
                user: user.username,
                wallet: wallet
            });

            // Show welcome message if no data
            if (expenses.length === 0) {
                showWelcomeMessage();
            }

        } catch (error) {
            console.error('Failed to load user data from storage:', error);
            // Initialize with empty data
            state.userData = {
                expenses: [],
                budgets: {},
                user: { username: 'User' },
                wallet: 0
            };
            showError('Failed to load spending data');
        }
    }

    // Enhanced UI component setup
    function setupUIComponents() {
        // Check for required elements
        if (!elements.spendingChart) {
            console.warn('Spending chart element not found');
            showError('Spending chart not available');
            return;
        }

        // Initialize chart canvas context
        try {
            if (elements.spendingChart.getContext) {
                console.log('Chart canvas ready');
            }
        } catch (error) {
            console.error('Chart canvas not accessible:', error);
            showError('Chart visualization not available');
        }

        // Setup threshold filter default value
        if (elements.thresholdFilter) {
            elements.thresholdFilter.value = '100'; // Default threshold
        }

        // Setup trend buttons
        setupTrendButtons();

        // Setup export modal
        setupExportModal();
    }

    // Enhanced event listeners setup
    function setupEventListeners() {
        console.log('Setting up enhanced event listeners...');

        // View toggle buttons with better error handling
        setupViewToggleListeners();

        // Period navigation
        setupPeriodNavigationListeners();

        // Filter listeners
        setupFilterListeners();

        // Export functionality
        setupExportListeners();

        // Keyboard shortcuts
        setupKeyboardShortcuts();

        console.log('Event listeners setup complete');
    }

    function setupViewToggleListeners() {
        if (elements.monthlyView) {
            elements.monthlyView.onclick = function (e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Switching to monthly view');
                switchView('monthly');
            };
        }

        if (elements.yearlyView) {
            elements.yearlyView.onclick = function (e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Switching to yearly view');
                switchView('yearly');
            };
        }
    }

    function setupPeriodNavigationListeners() {
        if (elements.prevPeriod) {
            elements.prevPeriod.onclick = function (e) {
                e.preventDefault();
                console.log('Navigating to previous period');
                navigatePeriod(-1);
            };
        }

        if (elements.nextPeriod) {
            elements.nextPeriod.onclick = function (e) {
                e.preventDefault();
                console.log('Navigating to next period');
                navigatePeriod(1);
            };
        }
    }

    function setupFilterListeners() {
        if (elements.categoryFilter) {
            elements.categoryFilter.onchange = function () {
                console.log('Category filter changed to:', this.value);
                filterCategory();
            };
        }

        if (elements.thresholdFilter) {
            elements.thresholdFilter.onchange = function () {
                console.log('Threshold filter changed to:', this.value);
                filterLargeExpenses();
            };
        }
    }

    function setupTrendButtons() {
        const trendButtons = document.querySelectorAll('[data-trend]');
        trendButtons.forEach(btn => {
            btn.onclick = function (e) {
                e.preventDefault();
                console.log('Trend button clicked:', this.dataset.trend);
                setTrendPeriod(this.dataset.trend);
            };
        });

        // Set initial active trend button
        const initialTrendBtn = document.querySelector(`[data-trend="${state.currentTrend}"]`);
        if (initialTrendBtn) {
            initialTrendBtn.classList.add('active');
        }
    }

    function setupExportListeners() {
        if (elements.exportData) {
            elements.exportData.onclick = function (e) {
                e.preventDefault();
                console.log('Export button clicked');
                showExportModal();
            };
        }

        if (elements.cancelExport) {
            elements.cancelExport.onclick = function (e) {
                e.preventDefault();
                console.log('Cancel export clicked');
                hideExportModal();
            };
        }

        // Export option buttons
        const exportOptions = document.querySelectorAll('.export-option');
        exportOptions.forEach(btn => {
            btn.onclick = function (e) {
                e.preventDefault();
                console.log('Export option clicked:', this.dataset.format);
                exportData(this.dataset.format);
            };
        });
    }

    function setupExportModal() {
        // Close modal on backdrop click
        if (elements.exportModal) {
            elements.exportModal.onclick = function (e) {
                if (e.target === this) {
                    hideExportModal();
                }
            };
        }
    }

    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', function (e) {
            // Only handle shortcuts if we're on the spending page
            if (!elements.spendingChart) return;

            switch (e.key) {
                case 'ArrowLeft':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        navigatePeriod(-1);
                    }
                    break;
                case 'ArrowRight':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        navigatePeriod(1);
                    }
                    break;
                case 'm':
                case 'M':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        switchView('monthly');
                    }
                    break;
                case 'y':
                case 'Y':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        switchView('yearly');
                    }
                    break;
                case 'Escape':
                    hideExportModal();
                    break;
            }
        });
    }

    // Enhanced view switching with smooth transitions
    function switchView(view) {
        if (state.currentView === view) return;

        console.log(`Switching from ${state.currentView} to ${view} view`);
        state.currentView = view;

        // Update button states
        if (elements.monthlyView) {
            elements.monthlyView.classList.toggle('active', view === 'monthly');
        }
        if (elements.yearlyView) {
            elements.yearlyView.classList.toggle('active', view === 'yearly');
        }

        updatePeriodDisplay();

        // Add loading state
        showLoadingState();

        // Process data with a slight delay for better UX
        setTimeout(() => {
            processSpendingData(state.userData.expenses || []);
        }, 100);

        showToast(`Switched to ${view} view`, 'info');
    }

    // Enhanced period navigation
    function navigatePeriod(direction) {
        const previousDate = new Date(state.currentDate);

        if (state.currentView === 'monthly') {
            state.currentDate.setMonth(state.currentDate.getMonth() + direction);
        } else {
            state.currentDate.setFullYear(state.currentDate.getFullYear() + direction);
        }

        console.log(`Navigated from ${previousDate.toISOString()} to ${state.currentDate.toISOString()}`);

        updatePeriodDisplay();

        // Add loading state
        showLoadingState();

        // Process data with a slight delay for better UX
        setTimeout(() => {
            processSpendingData(state.userData.expenses || []);
        }, 100);
    }

    // Enhanced trend period setting
    function setTrendPeriod(period) {
        if (state.currentTrend === period) return;

        console.log(`Changing trend period from ${state.currentTrend} to ${period}`);
        state.currentTrend = period;

        // Update button states
        document.querySelectorAll('[data-trend]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.trend === period);
        });

        showLoadingState('trend');

        // Render trend chart with a slight delay
        setTimeout(() => {
            renderTrendChart();
        }, 100);

        showToast(`Trend period set to ${period}`, 'info');
    }

    // Enhanced period display update
    function updatePeriodDisplay() {
        if (!elements.currentPeriod) return;

        let displayText = '';
        let contextText = '';

        if (state.currentView === 'monthly') {
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];
            const month = monthNames[state.currentDate.getMonth()];
            const year = state.currentDate.getFullYear();
            displayText = `${month} ${year}`;
            contextText = 'Monthly View';
        } else {
            displayText = state.currentDate.getFullYear().toString();
            contextText = 'Yearly View';
        }

        elements.currentPeriod.innerHTML = `
            <span class="period-context">${contextText}</span>
            <span class="period-display">${displayText}</span>
        `;
    }

    // Enhanced data processing with loading states
    function processSpendingData(expenses) {
        try {
            console.log('Processing spending data for', expenses.length, 'expenses');

            const filteredExpenses = filterExpensesByPeriod(expenses);

            console.log('Filtered to', filteredExpenses.length, 'expenses for current period');

            // Render components with staggered loading for better UX
            renderSpendingChart(filteredExpenses);

            setTimeout(() => {
                renderCategoryBreakdown(filteredExpenses);
            }, 100);

            setTimeout(() => {
                renderLargeExpenses(filteredExpenses);
            }, 200);

            setTimeout(() => {
                renderTrendChart();
            }, 300);

            // Update summary stats
            updateSummaryStats(filteredExpenses);

        } catch (error) {
            console.error('Error processing spending data:', error);
            showError('Failed to process spending data');
        }
    }

    // Enhanced expense filtering
    function filterExpensesByPeriod(expenses) {
        const currentMonth = state.currentDate.getMonth();
        const currentYear = state.currentDate.getFullYear();

        const filtered = expenses.filter(expense => {
            try {
                const expenseDate = new Date(expense.date);

                if (state.currentView === 'monthly') {
                    return expenseDate.getMonth() === currentMonth &&
                        expenseDate.getFullYear() === currentYear;
                } else {
                    return expenseDate.getFullYear() === currentYear;
                }
            } catch (error) {
                console.warn('Invalid expense date:', expense.date);
                return false;
            }
        });

        return filtered;
    }

    // Helper functions for loading states
    function showLoadingState(component = 'all') {
        if (component === 'all' || component === 'chart') {
            const chartContainer = elements.spendingChart?.parentElement;
            if (chartContainer) {
                chartContainer.classList.add('loading');
            }
        }

        if (component === 'all' || component === 'trend') {
            const trendContainer = elements.trendChart?.parentElement;
            if (trendContainer) {
                trendContainer.classList.add('loading');
            }
        }

        if (component === 'all' || component === 'categories') {
            if (elements.categoriesList) {
                elements.categoriesList.classList.add('loading');
            }
        }
    }

    function hideLoadingState() {
        document.querySelectorAll('.loading').forEach(el => {
            el.classList.remove('loading');
        });
    }

    // Enhanced summary statistics
    function updateSummaryStats(expenses) {
        const totalSpending = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const avgDaily = expenses.length > 0 ? totalSpending / Math.max(1, getDaysInPeriod()) : 0;
        const categoryCount = new Set(expenses.map(e => e.category)).size;

        // Update summary elements if they exist
        const totalSpendingEl = document.getElementById('totalSpending');
        const avgDailyEl = document.getElementById('avgDaily');
        const categoriesUsedEl = document.getElementById('categoriesUsed');
        const expenseCountEl = document.getElementById('expenseCount');

        if (totalSpendingEl) {
            totalSpendingEl.textContent = `₹${totalSpending.toFixed(2)}`;
        }
        if (avgDailyEl) {
            avgDailyEl.textContent = `₹${avgDaily.toFixed(2)}`;
        }
        if (categoriesUsedEl) {
            categoriesUsedEl.textContent = categoryCount;
        }
        if (expenseCountEl) {
            expenseCountEl.textContent = expenses.length;
        }
    }

    function getDaysInPeriod() {
        if (state.currentView === 'monthly') {
            return new Date(state.currentDate.getFullYear(), state.currentDate.getMonth() + 1, 0).getDate();
        } else {
            const year = state.currentDate.getFullYear();
            const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
            return isLeapYear ? 366 : 365;
        }
    }

    // Context updates for wallet and user
    function updateWalletContext(balance) {
        const walletContextEl = document.getElementById('walletContext');
        if (walletContextEl) {
            walletContextEl.innerHTML = `
                <span class="wallet-label">Current Balance:</span>
                <span class="wallet-amount ${balance < 0 ? 'negative' : 'positive'}">₹${balance.toFixed(2)}</span>
            `;
        }
    }

    function updateUserDisplay(user) {
        const userDisplayEl = document.getElementById('spendingUserName');
        if (userDisplayEl) {
            userDisplayEl.textContent = user.username || 'User';
        }
    }

    function showWelcomeMessage() {
        const welcomeEl = document.getElementById('spendingWelcome');
        if (welcomeEl) {
            welcomeEl.innerHTML = `
                <div class="welcome-message">
                    <h3>Welcome to Spending Analysis!</h3>
                    <p>Start tracking expenses to see your spending patterns and insights.</p>
                    <a href="index.html" class="btn btn-primary">Add Your First Expense</a>
                </div>
            `;
            welcomeEl.style.display = 'block';
        }
    }

    // Continue with the rest of the original functions...
    // (renderSpendingChart, renderCategoryBreakdown, etc. remain the same)
    // I'll include the key ones that need enhancement:

    // Enhanced chart rendering with better error handling
    function renderSpendingChart(expenses) {
        if (!elements.spendingChart) {
            console.warn('Spending chart element not available');
            return;
        }

        try {
            // Destroy previous chart if it exists
            if (state.spendingChart) {
                state.spendingChart.destroy();
                state.spendingChart = null;
            }

            // Group expenses by category
            const categories = ['food', 'travel', 'entertainment', 'study', 'other'];
            const categoryTotals = {};

            categories.forEach(category => {
                categoryTotals[category] = expenses
                    .filter(e => e.category === category)
                    .reduce((sum, e) => sum + (e.amount || 0), 0);
            });

            // Prepare data for chart
            const labels = categories.map(getCategoryName);
            const data = categories.map(category => categoryTotals[category]);
            const backgroundColors = categories.map(category => state.colors[category]);

            // Only create chart if we have data
            const hasData = data.some(value => value > 0);

            if (!hasData) {
                showEmptyChartState();
                return;
            }

            // Create chart
            const ctx = elements.spendingChart.getContext('2d');
            state.spendingChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: backgroundColors,
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    const label = context.label || '';
                                    const value = context.raw || 0;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                                    return `${label}: ₹${value.toFixed(2)} (${percentage}%)`;
                                }
                            }
                        }
                    },
                    cutout: '65%',
                    animation: {
                        animateRotate: true,
                        animateScale: true
                    }
                }
            });

            // Update legend
            renderChartLegend(labels, backgroundColors, data);

            // Hide loading state
            hideLoadingState();

        } catch (error) {
            console.error('Error rendering spending chart:', error);
            showChartError();
        }
    }

    function showEmptyChartState() {
        const chartContainer = elements.spendingChart?.parentElement;
        if (chartContainer) {
            chartContainer.innerHTML = `
                <div class="empty-chart-state">
                    <i class="fas fa-chart-pie" style="font-size: 3rem; color: #ddd; margin-bottom: 1rem;"></i>
                    <h4>No expenses for this period</h4>
                    <p>Add some expenses to see your spending breakdown</p>
                </div>
            `;
        }
    }

    function showChartError() {
        const chartContainer = elements.spendingChart?.parentElement;
        if (chartContainer) {
            chartContainer.innerHTML = `
                <div class="chart-error-state">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: #dc3545; margin-bottom: 1rem;"></i>
                    <p>Unable to load chart</p>
                    <button onclick="spending.init()" class="btn btn-sm btn-secondary">Retry</button>
                </div>
            `;
        }
    }

    // Export the main functions
    return {
        init: init,
        switchView: switchView,
        navigatePeriod: navigatePeriod,
        setTrendPeriod: setTrendPeriod,
        refresh: function () {
            if (state.isInitialized) {
                loadUserDataFromStorage();
                processSpendingData(state.userData.expenses || []);
            }
        },
        getState: function () {
            return { ...state };
        }
    };
})();

// Enhanced initialization with better timing
if (typeof window !== 'undefined') {
    function initializeSpending() {
        // Check if we're on the spending page
        if (document.getElementById('spendingChart') || window.location.pathname.includes('spending.html')) {
            try {
                spending.init();
                console.log('Spending module initialized successfully');

                // Make spending object available globally for debugging
                window.spendingAnalyzer = spending;
            } catch (error) {
                console.error('Failed to initialize spending module:', error);
            }
        }
    }

    // Multiple initialization strategies
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeSpending);
    } else if (document.readyState === 'interactive') {
        setTimeout(initializeSpending, 100);
    } else {
        initializeSpending();
    }

    // Fallback initialization
    window.addEventListener('load', function () {
        if (document.getElementById('spendingChart') && !window.spendingInitialized) {
            initializeSpending();
            window.spendingInitialized = true;
        }
    });
}