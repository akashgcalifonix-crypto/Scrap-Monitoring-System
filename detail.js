function renderDetailLines() {
    const grid = document.getElementById('lineGridContainer');
    grid.innerHTML = "";
    for (let i = 1; i <= 24; i++) {
        let ln = i.toString();
        let div = document.createElement('div');
        div.className = 'line-box';
        div.innerHTML = `<h5>${ln}</h5><small>Click for History</small>`;
        div.onclick = () => openLineHistory(ln);
        grid.appendChild(div);
    }
}

function openLineHistory(lineNo) {
    document.getElementById('lineModalTitle').innerText = `Line ${lineNo} Detailed Analysis`;
    const modal = new bootstrap.Modal(document.getElementById('lineHistoryModal'));
    modal.show();

    const selProd = document.getElementById('daProduct').value;
    const selType = document.getElementById('daType').value;
    const dFrom = document.getElementById('dateFrom').value;
    const dTo = document.getElementById('dateTo').value;
    document.getElementById('lineWFrom').value = dFrom;
    document.getElementById('lineWTo').value = dTo;

    let dailyData = {};
    let lineModelMap = {}; 
    
    if(rawData.scrap.length > 0) {
        rawData.scrap.slice(1).forEach(row => {
            let d = normalizeDate(row[0]);
            let ln = normalizeLine(row[4]);
            if(ln !== lineNo && ln !== "0"+lineNo) return; 

            let floorVal = row[5];
            let cat = getProductCategory(floorVal, ln);
            if(cat !== selProd) return; 

            let typeVal = (row[9]||"").toString().toUpperCase(); 
            let rejTypeVal = (row[10] || "").toString().toUpperCase();
            let storeVal = String(row[1] || "").toUpperCase();
            let model = (row[8] || "Unknown").toString().toUpperCase();

            let isProc = storeVal.includes('6003') || storeVal.includes('PROCESS') || rejTypeVal.includes('PROCESS');
            let isRMD = storeVal.includes('6002') || storeVal.includes('RMD') || rejTypeVal.includes('RMD');
            
            if (selType === 'PROCESS' && !isProc) return;
            if (selType === 'RMD' && !isRMD) return;

            let q = parseFloat(row[12])||0;
            let val = q * (parseFloat(row[11])||0);
            let matName = (row[7] || row[6] || "Unknown").toString(); 

            if(!dailyData[d]) dailyData[d] = { scrapVal: 0, prodVal: 0, prodQty: 0, pcbaQ:0, pcbaV:0, battQ:0, battV:0, spkrQ:0, spkrV:0, materials: {} };
            
            dailyData[d].scrapVal += val;
            if(!lineModelMap[model]) lineModelMap[model] = 0;
            lineModelMap[model] += val;

            let fullType = typeVal + " " + rejTypeVal; 
            if(fullType.includes("PCBA") || fullType.includes("MAIN BOARD")) { dailyData[d].pcbaQ += q; dailyData[d].pcbaV += val; }
            if(fullType.includes("BATTERY") || fullType.includes("CELL")) { dailyData[d].battQ += q; dailyData[d].battV += val; }
            if(fullType.includes("SPEAKER") || fullType.includes("DRIVER")) { dailyData[d].spkrQ += q; dailyData[d].spkrV += val; }

            let uniqueMatKey = `${matName}|${model}|${fullType}`;
            if(!dailyData[d].materials[uniqueMatKey]) dailyData[d].materials[uniqueMatKey] = {desc: matName, model: model, type: fullType, q:0, v:0};
            dailyData[d].materials[uniqueMatKey].q += q;
            dailyData[d].materials[uniqueMatKey].v += val;
        });
    }

    if(rawData.production.length > 0) {
        rawData.production.slice(1).forEach(row => {
            let d = normalizeDate(row[0]);
            let ln = normalizeLine(row[3]);
            if(ln !== lineNo && ln !== "0"+lineNo) return;
            
            let productCol = (row[1] || "").toString().toUpperCase();
            let model = (row[2] || "").toString().trim().toUpperCase();
            let cat = productCol !== "" ? getProductCategory(productCol, "") : getProductCategory(model, ln);
            
            if (selProd === 'EARBUDS' && (productCol.includes("EARBUDS") || cat === 'EARBUDS')) {} 
            else if(cat !== selProd) return;

            let rawOut = parseFloat(row[4]) || 0;
            let val = rawOut * (modelPrices[model]||0);

            if(!dailyData[d]) dailyData[d] = { scrapVal: 0, prodVal: 0, prodQty: 0, pcbaQ:0, pcbaV:0, battQ:0, battV:0, spkrQ:0, spkrV:0, materials: {} };
            dailyData[d].prodVal += val;
            dailyData[d].prodQty += rawOut;
        });
    }

    currentLineWeeklyData = dailyData;

    let filteredKeys = Object.keys(dailyData).filter(d => d >= dFrom && d <= dTo).sort();
    
    let chartLabels = [];
    let scrapVals = [], scrapRates = [];
    let cPCBA = {q:[], qR:[], vR:[]}, cBATT = {q:[], qR:[], vR:[]}, cSPKR = {q:[], qR:[], vR:[]};
    let allMaterials = {};

    filteredKeys.forEach(d => {
        let item = dailyData[d];
        chartLabels.push(d);
        scrapVals.push(item.scrapVal);
        let rate = item.prodVal > 0 ? (item.scrapVal / item.prodVal * 100) : 0;
        scrapRates.push(rate);
        let denQ = item.prodQty > 0 ? item.prodQty : 1;
        let denV = item.prodVal > 0 ? item.prodVal : 1;
        cPCBA.q.push(item.pcbaQ); cPCBA.qR.push(item.prodQty > 0 ? (item.pcbaQ / denQ * 100) : 0); cPCBA.vR.push(item.prodVal > 0 ? (item.pcbaV / denV * 100) : 0);
        cBATT.q.push(item.battQ); cBATT.qR.push(item.prodQty > 0 ? (item.battQ / denQ * 100) : 0); cBATT.vR.push(item.prodVal > 0 ? (item.battV / denV * 100) : 0);
        cSPKR.q.push(item.spkrQ); cSPKR.qR.push(item.prodQty > 0 ? (item.spkrQ / denQ * 100) : 0); cSPKR.vR.push(item.prodVal > 0 ? (item.spkrV / denV * 100) : 0);
        Object.values(item.materials).forEach(m => {
            let uniqueKey = `${m.desc}|${m.model}|${m.type}`;
            if(!allMaterials[uniqueKey]) allMaterials[uniqueKey] = {desc:m.desc, model:m.model, type:m.type, q:0, v:0};
            allMaterials[uniqueKey].q += m.q;
            allMaterials[uniqueKey].v += m.v;
        });
    });

    const ctxTrend = document.getElementById('daTrendCanvas').getContext('2d');
    if(daTrendChart) daTrendChart.destroy();
    daTrendChart = new Chart(ctxTrend, {
        type: 'bar',
        data: {
            labels: chartLabels,
            datasets: [
                { 
                    label: 'Scrap Value', data: scrapVals, backgroundColor: '#dc3545', order: 2, yAxisID: 'y',
                    datalabels: { display: true, color: '#fff', backgroundColor: 'rgba(220, 53, 69, 0.9)', borderRadius: 4, font: { weight: 'bold', size: 10 }, padding: 4, anchor: 'end', align: 'top', formatter: (v) => v > 0 ? formatCurrency(v) : '' }
                },
                { 
                    type: 'line', label: 'Rate %', data: scrapRates, borderColor: '#0d6efd', borderWidth: 2, order: 1, yAxisID: 'y1',
                    datalabels: { display: true, color: '#fff', backgroundColor: '#0d6efd', borderRadius: 4, font: { weight: 'bold', size: 10 }, padding: 4, anchor: 'end', align: 'top', formatter: (v) => v > 0 ? v.toFixed(2) + '%' : '' }
                }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, title: {display:true, text:'Value'} }, y1: { position:'right', beginAtZero: true, title: {display:true, text:'Rate %'}, grid:{drawOnChartArea:false} } } }
    });

    renderMixedChart('daPcbaChart', 'PCBA', chartLabels, cPCBA, daPcbaChart, (c) => daPcbaChart = c);
    renderMixedChart('daSpkrChart', 'Speaker', chartLabels, cSPKR, daSpkrChart, (c) => daSpkrChart = c);
    renderMixedChart('daBattChart', 'Battery', chartLabels, cBATT, daBattChart, (c) => daBattChart = c);

    currentMaterialsList = Object.values(allMaterials).map(m => ({ name: m.desc, model: m.model, type: m.type, q: m.q, v: m.v }));
    filterMaterials(); 

    let sortedModels = Object.keys(lineModelMap).map(k => ({ name: k, val: lineModelMap[k] })).sort((a,b) => b.val - a.val);
    const mBody = document.getElementById('daModelTableBody');
    mBody.innerHTML = "";
    sortedModels.forEach(m => { mBody.innerHTML += `<tr><td class="text-start fw-bold">${m.name}</td><td class="text-danger">${formatCurrency(m.val)}</td></tr>`; });
    filterLineWeeklyTable();
}

