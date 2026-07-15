# pyrefly: ignore [missing-import]
from flask import Flask, jsonify, request
from flask_cors import CORS
import time
import random
from datetime import datetime
import csv
import io
import hashlib
import uuid
import os
import json
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

app = Flask(__name__)
CORS(app)

url: str = os.environ.get("SUPABASE_URL", "")
key: str = os.environ.get("SUPABASE_KEY", "")

try:
    supabase: Client = create_client(url, key)
except Exception as e:
    print(f"Failed to initialize Supabase: {e}")
    supabase = None

@app.errorhandler(Exception)
def handle_exception(e):
    return jsonify({"error": str(e), "type": type(e).__name__}), 500

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

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
        
    try:
        user_id = str(uuid.uuid4())
        user_data = {
            'id': user_id,
            'name': name,
            'email': email,
            'password_hash': hash_password(password)
        }
        res = supabase.table('users').insert(user_data).execute()
        seed_user_transactions(user_id)
        return jsonify({'status': 'success', 'user': {'id': user_id, 'name': name, 'email': email}})
    except Exception as e:
        if 'duplicate key value' in str(e).lower() or 'unique constraint' in str(e).lower():
            return jsonify({'error': 'Email already exists'}), 409
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    res = supabase.table('users').select('id, name, email').eq('email', email).eq('password_hash', hash_password(password)).execute()
    
    if res.data and len(res.data) > 0:
        return jsonify({'status': 'success', 'user': res.data[0]})
    else:
        return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/auth/google', methods=['POST'])
def google_auth():
    data = request.json
    email = data.get('email')
    name = data.get('name', 'Google User')
    
    if not email:
        return jsonify({'error': 'Email required'}), 400
        
    res = supabase.table('users').select('id, name, email').eq('email', email).execute()
    
    if res.data and len(res.data) > 0:
        user = res.data[0]
    else:
        user_id = str(uuid.uuid4())
        user_data = {
            'id': user_id,
            'name': name,
            'email': email,
            'google_id': 'google'
        }
        supabase.table('users').insert(user_data).execute()
        seed_user_transactions(user_id)
        user = {'id': user_id, 'name': name, 'email': email}
        
    return jsonify({'status': 'success', 'user': user})

@app.route('/api/transactions', methods=['GET'])
def get_transactions():
    user_id = request.headers.get('X-User-Id')
    if not user_id: return jsonify({'error': 'Unauthorized'}), 401
    
    tx_res = supabase.table('transactions').select('*').eq('user_id', user_id).order('date', desc=True).execute()
    pending_res = supabase.table('pending_confirmations').select('*').eq('user_id', user_id).order('date', desc=True).execute()
    
    txs = tx_res.data if tx_res.data else []
    pends = pending_res.data if pending_res.data else []
    
    for t in txs:
        if isinstance(t.get('tags'), str):
            try: t['tags'] = json.loads(t['tags'])
            except: t['tags'] = []
            
    for p in pends:
        if isinstance(p.get('tags'), str):
            try: p['tags'] = json.loads(p['tags'])
            except: p['tags'] = []
        p['payee'] = p.get('payee_name', '')
        
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
            'user_id': user_id,
            'date': date_str,
            'description': desc,
            'flow': direction,
            'amount': amount,
            'payee_name': payee_name,
            'category': '',
            'reason': '',
            'tags': []
        }
        
        supabase.table('pending_confirmations').insert(pending_obj).execute()
        pending_obj['payee'] = payee_name

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
            'user_id': user_id,
            'date': date_str,
            'description': desc,
            'category': final_category,
            'flow': direction,
            'amount': amount,
            'reason': final_reason,
            'tags': final_tags
        }
        
        supabase.table('transactions').insert(confirmed_tx).execute()

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
    
    pending_res = supabase.table('pending_confirmations').select('*').eq('id', tx_id).eq('user_id', user_id).execute()
    
    if not pending_res.data or len(pending_res.data) == 0:
        return jsonify({'error': 'Not found'}), 404
        
    pending_item = pending_res.data[0]
    supabase.table('pending_confirmations').delete().eq('id', tx_id).eq('user_id', user_id).execute()
    
    confirmed_tx = {
        'id': pending_item['id'],
        'user_id': user_id,
        'date': pending_item['date'],
        'description': pending_item['description'],
        'category': category,
        'flow': pending_item['flow'],
        'amount': pending_item['amount'],
        'reason': reason,
        'tags': tags
    }
    
    supabase.table('transactions').insert(confirmed_tx).execute()

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
        
        for t in new_txs:
            t['user_id'] = user_id

        if len(new_txs) > 0:
            supabase.table('transactions').insert(new_txs).execute()
                
        return jsonify({
            'status': 'success',
            'transactions_pulled': len(new_txs),
            'months_covered': 1
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=8000, debug=True)
