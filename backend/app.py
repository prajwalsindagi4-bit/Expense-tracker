# pyrefly: ignore [missing-import]
from flask import Flask, jsonify, request
from flask_cors import CORS
import time
import random
from datetime import datetime
import csv
import io
import sqlite3
import hashlib
import uuid
import os
import json

app = Flask(__name__)
CORS(app)

DATABASE = 'users.db'

def init_db():
    conn = sqlite3.connect(DATABASE)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT,
            email TEXT UNIQUE,
            password_hash TEXT,
            google_id TEXT
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            date TEXT,
            description TEXT,
            category TEXT,
            flow TEXT,
            amount REAL,
            reason TEXT,
            tags TEXT
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS pending_confirmations (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            date TEXT,
            description TEXT,
            flow TEXT,
            amount REAL,
            payee_name TEXT,
            category TEXT,
            reason TEXT,
            tags TEXT
        )
    ''')
    conn.commit()
    conn.close()

init_db()

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

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
def seed_user_transactions(user_id):
    # User requested new accounts to start completely blank.
    pass

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

@app.route('/api/auth/signup', methods=['POST'])
def signup():
    data = request.json
    name = data.get('name', 'User')
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400
        
    conn = get_db()
    c = conn.cursor()
    try:
        user_id = str(uuid.uuid4())
        c.execute('INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)',
                  (user_id, name, email, hash_password(password)))
        conn.commit()
        seed_user_transactions(user_id)
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'error': 'Email already exists'}), 409
        
    conn.close()
    return jsonify({'status': 'success', 'user': {'id': user_id, 'name': name, 'email': email}})

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT id, name, email FROM users WHERE email = ? AND password_hash = ?', (email, hash_password(password)))
    row = c.fetchone()
    conn.close()
    
    if row:
        return jsonify({'status': 'success', 'user': dict(row)})
    else:
        return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/auth/google', methods=['POST'])
def google_auth():
    data = request.json
    email = data.get('email')
    name = data.get('name', 'Google User')
    
    if not email:
        return jsonify({'error': 'Email required'}), 400
        
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT id, name, email FROM users WHERE email = ?', (email,))
    row = c.fetchone()
    
    if row:
        user = dict(row)
    else:
        user_id = str(uuid.uuid4())
        c.execute('INSERT INTO users (id, name, email, google_id) VALUES (?, ?, ?, ?)',
                  (user_id, name, email, 'google'))
        conn.commit()
        seed_user_transactions(user_id)
        user = {'id': user_id, 'name': name, 'email': email}
        
    conn.close()
    return jsonify({'status': 'success', 'user': user})

@app.route('/api/transactions', methods=['GET'])
def get_transactions():
    user_id = request.headers.get('X-User-Id')
    if not user_id: return jsonify({'error': 'Unauthorized'}), 401
    
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC', (user_id,))
    tx_rows = c.fetchall()
    c.execute('SELECT * FROM pending_confirmations WHERE user_id = ? ORDER BY date DESC', (user_id,))
    pending_rows = c.fetchall()
    conn.close()
    
    txs = []
    for r in tx_rows:
        d = dict(r)
        d['tags'] = json.loads(d['tags']) if d['tags'] else []
        txs.append(d)
        
    pends = []
    for r in pending_rows:
        d = dict(r)
        d['tags'] = json.loads(d['tags']) if d['tags'] else []
        d['payee'] = d['payee_name']
        pends.append(d)
        
    return jsonify({
        'transactions': txs,
        'pendingConfirmations': pends
    })

@app.route('/api/transactions/simulate', methods=['POST'])
def simulate_transaction():
    user_id = request.headers.get('X-User-Id')
    if not user_id: return jsonify({'error': 'Unauthorized'}), 401

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
        
        conn = get_db()
        c = conn.cursor()
        c.execute('''
            INSERT INTO pending_confirmations (id, user_id, date, description, flow, amount, payee_name, category, reason, tags)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (new_tx_id, user_id, date_str, desc, direction, amount, payee_name, '', '', '[]'))
        conn.commit()
        conn.close()

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
        
        conn = get_db()
        c = conn.cursor()
        c.execute('''
            INSERT INTO transactions (id, user_id, date, description, category, flow, amount, reason, tags)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (new_tx_id, user_id, date_str, desc, final_category, direction, amount, final_reason, json.dumps(final_tags)))
        conn.commit()
        conn.close()

        return jsonify({
            'status': 'auto_classified',
            'item': confirmed_tx,
            'message': f"Auto-identified: {desc} mapped to {final_category} ({final_reason})"
        })

@app.route('/api/transactions/confirm', methods=['POST'])
def confirm_transaction():
    user_id = request.headers.get('X-User-Id')
    if not user_id: return jsonify({'error': 'Unauthorized'}), 401

    data = request.json
    tx_id = data.get('id')
    category = data.get('category')
    reason = data.get('reason')
    tags = data.get('tags', [])
    
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM pending_confirmations WHERE id = ? AND user_id = ?', (tx_id, user_id))
    pending_row = c.fetchone()
    
    if not pending_row:
        conn.close()
        return jsonify({'error': 'Not found'}), 404
        
    pending_item = dict(pending_row)
    c.execute('DELETE FROM pending_confirmations WHERE id = ? AND user_id = ?', (tx_id, user_id))
    
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
    
    c.execute('''
        INSERT INTO transactions (id, user_id, date, description, category, flow, amount, reason, tags)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (confirmed_tx['id'], user_id, confirmed_tx['date'], confirmed_tx['description'], category, confirmed_tx['flow'], confirmed_tx['amount'], reason, json.dumps(tags)))
    
    conn.commit()
    conn.close()

    return jsonify({
        'status': 'success',
        'item': confirmed_tx
    })



