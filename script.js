document.addEventListener('DOMContentLoaded', function () {
    let uniqueIdCounter = 0;
    function getUniqueId(prefix = 'id') {
        uniqueIdCounter++;
        return `${prefix}-${uniqueIdCounter}`;
    }

    let hasSimulationRanOnce = false;
    let assetColors = {};
    let forceLoadDefaultData = false;

    function autoRunSimulationIfEnabled() {
        if (hasSimulationRanOnce) {
            runAndRender(false);
        }
        updateSectionTitles();
    }

    function getAssetColor(assetName) {
        if (!assetColors[assetName]) {
            assetColors[assetName] = getRandomColor();
        }
        return assetColors[assetName];
    }

    function displayAlerts(messages, type = 'danger') {
        const alertsContainer = document.getElementById('alerts-container');
        alertsContainer.innerHTML = '';
        messages.forEach(msg => {
            const alertEl = document.createElement('div');
            alertEl.className = `alert alert-${type} alert-dismissible fade show`;
            alertEl.setAttribute('role', 'alert');
            alertEl.innerHTML = `
                ${msg}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            `;
            alertsContainer.appendChild(alertEl);
        });
    }

    function validateAllInputs() {
        const errors = [];
        document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));

        const clearValidation = (event) => {
            event.target.classList.remove('is-invalid');
            const stillInvalid = document.querySelector('.is-invalid');
            if (!stillInvalid) {
                document.getElementById('alerts-container').innerHTML = '';
            }
        };

        document.querySelectorAll('.category-row').forEach(row => {
            const startYearInput = row.querySelector('.category-start-year');
            const endYearInput = row.querySelector('.category-end-year');

            if (startYearInput && endYearInput) {
                const startYear = parseFormattedNumber(startYearInput.value);
                const endYear = parseFormattedNumber(endYearInput.value);

                if (!isNaN(endYear) && !isNaN(startYear) && endYear < startYear) {
                    errors.push(getTranslation('endYearBeforeStartYearError'));
                    [startYearInput, endYearInput].forEach(input => {
                        input.classList.add('is-invalid');
                        input.addEventListener('input', clearValidation, { once: true });
                    });
                }
            }
        });

        const currentAgeInput = document.getElementById('current-age');
        const pensionAgeInput = document.getElementById('pension-age');
        const currentAge = parseFormattedNumber(currentAgeInput.value);
        const pensionAge = parseFormattedNumber(pensionAgeInput.value);

        // Allow currentAge > pensionAge if pensionAge is a plausible past retirement age (e.g., >= 18)
        if (!isNaN(currentAge) && !isNaN(pensionAge) && pensionAge < currentAge && pensionAge < 18) {
            errors.push(getTranslation('retirementAgeBeforeCurrentAgeError'));
            [currentAgeInput, pensionAgeInput].forEach(input => {
                input.classList.add('is-invalid');
                input.addEventListener('input', clearValidation, { once: true });
            });
        }

        return [...new Set(errors)];
    }

    let toastInstance = null;
    function showToast(message) {
        const toastEl = document.getElementById('app-toast');
        if (!toastInstance) {
            toastInstance = new bootstrap.Toast(toastEl);
        }
        toastEl.querySelector('.toast-body').textContent = message;
        toastInstance.show();
    }

    // Containers
    const incomeCategoriesContainer = document.getElementById('income-categories-container');
    const expenseCategoriesContainer = document.getElementById('expense-categories-container');
    const assetCategoriesContainer = document.getElementById('asset-categories-container');
    const liabilityCategoriesContainer = document.getElementById('liability-categories-container');
    const allocationPeriodsContainer = document.getElementById('allocation-periods-container');

    const formattingRules = {
        '#inflation': { decimals: 2, thousands: true },
        '#estimated-pension': { decimals: 0, thousands: true },
        '#withdrawal-rate': { decimals: 2, thousands: false },
        '#current-age': { decimals: 0, thousands: false },
        '#pension-age': { decimals: 0, thousands: false },
        '#early-retirement-age': { decimals: 0, thousands: false },
        '.category-value': { decimals: 0, thousands: true },
        '.category-return': { decimals: 2, thousands: true },
        '.category-tax': { decimals: 2, thousands: false },
        '.category-interest-rate': { decimals: 2, thousands: false },
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

        row.querySelectorAll('[data-i18n-title-key]').forEach(element => {
            const key = element.getAttribute('data-i18n-title-key');
            element.setAttribute('title', getTranslation(key));
        });

        const tooltipTriggerList = row.querySelectorAll('[data-bs-toggle="tooltip"]');
        [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

        row.querySelector('.delete-category-btn').addEventListener('click', () => {
            row.remove();
            autoRunSimulationIfEnabled();
        });
        
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
            <div class="col-6 col-md-4 col-lg-3 col-xxl-2"><label for="${nameId}" class="form-label" data-bs-toggle="tooltip" data-i18n-title-key="assetNameTooltip">${getTranslation('nameLabel')} <i class="bi bi-info-circle"></i></label><input type="text" id="${nameId}" class="form-control category-name" value="${category.name || ''}"></div>
            <div class="col-6 col-md-4 col-lg-3 col-xxl-2"><label for="${valueId}" class="form-label" data-bs-toggle="tooltip" data-i18n-title-key="assetValueTooltip">${getTranslation('valueLabel')} <i class="bi bi-info-circle"></i></label><input type="text" id="${valueId}" class="form-control category-value" value="${category.value || ''}"></div>
            <div class="col-6 col-md-4 col-lg-3 col-xxl-2"><label for="${returnId}" class="form-label" data-bs-toggle="tooltip" data-i18n-title-key="assetReturnTooltip">${getTranslation('returnLabel')} <i class="bi bi-info-circle"></i></label><input type="text" id="${returnId}" class="form-control category-return" value="${category.return || ''}"></div>
            <div class="col-6 col-md-4 col-lg-3 col-xxl-2"><label for="${taxId}" class="form-label" data-bs-toggle="tooltip" data-i18n-title-key="assetTaxTooltip">${getTranslation('taxLabel')} <i class="bi bi-info-circle"></i></label><input type="text" id="${taxId}" class="form-control category-tax" value="${category.tax || ''}"></div>
            <div class="col-6 col-md-4 col-lg-3 col-xxl-1"><label for="${startYearId}" class="form-label" data-bs-toggle="tooltip" data-i18n-title-key="assetStartYearTooltip">${getTranslation('startLabel')} <i class="bi bi-info-circle"></i></label><input type="text" id="${startYearId}" class="form-control category-start-year" value="${category.startYear || new Date().getFullYear()}"></div>
            <div class="col-6 col-md-4 col-lg-3 col-xxl-1"><label for="${endYearId}" class="form-label" data-bs-toggle="tooltip" data-i18n-title-key="assetEndYearTooltip">${getTranslation('endLabel')} <i class="bi bi-info-circle"></i></label><input type="text" id="${endYearId}" class="form-control category-end-year" value="${category.endYear || ''}"></div>
            <div class="col-6 col-md-4 col-lg-3 col-xxl-1"><label for="${withdrawalOrderId}" class="form-label" data-bs-toggle="tooltip" data-i18n-title-key="assetWithdrawalOrderTooltip">${getTranslation('withdrawalOrderLabel')} <i class="bi bi-info-circle"></i></label><input type="text" id="${withdrawalOrderId}" class="form-control category-withdrawal-order" value="${category.withdrawalOrder || ''}"></div>
            <div class="col-6 col-md-4 col-lg-3 col-xxl-1 d-flex align-items-end"><i class="bi bi-grip-vertical drag-handle me-2" style="cursor: move; font-size: 1.2rem;"></i><button class="btn btn-danger btn-sm delete-category-btn" aria-label="${getTranslation('deleteAssetCategoryLabel')}"><i class="bi bi-trash"></i></button></div>
        `;
    }

    function getLiabilityFields(category) {
        const nameId = getUniqueId('liability-name');
        const valueId = getUniqueId('liability-value');
        const interestRateId = getUniqueId('liability-interest-rate');
        const startYearId = getUniqueId('liability-start-year');
        const endYearId = getUniqueId('liability-end-year');
        return `
            <div class="col-6 col-md-4 col-lg-3 col-xxl-2"><label for="${nameId}" class="form-label" data-bs-toggle="tooltip" data-i18n-title-key="liabilityNameTooltip">${getTranslation('nameLabel')} <i class="bi bi-info-circle"></i></label><input type="text" id="${nameId}" class="form-control category-name" value="${category.name || ''}"></div>
            <div class="col-6 col-md-4 col-lg-3 col-xxl-2"><label for="${valueId}" class="form-label" data-bs-toggle="tooltip" data-i18n-title-key="liabilityValueTooltip">${getTranslation('valueLabel')} <i class="bi bi-info-circle"></i></label><input type="text" id="${valueId}" class="form-control category-value" value="${category.value || ''}"></div>
            <div class="col-6 col-md-4 col-lg-3 col-xxl-2"><label for="${interestRateId}" class="form-label" data-bs-toggle="tooltip" data-i18n-title-key="liabilityInterestRateTooltip">${getTranslation('interestRateLabel')} <i class="bi bi-info-circle"></i></label><input type="text" id="${interestRateId}" class="form-control category-interest-rate" value="${category.interestRate || ''}"></div>
            <div class="col-6 col-md-4 col-lg-3 col-xxl-1"><label for="${startYearId}" class="form-label" data-bs-toggle="tooltip" data-i18n-title-key="liabilityStartYearTooltip">${getTranslation('startLabel')} <i class="bi bi-info-circle"></i></label><input type="text" id="${startYearId}" class="form-control category-start-year" value="${category.startYear || new Date().getFullYear()}"></div>
            <div class="col-6 col-md-4 col-lg-3 col-xxl-1"><label for="${endYearId}" class="form-label" data-bs-toggle="tooltip" data-i18n-title-key="liabilityEndYearTooltip">${getTranslation('endLabel')} <i class="bi bi-info-circle"></i></label><input type="text" id="${endYearId}" class="form-control category-end-year" value="${category.endYear || ''}"></div>
            <div class="col-6 col-md-4 col-lg-3 col-xxl-1 d-flex align-items-end"><i class="bi bi-grip-vertical drag-handle me-2" style="cursor: move; font-size: 1.2rem;"></i><button class="btn btn-danger btn-sm delete-category-btn" aria-label="${getTranslation('deleteLiabilityCategoryLabel')}"><i class="bi bi-trash"></i></button></div>
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
            <div class="col-6 col-md-4 col-lg-3 col-xxl-2"><label for="${nameId}" class="form-label" data-bs-toggle="tooltip" data-i18n-title-key="incomeNameTooltip">${getTranslation('nameLabel')} <i class="bi bi-info-circle"></i></label><input type="text" id="${nameId}" class="form-control category-name" value="${category.name || ''}"></div>
            <div class="col-6 col-md-4 col-lg-3 col-xxl-2"><label for="${valueId}" class="form-label" data-bs-toggle="tooltip" data-i18n-title-key="incomeValueTooltip">${getTranslation('valueLabel')} <i class="bi bi-info-circle"></i></label><input type="text" id="${valueId}" class="form-control category-value" value="${category.value || ''}"></div>
            <div class="col-6 col-md-4 col-lg-3 col-xxl-2"><label for="${frequencyId}" class="form-label" data-bs-toggle="tooltip" data-i18n-title-key="incomeFrequencyTooltip">${getTranslation('frequencyLabel')} <i class="bi bi-info-circle"></i></label><select id="${frequencyId}" class="form-select category-frequency"><option value="monthly" ${category.frequency === 'monthly' ? 'selected' : ''}>${getTranslation('monthlyOption')}</option><option value="yearly" ${category.frequency === 'yearly' ? 'selected' : ''}>${getTranslation('yearlyOption')}</option></select></div>
            <div class="col-6 col-md-4 col-lg-3 col-xxl-2"><label for="${indexedId}" class="form-label" data-bs-toggle="tooltip" data-i18n-title-key="incomeIndexedTooltip">${getTranslation('indexedLabel')} <i class="bi bi-info-circle"></i></label><input id="${indexedId}" class="form-check-input d-block category-indexed" type="checkbox" ${category.indexed ? 'checked' : ''}></div>
            <div class="col-6 col-md-4 col-lg-3 col-xxl-1"><label for="${startYearId}" class="form-label" data-bs-toggle="tooltip" data-i18n-title-key="incomeStartYearTooltip">${getTranslation('startLabel')} <i class="bi bi-info-circle"></i></label><input type="text" id="${startYearId}" class="form-control category-start-year" value="${category.startYear || new Date().getFullYear()}"></div>
            <div class="col-6 col-md-4 col-lg-3 col-xxl-1"><label for="${endYearId}" class="form-label" data-bs-toggle="tooltip" data-i18n-title-key="incomeEndYearTooltip">${getTranslation('endLabel')} <i class="bi bi-info-circle"></i></label><input type="text" id="${endYearId}" class="form-control category-end-year" value="${category.endYear || ''}"></div>
            <div class="col-6 col-md-4 col-lg-3 col-xxl-1 d-flex align-items-end"><i class="bi bi-grip-vertical drag-handle me-2" style="cursor: move; font-size: 1.2rem;"></i><button class="btn btn-danger btn-sm delete-category-btn" aria-label="${getTranslation('deleteIncomeCategoryLabel')}"><i class="bi bi-trash"></i></button></div>
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
            <div class="col-6 col-md-4 col-lg-3 col-xxl-2"><label for="${nameId}" class="form-label" data-bs-toggle="tooltip" data-i18n-title-key="expenseNameTooltip">${getTranslation('nameLabel')} <i class="bi bi-info-circle"></i></label><input type="text" id="${nameId}" class="form-control category-name" value="${category.name || ''}"></div>
            <div class="col-6 col-md-4 col-lg-3 col-xxl-2"><label for="${valueId}" class="form-label" data-bs-toggle="tooltip" data-i18n-title-key="expenseValueTooltip">${getTranslation('valueLabel')} <i class="bi bi-info-circle"></i></label><input type="text" id="${valueId}" class="form-control category-value" value="${category.value || ''}"></div>
            <div class="col-6 col-md-4 col-lg-3 col-xxl-2"><label for="${frequencyId}" class="form-label" data-bs-toggle="tooltip" data-i18n-title-key="expenseFrequencyTooltip">${getTranslation('frequencyLabel')} <i class="bi bi-info-circle"></i></label><select id="${frequencyId}" class="form-select category-frequency"><option value="monthly" ${category.frequency === 'monthly' ? 'selected' : ''}>${getTranslation('monthlyOption')}</option><option value="yearly" ${category.frequency === 'yearly' ? 'selected' : ''}>${getTranslation('yearlyOption')}</option></select></div>
            <div class="col-6 col-md-4 col-lg-3 col-xxl-2"><label for="${indexedId}" class="form-label" data-bs-toggle="tooltip" data-i18n-title-key="expenseIndexedTooltip">${getTranslation('indexedLabel')} <i class="bi bi-info-circle"></i></label><input id="${indexedId}" class="form-check-input d-block category-indexed" type="checkbox" ${category.indexed ? 'checked' : ''}></div>
            <div class="col-6 col-md-4 col-lg-3 col-xxl-1"><label for="${startYearId}" class="form-label" data-bs-toggle="tooltip" data-i18n-title-key="expenseStartYearTooltip">${getTranslation('startLabel')} <i class="bi bi-info-circle"></i></label><input type="text" id="${startYearId}" class="form-control category-start-year" value="${category.startYear || new Date().getFullYear()}"></div>
            <div class="col-6 col-md-4 col-lg-3 col-xxl-1"><label for="${endYearId}" class="form-label" data-bs-toggle="tooltip" data-i18n-title-key="expenseEndYearTooltip">${getTranslation('endLabel')} <i class="bi bi-info-circle"></i></label><input type="text" id="${endYearId}" class="form-control category-end-year" value="${category.endYear || ''}"></div>
            <div class="col-6 col-md-4 col-lg-3 col-xxl-1 d-flex align-items-end"><i class="bi bi-grip-vertical drag-handle me-2" style="cursor: move; font-size: 1.2rem;"></i><button class="btn btn-danger btn-sm delete-category-btn" aria-label="${getTranslation('deleteExpenseCategoryLabel')}"><i class="bi bi-trash"></i></button></div>
        `;
    }

    function addAllocationPeriod(period = {}) {
        const periodId = getUniqueId('period');
        const startYearId = getUniqueId('allocation-start-year');
        const rebalanceId = getUniqueId('rebalance-period');
        const row = document.createElement('div');
        row.classList.add('row', 'mb-3', 'allocation-period');
        row.innerHTML = `
            <div class="col-xxl-2">
                <label for="${startYearId}" class="form-label">${getTranslation('startYearLabel')}</label>
                <input type="text" id="${startYearId}" class="form-control allocation-start-year" value="${period.startYear || new Date().getFullYear()}">
            </div>
            <div class="col-xxl-6" id="allocation-assets-${periodId}"></div>
            <div class="col-xxl-4 d-flex align-items-center">
                <div class="form-check form-switch me-3">
                    <input class="form-check-input auto-rebalance-period-checkbox" type="checkbox" id="${rebalanceId}" ${period.rebalance ? 'checked' : ''}>
                    <label class="form-check-label" for="${rebalanceId}" data-bs-toggle="tooltip" data-i18n-title-key="autoRebalanceTooltip">${getTranslation('autoRebalanceLabel')} <i class="bi bi-info-circle"></i></label>
                </div>
                <button class="btn btn-danger btn-sm delete-period-btn" aria-label="${getTranslation('deleteAllocationPeriodLabel')}"><i class="bi bi-trash"></i></button>
            </div>
            <div class="col-xxl-12"><div class="progress mt-2"><div class="progress-bar" role="progressbar" style="width: 0%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">0%</div></div></div>
        `;
        allocationPeriodsContainer.appendChild(row);
        updateAllocationAssets(row, period.allocation || {});

        row.querySelector('.delete-period-btn').addEventListener('click', () => {
            row.remove();
            autoRunSimulationIfEnabled();
        });
        applyNumberFormatting(row);

        const tooltipTriggerList = row.querySelectorAll('[data-bs-toggle="tooltip"]');
        [...tooltipTriggerList].map(tooltipTriggerEl => {
            const key = tooltipTriggerEl.getAttribute('data-i18n-title-key');
            if (key) {
                tooltipTriggerEl.setAttribute('title', getTranslation(key));
            }
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
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

    function updateSectionTitles() {
        const inputs = getUserInputs();
        const currentYear = new Date().getFullYear();

        const assetTotal = inputs.assets.filter(asset => {
            const startYear = asset.startYear || currentYear;
            const endYear = asset.endYear || Infinity;
            return currentYear >= startYear && currentYear <= endYear;
        }).reduce((sum, asset) => sum + asset.value, 0);
        document.querySelector('#section-assets h3').innerHTML = `${getTranslation('assetsAccordionButton')} - ${getTranslation('total')} ${currentYear}: ${assetTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

        const liabilityTotal = inputs.liabilities.filter(liability => {
            const startYear = liability.startYear || currentYear;
            const endYear = liability.endYear || Infinity;
            return currentYear >= startYear && currentYear <= endYear;
        }).reduce((sum, liability) => sum + liability.value, 0);
        document.querySelector('#section-liabilities h3').innerHTML = `${getTranslation('liabilitiesAccordionButton')} - ${getTranslation('total')} ${currentYear}: ${liabilityTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

        const incomeTotal = inputs.incomes.filter(income => {
            const startYear = income.startYear || currentYear;
            const endYear = income.endYear || Infinity;
            return currentYear >= startYear && currentYear <= endYear;
        }).reduce((sum, income) => {
            const yearlyValue = income.frequency === 'monthly' ? income.value * 12 : income.value;
            return sum + yearlyValue;
        }, 0);
        document.querySelector('#section-income h3').innerHTML = `${getTranslation('incomeAccordionButton')} - ${getTranslation('total')} ${currentYear}: ${incomeTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

        const expenseTotal = inputs.expenses.filter(expense => {
            const startYear = expense.startYear || currentYear;
            const endYear = expense.endYear || Infinity;
            return currentYear >= startYear && currentYear <= endYear;
        }).reduce((sum, expense) => {
            const yearlyValue = expense.frequency === 'monthly' ? expense.value * 12 : expense.value;
            return sum + yearlyValue;
        }, 0);
        document.querySelector('#section-expenses h3').innerHTML = `${getTranslation('expensesAccordionButton')} - ${getTranslation('total')} ${currentYear}: ${expenseTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

        const savingsTotal = incomeTotal - expenseTotal;
        document.querySelector('#section-allocation h3').innerHTML = `${getTranslation('savingsAllocationAccordionButton')} - Total ${currentYear}: ${savingsTotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
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
                interestRate: parseFormattedNumber(row.querySelector('.category-interest-rate').value) / 100 || 0,
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
            const rebalance = row.querySelector('.auto-rebalance-period-checkbox').checked;
            allocationPeriods.push({
                startYear: parseInt(parseFormattedNumber(row.querySelector('.allocation-start-year').value)) || 0,
                allocation: allocation,
                rebalance: rebalance,
            });
        });

        return {
            currentAge: parseInt(parseFormattedNumber(document.getElementById('current-age').value)) || 0,
            inflation: parseFormattedNumber(document.getElementById('inflation').value) / 100 || 0,
            pensionAge: parseInt(parseFormattedNumber(document.getElementById('pension-age').value)) || 0,
            earlyRetirementAge: parseInt(parseFormattedNumber(document.getElementById('early-retirement-age').value)) || 0,
            estimatedPension: parseFormattedNumber(document.getElementById('estimated-pension').value) || 0,
            withdrawalRate: parseFormattedNumber(document.getElementById('withdrawal-rate').value) / 100 || 0,
            incomes: incomes,
            expenses: expenses,
            assets: assets,
            liabilities: liabilities,
            allocationPeriods: allocationPeriods,
        };
    }

    function runAndRender(isManualRun = false) {
        if (isManualRun) {
            assetColors = {};
        }
        hasSimulationRanOnce = true;

        const errors = validateAllInputs();
        if (errors.length > 0) {
            displayAlerts(errors);
            return;
        }
        document.getElementById('alerts-container').innerHTML = '';

        // Hide Monte Carlo results, show standard table
        document.getElementById('monte-carlo-success-message').style.display = 'none';
        document.querySelector('#results .table-responsive').style.display = 'block';

        const inputs = getUserInputs();
        saveDataToLocalStorage();
        const { results, earlyRetirementYear, amountPensionMessage } = window.runSimulation(inputs);
        renderTable(results);
        renderCharts(results, isManualRun);

        const earlyRetirementMessage = document.getElementById('early-retirement-message');
        const pensionWithdrawalMessage = document.getElementById('pension-withdrawal-message');

        if (earlyRetirementYear) {
            const earlyRetirementData = results.find(r => r.year === earlyRetirementYear);
            const earlyRetirementAge = earlyRetirementData.age;
            const netWorth = earlyRetirementData.net_worth.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0});
            let message = getTranslation('earlyRetirementMessage', { year: earlyRetirementYear, age: earlyRetirementAge, netWorth: netWorth });
            earlyRetirementMessage.innerHTML = message;
            earlyRetirementMessage.style.display = 'block';
        } else {
            earlyRetirementMessage.style.display = 'none';
        }

        if (amountPensionMessage > 0) {
            const monthlyWithdrawal = amountPensionMessage / 12;
            const pensionAge = parseInt(parseFormattedNumber(document.getElementById('pension-age').value)) || 0;
            const pensionYearData = results.find(r => r.age === pensionAge);
            const netWorth = pensionYearData.net_worth.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0});
            const withdrawalRate = (parseFormattedNumber(document.getElementById('withdrawal-rate').value) || 0);

            let message = getTranslation('pensionWithdrawalMessage', { 
                amount: amountPensionMessage.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0}), 
                monthly: monthlyWithdrawal.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0}),
                netWorth: netWorth,
                rate: withdrawalRate
            });
            pensionWithdrawalMessage.innerHTML = message;
            pensionWithdrawalMessage.style.display = 'block';
        } else {
            pensionWithdrawalMessage.style.display = 'none';
        }

        document.getElementById('results').style.display = 'block';
    }

    let wealthChart = null;

    function renderCharts(results, isManualRun = true) {
        if (wealthChart) wealthChart.destroy();

        if(results.length === 0) return;

        const labels = results.map(r => r.year);
        const assetKeys = Object.keys(results[0].assets);

        const assetDatasets = assetKeys.map(key => {
            return {
                label: key,
                data: results.map(r => r.assets[key]),
                backgroundColor: getAssetColor(key),
            };
        });

        const netWorthData = results.map(r => r.net_worth);

        const isDarkMode = () => document.documentElement.getAttribute('data-bs-theme') === 'dark';
        const textColor = isDarkMode() ? 'rgba(255, 255, 255, 0.8)' : Chart.defaults.color;
        const gridColor = isDarkMode() ? 'rgba(255, 255, 255, 0.1)' : Chart.defaults.borderColor;

        const animationDuration = isManualRun ? 1000 : 0;

        const wealthCtx = document.getElementById('wealth-evolution-chart').getContext('2d');
        wealthChart = new Chart(wealthCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: assetDatasets.concat({
                    label: getTranslation('netWorthLabel'),
                    data: netWorthData,
                    type: 'line',
                    borderColor: '#20c997',
                    tension: 0.1
                })
            },
            options: {
                animation: {
                    duration: animationDuration
                },
                scales: {
                    x: {
                        stacked: true,
                        ticks: {
                            color: textColor,
                        },
                        grid: {
                            color: gridColor
                        }
                    },
                    y: {
                        stacked: true,
                        ticks: {
                            color: textColor,
                            callback: function(value) {
                                return value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
                            }
                        },
                        grid: {
                            color: gridColor
                        }
                    }
                },
                                plugins: {
                                    legend: {
                                        labels: { color: textColor }
                                    },
                                    tooltip: {
                                        callbacks: {
                                                                        title: function(context) {
                                                                            const year = context[0].label;
                                                                            const age = parseInt(year) - new Date().getFullYear() + parseInt(document.getElementById('current-age').value);
                                                                            return `${year} (${getTranslation('ageLabel')}: ${age})`;
                                                                        },                                            label: function(context) {
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

    function saveDataToLocalStorage() {
        const autoSaveEnabled = document.getElementById('auto-save-toggle').checked;
        if (autoSaveEnabled) {
            const data = getUserInputs();
            localStorage.setItem('financialData', JSON.stringify(data));
        }
    }

    function loadDataFromLocalStorage() {
        const autoSaveEnabled = localStorage.getItem('autoSaveEnabled');
        if (autoSaveEnabled === 'false') {
            document.getElementById('auto-save-toggle').checked = false;
            return;
        }

        const savedData = localStorage.getItem('financialData');
        if (savedData) {
            setUserValues(JSON.parse(savedData));
            return true;
        }
        return false;
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

    function importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            const data = JSON.parse(e.target.result);
            setUserValues(data);
            runAndRender(false);
            updateSectionTitles();
            event.target.value = '';
        };
        reader.readAsText(file);
    }

    function setUserValues(data) {
        document.getElementById('current-age').value = String(data.currentAge);
        document.getElementById('inflation').value = String(data.inflation * 100);
        document.getElementById('pension-age').value = String(data.pensionAge);
        document.getElementById('early-retirement-age').value = String(data.earlyRetirementAge || '');
        document.getElementById('estimated-pension').value = String(data.estimatedPension);
        document.getElementById('withdrawal-rate').value = String(data.withdrawalRate * 100);

        incomeCategoriesContainer.innerHTML = '';
        data.incomes.forEach(income => {
            const modifiedIncome = { ...income, value: String(income.value) };
            addCategory(incomeCategoriesContainer, 'income', modifiedIncome);
        });

        expenseCategoriesContainer.innerHTML = '';
        data.expenses.forEach(expense => {
            const modifiedExpense = { ...expense, value: String(expense.value) };
            addCategory(expenseCategoriesContainer, 'expense', modifiedExpense);
        });

        assetCategoriesContainer.innerHTML = '';
        data.assets.forEach(asset => {
            const modifiedAsset = { ...asset, value: String(asset.value) };
            if (typeof modifiedAsset.return === 'number') {
                modifiedAsset.return = String(modifiedAsset.return * 100);
            }
            if (typeof modifiedAsset.tax === 'number') {
                modifiedAsset.tax = String(modifiedAsset.tax * 100);
            }
            addCategory(assetCategoriesContainer, 'asset', modifiedAsset);
        });

        liabilityCategoriesContainer.innerHTML = '';
        data.liabilities.forEach(liability => {
            const modifiedLiability = { ...liability, value: String(liability.value) };
            if (typeof modifiedLiability.interestRate === 'number') {
                modifiedLiability.interestRate = String(modifiedLiability.interestRate * 100);
            }
            addCategory(liabilityCategoriesContainer, 'liability', modifiedLiability);
        });

        allocationPeriodsContainer.innerHTML = '';
        data.allocationPeriods.forEach(period => {
            const modifiedPeriod = { ...period };
            if (modifiedPeriod.allocation) {
                Object.keys(modifiedPeriod.allocation).forEach(assetName => {
                    // Handle backward compatibility for old object format
                    const assetAllocation = modifiedPeriod.allocation[assetName];
                    if (typeof assetAllocation === 'object' && assetAllocation !== null) {
                        modifiedPeriod.allocation[assetName] = String(assetAllocation.percentage * 100);
                    } else {
                        modifiedPeriod.allocation[assetName] = String(assetAllocation * 100);
                    }
                });
            }
            addAllocationPeriod(modifiedPeriod);
        });

        applyNumberFormatting(document.body);
        initializeSortable();
        initializeTooltips();
    }

    function renderTable(results) {
        const tableHead = document.getElementById('results-table-head');
        const tableBody = document.getElementById('results-table-body');
        tableHead.innerHTML = '';
        tableBody.innerHTML = '';

        if(results.length === 0) return;

        const assetKeys = Object.keys(results[0].assets);
        const liabilityKeys = Object.keys(results[0].liabilities);

        const headerRow = document.createElement('tr');
        let headerHtml = `
            <th>${getTranslation('yearHeader')}</th>
            <th>${getTranslation('ageHeader')}</th>
            <th>${getTranslation('netIncomeHeader')}</th>
            <th>${getTranslation('expensesHeader')}</th>
            <th>${getTranslation('savingsCapacityHeader')}</th>
            <th>${getTranslation('savingsRateHeader')}</th>
            <th>${getTranslation('netWorthHeader')}</th>
        `;
        assetKeys.forEach(key => headerHtml += `<th>${getTranslation('assetHeader', { asset: key })}</th>`);
        liabilityKeys.forEach(key => headerHtml += `<th>${getTranslation('liabilityHeader', { liability: key })}</th>`);
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

    function clearAllInputs() {
        document.getElementById('current-age').value = '';
        document.getElementById('inflation').value = '';
        document.getElementById('pension-age').value = '';
        document.getElementById('early-retirement-age').value = '';
        document.getElementById('estimated-pension').value = '';
        document.getElementById('withdrawal-rate').value = '';

        incomeCategoriesContainer.innerHTML = '';
        expenseCategoriesContainer.innerHTML = '';
        assetCategoriesContainer.innerHTML = '';
        liabilityCategoriesContainer.innerHTML = '';
        allocationPeriodsContainer.innerHTML = '';
    }

    function initDefaultData(stage = 'early-career') {
        const data = getSampleData(stage);

        clearAllInputs();

        data.assets.forEach(asset => addCategory(assetCategoriesContainer, 'asset', asset));
        data.liabilities.forEach(liability => addCategory(liabilityCategoriesContainer, 'liability', liability));
        data.incomes.forEach(income => addCategory(incomeCategoriesContainer, 'income', income));
        data.expenses.forEach(expense => addCategory(expenseCategoriesContainer, 'expense', expense));
        data.allocationPeriods.forEach(period => addAllocationPeriod(period));

        document.getElementById('current-age').value = data.currentAge;
        document.getElementById('pension-age').value = data.pensionAge;
        document.getElementById('estimated-pension').value = data.estimatedPension;
        document.getElementById('inflation').value = data.inflation;
        document.getElementById('withdrawal-rate').value = data.withdrawalRate;
        
        applyNumberFormatting(document.body);
    }

    function clearSimulationResults() {
        document.getElementById('results').style.display = 'none';
        document.getElementById('early-retirement-message').style.display = 'none';
        document.getElementById('pension-withdrawal-message').style.display = 'none';
        if (wealthChart) {
            wealthChart.destroy();
            wealthChart = null;
        }
        document.getElementById('results-table-head').innerHTML = '';
        document.getElementById('results-table-body').innerHTML = '';
    }

    function initializeTooltips() {
        const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
    }

    function initializeSortable() {
        const options = {
            animation: 150,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            handle: '.drag-handle'
        };

        new Sortable(assetCategoriesContainer, options);
        new Sortable(liabilityCategoriesContainer, options);
        new Sortable(incomeCategoriesContainer, options);
        new Sortable(expenseCategoriesContainer, options);
    }

    function runAndRenderMonteCarlo() {
        const errors = validateAllInputs();
        if (errors.length > 0) {
            displayAlerts(errors);
            return;
        }
        document.getElementById('alerts-container').innerHTML = '';

        // Show a loading indicator
        const monteCarloBtn = document.getElementById('run-monte-carlo-btn');
        const originalBtnText = monteCarloBtn.textContent;
        monteCarloBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Loading...`;
        monteCarloBtn.disabled = true;

        // Hide standard results messages and table
        document.getElementById('early-retirement-message').style.display = 'none';
        document.getElementById('pension-withdrawal-message').style.display = 'none';
        document.querySelector('#results .table-responsive').style.display = 'none';


        // Use a timeout to allow the UI to update before the heavy computation starts
        setTimeout(() => {
            const inputs = getUserInputs();
            const { successRate, percentileData, labels } = window.runMonteCarloSimulation(inputs);

            // Display success rate
            const successMessageEl = document.getElementById('monte-carlo-success-message');
            successMessageEl.textContent = getTranslation('monteCarloSuccessRateMessage', { successRate: (successRate * 100).toFixed(2) });
            successMessageEl.style.display = 'block';
            
            renderMonteCarloChart(percentileData, labels);
            document.getElementById('results').style.display = 'block';

            // Restore button
            monteCarloBtn.textContent = originalBtnText;
            monteCarloBtn.disabled = false;

            document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }

    function renderMonteCarloChart(percentileData, labels) {
        if (wealthChart) wealthChart.destroy();

        const isDarkMode = () => document.documentElement.getAttribute('data-bs-theme') === 'dark';
        const textColor = isDarkMode() ? 'rgba(255, 255, 255, 0.8)' : Chart.defaults.color;
        const gridColor = isDarkMode() ? 'rgba(255, 255, 255, 0.1)' : Chart.defaults.borderColor;

        const wealthCtx = document.getElementById('wealth-evolution-chart').getContext('2d');

        const percentileOrder = ["Top 5%", "Top 10%", "Top 15%", "Top 25%", "Median", "Bottom 25%", "Bottom 15%", "Bottom 10%", "Bottom 5%"];
        
        const percentileColors = {
            "Top 5%": '#2ECC71',
            "Top 10%": '#58D68D',
            "Top 15%": '#82E0AA',
            "Top 25%": '#ABEBC6',
            "Median": '#20c997',
            "Bottom 25%": '#F5B7B1',
            "Bottom 15%": '#F1948A',
            "Bottom 10%": '#EC7063',
            "Bottom 5%": '#E74C3C',
        };

        function createGradient(ctx, color) {
            const gradient = ctx.createLinearGradient(0, 0, 0, 400);
            const rgb = hexToRgb(color);
            if (!rgb) return 'rgba(0,0,0,0)';
            gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`);
            gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`);
            return gradient;
        }

        function hexToRgb(hex) {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        }

        const datasets = percentileOrder.map((percentile, index) => {
            const color = percentileColors[percentile] || getRandomColor();
            const fill = index < (percentileOrder.length -1) ? (index + 1).toString() : 'origin';
            return {
                label: percentile,
                data: percentileData[percentile],
                type: 'line',
                borderColor: color,
                backgroundColor: createGradient(wealthCtx, color),
                tension: 0.1,
                fill: fill,
                borderWidth: percentile === 'Median' ? 3 : 1.5,
                pointRadius: 0,
                pointHitRadius: 10,
            };
        });

        wealthChart = new Chart(wealthCtx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                animation: {
                    duration: 1000
                },
                scales: {
                    x: {
                        ticks: { color: textColor },
                        grid: { color: gridColor }
                    },
                    y: {
                        ticks: {
                            color: textColor,
                            callback: function(value) {
                                return value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
                            }
                        },
                        grid: { color: gridColor }
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: textColor }
                    },
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                const year = context[0].label;
                                const age = parseInt(year) - new Date().getFullYear() + parseInt(document.getElementById('current-age').value);
                                return `${year} (${getTranslation('ageLabel')}: ${age})`;
                            },
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

    initializeTooltips();
    initializeSortable();
    applyNumberFormatting(document.body);

    document.getElementById('add-asset-category-btn').addEventListener('click', () => addCategory(assetCategoriesContainer, 'asset'));
    document.getElementById('add-liability-category-btn').addEventListener('click', () => addCategory(liabilityCategoriesContainer, 'liability'));
    document.getElementById('add-income-category-btn').addEventListener('click', () => addCategory(incomeCategoriesContainer, 'income'));
    document.getElementById('add-expense-category-btn').addEventListener('click', () => addCategory(expenseCategoriesContainer, 'expense'));
    document.getElementById('add-allocation-period-btn').addEventListener('click', () => addAllocationPeriod());
    document.getElementById('run-standard-simulation-btn').addEventListener('click', () => runAndRender(true));
    document.getElementById('run-monte-carlo-btn').addEventListener('click', () => runAndRenderMonteCarlo());
    document.getElementById('export-btn').addEventListener('click', exportData);
    document.getElementById('import-btn').addEventListener('click', () => document.getElementById('import-file-input').click());
    document.getElementById('import-file-input').addEventListener('change', importData);
    document.getElementById('clear-btn').addEventListener('click', () => {
        if (confirm(getTranslation('clearDataConfirmation'))) {
            clearSimulationResults();
            clearAllInputs();
            updateSectionTitles();
        }
    });

    const financialNav = document.getElementById('financial-nav');
    const contentSections = document.querySelectorAll('.content-section');

    financialNav.addEventListener('click', (e) => {
        if (e.target.tagName === 'A') {
            e.preventDefault();
            const targetId = e.target.getAttribute('href');

            // Update nav link active state
            financialNav.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
            e.target.classList.add('active');

            // Show/hide content sections
            contentSections.forEach(section => {
                if (`#${section.id}` === targetId) {
                    section.style.display = 'block';
                } else {
                    section.style.display = 'none';
                }
            });
        }
    });


    const monteCarloEnabled = localStorage.getItem('monteCarloEnabled');
    if (monteCarloEnabled) {
        document.getElementById('enable-monte-carlo').checked = monteCarloEnabled === 'true';
        if (document.getElementById('enable-monte-carlo').checked) {
            document.getElementById('run-monte-carlo-btn').classList.remove('d-none');
            document.getElementById('run-standard-simulation-btn').classList.remove('d-none');
        } else {
            document.getElementById('run-monte-carlo-btn').classList.add('d-none');
            document.getElementById('run-standard-simulation-btn').classList.add('d-none');
        }
    }

    document.getElementById('enable-monte-carlo').addEventListener('change', (event) => {
        const monteCarloBtn = document.getElementById('run-monte-carlo-btn');
        const standardSimBtn = document.getElementById('run-standard-simulation-btn');
        if (event.target.checked) {
            monteCarloBtn.classList.remove('d-none');
            standardSimBtn.classList.remove('d-none');
            localStorage.setItem('monteCarloEnabled', 'true');
        } else {
            monteCarloBtn.classList.add('d-none');
            standardSimBtn.classList.add('d-none');
            localStorage.setItem('monteCarloEnabled', 'false');
        }
    });

    document.getElementById('auto-save-toggle').addEventListener('change', (event) => {
        localStorage.setItem('autoSaveEnabled', event.target.checked);
        if (!event.target.checked) {
            localStorage.removeItem('financialData');
        }
    });

    window.addEventListener('languageChanged', () => {
        clearSimulationResults();
        // We don't want to load default data on language change, just translate the existing one
        const currentData = getUserInputs();
        setUserValues(currentData);
        initializeTooltips();
        updateSectionTitles();
    });

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
        runAndRender(false);
    });

    document.getElementById('financial-data-content').addEventListener('change', autoRunSimulationIfEnabled);

    function manageSlider(input) {
        if (input.parentElement.querySelector('.temp-slider')) {
            return;
        }

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.classList.add('form-range', 'mt-1', 'temp-slider');

        let min = 0, max = 100, step = 1;

        switch (input.id) {
            case 'inflation':
                max = 20; step = 0.1;
                break;
            case 'withdrawal-rate':
                max = 15; step = 0.1;
                break;
            case 'early-retirement-age':
                min = parseInt(document.getElementById('current-age').value) || 18;
                max = parseInt(document.getElementById('pension-age').value) || 80;
                break;
            default:
                return;
        }

        slider.min = min;
        slider.max = max;
        slider.step = step;
        
        const initialValue = parseFormattedNumber(input.value);
        slider.value = isNaN(initialValue) ? min : initialValue;

        slider.addEventListener('input', () => {
            input.value = slider.value;
            input.dispatchEvent(new Event('change', { bubbles: true }));
        });

        input.addEventListener('input', () => {
            const val = parseFormattedNumber(input.value);
            if (!isNaN(val)) {
                slider.value = val;
            }
        });

        const removeSlider = () => {
            setTimeout(() => {
                if (document.activeElement !== slider && document.activeElement !== input) {
                    slider.remove();
                    input.removeEventListener('blur', removeSlider);
                    slider.removeEventListener('blur', removeSlider);
                }
            }, 200);
        };

        input.addEventListener('blur', removeSlider);
        slider.addEventListener('blur', removeSlider);

        input.parentElement.appendChild(slider);
        slider.focus();
    }

    document.getElementById('inflation').addEventListener('focus', (e) => manageSlider(e.target));
    document.getElementById('withdrawal-rate').addEventListener('focus', (e) => manageSlider(e.target));
    document.getElementById('early-retirement-age').addEventListener('focus', (e) => manageSlider(e.target));

    // First-time user onboarding & data loading logic
    if (!localStorage.getItem('hasVisited')) {
        const helpModal = new bootstrap.Modal(document.getElementById('help-modal'));
        helpModal.show();
        localStorage.setItem('hasVisited', 'true');
    } else {
        if (loadDataFromLocalStorage()) {
            runAndRender(false);
            updateSectionTitles();
        }
    }

    const loadSampleDataBtn = document.getElementById('load-sample-data-btn');
    const sampleDataModal = new bootstrap.Modal(document.getElementById('sample-data-modal'));
    loadSampleDataBtn.addEventListener('click', () => {
        sampleDataModal.show();
    });

    document.querySelectorAll('#sample-data-modal .list-group-item').forEach(button => {
        button.addEventListener('click', (e) => {
            const stage = e.target.dataset.stage;
            initDefaultData(stage);
            runAndRender(false);
            updateSectionTitles();
            sampleDataModal.hide();
        });
    });

    updateSectionTitles();
});