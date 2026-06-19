from flask import Flask, jsonify, request
from flask_cors import CORS
import time
import random
from datetime import datetime

app = Flask(__name__)
CORS(app)

AUTO_MERCHANTS = [
    { 'name': 'Netflix', 'category': 'Bills', 'reason': 'Subscription', 'tags': ['Entertainment', 'Subscription'], 'match': ['netflix'] },
    { 'name': 'Spotify', 'category': 'Bills', 'reason': 'Subscription', 'tags': ['Entertainment', 'Subscription'], 'match': ['spotify'] },
    { 'name': 'Amazon Prime', 'category': 'Bills', 'reason': 'Subscription', 'tags': ['Shopping', 'Subscription'], 'match': ['prime', 'amazon prime'] },
    { 'name': 'Hulu', 'category': 'Bills', 'reason': 'Subscription', 'tags': ['Entertainment', 'Subscription'], 'match': ['hulu'] },
    { 'name': 'Whole Foods', 'category': 'Food', 'reason': 'Groceries', 'tags': ['Food', 'Essentials'], 'match': ['whole foods', 'wholefoods'] },
    { 'name': 'DoorDash', 'category': 'Food', 'reason': 'Dinner Split', 'tags': ['Food', 'Dining'], 'match': ['doordash'] },
    { 'name': 'UberEats', 'category': 'Food', 'reason': 'Lunch Order', 'tags': ['Food', 'Dining'], 'match': ['ubereats'] },
    { 'name': 'Starbucks', 'category': 'Food', 'reason': 'Coffee Coffee', 'tags': ['Food', 'Discretionary'], 'match': ['starbucks'] },
    { 'name': 'McDonalds', 'category': 'Food', 'reason': 'Quick Meal', 'tags': ['Food', 'Discretionary'], 'match': ['mcdonald'] },
    { 'name': 'Uber', 'category': 'Travel', 'reason': 'Cab Split', 'tags': ['Travel', 'Commute'], 'match': ['uber ride', 'uber.com'] },
    { 'name': 'Lyft', 'category': 'Travel', 'reason': 'Cab Split', 'tags': ['Travel', 'Commute'], 'match': ['lyft'] },
    { 'name': 'Chevron', 'category': 'Travel', 'reason': 'Fuel Refill', 'tags': ['Travel', 'Essentials'], 'match': ['chevron', 'shell gas'] },
    { 'name': 'Amazon Shopping', 'category': 'Shopping', 'reason': 'Retail Purchase', 'tags': ['Shopping', 'Discretionary'], 'match': ['amazon.com', 'amazon shopping'] },
    { 'name': 'Target', 'category': 'Shopping', 'reason': 'Household Items', 'tags': ['Shopping', 'Essentials'], 'match': ['target store', 'target.com'] },
    { 'name': 'Zara', 'category': 'Shopping', 'reason': 'Clothing', 'tags': ['Shopping', 'Discretionary'], 'match': ['zara'] },
    { 'name': 'Best Buy', 'category': 'Shopping', 'reason': 'Electronics', 'tags': ['Shopping', 'Discretionary'], 'match': ['best buy', 'bestbuy'] },
    { 'name': 'Fidelity SIP', 'category': 'Investments', 'reason': 'Index Funds', 'tags': ['Investments', 'Wealth'], 'match': ['fidelity', 'vanguard'] },
    { 'name': 'Robinhood', 'category': 'Investments', 'reason': 'Stock Buy', 'tags': ['Investments', 'Wealth'], 'match': ['robinhood'] },
    { 'name': 'PPF Deposit', 'category': 'Investments', 'reason': 'Retirement Build', 'tags': ['Investments', 'Retirement'], 'match': ['ppf deposit', 'nps contribution'] },
    { 'name': 'PG&E Power', 'category': 'Utilities', 'reason': 'Electricity Bill', 'tags': ['Utilities', 'Essentials'], 'match': ['pg&e', 'pge utility'] },
    { 'name': 'Comcast Broadband', 'category': 'Utilities', 'reason': 'Internet Bill', 'tags': ['Utilities', 'Essentials'], 'match': ['comcast', 'xfinity'] },
    { 'name': 'AT&T Wireless', 'category': 'Utilities', 'reason': 'Cell Service', 'tags': ['Utilities', 'Essentials'], 'match': ['at&t', 't-mobile'] }
]

HUMAN_NAMES = ['Sarah', 'John', 'David', 'Emma', 'Michael', 'Mark', 'Chris', 'Alex', 'Jessica', 'Ryan', 'Lisa', 'Conner', 'Green', 'Mercer', 'Amanda', 'Robert', 'Daniel', 'Sophia']

