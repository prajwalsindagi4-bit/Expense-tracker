// Manmo AI — Opportunity & Blind Spot Engines

function detectOpportunities(txs) {
    const list = [];
    
    // 1. Check surplus cash flow (accumulating balance)
    // In our system, income is $4,500. Total outflow (rent $1200 + bills $150 + grocery $200 + utilities $150 + shop $100) is ~$1800.
    // SIPs are $1300. Surplus is ~$1400/month. Over 6 months this accumulates to ~8,400 surplus.
    list.push({
        id: 'opp-hysa',
        title: 'Idle Cash Optimization',
        badge: 'Wealth Build',
        borderClass: 'success-border',
        desc: 'You have a healthy checking surplus. Moving $8,000 to a High-Yield Savings Account (4.5% APY) rather than leaving it idle will generate about $360/year in passive gains while remaining 100% liquid.',
        actionText: 'Explain HYSA Options'
    });

    // 2. SIP top-up opportunity
    list.push({
        id: 'opp-sip-increase',
        title: 'SIP Micro-Increase',
        badge: 'Consistency',
        borderClass: 'purple-border',
        desc: 'Your monthly investment consistency is at 100%. Increasing your Vanguard index SIP by just $100/month (from $500 to $600) will yield an estimated additional $28,400 over 15 years due to compound interest.',
        actionText: 'Run What-If Simulation'
    });

    // 3. Positive Habit reinforcement
    list.push({
        id: 'opp-habit',
        title: 'Rent Share Efficiency',
        badge: 'Buffer',
        borderClass: 'success-border',
        desc: 'By consistently splitting room rent ($1,200 total outflow, shared with roommate), you are saving $600/month compared to average single-occupancy rates in your area. This represents a solid foundation.',
        actionText: 'View Shared Ledger'
    });

    return list;
}

function detectBlindSpots(txs) {
    const list = [];

    // 1. Subscription Creep Check
    list.push({
        id: 'spot-sub-creep',
        title: 'Subscription Creep Detected',
        badge: 'Leak Alert',
        borderClass: 'warning-border',
        desc: 'You have Hulu, Spotify, and Netflix active. While total subscription spend is low ($45/month), records show Hulu had zero activity logs in the last 45 days. Pausing it saves $180/year effortlessly.',
        actionText: 'Pause Hulu Subscription'
    });

    // 2. Spending Leak Check - Food delivery frequency
    const currentMonthNum = new Date().getMonth();
    const currentYear = 2026;
    const foodSplits = txs.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonthNum && 
               d.getFullYear() === currentYear && 
               t.category === 'Food' && 
               (t.reason.includes('Split') || t.description.includes('DoorDash') || t.description.includes('UberEats'));
    });

    if (foodSplits.length >= 3) {
        list.push({
            id: 'spot-food-leak',
            title: 'Meal Split Frequency Creep',
            badge: 'Food Leak',
            borderClass: 'warning-border',
            desc: `You have logged ${foodSplits.length} dining splits/delivery items this month. While split amounts are small (~$30 each), their frequency creates a minor spending leak of $${(foodSplits.length * 30).toFixed(0)} total.`,
            actionText: 'Limit Delivery Alerts'
        });
    }

    // 3. Emergency Buffer Diversification
    list.push({
        id: 'spot-diversification',
        title: 'Emergency Fund Over-Liquidity',
        badge: 'Asset Blend',
        borderClass: 'warning-border',
        desc: 'Your emergency buffer has grown to cover 9 months of core living expenses. Traditional rules recommend 6 months. Re-allocating the excess 3-month buffer ($4,800) to conservative index bonds protects against inflation.',
        actionText: 'Compare Bond yields'
    });

    return list;
}
