function runSimulation(inputs, isMonteCarlo = false) {
    if (!isMonteCarlo) {
        console.log('runSimulation called');
    }
    let INFLATION_RATE = inputs.inflation;
    const LEGAL_PENSION_AGE = inputs.pensionAge;
    const EARLY_RETIREMENT_AGE = inputs.earlyRetirementAge;

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
    inputs.liabilities.filter(l => currentYear >= l.startYear && (l.endYear === 0 || currentYear <= l.endYear)).forEach(l => {
        let annualRepayment = 0;
        if (l.endYear > l.startYear) {
            if (l.interestRate > 0) {
                const r = l.interestRate;
                const n = l.endYear - l.startYear + 1;
                const principal = l.value;
                annualRepayment = principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
            } else {
                annualRepayment = l.value / (l.endYear - l.startYear + 1);
            }
        }
        liabilities[l.name] = { 
            value: l.value, 
            initialValue: l.value, 
            annualRepayment: annualRepayment,
            interestRate: l.interestRate || 0
        };
    });

    let annualIncomes = {};
    let annualExpenses = {};

    let annualPension = inputs.estimatedPension * 12;
    let initialPensionWithdrawal = 0;
	let amountPensionMessage = 0;

    for (let year = 0; currentAge < 95; year++) {

        let yearlyAssetReturns = {};
        if (isMonteCarlo) {
            const inflationMean = inputs.inflation;
            const inflationStdDev = inflationMean * 1.0;
            INFLATION_RATE = randomNormal(inflationMean, inflationStdDev);

            inputs.assets.forEach(asset => {
                const returnMean = asset.return;
                const returnStdDev = returnMean * 1.0;
                yearlyAssetReturns[asset.name] = randomNormal(returnMean, returnStdDev);
            });
        }

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
                let annualRepayment = 0;
                if (l.endYear > l.startYear) {
                    if (l.interestRate > 0) {
                        const r = l.interestRate;
                        const n = l.endYear - l.startYear + 1;
                        const principal = l.value;
                        annualRepayment = principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
                    } else {
                        annualRepayment = l.value / (l.endYear - l.startYear + 1);
                    }
                }
                liabilities[l.name] = { 
                    value: l.value, 
                    initialValue: l.value, 
                    annualRepayment: annualRepayment,
                    interestRate: l.interestRate || 0
                };
            }
            if (l.endYear < currentYear) {
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
        if (EARLY_RETIREMENT_AGE > 0 && currentAge >= EARLY_RETIREMENT_AGE && currentAge < LEGAL_PENSION_AGE) {
            totalAnnualIncome = 0;
        } else if (currentAge >= LEGAL_PENSION_AGE) {
            totalAnnualIncome = annualPension;
        }


        Object.keys(liabilities).forEach(name => {
            if (name === 'Deficit') return;

            const liability = liabilities[name];
            const liabilityInput = liabilityMap.get(name);
            if (liability.value > 0 && currentYear >= liabilityInput.startYear && (liabilityInput.endYear === 0 || currentYear <= liabilityInput.endYear)) {
                if (liability.interestRate > 0 && liability.annualRepayment > 0) {
                    const interestPaid = liability.value * liability.interestRate;
                    const principalPaid = liability.annualRepayment - interestPaid;
                    liability.value -= principalPaid;
                } else {
                    liability.value -= liability.annualRepayment;
                }
                if(liability.value < 0) liability.value = 0;
            }
        });

        Object.keys(assets).forEach(name => {
            const asset = assetMap.get(name);
            if(asset) {
                const assetReturn = isMonteCarlo && yearlyAssetReturns[name] !== undefined ? yearlyAssetReturns[name] : asset.return;
                assets[name] *= (1 + assetReturn * (1 - asset.tax));
            }
        });

        const totalAnnualExpenses = Object.values(tempAnnualExpenses).reduce((a, b) => a + b, 0);
        const savingsCapacity = totalAnnualIncome - totalAnnualExpenses;
        let uncoveredDeficit = 0;

        if (currentAge < LEGAL_PENSION_AGE) {
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
                uncoveredDeficit = deficit;
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
					if (currentAge === LEGAL_PENSION_AGE){
						amountPensionMessage = initialPensionWithdrawal
					}
            }

            const withdrawalAmount = initialPensionWithdrawal;
            const deficit = savingsCapacity < 0 ? -savingsCapacity : 0;
            let amountToWithdrawFromAssets = Math.max(withdrawalAmount, deficit);

            if (savingsCapacity > 0) {
                // Surplus from pension, invest it
                let savings = savingsCapacity;
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

            const activeAssetNames = Object.keys(assets);
            const withdrawalOrder = activeAssetNames
                .map(name => assetMap.get(name))
                .filter(a => a)
                .sort((a, b) => a.withdrawalOrder - b.withdrawalOrder)
                .map(a => a.name);

            withdrawalOrder.forEach(assetName => {
                if(assets[assetName] && amountToWithdrawFromAssets > 0) {
                    const withdrawal = Math.min(amountToWithdrawFromAssets, assets[assetName]);
                    assets[assetName] -= withdrawal;
                    amountToWithdrawFromAssets -= withdrawal;
                }
            });
            uncoveredDeficit = amountToWithdrawFromAssets;
        }

        const currentAllocation = getCurrentAllocation(currentYear, inputs.allocationPeriods);
        if (currentAllocation && currentAllocation.rebalance) {
            const rebalanceAssets = Object.keys(currentAllocation.allocation)
                .filter(assetName => currentAllocation.allocation[assetName] > 0);

            if (rebalanceAssets.length > 0) {
                const totalRebalanceValue = rebalanceAssets.reduce((total, assetName) => total + assets[assetName], 0);
                
                rebalanceAssets.forEach(assetName => {
                    const targetPercentage = currentAllocation.allocation[assetName];
                    const targetValue = totalRebalanceValue * targetPercentage;
                    assets[assetName] = targetValue;
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

    const earlyRetirementYear = checkForEarlyRetirement(results, EARLY_RETIREMENT_AGE || LEGAL_PENSION_AGE, inputs.withdrawalRate);

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
    if (withdrawalRate <= 0) return null;
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

// Box-Muller transform to get a normally distributed random number
function randomNormal(mean, stdDev) {
    let u1 = 0, u2 = 0;
    while (u1 === 0) u1 = Math.random(); //Converting [0,1) to (0,1)
    while (u2 === 0) u2 = Math.random();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z0 * stdDev + mean;
}

function runMonteCarloSimulation(inputs) {
    const NUM_SIMULATIONS = 500;
    const allSimulations = [];
    let successfulRuns = 0;

    for (let i = 0; i < NUM_SIMULATIONS; i++) {
        const simInputs = JSON.parse(JSON.stringify(inputs));

        const { results } = runSimulation(simInputs, true);
        allSimulations.push(results);

        const isSuccessful = results.every(r => r.net_worth >= 1);
        if (isSuccessful) {
            successfulRuns++;
        }
    }

    const successRate = successfulRuns / NUM_SIMULATIONS;

    // Process results for charting
    const percentileData = {
        "Top 5%": [],
        "Top 10%": [],
        "Top 15%": [],
        "Top 25%": [],
        "Median": [],
        "Bottom 25%": [],
        "Bottom 15%": [],
        "Bottom 10%": [],
        "Bottom 5%": [],
    };

    const numYears = allSimulations[0].length;
    const labels = allSimulations[0].map(r => r.year);

    for (let yearIndex = 0; yearIndex < numYears; yearIndex++) {
        const yearlyNetWorths = allSimulations.map(sim => sim[yearIndex].net_worth).sort((a, b) => a - b);
        
        percentileData["Top 5%"].push(yearlyNetWorths[Math.floor(NUM_SIMULATIONS * 0.95)]);
        percentileData["Top 10%"].push(yearlyNetWorths[Math.floor(NUM_SIMULATIONS * 0.90)]);
        percentileData["Top 15%"].push(yearlyNetWorths[Math.floor(NUM_SIMULATIONS * 0.85)]);
        percentileData["Top 25%"].push(yearlyNetWorths[Math.floor(NUM_SIMULATIONS * 0.75)]);
        percentileData["Median"].push(yearlyNetWorths[Math.floor(NUM_SIMULATIONS * 0.5)]);
        percentileData["Bottom 25%"].push(yearlyNetWorths[Math.floor(NUM_SIMULATIONS * 0.25)]);
        percentileData["Bottom 15%"].push(yearlyNetWorths[Math.floor(NUM_SIMULATIONS * 0.15)]);
        percentileData["Bottom 10%"].push(yearlyNetWorths[Math.floor(NUM_SIMULATIONS * 0.10)]);
        percentileData["Bottom 5%"].push(yearlyNetWorths[Math.floor(NUM_SIMULATIONS * 0.05)]);
    }

    return { successRate, percentileData, labels };
}