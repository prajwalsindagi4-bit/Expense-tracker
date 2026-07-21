// --- Security Sanitization ---
function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    if (typeof str !== 'string') str = String(str);
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#39;');
}
// -----------------------------

// Manmo AI — Orchestrator & UI Controller

let wealthChartInstance = null;
let outflowChartInstance = null;
let sandboxChartInstance = null;
let budgetPieChartInstance = null;

// Track selected category & reason inside the P2P confirmation flow
let selectedConfirmCategory = null;
let selectedConfirmReason = null;
let activePendingTx = null;

document.addEventListener('DOMContentLoaded', async () => {
    await fetchInitialData();
    try {
        initApp();
    } catch (e) {
        console.error('initApp error (non-fatal):', e);
    }
    initScrollReveal();
});

function initApp() {
    // 1. Initialize Icons
    lucide.createIcons();
    
    // Build dynamic spendings filter based on loaded data
    buildSpendingsFilter();
    buildDashboardFilter();

    // 2. Navigation routing
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = item.getAttribute('data-target');
            switchTab(targetId);
        });
    });

    // 3. Ledger filters
    const filterButtons = document.querySelectorAll('#tx-filter-container button');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => {
                b.style.background = 'rgba(255, 255, 255, 0.05)';
                b.style.borderColor = 'var(--border-color)';
                b.classList.remove('active');
            });
            btn.style.background = 'rgba(99, 102, 241, 0.15)';
            btn.style.borderColor = 'rgba(99, 102, 241, 0.35)';
            btn.classList.add('active');
            
            const filterValue = btn.getAttribute('data-filter');
            renderLedger(filterValue);
        });
    });

    // 4. Search input search
    const searchInput = document.getElementById('tx-search-input');
    searchInput.addEventListener('input', () => {
        const currentFilter = document.querySelector('#tx-filter-container .active')?.getAttribute('data-filter') || 'all';
        renderLedger(currentFilter, searchInput.value.toLowerCase());
    });

    // 5. Open/Close Simulator Modals
    const openSimBtn = document.getElementById('open-simulator-btn');
    if (openSimBtn) {
        openSimBtn.addEventListener('click', () => {
            document.getElementById('simulator-modal').classList.add('active');
        });
    }
    // Use event delegation so listeners survive lucide.createIcons() re-rendering SVGs
    document.getElementById('simulator-modal').addEventListener('click', (e) => {
        if (e.target.closest('#close-simulator-btn')) {
            document.getElementById('simulator-modal').classList.remove('active');
        }
    });

    // Close Confirmation Modal (delegated)
    document.getElementById('confirm-modal').addEventListener('click', (e) => {
        if (e.target.closest('#close-confirm-modal-btn')) {
            dismissConfirmationModal();
        }
    });

    // 6. Delegated category selection + submit inside confirmation modal
    const confirmModal = document.getElementById('confirm-modal');
    confirmModal.addEventListener('click', (e) => {
        const optBtn = e.target.closest('.btn-option[data-category]');
        if (optBtn) {
            // Reset all option buttons
            confirmModal.querySelectorAll('.btn-option[data-category]').forEach(b => {
                b.style.background = 'rgba(255, 255, 255, 0.02)';
                b.style.borderColor = 'var(--border-subtle)';
            });
            optBtn.style.background = 'rgba(99, 102, 241, 0.2)';
            optBtn.style.borderColor = 'var(--accent)';

            selectedConfirmCategory = optBtn.getAttribute('data-category');
            selectedConfirmReason = optBtn.getAttribute('data-reason');
        }

        if (e.target.closest('#modal-confirm-submit-btn')) {
            submitP2PConfirmation();
        }
    });

    // 7. What-If Sandbox Range Sliders
    const sandboxSliders = ['slider-invest', 'slider-dining', 'slider-bonus', 'slider-debt'];
    sandboxSliders.forEach(id => {
        const slider = document.getElementById(id);
        if (slider) {
            slider.addEventListener('input', () => {
                if (typeof updateSandboxValues === 'function') updateSandboxValues();
                if (typeof runSandboxSimulation === 'function') runSandboxSimulation();
            });
        }
    });

    // 8. Spendings month selector
    document.getElementById('spendings-month-select').addEventListener('change', () => {
        renderSpendings();
    });

    // 9. Settings Data Sync (with Modal prompt)
    const btnSyncData = document.getElementById('btn-sync-data');
    const uploadModal = document.getElementById('upload-csv-modal');
    const closeUploadModalBtn = document.getElementById('close-upload-modal-btn');
    const submitUploadBtn = document.getElementById('submit-upload-modal-btn');
    
    if (btnSyncData && uploadModal) {
        btnSyncData.addEventListener('click', () => {
            const fileInput = document.getElementById('csv-upload-input');
            if (fileInput && fileInput.files[0]) {
                uploadModal.classList.add('active');
            } else {
                alert('Please select a CSV file first.');
            }
        });
        
        closeUploadModalBtn.addEventListener('click', () => {
            uploadModal.classList.remove('active');
        });
        
        submitUploadBtn.addEventListener('click', async () => {
            const fileInput = document.getElementById('csv-upload-input');
            const file = fileInput.files[0];
            
            const selectedMonth = document.getElementById('upload-month').value;
            const selectedYear = document.getElementById('upload-year').value;
            
            submitUploadBtn.innerHTML = '<i data-lucide="loader-2" class="spin" style="width:16px; height:16px; display:inline-block; vertical-align:middle; margin-right:6px;"></i> Uploading...';
            lucide.createIcons();
            
            try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('statementMonth', selectedMonth);
                formData.append('statementYear', selectedYear);
                
                const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
                    ? 'http://localhost:8000/api' 
                    : '/api';
                
                const token = localStorage.getItem('token');
                const headers = {};
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
                
                const response = await fetch(`${API_BASE}/upload-statement`, {
                    method: 'POST',
                    headers: headers,
                    body: formData
                });
                
                if (!response.ok) {
                    const errData = await response.json().catch(() => null);
                    const errMsg = errData && errData.error ? errData.error : await response.text();
                    throw new Error(`Backend Error (${response.status}): ${errMsg}`);
                }
                
                localStorage.setItem('hasDataUploaded', 'true');
                window.location.reload();
            } catch (e) {
                console.error("Upload failed:", e);
                alert("Upload failed. Check console for details.");
                submitUploadBtn.innerHTML = 'Upload Statement';
            }
        });
    }

    // Initial render
    updateDashboardUI();
    updateCategoryDropdowns();
    renderOpportunitiesAndSpots();
    if (typeof initSandboxChart === 'function') initSandboxChart();
    if (typeof runSandboxSimulation === 'function') runSandboxSimulation();

    // 10. Change Password functionality
    const btnChangePassword = document.getElementById('btn-change-password');
    if (btnChangePassword) {
        btnChangePassword.addEventListener('click', async () => {
            const currentPassword = document.getElementById('settings-current-password').value;
            const newPassword = document.getElementById('settings-new-password').value;
            
            if (!currentPassword || !newPassword) {
                showToast('Error', 'Please fill in both password fields.', 'danger');
                return;
            }
            
            // Show loading state
            btnChangePassword.innerHTML = '<i class="lucide-loader" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 6px;"></i>Updating...';
            btnChangePassword.disabled = true;
            
            try {
                const res = await fetch('/api/auth/change-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: authUser.email,
                        current_password: currentPassword,
                        new_password: newPassword
                    })
                });
                const data = await res.json();
                
                if (!res.ok) throw new Error(data.error || 'Failed to change password');
                
                showToast('Success', 'Your password has been securely updated.', 'success');
                document.getElementById('settings-current-password').value = '';
                document.getElementById('settings-new-password').value = '';
            } catch (err) {
                showToast('Error', err.message, 'danger');
            } finally {
                btnChangePassword.innerHTML = 'Update Password';
                btnChangePassword.disabled = false;
            }
        });
    }

    // 11. Delete Account functionality
    const btnDeleteAccount = document.getElementById('btn-delete-account');
    if (btnDeleteAccount) {
        btnDeleteAccount.addEventListener('click', async () => {
            const confirmed = confirm('DANGER: Are you absolutely sure you want to permanently delete your account? This will securely wipe all your transactions, AI feedback, and settings from the database. This action CANNOT be undone.');
            if (!confirmed) return;
            
            try {
                const res = await fetch('/api/auth/delete-account', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': Bearer 
                    }
                });
                const data = await res.json();
                
                if (!res.ok) throw new Error(data.error || 'Failed to delete account');
                
                alert('Your account and all associated data have been securely deleted.');
                logout();
            } catch (err) {
                showToast('Error', err.message, 'danger');
            }
        });
    }

    // 12. Download Budget PDF functionality
    const btnDownloadBudget = document.getElementById('btn-download-budget-pdf');
    if (btnDownloadBudget) {
        btnDownloadBudget.addEventListener('click', () => {
            const element = document.getElementById('budget-comparison-card');
            if (!element) return;
            
            const opt = {
                margin:       0.5,
                filename:     `Budget_Report_${new Date().toLocaleDateString().replace(/\\//g, '-')}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#0f172a' },
                jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
            };
            
            // Add a temporary class to fix some styling for PDF output
            element.style.background = '#0f172a'; // force dark bg
            
            // Disable button during generation
            btnDownloadBudget.innerHTML = '<i data-lucide="loader" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 6px;"></i>Generating...';
            btnDownloadBudget.disabled = true;
            lucide.createIcons();
            
            html2pdf().set(opt).from(element).save().then(() => {
                element.style.background = ''; // restore
                btnDownloadBudget.innerHTML = '<i data-lucide="download" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 6px;"></i>Download PDF';
                btnDownloadBudget.disabled = false;
                lucide.createIcons();
                showToast('Success', 'Budget PDF generated successfully.', 'success');
            });
        });
    }
}

// Tab switcher route control — Premium transition
function switchTab(tabId) {
    const sections = document.querySelectorAll('.page-section');
    const navItems = document.querySelectorAll('.nav-item');
    const mainContent = document.getElementById('main-content');
    
    // Premium exit animation on current active section
    const currentActive = document.querySelector('.page-section.active');
    if (currentActive && currentActive.id !== tabId) {
        currentActive.style.opacity = '0';
        currentActive.style.transform = 'translateY(-15px) scale(0.98)';
        currentActive.style.filter = 'blur(4px)';
        currentActive.style.transition = 'all 0.25s ease-out';
    }

    // Wait for exit animation, then switch
    setTimeout(() => {
        // Reset reveal animations on all sections so they replay on re-entry
        sections.forEach(sec => {
            sec.classList.remove('active');
            sec.style.opacity = '';
            sec.style.transform = '';
            sec.style.filter = '';
            sec.style.transition = '';
            sec.querySelectorAll('.reveal, .reveal-left, .reveal-scale').forEach(el => {
                el.classList.remove('visible');
            });
        });
        navItems.forEach(item => item.classList.remove('active'));

        // Scroll to top smoothly
        window.scrollTo({ top: 0, behavior: 'smooth' });

        document.getElementById(tabId).classList.add('active');
        const activeNav = Array.from(navItems).find(item => item.getAttribute('data-target') === tabId);
        if (activeNav) activeNav.classList.add('active');

        // Trigger chart refreshes or canvas resets if needed
        if (tabId === 'dashboard') {
            updateDashboardUI();
    updateCategoryDropdowns();
        } else if (tabId === 'transactions') {
            renderLedger();
        } else if (tabId === 'spendings') {
            renderSpendings();
        } else if (tabId === 'sandbox') {
            renderBudgetComparison();
        } else if (tabId === 'split-expenses') {
            checkPendingConfirmationsInbox();
        }

        if (window.triggerReveal) window.triggerReveal();

        // Re-initialize 3D tilt for cards in the new section
        setTimeout(() => init3DCardTilt(), 200);
    }, currentActive && currentActive.id !== tabId ? 200 : 0);
}

// Update primary dashboard containers
function updateDashboardUI() {
    // 1. Calculate health metrics
    const healthData = calculateFinancialHealth(transactions);
    
    // Update Score Circle and text
    const scoreVal = healthData.overall;
    document.getElementById('health-score-text').innerHTML = `${scoreVal}<span>/ 100</span>`;
    document.getElementById('health-score-message').innerText = healthData.message;
    
    // Animate progress circle stroke-dashoffset
    const circle = document.getElementById('health-progress');
    // SVG circle radius=65. Circumference = 2 * PI * r = 408.4
    const circumference = 408;
    circle.style.strokeDasharray = circumference;
    const offset = circumference - (scoreVal / 100) * circumference;
    circle.style.strokeDashoffset = offset;
    
    // Render health factors list
    const factorsList = document.getElementById('health-factors');
    factorsList.innerHTML = '';
    let factorsHtml = '';
    healthData.factors.forEach(f => {
        factorsHtml += `
            <div class="health-factor-item">
                <span style="font-weight:500;">${escapeHTML(f.name)}</span>
                <span style="color: ${f.score >= 80 ? 'var(--success)' : f.score >= 50 ? 'var(--warning)' : 'var(--danger)'}; font-weight:600;">
                    ${f.score}/100
                </span>
            </div>
        `;
    });
    factorsList.innerHTML = factorsHtml;

    // 2. Update stats indicators dynamically based on selected dashboard filter
    let currentMonthNum = -1;
    let currentYear = -1;
    
    const dMonthSelect = document.getElementById('dashboard-month-select');
    const dYearSelect = document.getElementById('dashboard-year-select');
    
    if (dMonthSelect && dMonthSelect.value !== 'none' && dYearSelect && dYearSelect.value !== 'none') {
        currentMonthNum = parseInt(dMonthSelect.value);
        currentYear = parseInt(dYearSelect.value);
    }
    
    const thisMonthTxs = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonthNum && d.getFullYear() === currentYear;
    });

    const sumFlow = (arr, flowType) => arr.filter(t => t.flow === flowType).reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const spentThisMonth = sumFlow(thisMonthTxs, 'expense');
    const investedThisMonth = sumFlow(thisMonthTxs, 'investment');
    const incomeThisMonth = sumFlow(thisMonthTxs, 'income');

    const savingsRate = incomeThisMonth > 0 ? Math.round(((incomeThisMonth - spentThisMonth) / incomeThisMonth) * 100) : 0;

    // Calculate historic net worth from all transactions
    const totalHistoricIncome = sumFlow(transactions, 'income');
    const totalHistoricExpense = sumFlow(transactions, 'expense');
    const dynamicNetWorth = 40000 + (totalHistoricIncome - totalHistoricExpense);

    // Animate stat values with counting effect
    animateStatValue('stat-networth', dynamicNetWorth, '₹', true);
    animateStatValue('stat-spent', spentThisMonth, '₹', true);
    animateStatValue('stat-invested', investedThisMonth, '₹', true);
    animateStatValue('stat-savingsrate', Math.max(0, savingsRate), '', false, '%');

    // 3. AI Financial Story
    let narrativeText = "";
    if (transactions.length === 0) {
        narrativeText = "<h3>Awaiting Data Integration</h3><p>Upload your bank statements in the Settings tab to let ManMo generate personalized insights and track your wealth journey.</p>";
    } else if (thisMonthTxs.length === 0) {
        narrativeText = "<h3>Select a Statement</h3><p>Please select a month and year from the dropdown above to view AI-generated insights and financial breakdowns for that period.</p>";
    } else {
        narrativeText = generateFinancialStory(transactions);
    }
    document.getElementById('story-narrative-container').innerHTML = narrativeText;

    // Refresh icons inside dynamic content
    lucide.createIcons();

    // 4. Render charts
    initDashboardCharts(thisMonthTxs);

    // Re-initialize 3D tilt for new cards
    setTimeout(() => init3DCardTilt(), 300);
}

// Chart.js visualizations
function initDashboardCharts(thisMonthTxs) {
    // A. Wealth Trend line chart (past 6 months)
    const wealthCtx = document.getElementById('wealthTrendChart').getContext('2d');
    if (wealthChartInstance) wealthChartInstance.destroy();
    
    wealthChartInstance = new Chart(wealthCtx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Net Worth Assets',
                data: localStorage.getItem('hasDataUploaded') === 'false' 
                    ? [0, 0, 0, 0, 0, 0] 
                    : [38000, 39200, 40500, 41200, 42100, 42650],
                borderColor: '#7c5cfc',
                backgroundColor: 'rgba(124, 92, 252, 0.06)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#7c5cfc',
                pointRadius: 3,
                pointHoverRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#ffffff', font: { size: 10 } } },
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#ffffff', font: { size: 10 } } }
            }
        }
    });

    // B. Budget Allocation Pie Chart
    const pieCtx = document.getElementById('budgetPieChart');
    if (pieCtx) {
        const pieCtx2d = pieCtx.getContext('2d');
        if (budgetPieChartInstance) budgetPieChartInstance.destroy();

        const categoryTotals = {};
        thisMonthTxs.forEach(t => {
            if (t.flow === 'expense') {
                const cat = t.category || 'Miscellaneous';
                categoryTotals[cat] = (categoryTotals[cat] || 0) + parseFloat(t.amount);
            }
        });

        let labels = Object.keys(categoryTotals);
        let data = Object.values(categoryTotals);
        if (labels.length === 0) {
            labels = ['Awaiting Data'];
            data = [100];
        }

        budgetPieChartInstance = new Chart(pieCtx2d, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#c084fc', '#38bdf8', '#34d399', '#fbbf24', 
                        '#f87171', '#818cf8', '#a78bfa', '#f472b6', '#94a3b8'
                    ],
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.1)',
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: { 
                    legend: { 
                        position: 'right',
                        labels: { color: '#ffffff', font: { size: 11, family: 'Inter' }, padding: 15, usePointStyle: true, boxWidth: 8 }
                    } 
                }
            }
        });
    }
}
// Budget Planner — standalone function for the Budget tab
const BUDGET_PRESETS = {
    '50-30-20': [
        { name: 'Needs', pct: 50, txCategories: ['Rent', 'Bills', 'Utilities', 'Grocery'], flow: 'expense' },
        { name: 'Wants', pct: 30, txCategories: ['Food', 'Travel', 'Shopping'], flow: 'expense' },
        { name: 'Savings & Investments', pct: 20, txCategories: ['Investments'], flow: 'investment' }
    ],
    '70-20-10': [
        { name: 'Living Expenses', pct: 70, txCategories: ['Rent', 'Bills', 'Utilities', 'Grocery', 'Food', 'Travel', 'Shopping'], flow: 'expense' },
        { name: 'Savings & Investments', pct: 20, txCategories: ['Investments'], flow: 'investment' },
        { name: 'Debt Repayment', pct: 10, txCategories: ['Debt'], flow: 'expense' }
    ],
    'zero-based': [
        { name: 'Housing & Utilities', pct: 35, txCategories: ['Rent', 'Bills', 'Utilities'], flow: 'expense' },
        { name: 'Food & Groceries', pct: 15, txCategories: ['Grocery', 'Food'], flow: 'expense' },
        { name: 'Transportation & Misc', pct: 15, txCategories: ['Travel', 'Shopping'], flow: 'expense' },
        { name: 'Savings & Investments', pct: 35, txCategories: ['Investments'], flow: 'investment' }
    ]
};

// Default budget categories with their transaction category mappings

function updateCategoryDropdowns() {
    const expenseSelect = document.getElementById('expense-category');
    if (!expenseSelect) return;
    
    // Clear existing options
    expenseSelect.innerHTML = '';
    
    // Always add Income first
    const incomeGroup = document.createElement('optgroup');
    incomeGroup.label = 'Income (Inflow)';
    incomeGroup.innerHTML = '<option value="Income">Income</option>';
    expenseSelect.appendChild(incomeGroup);
    
    // Add dynamic budget buckets
    budgetCategories.forEach(bucket => {
        const group = document.createElement('optgroup');
        group.label = bucket.name;
        
        if (bucket.txCategories && bucket.txCategories.length > 0) {
            bucket.txCategories.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat;
                opt.textContent = cat;
                group.appendChild(opt);
            });
        } else {
            // If no specific txCategories, just use the bucket name itself
            const opt = document.createElement('option');
            opt.value = bucket.name;
            opt.textContent = bucket.name;
            group.appendChild(opt);
        }
        expenseSelect.appendChild(group);
    });
}

let budgetCategories = localStorage.getItem('budgetCategories') 
    ? JSON.parse(localStorage.getItem('budgetCategories')) 
    : JSON.parse(JSON.stringify(BUDGET_PRESETS['50-30-20']));

function renderBudgetComparison() {
    const allTxs = transactions;
    const defaultIncome = allTxs.filter(t => t.flow === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0) || 4500;
    
    const budgetInput = document.getElementById('custom-budget-total');
    if (budgetInput && budgetInput.value == 4500) {
        budgetInput.value = defaultIncome;
    }

    // Render category rows
    const renderCategoryRows = () => {
        const list = document.getElementById('budget-categories-list');
        if (!list) return;
        list.innerHTML = '';

        // Extract unique categories from all transactions for the pill selector
        const allUniqueCategories = [...new Set(transactions.map(t => t.category || 'Miscellaneous'))].sort();

        budgetCategories.forEach((cat, idx) => {
            const row = document.createElement('div');
            row.style.cssText = 'display: flex; gap: 0.75rem; align-items: center; padding: 0.5rem 0.75rem; background: rgba(255,255,255,0.02); border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);';
            
            let pillsHtml = '';
            allUniqueCategories.forEach(txCat => {
                const isActive = (cat.txCategories || []).includes(txCat);
                const bg = isActive ? 'var(--primary)' : 'rgba(255,255,255,0.05)';
                const color = isActive ? 'white' : 'var(--text-muted)';
                pillsHtml += `<span class="budget-cat-pill" data-idx="${idx}" data-txcat="${txCat}" style="cursor:pointer; display:inline-block; padding:2px 6px; font-size:0.7rem; background:${bg}; color:${color}; border-radius:4px; border:1px solid rgba(255,255,255,0.1); user-select:none; transition:all 0.2s;">${txCat}</span>`;
            });
            
            row.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 0.5rem; flex: 1;">
                    <input type="text" value="${escapeHTML(cat.name)}" data-idx="${idx}" class="budget-cat-name" placeholder="Bucket Name" style="width: 100%; padding: 0.4rem 0.6rem; font-size: 0.9rem; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 4px;">
                    <div style="display: flex; flex-wrap: wrap; gap: 0.25rem; max-height: 42px; overflow-y: auto; padding-right: 5px;" class="custom-scrollbar">
                        ${pillsHtml}
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 0.25rem;">
                    <input type="number" value="${cat.pct}" data-idx="${idx}" class="budget-cat-pct" style="width: 65px; padding: 0.4rem 0.5rem; font-size: 0.9rem; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 4px; text-align: center;" min="0" max="100">
                    <span style="color: var(--text-muted); font-size: 0.85rem;">%</span>
                </div>
                <button class="budget-cat-remove" data-idx="${idx}" style="background: none; border: 1px solid rgba(239,68,68,0.3); color: var(--danger); padding: 0.3rem 0.5rem; border-radius: 4px; cursor: pointer; font-size: 0.8rem; display: flex; align-items: center;" title="Remove">
                    <i data-lucide="x" style="width: 14px; height: 14px;"></i>
                </button>
            `;
            list.appendChild(row);
        });

        const markCustom = () => {
            const dropdown = document.getElementById('budget-rule-preset');
            if (dropdown) dropdown.value = 'custom';
        };

        // Attach live percentage change listeners
        list.querySelectorAll('.budget-cat-pct').forEach(input => {
            input.addEventListener('input', (e) => {
                const idx = parseInt(e.target.dataset.idx);
                budgetCategories[idx].pct = parseFloat(e.target.value) || 0;
                updatePctIndicator();
                markCustom();
            });
        });

        // Attach name change listeners
        list.querySelectorAll('.budget-cat-name').forEach(input => {
            input.addEventListener('input', (e) => {
                const idx = parseInt(e.target.dataset.idx);
                budgetCategories[idx].name = e.target.value;
                markCustom();
            });
        });

        // Attach linked categories listeners (pill toggle)
        list.querySelectorAll('.budget-cat-pill').forEach(pill => {
            pill.addEventListener('click', (e) => {
                const idx = parseInt(e.target.dataset.idx);
                const txCat = e.target.dataset.txcat;
                if (!budgetCategories[idx].txCategories) budgetCategories[idx].txCategories = [];
                
                if (budgetCategories[idx].txCategories.includes(txCat)) {
                    budgetCategories[idx].txCategories = budgetCategories[idx].txCategories.filter(c => c !== txCat);
                    e.target.style.background = 'rgba(255,255,255,0.05)';
                    e.target.style.color = 'var(--text-muted)';
                } else {
                    budgetCategories[idx].txCategories.push(txCat);
                    e.target.style.background = 'var(--primary)';
                    e.target.style.color = 'white';
                }
                markCustom();
            });
        });

        // Attach remove listeners
        list.querySelectorAll('.budget-cat-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.dataset.idx);
                budgetCategories.splice(idx, 1);
                renderCategoryRows();
                updatePctIndicator();
                markCustom();
            });
        });

        lucide.createIcons();
    };

    const updatePctIndicator = () => {
        const sum = budgetCategories.reduce((s, c) => s + (parseFloat(c.pct) || 0), 0);
        const indicator = document.getElementById('pct-sum-indicator');
        if (indicator) {
            indicator.textContent = `Total: ${sum}%`;
            if (sum === 100) {
                indicator.style.color = 'var(--success)';
            } else if (sum > 100) {
                indicator.style.color = 'var(--danger)';
            } else {
                indicator.style.color = 'var(--warning)';
            }
        }
    };

    const renderBudgetTable = () => {
        const totalBudget = parseFloat(document.getElementById('custom-budget-total').value) || 0;
        const sum = budgetCategories.reduce((s, c) => s + (parseFloat(c.pct) || 0), 0);

        const validationMsg = document.getElementById('budget-validation-msg');
        if (sum !== 100) {
            if (validationMsg) validationMsg.style.display = 'block';
            return;
        } else {
            if (validationMsg) validationMsg.style.display = 'none';
        }

        const tbody = document.getElementById('budget-comparison-tbody');
        if (!tbody) return;

        const formatMoney = (val) => `₹${Math.abs(val).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}`;
        const formatDiff = (val) => {
            const color = val >= 0 ? 'var(--success)' : 'var(--danger)';
            const sign = val >= 0 ? '+' : '-';
            return `<span style="color: ${color}">${sign}${formatMoney(val)}</span>`;
        };

        let rows = '';
        budgetCategories.forEach((cat, idx) => {
            const ideal = (cat.pct / 100) * totalBudget;
            let actual = 0;
            if (cat.flow === 'investment') {
                actual = allTxs.filter(t => t.flow === 'investment').reduce((s, t) => s + parseFloat(t.amount), 0);
            } else {
                actual = allTxs.filter(t => {
                    const mappedCats = (cat.txCategories || []).map(c => c.toLowerCase());
                    return t.flow === 'expense' && mappedCats.includes((t.category || '').toLowerCase());
                }).reduce((s, t) => s + parseFloat(t.amount), 0);
            }
            const diff = ideal - actual;
            const border = idx < budgetCategories.length - 1 ? 'border-bottom: 1px solid rgba(255,255,255,0.05);' : '';
            rows += `
                <tr style="${border}">
                    <td style="padding: 0.75rem 1rem; color: #fff;">${escapeHTML(cat.name)}</td>
                    <td style="padding: 0.75rem 1rem;">${cat.pct}%</td>
                    <td style="padding: 0.75rem 1rem;">${formatMoney(ideal)}</td>
                    <td style="padding: 0.75rem 1rem;">${formatMoney(actual)}</td>
                    <td style="padding: 0.75rem 1rem;">${formatDiff(diff)}</td>
                </tr>
            `;
        });
        tbody.innerHTML = rows;
    };

    renderCategoryRows();
    updatePctIndicator();
    renderBudgetTable();

    // Apply Plan button
    const applyBtn = document.getElementById('apply-custom-budget');
    if (applyBtn) {
        const newBtn = applyBtn.cloneNode(true);
        applyBtn.parentNode.replaceChild(newBtn, applyBtn);
        newBtn.addEventListener('click', () => {
            renderBudgetTable();
        });
    }

    // Add Category button
    const addCatBtn = document.getElementById('add-budget-category');
    if (addCatBtn) {
        const newAddBtn = addCatBtn.cloneNode(true);
        addCatBtn.parentNode.replaceChild(newAddBtn, addCatBtn);
        newAddBtn.addEventListener('click', () => {
            const remaining = 100 - budgetCategories.reduce((s, c) => s + (parseFloat(c.pct) || 0), 0);
            budgetCategories.push({
                name: 'New Category',
                pct: Math.max(0, remaining),
                txCategories: [],
                flow: 'expense'
            });
            renderCategoryRows();
            updatePctIndicator();
            const dropdown = document.getElementById('budget-rule-preset');
            if (dropdown) dropdown.value = 'custom';
        });
    }

    // Budget Rule Preset Dropdown
    const presetSelect = document.getElementById('budget-rule-preset');
    if (presetSelect) {
        const newPresetSelect = presetSelect.cloneNode(true);
        presetSelect.parentNode.replaceChild(newPresetSelect, presetSelect);
        newPresetSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val !== 'custom' && BUDGET_PRESETS[val]) {
                budgetCategories = JSON.parse(JSON.stringify(BUDGET_PRESETS[val]));
                renderCategoryRows();
                updatePctIndicator();
                renderBudgetTable();
            }
        });
    }

    // Toggle Add Expense form
    const toggleBtn = document.getElementById('toggle-add-expense');
    const formCard = document.getElementById('add-expense-form-card');
    if (toggleBtn && formCard) {
        const newToggle = toggleBtn.cloneNode(true);
        toggleBtn.parentNode.replaceChild(newToggle, toggleBtn);
        newToggle.addEventListener('click', () => {
            formCard.style.display = formCard.style.display === 'none' ? 'block' : 'none';
            lucide.createIcons();
        });
    }

    // Submit Expense handler
    const submitBtn = document.getElementById('submit-expense');
    if (submitBtn) {
        const newSubmit = submitBtn.cloneNode(true);
        submitBtn.parentNode.replaceChild(newSubmit, submitBtn);
        newSubmit.addEventListener('click', () => {
            const desc = document.getElementById('expense-desc').value.trim();
            const amount = parseFloat(document.getElementById('expense-amount').value);
            const category = document.getElementById('expense-category').value;

            if (!desc || !amount || amount <= 0) {
                showToast('Missing Info', 'Please enter a description and a valid amount.', 'warning');
                return;
            }

            const flow = category === 'Income' ? 'income' : category === 'Investments' ? 'investment' : 'expense';
            const newTx = {
                id: 'manual-' + Date.now(),
                description: desc,
                amount: amount,
                category: category,
                flow: flow,
                date: new Date().toISOString().split('T')[0],
                reason: 'Manual Entry',
                tags: [category, 'Manual']
            };
            transactions.push(newTx);

            // Clear the form
            document.getElementById('expense-desc').value = '';
            document.getElementById('expense-amount').value = '';

            showToast('Expense Added', `₹${amount} recorded under ${category}.`, 'success');

            // Re-render the table immediately
            renderBudgetTable();
        });
    }

    lucide.createIcons();
}