@app.route('/api/upload-statement', methods=['POST'])
def upload_statement():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded. Please select a CSV file.'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected.'}), 400
        
    try:
        stream = io.StringIO(file.stream.read().decode("UTF8"), newline=None)
        csv_input = csv.reader(stream)
        
        headers = next(csv_input, None)
        if not headers:
            return jsonify({'error': 'Empty CSV file.'}), 400
            
        h_lower = [h.lower().strip() for h in headers]
        date_idx, desc_idx, amt_idx = -1, -1, -1
        
        for i, h in enumerate(h_lower):
            if 'date' in h: date_idx = i
            elif 'description' in h or 'narration' in h or 'particulars' in h: desc_idx = i
            elif 'amount' in h or 'withdrawal' in h or 'debit' in h: amt_idx = i
            
        if date_idx == -1 or desc_idx == -1 or amt_idx == -1:
            date_idx, desc_idx, amt_idx = 0, 1, 2
            
        new_txs = []
        for row in csv_input:
            if len(row) <= max(date_idx, desc_idx, amt_idx): continue
            
            raw_amt = row[amt_idx].replace(',', '').strip()
            if not raw_amt: continue
            
            try:
                amt_val = float(raw_amt)
            except ValueError:
                continue
                
            desc_val = row[desc_idx].strip()
            date_val = row[date_idx].strip()
            
            # Format Date
            formatted_date = datetime.now().strftime("%Y-%m-%d")
            try:
                if '/' in date_val:
                    parts = date_val.split('/')
                    if len(parts) == 3 and len(parts[2]) == 4: 
                        formatted_date = f"{parts[2]}-{parts[1]:0>2}-{parts[0]:0>2}"
                elif '-' in date_val:
                    formatted_date = date_val
            except:
                pass
            
            classification = auto_classify_merchant(desc_val)
            final_cat = 'Miscellaneous'
            final_reason = 'Extracted from CSV'
            final_tags = ['CSV']
            
            if classification:
                final_cat = classification['category']
                final_reason = classification['reason']
                final_tags = classification['tags']
                
            tx_obj = {
                'id': f"csv-tx-{int(time.time()*1000)}-{random.randint(0,9999)}",
                'date': formatted_date,
                'description': desc_val,
                'category': final_cat,
                'flow': 'expense' if amt_val > 0 else 'income',
                'amount': abs(amt_val),
                'reason': final_reason,
                'tags': final_tags
            }
            new_txs.append(tx_obj)
            
        user_id = request.headers.get('X-User-Id')
        if not user_id: return jsonify({'error': 'Unauthorized'}), 401

        conn = get_db()
        c = conn.cursor()
        if len(new_txs) > 0:
            for t in new_txs:
                c.execute('''
                    INSERT INTO transactions (id, user_id, date, description, category, flow, amount, reason, tags)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (t['id'], user_id, t['date'], t['description'], t['category'], t['flow'], t['amount'], t['reason'], json.dumps(t['tags'])))
            conn.commit()
        conn.close()
                
        return jsonify({
            'status': 'success',
            'transactions_pulled': len(new_txs),
            'months_covered': 1
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=8000, debug=True)
