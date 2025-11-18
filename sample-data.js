function getSampleData(stage) {
    const recentGraduate = {
        assets: [
            { name: getTranslation('stocks'), value: '5000', return: '8', tax: '0', withdrawalOrder: 1 },
            { name: getTranslation('savingsAccount'), value: '10000', return: '1', tax: '0', withdrawalOrder: 2 }
        ],
        liabilities: [],
        incomes: [
            { name: getTranslation('salary'), value: '2500', frequency: 'monthly', indexed: true }
        ],
        expenses: [
            { name: getTranslation('livingExpenses'), value: '2000', frequency: 'monthly', indexed: true }
        ],
        allocationPeriods: [
            { allocation: { [getTranslation('stocks')]: 100 } }
        ],
        currentAge: '22',
        pensionAge: '65',
        estimatedPension: '1200',
        inflation: '2.5',
        withdrawalRate: '0'
    };

    const earlyCareer = {
        assets: [
            { name: getTranslation('stocks'), value: '25000', return: '8', tax: '0', withdrawalOrder: 1 },
			{ name: getTranslation('bonds'), value: '5000', return: '4', tax: '0', withdrawalOrder: 2 },
            { name: getTranslation('savingsAccount'), value: '25000', return: '1', tax: '0', withdrawalOrder: 3 }
        ],
        liabilities: [],
        incomes: [
            { name: getTranslation('salary'), value: '3500', frequency: 'monthly', indexed: true }
        ],
        expenses: [
            { name: getTranslation('livingExpenses'), value: '2500', frequency: 'monthly', indexed: true }
        ],
        allocationPeriods: [
            { allocation: { [getTranslation('stocks')]: 90, [getTranslation('savingsAccount')]: 10 } },
            { startYear: 2035, allocation: { [getTranslation('stocks')]: 80, [getTranslation('bonds')]: 20 }, rebalance: true }
        ],
        currentAge: '30',
        pensionAge: '65',
        estimatedPension: '1500',
        inflation: '2.5',
        withdrawalRate: '0'
    };

    const midCareer = {
        assets: [
            { name: getTranslation('ownHome'), value: '300000', return: '4', tax: '0', withdrawalOrder: 4 },
            { name: getTranslation('stocks'), value: '100000', return: '8', tax: '0', withdrawalOrder: 1 },
            { name: getTranslation('bonds'), value: '25000', return: '4', tax: '0', withdrawalOrder: 2 },
            { name: getTranslation('savingsAccount'), value: '50000', return: '1', tax: '0', withdrawalOrder: 3 }
        ],
        liabilities: [
            { name: getTranslation('mortgage'), value: '200000', endYear: '2044', interestRate: '3.0' }
        ],
        incomes: [
            { name: getTranslation('salary'), value: '5000', frequency: 'monthly', indexed: true }
        ],
        expenses: [
            { name: getTranslation('livingExpenses'), value: '3000', frequency: 'monthly', indexed: true },
            { name: getTranslation('mortgageRepayment'), value: '1500', frequency: 'monthly', indexed: false, endYear: '2044' }
        ],
        allocationPeriods: [
            { allocation: { [getTranslation('stocks')]: 70, [getTranslation('bonds')]: 30 }, rebalance: true },
            { startYear: 2045, allocation: { [getTranslation('stocks')]: 60, [getTranslation('bonds')]: 40 }, rebalance: true }
        ],
        currentAge: '45',
        pensionAge: '65',
        estimatedPension: '2000',
        inflation: '2.5',
        withdrawalRate: '0'
    };

    const lateCareer = {
        assets: [
            { name: getTranslation('ownHome'), value: '400000', return: '3', tax: '0', withdrawalOrder: 4 },
            { name: getTranslation('stocks'), value: '250000', return: '6', tax: '0', withdrawalOrder: 1 },
            { name: getTranslation('bonds'), value: '100000', return: '3', tax: '0', withdrawalOrder: 2 },
            { name: getTranslation('savingsAccount'), value: '100000', return: '1', tax: '0', withdrawalOrder: 3 }
        ],
        liabilities: [],
        incomes: [
            { name: getTranslation('salary'), value: '6000', frequency: 'monthly', indexed: true, endYear: '2035' }
        ],
        expenses: [
            { name: getTranslation('livingExpenses'), value: '3500', frequency: 'monthly', indexed: true }
        ],
        allocationPeriods: [
            { allocation: { [getTranslation('stocks')]: 50, [getTranslation('bonds')]: 50 }, rebalance: true }
        ],
        currentAge: '55',
        pensionAge: '65',
        estimatedPension: '2500',
        inflation: '2.5',
        withdrawalRate: '0'
    };

    switch (stage) {
        case 'recent-graduate':
            return recentGraduate;
        case 'early-career':
            return earlyCareer;
        case 'mid-career':
            return midCareer;
        case 'late-career':
            return lateCareer;
        default:
            return earlyCareer; // Default to early career
    }
}
