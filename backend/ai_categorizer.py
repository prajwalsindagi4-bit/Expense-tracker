import math
import re
from collections import defaultdict

# A small subset of common stop words to filter out noise
STOP_WORDS = {"the", "and", "a", "an", "of", "to", "in", "for", "on", "with", "at", "by", "inc", "llc", "corp"}

class TransactionCategorizer:
    def __init__(self):
        self.category_word_counts = defaultdict(lambda: defaultdict(int))
        self.category_doc_counts = defaultdict(int)
        self.total_docs = 0
        self.vocab = set()
        
        # Meta mapping for rich UI data
        self.category_meta = {
            "Food": {"reason": "Dining / Groceries", "tags": ["Food"]},
            "Travel": {"reason": "Transportation", "tags": ["Travel"]},
            "Shopping": {"reason": "Retail Shopping", "tags": ["Shopping"]},
            "Utilities": {"reason": "Bills & Utilities", "tags": ["Utilities"]},
            "Entertainment": {"reason": "Fun & Leisure", "tags": ["Entertainment"]},
            "Rent": {"reason": "Housing", "tags": ["Housing"]},
            "Income": {"reason": "Earnings", "tags": ["Income"]},
            "Investments": {"reason": "Wealth", "tags": ["Investments"]},
            "Miscellaneous": {"reason": "Other", "tags": ["Other"]}
        }
        
    def _tokenize(self, text):
        """Cleans and splits text into meaningful tokens (words)."""
        # Remove non-alphanumeric, keep spaces
        clean_text = re.sub(r'[^a-zA-Z\s]', ' ', text.lower())
        tokens = [word for word in clean_text.split() if word not in STOP_WORDS and len(word) > 1]
        return tokens

    def train_batch(self, training_data):
        """
        Trains the Naive Bayes model on a list of tuples: (description, category)
        """
        for desc, category in training_data:
            tokens = self._tokenize(desc)
            self.category_doc_counts[category] += 1
            self.total_docs += 1
            
            for token in tokens:
                self.category_word_counts[category][token] += 1
                self.vocab.add(token)

    def predict(self, description):
        """
        Predicts the best category using Naive Bayes with Laplace Smoothing.
        Returns a rich object matching the app's expectations.
        """
        tokens = self._tokenize(description)
        
        if not self.total_docs or not tokens:
            return self._format_prediction("Miscellaneous", description)
            
        best_category = "Miscellaneous"
        best_log_prob = -float('inf')
        
        # V = size of vocabulary for Laplace Smoothing
        V = len(self.vocab)
        
        for category, doc_count in self.category_doc_counts.items():
            # P(Category)
            prior = math.log(doc_count / self.total_docs)
            
            # P(Document | Category)
            likelihood = 0.0
            total_words_in_cat = sum(self.category_word_counts[category].values())
            
            for token in tokens:
                # Laplace Smoothing: (count(w, c) + 1) / (count(c) + V)
                count_w_c = self.category_word_counts[category].get(token, 0)
                prob_w_c = (count_w_c + 1) / (total_words_in_cat + V)
                likelihood += math.log(prob_w_c)
                
            posterior = prior + likelihood
            
            if posterior > best_log_prob:
                best_log_prob = posterior
                best_category = category
                
        return self._format_prediction(best_category, description)

    def _format_prediction(self, category, original_desc):
        """Formats output to match frontend expectations"""
        meta = self.category_meta.get(category, self.category_meta["Miscellaneous"])
        return {
            'category': category,
            'reason': meta['reason'],
            'tags': meta['tags'],
            'merchantName': original_desc.title()[:20]  # simplified name estimation
        }

# Global singleton instance
ai_model = TransactionCategorizer()

