function runSimulation(inputs) {
    console.log('runSimulation called');
    const INFLATION_RATE = inputs.inflation;
    const PENSION_AGE = inputs.pensionAge;

    const results = [];
    let currentAge = inputs.currentAge;
    let currentYear = new Date().getFullYear();

    const incomeMap = new Map(inputs.incomes.map(i => [i.name, i]));
    const expenseMap = new Map(inputs.expenses.map(e => [e.name, e]));
    const assetMap = new Map(inputs.assets.map(a => [a.name, a]));
    const liabilityMap = new Map(inputs.liabilities.map(l => [l.name, l]));

    let assets = {};
    inputs.assets.filter(a => currentYear >= a.startYear && (a.endYear === 0 || currentYear <= a.endYear)).forEach(a => assets[a.name] = a.value);

    let liabilities = {};
    inputs.liabilities.filter(l => currentYear >= l.startYear && (l.endYear === 0 || currentYear <= l.endYear)).forEach(l => liabilities[l.name] = { value: l.value, initialValue: l.value, annualRepayment: l.value / (l.endYear - l.startYear) });

    let annualIncomes = {};
    let annualExpenses = {};

    let annualPension = inputs.estimatedPension * 12;
    let initialPensionWithdrawal = 0;
	let amountPensionMessage = 0;

    for (let year = 0; currentAge < 95; year++) {

        inputs.assets.forEach(a => {
            if (a.startYear === currentYear) {
                assets[a.name] = a.value;
            }
            if (a.endYear === currentYear) {
                delete assets[a.name];
            }
        });

        inputs.liabilities.forEach(l => {
            if (l.startYear === currentYear) {
                liabilities[l.name] = { value: l.value, initialValue: l.value, annualRepayment: l.value / (l.endYear - l.startYear) };
            }
            if (l.endYear + 1 === currentYear) {
                delete liabilities[l.name];
            }
        });

        const activeIncomes = Array.from(incomeMap.values()).filter(i => currentYear >= i.startYear && (i.endYear === 0 || currentYear <= i.endYear));
        activeIncomes.forEach(i => {
            if (!annualIncomes[i.name]) {
                annualIncomes[i.name] = i.frequency === 'monthly' ? i.value * 12 : i.value;
            }
        });

        const activeExpenses = Array.from(expenseMap.values()).filter(e => currentYear >= e.startYear && (e.endYear === 0 || currentYear <= e.endYear));
        activeExpenses.forEach(e => {
            if (!annualExpenses[e.name]) {
                annualExpenses[e.name] = e.frequency === 'monthly' ? e.value * 12 : e.value;
            }
        });

        let tempAnnualIncomes = {};
        activeIncomes.forEach(i => tempAnnualIncomes[i.name] = annualIncomes[i.name]);

        let tempAnnualExpenses = {};
        activeExpenses.forEach(e => tempAnnualExpenses[e.name] = annualExpenses[e.name]);

        let totalAnnualIncome = Object.values(tempAnnualIncomes).reduce((a, b) => a + b, 0);
        if (currentAge >= PENSION_AGE) {
            totalAnnualIncome = annualPension;
        }

        Object.keys(liabilities).forEach(name => {
            const liability = liabilities[name];
            const liabilityInput = liabilityMap.get(name);
            if (liability.value > 0 && currentYear > liabilityInput.startYear) {
                liability.value -= liability.annualRepayment;
                if(liability.value < 0) liability.value = 0;
            }
        });

        Object.keys(assets).forEach(name => {
            const asset = assetMap.get(name);
            if(asset) {
                assets[name] *= (1 + asset.return * (1 - asset.tax));
            }
        });

        const totalAnnualExpenses = Object.values(tempAnnualExpenses).reduce((a, b) => a + b, 0);
        const savingsCapacity = totalAnnualIncome - totalAnnualExpenses;

        if (currentAge < PENSION_AGE) {
            let savings = savingsCapacity;

            if (savings < 0) { // Deficit
                let deficit = -savings;

                const activeAssetNames = Object.keys(assets);
                const deficitWithdrawalOrder = activeAssetNames
                    .map(name => assetMap.get(name))
                    .filter(a => a)
                    .sort((a, b) => a.withdrawalOrder - b.withdrawalOrder)
                    .map(a => a.name);

                deficitWithdrawalOrder.forEach(assetName => {
                    if(assets[assetName] && deficit > 0) {
                        const withdrawal = Math.min(deficit, assets[assetName]);
                        assets[assetName] -= withdrawal;
                        deficit -= withdrawal;
                    }
                });
            } else { // Surplus
                const expenseBuffer = totalAnnualExpenses / 2;
                if (assetMap.has('Savings Account')) {
                    if (assets['Savings Account'] === undefined) assets['Savings Account'] = 0;

                    if (assets['Savings Account'] < expenseBuffer) {
                        const bufferTopUp = Math.min(savings, expenseBuffer - assets['Savings Account']);
                        assets['Savings Account'] += bufferTopUp;
                        savings -= bufferTopUp;
                    }
                }

                const currentAllocation = getCurrentAllocation(currentYear, inputs.allocationPeriods);
                if (currentAllocation && savings > 0) {
                    Object.keys(currentAllocation.allocation).forEach(assetName => {
                        if (assets[assetName] !== undefined) {
                            assets[assetName] += savings * currentAllocation.allocation[assetName];
                        }
                    });
                }
            }
        } else {
            if (initialPensionWithdrawal === 0) {
                const totalAssets = Object.values(assets).reduce((a, b) => a + b, 0);
                const totalLiabilities = Object.values(liabilities).reduce((sum, l) => sum + l.value, 0);
                const netWorth = totalAssets - totalLiabilities;
                initialPensionWithdrawal = netWorth * inputs.withdrawalRate;
					if (currentAge === PENSION_AGE){
						amountPensionMessage = initialPensionWithdrawal
					}
            }

            const withdrawalAmount = initialPensionWithdrawal;
            let cashflow = savingsCapacity + withdrawalAmount;

            let withdrawnAmount = 0;

            const activeAssetNames = Object.keys(assets);
            const withdrawalOrder = activeAssetNames
                .map(name => assetMap.get(name))
                .filter(a => a)
                .sort((a, b) => a.withdrawalOrder - b.withdrawalOrder)
                .map(a => a.name);

            withdrawalOrder.forEach(assetName => {
                if(assets[assetName] && withdrawnAmount < withdrawalAmount) {
                    const withdrawal = Math.min(withdrawalAmount - withdrawnAmount, assets[assetName]);
                    assets[assetName] -= withdrawal;
                    withdrawnAmount += withdrawal;
                }
            });

            if (cashflow < 0) {
                let deficit = -cashflow;

                const activeAssetNames = Object.keys(assets);
                const deficitWithdrawalOrder = activeAssetNames
                    .map(name => assetMap.get(name))
                    .filter(a => a)
                    .sort((a, b) => a.withdrawalOrder - b.withdrawalOrder)
                    .map(a => a.name);

                deficitWithdrawalOrder.forEach(assetName => {
                    if(assets[assetName] && deficit > 0) {
                        const withdrawal = Math.min(deficit, assets[assetName]);
                        assets[assetName] -= withdrawal;
                        deficit -= withdrawal;
                    }
                });
            }
        }

        const totalAssets = Object.values(assets).reduce((a, b) => a + b, 0);
        const totalLiabilities = Object.values(liabilities).reduce((sum, l) => sum + l.value, 0);
        const netWorth = totalAssets - totalLiabilities;

        const savingsRate = totalAnnualIncome > 0 ? savingsCapacity / totalAnnualIncome : 0;

        results.push({
            year: currentYear,
            age: currentAge,
            net_income: totalAnnualIncome,
            expenses: totalAnnualExpenses,
            savings_capacity: savingsCapacity,
            savings_rate: savingsRate,
            net_worth: netWorth,
            assets: { ...assets },
            liabilities: JSON.parse(JSON.stringify(liabilities))
        });

        Object.keys(annualIncomes).forEach(name => {
            const income = incomeMap.get(name);
            if (income && income.indexed) {
                annualIncomes[name] *= (1 + INFLATION_RATE);
            }
        });
        Object.keys(annualExpenses).forEach(name => {
            const expense = expenseMap.get(name);
            if (expense && expense.indexed) {
                annualExpenses[name] *= (1 + INFLATION_RATE);
            }
        });
        annualPension *= (1 + INFLATION_RATE);

        if (initialPensionWithdrawal > 0) {
            initialPensionWithdrawal *= (1 + INFLATION_RATE);
        }

        currentAge++;
        currentYear++;
    }

    const earlyRetirementYear = checkForEarlyRetirement(results, PENSION_AGE, inputs.withdrawalRate);

    return { results, earlyRetirementYear, amountPensionMessage };
}

function getCurrentAllocation(currentYear, allocationPeriods) {
    let currentAllocation = null;
    for (const period of allocationPeriods) {
        if (currentYear >= period.startYear) {
            currentAllocation = period;
        } else {
            break;
        }
    }
    return currentAllocation;
}

function checkForEarlyRetirement(results, PENSION_AGE, withdrawalRate) {
    for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.age < PENSION_AGE) {
            const requiredCapital = result.expenses / withdrawalRate;
            if (result.net_worth >= requiredCapital) {
                return result.year;
            }
        }
    }
    return null;
}