// Render ledger database records
function renderLedger(filter = 'all', searchQuery = '') {
    const ledgerBody = document.getElementById('ledger-body');
    ledgerBody.innerHTML = '';

    let list = [...transactions];

    // Filter
    if (filter === 'income') {
        list = list.filter(t => t.flow === 'income');
    } else if (filter === 'expense') {
        list = list.filter(t => t.flow === 'expense');
    } else if (filter === 'investment') {
        list = list.filter(t => t.flow === 'investment');
    } else if (filter === 'categorized') {
        list = list.filter(t => t.category && t.category.toLowerCase() !== 'miscellaneous');
    } else if (filter === 'uncategorized') {
        list = list.filter(t => !t.category || t.category.toLowerCase() === 'miscellaneous');
    }

    // Search query
    if (searchQuery) {
        list = list.filter(t => 
            t.description.toLowerCase().includes(searchQuery) ||
            t.category.toLowerCase().includes(searchQuery) ||
            (t.reason && t.reason.toLowerCase().includes(searchQuery)) ||
            (t.tags && t.tags.some(tag => tag.toLowerCase().includes(searchQuery)))
        );
    }

    if (list.length === 0) {
        ledgerBody.innerHTML = `
            <div style="text-align: center; color: var(--text-muted); padding: 2rem; border-top: 1px solid var(--glass-border); border-bottom: 1px solid var(--glass-border); border-radius: 12px;">
                No matching transaction logs found.
            </div>
        `;
        return;
    }

    let htmlContent = '';
    list.forEach(tx => {
        const amountSign = tx.flow === 'income' ? '+' : '-';
        const amountClass = tx.flow === 'income' ? 'amount-income' : tx.flow === 'investment' ? 'amount-investment' : 'amount-expense';
        const badgeClass = tx.flow === 'income' ? 'badge-income' : tx.flow === 'investment' ? 'badge-investment' : tx.flow === 'expense' ? 'badge-expense' : 'badge-transfer';

        // Reason context label
        const reasonHtml = tx.reason ? `<span class="reason-pill">${escapeHTML(tx.reason)}</span>` : '';
        
        // Tag list
        const tagsHtml = tx.tags ? tx.tags.map(tag => `<span class="badge badge-tag">${escapeHTML(tag)}</span>`).join(' ') : '';

        // Formatted Date
        const dateObj = new Date(tx.date);
        const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        let categoryHtml = '';
        if (!tx.category || tx.category.toLowerCase() === 'miscellaneous') {
            categoryHtml = `
                <select class="category-select" data-id="${tx.id}" style="background: rgba(0,0,0,0.5); border: 1px solid var(--glass-border); color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.85rem; outline: none; cursor: pointer;">
                    <option value="Miscellaneous" selected>Miscellaneous</option>
                    <option value="Income">Income</option>
                    ${budgetCategories.map(bucket => {
                        if (bucket.txCategories && bucket.txCategories.length > 0) {
                            return bucket.txCategories.map(cat => `<option value="${escapeHTML(cat)}">${escapeHTML(cat)}</option>`).join('');
                        } else {
                            return `<option value="${escapeHTML(bucket.name)}">${escapeHTML(bucket.name)}</option>`;
                        }
                    }).join('')}
                    <option value="Other">Other</option>
                </select>
            `;
        } else {
            categoryHtml = `<span class="badge ${badgeClass}">${escapeHTML(tx.category)}</span>`;
        }

        htmlContent += `
            <div class="card reveal" data-no-tilt style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; padding: 1.25rem 1.5rem; margin-bottom: 0.75rem; gap: 1rem; border-radius: 14px;">
                <div style="flex: 0 0 100px; color: var(--text-secondary); font-size: 0.9rem;">
                    ${formattedDate}
                </div>
                <div style="flex: 1 1 200px; display: flex; flex-direction: column; gap: 0.25rem;">
                    <span style="font-weight: 500; font-size: 1.05rem; color: var(--text-primary);">${escapeHTML(tx.description)}</span>
                    ${reasonHtml ? `<div style="margin-top: 0.2rem;">${reasonHtml}</div>` : ''}
                </div>
                <div style="flex: 0 0 auto;">
                    ${categoryHtml}
                </div>
                <div style="flex: 1 1 150px; display: flex; gap: 0.25rem; flex-wrap: wrap;">
                    ${tagsHtml}
                </div>
                <div style="flex: 0 0 120px; text-align: right; font-family: var(--font-heading); font-size: 1.1rem; font-weight: 500;">
                    <span class="${amountClass}">${amountSign}₹${parseFloat(tx.amount).toFixed(2)}</span>
                </div>
            </div>
        `;
    });
    
    ledgerBody.innerHTML = htmlContent;

    // Add event listeners for the inline category dropdowns
    document.querySelectorAll('.category-select').forEach(select => {
        select.addEventListener('change', async (e) => {
            const txId = e.target.getAttribute('data-id');
            const newCategory = e.target.value;
            e.target.disabled = true;
            
            try {
                const res = await fetch(`${API_BASE}/transactions/${txId}/category`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        ...getAuthHeaders()
                    },
                    body: JSON.stringify({ category: newCategory })
                });
                
                if (res.ok) {
                    const data = await res.json();
                    // Update local state
                    const txIndex = transactions.findIndex(t => t.id === txId);
                    if (txIndex !== -1) {
                        transactions[txIndex].category = newCategory;
                    }
                    // Re-render
                    const currentFilter = document.querySelector('#tx-filter-container .active')?.getAttribute('data-filter') || 'all';
                    const currentSearch = document.getElementById('tx-search-input')?.value || '';
                    renderLedger(currentFilter, currentSearch);
                    updateDashboardUI();
    updateCategoryDropdowns(); // update overall dashboard stats
                } else {
                    alert("Failed to update category");
                    e.target.disabled = false;
                }
            } catch (err) {
                console.error(err);
                alert("Error updating category");
                e.target.disabled = false;
            }
        });
    });

    // Re-initialize scroll reveal so dynamically added items animate properly
    setTimeout(() => {
        if (window.triggerReveal) window.triggerReveal();
    }, 50);
}

