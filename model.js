function renderModelAnalysisTabs() {
    const filterProd = document.getElementById('modelGraphProduct').value;
    const filterType = document.getElementById('modelGraphType').value;
    const filterComp = document.getElementById('modelGraphComp').value;
    const dFrom = document.getElementById('dateFrom').value;
    const dTo = document.getElementById('dateTo').value;
    let modelDataMap = {};

    if(rawData.production.length > 0) {
        rawData.production.slice(1).forEach(row => {
            let d = normalizeDate(row[0]);
            if(!d || d < dFrom || d > dTo) return;
            let ln = normalizeLine(row[3]);
            let model = (row[2] || "").toString().trim().toUpperCase();
            let rawOut = parseFloat(row[4]) || 0;
            let val = rawOut * (modelPrices[model]||0);
            let productCol = (row[1] || "").toString().toUpperCase(); 
            let cat = productCol !== "" ? getProductCategory(productCol, "") : getProductCategory(model, ln);
            if(!modelDataMap[model]) modelDataMap[model] = { cat: cat, prodQty:0, prodVal:0, scrapQty:0, scrapVal:0, caseScrapVal: 0, budsScrapVal: 0, otherScrapVal: 0, caseScrapQty: 0, budsScrapQty: 0, otherScrapQty: 0 };
            modelDataMap[model].prodQty += rawOut; modelDataMap[model].prodVal += val;
            if(cat !== 'OTHER') modelDataMap[model].cat = cat;
        });
    }
    if(rawData.scrap.length > 0) {
        rawData.scrap.slice(1).forEach(row => {
            let d = normalizeDate(row[0]);
            if(!d || d < dFrom || d > dTo) return;
            let ln = normalizeLine(row[4]);
            let floorVal = row[5];
            let model = (row[8] || "").toString().trim().toUpperCase();
            let prodName = getProductCategory(floorVal, ln);
            let typeVal = (row[9]||"").toString().toUpperCase(); 
            let rejTypeVal = (row[10] || "").toString().toUpperCase();
            let fullType = typeVal + " " + rejTypeVal; 
            let storeVal = String(row[1]||"").toUpperCase();
            let isProc = storeVal.includes('6003') || storeVal.includes('PROCESS') || rejTypeVal.includes('PROCESS');
            let isRMD = storeVal.includes('6002') || storeVal.includes('RMD') || rejTypeVal.includes('RMD');
            if (filterType === 'PROCESS' && !isProc) return;
            if (filterType === 'RMD' && !isRMD) return;
            if (filterComp !== 'ALL') {
                let isTargetComp = false;
                if (filterComp === 'PCBA' && (fullType.includes("PCBA") || fullType.includes("MAIN BOARD") || fullType.includes("PCB"))) isTargetComp = true;
                if (filterComp === 'BATTERY' && (fullType.includes("BATTERY") || fullType.includes("CELL") || fullType.includes("BATT"))) isTargetComp = true;
                if (filterComp === 'SPEAKER' && (fullType.includes("SPEAKER") || fullType.includes("DRIVER") || fullType.includes("SPK"))) isTargetComp = true;
                if (!isTargetComp) return;
            }
            let q = parseFloat(row[12])||0; let val = q * (parseFloat(row[11])||0);
            if(!modelDataMap[model]) modelDataMap[model] = { cat: prodName, prodQty:0, prodVal:0, scrapQty:0, scrapVal:0, caseScrapVal: 0, budsScrapVal: 0, otherScrapVal: 0, caseScrapQty: 0, budsScrapQty: 0, otherScrapQty: 0 };
            modelDataMap[model].scrapQty += q;
            modelDataMap[model].scrapVal += val;
            if(prodName === 'CHARGING CASE') { modelDataMap[model].caseScrapVal += val; modelDataMap[model].caseScrapQty += q; } 
            else if (prodName === 'EARBUDS') { modelDataMap[model].budsScrapVal += val; modelDataMap[model].budsScrapQty += q; } 
            else { modelDataMap[model].otherScrapVal += val; modelDataMap[model].otherScrapQty += q; }
            if(modelDataMap[model].cat === 'OTHER' && prodName !== 'OTHER') modelDataMap[model].cat = prodName;
        });
    }

    let valList = []; let qtyList = [];
    Object.keys(modelDataMap).forEach(m => {
        let d = modelDataMap[m];
        if (filterProd !== 'ALL' && d.cat !== filterProd) return;
        if (d.prodQty === 0 && d.scrapQty === 0) return;
        let totalScrapVal = d.caseScrapVal + d.budsScrapVal + d.otherScrapVal;
        let den = d.prodVal;
        let caseRate = den > 0 ? (d.caseScrapVal / den * 100) : 0;
        let budsRate = den > 0 ? (d.budsScrapVal / den * 100) : 0;
        let overallRate = den > 0 ? (totalScrapVal / den * 100) : 0;
        valList.push({ model: m, cat: d.cat, prodQty: d.prodQty, prodVal: d.prodVal, caseVal: d.caseScrapVal, caseRate: caseRate, budsVal: d.budsScrapVal, budsRate: budsRate, overallVal: totalScrapVal, overallRate: overallRate });
        let totalScrapQty = d.caseScrapQty + d.budsScrapQty + d.otherScrapQty;
        let caseQtyRate = d.prodQty > 0 ? (d.caseScrapQty / d.prodQty * 100) : 0;
        let budsQtyRate = d.prodQty > 0 ? (d.budsScrapQty / (d.prodQty * 2) * 100) : 0; 
        qtyList.push({ model: m, cat: d.cat, prodQty: d.prodQty, caseScrap: d.caseScrapQty, caseRate: caseQtyRate, budsScrap: d.budsScrapQty, budsRate: budsQtyRate, totalScrap: totalScrapQty });
    });

    valList.sort((a,b) => b.overallVal - a.overallVal); 
    renderValueTab(valList);
    qtyList.sort((a,b) => b.totalScrap - a.totalScrap);
    renderQtyTab(qtyList);
}

