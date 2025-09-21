document.addEventListener('DOMContentLoaded', () => {
    
    let state = { initialBalance: 0, riskPercentage: 0, trades: [], equityCurve: [] };
    
    // --- SELECTORS ---
    const themeToggleBtn = document.getElementById('theme-toggle');
    const initialBalanceEl = document.getElementById('initialBalance');
    const riskPercentageEl = document.getElementById('riskPercentage');
    const startSessionBtn = document.getElementById('startSessionBtn');
    const tradeForm = document.getElementById('tradeForm');
    const tradeDateEl = document.getElementById('tradeDate');
    const dayOfWeekEl = document.getElementById('dayOfWeek');
    const outcomeEl = document.getElementById('outcome');
    const recoveryGroupEl = document.querySelector('.recovery-group');
    const recoveryOutcomeEl = document.getElementById('recoveryOutcome');
    const tradeLogBody = document.querySelector('#tradeLog tbody');
    const totalTradesEl = document.getElementById('totalTrades');
    const winRateEl = document.getElementById('winRate');
    const profitFactorEl = document.getElementById('profitFactor');
    const currentBalanceEl = document.getElementById('currentBalance');
    const maxWinStreakEl = document.getElementById('maxWinStreak');
    const maxLossStreakEl = document.getElementById('maxLossStreak');
    const dailyWinRateContainerEl = document.getElementById('dailyWinRateContainer');
    const saveSessionBtn = document.getElementById('saveSessionBtn');
    const loadSessionInput = document.getElementById('loadSessionInput');
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    const exportPdfBtn = document.getElementById('exportPdfBtn'); // NEW
    const imageModal = document.getElementById('imageModal');
    const modalTradeTitle = document.getElementById('modal-trade-title');
    const modalBeforeImg = document.getElementById('modal-before-img');
    const modalAfterImg = document.getElementById('modal-after-img');
    const closeModalBtn = document.querySelector('#imageModal .close-button');
    const modalTradeDetailsEl = document.getElementById('modal-trade-details');
    const generateReportBtn = document.getElementById('generateReportBtn');
    const entrySection = document.querySelector('.entry-section');
    const editTradeModal = document.getElementById('editTradeModal');
    const closeEditModalBtn = document.querySelector('#editTradeModal .close-button');
    const editTradeForm = document.getElementById('editTradeForm');
    const editTradeIdEl = document.getElementById('editTradeId');
    const editTradeDateEl = document.getElementById('editTradeDate');
    const editDayOfWeekEl = document.getElementById('editDayOfWeek');
    const editTradeTypeEl = document.getElementById('editTradeType');
    const editStopLossPipsEl = document.getElementById('editStopLossPips');
    const editBreakoutPipsEl = document.getElementById('editBreakoutPips');
    const editTradeNotesEl = document.getElementById('editTradeNotes');
    const overallPLPercentageEl = document.getElementById('overallPLPercentage');
    const buyWinRateEl = document.getElementById('buyWinRate');
    const sellWinRateEl = document.getElementById('sellWinRate');


    const ctx = document.getElementById('equityChart').getContext('2d');
    let equityChart = new Chart(ctx, {
        type: 'line',
        data: { labels: [], datasets: [{
            label: 'Equity Curve', data: [], backgroundColor: 'rgba(0, 173, 181, 0.1)',
            borderColor: '#00ADB5', borderWidth: 2, tension: 0.2, pointRadius: 2,
            pointBackgroundColor: '#00ADB5'
        }]},
        options: { scales: { y: { beginAtZero: false, ticks: { callback: (value) => '$' + value.toLocaleString() } } } }
    });
    
    // --- EVENT LISTENERS ---
    themeToggleBtn.addEventListener('click', toggleTheme);
    tradeDateEl.addEventListener('change', () => {
        updateDayOfWeek(tradeDateEl, dayOfWeekEl);
        localStorage.setItem('lastTradeDate', tradeDateEl.value);
    });
    outcomeEl.addEventListener('change', () => { recoveryGroupEl.style.display = outcomeEl.value === 'loss' ? 'flex' : 'none'; });
    startSessionBtn.addEventListener('click', () => {
        if (state.trades.length > 0) {
            if (confirm('Are you sure you want to reset the session? All trade data will be lost.')) {
                initializeSession();
                showToast('Session has been reset.', 'info');
            }
        } else {
            initializeSession();
            showToast('New session started!');
        }
    });
    tradeForm.addEventListener('submit', (e) => { e.preventDefault(); addTrade(); });
    saveSessionBtn.addEventListener('click', saveSession);
    loadSessionInput.addEventListener('change', loadSession);
    exportCsvBtn.addEventListener('click', exportToCSV);
    exportPdfBtn.addEventListener('click', generatePDFReport); // NEW
    generateReportBtn.addEventListener('click', generateVisualReport);
    
    tradeLogBody.addEventListener('click', (e) => {
        const target = e.target;
        const viewRow = target.closest('tr');
        if (!viewRow) return;
        const tradeId = parseInt(viewRow.dataset.tradeId, 10);

        if (target.closest('.action-btn.delete')) {
            handleDeleteTrade(tradeId);
            return;
        }

        if (target.closest('.action-btn.edit')) {
            handleEditTrade(tradeId);
            return;
        }
        
        const trade = state.trades.find(t => t.id === tradeId);
        if (trade && trade.beforeImage && trade.afterImage) {
            modalTradeTitle.textContent = `Trade #${trade.id} - ${trade.date}`;
            modalBeforeImg.src = trade.beforeImage;
            modalAfterImg.src = trade.afterImage;

            const initialBalanceForTrade = trade.id > 1 ? state.equityCurve[trade.id - 2] : state.initialBalance;
            const percentagePL = (trade.plAmount / initialBalanceForTrade) * 100;
            const outcomeClass = trade.plAmount > 0 ? 'outcome-win' : 'outcome-loss';

            modalTradeDetailsEl.innerHTML = `
                <div class="footer-stat">
                    <span class="label">Outcome</span>
                    <span class="value ${outcomeClass}">${trade.finalOutcome} (${percentagePL.toFixed(2)}%)</span>
                </div>
                <div class="footer-stat">
                    <span class="label">Stop Loss</span>
                    <span class="value">${trade.stopLossPips}p</span>
                </div>
                <div class="footer-stat">
                    <span class="label">Breakout</span>
                    <span class="value">${trade.breakoutPips}p</span>
                </div>
            `;
            imageModal.style.display = 'flex';
        }
    });

    closeModalBtn.addEventListener('click', () => { imageModal.style.display = 'none'; });
    window.addEventListener('click', (e) => { if (e.target === imageModal) imageModal.style.display = 'none'; });
    closeEditModalBtn.addEventListener('click', () => { editTradeModal.style.display = 'none'; });
    window.addEventListener('click', (e) => { if (e.target === editTradeModal) editTradeModal.style.display = 'none'; });
    
    editTradeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleSaveChanges();
    });
    editTradeDateEl.addEventListener('change', () => updateDayOfWeek(editTradeDateEl, editDayOfWeekEl));


    entrySection.addEventListener('click', (e) => {
        if (e.target.classList.contains('clear-image-btn')) {
            const previewBox = e.target.closest('.preview-box');
            clearImage(previewBox);
        }
    });

    function initializePreviewBox(box) {
        box.addEventListener('mouseover', () => box.focus());
        box.addEventListener('mouseout', () => box.blur());
        box.addEventListener('click', (e) => { 
            if (e.target.classList.contains('clear-image-btn')) {
                clearImage(box);
                return;
            }
            if (!box.classList.contains('has-image') && (e.target.classList.contains('preview-box') || e.target.tagName === 'SPAN')) {
                document.getElementById(box.dataset.uploadTarget).click();
            }
        });
        box.addEventListener('dragover', (e) => { e.preventDefault(); box.style.borderColor = 'var(--primary-color)'; });
        box.addEventListener('dragleave', () => { box.style.borderColor = 'var(--border-color)'; });
        box.addEventListener('drop', (e) => {
            e.preventDefault(); box.style.borderColor = 'var(--border-color)';
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file, box);
        });
        box.addEventListener('paste', (e) => {
            e.preventDefault();
            const clipboardData = e.clipboardData || window.clipboardData;
            const items = clipboardData.items;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const file = items[i].getAsFile();
                    handleFile(file, box);
                    break;
                }
            }
        });
        const uploadInput = document.getElementById(box.dataset.uploadTarget);
        if (uploadInput) {
            uploadInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) handleFile(file, box);
            });
        }
    }
    
    document.querySelectorAll('.preview-box').forEach(initializePreviewBox);


    // --- FUNCTIONS ---
    function applyTheme(theme) {
        if (theme === 'light') {
            document.body.classList.add('light-mode');
        } else {
            document.body.classList.remove('light-mode');
        }
    }

    function toggleTheme() {
        const currentTheme = document.body.classList.contains('light-mode') ? 'light' : 'dark';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    }

    function loadTheme() {
        const savedTheme = localStorage.getItem('theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (savedTheme) {
            applyTheme(savedTheme);
        } else if (systemPrefersDark) {
            applyTheme('dark');
        } else {
            applyTheme('light');
        }
    }

    function showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.remove();
        }, 4000);
    }

    function loadLastDate() {
        const lastDate = localStorage.getItem('lastTradeDate');
        if (lastDate) {
            tradeDateEl.value = lastDate;
            updateDayOfWeek(tradeDateEl, dayOfWeekEl);
        }
    }
    
    function updateDayOfWeek(dateInput, dayOutput) {
        if (!dateInput.value) {
            dayOutput.value = '';
            return;
        }
        const date = new Date(dateInput.value);
        const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
        dayOutput.value = dayOfWeek;
    }

    function clearImage(previewBox) {
        previewBox.style.backgroundImage = 'none';
        previewBox.classList.remove('has-image');
        delete previewBox.dataset.base64;
        const fileInput = document.getElementById(previewBox.dataset.uploadTarget);
        if(fileInput) fileInput.value = '';
    }

    function handleFile(file, previewBox) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            previewBox.style.backgroundImage = `url(${e.target.result})`;
            previewBox.classList.add('has-image');
            previewBox.dataset.base64 = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    function initializeSession() {
        state.initialBalance = parseFloat(initialBalanceEl.value) || 0;
        state.riskPercentage = parseFloat(riskPercentageEl.value) || 0;
        state.trades = [];
        state.equityCurve = [state.initialBalance];
        updateUI();
    }

    function addTrade() {
        if (state.equityCurve.length === 0) { 
            showToast('Please start a session first.', 'error'); 
            return; 
        }

        const commonDetails = {
            date: tradeDateEl.value,
            day: new Date(tradeDateEl.value).toLocaleString('en-US', { weekday: 'long', timeZone: 'UTC' }),
            type: document.getElementById('tradeType').value, 
            breakoutPips: document.getElementById('breakoutPips').value,
            stopLossPips: document.getElementById('stopLossPips').value,
            notes: document.getElementById('tradeNotes').value,
            beforeImage: document.getElementById('before-preview').dataset.base64 || null,
            afterImage: document.getElementById('after-preview').dataset.base64 || null,
        };

        const initialOutcome = outcomeEl.value;

        if (initialOutcome === 'win') {
            const newTrade = { ...commonDetails, outcome: 'win' };
            state.trades.push(newTrade);
            showToast('Win trade added!');
        } else { 
            const groupId = Date.now();
            
            const firstLeg = { ...commonDetails, outcome: 'loss', isRecoveryAttempt: false, groupId };
            state.trades.push(firstLeg);
            
            const recoveryOutcome = recoveryOutcomeEl.value;
            const recoveryType = firstLeg.type === 'buy' ? 'sell' : 'buy';
            const secondLeg = { ...commonDetails, type: recoveryType, outcome: recoveryOutcome, isRecoveryAttempt: true, groupId };
            state.trades.push(secondLeg);
            showToast('Recovery trade (2 legs) added!');
        }

        recalculateStateAfterChange();
        updateUI();
        
        tradeForm.reset();
        document.querySelectorAll('.preview-box').forEach(box => clearImage(box));
        dayOfWeekEl.value = '';
        recoveryGroupEl.style.display = 'none';
        loadLastDate();
    }

    function updateUI() {
        renderTradeLog();
        calculateMetrics();
        renderDailyWinRates();
        updateChart();
    }
    
    function renderTradeLog() {
        tradeLogBody.innerHTML = '';
        state.trades.forEach(trade => {
            const row = document.createElement('tr');
            row.dataset.tradeId = trade.id;
            const outcomeClass = trade.plAmount > 0 ? 'outcome-win' : 'outcome-loss';
            row.classList.add(outcomeClass);
            if(trade.groupId) {
                row.classList.add('recovery-pair');
            }
            row.innerHTML = `
                <td>${trade.id}</td>
                <td>${trade.date}</td>
                <td>${trade.day}</td>
                <td>${trade.type.charAt(0).toUpperCase() + trade.type.slice(1)}</td>
                <td>${trade.stopLossPips}</td>
                <td>${trade.breakoutPips}</td>
                <td class="${outcomeClass}">${trade.finalOutcome}</td>
                <td class="${outcomeClass}">${trade.plAmount.toFixed(2)}</td>
                <td>${trade.newBalance.toFixed(2)}</td>
                <td>${trade.beforeImage && trade.afterImage ? 'Yes' : 'No'}</td>
                <td>${trade.notes || 'N/A'}</td>
                <td class="actions-cell">
                    <button class="action-btn edit" title="Edit Trade">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.13,5.12L18.88,8.87M3,17.25V21H6.75L17.81,9.94L14.06,6.19L3,17.25Z"></path></svg>
                    </button>
                    <button class="action-btn delete" title="Delete Trade">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"></path></svg>
                    </button>
                </td>
            `;
            tradeLogBody.appendChild(row);
        });
    }

    function handleDeleteTrade(tradeId) {
        const tradeToDelete = state.trades.find(t => t.id === tradeId);
        if (!tradeToDelete) return;

        let tradesToDelete = [tradeToDelete];
        let confirmMessage = `Are you sure you want to delete Trade #${tradeToDelete.id}?`;

        if (tradeToDelete.groupId) {
            tradesToDelete = state.trades.filter(t => t.groupId === tradeToDelete.groupId);
            const tradeIds = tradesToDelete.map(t => `#${t.id}`).join(' & ');
            confirmMessage = `This is a recovery pair. Are you sure you want to delete trades ${tradeIds}?`;
        }

        if (confirm(confirmMessage)) {
            const idsToDelete = tradesToDelete.map(t => t.id);
            state.trades = state.trades.filter(t => !idsToDelete.includes(t.id));
            
            recalculateStateAfterChange();
            updateUI();
            showToast('Trade(s) deleted successfully.', 'info');
        }
    }

    function handleEditTrade(tradeId) {
        const trade = state.trades.find(t => t.id === tradeId);
        if (!trade) return;

        if (trade.groupId) {
            showToast('Editing recovery pairs is not supported. Please delete and re-add.', 'error');
            return;
        }

        editTradeIdEl.value = trade.id;
        editTradeDateEl.value = trade.date;
        editTradeTypeEl.value = trade.type;
        editStopLossPipsEl.value = trade.stopLossPips;
        editBreakoutPipsEl.value = trade.breakoutPips;
        editTradeNotesEl.value = trade.notes;
        
        const beforePreview = document.getElementById('edit-before-preview');
        const afterPreview = document.getElementById('edit-after-preview');
        clearImage(beforePreview);
        clearImage(afterPreview);

        if (trade.beforeImage) {
            beforePreview.style.backgroundImage = `url(${trade.beforeImage})`;
            beforePreview.classList.add('has-image');
            beforePreview.dataset.base64 = trade.beforeImage;
        }
        if (trade.afterImage) {
            afterPreview.style.backgroundImage = `url(${trade.afterImage})`;
            afterPreview.classList.add('has-image');
            afterPreview.dataset.base64 = trade.afterImage;
        }
        
        updateDayOfWeek(editTradeDateEl, editDayOfWeekEl);
        editTradeModal.style.display = 'flex';
    }

    function handleSaveChanges() {
        const tradeId = parseInt(editTradeIdEl.value, 10);
        const trade = state.trades.find(t => t.id === tradeId);
        if (!trade) return;

        trade.date = editTradeDateEl.value;
        trade.day = new Date(trade.date).toLocaleString('en-US', { weekday: 'long', timeZone: 'UTC' });
        trade.type = editTradeTypeEl.value;
        trade.stopLossPips = editStopLossPipsEl.value;
        trade.breakoutPips = editBreakoutPipsEl.value;
        trade.notes = editTradeNotesEl.value;
        trade.beforeImage = document.getElementById('edit-before-preview').dataset.base64 || null;
        trade.afterImage = document.getElementById('edit-after-preview').dataset.base64 || null;
        
        recalculateStateAfterChange();
        updateUI();

        editTradeModal.style.display = 'none';
        showToast('Trade updated successfully!');
    }

    function recalculateStateAfterChange() {
        const newEquityCurve = [state.initialBalance];
        const riskPercent = state.riskPercentage / 100;
        const RRR = 2.0;

        state.trades.forEach((trade, index) => {
            trade.id = index + 1;

            const previousBalance = newEquityCurve[index];
            const riskAmount = state.initialBalance * riskPercent;
            const rewardAmount = riskAmount * RRR;
            
            if (trade.outcome === 'win') {
                trade.plAmount = rewardAmount;
                trade.finalOutcome = trade.isRecoveryAttempt ? 'Recovery Win' : 'Win';
            } else { 
                trade.plAmount = -riskAmount;
                trade.finalOutcome = trade.isRecoveryAttempt ? 'Recovery Loss' : 'Loss';
            }
            
            trade.newBalance = previousBalance + trade.plAmount;
            newEquityCurve.push(trade.newBalance);
        });
        
        state.equityCurve = newEquityCurve;
    }


    function calculateStreaks(trades) {
        let maxWinStreak = 0, maxLossStreak = 0;
        let currentWinStreak = 0, currentLossStreak = 0;
        trades.forEach(trade => {
            if (trade.plAmount > 0) {
                currentWinStreak++;
                currentLossStreak = 0;
            } else {
                currentLossStreak++;
                currentWinStreak = 0;
            }
            if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
            if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
        });
        return { maxWinStreak, maxLossStreak };
    }

    function calculateMetrics() {
        const numTrades = state.trades.length;
        const safeInitialBalance = state.initialBalance || 1;
        
        if (numTrades === 0) {
            totalTradesEl.textContent = '0';
            winRateEl.textContent = 'N/A';
            profitFactorEl.textContent = 'N/A';
            maxWinStreakEl.textContent = 'N/A';
            maxLossStreakEl.textContent = 'N/A';
            currentBalanceEl.textContent = (state.initialBalance || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
            overallPLPercentageEl.textContent = 'N/A';
            overallPLPercentageEl.className = '';
            buyWinRateEl.textContent = 'N/A';
            sellWinRateEl.textContent = 'N/A';
            return;
        }

        let wins = 0; let totalProfit = 0; let totalLoss = 0;
        let buyTrades = 0, buyWins = 0, sellTrades = 0, sellWins = 0;

        state.trades.forEach(trade => {
            if (trade.plAmount > 0) { 
                wins++; 
                totalProfit += trade.plAmount;
            } else { 
                totalLoss += Math.abs(trade.plAmount);
            }
            if (trade.type === 'buy') {
                buyTrades++;
                if(trade.plAmount > 0) buyWins++;
            } else { 
                sellTrades++;
                if(trade.plAmount > 0) sellWins++;
            }
        });
        
        const { maxWinStreak, maxLossStreak } = calculateStreaks(state.trades);
        const currentBalance = state.equityCurve.length > 1 ? state.equityCurve[state.equityCurve.length - 1] : state.initialBalance;
        
        totalTradesEl.textContent = numTrades;
        winRateEl.textContent = `${((wins / numTrades) * 100).toFixed(2)}%`;
        profitFactorEl.textContent = totalLoss !== 0 ? (totalProfit / totalLoss).toFixed(2) : 'Infinity';
        maxWinStreakEl.textContent = maxWinStreak;
        maxLossStreakEl.textContent = maxLossStreak;
        currentBalanceEl.textContent = currentBalance.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
        
        const plPercentage = ((currentBalance - safeInitialBalance) / safeInitialBalance) * 100;
        overallPLPercentageEl.textContent = `${plPercentage.toFixed(2)}%`;
        overallPLPercentageEl.className = plPercentage >= 0 ? 'positive' : 'negative';

        buyWinRateEl.textContent = buyTrades > 0 ? `${((buyWins / buyTrades) * 100).toFixed(1)}%` : 'N/A';
        sellWinRateEl.textContent = sellTrades > 0 ? `${((sellWins / sellTrades) * 100).toFixed(1)}%` : 'N/A';
    }


    function renderDailyWinRates() {
        dailyWinRateContainerEl.innerHTML = '';
        const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const dailyStats = daysOfWeek.reduce((acc, day) => ({ ...acc, [day]: { wins: 0, total: 0 } }), {});
        state.trades.forEach(trade => {
            if (dailyStats[trade.day]) { 
                dailyStats[trade.day].total++; 
                if (trade.plAmount > 0) dailyStats[trade.day].wins++; 
            }
        });
        daysOfWeek.forEach(day => {
            const stats = dailyStats[day];
            const winRate = stats.total > 0 ? (stats.wins / stats.total) * 100 : 0;
            const rateColor = winRate >= 50 ? 'var(--green)' : 'var(--red)';
            const dayEl = document.createElement('div');
            dayEl.classList.add('day-stat');
            dayEl.innerHTML = `<div class="day-name">${day}</div><div class="day-rate" style="color: ${stats.total > 0 ? rateColor : 'var(--text-secondary-color)'}">${stats.total > 0 ? winRate.toFixed(1) + '%' : 'N/A'}</div><div class="day-count" style="font-size: 0.8em; color: var(--text-secondary-color);">${stats.wins}/${stats.total}</div>`;
            dailyWinRateContainerEl.appendChild(dayEl);
        });
    }

    function updateChart() {
        const equityData = state.equityCurve;
        const chart = Chart.getChart(ctx);
        if (chart) {
            chart.data.labels = Array.from({ length: equityData.length }, (_, i) => i);
            chart.data.datasets[0].data = equityData;
            chart.update();
        }
    }

    function saveSession() {
        if(state.trades.length === 0) { showToast("No trades to save.", 'error'); return; }
        const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `level2-journal-session-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
        showToast("Session saved successfully!");
    }
    
    function loadSession(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const loadedState = JSON.parse(e.target.result);
                
                if (loadedState.trades.length > 0 && loadedState.trades[0].hasOwnProperty('initialOutcome')) {
                    const migratedTrades = [];
                    loadedState.trades.forEach(trade => {
                        const commonDetails = { ...trade };
                        delete commonDetails.initialOutcome;
                        delete commonDetails.recoveryOutcome;
                        delete commonDetails.finalOutcome;
                        delete commonDetails.plAmount;
                        delete commonDetails.newBalance;
                        const groupId = Date.now() + Math.random();

                        if (trade.finalOutcome === 'Recovery Win') {
                            migratedTrades.push({ ...commonDetails, outcome: 'loss', isRecoveryAttempt: false, groupId });
                            const recoveryType = commonDetails.type === 'buy' ? 'sell' : 'buy';
                            migratedTrades.push({ ...commonDetails, type: recoveryType, outcome: 'win', isRecoveryAttempt: true, groupId });
                        } else if (trade.finalOutcome === 'Recovery Loss' || trade.finalOutcome === 'Loss') {
                             migratedTrades.push({ ...commonDetails, outcome: 'loss', isRecoveryAttempt: false, groupId });
                             const recoveryType = commonDetails.type === 'buy' ? 'sell' : 'buy';
                             migratedTrades.push({ ...commonDetails, type: recoveryType, outcome: 'loss', isRecoveryAttempt: true, groupId });
                        } else {
                            migratedTrades.push({ ...commonDetails, outcome: trade.initialOutcome });
                        }
                    });
                    state.trades = migratedTrades;
                    showToast('Old session file converted to new format.', 'info');
                } else {
                    state.trades = loadedState.trades;
                }
                
                state.initialBalance = loadedState.initialBalance;
                state.riskPercentage = loadedState.riskPercentage;

                initialBalanceEl.value = state.initialBalance;
                riskPercentageEl.value = state.riskPercentage;
                
                recalculateStateAfterChange();
                updateUI();
                showToast('Session loaded successfully!');
            } catch (error) { 
                console.error("Failed to load session:", error);
                showToast('Failed to load session file. It may be corrupted.', 'error'); 
            }
        };
        reader.readAsText(file);
    }
    
    function exportToCSV() {
        if(state.trades.length === 0) { showToast("No trades to export.", 'error'); return; }
        const headers = ["ID", "Date", "Day", "Type", "Stop Loss", "Breakout (pips)", "Outcome", "P/L ($)", "New Balance", "Notes"];
        let csvContent = headers.join(",") + "\r\n";
        state.trades.forEach(trade => {
            const row = [trade.id, trade.date, trade.day, trade.type, trade.stopLossPips, trade.breakoutPips, trade.finalOutcome, trade.plAmount.toFixed(2), trade.newBalance.toFixed(2), `"${(trade.notes || '').replace(/"/g, '""')}"`];
            csvContent += row.join(",") + "\r\n";
        });
        const link = document.createElement("a");
        link.setAttribute("href", 'data:text/csv;charset=utf-8,' + encodeURI(csvContent));
        link.setAttribute("download", `level2-journal-export-${new Date().toISOString().slice(0, 10)}.csv`);
        link.click();
    }

    // NEW: Function to generate the comprehensive PDF report
    async function generatePDFReport() {
        if (state.trades.length === 0) {
            showToast("No trades to generate a report for.", 'error');
            return;
        }

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const reportContainer = document.getElementById('pdf-report-container');
        const isLightMode = document.body.classList.contains('light-mode');
        
        // Temporarily switch to light mode for better printing contrast
        if (!isLightMode) {
            document.body.classList.add('light-mode');
        }

        showToast('Generating PDF Report... Please wait.', 'info');

        // 1. Create the HTML content for the report
        let reportHTML = `
            <div class="pdf-page">
                <h1>Backtesting Report</h1>
                <p class="report-date">Generated on: ${new Date().toLocaleDateString()}</p>
                
                <h2>Performance Summary</h2>
                <div class="pdf-metrics">
                    ${document.getElementById('metrics').innerHTML}
                </div>
                
                <h2>Equity Curve</h2>
                <img src="${equityChart.toBase64Image()}" class="equity-chart-img" />

                <h2>Trade Log</h2>
            </div>
        `;

        state.trades.forEach(trade => {
            reportHTML += `
            <div class="pdf-page trade-card-pdf">
                 <h3>Trade #${trade.id} - ${trade.date}</h3>
                 <div class="trade-details-pdf">
                    <p><strong>Type:</strong> ${trade.type}</p>
                    <p><strong>Outcome:</strong> ${trade.finalOutcome}</p>
                    <p><strong>P/L:</strong> $${trade.plAmount.toFixed(2)}</p>
                 </div>
                 <div class="image-gallery-pdf">
                    ${trade.beforeImage ? `<div><h4>Before</h4><img src="${trade.beforeImage}"/></div>` : ''}
                    ${trade.afterImage ? `<div><h4>After</h4><img src="${trade.afterImage}"/></div>` : ''}
                 </div>
                 <p class="notes-pdf"><strong>Notes:</strong> ${trade.notes || 'N/A'}</p>
            </div>
            `;
        });
        
        reportContainer.innerHTML = reportHTML;
        reportContainer.style.display = 'block';

        // 2. Use html2canvas to render the HTML content
        const canvas = await html2canvas(reportContainer, { 
            scale: 2,
            useCORS: true,
            backgroundColor: isLightMode ? '#f0f2f5' : '#ffffff' // Ensure background is not transparent
        });

        // 3. Add the rendered content as an image to the PDF
        const imgData = canvas.toDataURL('image/png');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        let heightLeft = pdfHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();

        while (heightLeft >= 0) {
            position = heightLeft - pdfHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
            heightLeft -= pdf.internal.pageSize.getHeight();
        }

        // 4. Save the PDF
        pdf.save(`level2-journal-report-${new Date().toISOString().slice(0, 10)}.pdf`);
        
        // Cleanup
        reportContainer.style.display = 'none';
        reportContainer.innerHTML = '';
        if (!isLightMode) {
            document.body.classList.remove('light-mode');
        }
        showToast('PDF report generated successfully!');
    }


    function generateVisualReport() {
        if (state.trades.length === 0) { showToast("No trades to generate a report for.", 'error'); return; }

        let reportHTML = `
        <!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Level 2 Journal - Visual Report</title>
        <style>
            :root { --bg-color: #222831; --surface-color: #393E46; --text-color: #EEEEEE; --green: #28a745; --red: #dc3545; --border-color: #4a5058; }
            body { font-family: sans-serif; background-color: var(--bg-color); color: var(--text-color); padding: 20px; margin: 0; }
            .report-header { text-align: center; border-bottom: 2px solid var(--surface-color); padding-bottom: 10px; margin-bottom: 20px; }
            .layout-toggle { display: flex; justify-content: center; align-items: center; gap: 10px; margin-bottom: 40px; font-size: 0.9rem; }
            .switch { position: relative; display: inline-block; width: 50px; height: 28px; }
            .switch input { opacity: 0; width: 0; height: 0; }
            .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #5b6370; transition: .4s; border-radius: 28px; }
            .slider:before { position: absolute; content: ""; height: 20px; width: 20px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; }
            input:checked + .slider { background-color: #00ADB5; }
            input:checked + .slider:before { transform: translateX(22px); }
            .trade-card { background-color: var(--surface-color); border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 30px; padding: 20px; }
            .trade-header { margin-bottom: 20px; }
            .trade-header h2 { margin: 0; font-size: 1.5rem; }
            .trade-details { display: flex; align-items: center; gap: 20px; }
            .trade-details .pips-info { font-size: 0.9rem; color: #b0b0b0; background-color: #222831; padding: 5px 10px; border-radius: 4px; white-space: nowrap; }
            .trade-details .outcome { font-size: 1.2rem; font-weight: bold; }
            .outcome-win { color: var(--green); }
            .outcome-loss { color: var(--red); }
            .image-gallery { display: flex; flex-direction: column; gap: 20px; }
            .horizontal-layout .image-gallery { flex-direction: row; }
            .horizontal-layout .image-container { flex: 1; }
            .image-container { text-align: center; }
            .image-container img { max-width: 100%; border-radius: 4px; border: 1px solid var(--border-color); cursor: pointer; transition: transform 0.2s; }
            .image-container img:hover { transform: scale(1.01); }
            .image-container h3 { margin: 0; color: #b0b0b0; }
            .image-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; min-height: 38px; }
            .image-header.before-header { justify-content: flex-start; }
            #lightbox { display: none; position: fixed; z-index: 1000; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.9); justify-content: center; align-items: center; }
            #lightbox.active { display: flex; }
            #lightbox img { max-width: 90%; max-height: 85%; }
            .lightbox-close, .lightbox-next, .lightbox-prev { position: absolute; color: white; font-size: 2.2rem; font-weight: bold; cursor: pointer; user-select: none; transition: color 0.2s; }
            .lightbox-close:hover, .lightbox-next:hover, .lightbox-prev:hover { color: #00ADB5; }
            .lightbox-close { top: 15px; right: 25px; }
            .lightbox-next { top: 50%; transform: translateY(-50%); right: 25px; }
            .lightbox-prev { top: 50%; transform: translateY(-50%); left: 25px; }
        </style>
        </head><body>
            <div class="report-header"><h1>Visual Trade Report</h1></div>
            <div class="layout-toggle">
                <span>Vertical</span>
                <label class="switch">
                    <input type="checkbox" id="layout-switch">
                    <span class="slider"></span>
                </label>
                <span>Horizontal</span>
            </div>
        `;

        state.trades.forEach(trade => {
            const outcomeClass = trade.plAmount > 0 ? 'outcome-win' : 'outcome-loss';
            const initialBalanceForTrade = trade.id > 1 ? state.equityCurve[trade.id - 2] : state.initialBalance;
            const percentagePL = (trade.plAmount / initialBalanceForTrade) * 100;

            reportHTML += `
            <div class="trade-card">
                <div class="trade-header">
                    <h2>Trade #${trade.id} (${trade.date})</h2>
                </div>
                <div class="image-gallery">
                    <div class="image-container">
                        <div class="image-header before-header">
                           <h3>Before</h3>
                        </div>
                        <img src="${trade.beforeImage || ''}" alt="Before Chart" class="lightbox-image">
                    </div>
                    <div class="image-container">
                        <div class="image-header">
                            <h3>After</h3>
                            <div class="trade-details">
                                <span class="pips-info">SL: ${trade.stopLossPips}p | Breakout: ${trade.breakoutPips}p</span>
                                <span class="outcome ${outcomeClass}">${trade.finalOutcome} (${percentagePL.toFixed(2)}%)</span>
                            </div>
                        </div>
                        <img src="${trade.afterImage || ''}" alt="After Chart" class="lightbox-image">
                    </div>
                </div>
            </div>`;
        });
        
        reportHTML += `
            <div id="lightbox">
                <span class="lightbox-close">&times;</span>
                <span id="lightbox-prev" class="lightbox-prev">&#10094;</span>
                <span id="lightbox-next" class="lightbox-next">&#10095;</span>
                <img id="lightbox-content" src="">
            </div>
            <script>
                const lightbox = document.getElementById('lightbox');
                const lightboxContent = document.getElementById('lightbox-content');
                const prevButton = document.getElementById('lightbox-prev');
                const nextButton = document.getElementById('lightbox-next');
                const closeButton = document.querySelector('.lightbox-close');
                const images = document.querySelectorAll('.lightbox-image');
                let currentIndex = 0;

                function showImage(index) {
                    if (index < 0 || index >= images.length) return;
                    currentIndex = index;
                    lightboxContent.src = images[currentIndex].src;
                    lightbox.classList.add('active');
                    prevButton.style.display = (currentIndex === 0) ? 'none' : 'block';
                    nextButton.style.display = (currentIndex === images.length - 1) ? 'none' : 'block';
                }

                images.forEach((img, index) => img.addEventListener('click', () => showImage(index)));
                closeButton.addEventListener('click', () => lightbox.classList.remove('active'));
                prevButton.addEventListener('click', () => showImage(currentIndex - 1));
                nextButton.addEventListener('click', () => showImage(currentIndex + 1));
                
                document.addEventListener('keydown', e => {
                    if (!lightbox.classList.contains('active')) return;
                    if (e.key === 'ArrowRight') showImage(currentIndex + 1);
                    if (e.key === 'ArrowLeft') showImage(currentIndex - 1);
                    if (e.key === 'Escape') lightbox.classList.remove('active');
                });

                const layoutSwitch = document.getElementById('layout-switch');
                const savedLayout = localStorage.getItem('reportLayout');
                if (savedLayout === 'horizontal') {
                    document.body.classList.add('horizontal-layout');
                    layoutSwitch.checked = true;
                }
                layoutSwitch.addEventListener('change', () => {
                    if (layoutSwitch.checked) {
                        document.body.classList.add('horizontal-layout');
                        localStorage.setItem('reportLayout', 'horizontal');
                    } else {
                        document.body.classList.remove('horizontal-layout');
                        localStorage.setItem('reportLayout', 'vertical');
                    }
                });
            <\/script>
        </body></html>`;

        const reportWindow = window.open();
        reportWindow.document.write(reportHTML);
        reportWindow.document.close();
    }
    
    // --- INITIALIZATION ---
    loadTheme();
    loadLastDate();
    initializeSession();
});