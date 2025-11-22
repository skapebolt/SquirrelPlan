window.SquirrelPlanApp = {};

(function(app) {
    const APP_DATA_KEY = 'squirrelPlanData';

    function getBlankPlanData() {
        return {
            currentAge: '30',
            inflation: '0.025',
            pensionAge: '65',
            earlyRetirementAge: '',
            estimatedPension: '1500',
            withdrawalRate: '',
            incomes: [],
            expenses: [],
            assets: [],
            liabilities: [],
            allocationPeriods: [],
        };
    }

    function getInitialAppData() {
        let isNewUser = false;
        const appDataString = localStorage.getItem(APP_DATA_KEY);
        if (appDataString) {
            return { appData: JSON.parse(appDataString), isNewUser: false };
        }

        isNewUser = !localStorage.getItem('financialData') && !localStorage.getItem('hasVisited');

        const oldFinancialDataString = localStorage.getItem('financialData');
        const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const oldTheme = localStorage.getItem('theme') || (systemPrefersDark ? 'dark' : 'light');
        let oldLanguage = localStorage.getItem('preferredLanguage');
        const oldMonteCarloEnabled = localStorage.getItem('monteCarloEnabled') === 'true';

        if (!oldLanguage) {
            const userLang = (navigator.language || navigator.userLanguage).split('-')[0];
            const supportedLangs = ['en', 'fr', 'es', 'de', 'it', 'pt', 'nl'];
            if (supportedLangs.includes(userLang)) {
                oldLanguage = userLang;
            } else {
                oldLanguage = 'en';
            }
        }

        let plans = [];
        let activePlanName = null;

        if (oldFinancialDataString) {
            activePlanName = 'My First Plan';
            plans.push({
                name: activePlanName,
                data: JSON.parse(oldFinancialDataString),
                config: {
                    monteCarloEnabled: oldMonteCarloEnabled
                }
            });
        }
        
        const newAppData = {
            settings: {
                theme: oldTheme,
                language: oldLanguage,
                activePlanName: activePlanName
            },
            plans: plans
        };

        saveAppData(newAppData);

        localStorage.removeItem('financialData');
        localStorage.removeItem('theme');
        localStorage.removeItem('preferredLanguage');
        localStorage.removeItem('monteCarloEnabled');
        localStorage.removeItem('hasVisited');
        localStorage.removeItem('autoSaveEnabled');

        return { appData: newAppData, isNewUser: isNewUser };
    }

    function getAppData() {
        return JSON.parse(localStorage.getItem(APP_DATA_KEY));
    }

    function saveAppData(data) {
        localStorage.setItem(APP_DATA_KEY, JSON.stringify(data));
    }

    function getActivePlan() {
        const appData = getAppData();
        if (!appData || !appData.plans) return null;
        return appData.plans.find(p => p.name === appData.settings.activePlanName);
    }
    
    let currentPlanIsPreset = false;

    function saveActivePlanData(planData) {
        if (currentPlanIsPreset) {
            const newName = prompt(getTranslation('savePresetAsNewPlanPrompt') || "You've edited a preset. Would you like to save your changes as a new plan? Please enter a name for the new plan.");
            if (newName) {
                const appData = getAppData();
                if (appData.plans.find(p => p.name === newName)) {
                                                alert(getTranslation('planNameExistsError') || 'A plan with this name already exists.');
                                                return;
                                            }                const newPlan = {
                    name: newName,
                    data: planData,
                    config: { monteCarloEnabled: false }
                };
                appData.plans.push(newPlan);
                appData.settings.activePlanName = newName;
                saveAppData(appData);
                currentPlanIsPreset = false;
            }
            return; 
        }

        const appData = getAppData();
        if (!appData || !appData.plans) return;
        const activePlanIndex = appData.plans.findIndex(p => p.name === appData.settings.activePlanName);
        if (activePlanIndex > -1) {
            appData.plans[activePlanIndex].data = planData;
            saveAppData(appData);
        }
    }
    
    function getActivePlanConfig() {
        const plan = getActivePlan();
        return plan ? plan.config : { monteCarloEnabled: false };
    }

    function saveActivePlanConfig(config) {
        const appData = getAppData();
        const activePlanIndex = appData.plans.findIndex(p => p.name === appData.settings.activePlanName);
        if (activePlanIndex > -1) {
            appData.plans[activePlanIndex].config = config;
            saveAppData(appData);
        }
    }

    function getSettings() {
        const appData = getAppData();
        return appData.settings;
    }

    function saveSettings(settings) {
        const appData = getAppData();
        appData.settings = settings;
        saveAppData(appData);
    }
    
    app.getSettings = getSettings;
    app.saveSettings = saveSettings;

    document.addEventListener('DOMContentLoaded', function () {
        const { appData, isNewUser } = getInitialAppData();

        let uniqueIdCounter = 0;
        function getUniqueId(prefix = 'id') {
            uniqueIdCounter++;
            return `${prefix}-${uniqueIdCounter}`;
        }

        const earlyRetirementMessage = document.getElementById('early-retirement-message');
        const pensionWithdrawalMessage = document.getElementById('pension-withdrawal-message');

        let hasSimulationRanOnce = false;
        let assetColors = {};
        let colorIndex = 0;
        const presetAssetColors = [
          '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', 
          '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'
        ];

        function autoRunSimulationIfEnabled() {
            if (hasSimulationRanOnce) {
                runAndRender(false);
            }
            updateSectionTitles();
        }

        function getAssetColor(assetName) {
            if (!assetColors[assetName]) {
                if (colorIndex < presetAssetColors.length) {
                    assetColors[assetName] = presetAssetColors[colorIndex];
                    colorIndex++;
                } else {
                    assetColors[assetName] = getRandomColor(); // Fallback
                }
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

            if (!isNaN(currentAge) && !isNaN(pensionAge) && pensionAge < currentAge && pensionAge < 18) {
                errors.push(getTranslation('retirementAgeBeforeCurrentAgeError'));
                [currentAgeInput, pensionAgeInput].forEach(input => {
                    input.classList.add('is-invalid');
                    input.addEventListener('input', clearValidation, { once: true });
                });
            }

            return [...new Set(errors)];
        }
        
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

        function onFocusNumber(event) {
            const input = event.target;
            if (input.value) {
                input.value = String(parseFormattedNumber(input.value));
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
                    if (input.dataset.formattingAttached) return;
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
                case 'asset': fields = getAssetFields(category); break;
                case 'liability': fields = getLiabilityFields(category); break;
                case 'income': fields = getIncomeFields(category); break;
                case 'expense': fields = getExpenseFields(category); break;
            }
            row.innerHTML = fields;
            container.appendChild(row);

            row.querySelectorAll('[data-i18n-title-key]').forEach(element => {
                element.setAttribute('title', getTranslation(element.getAttribute('data-i18n-title-key')));
            });

            new bootstrap.Tooltip(row.querySelector('[data-bs-toggle="tooltip"]'));
            
            row.querySelector('.delete-category-btn').addEventListener('click', () => {
                if (row.dataset.type === 'asset') {
                    const assetName = row.querySelector('.category-name').value;
                    if (assetName) {
                        const inputs = getUserInputs();
                        let allocationPercentage = 0;
                        inputs.allocationPeriods.forEach(period => {
                            if (period.allocation[assetName]) {
                                allocationPercentage += period.allocation[assetName];
                            }
                        });
                        if (allocationPercentage >= 0.01) {
                             displayAlerts([getTranslation('assetDeletionWarning', { assetName: assetName })], 'warning');
                        }
                    }
                }
                row.remove();
                autoRunSimulationIfEnabled();
            });

            applyNumberFormatting(row);
        }

        function getAssetFields(category) {
            const idPrefix = getUniqueId('asset');
            return `
                <div class="col-6 col-md-4 col-lg-3 col-xxl-2"><label for="${idPrefix}-name" class="form-label" data-bs-toggle="tooltip" data-i18n-title-key="assetNameTooltip">${getTranslation('nameLabel')} <i class="bi bi-info-circle"></i></label><input type="text" id="${idPrefix}-name" class="form-control category-name" value="${category.name || ''}"></div>
                <div class="col-6 col-md-4 col-lg-3 col-xxl-2"><label for="${idPrefix}-value" class="form-label" data-bs-toggle="tooltip" data-i18n-title-key="assetValueTooltip">${getTranslation('valueLabel')} <i class="bi bi-info-circle"></i></label><input type="text" id="${idPrefix}-value" class="form-control category-value" value="${category.value || ''}"></div>
                <div class="col-6 col-md-4 col-lg-3 col-xxl-2"><label for="${idPrefix}-return" class="form-label" data-bs-toggle="tooltip" data-i18n-title-key="assetReturnTooltip">${getTranslation('returnLabel')} <i class="bi bi-info-circle"></i></label><input type="text" id="${idPrefix}-return" class="form-control category-return" value="${category.return || ''}"></div>
                <div class="col-6 col-md-4 col-lg-3 col-xxl-2"><label for="${idPrefix}-tax" class="form-label" data-bs-toggle="tooltip" data-i18n-title-key="assetTaxTooltip">${getTranslation('taxLabel')} <i class="bi bi-info-circle"></i></label><input type="text" id="${idPrefix}-tax" class="form-control category-tax" value="${category.tax || ''}"></div>
                <div class="col-6 col-md-4 col-lg-3 col-xxl-1"><label for="${idPrefix}-start-year" class="form-label" data-bs-toggle="tooltip" data-i18n-title-key="assetStartYearTooltip">${getTranslation('startLabel')} <i class="bi bi-info-circle"></i></label><input type="text" id="${idPrefix}-start-year" class="form-control category-start-year" value="${category.startYear || new Date().getFullYear()}"></div>
                <div class="col-6 col-md-4 col-lg-3 col-xxl-1"><label for="${idPrefix}-end-year" class="form-label" data-bs-toggle="tooltip" data-i18n-title-key="assetEndYearTooltip">${getTranslation('endLabel')} <i class="bi bi-info-circle"></i></label><input type="text" id="${idPrefix}-end-year" class="form-control category-end-year" value="${category.endYear || ''}"></div>
                <div class="col-6 col-md-4 col-lg-3 col-xxl-1"><label for="${idPrefix}-withdrawal-order" class="form-label" data-bs-toggle="tooltip" data-i18n-title-key="assetWithdrawalOrderTooltip">${getTranslation('withdrawalOrderLabel')} <i class="bi bi-info-circle"></i></label><input type="text" id="${idPrefix}-withdrawal-order" class="form-control category-withdrawal-order" value="${category.withdrawalOrder || ''}"></div>
                <div class="col-6 col-md-4 col-lg-3 col-xxl-1 d-flex align-items-end"><i class="bi bi-grip-vertical drag-handle me-2" style="cursor: move; font-size: 1.2rem;"></i><button class="btn btn-danger btn-sm delete-category-btn" aria-label="${getTranslation('deleteAssetCategoryLabel')}"><i class="bi bi-trash"></i></button></div>
            `;
        }

        function getLiabilityFields(category) {
            const idPrefix = getUniqueId('liability');
            return `
                <div class="col-6 col-md-4 col-lg-3 col-xxl-2"><label for="${idPrefix}-name" class="form-label" data-bs-toggle="tooltip" data-i18n-title-key="liabilityNameTooltip">${getTranslation('nameLabel')} <i class="bi bi-info-circle"></i></label><input type="text" id="${idPrefix}-name" class="form-control category-name" value="${category.name || ''}"></div>
                <div class="col-6 col-md-4 col-lg-3 col-xxl-2"><label for="${idPrefix}-value" class="form-label" data-bs-toggle="tooltip" data-i18n-title-key="liabilityValueTooltip">${getTranslation('valueLabel')} <i class="bi bi-info-circle"></i></label><input type="text" id="${idPrefix}-value" class="form-control category-value" value="${category.value || ''}"></div>
                <div class="col-6 col-md-4 col-lg-3 col-xxl-2"><label for="${idPrefix}-interest-rate" class="form-label" data-bs-toggle="tooltip" data-i18n-title-key="liabilityInterestRateTooltip">${getTranslation('interestRateLabel')} <i class="bi bi-info-circle"></i></label><input type="text" id="${idPrefix}-interest-rate" class="form-control category-interest-rate" value="${category.interestRate || ''}"></div>
                <div class="col-6 col-md-4 col-lg-3 col-xxl-1"><label for="${idPrefix}-start-year" class="form-label" data-bs-toggle="tooltip" data-i18n-title-key="liabilityStartYearTooltip">${getTranslation('startLabel')} <i class="bi bi-info-circle"></i></label><input type="text" id="${idPrefix}-start-year" class="form-control category-start-year" value="${category.startYear || new Date().getFullYear()}"></div>
                <div class="col-6 col-md-4 col-lg-3 col-xxl-1"><label for="${idPrefix}-end-year" class="form-label" data-bs-toggle="tooltip" data-i18n-title-key="liabilityEndYearTooltip">${getTranslation('endLabel')} <i class="bi bi-info-circle"></i></label><input type="text" id="${idPrefix}-end-year" class="form-control category-end-year" value="${category.endYear || ''}"></div>
                <div class="col-6 col-md-4 col-lg-3 col-xxl-1 d-flex align-items-end"><i class="bi bi-grip-vertical drag-handle me-2" style="cursor: move; font-size: 1.2rem;"></i><button class="btn btn-danger btn-sm delete-category-btn" aria-label="${getTranslation('deleteLiabilityCategoryLabel')}"><i class="bi bi-trash"></i></button></div>
            `;
        }

        function getIncomeFields(category) {
            const idPrefix = getUniqueId('income');
            return `
                <div class="col-6 col-md-4 col-lg-3 col-xxl-2"><label for="${idPrefix}-name" class="form-label" data-bs-toggle="tooltip" data-i18n-title-key="incomeNameTooltip">${getTranslation('nameLabel')} <i class="bi bi-info-circle"></i></label><input type="text" id="${idPrefix}-name" class="form-control category-name" value="${category.name || ''}"></div>
                <div class="col-6 col-md-4 col-lg-3 col-xxl-2"><label for="${idPrefix}-value" class="form-label" data-bs-toggle="tooltip" data-i18n-title-key="incomeValueTooltip">${getTranslation('valueLabel')} <i class="bi bi-info-circle"></i></label><input type="text" id="${idPrefix}-value" class="form-control category-value" value="${category.value || ''}"></div>
                <div class="col-6 col-md-4 col-lg-3 col-xxl-2"><label for="${idPrefix}-frequency" class="form-label" data-bs-toggle="tooltip" data-i18n-title-key="incomeFrequencyTooltip">${getTranslation('frequencyLabel')} <i class="bi bi-info-circle"></i></label><select id="${idPrefix}-frequency" class="form-select category-frequency"><option value="monthly" ${category.frequency === 'monthly' ? 'selected' : ''}>${getTranslation('monthlyOption')}</option><option value="yearly" ${category.frequency === 'yearly' ? 'selected' : ''}>${getTranslation('yearlyOption')}</option></select></div>
                <div class="col-6 col-md-4 col-lg-3 col-xxl-2"><label for="${idPrefix}-indexed" class="form-label" data-bs-toggle="tooltip" data-i18n-title-key="incomeIndexedTooltip">${getTranslation('indexedLabel')} <i class="bi bi-info-circle"></i></label><input id="${idPrefix}-indexed" class="form-check-input d-block category-indexed" type="checkbox" ${category.indexed ? 'checked' : ''}></div>
                <div class="col-6 col-md-4 col-lg-3 col-xxl-1"><label for="${idPrefix}-start-year" class="form-label" data-bs-toggle="tooltip" data-i18n-title-key="incomeStartYearTooltip">${getTranslation('startLabel')} <i class="bi bi-info-circle"></i></label><input type="text" id="${idPrefix}-start-year" class="form-control category-start-year" value="${category.startYear || new Date().getFullYear()}"></div>
                <div class="col-6 col-md-4 col-lg-3 col-xxl-1"><label for="${idPrefix}-end-year" class="form-label" data-bs-toggle="tooltip" data-i18n-title-key="incomeEndYearTooltip">${getTranslation('endLabel')} <i class="bi bi-info-circle"></i></label><input type="text" id="${idPrefix}-end-year" class="form-control category-end-year" value="${category.endYear || ''}"></div>
                <div class="col-6 col-md-4 col-lg-3 col-xxl-1 d-flex align-items-end"><i class="bi bi-grip-vertical drag-handle me-2" style="cursor: move; font-size: 1.2rem;"></i><button class="btn btn-danger btn-sm delete-category-btn" aria-label="${getTranslation('deleteIncomeCategoryLabel')}"><i class="bi bi-trash"></i></button></div>
            `;
        }

        function getExpenseFields(category) {
            const idPrefix = getUniqueId('expense');
            return `
                <div class="col-6 col-md-4 col-lg-3 col-xxl-2"><label for="${idPrefix}-name" class="form-label" data-bs-toggle="tooltip" data-i18n-title-key="expenseNameTooltip">${getTranslation('nameLabel')} <i class="bi bi-info-circle"></i></label><input type="text" id="${idPrefix}-name" class="form-control category-name" value="${category.name || ''}"></div>
                <div class="col-6 col-md-4 col-lg-3 col-xxl-2"><label for="${idPrefix}-value" class="form-label" data-bs-toggle="tooltip" data-i18n-title-key="expenseValueTooltip">${getTranslation('valueLabel')} <i class="bi bi-info-circle"></i></label><input type="text" id="${idPrefix}-value" class="form-control category-value" value="${category.value || ''}"></div>
                <div class="col-6 col-md-4 col-lg-3 col-xxl-2"><label for="${idPrefix}-frequency" class="form-label" data-bs-toggle="tooltip" data-i18n-title-key="expenseFrequencyTooltip">${getTranslation('frequencyLabel')} <i class="bi bi-info-circle"></i></label><select id="${idPrefix}-frequency" class="form-select category-frequency"><option value="monthly" ${category.frequency === 'monthly' ? 'selected' : ''}>${getTranslation('monthlyOption')}</option><option value="yearly" ${category.frequency === 'yearly' ? 'selected' : ''}>${getTranslation('yearlyOption')}</option></select></div>
                <div class="col-6 col-md-4 col-lg-3 col-xxl-2"><label for="${idPrefix}-indexed" class="form-label" data-bs-toggle="tooltip" data-i18n-title-key="expenseIndexedTooltip">${getTranslation('indexedLabel')} <i class="bi bi-info-circle"></i></label><input id="${idPrefix}-indexed" class="form-check-input d-block category-indexed" type="checkbox" ${category.indexed ? 'checked' : ''}></div>
                <div class="col-6 col-md-4 col-lg-3 col-xxl-1"><label for="${idPrefix}-start-year" class="form-label" data-bs-toggle="tooltip" data-i18n-title-key="expenseStartYearTooltip">${getTranslation('startLabel')} <i class="bi bi-info-circle"></i></label><input type="text" id="${idPrefix}-start-year" class="form-control category-start-year" value="${category.startYear || new Date().getFullYear()}"></div>
                <div class="col-6 col-md-4 col-lg-3 col-xxl-1"><label for="${idPrefix}-end-year" class="form-label" data-bs-toggle="tooltip" data-i18n-title-key="expenseEndYearTooltip">${getTranslation('endLabel')} <i class="bi bi-info-circle"></i></label><input type="text" id="${idPrefix}-end-year" class="form-control category-end-year" value="${category.endYear || ''}"></div>
                <div class="col-6 col-md-4 col-lg-3 col-xxl-1 d-flex align-items-end"><i class="bi bi-grip-vertical drag-handle me-2" style="cursor: move; font-size: 1.2rem;"></i><button class="btn btn-danger btn-sm delete-category-btn" aria-label="${getTranslation('deleteExpenseCategoryLabel')}"><i class="bi bi-trash"></i></button></div>
            `;
        }

        function addAllocationPeriod(period = {}) {
            const periodId = getUniqueId('period');
            const row = document.createElement('div');
            row.classList.add('row', 'mb-3', 'allocation-period');
            row.innerHTML = `
                <div class="col-xxl-2">
                    <label for="allocation-start-year-${periodId}" class="form-label">${getTranslation('startYearLabel')}</label>
                    <input type="text" id="allocation-start-year-${periodId}" class="form-control allocation-start-year" value="${period.startYear || new Date().getFullYear()}">
                </div>
                <div class="col-xxl-6" id="allocation-assets-${periodId}"></div>
                <div class="col-xxl-4 d-flex align-items-center">
                    <div class="form-check form-switch me-3">
                        <input class="form-check-input auto-rebalance-period-checkbox" type="checkbox" id="rebalance-period-${periodId}" ${period.rebalance ? 'checked' : ''}>
                        <label class="form-check-label" for="rebalance-period-${periodId}" data-bs-toggle="tooltip" data-i18n-title-key="autoRebalanceTooltip">${getTranslation('autoRebalanceLabel')} <i class="bi bi-info-circle"></i></label>
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
            new bootstrap.Tooltip(row.querySelector('[data-bs-toggle="tooltip"]'));
        }

        function updateAllocationAssets(periodRow, allocation) {
            const container = periodRow.querySelector('[id^=allocation-assets-]');
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
                input.addEventListener('blur', () => updateAllocationTotal(periodRow));
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
            progressBar.classList.toggle('bg-danger', displayTotal !== 100);
        }

        function getAssetNames() {
            return Array.from(document.querySelectorAll('#asset-categories-container .category-name'))
                        .map(input => input.value)
                        .filter(Boolean);
        }

        function updateSectionTitles() {
            const inputs = getUserInputs();
            const currentYear = new Date().getFullYear();
            const locale = getSettings().language;

            const formatCurrency = (value) => value.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

            const assetTotal = inputs.assets.filter(a => (a.startYear || currentYear) <= currentYear && (!a.endYear || a.endYear >= currentYear)).reduce((sum, a) => sum + a.value, 0);
            document.querySelector('#section-assets h3').innerHTML = `${getTranslation('assetsAccordionButton')} - ${getTranslation('total')} ${currentYear}: ${formatCurrency(assetTotal)}`;

            const liabilityTotal = inputs.liabilities.filter(l => (l.startYear || currentYear) <= currentYear && (!l.endYear || l.endYear >= currentYear)).reduce((sum, l) => sum + l.value, 0);
            document.querySelector('#section-liabilities h3').innerHTML = `${getTranslation('liabilitiesAccordionButton')} - ${getTranslation('total')} ${currentYear}: ${formatCurrency(liabilityTotal)}`;

            const incomeTotal = inputs.incomes.filter(i => (i.startYear || currentYear) <= currentYear && (!i.endYear || i.endYear >= currentYear)).reduce((sum, i) => sum + (i.frequency === 'monthly' ? i.value * 12 : i.value), 0);
            document.querySelector('#section-income h3').innerHTML = `${getTranslation('incomeAccordionButton')} - ${getTranslation('total')} ${currentYear}: ${formatCurrency(incomeTotal)}`;

            const expenseTotal = inputs.expenses.filter(e => (e.startYear || currentYear) <= currentYear && (!e.endYear || e.endYear >= currentYear)).reduce((sum, e) => sum + (e.frequency === 'monthly' ? e.value * 12 : e.value), 0);
            document.querySelector('#section-expenses h3').innerHTML = `${getTranslation('expensesAccordionButton')} - ${getTranslation('total')} ${currentYear}: ${formatCurrency(expenseTotal)}`;

            const savingsTotal = incomeTotal - expenseTotal;
            document.querySelector('#section-allocation h3').innerHTML = `${getTranslation('savingsAllocationAccordionButton')} - Total ${currentYear}: ${formatCurrency(savingsTotal)}`;
        }

        function getUserInputs() {
            const getCategoryData = (container, type) => {
                const items = [];
                container.querySelectorAll('.category-row').forEach(row => {
                    const name = row.querySelector('.category-name').value;
                    if (!name) return;
                    let item = { name };
                    if (type === 'income' || type === 'expense') {
                        item.value = parseFormattedNumber(row.querySelector('.category-value').value) || 0;
                        item.frequency = row.querySelector('.category-frequency').value;
                        item.indexed = row.querySelector('.category-indexed').checked;
                    } else if (type === 'asset') {
                        item.value = parseFormattedNumber(row.querySelector('.category-value').value) || 0;
                        item.return = parseFormattedNumber(row.querySelector('.category-return').value) / 100 || 0;
                        item.tax = parseFormattedNumber(row.querySelector('.category-tax').value) / 100 || 0;
                        item.withdrawalOrder = parseInt(parseFormattedNumber(row.querySelector('.category-withdrawal-order').value)) || 99;
                    } else if (type === 'liability') {
                        item.value = parseFormattedNumber(row.querySelector('.category-value').value) || 0;
                        item.interestRate = parseFormattedNumber(row.querySelector('.category-interest-rate').value) / 100 || 0;
                    }
                    item.startYear = parseInt(parseFormattedNumber(row.querySelector('.category-start-year').value)) || 0;
                    item.endYear = parseInt(parseFormattedNumber(row.querySelector('.category-end-year').value)) || 0;
                    items.push(item);
                });
                return items;
            };

            const allocationPeriods = [];
            document.querySelectorAll('.allocation-period').forEach(row => {
                const allocation = {};
                row.querySelectorAll('.allocation-asset').forEach(input => {
                    allocation[input.dataset.assetName] = parseFormattedNumber(input.value) / 100 || 0;
                });
                allocationPeriods.push({
                    startYear: parseInt(parseFormattedNumber(row.querySelector('.allocation-start-year').value)) || 0,
                    allocation: allocation,
                    rebalance: row.querySelector('.auto-rebalance-period-checkbox').checked,
                });
            });

            return {
                currentAge: parseInt(parseFormattedNumber(document.getElementById('current-age').value)) || 0,
                inflation: parseFormattedNumber(document.getElementById('inflation').value) / 100 || 0,
                pensionAge: parseInt(parseFormattedNumber(document.getElementById('pension-age').value)) || 0,
                earlyRetirementAge: parseInt(parseFormattedNumber(document.getElementById('early-retirement-age').value)) || 0,
                estimatedPension: parseFormattedNumber(document.getElementById('estimated-pension').value) || 0,
                withdrawalRate: parseFormattedNumber(document.getElementById('withdrawal-rate').value) / 100 || 0,
                incomes: getCategoryData(incomeCategoriesContainer, 'income'),
                expenses: getCategoryData(expenseCategoriesContainer, 'expense'),
                assets: getCategoryData(assetCategoriesContainer, 'asset'),
                liabilities: getCategoryData(liabilityCategoriesContainer, 'liability'),
                allocationPeriods: allocationPeriods,
            };
        }

        function runAndRender(isManualRun = false) {
            if (isManualRun) {
                assetColors = {};
                colorIndex = 0;
            }
            hasSimulationRanOnce = true;

            const errors = validateAllInputs();
            if (errors.length > 0) {
                displayAlerts(errors);
                return;
            }
            document.getElementById('alerts-container').innerHTML = '';
            document.getElementById('monte-carlo-success-message').style.display = 'none';
            document.querySelector('#results .table-responsive').style.display = 'block';

            const inputs = getUserInputs();
            saveActivePlanData(inputs);
            const { results, earlyRetirementYear, amountPensionMessage } = window.runSimulation(inputs);
            renderTable(results);
            renderCharts(results);

            if (earlyRetirementYear) {
                const earlyRetirementData = results.find(r => r.year === earlyRetirementYear);
                const earlyRetirementAge = earlyRetirementData.age;
                const netWorth = earlyRetirementData.net_worth.toLocaleString(getSettings().language, {minimumFractionDigits: 0, maximumFractionDigits: 0});
                earlyRetirementMessage.innerHTML = getTranslation('earlyRetirementMessage', { year: earlyRetirementYear, age: earlyRetirementAge, netWorth: netWorth });
                earlyRetirementMessage.style.display = 'block';
            } else {
                earlyRetirementMessage.style.display = 'none';
            }

            if (amountPensionMessage > 0) {
                const monthlyWithdrawal = amountPensionMessage / 12;
                const pensionAge = parseInt(parseFormattedNumber(document.getElementById('pension-age').value)) || 0;
                const pensionYearData = results.find(r => r.age === pensionAge);
                const netWorth = pensionYearData.net_worth.toLocaleString(getSettings().language, {minimumFractionDigits: 0, maximumFractionDigits: 0});
                const withdrawalRate = (parseFormattedNumber(document.getElementById('withdrawal-rate').value) || 0);
                pensionWithdrawalMessage.innerHTML = getTranslation('pensionWithdrawalMessage', { amount: amountPensionMessage.toLocaleString(getSettings().language, {minimumFractionDigits: 0, maximumFractionDigits: 0}), monthly: monthlyWithdrawal.toLocaleString(getSettings().language, {minimumFractionDigits: 0, maximumFractionDigits: 0}), netWorth: netWorth, rate: withdrawalRate });
                pensionWithdrawalMessage.style.display = 'block';
            } else {
                pensionWithdrawalMessage.style.display = 'none';
            }

            document.getElementById('results').style.display = 'block';
        }

        let wealthChart = null;

        function renderCharts(results) {
            const isDarkMode = () => document.documentElement.getAttribute('data-bs-theme') === 'dark';
            const textColor = isDarkMode() ? 'rgba(255, 255, 255, 0.8)' : Chart.defaults.color;
            const gridColor = isDarkMode() ? 'rgba(255, 255, 255, 0.1)' : Chart.defaults.borderColor;
            const locale = getSettings().language;
            const formatOptions = { minimumFractionDigits: 0, maximumFractionDigits: 0 };

            if (results.length === 0) {
                if (wealthChart) {
                    wealthChart.destroy();
                    wealthChart = null;
                }
                return;
            }
            
            if (wealthChart && wealthChart.config.type === 'line') {
                wealthChart.destroy();
                wealthChart = null;
            }

            const labels = results.map(r => r.year);
            const assetKeys = Object.keys(results[0].assets);
            const netWorthData = results.map(r => r.net_worth);

            if (wealthChart) {
                wealthChart.data.labels = labels;

                const existingAssetKeys = new Set(wealthChart.data.datasets.filter(ds => ds.type !== 'line').map(ds => ds.label));
                const newAssetKeys = new Set(assetKeys);

                // Update existing and remove old
                wealthChart.data.datasets.forEach((dataset, index) => {
                    if (dataset.type === 'line') {
                        dataset.data = netWorthData;
                    } else if (newAssetKeys.has(dataset.label)) {
                        dataset.data = results.map(r => r.assets[dataset.label]);
                    }
                });
                
                wealthChart.data.datasets = wealthChart.data.datasets.filter(ds => ds.type === 'line' || newAssetKeys.has(ds.label));

                // Add new
                newAssetKeys.forEach(key => {
                    if (!existingAssetKeys.has(key)) {
                        wealthChart.data.datasets.push({
                            label: key,
                            data: results.map(r => r.assets[key]),
                            backgroundColor: getAssetColor(key),
                        });
                    }
                });
                
                wealthChart.options.scales.x.ticks.color = textColor;
                wealthChart.options.scales.x.grid.color = gridColor;
                wealthChart.options.scales.y.ticks.color = textColor;
                wealthChart.options.scales.y.grid.color = gridColor;
                wealthChart.options.plugins.legend.labels.color = textColor;

                wealthChart.update();
            } else {
                const assetDatasets = assetKeys.map(key => ({
                    label: key,
                    data: results.map(r => r.assets[key]),
                    backgroundColor: getAssetColor(key),
                }));
                
                const allDatasets = assetDatasets.concat({
                    label: getTranslation('netWorthLabel'),
                    data: netWorthData,
                    type: 'line',
                    borderColor: '#20c997',
                    tension: 0.1
                });

                const wealthCtx = document.getElementById('wealth-evolution-chart').getContext('2d');
                wealthChart = new Chart(wealthCtx, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: allDatasets
                    },
                    options: {
                        animation: {
                            duration: 250
                        },
                        scales: {
                            x: { stacked: true, ticks: { color: textColor }, grid: { color: gridColor } },
                            y: { stacked: true, ticks: { color: textColor, callback: v => v.toLocaleString(locale, formatOptions) }, grid: { color: gridColor } }
                        },
                        plugins: {
                            legend: { labels: { color: textColor } },
                            tooltip: {
                                callbacks: {
                                    title: c => `${c[0].label} (${getTranslation('ageLabel')}: ${parseInt(c[0].label) - new Date().getFullYear() + parseInt(document.getElementById('current-age').value)})`,
                                    label: c => `${c.dataset.label || ''}: ${c.parsed.y.toLocaleString(locale, formatOptions)}`
                                }
                            }
                        }
                    }
                });
            }
        }

        function loadDataFromLocalStorage() {
            const activePlan = getActivePlan();
            if (activePlan && activePlan.data) {
                setUserValues(activePlan.data);
                return true;
            }
            return false;
        }

        function exportData() {
            const appData = getAppData();
            const userPlans = {
                plans: appData.plans
            };
            const json = JSON.stringify(userPlans, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'squirrel-plan-data.json';
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
                try {
                    const importedData = JSON.parse(e.target.result);
                    const appData = getAppData();
        
                    if (importedData.plans) { // New multi-plan format
                        importedData.plans.forEach(importedPlan => {
                            const originalName = importedPlan.name;
                            let newName = originalName;
                            let i = 1;
                            while (appData.plans.some(p => p.name === newName)) {
                                newName = `${originalName} (${i++})`;
                            }
                            importedPlan.name = newName;
                            appData.plans.push(importedPlan);
                        });
                    } else { // Old single-plan format, treat as a single plan import
                        let planName = 'Imported Plan';
                        let i = 1;
                        while(appData.plans.find(p => p.name === planName)) {
                            planName = `Imported Plan ${i++}`;
                        }
                        const newPlan = {
                            name: planName,
                            data: importedData,
                            config: { monteCarloEnabled: false } 
                        };
                        appData.plans.push(newPlan);
                        appData.settings.activePlanName = planName;
                    }
        
                    saveAppData(appData);
                    
                    // Instead of reloading, just load the data and re-render
                    loadDataFromLocalStorage();
                    runAndRender(false);
                    updateSectionTitles();
        
                } catch (error) {
                    console.error('Error importing data:', error);
                } finally {
                    // Reset file input to allow re-uploading the same file
                    event.target.value = null;
                }
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
            data.incomes.forEach(i => addCategory(incomeCategoriesContainer, 'income', { ...i, value: String(i.value) }));
            expenseCategoriesContainer.innerHTML = '';
            data.expenses.forEach(e => addCategory(expenseCategoriesContainer, 'expense', { ...e, value: String(e.value) }));
            assetCategoriesContainer.innerHTML = '';
            data.assets.forEach(a => {
                const modA = { ...a, value: String(a.value) };
                if (typeof modA.return === 'number') modA.return = String(modA.return * 100);
                if (typeof modA.tax === 'number') modA.tax = String(modA.tax * 100);
                addCategory(assetCategoriesContainer, 'asset', modA);
            });
            liabilityCategoriesContainer.innerHTML = '';
            data.liabilities.forEach(l => {
                const modL = { ...l, value: String(l.value) };
                if (typeof modL.interestRate === 'number') modL.interestRate = String(modL.interestRate * 100);
                addCategory(liabilityCategoriesContainer, 'liability', modL);
            });
            allocationPeriodsContainer.innerHTML = '';
            data.allocationPeriods.forEach(p => {
                const modP = { ...p };
                if (modP.allocation) {
                    Object.keys(modP.allocation).forEach(name => {
                        const alloc = modP.allocation[name];
                        modP.allocation[name] = String((typeof alloc === 'object' && alloc !== null) ? alloc.percentage * 100 : alloc * 100);
                    });
                }
                addAllocationPeriod(modP);
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
            let headerHtml = `<th>${getTranslation('yearHeader')}</th><th>${getTranslation('ageHeader')}</th><th>${getTranslation('netIncomeHeader')}</th><th>${getTranslation('expensesHeader')}</th><th>${getTranslation('savingsCapacityHeader')}</th><th>${getTranslation('savingsRateHeader')}</th><th>${getTranslation('netWorthHeader')}</th>`;
            assetKeys.forEach(key => headerHtml += `<th>${getTranslation('assetHeader', { asset: key })}</th>`);
            liabilityKeys.forEach(key => headerHtml += `<th>${getTranslation('liabilityHeader', { liability: key })}</th>`);
            headerRow.innerHTML = headerHtml;
            tableHead.appendChild(headerRow);

            const locale = getSettings().language;
            const formatOptions = { minimumFractionDigits: 0, maximumFractionDigits: 0 };
            results.forEach(row => {
                const tr = document.createElement('tr');
                let rowHtml = `<td>${row.year}</td><td>${row.age}</td><td>${row.net_income.toLocaleString(locale, formatOptions)}</td><td>${row.expenses.toLocaleString(locale, formatOptions)}</td><td>${row.savings_capacity.toLocaleString(locale, formatOptions)}</td><td>${(row.savings_rate * 100).toFixed(0)}%</td><td>${row.net_worth.toLocaleString(locale, formatOptions)}</td>`;
                assetKeys.forEach(key => rowHtml += `<td>${(row.assets[key] || 0).toLocaleString(locale, formatOptions)}</td>`);
                liabilityKeys.forEach(key => rowHtml += `<td>${(row.liabilities[key] ? row.liabilities[key].value : 0).toLocaleString(locale, formatOptions)}</td>`);
                tr.innerHTML = rowHtml;
                tableBody.appendChild(tr);
            });
        }

        function getRandomColor() {
            const letters = '0123456789ABCDEF';
            let color = '#';
            for (let i = 0; i < 6; i++) color += letters[Math.floor(Math.random() * 16)];
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
            data.assets.forEach(a => addCategory(assetCategoriesContainer, 'asset', a));
            data.liabilities.forEach(l => addCategory(liabilityCategoriesContainer, 'liability', l));
            data.incomes.forEach(i => addCategory(incomeCategoriesContainer, 'income', i));
            data.expenses.forEach(e => addCategory(expenseCategoriesContainer, 'expense', e));
            data.allocationPeriods.forEach(p => addAllocationPeriod(p));
            document.getElementById('current-age').value = data.currentAge;
            document.getElementById('pension-age').value = data.pensionAge;
            document.getElementById('estimated-pension').value = data.estimatedPension;
            document.getElementById('inflation').value = data.inflation;
            document.getElementById('withdrawal-rate').value = data.withdrawalRate;
            applyNumberFormatting(document.body);
            currentPlanIsPreset = true;
        }

        function clearSimulationResults() {
            document.getElementById('results').style.display = 'none';
            earlyRetirementMessage.style.display = 'none';
            pensionWithdrawalMessage.style.display = 'none';
            if (wealthChart) {
                wealthChart.destroy();
                wealthChart = null;
            }
            document.getElementById('results-table-head').innerHTML = '';
            document.getElementById('results-table-body').innerHTML = '';
        }

        function initializeTooltips() {
            [...document.querySelectorAll('[data-bs-toggle="tooltip"]')].map(el => new bootstrap.Tooltip(el));
        }

        function initializeSortable() {
            const options = { animation: 150, ghostClass: 'sortable-ghost', chosenClass: 'sortable-chosen', dragClass: 'sortable-drag', handle: '.drag-handle' };
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

            document.getElementById('early-retirement-message').style.display = 'none';
            document.getElementById('pension-withdrawal-message').style.display = 'none';
            document.querySelector('#results .table-responsive').style.display = 'none';

            setTimeout(() => {
                const inputs = getUserInputs();
                const { successRate, percentileData, labels } = window.runMonteCarloSimulation(inputs);

                const successMessageEl = document.getElementById('monte-carlo-success-message');
                successMessageEl.innerHTML = getTranslation('monteCarloSuccessRateMessage', { successRate: (successRate * 100).toFixed(2) });
                successMessageEl.style.display = 'block';
                
                renderMonteCarloChart(percentileData, labels);
                document.getElementById('results').style.display = 'block';

                document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }

        function renderMonteCarloChart(percentileData, labels) {
            const isDarkMode = () => document.documentElement.getAttribute('data-bs-theme') === 'dark';
            const textColor = isDarkMode() ? 'rgba(255, 255, 255, 0.8)' : Chart.defaults.color;
            const gridColor = isDarkMode() ? 'rgba(255, 255, 255, 0.1)' : Chart.defaults.borderColor;
            const locale = getSettings().language;
            const formatOptions = { minimumFractionDigits: 0, maximumFractionDigits: 0 };
            const wealthCtx = document.getElementById('wealth-evolution-chart').getContext('2d');

            if (wealthChart && wealthChart.config.type === 'bar') {
                wealthChart.destroy();
                wealthChart = null;
            }

            const percentileOrder = ["Top 5%", "Top 10%", "Top 15%", "Top 25%", "Median", "Bottom 25%", "Bottom 15%", "Bottom 10%", "Bottom 5%"];
            const percentileColors = {"Top 5%":'#2ECC71',"Top 10%":'#58D68D',"Top 15%":'#82E0AA',"Top 25%":'#ABEBC6',"Median":'#20c997',"Bottom 25%":'#F5B7B1',"Bottom 15%":'#F1948A',"Bottom 10%":'#EC7063',"Bottom 5%":'#E74C3C'};

            const createGradient = (ctx, color) => {
                const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                const rgb = (hex => { const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex); return r ? {r:parseInt(r[1],16),g:parseInt(r[2],16),b:parseInt(r[3],16)}:null; })(color);
                if (!rgb) return 'rgba(0,0,0,0)';
                gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`);
                gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`);
                return gradient;
            };

            const datasets = percentileOrder.map((p, i) => ({
                label: p,
                data: percentileData[p],
                type: 'line',
                borderColor: percentileColors[p] || getRandomColor(),
                backgroundColor: createGradient(wealthCtx, percentileColors[p]),
                tension: 0.1,
                fill: i < percentileOrder.length - 1 ? (i + 1).toString() : 'origin',
                borderWidth: p === 'Median' ? 3 : 1.5,
                pointRadius: 0,
                pointHitRadius: 10,
            }));

            if (wealthChart) {
                wealthChart.data.labels = labels;
                wealthChart.data.datasets.forEach((dataset, index) => {
                    dataset.data = datasets[index].data;
                });
                
                wealthChart.options.scales.x.ticks.color = textColor;
                wealthChart.options.scales.x.grid.color = gridColor;
                wealthChart.options.scales.y.ticks.color = textColor;
                wealthChart.options.scales.y.grid.color = gridColor;
                wealthChart.options.plugins.legend.labels.color = textColor;
                wealthChart.update();
            } else {
                 wealthChart = new Chart(wealthCtx, {
                    type: 'line',
                    data: { labels: labels, datasets: datasets },
                    options: {
                        animation: { duration: 250 },
                        scales: {
                            x: { ticks: { color: textColor }, grid: { color: gridColor } },
                            y: { ticks: { color: textColor, callback: v => v.toLocaleString(locale, formatOptions) }, grid: { color: gridColor } }
                        },
                        plugins: {
                            legend: { labels: { color: textColor } },
                            tooltip: {
                                callbacks: {
                                    title: c => `${c[0].label} (${getTranslation('ageLabel')}: ${parseInt(c[0].label) - new Date().getFullYear() + parseInt(document.getElementById('current-age').value)})`,
                                    label: c => `${c.dataset.label || ''}: ${c.parsed.y.toLocaleString(locale, formatOptions)}`
                                }
                            }
                        }
                    }
                });
            }
        }

        function populatePlansModal(duringOnboarding = false) {
            const appData = getAppData();
            const activePlanName = appData.settings.activePlanName;
            let plansModal = bootstrap.Modal.getInstance(document.getElementById('plans-modal'));
            if (!plansModal) {
                plansModal = new bootstrap.Modal(document.getElementById('plans-modal'));
            }

            const plansCloseBtn = document.querySelector('#plans-modal .modal-footer button[data-bs-dismiss="modal"]');

            if (duringOnboarding) {
                if (plansCloseBtn) plansCloseBtn.style.display = 'none';
            } else {
                if (plansCloseBtn) plansCloseBtn.style.display = 'block';
            }
            
            // Populate Preset Plans
            const presetContainer = document.getElementById('plans-modal').querySelector('#preset-plans-container');
            presetContainer.innerHTML = '';
            const presets = ['recent-graduate', 'early-career', 'mid-career', 'late-career'];
            presets.forEach(p => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'list-group-item list-group-item-action';
                const translationKey = p.split('-').map((w, i) => i > 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w).join('');
                button.textContent = getTranslation(translationKey) || p;
                button.dataset.stage = p;
                button.addEventListener('click', () => {
                    const presetName = getTranslation(translationKey) || p;
                    let newName = `${getTranslation('copyOf') || 'Copy of '}${presetName}`;
                    let i = 1;
                    const allPlanNames = appData.plans.map(plan => plan.name);
                    while (allPlanNames.includes(newName)) {
                        newName = `${getTranslation('copyOf') || 'Copy of '}${presetName} (${i++})`;
                    }

                    const planData = getSampleData(p);
                    const newPlan = {
                        name: newName,
                        data: planData,
                        config: { monteCarloEnabled: false }
                    };
                    appData.plans.push(newPlan);
                    appData.settings.activePlanName = newName;
                    saveAppData(appData);
                    
                    plansModal.hide();
                    setUserValues(planData);
                    runAndRender(false);
                    updateSectionTitles();
                });
                presetContainer.appendChild(button);
            });

            // Populate User Plans
            const userPlansContainer = document.getElementById('plans-modal').querySelector('#user-plans-container');
            userPlansContainer.innerHTML = '';

            if (!appData.plans || appData.plans.length === 0) {
                 userPlansContainer.innerHTML = `<p class="text-muted">${getTranslation('noUserPlans') || 'You have no saved plans.'}</p>`;
            } else {
                appData.plans.forEach(plan => {
                    const planEl = document.createElement('a');
                    planEl.href = '#';
                    planEl.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
                    if (plan.name === activePlanName) {
                        planEl.classList.add('active');
                    }
                    
                    const planNameSpan = document.createElement('span');
                    planNameSpan.textContent = plan.name;
                    planEl.appendChild(planNameSpan);

                    planEl.addEventListener('click', (e) => {
                        e.preventDefault();
                        if (e.target.closest('.dropdown')) return;
                        if (plan.name !== activePlanName) {
                            appData.settings.activePlanName = plan.name;
                            saveAppData(appData);
                            plansModal.hide();
                            loadDataFromLocalStorage();
                            runAndRender(false);
                            updateSectionTitles();
                        }
                    });

                    const dropdownContainer = document.createElement('div');
                    dropdownContainer.className = 'dropdown';
                    dropdownContainer.innerHTML = `
                        <button class="btn btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false" style="background: none; border: none; color: inherit;">
                            <i class="bi bi-three-dots-vertical"></i>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end">
                            <li><a class="dropdown-item rename-plan-btn" href="#">${getTranslation('renamePlanButton') || 'Rename'}</a></li>
                            <li><a class="dropdown-item duplicate-plan-btn" href="#">${getTranslation('duplicatePlanButton') || 'Duplicate'}</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item text-danger delete-plan-btn" href="#">${getTranslation('deletePlanButton') || 'Delete'}</a></li>
                        </ul>
                    `;
                    
                    dropdownContainer.querySelector('.rename-plan-btn').addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const newName = prompt(getTranslation('enterNewPlanNamePrompt') || 'Enter a new name for the plan:', plan.name);
                        if (newName && newName.trim() !== '' && newName !== plan.name) {
                            if (appData.plans.find(p => p.name === newName)) {
                                alert(getTranslation('planNameExistsError') || 'A plan with this name already exists.');
                                return;
                            }
                            const oldName = plan.name;
                            plan.name = newName;
                            if (appData.settings.activePlanName === oldName) {
                                appData.settings.activePlanName = newName;
                            }
                            saveAppData(appData);
                            populatePlansModal(duringOnboarding);
                        }
                    });

                    dropdownContainer.querySelector('.duplicate-plan-btn').addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        let newName = `${getTranslation('copyOf') || 'Copy of '}${plan.name}`;
                        let i = 1;
                        const allPlanNames = appData.plans.map(p => p.name);
                        while (allPlanNames.includes(newName)) {
                            newName = `${getTranslation('copyOf') || 'Copy of '}${plan.name} (${i++})`;
                        }
                        const newPlan = JSON.parse(JSON.stringify(plan)); // Deep copy
                        newPlan.name = newName;
                        appData.plans.push(newPlan);
                        saveAppData(appData);
                        populatePlansModal(duringOnboarding);
                    });

                    dropdownContainer.querySelector('.delete-plan-btn').addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (confirm(getTranslation('deletePlanConfirmation', {planName: plan.name}) || `Are you sure you want to delete the plan "${plan.name}"?`)) {
                            const planIndex = appData.plans.findIndex(p => p.name === plan.name);
                            if (planIndex > -1) {
                                if (appData.plans.length === 1) {
                                    alert(getTranslation('cannotDeleteLastPlanError') || 'You cannot delete the last plan.');
                                    return;
                                }

                                appData.plans.splice(planIndex, 1);
                                if (appData.settings.activePlanName === plan.name) {
                                    appData.settings.activePlanName = appData.plans[0].name;
                                    saveAppData(appData);
                                    plansModal.hide();
                                    loadDataFromLocalStorage();
                                    runAndRender(false);
                                    updateSectionTitles();
                                } else {
                                    saveAppData(appData);
                                    populatePlansModal(duringOnboarding);
                                }
                            }
                        }
                    });

                    planEl.appendChild(dropdownContainer);
                    userPlansContainer.appendChild(planEl);
                });
            }

            // "New Blank Plan" button
            const newBlankPlanBtnContainer = document.createElement('div');
            newBlankPlanBtnContainer.className = 'mt-3';
            const newBlankPlanBtn = document.createElement('button');
            newBlankPlanBtn.type = 'button';
            newBlankPlanBtn.className = 'btn btn-success w-100';
            newBlankPlanBtn.textContent = getTranslation('newBlankPlanButton') || 'New Blank Plan';
            newBlankPlanBtn.addEventListener('click', () => {
                let newName = getTranslation('newPlanName') || 'New Plan';
                let i = 1;
                const allPlanNames = appData.plans.map(p => p.name);
                while (allPlanNames.includes(newName)) {
                    newName = `${getTranslation('newPlanName') || 'New Plan'} (${i++})`;
                }
                const newPlan = {
                    name: newName,
                    data: getBlankPlanData(),
                    config: { monteCarloEnabled: false }
                };
                appData.plans.push(newPlan);
                appData.settings.activePlanName = newName;
                saveAppData(appData);
                plansModal.hide();
                setUserValues(newPlan.data);
                runAndRender(false);
                updateSectionTitles();
            });
            newBlankPlanBtnContainer.appendChild(newBlankPlanBtn);
            userPlansContainer.appendChild(newBlankPlanBtnContainer);
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
        
        document.getElementById('export-btn-dropdown').addEventListener('click', exportData);
        document.getElementById('import-btn-dropdown').addEventListener('click', () => document.getElementById('import-file-input').click());
        document.getElementById('import-file-input').addEventListener('change', importData);
        document.getElementById('clear-plan-btn-dropdown').addEventListener('click', () => {
            if (confirm(getTranslation('clearDataConfirmation'))) {
                clearAllInputs();
                runAndRender(false);
            }
        });

        document.getElementById('plans-btn').addEventListener('click', () => {
            let plansModal = bootstrap.Modal.getInstance(document.getElementById('plans-modal'));
            if (!plansModal) {
                plansModal = new bootstrap.Modal(document.getElementById('plans-modal'));
            }
            populatePlansModal(false);
            plansModal.show();
        });
        const financialNav = document.getElementById('financial-nav');
        const contentSections = document.querySelectorAll('.content-section');
        financialNav.addEventListener('click', (e) => {
            if (e.target.tagName === 'A') {
                e.preventDefault();
                const targetId = e.target.getAttribute('href');
                financialNav.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
                e.target.classList.add('active');
                contentSections.forEach(section => section.style.display = `#${section.id}` === targetId ? 'block' : 'none');
            }
        });

        const monteCarloConfig = getActivePlanConfig();
        document.getElementById('enable-monte-carlo').checked = monteCarloConfig.monteCarloEnabled;
        const monteCarloBtn = document.getElementById('run-monte-carlo-btn');
        const standardSimBtn = document.getElementById('run-standard-simulation-btn');
        const setMonteCarloVisibility = (enabled) => {
            monteCarloBtn.classList.toggle('d-none', !enabled);
            standardSimBtn.classList.toggle('d-none', !enabled);
        };
        setMonteCarloVisibility(monteCarloConfig.monteCarloEnabled);

        document.getElementById('enable-monte-carlo').addEventListener('change', (event) => {
            const newConfig = getActivePlanConfig();
            newConfig.monteCarloEnabled = event.target.checked;
            saveActivePlanConfig(newConfig);
            setMonteCarloVisibility(event.target.checked);
        });

        window.addEventListener('languageChanged', () => {
            clearSimulationResults();
            const currentData = getUserInputs();
            setUserValues(currentData);
            initializeTooltips();
            updateSectionTitles();
            runAndRender(false);
        });

        const darkModeToggle = document.getElementById('dark-mode-toggle');
        const currentSettings = getSettings();
        
        function applyTheme(theme) {
            document.documentElement.setAttribute('data-bs-theme', theme);
            darkModeToggle.checked = theme === 'dark';
        }

        applyTheme(currentSettings.theme);

        darkModeToggle.addEventListener('change', function() {
            const newTheme = this.checked ? 'dark' : 'light';
            const settings = getSettings();
            settings.theme = newTheme;
            saveSettings(settings);
            applyTheme(newTheme);
            runAndRender(false);
        });

        document.getElementById('financial-data-content').addEventListener('change', autoRunSimulationIfEnabled);

        function manageSlider(input) {
            if (input.parentElement.querySelector('.temp-slider')) return;
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.classList.add('form-range', 'mt-1', 'temp-slider');
            let min = 0, max = 100, step = 1;

            switch (input.id) {
                case 'inflation': max = 20; step = 0.1; break;
                case 'withdrawal-rate': max = 15; step = 0.1; break;
                case 'early-retirement-age':
                    min = parseInt(document.getElementById('current-age').value) || 18;
                    max = parseInt(document.getElementById('pension-age').value) || 80;
                    break;
                default: return;
            }

            slider.min = min;
            slider.max = max;
            slider.step = step;
            slider.value = isNaN(parseFormattedNumber(input.value)) ? min : parseFormattedNumber(input.value);

            slider.addEventListener('input', () => {
                input.value = slider.value;
                input.dispatchEvent(new Event('change', { bubbles: true }));
            });
            input.addEventListener('input', () => {
                const val = parseFormattedNumber(input.value);
                if (!isNaN(val)) slider.value = val;
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

    const supportedLangs = [
        { code: 'en', name: 'English' },
        { code: 'fr', name: 'Français' },
        { code: 'es', name: 'Español' },
        { code: 'de', name: 'Deutsch' },
        { code: 'it', name: 'Italiano' },
        { code: 'pt', name: 'Português' },
        { code: 'nl', name: 'Nederlands' },
    ];
    
    let langToSet = 'en';
    if (window.SquirrelPlanApp && window.SquirrelPlanApp.getSettings) {
        const settings = window.SquirrelPlanApp.getSettings();
        if (settings && settings.language) {
            langToSet = settings.language;
        }
    }
    
    const languagePickerContainer = document.getElementById('language-picker-container');
    if (languagePickerContainer) {
        const dropdownDiv = document.createElement('div');
        dropdownDiv.className = 'dropdown';

        const dropdownButton = document.createElement('button');
        dropdownButton.className = 'btn btn-secondary dropdown-toggle';
        dropdownButton.type = 'button';
        dropdownButton.id = 'language-selector';
        dropdownButton.setAttribute('data-bs-toggle', 'dropdown');
        dropdownButton.setAttribute('aria-expanded', 'false');
        dropdownButton.textContent = 'Language';

        const dropdownMenu = document.createElement('ul');
        dropdownMenu.className = 'dropdown-menu';
        dropdownMenu.setAttribute('aria-labelledby', 'language-selector');

        supportedLangs.forEach(lang => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.className = 'dropdown-item';
            a.href = '#';
            a.textContent = lang.name;
            a.onclick = (e) => {
                e.preventDefault();
                if (lang.code === currentLang) {
                    alert(getTranslation('languageAlreadySelected'));
                    return;
                }
                setLanguage(lang.code);
            };
            li.appendChild(a);
            dropdownMenu.appendChild(li);
        });

        dropdownDiv.appendChild(dropdownButton);
        dropdownDiv.appendChild(dropdownMenu);
        languagePickerContainer.appendChild(dropdownDiv);
    }

    setLanguage(langToSet);

        const isTrulyNewUser = isNewUser || !appData.plans || appData.plans.length === 0;

        if (isTrulyNewUser) {
            const plansModalEl = document.getElementById('plans-modal');
            const plansModal = new bootstrap.Modal(plansModalEl, { backdrop: 'static', keyboard: false });
            populatePlansModal(true);
            plansModal.show();
        } else {
            if (loadDataFromLocalStorage()) {
                runAndRender(false);
                updateSectionTitles();
            }
        }
        
        updateSectionTitles();
    });
})(window.SquirrelPlanApp);