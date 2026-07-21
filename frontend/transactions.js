// Manmo AI — Transaction Ledger & API Interface

let transactions = [];
let pendingConfirmations = [];

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:8000/api' 
    : '/api';

function getAuthHeaders(baseHeaders = {}) {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return baseHeaders;
    }
    return { ...baseHeaders, 'Authorization': `Bearer ${token}` };
}

async function fetchInitialData() {
    if (localStorage.getItem('hasDataUploaded') === 'false' && localStorage.getItem('user')) {
        // If explicitly set to false locally, skip fetch to speed up empty state loading
        // However, if we just logged in, we must fetch to check server state.
    }

    try {
        const response = await fetch(`${API_BASE}/transactions`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();
        transactions = data.transactions;
        pendingConfirmations = data.pendingConfirmations;
        
        // Sync local UI state with server truth so data persists across logins/devices
        if (transactions && transactions.length > 0) {
            localStorage.setItem('hasDataUploaded', 'true');
        } else {
            localStorage.setItem('hasDataUploaded', 'false');
        }
        
        return true;
    } catch (e) {
        console.error("Failed to connect to backend:", e);
        return false;
    }
}

async function processNewFeedTransaction(desc, amount, direction) {
    try {
        const response = await fetch(`${API_BASE}/transactions/simulate`, {
            method: 'POST',
            headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({
                description: desc,
                amount: amount,
                flow: direction
            })
        });
        const data = await response.json();
        
        // Refresh local state after mutation
        await fetchInitialData();
        return data;
    } catch (e) {
        console.error("Simulation failed:", e);
        return null;
    }
}

async function confirmPendingTransaction(txId, category, reason, tags) {
    try {
        const response = await fetch(`${API_BASE}/transactions/confirm`, {
            method: 'POST',
            headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({
                id: txId,
                category: category,
                reason: reason,
                tags: tags
            })
        });
        const data = await response.json();
        
        // Refresh local state after mutation
        await fetchInitialData();
        return data;
    } catch (e) {
        console.error("Confirmation failed:", e);
        return null;
    }
}
