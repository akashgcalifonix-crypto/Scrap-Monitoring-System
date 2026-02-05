function processAndRender() {
    if(document.getElementById('category-analysis-section').style.display !== 'none') {
        if(typeof renderCategoryAnalysis === 'function') renderCategoryAnalysis();
    }
    
    const dFrom = document.getElementById('dateFrom').value;
    const dTo = document.getElementById('dateTo').value;
    const defectFilter = document.getElementById('filterDefect').value;
    let lineDominantCategory = {}; 
    if(rawData.scrap.length > 0) {
        rawData.scrap.slice(1).forEach(row => {
            let ln = normalizeLine(row[4]); 
            let floorVal = row[5]; 
            let cat = getProductCategory(floorVal, ln); 
            if(cat !== 'OTHER') lineDominantCategory[ln] = cat; 
        });
    }
    let prodMap = {}; 
    let lineProdQtyMap = {}; 
    let totalProdQty=0, totalProdVal=0;
    aggregatedModelData = {};

    if(rawData.production.length > 0) {
        rawData.production.slice(1).forEach(row => {
            let rDate = normalizeDate(row[0]);
            if (!rDate || rDate < dFrom || rDate > dTo) return;
            let ln = normalizeLine(row[3]); 
            let model = (row[2] || "").toString().trim().toUpperCase(); 
            let rawOut = parseFloat(row[4]) || 0; 
            let productCol = (row[1] || "").toString().toUpperCase(); 
            let val = rawOut * (modelPrices[model]||0); 
            let cat = "OTHER";
            if(productCol !== "") cat = getProductCategory(productCol, "");
            else {
                cat = getProductCategory(model, ln);
                if(cat === 'OTHER' && lineDominantCategory[ln]) cat = lineDominantCategory[ln];
            }
            if(!prodMap[ln]) prodMap[ln] = 0;
            prodMap[ln] += val; 
            if(productCol.includes("EARBUDS") && productCol.includes("CHARGING")) {
                let keyE = ln + "|EARBUDS"; if(!lineProdQtyMap[keyE]) lineProdQtyMap[keyE] = 0; lineProdQtyMap[keyE] += rawOut;
                let keyC = ln + "|CHARGING CASE"; if(!lineProdQtyMap[keyC]) lineProdQtyMap[keyC] = 0; lineProdQtyMap[keyC] += rawOut;
            } else {
                let key = ln + "|" + cat; if(!lineProdQtyMap[key]) lineProdQtyMap[key] = 0; lineProdQtyMap[key] += rawOut;
            }
            totalProdQty += rawOut;
            totalProdVal += val;
        });
    }

    let lineStats = {}; 
    let lineCompStats = {}; 
    let overallStats = { proc:0, rmd:0, tot:0 };
    let productStats = { 'EARBUDS': { val: 0, proc: 0, rmd: 0 }, 'CHARGING CASE': { val: 0, proc: 0, rmd: 0 }, 'SMART WATCH': { val: 0, proc: 0, rmd: 0 }, 'HEADPHONE': { val: 0, proc: 0, rmd: 0 }, 'DASHCAM': { val: 0, proc: 0, rmd: 0 }, 'OTHER': { val: 0, proc: 0, rmd: 0 } };

    if(rawData.scrap.length > 0) {
        rawData.scrap.slice(1).forEach(row => {
            let rDate = normalizeDate(row[0]);
            if (!rDate || rDate < dFrom || rDate > dTo) return;
            let ln = normalizeLine(row[4]); 
            let floorVal = row[5]; 
            let model = (row[8] || "").toString().trim().toUpperCase(); 
            let prodName = getProductCategory(floorVal, ln);
            if(!productStats[prodName]) prodName = 'OTHER';
            let typeVal = (row[9]||"").toString().toUpperCase(); 
            let rejTypeVal = (row[10] || "").toString().toUpperCase(); 
            let fullType = typeVal + " " + rejTypeVal; 
            if(defectFilter !== 'ALL' && !typeVal.includes(defectFilter)) return;
            let q = parseFloat(row[12])||0; 
            let val = q * (parseFloat(row[11])||0); 
            let storeVal = String(row[1] || "").toUpperCase(); 
            let isProc = storeVal.includes('6003') || storeVal.includes('PROCESS') || rejTypeVal.includes('PROCESS');
            let isRMD = storeVal.includes('6002') || storeVal.includes('RMD') || rejTypeVal.includes('RMD');
            let key = ln + "_" + prodName; 
            if(!lineStats[key]) lineStats[key] = { ln: ln, cat: prodName, proc:0, rmd:0, total:0 };
            if(isProc) { lineStats[key].proc += val; overallStats.proc += val; productStats[prodName].proc += val; } 
            else if(isRMD) { lineStats[key].rmd += val; overallStats.rmd += val; productStats[prodName].rmd += val; }
            lineStats[key].total += val;
            overallStats.tot += val;
            let compKey = ln + "|" + prodName;
            if(!lineCompStats[compKey]) lineCompStats[compKey] = { ln: ln, cat: prodName, raw: { pcba_proc:0, pcba_rmd:0, spkr_proc:0, spkr_rmd:0, batt_proc:0, batt_rmd:0 } };
            let compType = "";
            if(fullType.includes("PCBA") || fullType.includes("MAIN BOARD") || fullType.includes("PCB")) compType = "pcba";
            else if(fullType.includes("BATTERY") || fullType.includes("CELL") || fullType.includes("BATT")) compType = "batt";
            else if(fullType.includes("SPEAKER") || fullType.includes("DRIVER") || fullType.includes("SPK")) compType = "spkr";
            if(compType) {
                if(isProc) lineCompStats[compKey].raw[compType + "_proc"] += q;
                else if(isRMD) lineCompStats[compKey].raw[compType + "_rmd"] += q;
            }
        });
    }

    document.getElementById('ovr-qty').innerText = totalProdQty.toLocaleString();
    document.getElementById('ovr-val').innerText = formatCurrency(totalProdVal);
    document.getElementById('ovr-proc-val').innerText = formatCurrency(overallStats.proc);
    document.getElementById('ovr-rmd-val').innerText = formatCurrency(overallStats.rmd);
    document.getElementById('ovr-tot-val').innerText = formatCurrency(overallStats.tot);
    document.getElementById('ovr-proc-rate').innerText = totalProdVal>0?((overallStats.proc/totalProdVal)*100).toFixed(2)+"%":"0%";
    document.getElementById('ovr-rmd-rate').innerText = totalProdVal>0?((overallStats.rmd/totalProdVal)*100).toFixed(2)+"%":"0%";
    document.getElementById('ovr-all-rate').innerText = totalProdVal>0?((overallStats.tot/totalProdVal)*100).toFixed(2)+"%":"0%";

    Object.keys(prodMap).forEach(ln => {
        let val = prodMap[ln];
        let potentialCats = [];
        Object.values(lineStats).forEach(s => { if(s.ln === ln && !potentialCats.includes(s.cat)) potentialCats.push(s.cat); });
        if(potentialCats.length === 0) { let guessed = getProductCategory('', ln); potentialCats.push(guessed !== 'OTHER' ? guessed : 'EARBUDS'); }
        potentialCats.forEach(cat => {
            if(productStats[cat]) productStats[cat].val += val;
            let key = ln + "_" + cat;
            if(!lineStats[key]) lineStats[key] = { ln: ln, cat: cat, proc:0, rmd:0, total:0 };
            if(!lineStats[key].prodVal) lineStats[key].prodVal = 0;
            lineStats[key].prodVal += val;
        });
    });

    const prodContainer = document.getElementById('productSummaryContainer');
    prodContainer.innerHTML = "";
    const productsToCheck = ['EARBUDS', 'CHARGING CASE', 'SMART WATCH', 'HEADPHONE', 'DASHCAM'];
    const prodColors = { 'EARBUDS': '#0d6efd', 'CHARGING CASE': '#dc3545', 'SMART WATCH': '#198754', 'HEADPHONE': '#6610f2', 'DASHCAM': '#212529', 'OTHER': '#6c757d' };
    productsToCheck.forEach(cat => {
        let s = productStats[cat];
        if(s.val > 0 || s.proc > 0 || s.rmd > 0) {
            let pRate = s.val > 0 ? (s.proc/s.val)*100 : 0;
            let rRate = s.val > 0 ? (s.rmd/s.val)*100 : 0;
            let card = `<div class="prod-summary-card"><div class="prod-header" style="background:${prodColors[cat]}">${cat}</div>
            <div class="prod-body"><div class="prod-stat border-end"><div class="prod-stat-val text-dark">${formatCurrency(s.proc)}</div>
            <div class="prod-stat-rate text-warning">${pRate.toFixed(2)}%</div><div class="prod-stat-lbl">Process</div></div>
            <div class="prod-stat"><div class="prod-stat-val text-dark">${formatCurrency(s.rmd)}</div>
            <div class="prod-stat-rate text-info">${rRate.toFixed(2)}%</div><div class="prod-stat-lbl">RMD</div></div></div></div>`;
            prodContainer.innerHTML += card;
        }
    });

    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = "";
    let allKeys = Object.keys(lineStats);
    allKeys.sort((a,b) => lineStats[b].total - lineStats[a].total);
    allKeys.forEach(k => {
        let s = lineStats[k];
        let pVal = s.prodVal || 0;
        let pRate = pVal>0 ? (s.proc/pVal)*100 : 0;
        let rRate = pVal>0 ? (s.rmd/pVal)*100 : 0;
        let tRate = pVal>0 ? (s.total/pVal)*100 : 0;
        let pClass = pRate <= 0.20 ? 'text-success' : (pRate <= 0.25 ? 'text-orange' : 'text-danger');
        let bClass = s.cat === 'EARBUDS' ? 'bg-primary' : (s.cat === 'CHARGING CASE' ? 'bg-danger' : (s.cat === 'SMART WATCH' ? 'bg-success' : 'bg-dark'));
        
        let row = `<tr><td class="fw-bold" data-val="${s.ln}">${s.ln}</td><td data-val="${s.cat}"><span class="badge ${bClass} badge-prod">${s.cat}</span></td>
        <td class="text-muted small fw-bold" data-val="${pVal}">${formatCurrency(pVal)}</td><td class="text-warning fw-bold" data-val="${s.proc}">${formatCurrency(s.proc)}</td>
        <td class="${pClass} small fw-bold" data-val="${pRate}">${pRate.toFixed(2)}%</td><td class="text-info fw-bold" data-val="${s.rmd}">${formatCurrency(s.rmd)}</td>
        <td class="small text-muted fw-bold" data-val="${rRate}">${rRate.toFixed(2)}%</td><td class="text-danger fw-bold border-start border-2" data-val="${s.total}">${formatCurrency(s.total)}</td>
        <td class="fw-bold text-danger" data-val="${tRate}">${tRate.toFixed(2)}%</td></tr>`;
        tbody.innerHTML += row;
    });

    renderTrendChart();
    if(typeof renderLineComponentAnalysis === 'function') renderLineComponentAnalysis(lineCompStats, lineProdQtyMap);
    if(typeof renderModelAnalysisTabs === 'function') renderModelAnalysisTabs();
}