// Check if any P2P verification is waiting confirmation
function checkPendingConfirmationsInbox() {
    const inbox = document.getElementById('confirmation-inbox');
    const container = document.getElementById('confirmation-pending-list');
    
    if (pendingConfirmations.length === 0) {
        inbox.style.display = 'none';
        return;
    }

    inbox.style.display = 'block';
    container.innerHTML = '';

    let pendingHtml = '';
    pendingConfirmations.forEach((item, index) => {
        pendingHtml += `
            <div class="confirm-question" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.50rem;">
                <span>You transferred <strong>₹${item.amount.toFixed(2)}</strong> to <strong>${item.payee}</strong> on ${item.date}. What was this for?</span>
                <button class="btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" onclick="triggerConfirmationFlow('${item.id}')">
                    <i data-lucide="help-circle"></i> Classify Context
                </button>
            </div>
        `;
    });
    container.innerHTML = pendingHtml;
    
    lucide.createIcons();
}

// Trigger Human Confirmation Modal UI
function triggerConfirmationFlow(txId) {
    activePendingTx = pendingConfirmations.find(item => item.id === txId);
    if (!activePendingTx) return;

    // Reset selectors
    selectedConfirmCategory = null;
    selectedConfirmReason = null;
    document.getElementById('modal-confirm-tags').value = '';
    
    const optionBtns = document.querySelectorAll('.btn-option[data-category]');
    optionBtns.forEach(btn => {
        btn.style.background = 'rgba(255, 255, 255, 0.03)';
        btn.style.borderColor = 'var(--border-color)';
        btn.classList.remove('active-option');
    });

    document.getElementById('modal-confirm-amount').innerText = `₹${activePendingTx.amount.toFixed(2)}`;
    document.getElementById('modal-confirm-payee').innerText = activePendingTx.payee;

    document.getElementById('confirm-modal').classList.add('active');
}

