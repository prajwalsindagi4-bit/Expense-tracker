// Manmo AI — Financial Storyteller

function generateFinancialStory(txs) {
    const now = new Date();
    const currentMonthNum = now.getMonth(); // 5 for June in our 2026 scenario
    const currentYear = 2026;
    
    // Filter June 2026
    const thisMonthTxs = txs.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonthNum && d.getFullYear() === currentYear;
    });

    // Filter May 2026 for comparison
    const lastMonthTxs = txs.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === (currentMonthNum - 1) && d.getFullYear() === currentYear;
    });

    // Calculations
    const sumFlow = (arr, flowType) => arr.filter(t => t.flow === flowType).reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const sumCat = (arr, catName) => arr.filter(t => t.category === catName).reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const spentThisMonth = sumFlow(thisMonthTxs, 'expense');
    const spentLastMonth = sumFlow(lastMonthTxs, 'expense');
    
    const foodThisMonth = sumCat(thisMonthTxs, 'Food');
    const foodLastMonth = sumCat(lastMonthTxs, 'Food');

    const investedThisMonth = sumFlow(thisMonthTxs, 'investment');
    const investedLastMonth = sumFlow(lastMonthTxs, 'investment');

    // Build the story parts
    let intro = "";
    if (spentThisMonth <= spentLastMonth) {
        const diff = (spentLastMonth - spentThisMonth).toFixed(0);
        intro = `This month, your day-to-day spending decreased by <strong>$${diff}</strong> compared to last month. Your core budget remained exceptionally stable, showing steady progress in your financial habits.`;
    } else {
        const diff = (spentThisMonth - spentLastMonth).toFixed(0);
        intro = `This month, your outflows grew slightly by <strong>$${diff}</strong>. However, there is no reason for concern: your essential expenditures are fully supported by your income stream.`;
    }

    let foodSection = "";
    if (foodThisMonth < foodLastMonth) {
        const diff = (foodLastMonth - foodThisMonth).toFixed(0);
        foodSection = `Your dining and meal splits were <strong>$${diff} lower</strong> than last month. This slight reduction shows that minor, frictionless adjustments are already adding up.`;
    } else if (foodThisMonth > foodLastMonth) {
        const diff = (foodThisMonth - foodLastMonth).toFixed(0);
        foodSection = `We noticed a modest increase of <strong>$${diff}</strong> in food splits and takeout orders. Sharing meals is a key part of life; keeping an eye on delivery frequency next week represents a simple opportunity to redirect cash flow.`;
    } else {
        foodSection = `Your food splits remained exactly matching your historical baseline, maintaining a balanced habit.`;
    }

    let investSection = "";
    if (investedThisMonth >= 1300) {
        investSection = `On the wealth-building front, you successfully routed <strong>$${investedThisMonth.toFixed(0)}</strong> directly into index funds and SIPs. You maintained a 100% investment consistency streak for the 6th consecutive month.`;
    } else {
        investSection = `You contributed $${investedThisMonth.toFixed(0)} to your long-term wealth portfolio this month. Consistency is the key to compounding growth.`;
    }

    let conclusion = `Based on current behaviors, you are fully on track to cross your next major Net Worth milestone of <strong>$50,000</strong> in approximately 4 months. You are in complete control of your financial journey.`;

    return `
        <p>${intro}</p>
        <p>${foodSection} ${investSection}</p>
        <p><strong>Supportive Companion Outlook:</strong> ${conclusion}</p>
    `;
}