function renderMixedChart(canvasId, label, labels, dataObj, chartInstance, setChartInstance) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    if(chartInstance) chartInstance.destroy();
    const labelStyle = { backgroundColor: 'rgba(255, 255, 255, 1)', borderColor: '#333', borderWidth: 1, borderRadius: 4, color: '#000', font: { weight: 'bold', size: 10 }, padding: 4 };
    let barColor = label==='PCBA'?'#0d6efd':(label==='Battery'?'#198754':'#ffc107');
    let newChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { type: 'bar', label: 'Scrap Qty', data: dataObj.q, backgroundColor: barColor, order: 3, yAxisID: 'y', datalabels: { display: 'auto', anchor: 'end', align: 'top', backgroundColor: barColor, color: '#fff', borderRadius: 3, font: { weight: 'bold', size: 10 }, padding: 3, formatter: (v) => v > 0 ? v : '' } },
                { type: 'line', label: 'Qty Rate %', data: dataObj.qR, borderColor: '#333', borderWidth: 2, pointRadius: 3, order: 1, yAxisID: 'y1', datalabels: { display: true, align: 'top', anchor: 'start', offset: 6, ...labelStyle, color: '#333', formatter: (v) => v > 0 ? v.toFixed(2)+'%' : '' } },
                { type: 'line', label: 'Val Rate %', data: dataObj.vR, borderColor: '#dc3545', borderWidth: 2, borderDash: [5, 5], pointRadius: 3, order: 2, yAxisID: 'y1', datalabels: { display: true, align: 'bottom', anchor: 'start', offset: 6, ...labelStyle, borderColor: '#dc3545', color: '#dc3545', formatter: (v) => v > 0 ? v.toFixed(2)+'%' : '' } }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, title: {display:true, text:'Qty'} }, y1: { position: 'right', beginAtZero: true, title: {display:true, text:'Rate %'}, grid: {drawOnChartArea:false} } }, plugins: { legend: { labels: { boxWidth: 10, font: {size:10} } } } }
    });
    setChartInstance(newChart);
}