function dismissConfirmationModal() {
    document.getElementById('confirm-modal').classList.remove('active');
    activePendingTx = null;
}

// Complete the confirmation workflow
async function submitP2PConfirmation() {
    if (!activePendingTx) return;

    if (!selectedConfirmCategory) {
        showToast('Selection Required', 'Please choose a category/purpose representing this transaction.', 'warning');
        return;
    }

    const customTagsVal = document.getElementById('modal-confirm-tags').value.trim();
    let userTags = ['P2P'];
    if (customTagsVal) {
        userTags = userTags.concat(customTagsVal.split(',').map(s => s.trim()).filter(Boolean));
    }

    const result = await confirmPendingTransaction(activePendingTx.id, selectedConfirmCategory, selectedConfirmReason, userTags);
    if (!result) {
        showToast('Error', 'Failed to confirm transaction context', 'warning');
        return;
    }

    // Dismiss
    dismissConfirmationModal();

    // Show toast success
    showToast('Context Authenticated', `Saved transfer as ${selectedConfirmCategory} (${selectedConfirmReason})`, 'success');

    // Refresh views
    updateDashboardUI();
    updateCategoryDropdowns();
    renderLedger();
    checkPendingConfirmationsInbox();
    renderOpportunitiesAndSpots();
    renderSpendings();
}