# ==========================================
# TRAINING CORPUS (Self-Training on boot)
# ==========================================
TRAINING_DATA = [
    # Food
    ("McDonalds", "Food"), ("Starbucks", "Food"), ("Whole Foods Market", "Food"),
    ("Trader Joes", "Food"), ("Dominos Pizza", "Food"), ("Uber Eats", "Food"),
    ("DoorDash", "Food"), ("Subway", "Food"), ("Chipotle", "Food"),
    ("Taco Bell", "Food"), ("KFC", "Food"), ("Burger King", "Food"),
    ("Kroger", "Food"), ("Safeway", "Food"), ("Aldi", "Food"),
    ("Cafe", "Food"), ("Restaurant", "Food"), ("Diner", "Food"),
    ("Bakers", "Food"), ("Coffee Shop", "Food"), ("Sushi Bar", "Food"),
    ("Zomato", "Food"), ("Swiggy", "Food"), ("Blinkit", "Food"),
    ("Zepto", "Food"), ("Instamart", "Food"), ("BigBasket", "Food"),
    
    # Travel
    ("Uber Ride", "Travel"), ("Lyft", "Travel"), ("Delta Airlines", "Travel"),
    ("United Airlines", "Travel"), ("Southwest", "Travel"), ("Amtrak", "Travel"),
    ("MTA Subway", "Travel"), ("Shell Gas", "Travel"), ("ExxonMobil", "Travel"),
    ("Chevron", "Travel"), ("BART Transit", "Travel"), ("Train Ticket", "Travel"),
    ("Hotel Booking", "Travel"), ("Marriott", "Travel"), ("Hilton", "Travel"),
    ("Hertz Rental", "Travel"), ("Avis", "Travel"), ("Parking", "Travel"),
    ("Ola Cabs", "Travel"), ("IRCTC", "Travel"), ("MakeMyTrip", "Travel"),
    ("IndiGo", "Travel"), ("Air India", "Travel"), ("Vistara", "Travel"),
    
    # Shopping
    ("Amazon", "Shopping"), ("Amazon.com", "Shopping"), ("Amazon.in", "Shopping"),
    ("Flipkart", "Shopping"), ("Myntra", "Shopping"), ("Ajio", "Shopping"),
    ("Nykaa", "Shopping"), ("Meesho", "Shopping"), ("Tata CLiQ", "Shopping"),
    ("Walmart", "Shopping"), ("Target", "Shopping"), ("Best Buy", "Shopping"), 
    ("Apple Store", "Shopping"), ("Home Depot", "Shopping"), ("Lowe's", "Shopping"), 
    ("IKEA", "Shopping"), ("Zara", "Shopping"), ("H&M", "Shopping"), 
    ("Macy's", "Shopping"), ("Nordstrom", "Shopping"), ("Sephora", "Shopping"), 
    ("Nike", "Shopping"), ("Adidas", "Shopping"), ("Bookstore", "Shopping"), 
    ("Clothing Outlet", "Shopping"), ("Retail Store", "Shopping"), ("Reliance Digital", "Shopping"),
    
    # Utilities
    ("PG&E", "Utilities"), ("Con Edison", "Utilities"), ("AT&T", "Utilities"),
    ("Verizon Wireless", "Utilities"), ("T-Mobile", "Utilities"), ("Comcast Xfinity", "Utilities"),
    ("Spectrum Internet", "Utilities"), ("Water Bill", "Utilities"), ("Electric Bill", "Utilities"),
    ("Trash Collection", "Utilities"), ("City Water", "Utilities"), ("Power Co", "Utilities"),
    ("Airtel", "Utilities"), ("Jio", "Utilities"), ("Vodafone Idea", "Utilities"),
    ("BESCOM", "Utilities"), ("BSES", "Utilities"), ("Electricity Board", "Utilities"),
    
    # Entertainment
    ("Netflix", "Entertainment"), ("Spotify", "Entertainment"), ("Hulu", "Entertainment"),
    ("Disney+", "Entertainment"), ("AMC Theatres", "Entertainment"), ("Regal Cinemas", "Entertainment"),
    ("Ticketmaster", "Entertainment"), ("Steam Games", "Entertainment"), ("PlayStation", "Entertainment"),
    ("Xbox Live", "Entertainment"), ("Nintendo", "Entertainment"), ("Concert Tickets", "Entertainment"),
    ("Museum Entry", "Entertainment"), ("Bowling", "Entertainment"), ("Golf Course", "Entertainment"),
    
    # Rent
    ("Apartment Leasing", "Rent"), ("Property Management", "Rent"), ("Monthly Rent", "Rent"),
    ("Housing Payment", "Rent"), ("Landlord", "Rent"), ("Roommate Rent", "Rent"),
    
    # Income
    ("Direct Deposit", "Income"), ("Payroll", "Income"), ("Salary", "Income"),
    ("Upwork Freelance", "Income"), ("Fiverr", "Income"), ("Dividend", "Income"),
    ("Interest Payment", "Income"), ("Client Invoice", "Income"), ("Refund", "Income"),
    ("UPI Transfer Received", "Income"), ("IMPS Credit", "Income"), ("NEFT Inward", "Income"),
    
    # Investments
    ("Vanguard", "Investments"), ("Fidelity", "Investments"), ("Charles Schwab", "Investments"),
    ("Robinhood", "Investments"), ("Coinbase", "Investments"), ("E-Trade", "Investments"),
    ("Stock Purchase", "Investments"), ("Crypto Buy", "Investments"), ("401k Contribution", "Investments"),
    ("Zerodha", "Investments"), ("Groww", "Investments"), ("Upstox", "Investments"), 
    ("Mutual Fund SIP", "Investments"), ("Angel One", "Investments")
]

# Initialize and train the model immediately on load
ai_model.train_batch(TRAINING_DATA)
