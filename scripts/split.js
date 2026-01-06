/* =========================================================================
   PocketPal — split.js (Frontend Only Version)
   Enhanced group management with localStorage
   ========================================================================= */

const STORAGE_KEYS = {
    GROUPS: 'pocketpal_groups',
    SPLITS: 'pocketpal_splits'
};

(function () {
  // ---------- State ----------
  const splitState = {
    userData: null,
    splits: [],
    groups: [],
    currentGroup: null,
    managingGroup: null
  };

  // ---------- DOM Cache ----------
  const el = {
    // Quick Split
    splitForm: document.getElementById('splitForm'),
    splitDescription: document.getElementById('splitDescription'),
    splitAmount: document.getElementById('splitAmount'),
    splitPeople: document.getElementById('splitPeople'),
    peopleNamesContainer: document.getElementById('peopleNamesContainer'),
    paidByContainer: document.getElementById('paidByContainer'),
    paidByOptions: document.getElementById('paidByOptions'),
    splitsList: document.getElementById('splitsList'),

    // Tabs
    tabButtons: document.querySelectorAll('.tab-btn'),
    tabContents: document.querySelectorAll('.tab-content'),

    // Group Tracking
    groupForm: document.getElementById('groupForm'),
    newGroupForm: document.getElementById('newGroupForm'),
    groupName: document.getElementById('groupName'),
    newGroupName: document.getElementById('newGroupName'),
    groupMembersContainer: document.getElementById('groupMembersContainer'),
    newGroupMembersContainer: document.getElementById('newGroupMembersContainer'),
    addMemberBtn: document.getElementById('addMemberBtn'),
    addNewMemberBtn: document.getElementById('addNewMemberBtn'),
    deleteGroupBtn: document.getElementById('deleteGroupBtn'),

    groupExpenseForm: document.getElementById('groupExpenseForm'),
    groupSelect: document.getElementById('groupSelect'),
    groupExpenseDesc: document.getElementById('groupExpenseDesc'),
    groupExpenseAmount: document.getElementById('groupExpenseAmount'),
    groupPaidBy: document.getElementById('groupPaidBy'),
    groupSplitBetween: document.getElementById('groupSplitBetween'),

    groupSummary: document.getElementById('groupSummary'),
    groupHistory: document.getElementById('groupHistory'),
    groupSummarySelect: document.getElementById('groupSummarySelect'),
    groupHistorySelect: document.getElementById('groupHistorySelect'),

    manageGroupBtn: document.getElementById('manageGroupBtn'),
    groupManagement: document.getElementById('groupManagement'),
    closeGroupManagement: document.getElementById('closeGroupManagement'),
    groupManagementTabs: document.querySelector('.group-management-tabs')
  };

  // LocalStorage Helper Functions
  function loadFromStorage(key, defaultValue = null) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      return defaultValue;
    }
  }

  function saveToStorage(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }

  // ---------- Boot ----------
  // Initialize immediately and also on DOM ready
  function initializeSplitApp() {
    if (window.location.pathname.includes('split.html') || document.getElementById('splitForm')) {
      try {
        initializeApp();
        console.log('Split app initialized successfully');
      } catch (error) {
        console.error('Failed to initialize split app:', error);
      }
    }
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSplitApp);
  } else {
    initializeSplitApp();
  }

  function initializeApp() {
    try {
      console.log('Initializing split app...');
      loadUserData();
      setupEventListeners();
      renderGroupSelects();
      renderSplits();
      renderGroupData();

      // Default tab from hash
      const hash = window.location.hash;
      if (hash === '#group-split') {
        switchToTab('group-split');
      } else {
        switchToTab('quick-split');
      }
      
      console.log('Split app initialization complete');
    } catch (error) {
      console.error('Failed to initialize split app:', error);
      showError('Failed to load split data: ' + error.message);
    }
  }

  // ---------- Data Loading ----------
  function loadUserData() {
    try {
      splitState.splits = loadFromStorage(STORAGE_KEYS.SPLITS, []);
      splitState.groups = loadFromStorage(STORAGE_KEYS.GROUPS, []);
      splitState.currentGroup = splitState.groups[0] || null;
      
      splitState.userData = {
        splits: splitState.splits,
        groups: splitState.groups
      };
    } catch (error) {
      console.error('Failed to load user data from storage:', error);
      // Initialize with empty data
      splitState.splits = [];
      splitState.groups = [];
      splitState.currentGroup = null;
      splitState.userData = { splits: [], groups: [] };
    }
  }

  // ---------- Tabs ----------
  function switchToTab(tabId) {
    if (el.tabButtons && el.tabButtons.length > 0) {
      el.tabButtons.forEach(b => {
        b.classList.toggle('active', b.dataset.tab === tabId);
      });
    }
    
    if (el.tabContents && el.tabContents.length > 0) {
      el.tabContents.forEach(c => {
        c.classList.toggle('active', c.id === tabId);
      });
    }
    
    window.location.hash = tabId;
  }

  function switchGroupTab(tabId) {
    document.querySelectorAll('.group-tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tabId);
    });
    document.querySelectorAll('.group-tab-content').forEach(c => {
      c.classList.toggle('active', c.dataset.tab === tabId);
    });
  }

  // ---------- Quick Split ----------
  function handlePeopleCountChange() {
    if (!el.splitPeople || !el.peopleNamesContainer || !el.paidByOptions || !el.paidByContainer) {
      console.warn('Required DOM elements not found for people count change');
      return;
    }
    
    const num = parseInt(el.splitPeople.value) || 0;
    el.peopleNamesContainer.innerHTML = '';
    el.paidByOptions.innerHTML = '';
    el.paidByContainer.style.display = 'none';

    if (num < 2 || num > 10) return;

    // Person 1 = You (fixed)
    el.peopleNamesContainer.insertAdjacentHTML('beforeend', `
      <div class="form-group">
        <label>Person 1</label>
        <div class="input-with-icon">
          <i class="fas fa-user"></i>
          <input type="text" value="You" readonly class="person-name" data-is-you="true">
        </div>
      </div>
    `);

    for (let i = 2; i <= num; i++) {
      el.peopleNamesContainer.insertAdjacentHTML('beforeend', `
        <div class="form-group">
          <label>Person ${i}</label>
          <div class="input-with-icon">
            <i class="fas fa-user"></i>
            <input type="text" placeholder="Enter name" class="person-name" required>
          </div>
        </div>
      `);
    }

    const inputs = el.peopleNamesContainer.querySelectorAll('.person-name');
    inputs.forEach(inp => inp.addEventListener('blur', maybeShowPaidByOptions));
  }

  function maybeShowPaidByOptions() {
    const names = Array.from(document.querySelectorAll('.person-name'))
      .map(i => i.value.trim());
    if (names.some(n => !n)) return;

    // unique names
    const set = new Set(names);
    if (set.size !== names.length) {
      showToast('Please use unique names for each person', 'error');
      return;
    }

    el.paidByOptions.innerHTML = names.map(n => `
      <div class="radio-option">
        <label>
          <input type="radio" name="paidBy" value="${escapeHTML(n)}" ${n === 'You' ? 'checked' : ''}>
          <span class="radio-label">${escapeHTML(n)}</span>
        </label>
      </div>
    `).join('');
    el.paidByContainer.style.display = 'block';
  }

  async function createSplit(e) {
    e.preventDefault();
    const desc = el.splitDescription.value.trim();
    const total = parseFloat(el.splitAmount.value);
    const count = parseInt(el.splitPeople.value);
    const names = Array.from(document.querySelectorAll('.person-name')).map(i => i.value.trim());
    const paidBy = document.querySelector('input[name="paidBy"]:checked')?.value;

    if (!desc) return showToast('Please enter a description', 'error');
    if (!(total > 0)) return showToast('Please enter a valid amount', 'error');
    if (!(count >= 2 && count <= 10)) return showToast('Please enter between 2 and 10 people', 'error');
    if (names.some(n => !n)) return showToast('Please enter names for all people', 'error');

    const unique = new Set(names);
    if (unique.size !== names.length) return showToast('Please use unique names for each person', 'error');
    if (!paidBy) return showToast('Please select who paid initially', 'error');

    const per = total / count;
    const people = names.map(n => ({
      name: n,
      amount: per,
      paid: n === paidBy,
      isYou: n === 'You'
    }));

    try {
      // Create new split with unique ID and current date
      const newSplit = {
        id: generateId(),
        description: desc,
        totalAmount: total,
        paidBy,
        people,
        date: new Date(2025, 8, 10).toISOString(), // September 10, 2025
        createdAt: new Date(2025, 8, 10).toISOString()
      };

      splitState.splits.unshift(newSplit);
      saveToStorage(STORAGE_KEYS.SPLITS, splitState.splits);
      renderSplits();

      el.splitForm.reset();
      el.peopleNamesContainer.innerHTML = '';
      el.paidByOptions.innerHTML = '';
      el.paidByContainer.style.display = 'none';
      el.splitPeople.value = '';

      showToast(`Created split "${desc}" (₹${total.toFixed(2)})`, 'success');
    } catch (error) {
      console.error('Failed to create split:', error);
      showToast('Failed to create split. Please try again.', 'error');
    }
  }

  function renderSplits() {
    if (!el.splitsList) return;

    if (splitState.splits.length === 0) {
      el.splitsList.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-users-slash"></i>
          <p>No active splits yet</p>
          <p class="small">Create your first split above</p>
        </div>`;
      return;
    }

    el.splitsList.innerHTML = splitState.splits.map(split => `
      <div class="split-item" data-split-id="${split.id}">
        <div class="split-header">
          <span class="split-title">${escapeHTML(split.description)}</span>
          <span class="split-amount">₹${split.totalAmount.toFixed(2)}</span>
        </div>
        <div class="split-details">
          <span class="split-date">${formatDate(split.date)}</span>
          <span class="split-people">${split.people.length} people</span>
          ${split.paidBy ? `<span class="split-payer">Paid by ${escapeHTML(split.paidBy)}</span>` : ''}
        </div>
        <div class="split-members">
          ${split.people.map(p => `
            <div class="split-member">
              <div class="member-info">
                <span class="member-avatar">${escapeHTML(p.name.charAt(0).toUpperCase())}</span>
                <span class="member-name">${escapeHTML(p.name)} ${p.isYou ? '(You)' : ''}</span>
              </div>
              <div class="member-amount-info">
                <span class="member-amount">₹${p.amount.toFixed(2)}</span>
                <span class="status-badge ${p.paid ? 'status-paid' : 'status-pending'}">${p.paid ? 'Paid' : 'Pending'}</span>
                ${!p.paid ? `<button type="button" class="btn btn-sm btn-outline mark-paid-btn" data-split-id="${split.id}" data-person="${encodeURIComponent(p.name)}"><i class="fas fa-check"></i> Mark Paid</button>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
        <div class="split-actions" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-gray);">
          <button type="button" class="btn btn-sm btn-danger delete-split-btn" data-split-id="${split.id}">
            <i class="fas fa-trash"></i> Delete Split
          </button>
        </div>
      </div>
    `).join('');

    // Bind actions with improved error handling
    document.querySelectorAll('.mark-paid-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = btn.dataset.splitId;
        const name = decodeURIComponent(btn.dataset.person);
        markPersonAsPaid(id, name);
      });
    });

    document.querySelectorAll('.delete-split-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = btn.dataset.splitId;
        confirmDialog('Delete Split', 'Are you sure you want to delete this split?', 'Delete', 'Cancel', () => {
          deleteSplit(id);
        });
      });
    });
  }

  async function markPersonAsPaid(splitId, personName) {
    try {
      // Update local state
      const split = splitState.splits.find(s => s.id === splitId);
      if (split) {
        const person = split.people.find(p => p.name === personName);
        if (person) {
          person.paid = true;
          saveToStorage(STORAGE_KEYS.SPLITS, splitState.splits);
          renderSplits();
          showToast(`Marked ${personName} as paid`, 'success');
        }
      }
    } catch (error) {
      console.error('Failed to mark as paid:', error);
      showToast('Failed to mark as paid. Please try again.', 'error');
    }
  }

  async function deleteSplit(splitId) {
    try {
      splitState.splits = splitState.splits.filter(s => s.id !== splitId);
      saveToStorage(STORAGE_KEYS.SPLITS, splitState.splits);
      renderSplits();
      showToast('Split deleted', 'info');
    } catch (error) {
      console.error('Failed to delete split:', error);
      showToast('Failed to delete split. Please try again.', 'error');
    }
  }

  // ---------- Groups ----------
  function renderGroupSelects() {
    const opts = splitState.groups.map(g =>
      `<option value="${g.id}" ${g.id === splitState.currentGroup?.id ? 'selected' : ''}>${escapeHTML(g.name)}</option>`
    ).join('');
    const base = '<option value="">Select a group</option>';

    if (el.groupSelect) el.groupSelect.innerHTML = base + opts;
    if (el.groupSummarySelect) el.groupSummarySelect.innerHTML = base + opts;
    if (el.groupHistorySelect) el.groupHistorySelect.innerHTML = base + opts;

    // Toggle enable for expense form submit
    if (splitState.groups.length > 0 && el.groupExpenseForm) {
      el.groupExpenseForm.querySelector('button[type="submit"]').disabled = false;
      el.groupSelect.disabled = false;
    } else if (el.groupExpenseForm) {
      el.groupExpenseForm.querySelector('button[type="submit"]').disabled = true;
      el.groupSelect.disabled = true;
    }
  }

  function renderGroupData() {
    // Summary & history sections
    if (!splitState.currentGroup) {
      if (el.groupSummary) {
        el.groupSummary.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-users"></i>
            <p>No group selected</p>
            <p class="small">Create or select a group</p>
          </div>`;
      }
      if (el.groupHistory) {
        el.groupHistory.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-receipt"></i>
            <p>No group selected</p>
            <p class="small">Select a group to view history</p>
          </div>`;
      }
      updateGroupFormOptions();
      return;
    }

    const g = splitState.currentGroup;
    const balances = calculateGroupBalances(g);
    const total = (g.expenses || []).reduce((s, e) => s + e.amount, 0);

    // Summary
    if (el.groupSummary) {
      el.groupSummary.innerHTML = `
        <div class="group-header">
          <h4>${escapeHTML(g.name)}</h4>
          <span class="group-meta">${g.members.length} members • ₹${total.toFixed(2)} total</span>
        </div>
        <div class="balances-header"><h5>Balances</h5></div>
        <div class="group-members-balances">
          ${Object.entries(balances).sort((a, b) => b[1] - a[1]).map(([name, bal]) => `
            <div class="group-summary-item">
              <div class="member-info">
                <span class="member-avatar">${escapeHTML(name.charAt(0).toUpperCase())}</span>
                <span class="member-name">${escapeHTML(name)} ${name === 'You' ? '(You)' : ''}</span>
              </div>
              <span class="group-balance ${bal > 0 ? 'positive' : bal < 0 ? 'negative' : 'zero'}">
                ₹${Math.abs(bal).toFixed(2)} ${bal > 0 ? 'gets back' : bal < 0 ? 'owes' : 'settled'}
              </span>
            </div>
          `).join('')}
        </div>
        ${Object.values(balances).some(v => Math.abs(v) > 0.009) ? `
          <div class="settle-up-suggestions">
            <h5>Settle Up Suggestions</h5>
            ${generateSettleUpSuggestions(balances)}
          </div>` : ''}
      `;
    }

    // History
    if (el.groupHistory) {
      if (!g.expenses || g.expenses.length === 0) {
        el.groupHistory.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-receipt"></i>
            <p>No expenses recorded yet</p>
            <p class="small">Add your first expense above</p>
          </div>`;
      } else {
        el.groupHistory.innerHTML = `
          <div class="expenses-list">
            ${g.expenses.map(exp => `
              <div class="group-expense-item">
                <div class="group-expense-header">
                  <span class="group-expense-title">${escapeHTML(exp.description)}</span>
                  <span class="group-expense-amount">₹${exp.amount.toFixed(2)}</span>
                </div>
                <div class="group-expense-details">
                  <span class="expense-payer">Paid by ${escapeHTML(exp.paidBy)}</span>
                  <span class="expense-date">${formatDate(exp.date)}</span>
                </div>
                <div class="group-expense-members">
                  ${exp.splitBetween.map(n => `
                    <div class="group-expense-member">
                      <div class="member-info">
                        <span class="member-avatar">${escapeHTML(n.charAt(0).toUpperCase())}</span>
                        <span class="member-name">${escapeHTML(n)} ${n === 'You' ? '(You)' : ''}</span>
                      </div>
                      <span class="member-amount">₹${(exp.amount / exp.splitBetween.length).toFixed(2)}</span>
                    </div>
                  `).join('')}
                </div>
                <div class="expense-actions">
                  <button class="btn btn-sm btn-outline delete-expense-btn" data-expense-id="${exp.id}">
                    <i class="fas fa-trash"></i> Delete
                  </button>
                </div>
              </div>
            `).join('')}
          </div>`;

        // Bind delete buttons
        el.groupHistory.querySelectorAll('.delete-expense-btn').forEach(btn => {
          btn.addEventListener('click', () => deleteGroupExpense(btn.dataset.expenseId));
        });
      }
    }

    updateGroupFormOptions();
  }

  function calculateGroupBalances(group) {
    const balances = {};
    group.members.forEach(m => balances[m] = 0);
    (group.expenses || []).forEach(exp => {
      const share = exp.amount / exp.splitBetween.length;
      balances[exp.paidBy] += exp.amount;
      exp.splitBetween.forEach(n => {
        balances[n] -= share;
      });
    });
    return balances;
  }

  function generateSettleUpSuggestions(balances) {
    const debtors = [];
    const creditors = [];
    Object.entries(balances).forEach(([name, bal]) => {
      if (bal < -0.009) debtors.push({ name, amount: -bal });
      if (bal > 0.009) creditors.push({ name, amount: bal });
    });
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const tx = [];
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const pay = Math.min(debtors[i].amount, creditors[j].amount);
      tx.push({ from: debtors[i].name, to: creditors[j].name, amount: pay });
      debtors[i].amount -= pay;
      creditors[j].amount -= pay;
      if (debtors[i].amount < 0.01) i++;
      if (creditors[j].amount < 0.01) j++;
    }

    if (tx.length === 0) return `<div class="empty-state small"><p>All settled 🎉</p></div>`;

    return `
      <div class="suggestions-list">
        ${tx.map(t => `
          <div class="suggestion-item">
            <span class="from">${escapeHTML(t.from)}</span>
            <i class="fas fa-arrow-right"></i>
            <span class="to">${escapeHTML(t.to)}</span>
            <span class="amount">₹${t.amount.toFixed(2)}</span>
          </div>
        `).join('')}
      </div>`;
  }

  function updateGroupFormOptions() {
    if (!splitState.currentGroup || !el.groupPaidBy || !el.groupSplitBetween) return;

    // Paid By options
    el.groupPaidBy.disabled = false;
    el.groupPaidBy.innerHTML = splitState.currentGroup.members.map(m =>
      `<option value="${escapeHTML(m)}">${escapeHTML(m)} ${m === 'You' ? '(You)' : ''}</option>`).join('');

    // Split Between (checkboxes)
    el.groupSplitBetween.innerHTML = splitState.currentGroup.members.map(m => `
      <label class="checkbox-container">
        <input type="checkbox" value="${escapeHTML(m)}" checked>
        <span class="checkmark"></span>
        <span class="checkbox-label">${escapeHTML(m)} ${m === 'You' ? '(You)' : ''}</span>
      </label>
    `).join('');
  }

  async function addGroupExpense(e) {
    e.preventDefault();
    if (!splitState.currentGroup) return showToast('Create or select a group first', 'error');

    const desc = el.groupExpenseDesc.value.trim();
    const amt = parseFloat(el.groupExpenseAmount.value);
    const paidBy = el.groupPaidBy.value;
    const splitBetween = Array.from(el.groupSplitBetween.querySelectorAll('input[type="checkbox"]:checked'))
      .map(cb => cb.value);

    if (!desc) return showToast('Please enter a description', 'error');
    if (!(amt > 0)) return showToast('Please enter a valid amount', 'error');
    if (splitBetween.length < 1) return showToast('Please select at least one person', 'error');

    try {
      // Create new expense with unique ID and current date
      const newExpense = {
        id: generateId(),
        description: desc,
        amount: amt,
        paidBy: paidBy,
        splitBetween: splitBetween,
        date: new Date(2025, 8, 10).toISOString(), // September 10, 2025
        createdAt: new Date(2025, 8, 10).toISOString()
      };

      // Update local state
      if (!splitState.currentGroup.expenses) splitState.currentGroup.expenses = [];
      splitState.currentGroup.expenses.unshift(newExpense);

      // Update groups array
      const groupIndex = splitState.groups.findIndex(g => g.id === splitState.currentGroup.id);
      if (groupIndex >= 0) {
        splitState.groups[groupIndex] = splitState.currentGroup;
        saveToStorage(STORAGE_KEYS.GROUPS, splitState.groups);
      }

      // Reset form and re-render
      el.groupExpenseForm.reset();
      updateGroupFormOptions();
      renderGroupData();
      showToast(`Added expense to "${splitState.currentGroup.name}"`, 'success');
    } catch (error) {
      console.error('Failed to add group expense:', error);
      showToast('Failed to add expense. Please try again.', 'error');
    }
  }

  async function deleteGroupExpense(expenseId) {
    if (!splitState.currentGroup) return;

    confirmDialog('Delete Expense', 'This cannot be undone. Continue?', 'Delete', 'Cancel', async () => {
      try {
        splitState.currentGroup.expenses = splitState.currentGroup.expenses.filter(e => e.id !== expenseId);

        // Update groups array
        const groupIndex = splitState.groups.findIndex(g => g.id === splitState.currentGroup.id);
        if (groupIndex >= 0) {
          splitState.groups[groupIndex] = splitState.currentGroup;
          saveToStorage(STORAGE_KEYS.GROUPS, splitState.groups);
        }

        renderGroupData();
        showToast('Expense deleted', 'info');
      } catch (error) {
        console.error('Failed to delete expense:', error);
        showToast('Failed to delete expense. Please try again.', 'error');
      }
    });
  }

  // Group Management
  function showGroupManagement() {
    if (splitState.groups.length > 0) {
      switchGroupTab('edit-group');
      setupEditGroupForm();
    } else {
      switchGroupTab('new-group');
      setupNewGroupForm();
    }
    el.groupManagement.style.display = 'block';
  }

  function setupEditGroupForm() {
    if (!splitState.currentGroup) {
      splitState.currentGroup = splitState.groups[0];
    }

    if (splitState.currentGroup) {
      el.groupName.value = splitState.currentGroup.name;
      el.groupMembersContainer.innerHTML = splitState.currentGroup.members.map(m => `
        <div class="person-name-input">
          <input type="text" value="${escapeAttr(m)}" class="group-member-name" ${m === 'You' ? 'readonly data-is-you="true"' : ''}>
          <button type="button" class="btn btn-icon btn-danger remove-member" ${m === 'You' ? 'disabled' : ''}>
            <i class="fas fa-times"></i>
          </button>
        </div>
      `).join('');
    }

    // Bind remove buttons
    el.groupMembersContainer.querySelectorAll('.remove-member:not([disabled])').forEach(btn => {
      btn.addEventListener('click', () => btn.closest('.person-name-input').remove());
    });
  }

  function setupNewGroupForm() {
    el.newGroupName.value = '';
    el.newGroupMembersContainer.innerHTML = `
      <div class="person-name-input">
        <input type="text" value="You" readonly class="group-member-name" data-is-you="true">
        <button type="button" class="btn btn-icon btn-danger remove-member" disabled>
          <i class="fas fa-times"></i>
        </button>
      </div>`;

    // Bind remove buttons
    el.newGroupMembersContainer.querySelectorAll('.remove-member:not([disabled])').forEach(btn => {
      btn.addEventListener('click', () => btn.closest('.person-name-input').remove());
    });
  }

  async function saveGroup(e) {
    e.preventDefault();
    const name = el.groupName.value.trim();
    const members = Array.from(el.groupMembersContainer.querySelectorAll('.group-member-name'))
      .map(i => i.value.trim());

    if (!name) return showToast('Please enter a group name', 'error');
    if (members.length < 2) return showToast('A group needs at least 2 members', 'error');
    const uniq = new Set(members);
    if (uniq.size !== members.length) return showToast('Duplicate member names found', 'error');

    try {
      // Update current group
      splitState.currentGroup.name = name;
      splitState.currentGroup.members = members;
      splitState.currentGroup.updatedAt = new Date(2025, 8, 10).toISOString();

      const groupIndex = splitState.groups.findIndex(g => g.id === splitState.currentGroup.id);
      if (groupIndex >= 0) {
        splitState.groups[groupIndex] = splitState.currentGroup;
        saveToStorage(STORAGE_KEYS.GROUPS, splitState.groups);
      }

      renderGroupSelects();
      renderGroupData();
      el.groupManagement.style.display = 'none';
      showToast(`Group "${name}" updated`, 'success');
    } catch (error) {
      console.error('Failed to save group:', error);
      showToast('Failed to save group. Please try again.', 'error');
    }
  }

  async function createNewGroup(e) {
    e.preventDefault();
    const name = el.newGroupName.value.trim();
    const members = Array.from(el.newGroupMembersContainer.querySelectorAll('.group-member-name'))
      .map(i => i.value.trim());

    if (!name) return showToast('Please enter a group name', 'error');
    if (members.length < 2) return showToast('A group needs at least 2 members', 'error');
    const uniq = new Set(members);
    if (uniq.size !== members.length) return showToast('Duplicate member names found', 'error');

    try {
      // Create new group with unique ID and current date
      const newGroup = {
        id: generateId(),
        name: name,
        members: members,
        expenses: [],
        createdAt: new Date(2025, 8, 10).toISOString()
      };

      splitState.groups.push(newGroup);
      splitState.currentGroup = newGroup;
      saveToStorage(STORAGE_KEYS.GROUPS, splitState.groups);

      renderGroupSelects();
      renderGroupData();
      el.groupManagement.style.display = 'none';
      showToast(`Group "${name}" created`, 'success');
    } catch (error) {
      console.error('Failed to create group:', error);
      showToast('Failed to create group. Please try again.', 'error');
    }
  }

  async function deleteCurrentGroup() {
    if (!splitState.currentGroup) return;

    confirmDialog('Delete Group', `Delete "${splitState.currentGroup.name}" and all its expenses?`, 'Delete', 'Cancel', async () => {
      try {
        splitState.groups = splitState.groups.filter(g => g.id !== splitState.currentGroup.id);
        splitState.currentGroup = splitState.groups[0] || null;
        saveToStorage(STORAGE_KEYS.GROUPS, splitState.groups);

        renderGroupSelects();
        renderGroupData();
        el.groupManagement.style.display = 'none';
        showToast('Group deleted', 'info');
      } catch (error) {
        console.error('Failed to delete group:', error);
        showToast('Failed to delete group. Please try again.', 'error');
      }
    });
  }

  function addGroupMember(container) {
    const count = container.querySelectorAll('.group-member-name').length;
    if (count >= 10) {
      showToast('Maximum 10 members allowed', 'error');
      return;
    }

    const wrap = document.createElement('div');
    wrap.className = 'person-name-input';
    wrap.innerHTML = `
      <input type="text" placeholder="Member name" class="group-member-name" required>
      <button type="button" class="btn btn-icon btn-danger remove-member">
        <i class="fas fa-times"></i>
      </button>`;
    container.appendChild(wrap);
    wrap.querySelector('.remove-member').addEventListener('click', () => wrap.remove());
  }

  function handleGroupSelectChange(e) {
    const id = e.target.value;
    if (!id) return;
    const selected = splitState.groups.find(g => g.id === id);
    if (selected) {
      splitState.currentGroup = selected;
      // Sync all three selects to same id
      [el.groupSelect, el.groupSummarySelect, el.groupHistorySelect].forEach(s => {
        if (s) s.value = id;
      });
      renderGroupData();
    }
  }

  // ---------- Events ----------
  function setupEventListeners() {
    console.log('Setting up split event listeners...');
    
    // Tab buttons - use direct onclick
    const quickSplitTab = document.querySelector('[data-tab="quick-split"]');
    const groupSplitTab = document.querySelector('[data-tab="group-split"]');
    
    if (quickSplitTab) {
      quickSplitTab.onclick = function(e) {
        e.preventDefault();
        console.log('Quick split tab clicked');
        switchToTab('quick-split');
      };
    }
    
    if (groupSplitTab) {
      groupSplitTab.onclick = function(e) {
        e.preventDefault();
        console.log('Group split tab clicked');
        switchToTab('group-split');
      };
    }
    
    // Group management tabs
    const editGroupTab = document.querySelector('[data-tab="edit-group"]');
    const newGroupTab = document.querySelector('[data-tab="new-group"]');
    
    if (editGroupTab) {
      editGroupTab.onclick = function(e) {
        e.preventDefault();
        console.log('Edit group tab clicked');
        switchGroupTab('edit-group');
        setupEditGroupForm();
      };
    }
    
    if (newGroupTab) {
      newGroupTab.onclick = function(e) {
        e.preventDefault();
        console.log('New group tab clicked');
        switchGroupTab('new-group');
        setupNewGroupForm();
      };
    }

    
    // Direct element queries for forms and buttons
    const splitForm = document.getElementById('splitForm');
    const splitPeople = document.getElementById('splitPeople');
    const manageGroupBtn = document.getElementById('manageGroupBtn');
    const closeGroupBtn = document.getElementById('closeGroupManagement');
    const groupForm = document.getElementById('groupForm');
    const newGroupForm = document.getElementById('newGroupForm');
    const deleteGroupBtn = document.getElementById('deleteGroupBtn');
    const addMemberBtn = document.getElementById('addMemberBtn');
    const addNewMemberBtn = document.getElementById('addNewMemberBtn');
    const groupExpenseForm = document.getElementById('groupExpenseForm');
    const groupSelect = document.getElementById('groupSelect');
    const groupSummarySelect = document.getElementById('groupSummarySelect');
    const groupHistorySelect = document.getElementById('groupHistorySelect');

    // Quick Split form
    if (splitForm) {
      splitForm.onsubmit = function(e) {
        console.log('Split form submitted');
        createSplit(e);
      };
    }
    
    if (splitPeople) {
      splitPeople.oninput = function() {
        console.log('Split people count changed');
        handlePeopleCountChange();
      };
    }

    // Group management buttons
    if (manageGroupBtn) {
      manageGroupBtn.onclick = function(e) {
        e.preventDefault();
        console.log('Manage group button clicked');
        showGroupManagement();
      };
    }
    
    if (closeGroupBtn) {
      closeGroupBtn.onclick = function(e) {
        e.preventDefault();
        console.log('Close group management clicked');
        document.getElementById('groupManagement').style.display = 'none';
      };
    }

    // Group forms
    if (groupForm) {
      groupForm.onsubmit = function(e) {
        console.log('Group form submitted');
        saveGroup(e);
      };
    }
    
    if (newGroupForm) {
      newGroupForm.onsubmit = function(e) {
        console.log('New group form submitted');
        createNewGroup(e);
      };
    }
    
    if (deleteGroupBtn) {
      deleteGroupBtn.onclick = function(e) {
        e.preventDefault();
        console.log('Delete group button clicked');
        deleteCurrentGroup();
      };
    }

    // Add member buttons
    if (addMemberBtn) {
      addMemberBtn.onclick = function(e) {
        e.preventDefault();
        console.log('Add member button clicked');
        addGroupMember(document.getElementById('groupMembersContainer'));
      };
    }
    
    if (addNewMemberBtn) {
      addNewMemberBtn.onclick = function(e) {
        e.preventDefault();
        console.log('Add new member button clicked');
        addGroupMember(document.getElementById('newGroupMembersContainer'));
      };
    }

    // Group expense form
    if (groupExpenseForm) {
      groupExpenseForm.onsubmit = function(e) {
        console.log('Group expense form submitted');
        addGroupExpense(e);
      };
    }

    // Group selects
    if (groupSelect) {
      groupSelect.onchange = function(e) {
        console.log('Group select changed');
        handleGroupSelectChange(e);
      };
    }
    
    if (groupSummarySelect) {
      groupSummarySelect.onchange = function(e) {
        console.log('Group summary select changed');
        handleGroupSelectChange(e);
      };
    }
    
    if (groupHistorySelect) {
      groupHistorySelect.onchange = function(e) {
        console.log('Group history select changed');
        handleGroupSelectChange(e);
      };
    }
    
    console.log('Split event listeners setup complete');
  }

  // ---------- Utilities ----------
  function formatDate(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return ''; }
  }

  function escapeHTML(str = '') {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeAttr(str = '') {
    return escapeHTML(str).replace(/"/g, '&quot;');
  }

  function showLoginPrompt() {
    document.body.innerHTML = `
      <div class="app-container">
        <div class="login-prompt">
          <div class="card" style="max-width: 400px; margin: 2rem auto; text-align: center;">
            <div class="card-header">
              <h3>Authentication Required</h3>
            </div>
            <div class="card-body">
              <p>Please log in to manage your splits and groups.</p>
              <div style="margin-top: 1rem;">
                <a href="index.html" class="btn btn-primary">Go to Login</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function redirectToLogin() {
    localStorage.removeItem('pocketpal_token');
    localStorage.removeItem('pocketpal_user');
    showToast('Session expired. Please log in again.', 'warning');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 2000);
  }

  function showError(message) {
    const errorContainer = document.createElement('div');
    errorContainer.className = 'error-container';
    errorContainer.innerHTML = `
      <div class="card" style="max-width: 500px; margin: 2rem auto; text-align: center;">
        <div class="card-header">
          <h3 style="color: #dc3545;">Error Loading Data</h3>
        </div>
        <div class="card-body">
          <p>${escapeHTML(message)}</p>
          <div style="margin-top: 1rem;">
            <button onclick="location.reload()" class="btn btn-primary">Try Again</button>
            <a href="index.html" class="btn btn-secondary" style="margin-left: 0.5rem;">Go Back</a>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(errorContainer);
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

  function confirmDialog(title, msg, confirmText, cancelText, onConfirm) {
    const dlg = document.createElement('div');
    dlg.className = 'confirm-dialog';
    dlg.innerHTML = `
      <div class="confirm-dialog-content">
        <h3>${escapeHTML(title)}</h3>
        <p>${escapeHTML(msg)}</p>
        <div class="confirm-dialog-actions">
          <button class="btn btn-outline cancel-btn">${escapeHTML(cancelText)}</button>
          <button class="btn btn-danger confirm-btn">${escapeHTML(confirmText)}</button>
        </div>
      </div>
    `;

    // Add styles if not already present
    if (!document.querySelector('#confirm-dialog-styles')) {
      const style = document.createElement('style');
      style.id = 'confirm-dialog-styles';
      style.textContent = `
        .confirm-dialog {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10001;
        }
        .confirm-dialog-content {
          background: white;
          padding: 2rem;
          border-radius: 8px;
          max-width: 400px;
          text-align: center;
        }
        .confirm-dialog-actions {
          margin-top: 1.5rem;
          display: flex;
          gap: 1rem;
          justify-content: center;
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(dlg);
    dlg.querySelector('.cancel-btn').addEventListener('click', () => dlg.remove());
    dlg.querySelector('.confirm-btn').addEventListener('click', () => {
      try {
        onConfirm && onConfirm();
      } finally {
        dlg.remove();
      }
    });
  }

  // Utility function to generate unique IDs
  function generateId() {
    return 'id_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  // Remove dependency on missing apiCall function
  window.apiCall = function(url, options) {
    return Promise.reject(new Error('API not available in demo mode'));
  };
})();