// Opportunities & Blind Spots lists rendering
// Spendings categorized breakdown renderer
// Dynamically build Year and Month selectors based on transaction data
function buildSpendingsFilter() {
    const container = document.getElementById('spendings-filter-container');
    if (!container) return;
    
    if (transactions.length === 0) {
        container.innerHTML = `
            <input type="hidden" id="spendings-year-select" value="${new Date().getFullYear()}">
            <select class="form-input" id="spendings-month-select" style="width: 150px; padding: 0.5rem 0.75rem; font-size: 0.85rem;">
                <option value="${new Date().getMonth()}">No Data</option>
            </select>
        `;
        document.getElementById('spendings-month-select').addEventListener('change', renderSpendings);
        return;
    }
    
    // Extract unique years and months from data
    const availableDates = {};
    transactions.forEach(t => {
        const d = new Date(t.date);
        const y = d.getFullYear();
        const m = d.getMonth();
        if (!availableDates[y]) availableDates[y] = new Set();
        availableDates[y].add(m);
    });
    
    const years = Object.keys(availableDates).map(y => parseInt(y)).sort((a,b) => b - a); // Descending
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    
    // Determine default selected year (most recent year that has data, or current year if it has data)
    let selectedYear = years.includes(currentYear) ? currentYear : years[0];
    
    let html = '';
    
    // If data spans multiple years, show Year dropdown
    if (years.length > 1) {
        html += `<select class="form-input" id="spendings-year-select" style="width: 100px; padding: 0.5rem 0.75rem; font-size: 0.85rem;">`;
        years.forEach(y => {
            html += `<option value="${y}" ${y === selectedYear ? 'selected' : ''}>${y}</option>`;
        });
        html += `</select>`;
    } else {
        // Hidden input just so logic doesn't break
        html += `<input type="hidden" id="spendings-year-select" value="${selectedYear}">`;
    }
    
    // Month dropdown
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    html += `<select class="form-input" id="spendings-month-select" style="width: 150px; padding: 0.5rem 0.75rem; font-size: 0.85rem;"></select>`;
    
    container.innerHTML = html;
    
    const yearSelect = document.getElementById('spendings-year-select');
    const monthSelect = document.getElementById('spendings-month-select');
    
    // Function to populate months based on selected year
    const populateMonths = (year) => {
        const monthsForYear = Array.from(availableDates[year] || []).sort((a,b) => b - a);
        monthSelect.innerHTML = '';
        if (monthsForYear.length === 0) {
            monthSelect.innerHTML = '<option value="">No data</option>';
            return;
        }
        
        let selectedMonth = monthsForYear.includes(currentMonth) && year === currentYear ? currentMonth : monthsForYear[0];
        
        monthsForYear.forEach(m => {
            monthSelect.innerHTML += `<option value="${m}" ${m === selectedMonth ? 'selected' : ''}>${monthNames[m]} ${years.length === 1 ? year : ''}</option>`;
        });
    };
    
    populateMonths(selectedYear);
    
    // Add event listeners
    if (years.length > 1) {
        yearSelect.addEventListener('change', () => {
            populateMonths(parseInt(yearSelect.value));
            renderSpendings();
        });
    }
    
    monthSelect.addEventListener('change', () => {
        renderSpendings();
    });
}

function buildDashboardFilter() {
    const container = document.getElementById('dashboard-filter-container');
    if (!container) return;
    
    if (transactions.length === 0) {
        container.innerHTML = `
            <select class="form-input" id="dashboard-month-select" style="width: 170px; padding: 0.5rem 0.75rem; font-size: 0.85rem;" disabled>
                <option value="none">No Data Available</option>
            </select>
        `;
        return;
    }
    
    // Extract unique years and months from data
    const availableDates = {};
    transactions.forEach(t => {
        const d = new Date(t.date);
        const y = d.getFullYear();
        const m = d.getMonth();
        if (!availableDates[y]) availableDates[y] = new Set();
        availableDates[y].add(m);
    });
    
    const years = Object.keys(availableDates).map(y => parseInt(y)).sort((a,b) => b - a); // Descending
    
    let html = '';
    
    html += `<select class="form-input" id="dashboard-year-select" style="width: 100px; padding: 0.5rem 0.75rem; font-size: 0.85rem;">`;
    years.forEach(y => {
        html += `<option value="${y}">${y}</option>`;
    });
    html += `</select>`;
    
    html += `<select class="form-input" id="dashboard-month-select" style="width: 170px; padding: 0.5rem 0.75rem; font-size: 0.85rem;">`;
    html += `</select>`;
    
    container.innerHTML = html;
    
    const yearSelect = document.getElementById('dashboard-year-select');
    const monthSelect = document.getElementById('dashboard-month-select');
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    const populateMonths = (yearStr) => {
        if (yearStr === 'none') {
            monthSelect.innerHTML = `<option value="none" selected>Select Statement...</option>`;
            return;
        }
        const year = parseInt(yearStr);
        const monthsForYear = Array.from(availableDates[year] || []).sort((a,b) => b - a);
        
        let mHtml = '';
        monthsForYear.forEach(m => {
            mHtml += `<option value="${m}">${monthNames[m]} ${years.length === 1 ? year : ''}</option>`;
        });
        monthSelect.innerHTML = mHtml;
    };
    
    // Auto-select the most recent year
    yearSelect.value = years[0];
    if (years.length === 1) {
        yearSelect.style.display = 'none'; // hide year select if only 1 year
    }
    populateMonths(years[0]);
    
    yearSelect.addEventListener('change', () => {
        populateMonths(yearSelect.value);
        updateDashboardUI();
    updateCategoryDropdowns();
    });
    
    monthSelect.addEventListener('change', () => {
        updateDashboardUI();
    updateCategoryDropdowns();
    });
}