function renderTrendChart() {
    const pFilter = document.getElementById('trendGraphProduct').value;
    const tFilter = document.getElementById('trendGraphType').value;
    const dFrom = document.getElementById('dateFrom').value;
    const dTo = document.getElementById('dateTo').value;
    let dailyProd = {};
    if(rawData.production.length > 0) {
        rawData.production.slice(1).forEach(row => {
            let d = normalizeDate(row[0]);
            if(!d || d < dFrom || d > dTo) return;
            let productCol = (row[1] || "").toString().toUpperCase(); 
            let ln = normalizeLine(row[3]);
            let model = (row[2] || "").toString().trim().toUpperCase(); 
            let cat = "";
            if(productCol !== "") cat = getProductCategory(productCol, ""); else cat = getProductCategory(model, ln);
            if (productCol.includes("EARBUDS") && productCol.includes("CHARGING")) { if (pFilter === 'EARBUDS') cat = 'EARBUDS'; else if (pFilter === 'CHARGING CASE') cat = 'CHARGING CASE'; }
            if(pFilter !== 'ALL' && cat !== pFilter) return;
            let val = (parseFloat(row[4])||0) * (modelPrices[model]||0);
            if(!dailyProd[d]) dailyProd[d] = 0; dailyProd[d] += val;
        });
    }
    let trendData = {}; 
    if(rawData.scrap.length > 0) {
        rawData.scrap.slice(1).forEach(row => {
            let d = normalizeDate(row[0]);
            if(!d || d < dFrom || d > dTo) return;
            let ln = normalizeLine(row[4]); let floorVal = row[5]; let cat = getProductCategory(floorVal, ln);
            if(pFilter !== 'ALL' && cat !== pFilter) return;
            let val = (parseFloat(row[11])||0) * (parseFloat(row[12])||0); 
            let storeVal = String(row[1]||"").toUpperCase(); let rejVal = String(row[10]||"").toUpperCase();
            let isProc = storeVal.includes('6003') || storeVal.includes('PROCESS') || rejVal.includes('PROCESS');
            let isRMD = storeVal.includes('6002') || storeVal.includes('RMD') || rejVal.includes('RMD');
            if(!trendData[d]) trendData[d] = { proc:0, rmd:0 };
            if(isProc) trendData[d].proc += val; if(isRMD) trendData[d].rmd += val;
        });
    }
    let allDates = new Set([...Object.keys(dailyProd), ...Object.keys(trendData)]);
    let labels = Array.from(allDates).sort();
    let barData = []; let lineRateData = []; let lbl = '';
    labels.forEach(d => {
        let scrapVal = 0; let currentScrap = trendData[d] || { proc:0, rmd:0 };
        if(tFilter === 'PROCESS') scrapVal = currentScrap.proc; else if (tFilter === 'RMD') scrapVal = currentScrap.rmd; else scrapVal = currentScrap.proc + currentScrap.rmd;
        barData.push(scrapVal);
        let prodVal = dailyProd[d] || 0; 
        let rate = prodVal > 0 ? (scrapVal / prodVal) * 100 : 0;
        lineRateData.push(rate);
    });
    if(tFilter === 'PROCESS') lbl = 'Process'; else if(tFilter === 'RMD') lbl = 'RMD'; else lbl = 'Total';
    const ctx = document.getElementById('scrapTrendCanvas').getContext('2d');
    if(scrapTrendChart) scrapTrendChart.destroy();
    scrapTrendChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { type: 'bar', label: lbl + ' Value (₹)', data: barData, backgroundColor: '#dc3545', order: 2, yAxisID: 'y', datalabels: { display: true, color: 'white', anchor: 'end', align: 'bottom', backgroundColor: 'rgba(220, 53, 69, 0.9)', borderRadius: 4, padding: 4, font: { size: 10, weight: 'bold' }, formatter: function(value) { return value >= 1000 ? (value/1000).toFixed(1) + 'k' : Math.round(value); } } },
                { type: 'line', label: lbl + ' Rate (%)', data: lineRateData, borderColor: '#0d6efd', backgroundColor: '#0d6efd', borderWidth: 2, tension: 0.3, pointRadius: 4, order: 1, yAxisID: 'y1', datalabels: { display: true, color: 'white', align: 'top', backgroundColor: '#0d6efd', borderRadius: 4, padding: 4, font: { size: 10, weight: 'bold' }, formatter: function(value) { return value.toFixed(2) + '%'; } } }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true }, tooltip: { mode: 'index', intersect: false } }, scales: { y: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'Value (₹)' }, beginAtZero: true, ticks: { callback: function(value) { return value >= 1000 ? (value/1000) + 'K' : value; } } }, y1: { type: 'linear', display: true, position: 'right', title: { display: true, text: 'Rate (%)' }, beginAtZero: true, grid: { drawOnChartArea: false } } } }
    });
}

