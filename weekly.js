function renderWeeklyComparison() {
    const ranges = [
        { from: document.getElementById('wcFrom1').value, to: document.getElementById('wcTo1').value, name: 'Week 1' },
        { from: document.getElementById('wcFrom2').value, to: document.getElementById('wcTo2').value, name: 'Week 2' },
        { from: document.getElementById('wcFrom3').value, to: document.getElementById('wcTo3').value, name: 'Week 3' },
        { from: document.getElementById('wcFrom4').value, to: document.getElementById('wcTo4').value, name: 'Week 4' }
    ];

    const productFilter = document.getElementById('wcProductInput').value;
    const diffMode = document.getElementById('wcDiffSelect').value;

    if(!ranges[0].from || !ranges[0].to || !ranges[1].from || !ranges[1].to) {
        Swal.fire("Inputs Missing", "Please select at least Week 1 and Week 2 ranges", "warning");
        return;
    }

    function calculateStats(start, end) {
        let stats = { prodQty:0, prodVal:0, scrapVal:0, proc:0, rmd:0, pcba:0, batt:0, spkr:0, lineBreakdown: {} };
        if(!start || !end) return stats;

        rawData.production.slice(1).forEach(row => {
            let d = normalizeDate(row[0]);
            if(!d || d < start || d > end) return;
            let ln = normalizeLine(row[3]); 
            let model = (row[2] || "").toString().trim().toUpperCase();
            let productCol = (row[1] || "").toString().toUpperCase(); 
            let cat = productCol !== "" ? getProductCategory(productCol, "") : getProductCategory(model, ln);
            let isCombo = productCol.includes("EARBUDS") && productCol.includes("CHARGING");
            if(productFilter !== 'ALL') {
                if (isCombo) { if (productFilter !== 'EARBUDS' && productFilter !== 'CHARGING CASE') return; } else { if (cat !== productFilter) return; }
            }
            let rawOut = parseFloat(row[4]) || 0;
            let val = rawOut * (modelPrices[model]||0);
            stats.prodQty += rawOut;
            stats.prodVal += val;
        });

        rawData.scrap.slice(1).forEach(row => {
            let d = normalizeDate(row[0]);
            if(!d || d < start || d > end) return;
            let ln = normalizeLine(row[4]); 
            let floorVal = row[5]; 
            let cat = getProductCategory(floorVal, ln);
            if(productFilter !== 'ALL' && cat !== productFilter) return;
            let q = parseFloat(row[12])||0;
            let val = q * (parseFloat(row[11])||0);
            let typeVal = (row[9]||"").toString().toUpperCase(); 
            let rejTypeVal = (row[10] || "").toString().toUpperCase();
            let storeVal = String(row[1] || "").toUpperCase();
            let isProc = storeVal.includes('6003') || storeVal.includes('PROCESS') || rejTypeVal.includes('PROCESS');
            stats.scrapVal += val;
            if(isProc) stats.proc += val; else stats.rmd += val;
            let fullType = typeVal + " " + rejTypeVal; 
            if(fullType.includes("PCBA") || fullType.includes("MAIN BOARD")) stats.pcba += q;
            if(fullType.includes("BATTERY") || fullType.includes("CELL")) stats.batt += q;
            if(fullType.includes("SPEAKER") || fullType.includes("DRIVER")) stats.spkr += q;
            if(!stats.lineBreakdown[ln]) stats.lineBreakdown[ln] = 0;
            stats.lineBreakdown[ln] += val;
        });
        return stats;
    }

    let results = ranges.map(r => calculateStats(r.from, r.to));
    
    let thRow = `<th>Metric</th><th class="comp-header-1">Week 1</th><th class="comp-header-2">Week 2</th><th class="comp-header-3">Week 3</th><th class="comp-header-4">Week 4</th>`;
    let lineThRow = `<th>Line No <select class="sort-select mt-1" onchange="triggerWcSort(0, 'text', this)"><option value="" disabled selected>Sort</option><option value="asc">A-Z</option><option value="desc">Z-A</option></select></th>`;
    lineThRow += `<th class="comp-header-1">W1 Scrap (₹) <select class="sort-select mt-1" onchange="triggerWcSort(1, 'num', this)"><option value="" disabled selected>Sort</option><option value="asc">Low-High</option><option value="desc">High-Low</option></select></th>`;
    lineThRow += `<th class="comp-header-2">W2 Scrap (₹) <select class="sort-select mt-1" onchange="triggerWcSort(2, 'num', this)"><option value="" disabled selected>Sort</option><option value="asc">Low-High</option><option value="desc">High-Low</option></select></th>`;
    lineThRow += `<th class="comp-header-3">W3 Scrap (₹) <select class="sort-select mt-1" onchange="triggerWcSort(3, 'num', this)"><option value="" disabled selected>Sort</option><option value="asc">Low-High</option><option value="desc">High-Low</option></select></th>`;
    lineThRow += `<th class="comp-header-4">W4 Scrap (₹) <select class="sort-select mt-1" onchange="triggerWcSort(4, 'num', this)"><option value="" disabled selected>Sort</option><option value="asc">Low-High</option><option value="desc">High-Low</option></select></th>`;
    
    let diffLabel = "";
    let iA = -1, iB = -1;
    if(diffMode !== 'none') {
        let parts = diffMode.split('_');
        iA = parseInt(parts[0]);
        iB = parseInt(parts[1]);
        diffLabel = `Diff (W${iA+1}-W${iB+1})`;
        thRow += `<th class="comp-header-diff">${diffLabel}</th>`;
        lineThRow += `<th class="comp-header-diff">${diffLabel} <select class="sort-select mt-1" onchange="triggerWcSort(5, 'num', this)"><option value="" disabled selected>Sort</option><option value="asc">Low-High</option><option value="desc">High-Low</option></select></th>`;
    }
    document.getElementById('wcTableHeaders').innerHTML = thRow;
    document.getElementById('wcLineTableHeaders').innerHTML = lineThRow;

    let tbody = document.getElementById('wcTableBody');
    tbody.innerHTML = "";
    
    let metrics = [
        { lbl: "Production Qty", fmt: v=>v.toLocaleString(), key: 'prodQty', isProd:true },
        { lbl: "Production Value", fmt: formatCurrency, key: 'prodVal', isProd:true },
        { lbl: "Total Scrap Value", fmt: formatCurrency, key: 'scrapVal' },
        { lbl: "Overall Scrap Rate %", fmt: v=>v.toFixed(2)+'%', calc: (s)=> s.prodVal>0 ? (s.scrapVal/s.prodVal*100) : 0 },
        { lbl: "Process Scrap Rate %", fmt: v=>v.toFixed(2)+'%', calc: (s)=> s.prodVal>0 ? (s.proc/s.prodVal*100) : 0 },
        { lbl: "RMD Scrap Rate %", fmt: v=>v.toFixed(2)+'%', calc: (s)=> s.prodVal>0 ? (s.rmd/s.prodVal*100) : 0 },
        { lbl: "Process Scrap (₹)", fmt: formatCurrency, key: 'proc' },
        { lbl: "RMD Scrap (₹)", fmt: formatCurrency, key: 'rmd' },
        { lbl: "PCBA Defect Qty", fmt: v=>v, key: 'pcba' },
        { lbl: "Speaker Defect Qty", fmt: v=>v, key: 'spkr' },
        { lbl: "Battery Defect Qty", fmt: v=>v, key: 'batt' }
    ];

    metrics.forEach(m => {
        let vals = results.map(r => m.key ? r[m.key] : m.calc(r));
        let row = `<tr><td class="text-start fw-bold">${m.lbl}</td>`;
        vals.forEach(v => row += `<td>${m.fmt(v)}</td>`);
        if(diffMode !== 'none') {
            let valA = vals[iA];
            let valB = vals[iB];
            let diff = valA - valB;
            let colorClass = "";
            if (m.isProd) { colorClass = diff > 0 ? "text-success" : (diff < 0 ? "text-danger" : "text-white"); } 
            else { colorClass = diff > 0 ? "text-danger" : (diff < 0 ? "text-success" : "text-white"); }
            let diffStr = m.fmt(diff);
            if (diff > 0) diffStr = "+" + diffStr;
            row += `<td class="bg-dark fw-bold ${colorClass}">${diffStr}</td>`;
        }
        row += `</tr>`;
        tbody.innerHTML += row;
    });

    let lineBody = document.getElementById('wcLineTableBody');
    lineBody.innerHTML = "";
    let allLines = new Set();
    results.forEach(r => Object.keys(r.lineBreakdown).forEach(ln => allLines.add(ln)));
    let sortedLines = Array.from(allLines).sort();
    
    sortedLines.forEach(ln => {
        let row = `<tr><td class="fw-bold" data-val="${ln}">${ln}</td>`;
        let vals = [];
        results.forEach(r => {
            let val = r.lineBreakdown[ln] || 0;
            vals.push(val);
            row += `<td data-val="${val}">${formatCurrency(val)}</td>`;
        });
        if(diffMode !== 'none') {
            let valA = vals[iA];
            let valB = vals[iB];
            let diff = valA - valB;
            let colorClass = diff > 0 ? "text-danger" : (diff < 0 ? "text-success" : "text-white");
            let diffStr = formatCurrency(diff);
            if (diff > 0) diffStr = "+" + diffStr;
            row += `<td class="bg-dark fw-bold ${colorClass}" data-val="${diff}">${diffStr}</td>`;
        }
        row += `</tr>`;
        lineBody.innerHTML += row;
    });

    const ctx = document.getElementById('wcChartCanvas').getContext('2d');
    if(wcChart) wcChart.destroy();
    const colors = ['#004d40', '#e65100', '#4a148c', '#0d47a1'];
    let barData = results.map(r => r.scrapVal);
    let labels = ranges.map(r => r.name);
    wcChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [ { label: 'Total Scrap Value', data: barData, backgroundColor: colors } ]
        },
        options: { 
            responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } },
            plugins: { datalabels: { color: 'white', anchor: 'end', align: 'bottom', formatter: (val) => formatCurrency(val) } }
        }
    });
}

function triggerWcSort(colIndex, type, selectEl) {
    let dir = selectEl.value; if(!dir) return;
    const headerRow = selectEl.closest('tr');
    headerRow.querySelectorAll('.sort-select').forEach(el => { if(el !== selectEl) el.selectedIndex = 0; });
    sortTable(colIndex, type, dir, 'wcLineTableBody');
}