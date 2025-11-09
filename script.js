document.addEventListener('DOMContentLoaded', function () {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

    let uniqueIdCounter = 0;
    function getUniqueId(prefix = 'id') {
        uniqueIdCounter++;
        return `${prefix}-${uniqueIdCounter}`;
    }

    // Buttons
    const importBtn = document.getElementById('import-btn');
    const exportBtn = document.getElementById('export-btn');
    const runSimulationBtn = document.getElementById('run-simulation-btn');
    const addIncomeCategoryBtn = document.getElementById('add-income-category-btn');
    const addExpenseCategoryBtn = document.getElementById('add-expense-category-btn');
    const addAssetCategoryBtn = document.getElementById('add-asset-category-btn');
    const addLiabilityCategoryBtn = document.getElementById('add-liability-category-btn');
    const addAllocationPeriodBtn = document.getElementById('add-allocation-period-btn');
    const clearBtn = document.getElementById('clear-btn');
    const helpBtn = document.getElementById('help-btn');

    // Containers
    const incomeCategoriesContainer = document.getElementById('income-categories-container');
    const expenseCategoriesContainer = document.getElementById('expense-categories-container');
    const assetCategoriesContainer = document.getElementById('asset-categories-container');
    const liabilityCategoriesContainer = document.getElementById('liability-categories-container');
    const allocationPeriodsContainer = document.getElementById('allocation-periods-container');

    // Modal
    const helpModal = new bootstrap.Modal(document.getElementById('help-modal'));

    // Event Listeners
    importBtn.addEventListener('click', importData);
    exportBtn.addEventListener('click', exportData);
    runSimulationBtn.addEventListener('click', runAndRender);
    addIncomeCategoryBtn.addEventListener('click', () => addCategory(incomeCategoriesContainer, 'income'));
    addExpenseCategoryBtn.addEventListener('click', () => addCategory(expenseCategoriesContainer, 'expense'));
    addAssetCategoryBtn.addEventListener('click', () => addCategory(assetCategoriesContainer, 'asset'));
    addLiabilityCategoryBtn.addEventListener('click', () => addCategory(liabilityCategoriesContainer, 'liability'));
    addAllocationPeriodBtn.addEventListener('click', addAllocationPeriod);
    clearBtn.addEventListener('click', clearData);
    helpBtn.addEventListener('click', () => helpModal.show());

    const formattingRules = {
        // selector: { decimals, thousands }
        '#inflation': { decimals: 2, thousands: true },
        '#estimated-pension': { decimals: 0, thousands: true },
        '#withdrawal-rate': { decimals: 2, thousands: false },
        '#current-age': { decimals: 0, thousands: false },
        '#pension-age': { decimals: 0, thousands: false },
        '.category-value': { decimals: 0, thousands: true },
        '.category-return': { decimals: 2, thousands: true },
        '.category-tax': { decimals: 2, thousands: false },
        '.category-start-year': { decimals: 0, thousands: false },
        '.category-end-year': { decimals: 0, thousands: false },
        '.category-withdrawal-order': { decimals: 0, thousands: false },
        '.allocation-start-year': { decimals: 0, thousands: false },
        '.allocation-asset': { decimals: 0, thousands: false },
    };

    function parseFormattedNumber(value) {
        if (typeof value !== 'string' || value.trim() === '') {
            return NaN;
        }
        const sanitizedValue = value.replace(/,/g, '');
        return parseFloat(sanitizedValue);
    }

    function formatNumberForDisplay(value, { decimals = 0, thousands = false } = {}) {
        const num = parseFormattedNumber(String(value));
        if (isNaN(num)) return '';

        return num.toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
            useGrouping: thousands
        });
    }

    function formatNumberForEdit(value) {
        const num = parseFormattedNumber(String(value));
        if (isNaN(num)) return '';
        return String(num);
    }

    function onFocusNumber(event) {
        const input = event.target;
        if (input.value) {
            input.value = formatNumberForEdit(input.value);
            input.select();
        }
    }

    function onBlurNumber(event, rules) {
        const input = event.target;
        if (input.value) {
            input.value = formatNumberForDisplay(input.value, rules);
        }
    }

    function applyNumberFormatting(container) {
        for (const selector in formattingRules) {
            const rules = formattingRules[selector];
            container.querySelectorAll(selector).forEach(input => {
                // Prevent duplicate listeners
                const isListenerAttached = input.dataset.formattingAttached;
                if (isListenerAttached) return;

                input.addEventListener('focus', onFocusNumber);
                input.addEventListener('blur', (e) => onBlurNumber(e, rules));
                
                if (input.value) {
                    input.value = formatNumberForDisplay(input.value, rules);
                }
                input.dataset.formattingAttached = 'true';
            });
        }
    }

    function addCategory(container, type, category = {}) {
        const row = document.createElement('div');
        row.classList.add('row', 'mb-3', 'category-row');
        row.dataset.type = type;

        let fields = '';

        switch (type) {
            case 'asset':
                fields = getAssetFields(category);
                break;
            case 'liability':
                fields = getLiabilityFields(category);
                break;
            case 'income':
                fields = getIncomeFields(category);
                break;
            case 'expense':
                fields = getExpenseFields(category);
                break;
        }

        row.innerHTML = fields;
        container.appendChild(row);

        const tooltipTriggerList = row.querySelectorAll('[data-bs-toggle="tooltip"]');
        [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

        row.querySelector('.delete-category-btn').addEventListener('click', () => row.remove());
        
        applyNumberFormatting(row);
    }

    function getAssetFields(category) {
        const nameId = getUniqueId('asset-name');
        const valueId = getUniqueId('asset-value');
        const returnId = getUniqueId('asset-return');
        const taxId = getUniqueId('asset-tax');
        const startYearId = getUniqueId('asset-start-year');
        const endYearId = getUniqueId('asset-end-year');
        const withdrawalOrderId = getUniqueId('asset-withdrawal-order');
        return `
            <div class="col-6 col-md-4 col-lg-3 col-xxl-2"><label for="${nameId}" class="form-label" data-bs-toggle="tooltip" title="A unique name for this category.">Name <i class="bi bi-info-circle"></i></label><input type="text" id="${nameId}" class="form-control category-name" value="${category.name || ''}"></div>
            <div class="col-6 col-md-4 col-lg-3 col-xxl-2"><label for="${valueId}" class="form-label" data-bs-toggle="tooltip" title="The current value in euros.">Value <i class="bi bi-info-circle"></i></label><input type="text" id="${valueId}" class="form-control category-value" value="${category.value || ''}"></div>
            <div class="col-6 col-md-4 col-lg-3 col-xxl-2"><label for="${returnId}" class="form-label" data-bs-toggle="tooltip" title="The expected annual return on this asset, after costs.">Return (%) <i class="bi bi-info-circle"></i></label><input type="text" id="${returnId}" class="form-control category-return" value="${category.return || ''}"></div>
            <div class="col-6 col-md-4 col-lg-3 col-xxl-2"><label for="${taxId}" class="form-label" data-bs-toggle="tooltip" title="The annual tax on the return or capital gain.">Tax (%) <i class="bi bi-info-circle"></i></label><input type="text" id="${taxId}" class="form-control category-tax" value="${category.tax || ''}"></div>
            <div class="col-6 col-md-4 col-lg-3 col-xxl-1"><label for="${startYearId}" class="form-label" data-bs-toggle="tooltip" title="The year this category becomes active.">Start <i class="bi bi-info-circle"></i></label><input type="text" id="${startYearId}" class="form-control category-start-year" value="${category.startYear || new Date().getFullYear()}"></div>
            <div class="col-6 col-md-4 col-lg-3 col-xxl-1"><label for="${endYearId}" class="form-label" data-bs-toggle="tooltip" title="The year this category stops. Leave empty if not applicable.">End <i class="bi bi-info-circle"></i></label><input type="text" id="${endYearId}" class="form-control category-end-year" value="${category.endYear || ''}"></div>
            <div class="col-6 col-md-4 col-lg-3 col-xxl-1"><label for="${withdrawalOrderId}" class="form-label" data-bs-toggle="tooltip" title="The withdrawal order in case of a deficit or after retirement (1 = first, 99 = last).">Order <i class="bi bi-info-circle"></i></label><input type="text" id="${withdrawalOrderId}" class="form-control category-withdrawal-order" value="${category.withdrawalOrder || ''}"></div>
            <div class="col-6 col-md-4 col-lg-3 col-xxl-1 d-flex align-items-end"><button class="btn btn-danger btn-sm delete-category-btn w-100" aria-label="Delete asset category"><i class="bi bi-trash"></i></button></div>
        `;
    }

    function getLiabilityFields(category) {
        const nameId = getUniqueId('liability-name');
        const valueId = getUniqueId('liability-value');
        const startYearId = getUniqueId('liability-start-year');
        const endYearId = getUniqueId('liability-end-year');
        return `
            <div class="col-6 col-md-4 col-lg-3 col-xxl-2"><label for="${nameId}" class="form-label" data-bs-toggle="tooltip" title="A unique name for this category.">Name <i class="bi bi-info-circle"></i></label><input type="text" id="${nameId}" class="form-control category-name" value="${category.name || ''}"></div>
            <div class="col-6 col-md-4 col-lg-3 col-xxl-2"><label for="${valueId}" class="form-label" data-bs-toggle="tooltip" title="The current value in euros.">Value <i class="bi bi-info-circle"></i></label><input type="text" id="${valueId}" class="form-control category-value" value="${category.value || ''}"></div>
            <div class="col-6 col-md-4 col-lg-3 col-xxl-1"><label for="${startYearId}" class="form-label" data-bs-toggle="tooltip" title="The year this category becomes active.">Start <i class="bi bi-info-circle"></i></label><input type="text" id="${startYearId}" class="form-control category-start-year" value="${category.startYear || new Date().getFullYear()}"></div>
            <div class="col-6 col-md-4 col-lg-3 col-xxl-1"><label for="${endYearId}" class="form-label" data-bs-toggle="tooltip" title="The year this category stops. Leave empty if not applicable.">End <i class="bi bi-info-circle"></i></label><input type="text" id="${endYearId}" class="form-control category-end-year" value="${category.endYear || ''}"></div>
            <div class="col-6 col-md-4 col-lg-3 col-xxl-1 d-flex align-items-end"><button class="btn btn-danger btn-sm delete-category-btn w-100" aria-label="Delete liability category"><i class="bi bi-trash"></i></button></div>
        `;
    }

    function getIncomeFields(category) {
        const nameId = getUniqueId('income-name');
        const valueId = getUniqueId('income-value');
        const frequencyId = getUniqueId('income-frequency');
        const indexedId = getUniqueId('income-indexed');
        const startYearId = getUniqueId('income-start-year');
        const endYearId = getUniqueId('income-end-year');
        return `
            <div class="col-6 col-md-4 col-lg-3 col-xxl-2"><label for="${nameId}" class="form-label" data-bs-toggle="tooltip" title="A unique name for this category.">Name <i class="bi bi-info-circle"></i></label><input type="text" id="${nameId}" class="form-control category-name" value="${category.name || ''}"></div>
            <div class="col-6 col-md-4 col-lg-3 col-xxl-2"><label for="${valueId}" class="form-label" data-bs-toggle="tooltip" title="The current value in euros.">Value <i class="bi bi-info-circle"></i></label><input type="text" id="${valueId}" class="form-control category-value" value="${category.value || ''}"></div>
            <div class="col-6 col-md-4 col-lg-3 col-xxl-2"><label for="${frequencyId}" class="form-label" data-bs-toggle="tooltip" title="How often this income occurs.">Frequency <i class="bi bi-info-circle"></i></label><select id="${frequencyId}" class="form-select category-frequency"><option value="monthly" ${category.frequency === 'monthly' ? 'selected' : ''}>Monthly</option><option value="yearly" ${category.frequency === 'yearly' ? 'selected' : ''}>Yearly</option></select></div>
            <div class="col-6 col-md-4 col-lg-3 col-xxl-1"><label for="${indexedId}" class="form-label" data-bs-toggle="tooltip" title="Check if this amount should increase annually with inflation.">Index <i class="bi bi-info-circle"></i></label><input id="${indexedId}" class="form-check-input d-block category-indexed" type="checkbox" ${category.indexed ? 'checked' : ''}></div>
            <div class="col-6 col-md-4 col-lg-3 col-xxl-1"><label for="${startYearId}" class="form-label" data-bs-toggle="tooltip" title="The year this category becomes active.">Start <i class="bi bi-info-circle"></i></label><input type="text" id="${startYearId}" class="form-control category-start-year" value="${category.startYear || new Date().getFullYear()}"></div>
            <div class="col-6 col-md-4 col-lg-3 col-xxl-1"><label for="${endYearId}" class="form-label" data-bs-toggle="tooltip" title="The year this category stops. Leave empty if not applicable.">End <i class="bi bi-info-circle"></i></label><input type="text" id="${endYearId}" class="form-control category-end-year" value="${category.endYear || ''}"></div>
            <div class="col-6 col-md-4 col-lg-3 col-xxl-1 d-flex align-items-end"><button class="btn btn-danger btn-sm delete-category-btn w-100" aria-label="Delete income category"><i class="bi bi-trash"></i></button></div>
        `;
    }

    function getExpenseFields(category) {
        const nameId = getUniqueId('expense-name');
        const valueId = getUniqueId('expense-value');
        const frequencyId = getUniqueId('expense-frequency');
        const indexedId = getUniqueId('expense-indexed');
        const startYearId = getUniqueId('expense-start-year');
        const endYearId = getUniqueId('expense-end-year');
        return `
            <div class="col-6 col-md-4 col-lg-3 col-xxl-2"><label for="${nameId}" class="form-label" data-bs-toggle="tooltip" title="A unique name for this category.">Name <i class="bi bi-info-circle"></i></label><input type="text" id="${nameId}" class="form-control category-name" value="${category.name || ''}"></div>
            <div class="col-6 col-md-4 col-lg-3 col-xxl-2"><label for="${valueId}" class="form-label" data-bs-toggle="tooltip" title="The current value in euros.">Value <i class="bi bi-info-circle"></i></label><input type="text" id="${valueId}" class="form-control category-value" value="${category.value || ''}"></div>
            <div class="col-6 col-md-4 col-lg-3 col-xxl-2"><label for="${frequencyId}" class="form-label" data-bs-toggle="tooltip" title="How often this expense occurs.">Frequency <i class="bi bi-info-circle"></i></label><select id="${frequencyId}" class="form-select category-frequency"><option value="monthly" ${category.frequency === 'monthly' ? 'selected' : ''}>Monthly</option><option value="yearly" ${category.frequency === 'yearly' ? 'selected' : ''}>Yearly</option></select></div>
            <div class="col-6 col-md-4 col-lg-3 col-xxl-1"><label for="${indexedId}" class="form-label" data-bs-toggle="tooltip" title="Check if this amount should increase annually with inflation.">Index <i class="bi bi-info-circle"></i></label><input id="${indexedId}" class="form-check-input d-block category-indexed" type="checkbox" ${category.indexed ? 'checked' : ''}></div>
            <div class="col-6 col-md-4 col-lg-3 col-xxl-1"><label for="${startYearId}" class="form-label" data-bs-toggle="tooltip" title="The year this category becomes active.">Start <i class="bi bi-info-circle"></i></label><input type="text" id="${startYearId}" class="form-control category-start-year" value="${category.startYear || new Date().getFullYear()}"></div>
            <div class="col-6 col-md-4 col-lg-3 col-xxl-1"><label for="${endYearId}" class="form-label" data-bs-toggle="tooltip" title="The year this category stops. Leave empty if not applicable.">End <i class="bi bi-info-circle"></i></label><input type="text" id="${endYearId}" class="form-control category-end-year" value="${category.endYear || ''}"></div>
            <div class="col-6 col-md-4 col-lg-3 col-xxl-1 d-flex align-items-end"><button class="btn btn-danger btn-sm delete-category-btn w-100" aria-label="Delete expense category"><i class="bi bi-trash"></i></button></div>
        `;
    }

    function addAllocationPeriod(period = {}) {
        const periodId = getUniqueId('period');
        const startYearId = getUniqueId('allocation-start-year');
        const row = document.createElement('div');
        row.classList.add('row', 'mb-3', 'allocation-period');
        row.innerHTML = `
            <div class="col-xxl-3">
                <label for="${startYearId}" class="form-label">Start Year</label>
                <input type="text" id="${startYearId}" class="form-control allocation-start-year" value="${period.startYear || new Date().getFullYear()}">
            </div>
            <div class="col-xxl-6" id="allocation-assets-${periodId}"></div>
            <div class="col-xxl-3"><button class="btn btn-danger btn-sm delete-period-btn" aria-label="Delete allocation period"><i class="bi bi-trash"></i></button></div>
            <div class="col-xxl-12"><div class="progress mt-2"><div class="progress-bar" role="progressbar" style="width: 0%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">0%</div></div></div>
        `;
        allocationPeriodsContainer.appendChild(row);
        updateAllocationAssets(row, period.allocation || {});

        row.querySelector('.delete-period-btn').addEventListener('click', () => row.remove());
        applyNumberFormatting(row);
    }

    function updateAllocationAssets(periodRow, allocation) {
        const periodId = periodRow.querySelector('[id^=allocation-assets-]').id;
        const container = document.getElementById(periodId);
        container.innerHTML = '';
        const assetNames = getAssetNames();
        assetNames.forEach(name => {
            const div = document.createElement('div');
            div.classList.add('input-group', 'mb-1');
            div.innerHTML = `
                <span class="input-group-text">${name} %</span>
                <input type="text" class="form-control allocation-asset" data-asset-name="${name}" value="${allocation[name] || 0}">
            `;
            container.appendChild(div);
        });
        
        container.querySelectorAll('.allocation-asset').forEach(input => {
            input.addEventListener('blur', () => {
                updateAllocationTotal(periodRow);
            });
        });

        applyNumberFormatting(container);
        updateAllocationTotal(periodRow);
    }

    function updateAllocationTotal(periodRow) {
        let total = 0;
        periodRow.querySelectorAll('.allocation-asset').forEach(input => {
            total += parseFormattedNumber(input.value) || 0;
        });
        const progressBar = periodRow.querySelector('.progress-bar');
        const displayTotal = Math.round(total);
        progressBar.style.width = `${displayTotal}%`;
        progressBar.textContent = `${displayTotal}%`;
        if (displayTotal !== 100) {
            progressBar.classList.add('bg-danger');
        } else {
            progressBar.classList.remove('bg-danger');
        }
    }

    function getAssetNames() {
        const names = [];
        document.querySelectorAll('#asset-categories-container .category-name').forEach(input => {
            if(input.value) names.push(input.value);
        });
        return names;
    }

    function clearData() {
        if (confirm('Are you sure you want to clear all data?')) {
            document.getElementById('current-age').value = '';
            document.getElementById('inflation').value = '';
            document.getElementById('pension-age').value = '';
            document.getElementById('estimated-pension').value = '';
			document.getElementById('withdrawal-rate').value = '';

            incomeCategoriesContainer.innerHTML = '';
            expenseCategoriesContainer.innerHTML = '';
            assetCategoriesContainer.innerHTML = '';
            liabilityCategoriesContainer.innerHTML = '';
            allocationPeriodsContainer.innerHTML = '';
        }
    }

    function getUserInputs() {

        const incomes = [];
        document.querySelectorAll('#income-categories-container .category-row').forEach(row => {
            const name = row.querySelector('.category-name').value;
            if (!name) return;

            incomes.push({
                name: name,
                value: parseFormattedNumber(row.querySelector('.category-value').value) || 0,
                frequency: row.querySelector('.category-frequency').value,
                indexed: row.querySelector('.category-indexed').checked,
                startYear: parseInt(parseFormattedNumber(row.querySelector('.category-start-year').value)) || 0,
                endYear: parseInt(parseFormattedNumber(row.querySelector('.category-end-year').value)) || 0,
            });
        });

        const expenses = [];
        document.querySelectorAll('#expense-categories-container .category-row').forEach(row => {
            const name = row.querySelector('.category-name').value;
            if (!name) return;
            expenses.push({
                name: name,
                value: parseFormattedNumber(row.querySelector('.category-value').value) || 0,
                frequency: row.querySelector('.category-frequency').value,
                indexed: row.querySelector('.category-indexed').checked,
                startYear: parseInt(parseFormattedNumber(row.querySelector('.category-start-year').value)) || 0,
                endYear: parseInt(parseFormattedNumber(row.querySelector('.category-end-year').value)) || 0,
            });
        });

        const assets = [];
        document.querySelectorAll('#asset-categories-container .category-row').forEach(row => {
            const name = row.querySelector('.category-name').value;
            if (!name) return;
            assets.push({
                name: name,
                value: parseFormattedNumber(row.querySelector('.category-value').value) || 0,
                return: parseFormattedNumber(row.querySelector('.category-return').value) / 100 || 0,
                tax: parseFormattedNumber(row.querySelector('.category-tax').value) / 100 || 0,
                startYear: parseInt(parseFormattedNumber(row.querySelector('.category-start-year').value)) || 0,
                endYear: parseInt(parseFormattedNumber(row.querySelector('.category-end-year').value)) || 0,
                withdrawalOrder: parseInt(parseFormattedNumber(row.querySelector('.category-withdrawal-order').value)) || 99,
            });
        });

        const liabilities = [];
        document.querySelectorAll('#liability-categories-container .category-row').forEach(row => {
            const name = row.querySelector('.category-name').value;
            if (!name) return;
            liabilities.push({
                name: name,
                value: parseFormattedNumber(row.querySelector('.category-value').value) || 0,
                startYear: parseInt(parseFormattedNumber(row.querySelector('.category-start-year').value)) || 0,
                endYear: parseInt(parseFormattedNumber(row.querySelector('.category-end-year').value)) || 0,
            });
        });

        const allocationPeriods = [];
        document.querySelectorAll('.allocation-period').forEach(row => {
            const allocation = {};
            row.querySelectorAll('.allocation-asset').forEach(input => {
                allocation[input.dataset.assetName] = parseFormattedNumber(input.value) / 100 || 0;
            });
            allocationPeriods.push({
                startYear: parseInt(parseFormattedNumber(row.querySelector('.allocation-start-year').value)) || 0,
                allocation: allocation,
            });
        });

        return {
            currentAge: parseInt(parseFormattedNumber(document.getElementById('current-age').value)) || 0,
            inflation: parseFormattedNumber(document.getElementById('inflation').value) / 100 || 0,
            pensionAge: parseInt(parseFormattedNumber(document.getElementById('pension-age').value)) || 0,
            estimatedPension: parseFormattedNumber(document.getElementById('estimated-pension').value) || 0,
            withdrawalRate: parseFormattedNumber(document.getElementById('withdrawal-rate').value) / 100 || 0,
            incomes: incomes,
            expenses: expenses,
            assets: assets,
            liabilities: liabilities,
            allocationPeriods: allocationPeriods,
        };
    }

    function runAndRender() {
        console.log('runAndRender called');
        const inputs = getUserInputs();
        const { results, earlyRetirementYear, amountPensionMessage } = window.runSimulation(inputs);
        renderTable(results);
        renderCharts(results);

        const earlyRetirementMessage = document.getElementById('early-retirement-message');
        const pensionWithdrawalMessage = document.getElementById('pension-withdrawal-message');

        if (earlyRetirementYear) {
            const earlyRetirementAge = results.find(r => r.year === earlyRetirementYear).age;
            let message = `You may be able to retire early in <strong>${earlyRetirementYear}</strong> at the age of <strong>${earlyRetirementAge}</strong>!`;
            earlyRetirementMessage.innerHTML = message;
            earlyRetirementMessage.style.display = 'block';
        } else {
            earlyRetirementMessage.style.display = 'none';
        }

        if (amountPensionMessage > 0) {
            const monthlyWithdrawal = amountPensionMessage / 12;
            let message = `Your first annual withdrawal upon reaching retirement age would be <strong>$${amountPensionMessage.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</strong> ($${monthlyWithdrawal.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})} per month).`;
            pensionWithdrawalMessage.innerHTML = message;
            pensionWithdrawalMessage.style.display = 'block';
        } else {
            pensionWithdrawalMessage.style.display = 'none';
        }

        document.getElementById('results').style.display = 'block';
    }

    let wealthChart = null;

    function renderCharts(results) {
        if (wealthChart) wealthChart.destroy();

        if(results.length === 0) return;

        const labels = results.map(r => r.year);
        const assetKeys = Object.keys(results[0].assets);

        const assetDatasets = assetKeys.map(key => {
            return {
                label: key,
                data: results.map(r => r.assets[key]),
                backgroundColor: getRandomColor(),
            };
        });

        const netWorthData = results.map(r => r.net_worth);

        const wealthCtx = document.getElementById('wealth-evolution-chart').getContext('2d');
        wealthChart = new Chart(wealthCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: assetDatasets.concat({
                    label: 'Net Worth',
                    data: netWorthData,
                    type: 'line',
                    borderColor: '#0d6efd',
                    tension: 0.1
                })
            },
            options: {
                scales: {
                    x: {
                        stacked: true,
                    },
                    y: {
                        stacked: true,
                        ticks: {
                            callback: function(value) {
                                return value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }



    function exportData() {
        const data = getUserInputs();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'wealth-planner-data.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = e => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = readerEvent => {
                const content = readerEvent.target.result;
                const data = JSON.parse(content);
                setUserValues(data);
            };
            reader.readAsText(file);
        };
        input.click();
    }

    function setUserValues(data) {
        document.getElementById('current-age').value = data.currentAge;
        document.getElementById('inflation').value = String(data.inflation * 100);
        document.getElementById('pension-age').value = data.pensionAge;
        document.getElementById('estimated-pension').value = data.estimatedPension;
        document.getElementById('withdrawal-rate').value = String(data.withdrawalRate * 100);

        incomeCategoriesContainer.innerHTML = '';
        data.incomes.forEach(income => addCategory(incomeCategoriesContainer, 'income', income));

        expenseCategoriesContainer.innerHTML = '';
        data.expenses.forEach(expense => addCategory(expenseCategoriesContainer, 'expense', expense));

        assetCategoriesContainer.innerHTML = '';
        data.assets.forEach(asset => {
            const modifiedAsset = { ...asset };
            if (typeof modifiedAsset.return === 'number') {
                modifiedAsset.return = String(modifiedAsset.return * 100);
            }
            if (typeof modifiedAsset.tax === 'number') {
                modifiedAsset.tax = String(modifiedAsset.tax * 100);
            }
            addCategory(assetCategoriesContainer, 'asset', modifiedAsset);
        });

        liabilityCategoriesContainer.innerHTML = '';
        data.liabilities.forEach(liability => addCategory(liabilityCategoriesContainer, 'liability', liability));

        allocationPeriodsContainer.innerHTML = '';
        data.allocationPeriods.forEach(period => {
            const modifiedPeriod = { ...period };
            if (modifiedPeriod.allocation) {
                Object.keys(modifiedPeriod.allocation).forEach(assetName => {
                    modifiedPeriod.allocation[assetName] = String(modifiedPeriod.allocation[assetName] * 100);
                });
            }
            addAllocationPeriod(modifiedPeriod);
        });

        applyNumberFormatting(document.body);
    }

    function renderTable(results) {
        const tableHead = document.getElementById('results-table-head');
        const tableBody = document.getElementById('results-table-body');
        tableHead.innerHTML = ''; // Clear previous results
        tableBody.innerHTML = ''; // Clear previous results

        if(results.length === 0) return;

        const assetKeys = Object.keys(results[0].assets);
        const liabilityKeys = Object.keys(results[0].liabilities);

        const headerRow = document.createElement('tr');
        let headerHtml = `<th>Year</th><th>Age</th><th>Net Income</th><th>Expenses</th><th>Savings Capacity</th><th>Savings Rate</th><th>Net Worth</th>`;
        assetKeys.forEach(key => headerHtml += `<th>${key} (Asset)</th>`);
        liabilityKeys.forEach(key => headerHtml += `<th>${key} (Liability)</th>`);
        headerRow.innerHTML = headerHtml;
        tableHead.appendChild(headerRow);

        results.forEach(row => {
            const tr = document.createElement('tr');
            let rowHtml = `
                <td>${row.year}</td>
                <td>${row.age}</td>
                <td>${row.net_income.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                <td>${row.expenses.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                <td>${row.savings_capacity.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                <td>${(row.savings_rate * 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</td>
                <td>${row.net_worth.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
            `;
            assetKeys.forEach(key => {
                const assetValue = row.assets[key] || 0;
                rowHtml += `<td>${assetValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>`;
            });
            liabilityKeys.forEach(key => {
                const liability = row.liabilities[key];
                const liabilityValue = liability ? liability.value : 0;
                rowHtml += `<td>${liabilityValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>`;
            });
            tr.innerHTML = rowHtml;
            tableBody.appendChild(tr);
        });
    }

    function getRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }
    // Initial setup
    addCategory(assetCategoriesContainer, 'asset', { name: 'Own Home', value: '300000', return: '4', tax: '0', withdrawalOrder: 3 });
    addCategory(assetCategoriesContainer, 'asset', { name: 'Stocks', value: '50000', return: '8', tax: '0', withdrawalOrder: 1 });
    addCategory(assetCategoriesContainer, 'asset', { name: 'Savings Account', value: '20000', return: '1', tax: '0', withdrawalOrder: 2 });
    addCategory(liabilityCategoriesContainer, 'liability', { name: 'Mortgage', value: '250000', endYear: '2045' });
    addCategory(incomeCategoriesContainer, 'income', { name: 'Salary', value: '3000', frequency: 'monthly', indexed: true });
    addCategory(expenseCategoriesContainer, 'expense', { name: 'Living Expenses', value: '1700', frequency: 'monthly', indexed: true });
    addCategory(expenseCategoriesContainer, 'expense', { name: 'Mortgage Repayment', value: '1250', frequency: 'monthly', indexed: false, endYear: '2045' });
	addAllocationPeriod({ allocation: { 'Stocks': 90, 'Savings Account': 10 } });
    
    applyNumberFormatting(document.body);

    // Dark Mode Toggle
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const currentTheme = localStorage.getItem('theme');

    if (currentTheme) {
        document.documentElement.setAttribute('data-bs-theme', currentTheme);
        if (currentTheme === 'dark') {
            darkModeToggle.checked = true;
        }
    }

    darkModeToggle.addEventListener('change', function() {
        if(this.checked) {
            document.documentElement.setAttribute('data-bs-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-bs-theme', 'light');
            localStorage.setItem('theme', 'light');
        }
    });
});