function renderValueTab(data) {
    const tbody = document.getElementById('modelValueTableBody');
    tbody.innerHTML = "";
    data.forEach((m, idx) => {
        let row = `<tr><td class="align-middle" data-val="${idx+1}">${idx+1}</td><td class="fw-bold text-start align-middle" data-val="${m.model}">${m.model}</td><td class="bg-light align-middle fw-bold" data-val="${m.prodQty}">${m.prodQty.toLocaleString()}</td><td class="text-dark align-middle fw-bold" data-val="${m.prodVal}">${formatCurrency(m.prodVal)}</td>
            <td class="align-middle" data-val="${m.caseVal}">${m.caseVal > 0 ? formatCurrency(m.caseVal) : '-'}</td><td class="align-middle text-muted small" data-val="${m.caseRate}">${m.caseRate > 0 ? m.caseRate.toFixed(2)+'%' : '-'}</td>
            <td class="align-middle" data-val="${m.budsVal}">${m.budsVal > 0 ? formatCurrency(m.budsVal) : '-'}</td><td class="align-middle text-muted small" data-val="${m.budsRate}">${m.budsRate > 0 ? m.budsRate.toFixed(2)+'%' : '-'}</td>
            <td class="text-danger fw-bold align-middle border-start" data-val="${m.overallVal}">${formatCurrency(m.overallVal)}</td><td class="fw-bold align-middle ${m.overallRate>1?'text-danger':'text-success'}" data-val="${m.overallRate}">${m.overallRate.toFixed(2)}%</td></tr>`;
        tbody.innerHTML += row;
    });
    let graphData = data.slice(0, 15);
    const ctx = document.getElementById('modelValueCanvas').getContext('2d');
    if (modelValueChart) modelValueChart.destroy();
    const lblStyle = { display: true, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 3, color: 'black', font: { weight: 'bold', size: 9 }, padding: 3 };
    modelValueChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: graphData.map(m => m.model),
            datasets: [
                { label: 'Total Scrap Value (₹)', data: graphData.map(m => m.overallVal), backgroundColor: '#198754', order: 2, yAxisID: 'y', datalabels: { align: 'end', anchor: 'end', ...lblStyle, formatter: v => formatCurrency(v) } },
                { label: 'Overall Rate %', data: graphData.map(m => m.overallRate), type: 'line', borderColor: '#dc3545', backgroundColor: '#dc3545', borderWidth: 2, pointRadius: 4, order: 1, yAxisID: 'y1', datalabels: { align: 'top', anchor: 'start', offset: 5, ...lblStyle, color: '#dc3545', formatter: v => v.toFixed(2) + '%' } }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, title: { display: true, text: 'Value (INR)' } }, y1: { position: 'right', beginAtZero: true, title: { display: true, text: 'Rate %' }, grid: { drawOnChartArea: false } } } }
    });
}