function renderSpendings() {
    const monthSelect = document.getElementById('spendings-month-select');
    const yearSelect = document.getElementById('spendings-year-select');
    
    if (!monthSelect || !yearSelect) return;
    
    const selectedMonth = parseInt(monthSelect.value);
    const year = parseInt(yearSelect.value);
    
    if (isNaN(selectedMonth) || isNaN(year)) return;

    // Filter expense transactions for the selected month and year
    const monthExpenses = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === selectedMonth && d.getFullYear() === year && t.flow === 'expense';
    });

    // Group by category
    const categoryMap = {};
    monthExpenses.forEach(tx => {
        const cat = tx.category || 'Miscellaneous';
        if (!categoryMap[cat]) {
            categoryMap[cat] = { items: [], total: 0 };
        }
        categoryMap[cat].items.push(tx);
        categoryMap[cat].total += parseFloat(tx.amount);
    });

    // Sort categories by total (highest first)
    const sortedCategories = Object.keys(categoryMap).sort((a, b) => categoryMap[b].total - categoryMap[a].total);

    // Total spent
    const totalSpent = monthExpenses.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    document.getElementById('spendings-total-amount').innerText = `₹${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById('spendings-cat-count').innerHTML = `across <strong>${sortedCategories.length}</strong> categories`;

    // Category visual config
    const catConfig = {
        'Food':          { icon: 'utensils',      color: 'var(--danger)',  bg: 'var(--danger-glow)',  border: 'var(--danger)' },
        'Rent':          { icon: 'home',           color: 'var(--primary)', bg: 'var(--primary-glow)', border: 'var(--primary)' },
        'Bills':         { icon: 'file-text',      color: 'var(--purple)',  bg: 'var(--purple-glow)',  border: 'var(--purple)' },
        'Utilities':     { icon: 'zap',            color: 'var(--success)', bg: 'var(--success-glow)', border: 'var(--success)' },
        'Shopping':      { icon: 'shopping-cart',   color: 'var(--warning)', bg: 'var(--warning-glow)', border: 'var(--warning)' },
        'Travel':        { icon: 'map-pin',         color: 'var(--info)',    bg: 'var(--info-glow)',    border: 'var(--info)' },
        'Healthcare':    { icon: 'heart-pulse',     color: '#f43f5e',        bg: 'rgba(244, 63, 94, 0.15)', border: '#f43f5e' },
        'Entertainment': { icon: 'film',            color: 'var(--purple)',  bg: 'var(--purple-glow)',  border: 'var(--purple)' },
        'Education':     { icon: 'graduation-cap',  color: 'var(--info)',    bg: 'var(--info-glow)',    border: 'var(--info)' },
        'Miscellaneous': { icon: 'circle-dot',      color: 'var(--text-muted)', bg: 'rgba(100, 116, 139, 0.15)', border: 'var(--text-muted)' }
    };
    const defaultCfg =  { icon: 'circle',         color: 'var(--text-secondary)', bg: 'rgba(148, 163, 184, 0.1)', border: 'var(--text-secondary)' };

    const container = document.getElementById('spendings-categories-container');
    container.innerHTML = '';

    if (sortedCategories.length === 0) {
        container.innerHTML = `<div class="spending-empty-state"><i data-lucide="inbox" style="margin-bottom: 0.5rem; opacity: 0.4;"></i><br>No spendings recorded for this month.</div>`;
        lucide.createIcons();
        return;
    }

    let catHtml = '';

    sortedCategories.forEach(catName => {
        const cfg = catConfig[catName] || defaultCfg;
        const group = categoryMap[catName];

        // Sort items within category by date descending
        group.items.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Build individual item rows
        let itemsHtml = '';
        group.items.forEach(tx => {
            const dateObj = new Date(tx.date);
            const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const reasonTag = tx.reason ? `<span class="reason-pill">${escapeHTML(tx.reason)}</span>` : '';
            const tagsText = tx.tags ? tx.tags.filter(t => t !== 'P2P').slice(0, 2).join(', ') : '';

            itemsHtml += `
                <div class="spending-item-row">
                    <div class="spending-item-left">
                        <span class="spending-item-name">${escapeHTML(tx.description)}</span>
                        <span class="spending-item-detail">
                            ${formattedDate}
                            ${reasonTag}
                            ${tagsText ? `<span style="opacity:0.5;">· ${tagsText}</span>` : ''}
                        </span>
                    </div>
                    <span class="spending-item-amount">-₹${parseFloat(tx.amount).toFixed(2)}</span>
                </div>
            `;
        });

        const percentOfTotal = totalSpent > 0 ? Math.round((group.total / totalSpent) * 100) : 0;

        catHtml += `
            <div class="card spending-cat-card" style="border-left-color: ${cfg.border};">
                <div class="spending-cat-header">
                    <div class="spending-cat-title">
                        <div class="spending-cat-icon" style="background: ${cfg.bg}; color: ${cfg.color};">
                            <i data-lucide="${cfg.icon}"></i>
                        </div>
                        <div>
                            <div class="spending-cat-name">${catName}</div>
                            <div class="hint-text">${group.items.length} transaction${group.items.length > 1 ? 's' : ''} · ${percentOfTotal}% of total</div>
                        </div>
                    </div>
                    <span class="spending-cat-total" style="color: ${cfg.color};">₹${group.total.toFixed(2)}</span>
                </div>
                <div class="spending-cat-items">
                    ${itemsHtml}
                </div>
            </div>
        `;
    });
    container.innerHTML = catHtml;

    lucide.createIcons();
}

function renderOpportunitiesAndSpots() {
    const opps = detectOpportunities(transactions);
    const spots = detectBlindSpots(transactions);

    const oppsList = document.getElementById('opportunities-list');
    const spotsList = document.getElementById('blindspots-list');

    oppsList.innerHTML = '';
    spotsList.innerHTML = '';

    let oppsHtml = '';
    opps.forEach(o => {
        oppsHtml += `
            <div class="card opp-item-card ${o.borderClass}">
                <div class="opp-item-header">
                    <span class="opp-item-title">${o.title}</span>
                    <span class="opp-item-badge">${o.badge}</span>
                </div>
                <p class="opp-item-desc">${o.desc}</p>
                <button class="opp-action-btn" onclick="executeOpportunityAction('${o.id}')">${o.actionText}</button>
            </div>
        `;
    });
    oppsList.innerHTML = oppsHtml;

    let spotsHtml = '';
    spots.forEach(s => {
        spotsHtml += `
            <div class="card opp-item-card ${s.borderClass}">
                <div class="opp-item-header">
                    <span class="opp-item-title" style="color: var(--warning);">${s.title}</span>
                    <span class="opp-item-badge">${s.badge}</span>
                </div>
                <p class="opp-item-desc">${s.desc}</p>
                <button class="opp-action-btn" onclick="executeOpportunityAction('${s.id}')">${s.actionText}</button>
            </div>
        `;
    });
    spotsList.innerHTML = spotsHtml;
}

function executeOpportunityAction(id) {
    if (id === 'opp-sip-increase') {
        switchTab('sandbox');
        // Preset sandbox slider value
        document.getElementById('slider-invest').value = 100;
        updateSandboxValues();
        runSandboxSimulation();
        showToast('Model Settings Synced', 'Adjusted slider to micro-investment increase sandbox.', 'info');
    } else if (id === 'spot-sub-creep') {
        showToast('Paused Hulu subscription', 'Simulation simulated. Check checking account surplus next month!', 'success');
        // Remove Hulu items or simulate saving
    } else {
        showToast('Simulated Action', 'Action executed successfully.', 'success');
    }
}

// Notification Toast Generator
function showToast(title, desc, type = 'success') {
    const container = document.getElementById('notification-center');
    const id = `toast-${Date.now()}`;

    let icon = 'info';
    let iconColor = 'var(--primary)';
    if (type === 'success') {
        icon = 'check-circle';
        iconColor = 'var(--success)';
    } else if (type === 'warning') {
        icon = 'alert-triangle';
        iconColor = 'var(--warning)';
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.id = id;
    toast.innerHTML = `
        <div class="toast-icon" style="color: ${iconColor};">
            <i data-lucide="${icon}"></i>
        </div>
        <div class="toast-body">
            <div class="toast-title">${title}</div>
            <div class="toast-desc">${desc}</div>
        </div>
        <div class="toast-close" onclick="document.getElementById('${id}').classList.remove('show')">
            <i data-lucide="x"></i>
        </div>
    `;

    container.appendChild(toast);
    lucide.createIcons();

    // Trigger transition
    setTimeout(() => {
        toast.classList.add('show');
    }, 50);

    // Auto dismiss after 4.5s
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 4500);
}

// Simulated preset inputs
async function simulatePreset(type) {
    document.getElementById('simulator-modal').classList.remove('active');
    
    let result = null;
    if (type === 'amazon') {
        result = await processNewFeedTransaction('Amazon.com Shopping Order', 45.00, 'expense');
    } else if (type === 'salary') {
        result = await processNewFeedTransaction('Corporate Salary Deposit paycheck', 4500.00, 'income');
    } else if (type === 'netflix') {
        result = await processNewFeedTransaction('Netflix.com monthly plan', 15.49, 'expense');
    } else if (type === 'mutualfund') {
        result = await processNewFeedTransaction('Fidelity SIP buying Index ETF', 500.00, 'investment');
    } else if (type === 'rent') {
        result = await processNewFeedTransaction('Rent transfer to Landlord Mark Green', 1200.00, 'expense');
    } else if (type === 'friend') {
        result = await processNewFeedTransaction('Split payment to Sarah Connor for lunch', 25.00, 'expense');
    }

    handleSimulationResult(result);
}

// Custom Simulation flow form
async function handleCustomSimulation() {
    const desc = document.getElementById('sim-desc').value.trim();
    const amount = document.getElementById('sim-amount').value;
    const flow = document.getElementById('sim-flow').value;

    document.getElementById('simulator-modal').classList.remove('active');
    
    const result = await processNewFeedTransaction(desc, amount, flow);
    
    // Clear inputs
    document.getElementById('sim-desc').value = '';
    document.getElementById('sim-amount').value = '';

    handleSimulationResult(result);
}

function handleSimulationResult(result) {
    if (!result) return;

    if (result.status === 'needs_confirmation') {
        showToast('Context Alert', result.message, 'warning');
        // If they are on the Transactions tab, trigger modal instantly to showcase frictionless workflow
        const currentActive = document.querySelector('.page-section.active').id;
        if (currentActive === 'split-expenses') {
            triggerConfirmationFlow(result.item.id);
        } else {
            // Flash warning tab indicator
            showToast('Verification Queued', 'Check the Split Expenses tab to classify this P2P split.', 'warning');
        }
    } else if (result.status === 'auto_classified') {
        showToast('Auto-Classified', result.message, 'success');
        updateDashboardUI();
    updateCategoryDropdowns();
        renderLedger();
        renderOpportunitiesAndSpots();
        renderSpendings();
    }
}

// Sandbox Simulation Projections UI
function initSandboxChart() {
    const canvas = document.getElementById('sandboxChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    sandboxChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Hypothetical Plan',
                    data: [],
                    borderColor: '#7c5cfc',
                    borderWidth: 2,
                    pointBackgroundColor: '#7c5cfc',
                    pointRadius: 2,
                    fill: false,
                    tension: 0.2
                },
                {
                    label: 'Current Path',
                    data: [],
                    borderColor: '#464e5e',
                    borderDash: [5, 5],
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: false,
                    tension: 0.2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#ffffff', font: { size: 10 } } }
            },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#ffffff' } },
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#ffffff' } }
            }
        }
    });
}

function updateSandboxValues() {
    const sliderInvestEl = document.getElementById('slider-invest');
    if (!sliderInvestEl) return;
    const invest = sliderInvestEl.value;
    const dining = document.getElementById('slider-dining').value;
    const bonus = document.getElementById('slider-bonus').value;
    const debt = document.getElementById('slider-debt').value;

    const valInvest = document.getElementById('val-invest');
    const valDining = document.getElementById('val-dining');
    const valBonus = document.getElementById('val-bonus');
    const valDebt = document.getElementById('val-debt');
    if (valInvest) valInvest.innerText = `+₹${invest}`;
    if (valDining) valDining.innerText = `${dining}%`;
    if (valBonus) valBonus.innerText = `${bonus}%`;
    if (valDebt) valDebt.innerText = debt === '0' ? 'No change' : `+₹${debt}/mo`;
}

function runSandboxSimulation() {
    const sliderInvest = document.getElementById('slider-invest');
    if (!sliderInvest) return; // Exit if sandbox UI doesn't exist

    const params = {
        addInvest: parseFloat(sliderInvest.value),
        reduceFoodPct: parseFloat(document.getElementById('slider-dining').value),
        investBonusPct: parseFloat(document.getElementById('slider-bonus').value),
        extraDebtPay: parseFloat(document.getElementById('slider-debt').value)
    };

    const results = calculateWhatIfProjections(params);

    // Update Text Output Summary
    const summaryText = document.getElementById('sandbox-summary-text');
    if (summaryText) summaryText.innerHTML = results.summary;
    lucide.createIcons();

    // Update Chart
    if (sandboxChartInstance) {
        sandboxChartInstance.data.labels = results.labels;
        sandboxChartInstance.data.datasets[0].data = results.hypothetical;
        sandboxChartInstance.data.datasets[1].data = results.baseline;
        sandboxChartInstance.update();
    }
}

// ──────── SCROLL REVEAL OBSERVER ────────
let scrollObserverInstance = null;

function initScrollReveal() {
    if (scrollObserverInstance) return; // Prevent multiple initializations!
    const REVEAL_SELECTORS = '.reveal, .reveal-left, .reveal-scale';

    scrollObserverInstance = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        root: null,
        rootMargin: '0px 0px -20px 0px',
        threshold: 0.01
    });

    // Immediately reveal everything currently visible in the active tab
    function revealActiveTab() {
        const activeSection = document.querySelector('.page-section.active');
        if (!activeSection) return;

        const elements = activeSection.querySelectorAll(REVEAL_SELECTORS);
        elements.forEach((el, i) => {
            // Stagger the visibility for a smooth cascade effect
            setTimeout(() => {
                el.classList.add('visible');
            }, i * 15);
        });
    }

    // Observe all reveal elements for scroll-triggered appearance
    function observeAll() {
        document.querySelectorAll(REVEAL_SELECTORS).forEach(el => {
            if (!el.classList.contains('visible')) {
                scrollObserverInstance.observe(el);
            }
        });
    }

    // Expose trigger logic to be called manually on tab switch or dynamic render
    window.triggerReveal = function() {
        // Give the DOM time to settle
        setTimeout(() => {
            const activeSection = document.querySelector('.page-section.active');
            if (!activeSection) return;

            const elements = activeSection.querySelectorAll(REVEAL_SELECTORS);
            elements.forEach(el => {
                scrollObserverInstance.unobserve(el);
            });

            // Force a reflow so the observer sees fresh positions
            void activeSection.offsetHeight;

            elements.forEach(el => {
                if (!el.classList.contains('visible')) {
                    scrollObserverInstance.observe(el);
                }
            });

            revealActiveTab();
        }, 50);
    };

    // Initial reveal on page load
    revealActiveTab();
    observeAll();

    // Also handle scroll for main content  
    window.addEventListener('scroll', () => {
        observeAll();
    }, { passive: true });

    // ── 3D CARD TILT ON MOUSE MOVE ──
    init3DCardTilt();

    // ── CURSOR GLOW FOLLOWER ──
    initCursorGlow();

    // ── PARALLAX SCROLL DEPTH ──
    initParallaxScroll();

    // ── NAVBAR SCROLL EFFECT ──
    initNavbarScroll();

    // ── NEW 3D SYSTEMS ──
    init3DFlipCards();
    initAmbientParticles();
    initDepthOfField();
    initFloatingElements();
}

// ──────── 3D CARD TILT ON MOUSE HOVER — PREMIUM ────────
function init3DCardTilt() {
    const cards = document.querySelectorAll('.card');

    cards.forEach(card => {
        // Avoid duplicate listeners by checking a flag
        if (card._tiltInit) return;
        
        // Skip cards that have the data-no-tilt attribute
        if (card.hasAttribute('data-no-tilt')) return;

        card._tiltInit = true;

        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            // Subtle tilt — max 3 degrees
            const tiltX = ((y - centerY) / centerY) * -2.5;
            const tiltY = ((x - centerX) / centerX) * 2.5;

            card.style.transform = `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateZ(10px) translateY(-4px)`;
            card.style.transition = 'transform 0.1s linear';

            // Move the glass reflection to follow cursor
            const percentX = (x / rect.width) * 100;
            const percentY = (y / rect.height) * 100;
            card.style.background = `radial-gradient(circle at ${percentX}% ${percentY}%, rgba(255,255,255,0.06), rgba(255,255,255,0.025) 50%)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
            card.style.transition = 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
            card.style.background = '';
        });
    });
}

