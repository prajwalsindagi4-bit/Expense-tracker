from ai_categorizer import ai_model

test_cases = [
    "Amazon Web Services",
    "Amazon Prime Video",
    "Whole Foods Market",
    "Uber Ride to Airport",
    "Uber Eats Delivery",
    "PG&E Electric Bill",
    "Vanguard Index Fund",
    "Spotify Premium",
    "Target Grocery",
    "Direct Deposit Payroll"
]

print("=== AI Model Predictions ===")
for desc in test_cases:
    prediction = ai_model.predict(desc)
    print(f"[{desc}] -> {prediction['category']} ({prediction['reason']})")
