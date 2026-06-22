// Manmo AI — What-If Projection Engine

function calculateWhatIfProjections(params) {
    // Inputs:
    // params.addInvest - monthly investment top-up amount ($0 to $1000)
    // params.reduceFoodPct - percentage reduction of food splits (0% to 80%)
    // params.investBonusPct - annual bonus investment percentage (0% to 100%)
    // params.extraDebtPay - extra monthly debt prepayment ($0 to $300)

    const years = 15;
    const months = years * 12;
    const annualReturn = 0.07; // 7% average stock market return
    const monthlyReturn = annualReturn / 12;

    const startNetWorth = 42650;
    
    // Baseline averages
    const baselineSIP = 1300;
    const baselineFood = 300;
    const baselineCheckingSurplus = 1400; // Leftover cash flow
    const annualBonus = 5000;

    // Debt parameters (Mock student loan/car loan of $12,000 at 6% interest rate)
    let baselineDebtPrincipal = 12000;
    let hypotheticalDebtPrincipal = 12000;
    const debtInterestRate = 0.06 / 12;
    const baselineDebtPayment = 250; // Standard monthly payment

    // Year-by-year dataset points for charting
    const baselineData = [startNetWorth];
    const hypotheticalData = [startNetWorth];

    // Running balances
    let baseInvestValue = startNetWorth - 12000; // Net worth = Assets - Liabilities
    let baseCashValue = 0;
    let baseDebt = baselineDebtPrincipal;

    let hypoInvestValue = startNetWorth - 12000;
    let hypoCashValue = 0;
    let hypoDebt = hypotheticalDebtPrincipal;

    // Totals for interest metrics
    let baseTotalInterestPaid = 0;
    let hypoTotalInterestPaid = 0;
    let baseDebtFreeMonth = months;
    let hypoDebtFreeMonth = months;

    for (let m = 1; m <= months; m++) {
        // --- BASELINE ---
        // Investments grow
        baseInvestValue = baseInvestValue * (1 + monthlyReturn) + baselineSIP;
        
        // Cash surplus builds up (0% interest rate, simulated checking account)
        baseCashValue += baselineCheckingSurplus;

        // Debt calculation
        if (baseDebt > 0) {
            const interest = baseDebt * debtInterestRate;
            baseTotalInterestPaid += interest;
            const principalPayment = Math.min(baseDebt, baselineDebtPayment - interest);
            baseDebt -= principalPayment;
            if (baseDebt <= 0 && baseDebtFreeMonth === months) {
                baseDebtFreeMonth = m;
            }
        }

        // Annual bonus addition (occurs once every 12 months)
        if (m % 12 === 0) {
            // Baseline assumes 0% of bonus is invested (leaves it as cash surplus)
            baseCashValue += annualBonus;
        }

        // --- HYPOTHETICAL ---
        // Food savings reallocated to investments
        const foodSavings = baselineFood * (params.reduceFoodPct / 100);
        
        // Shift cash surplus into investments
        const shiftedInvest = Math.min(baselineCheckingSurplus, params.addInvest);
        const remainingCheckingSurplus = baselineCheckingSurplus - shiftedInvest;

        const totalHypoMonthlyInvest = baselineSIP + shiftedInvest + foodSavings;

        hypoInvestValue = hypoInvestValue * (1 + monthlyReturn) + totalHypoMonthlyInvest;
        hypoCashValue += remainingCheckingSurplus;

        // Debt calculation with accelerator
        const hypoPaymentTotal = baselineDebtPayment + params.extraDebtPay;
        if (hypoDebt > 0) {
            const interest = hypoDebt * debtInterestRate;
            hypoTotalInterestPaid += interest;
            const principalPayment = Math.min(hypoDebt, hypoPaymentTotal - interest);
            hypoDebt -= principalPayment;
            if (hypoDebt <= 0 && hypoDebtFreeMonth === months) {
                hypoDebtFreeMonth = m;
            }
        }

        // Annual bonus addition
        if (m % 12 === 0) {
            const bonusInvested = annualBonus * (params.investBonusPct / 100);
            const bonusSaved = annualBonus - bonusInvested;
            hypoInvestValue += bonusInvested;
            hypoCashValue += bonusSaved;
        }

        // Save annual marks for Chart.js (each 12 months)
        if (m % 12 === 0) {
            const baseNW = Math.round(baseInvestValue + baseCashValue - baseDebt);
            const hypoNW = Math.round(hypoInvestValue + hypoCashValue - hypoDebt);
            baselineData.push(baseNW);
            hypotheticalData.push(hypoNW);
        }
    }

    const finalBaseNW = baselineData[baselineData.length - 1];
    const finalHypoNW = hypotheticalData[hypotheticalData.length - 1];
    const netDifference = finalHypoNW - finalBaseNW;

    // Summarize outcomes
    let summaryText = "";
    if (netDifference > 0) {
        summaryText += `By adjusting these sliders, in 15 years your projected Net Worth increases to <strong>$${finalHypoNW.toLocaleString()}</strong>, compared to $${finalBaseNW.toLocaleString()} in your baseline. `;
        summaryText += `That represents an additional <strong>$${netDifference.toLocaleString()}</strong> in wealth generated solely by optimizing existing funds. `;
    } else {
        summaryText += "Adjust the sliders to simulate compounding allocations and check outcomes. ";
    }

    if (params.extraDebtPay > 0 && hypoDebtFreeMonth < baseDebtFreeMonth) {
        const monthsEarlier = baseDebtFreeMonth - hypoDebtFreeMonth;
        const interestSaved = baseTotalInterestPaid - hypoTotalInterestPaid;
        summaryText += `<br><br><span style="color:var(--success); font-weight:600;"><i data-lucide="shield"></i> Debt Payoff:</span> By adding $${params.extraDebtPay}/month, you become debt-free <strong>${monthsEarlier} months earlier</strong>, saving <strong>$${Math.round(interestSaved).toLocaleString()}</strong> in direct interest payments.`;
    }

    return {
        labels: ['Today', 'Yr 1', 'Yr 2', 'Yr 3', 'Yr 4', 'Yr 5', 'Yr 6', 'Yr 7', 'Yr 8', 'Yr 9', 'Yr 10', 'Yr 11', 'Yr 12', 'Yr 13', 'Yr 14', 'Yr 15'],
        baseline: baselineData,
        hypothetical: hypotheticalData,
        summary: summaryText
    };
}