def generate_seed_transactions():
    lst = []
    months = [
        {'name': 'January', 'num': 0}, {'name': 'February', 'num': 1}, 
        {'name': 'March', 'num': 2}, {'name': 'April', 'num': 3}, 
        {'name': 'May', 'num': 4}, {'name': 'June', 'num': 5}
    ]

    for m in months:
        year = 2026
        month_str = f"{m['num'] + 1:02d}"

        # Income
        lst.append({'id': f"seed-sal-{m['num']}", 'date': f"{year}-{month_str}-01", 'description': 'Corporate Salary Deposit', 'category': 'Income', 'flow': 'income', 'amount': 4500.00, 'reason': 'Monthly Paycheck', 'tags': ['Income', 'Office']})
        # Rent
        lst.append({'id': f"seed-rent-{m['num']}", 'date': f"{year}-{month_str}-02", 'description': 'Housing Group Landlord Pay', 'category': 'Rent', 'flow': 'expense', 'amount': 1200.00, 'reason': 'Apartment rent', 'tags': ['Rent', 'Essentials']})
        # SIP
        lst.append({'id': f"seed-sip-{m['num']}", 'date': f"{year}-{month_str}-05", 'description': 'Fidelity Mutual Fund SIP', 'category': 'Investments', 'flow': 'investment', 'amount': 800.00, 'reason': 'Index Fund SIP', 'tags': ['Investments', 'Consistency']})
        # Stock
        lst.append({'id': f"seed-stock-{m['num']}", 'date': f"{year}-{month_str}-08", 'description': 'Vanguard Index ETF Buy', 'category': 'Investments', 'flow': 'investment', 'amount': 500.00, 'reason': 'Wealth SIP', 'tags': ['Investments', 'Equities']})
        # Utils
        lst.append({'id': f"seed-util-pge-{m['num']}", 'date': f"{year}-{month_str}-10", 'description': 'PG&E Power Utility', 'category': 'Utilities', 'flow': 'expense', 'amount': round(85.00 + random.random() * 20, 2), 'reason': 'Electricity Bill', 'tags': ['Utilities', 'Bills']})
        lst.append({'id': f"seed-util-comcast-{m['num']}", 'date': f"{year}-{month_str}-12", 'description': 'Comcast Broadband Network', 'category': 'Utilities', 'flow': 'expense', 'amount': 60.00, 'reason': 'Internet Access', 'tags': ['Utilities', 'Bills']})
        # Subs
        lst.append({'id': f"seed-sub-netflix-{m['num']}", 'date': f"{year}-{month_str}-15", 'description': 'Netflix Entertainment', 'category': 'Bills', 'flow': 'expense', 'amount': 15.49, 'reason': 'Video Streaming Subscription', 'tags': ['Entertainment', 'Subscription']})
        lst.append({'id': f"seed-sub-spotify-{m['num']}", 'date': f"{year}-{month_str}-16", 'description': 'Spotify Music Premium', 'category': 'Bills', 'flow': 'expense', 'amount': 14.99, 'reason': 'Music Streaming Subscription', 'tags': ['Entertainment', 'Subscription']})
        # Groceries
        lst.append({'id': f"seed-gro-1-{m['num']}", 'date': f"{year}-{month_str}-04", 'description': 'Whole Foods Market', 'category': 'Food', 'flow': 'expense', 'amount': round(110.00 + random.random() * 30, 2), 'reason': 'Weekly Groceries', 'tags': ['Food', 'Essentials']})
        lst.append({'id': f"seed-gro-2-{m['num']}", 'date': f"{year}-{month_str}-18", 'description': 'Whole Foods Market', 'category': 'Food', 'flow': 'expense', 'amount': round(95.00 + random.random() * 40, 2), 'reason': 'Weekly Groceries', 'tags': ['Food', 'Essentials']})
        # Dining
        lst.append({'id': f"seed-dine-1-{m['num']}", 'date': f"{year}-{month_str}-06", 'description': 'DoorDash Delivery', 'category': 'Food', 'flow': 'expense', 'amount': round(32.50 + random.random() * 15, 2), 'reason': 'Weekend Takeout', 'tags': ['Food', 'Dining']})
        lst.append({'id': f"seed-dine-2-{m['num']}", 'date': f"{year}-{month_str}-22", 'description': 'Starbucks Coffee', 'category': 'Food', 'flow': 'expense', 'amount': round(5.80 + random.random() * 8, 2), 'reason': 'Work Morning Coffee', 'tags': ['Food', 'Discretionary']})
        # Shop
        lst.append({'id': f"seed-shop-1-{m['num']}", 'date': f"{year}-{month_str}-14", 'description': 'Amazon.com Shopping', 'category': 'Shopping', 'flow': 'expense', 'amount': round(45.00 + random.random() * 80, 2), 'reason': 'Household Goods', 'tags': ['Shopping', 'Discretionary']})
        # P2P
        lst.append({'id': f"seed-p2p-sarah-{m['num']}", 'date': f"{year}-{month_str}-25", 'description': 'Transfer to Sarah Connor', 'category': 'Food', 'flow': 'expense', 'amount': 35.00, 'reason': 'Dinner Split', 'tags': ['Friend', 'P2P']})
        
        if m['num'] == 1:
            lst.append({'id': f"seed-event-health", 'date': '2026-02-14', 'description': 'CVS Pharmacy Prescription', 'category': 'Healthcare', 'flow': 'expense', 'amount': 72.00, 'reason': 'Cold Medication', 'tags': ['Healthcare']})
        if m['num'] == 4:
            lst.append({'id': f"seed-event-trip-1", 'date': '2026-05-12', 'description': 'Delta Air Lines Ticket', 'category': 'Travel', 'flow': 'expense', 'amount': 320.00, 'reason': 'Las Vegas Vacation Flight', 'tags': ['Travel', 'Vacation', 'Trip']})
            lst.append({'id': f"seed-event-trip-2", 'date': '2026-05-15', 'description': 'MGM Grand Las Vegas Hotel', 'category': 'Entertainment', 'flow': 'expense', 'amount': 450.00, 'reason': 'Hotel Accommodation', 'tags': ['Entertainment', 'Vacation', 'Trip']})

    return sorted(lst, key=lambda x: x['date'], reverse=True)