function renderQtyTab(data) {
    const tbody = document.getElementById('modelQtyTableBody');
    tbody.innerHTML = "";
    data.forEach((m, idx) => {
        let row = `<tr><td class="align-middle" data-val="${idx+1}">${idx+1}</td><td class="fw-bold text-start align-middle" data-val="${m.model}">${m.model}</td><td class="bg-light align-middle fw-bold" data-val="${m.prodQty}">${m.prodQty.toLocaleString()}</td>
            <td class="align-middle text-danger" data-val="${m.caseScrap}">${m.caseScrap > 0 ? m.caseScrap : '-'}</td><td class="align-middle small fw-bold" data-val="${m.caseRate}">${m.caseRate > 0 ? m.caseRate.toFixed(2)+'%' : '-'}</td>
            <td class="align-middle text-danger" data-val="${m.budsScrap}">${m.budsScrap > 0 ? m.budsScrap : '-'}</td><td class="align-middle small fw-bold" data-val="${m.budsRate}">${m.budsRate > 0 ? m.budsRate.toFixed(2)+'%' : '-'}</td>
            <td class="text-danger fw-bold align-middle border-start" data-val="${m.totalScrap}">${m.totalScrap.toLocaleString()}</td></tr>`;
        tbody.innerHTML += row;
    });
    let graphData = data.slice(0, 15);
    const ctx = document.getElementById('modelQtyCanvas').getContext('2d');
    if (modelQtyChart) modelQtyChart.destroy();
    const lblStyle = { display: true, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 3, color: 'black', font: { weight: 'bold', size: 9 }, padding: 3 };
    modelQtyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: graphData.map(m => m.model),
            datasets: [
                { label: 'Total Scrap Qty', data: graphData.map(m => m.totalScrap), backgroundColor: '#0d6efd', order: 2, yAxisID: 'y', datalabels: { align: 'end', anchor: 'end', ...lblStyle } },
                { label: 'Case Rate %', data: graphData.map(m => m.caseRate), type: 'line', borderColor: '#dc3545', backgroundColor: '#dc3545', borderWidth: 2, pointRadius: 3, order: 1, yAxisID: 'y1', datalabels: { display: true, align: 'top', anchor: 'start', offset: 4, ...lblStyle, color: '#dc3545', formatter: v => v > 0 ? v.toFixed(1) + '%' : '' } },
                { label: 'Buds Rate %', data: graphData.map(m => m.budsRate), type: 'line', borderColor: '#fd7e14', backgroundColor: '#fd7e14', borderWidth: 2, pointRadius: 3, order: 1, yAxisID: 'y1', datalabels: { display: true, align: 'bottom', anchor: 'start', offset: 4, ...lblStyle, color: '#fd7e14', formatter: v => v > 0 ? v.toFixed(1) + '%' : '' } }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, title: { display: true, text: 'Quantity' } }, y1: { position: 'right', beginAtZero: true, title: { display: true, text: 'Rate %' }, grid: { drawOnChartArea: false } } } }
    });
}

function triggerModelSort(colIndex, type, selectEl, tbodyId) {
    let dir = selectEl.value; if(!dir) return;
    const headerRow = selectEl.closest('tr');
    headerRow.querySelectorAll('.sort-select').forEach(el => { if(el !== selectEl) el.selectedIndex = 0; });
    sortTable(colIndex, type, dir, tbodyId);
}