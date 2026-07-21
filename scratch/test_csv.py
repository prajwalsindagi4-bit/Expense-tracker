import io
import csv
import re
from datetime import datetime
import time
import random

# mock request.files
class MockFile:
    def __init__(self, filename, content):
        self.filename = filename
        self.stream = io.BytesIO(content)

file = MockFile('test.csv', b'Date,Description,Amount\n01/05/2026,Whole Foods,120.50\n02/05/2026,Uber Ride,-15.00\n')

stream = io.StringIO(file.stream.read().decode("utf-8-sig", errors="replace"), newline=None)
csv_input = csv.reader(stream)

headers = next(csv_input, None)
print("Headers:", headers)

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
    
    # Strip currency symbols and commas before converting to float
    raw_amt = re.sub(r'[^\d.-]', '', row[amt_idx])
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
        
    final_cat = 'Miscellaneous'
    
    tx_obj = {
        'id': f"csv-tx-{int(time.time()*1000)}-{random.randint(0,9999)}",
        'date': formatted_date,
        'description': desc_val,
        'category': final_cat,
        'flow': 'expense' if amt_val > 0 else 'income',
        'amount': abs(amt_val)
    }
    new_txs.append(tx_obj)

print("Parsed txs:", new_txs)