# Global State
transactions = generate_seed_transactions()
pending_confirmations = [
    {
        'id': 'p2p-pending-initial',
        'date': datetime.now().strftime("%Y-%m-%d"),
        'description': 'Payment to Mark Green',
        'flow': 'expense',
        'amount': 55.00,
        'payee': 'Mark Green'
    }
]

def auto_classify_merchant(description):
    clean_desc = description.lower()
    for merchant in AUTO_MERCHANTS:
        for keyword in merchant['match']:
            if keyword in clean_desc:
                return {
                    'category': merchant['category'],
                    'reason': merchant['reason'],
                    'tags': list(merchant['tags']),
                    'merchantName': merchant['name']
                }
    return None

def check_is_p2p(description, flow):
    if flow != 'expense':
        return False
    clean_desc = description.lower()
    matches_keyword = any(k in clean_desc for k in ['transfer to', 'send to', 'payment to', 'split with', 'split', 'pay to'])
    matches_name = any(n.lower() in clean_desc for n in HUMAN_NAMES)
    is_known = auto_classify_merchant(description) is not None
    return not is_known and (matches_keyword or matches_name)

@app.route('/api/transactions', methods=['GET'])
def get_transactions():
    return jsonify({
        'transactions': transactions,
        'pendingConfirmations': pending_confirmations
    })

@app.route('/api/transactions/simulate', methods=['POST'])
def simulate_transaction():
    data = request.json
    desc = data.get('description', '')
    amount = float(data.get('amount', 0))
    direction = data.get('flow', 'expense')
    
    date_str = datetime.now().strftime("%Y-%m-%d")
    new_tx_id = f"sim-tx-{int(time.time()*1000)}"
    
    if check_is_p2p(desc, direction):
        payee_name = desc
        for n in HUMAN_NAMES:
            if n.lower() in desc.lower():
                payee_name = n
        if payee_name == desc and desc.lower().startswith('transfer to '):
            payee_name = desc[12:]
        elif payee_name == desc and desc.lower().startswith('payment to '):
            payee_name = desc[11:]
            
        pending_obj = {
            'id': new_tx_id,
            'date': date_str,
            'description': desc,
            'flow': direction,
            'amount': amount,
            'payee': payee_name
        }
        pending_confirmations.append(pending_obj)
        return jsonify({
            'status': 'needs_confirmation',
            'item': pending_obj,
            'message': f"Context alert: Transfer of ${amount:.2f} to {payee_name} needs clarification."
        })
    else:
        classification = auto_classify_merchant(desc)
        final_category = 'Miscellaneous'
        final_reason = 'Discretionary outflow'
        final_tags = ['Simulation']
        
        if classification:
            final_category = classification['category']
            final_reason = classification['reason']
            final_tags = classification['tags']
        else:
            if direction == 'income':
                final_category = 'Income'
                final_reason = 'Inflow'
                final_tags = ['Inflow']
            elif direction == 'investment':
                final_category = 'Investments'
                final_reason = 'SIP allocation'
                final_tags = ['Investments']
                
        confirmed_tx = {
            'id': new_tx_id,
            'date': date_str,
            'description': desc,
            'category': final_category,
            'flow': direction,
            'amount': amount,
            'reason': final_reason,
            'tags': final_tags
        }
        
        transactions.insert(0, confirmed_tx)
        return jsonify({
            'status': 'auto_classified',
            'item': confirmed_tx,
            'message': f"Auto-identified: {desc} mapped to {final_category} ({final_reason})"
        })

@app.route('/api/transactions/confirm', methods=['POST'])
def confirm_transaction():
    data = request.json
    tx_id = data.get('id')
    category = data.get('category')
    reason = data.get('reason')
    tags = data.get('tags', [])
    
    # Find pending
    pending_item = None
    for p in pending_confirmations:
        if p['id'] == tx_id:
            pending_item = p
            break
            
    if not pending_item:
        return jsonify({'error': 'Not found'}), 404
        
    pending_confirmations.remove(pending_item)
    
    confirmed_tx = {
        'id': pending_item['id'],
        'date': pending_item['date'],
        'description': pending_item['description'],
        'category': category,
        'flow': pending_item['flow'],
        'amount': pending_item['amount'],
        'reason': reason,
        'tags': tags
    }
    
    transactions.insert(0, confirmed_tx)
    return jsonify({
        'status': 'success',
        'item': confirmed_tx
    })

if __name__ == '__main__':
    app.run(port=8000, debug=True)
