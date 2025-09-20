document.addEventListener('DOMContentLoaded', () => {
    
    let state = { initialBalance: 0, riskPercentage: 0, trades: [], equityCurve: [] };
    
    // --- SELECTORS ---
    const initialBalanceEl = document.getElementById('initialBalance');
    const riskPercentageEl = document.getElementById('riskPercentage');
    const startSessionBtn = document.getElementById('startSessionBtn');
    const tradeForm = document.getElementById('tradeForm');
    const tradeDateEl = document.getElementById('tradeDate');
    const dayOfWeekEl = document.getElementById('dayOfWeek');
    const outcomeEl = document.getElementById('outcome');
    const recoveryGroupEl = document.querySelector('.recovery-group');
    const tradeLogBody = document.querySelector('#tradeLog tbody');
    const totalTradesEl = document.getElementById('totalTrades');
    const winRateEl = document.getElementById('winRate');
    const profitFactorEl = document.getElementById('profitFactor');
    const currentBalanceEl = document.getElementById('currentBalance');
    const dailyWinRateContainerEl = document.getElementById('dailyWinRateContainer');
    const saveSessionBtn = document.getElementById('saveSessionBtn');
    const loadSessionInput = document.getElementById('loadSessionInput');
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    const imageModal = document.getElementById('imageModal');
    const modalTradeTitle = document.getElementById('modal-trade-title');
    const modalBeforeImg = document.getElementById('modal-before-img');
    const modalAfterImg = document.getElementById('modal-after-img');
    const closeModalBtn = document.querySelector('.close-button');
    const generateReportBtn = document.getElementById('generateReportBtn');
    const entrySection = document.querySelector('.entry-section');

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
    tradeDateEl.addEventListener('change', updateDayOfWeek);
    outcomeEl.addEventListener('change', () => { recoveryGroupEl.style.display = outcomeEl.value === 'loss' ? 'block' : 'none'; });
    startSessionBtn.addEventListener('click', () => {
        if (state.trades.length > 0) {
            if (confirm('Are you sure you want to reset the session? All trade data will be lost.')) {
                initializeSession();
                alert('Session has been reset.');
            }
        } else {
            initializeSession();
            alert('New session started!');
        }
    });
    tradeForm.addEventListener('submit', (e) => { e.preventDefault(); addTrade(); });
    saveSessionBtn.addEventListener('click', saveSession);
    loadSessionInput.addEventListener('change', loadSession);
    exportCsvBtn.addEventListener('click', exportToCSV);
    generateReportBtn.addEventListener('click', generateVisualReport);
    tradeLogBody.addEventListener('click', (e) => {
        const row = e.target.closest('tr');
        if (!row) return;
        const tradeId = parseInt(row.dataset.tradeId, 10);
        const trade = state.trades.find(t => t.id === tradeId);
        if (trade && trade.beforeImage && trade.afterImage) {
            modalTradeTitle.textContent = `Trade #${trade.id} - ${trade.date}`;
            modalBeforeImg.src = trade.beforeImage;
            modalAfterImg.src = trade.afterImage;
            imageModal.style.display = 'flex';
        }
    });
    closeModalBtn.addEventListener('click', () => { imageModal.style.display = 'none'; });
    window.addEventListener('click', (e) => { if (e.target === imageModal) imageModal.style.display = 'none'; });

    entrySection.addEventListener('click', (e) => {
        if (e.target.classList.contains('clear-image-btn')) {
            const previewBox = e.target.closest('.preview-box');
            clearImage(previewBox);
        }
    });

    document.querySelectorAll('.preview-box').forEach(box => {
        box.addEventListener('click', (e) => { 
            if (e.target.classList.contains('preview-box') || e.target.tagName === 'SPAN') {
                document.getElementById(box.dataset.uploadTarget).click();
            }
        });
        box.addEventListener('mouseover', () => box.focus());
        box.addEventListener('mouseout', () => box.blur());
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
    });

    document.querySelectorAll('.image-upload').forEach(input => {
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            const previewBox = document.querySelector(`[data-upload-target="${e.target.id}"]`);
            if (file && previewBox) handleFile(file, previewBox);
        });
    });

    // --- FUNCTIONS ---
    function updateDayOfWeek() {
        if (!tradeDateEl.value) {
            dayOfWeekEl.value = '';
            return;
        }
        const date = new Date(tradeDateEl.value);
        const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
        dayOfWeekEl.value = dayOfWeek;
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
        if (state.equityCurve.length === 0) { alert('Please start a session first.'); return; }
        const currentBalance = state.equityCurve[state.equityCurve.length - 1];
        const trade = {
            id: state.trades.length + 1, date: document.getElementById('tradeDate').value,
            day: new Date(document.getElementById('tradeDate').value).toLocaleString('en-US', { weekday: 'long', timeZone: 'UTC' }),
            type: document.getElementById('tradeType').value, penetrationPips: document.getElementById('penetrationPips').value,
            stopLossPips: document.getElementById('stopLossPips').value, initialOutcome: document.getElementById('outcome').value,
            recoveryOutcome: document.getElementById('recoveryOutcome').value, notes: document.getElementById('tradeNotes').value,
            beforeImage: document.getElementById('before-preview').dataset.base64 || null,
            afterImage: document.getElementById('after-preview').dataset.base64 || null
        };
        
        const RRR = 2.0;
        const riskAmount = currentBalance * (state.riskPercentage / 100);
        const rewardAmount = riskAmount * RRR;
        let totalPL = 0;

        if (trade.initialOutcome === 'win') {
            totalPL = rewardAmount; trade.finalOutcome = 'Win';
        } else {
            totalPL = -riskAmount;
            if (document.getElementById('outcome').value === 'loss' && trade.recoveryOutcome === 'win') {
                totalPL += rewardAmount; trade.finalOutcome = 'Recovery Win';
            } else {
                totalPL -= riskAmount; trade.finalOutcome = 'Recovery Loss';
            }
        }
        
        trade.plAmount = totalPL;
        trade.newBalance = currentBalance + totalPL;
        state.trades.push(trade);
        state.equityCurve.push(trade.newBalance);
        
        updateUI();
        tradeForm.reset();
        document.querySelectorAll('.preview-box').forEach(box => clearImage(box));
        dayOfWeekEl.value = '';
        document.querySelector('.recovery-group').style.display = 'none';
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
            row.innerHTML = `
                <td>${trade.id}</td><td>${trade.date}</td><td>${trade.day}</td>
                <td>${trade.type.charAt(0).toUpperCase() + trade.type.slice(1)}</td><td>${trade.penetrationPips}</td>
                <td class="${outcomeClass}">${trade.finalOutcome}</td><td class="${outcomeClass}">${trade.plAmount.toFixed(2)}</td>
                <td>${trade.newBalance.toFixed(2)}</td>
                <td>${trade.beforeImage && trade.afterImage ? 'Yes' : 'No'}</td><td>${trade.notes || 'N/A'}</td>`;
            tradeLogBody.appendChild(row);
        });
    }

    function calculateMetrics() {
        const numTrades = state.trades.length;
        const safeInitialBalance = state.initialBalance || 0;
        
        if (numTrades === 0) {
            totalTradesEl.textContent = '0';
            winRateEl.textContent = 'N/A';
            profitFactorEl.textContent = 'N/A';
            currentBalanceEl.textContent = safeInitialBalance.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
            return;
        }

        let wins = 0; let totalProfit = 0; let totalLoss = 0;
        state.trades.forEach(trade => {
            if (trade.plAmount > 0) { wins++; totalProfit += trade.plAmount; } 
            else { totalLoss += trade.plAmount; }
        });
        
        totalTradesEl.textContent = numTrades;
        winRateEl.textContent = `${((wins / numTrades) * 100).toFixed(2)}%`;
        profitFactorEl.textContent = totalLoss !== 0 ? Math.abs(totalProfit / totalLoss).toFixed(2) : 'Infinity';
        currentBalanceEl.textContent = state.equityCurve[state.equityCurve.length - 1].toLocaleString('en-US', { style: 'currency', currency: 'USD' });
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
        if(state.trades.length === 0) { alert("No trades to save."); return; }
        const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `level2-journal-session-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
    }
    
    function loadSession(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                state = JSON.parse(e.target.result);
                initialBalanceEl.value = state.initialBalance;
                riskPercentageEl.value = state.riskPercentage;
                updateUI();
                alert('Session loaded successfully!');
            } catch (error) { alert('Failed to load session file. It may be corrupted.'); }
        };
        reader.readAsText(file);
    }
    
    function exportToCSV() {
        if(state.trades.length === 0) { alert("No trades to export."); return; }
        const headers = ["ID", "Date", "Day", "Type", "Breakout (pips)", "Outcome", "P/L ($)", "New Balance", "Notes"];
        let csvContent = headers.join(",") + "\r\n";
        state.trades.forEach(trade => {
            const row = [trade.id, trade.date, trade.day, trade.type, trade.penetrationPips, trade.finalOutcome, trade.plAmount.toFixed(2), trade.newBalance.toFixed(2), `"${(trade.notes || '').replace(/"/g, '""')}"`];
            csvContent += row.join(",") + "\r\n";
        });
        const link = document.createElement("a");
        link.setAttribute("href", 'data:text/csv;charset=utf-8,' + encodeURI(csvContent));
        link.setAttribute("download", `level2-journal-export-${new Date().toISOString().slice(0, 10)}.csv`);
        link.click();
    }

    function generateVisualReport() {
        if (state.trades.length === 0) { alert("No trades to generate a report for."); return; }
        let reportHTML = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Level 2 Journal - Visual Report</title><style>body{font-family:sans-serif;background-color:#222831;color:#EEEEEE;padding:20px}h1{text-align:center;border-bottom:2px solid #393E46;padding-bottom:10px;margin-bottom:40px}.trade-card{background-color:#393E46;border:1px solid #4a5058;border-radius:8px;margin-bottom:30px;padding:20px}.trade-header{display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px}.trade-header h2{margin:0;font-size:1.5rem}.trade-header .outcome{text-align:right}.trade-header .outcome-result{font-size:1.5rem;font-weight:bold}.trade-header .outcome-details{font-size:.9rem;color:#b0b0b0;margin-top:5px}.outcome-win{color:#28a745}.outcome-loss{color:#dc3545}.image-gallery{display:flex;gap:20px;margin-top:15px}.image-container{flex:1;text-align:center}.image-container img{max-width:100%;border-radius:4px;border:1px solid #4a5058;cursor:pointer;transition:transform .2s}.image-container img:hover{transform:scale(1.02)}.image-container h3{margin-bottom:10px;color:#b0b0b0;font-weight:400}.lightbox{display:none;position:fixed;z-index:1000;left:0;top:0;width:100%;height:100%;background-color:rgba(0,0,0,.9);justify-content:center;align-items:center}.lightbox img{max-width:90%;max-height:90%}.lightbox-close{position:absolute;top:20px;right:35px;color:#fff;font-size:40px;font-weight:bold;cursor:pointer}@media (max-width:800px){.image-gallery{flex-direction:column}.trade-header{flex-direction:column;align-items:stretch}.trade-header .outcome{text-align:left;margin-top:10px}}</style></head><body><h1>Visual Trade Report</h1>`;
        state.trades.forEach(trade => {
            const outcomeClass = trade.plAmount > 0 ? 'outcome-win' : 'outcome-loss';
            const initialBalanceForTrade = trade.id === 1 ? state.initialBalance : state.trades[trade.id - 2].newBalance;
            const percentagePL = (trade.plAmount / initialBalanceForTrade * 100).toFixed(2);

            reportHTML += `<div class="trade-card"><div class="trade-header"><h2>Trade #${trade.id} (${trade.date})</h2><div class="outcome"><div class="outcome-result ${outcomeClass}">${trade.finalOutcome} (${percentagePL}%)</div><div class="outcome-details">SL: ${trade.stopLossPips} pips / Breakout: ${trade.penetrationPips} pips</div></div></div><div class="image-gallery"><div class="image-container"><h3>Before</h3><img src="${trade.beforeImage||''}" alt="Before Chart" class="report-image"></div><div class="image-container"><h3>After</h3><img src="${trade.afterImage||''}" alt="After Chart" class="report-image"></div></div></div>`;
        });
        reportHTML += `<div id="lightbox" class="lightbox"><span class="lightbox-close">&times;</span><img id="lightbox-image" src=""></div><script>const lightbox=document.getElementById("lightbox"),lightboxImage=document.getElementById("lightbox-image"),closeBtn=document.querySelector(".lightbox-close");document.querySelectorAll(".report-image").forEach(e=>{e.addEventListener("click",()=>{lightbox.style.display="flex",lightboxImage.src=e.src})});function closeLightbox(){lightbox.style.display="none"}closeBtn.addEventListener("click",closeLightbox),lightbox.addEventListener("click",e=>{e.target===lightbox&&closeLightbox()});<\/script></body></html>`;

        const reportWindow = window.open();
        reportWindow.document.write(reportHTML);
        reportWindow.document.close();
    }
    
    initializeSession();
});