function triggerSort(colIndex, type, selectEl) { 
    let dir = selectEl.value; if(!dir) return; 
    document.querySelectorAll('#analysisTable .sort-select').forEach(el => { if(el !== selectEl && el.id !== 'prodFilterDropdown') el.selectedIndex = 0; }); 
    sortTable(colIndex, type, dir, 'tableBody'); 
}

function sortTable(colIndex, type, dir, tbodyId) { 
    const tbody = document.getElementById(tbodyId); 
    const rows = Array.from(tbody.querySelectorAll('tr')); 
    rows.sort((rowA, rowB) => { 
        const cellA = rowA.children[colIndex]; 
        const cellB = rowB.children[colIndex]; 
        let valA, valB; 
        if (type === 'num') { valA = parseFloat(cellA.getAttribute('data-val')) || 0; valB = parseFloat(cellB.getAttribute('data-val')) || 0; } 
        else { valA = (cellA.getAttribute('data-val') || cellA.innerText).trim().toLowerCase(); valB = (cellB.getAttribute('data-val') || cellB.innerText).trim().toLowerCase(); } 
        if (valA < valB) return dir === 'asc' ? -1 : 1; 
        if (valA > valB) return dir === 'asc' ? 1 : -1; 
        return 0; 
    }); 
    rows.forEach(row => tbody.appendChild(row)); 
}

function applyProductFilter(selectEl) { 
    const filter = selectEl.value.toUpperCase(); 
    const tr = document.getElementById("analysisTable").getElementsByTagName("tr"); 
    for (let i = 2; i < tr.length; i++) { 
        const td = tr[i].getElementsByTagName("td")[1]; 
        if (td) { 
            const txt = td.getAttribute('data-val') || td.textContent; 
            tr[i].style.display = (filter === "" || txt.toUpperCase().indexOf(filter) > -1) ? "" : "none"; 
        } 
    } 
}