// ──────── CURSOR GLOW FOLLOWER ────────
function initCursorGlow() {
    const glow = document.createElement('div');
    glow.className = 'cursor-glow';
    document.body.appendChild(glow);

    let glowX = 0, glowY = 0;
    let targetX = 0, targetY = 0;

    document.addEventListener('mousemove', (e) => {
        targetX = e.clientX;
        targetY = e.clientY;
    });

    // Smooth animation loop for glow following
    function animateGlow() {
        glowX += (targetX - glowX) * 0.4;
        glowY += (targetY - glowY) * 0.4;
        glow.style.left = glowX + 'px';
        glow.style.top = glowY + 'px';
        requestAnimationFrame(animateGlow);
    }
    animateGlow();
}

// ──────── PARALLAX SCROLL DEPTH ────────
function initParallaxScroll() {
    let ticking = false;

    // Apply parallax scene class to main content
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.classList.add('parallax-scene');
    }

    function onScroll() {
        if (!ticking) {
            requestAnimationFrame(() => {
                const scrollY = window.scrollY;

                // Deep Parallax - Background Layer (Grid, Particles)
                document.querySelectorAll('.grid-floor-container, .particle-container').forEach(el => {
                    el.style.transform = `translateY(${scrollY * 0.15}px)`;
                });

                // Deep Parallax - Midground Layer (Floating 3D Elements)
                document.querySelectorAll('.floating-3d-elements').forEach(el => {
                    el.style.transform = `translateY(${scrollY * 0.08}px)`;
                });

                // Parallax the hero text
                document.querySelectorAll('.page-hero-text').forEach(el => {
                    const speed = 0.3;
                    el.style.transform = `translateX(-50%) translateY(${scrollY * speed}px)`;
                });

                // Subtle parallax on floating orbs
                document.querySelectorAll('.floating-orb').forEach((orb, i) => {
                    const speed = 0.05 + (i * 0.03);
                    orb.style.transform = `translateY(${scrollY * speed}px)`;
                });

                // Cards get a subtle depth shift on scroll
                const activeSection = document.querySelector('.page-section.active');
                if (activeSection) {
                    activeSection.querySelectorAll('.card.visible').forEach((card, i) => {
                        const rect = card.getBoundingClientRect();
                        const viewportCenter = window.innerHeight / 2;
                        const cardCenter = rect.top + rect.height / 2;
                        const distance = (cardCenter - viewportCenter) / viewportCenter;
                        
                        // Only apply parallax if not being tilt-hovered
                        if (!card.matches(':hover')) {
                            const subtleY = distance * 5;
                            card.style.transform = `translateY(${subtleY}px)`;
                        }
                    });
                }

                ticking = false;
            });
            ticking = true;
        }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
}