function filterLineWeeklyTable() {
    const dFrom = document.getElementById('lineWFrom').value;
    const dTo = document.getElementById('lineWTo').value;
    const weeklyData = {};
    
    Object.keys(currentLineWeeklyData).forEach(d => {
        if(d < dFrom || d > dTo) return;
        const dateObj = new Date(d);
        const firstDay = new Date(dateObj.getFullYear(), 0, 1);
        const weekNo = Math.ceil((((dateObj - firstDay) / 86400000) + firstDay.getDay() + 1) / 7);
        const key = `Week ${weekNo}`;
        
        if(!weeklyData[key]) weeklyData[key] = { prodQty: 0, prodVal: 0, scrapVal: 0 };
        weeklyData[key].prodQty += currentLineWeeklyData[d].prodQty;
        weeklyData[key].prodVal += currentLineWeeklyData[d].prodVal;
        weeklyData[key].scrapVal += currentLineWeeklyData[d].scrapVal;
    });

    const tbody = document.getElementById('daWeeklyTableBody');
    tbody.innerHTML = "";
    Object.keys(weeklyData).sort().forEach(w => {
        let item = weeklyData[w];
        let rate = item.prodVal > 0 ? (item.scrapVal / item.prodVal * 100) : 0;
        tbody.innerHTML += `<tr><td>${w}</td><td>${item.prodQty}</td><td>${formatCurrency(item.scrapVal)}</td><td class="fw-bold ${rate>1?'text-danger':'text-success'}">${rate.toFixed(2)}%</td></tr>`;
    });
}

function filterMaterials() {
    const sDesc = document.getElementById('sDesc').value.toLowerCase();
    const sModel = document.getElementById('sModel').value.toLowerCase();
    const sType = document.getElementById('sType').value.toLowerCase();
    const sQty = document.getElementById('sQty').value.toLowerCase();
    const sVal = document.getElementById('sVal').value.toLowerCase();
    
    const sortMode = document.getElementById('matSort').value;
    const tbody = document.getElementById('daMatTableBody');
    tbody.innerHTML = "";

    let filtered = currentMaterialsList.filter(m => {
        return m.name.toLowerCase().includes(sDesc) &&
               m.model.toLowerCase().includes(sModel) &&
               m.type.toLowerCase().includes(sType) &&
               m.q.toString().includes(sQty) &&
               Math.round(m.v).toString().includes(sVal);
    });

    filtered.sort((a,b) => {
        if(sortMode === 'val_desc') return b.v - a.v;
        if(sortMode === 'val_asc') return a.v - b.v;
        if(sortMode === 'qty_desc') return b.q - a.q;
        if(sortMode === 'qty_asc') return a.q - b.q;
        return 0;
    });

    filtered.forEach(m => {
        tbody.innerHTML += `<tr>
            <td class="text-start">${m.name}</td>
            <td class="text-start small">${m.model}</td>
            <td class="text-start small">${m.type}</td>
            <td class="fw-bold">${m.q}</td>
            <td class="fw-bold text-danger">${formatCurrency(m.v)}</td>
        </tr>`;
    });
}