// ──────── NAVBAR SCROLL EFFECT ────────
function initNavbarScroll() {
    const navbar = document.getElementById('top-navbar');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.scrollY;

        if (currentScroll > 100) {
            navbar.style.background = 'rgba(5, 5, 7, 0.95)';
            navbar.style.boxShadow = '0 4px 40px rgba(0, 0, 0, 0.7)';
        } else {
            navbar.style.background = 'rgba(8, 8, 12, 0.75)';
            navbar.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.5)';
        }

        lastScroll = currentScroll;
    }, { passive: true });
}

// ──────── ANIMATED NUMBER COUNTING ────────
function animateStatValue(elementId, targetValue, prefix = '', useCommas = false, suffix = '') {
    const el = document.getElementById(elementId);
    if (!el) return;

    const duration = 1200;
    const startTime = performance.now();
    const startValue = 0;

    // Add pop animation class
    el.classList.add('counting');
    setTimeout(() => el.classList.remove('counting'), 700);

    function easeOutExpo(t) {
        return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    }

    function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easeOutExpo(progress);
        const currentValue = startValue + (targetValue - startValue) * easedProgress;

        if (useCommas) {
            el.innerText = `${prefix}${Math.round(currentValue).toLocaleString()}${suffix}`;
        } else {
            el.innerText = `${prefix}${Math.round(currentValue)}${suffix}`;
        }

        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        } else {
            // Final value with proper formatting
            if (useCommas) {
                el.innerText = `${prefix}${targetValue.toLocaleString()}${suffix}`;
            } else {
                el.innerText = `${prefix}${targetValue}${suffix}`;
            }
        }
    }

    requestAnimationFrame(updateCounter);
}

// ──────── 3D FLIP CARDS ────────
function init3DFlipCards() {
    const flipCards = document.querySelectorAll('.flip-card-3d');
    flipCards.forEach(card => {
        // Prevent multiple click bindings on re-init
        if (card._flipInit) return;
        card._flipInit = true;
        
        card.addEventListener('click', () => {
            card.classList.toggle('flipped');
        });
    });
}

// ──────── AMBIENT PARTICLE SYSTEM ────────
function initAmbientParticles() {
    const container = document.getElementById('particle-container');
    if (!container || container.children.length > 0) return; // Prevent duplicate generation

    const particleCount = 40;
    
    for (let i = 0; i < particleCount; i++) {
        createParticle(container);
    }
}

function createParticle(container) {
    const particle = document.createElement('div');
    particle.className = 'particle' + (Math.random() > 0.8 ? ' large' : '');
    
    // Random start positions
    const startX = Math.random() * 100;
    const startY = Math.random() * 100;
    
    // Random drift targets
    const driftX = (Math.random() - 0.5) * 400 + 'px';
    const driftY = (Math.random() - 0.5) * 400 - 400 + 'px'; // Tend to drift up
    const driftZ = (Math.random() - 0.5) * 200 + 'px';
    
    particle.style.left = startX + 'vw';
    particle.style.top = startY + 'vh';
    
    particle.style.setProperty('--drift-x', driftX);
    particle.style.setProperty('--drift-y', driftY);
    particle.style.setProperty('--drift-z', driftZ);
    
    // Random timing
    const duration = 10 + Math.random() * 20; // 10s to 30s
    const delay = Math.random() * 10;
    
    particle.style.animationDuration = duration + 's';
    particle.style.animationDelay = delay + 's';
    
    container.appendChild(particle);

    // Recreate particle when it finishes
    particle.addEventListener('animationend', () => {
        particle.remove();
        createParticle(container);
    });
}

// ──────── DEPTH OF FIELD BLUR ────────
function initDepthOfField() {
    let ticking = false;
    
    // Initialize layers
    document.querySelectorAll('.card, .page-title, .subtitle').forEach(el => {
        el.classList.add('dof-layer');
    });

    function onScroll() {
        if (!ticking) {
            requestAnimationFrame(() => {
                const viewportCenter = window.innerHeight / 2;
                const maxDistance = window.innerHeight * 1.2; // Distance for max blur

                document.querySelectorAll('.dof-layer').forEach(el => {
                    const rect = el.getBoundingClientRect();
                    const elCenter = rect.top + rect.height / 2;
                    const distance = Math.abs(elCenter - viewportCenter);
                    
                    // Remove all classes first
                    el.classList.remove('dof-near', 'dof-mid', 'dof-far');
                    
                    // Assign class based on distance from center
                    if (distance < maxDistance * 0.3) {
                        el.classList.add('dof-near');
                    } else if (distance < maxDistance * 0.6) {
                        el.classList.add('dof-mid');
                    } else {
                        el.classList.add('dof-far');
                    }
                });

                ticking = false;
            });
            ticking = true;
        }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    // Trigger once on load
    onScroll();
}

// ──────── FLOATING ELEMENT MOUSE REACTIVITY ────────
function initFloatingElements() {
    const elements = document.querySelectorAll('.float-element');
    
    document.addEventListener('mousemove', (e) => {
        const mouseX = e.clientX / window.innerWidth - 0.5;
        const mouseY = e.clientY / window.innerHeight - 0.5;
        
        elements.forEach((el, index) => {
            // Different elements react with different intensity
            const intensity = (index % 3 + 1) * 30;
            const shiftX = mouseX * intensity;
            const shiftY = mouseY * intensity;
            
            // We use margin to shift them so it doesn't interfere with their CSS transform animation
            el.style.marginLeft = `${shiftX}px`;
            el.style.marginTop = `${shiftY}px`;
            el.style.transition = 'margin 0.5s cubic-bezier(0.25, 0.1, 0.25, 1)';
        });
    });
}

// ==========================================
// REVIEW MODAL LOGIC
// ==========================================
function openReviewModal() {
    document.getElementById('review-modal').classList.add('active');
    document.getElementById('review-rating').value = '0';
    document.getElementById('review-text').value = '';
    document.getElementById('review-rating-label').textContent = 'Select a rating';
    document.querySelectorAll('.review-star').forEach(s => s.classList.remove('active'));
    lucide.createIcons();
}

function closeReviewModal() {
    document.getElementById('review-modal').classList.remove('active');
}

document.querySelectorAll('.review-star').forEach(star => {
    star.addEventListener('click', function() {
        const rating = parseInt(this.getAttribute('data-value'));
        document.getElementById('review-rating').value = rating;
        
        // Update label
        const labels = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
        document.getElementById('review-rating-label').textContent = labels[rating - 1] || 'Select a rating';
        
        // Color stars
        document.querySelectorAll('.review-star').forEach(s => {
            if (parseInt(s.getAttribute('data-value')) <= rating) {
                s.classList.add('active');
            } else {
                s.classList.remove('active');
            }
        });
    });
});

async function submitReview() {
    const rating = parseInt(document.getElementById('review-rating').value);
    const review_text = document.getElementById('review-text').value.trim();

    if (rating === 0) {
        showToast('Please select a star rating.', 'error');
        return;
    }
    if (!review_text) {
        showToast('Please write a review.', 'error');
        return;
    }

    try {
        const res = await fetch('https://expense-tracker-prajwal11.vercel.app/api/reviews', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            },
            body: JSON.stringify({ rating, review_text })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to submit review');

        showToast('Review submitted successfully! Thank you!', 'success');
        closeReviewModal();
    } catch (err) {
        showToast(err.message, 'error');
    }
}
