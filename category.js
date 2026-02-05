function getFloorFromLine(lineStr) {
    let ln = parseInt(lineStr.replace(/\D/g, ''));
    if (isNaN(ln)) return "Unknown";
    if (ln >= 1 && ln <= 8) return "1"; // 1st Floor
    if (ln >= 9 && ln <= 16) return "2"; // 2nd Floor
    if (ln >= 17 && ln <= 24) return "B"; // Basement
    return "Unknown";
}

function renderCategoryAnalysis() {
    const dFrom = document.getElementById('dateFrom').value;
    const dTo = document.getElementById('dateTo').value;
    const floorFilter = document.getElementById('caFloor').value;
    const typeFilter = document.getElementById('caType').value;

    let totalFloorProdVal = 0;
    if(rawData.production.length > 0) {
        rawData.production.slice(1).forEach(row => {
            let d = normalizeDate(row[0]);
            if(!d || d < dFrom || d > dTo) return;
            
            let ln = normalizeLine(row[3]);
            let floor = getFloorFromLine(ln);
            
            if (floorFilter !== 'ALL' && floor !== floorFilter) return;

            let model = (row[2] || "").toString().trim().toUpperCase();
            let rawOut = parseFloat(row[4]) || 0;
            let val = rawOut * (modelPrices[model]||0);
            totalFloorProdVal += val;
        });
    }

    let cats = { 'FRESH': 0, 'REWORK': 0, 'WIP': 0, 'OLD WIP': 0, 'SHORT': 0, 'OTHER': 0 };

    if(rawData.scrap.length > 0) {
        rawData.scrap.slice(1).forEach(row => {
            let d = normalizeDate(row[0]);
            if(!d || d < dFrom || d > dTo) return;

            let ln = normalizeLine(row[4]);
            let floor = getFloorFromLine(ln);

            if (floorFilter !== 'ALL' && floor !== floorFilter) return;

            let storeVal = String(row[1] || "").toUpperCase();
            let rejTypeVal = (row[10] || "").toString().toUpperCase();
            
            let isProc = storeVal.includes('6003') || storeVal.includes('PROCESS') || rejTypeVal.includes('PROCESS');
            let isRMD = storeVal.includes('6002') || storeVal.includes('RMD') || rejTypeVal.includes('RMD');

            if (typeFilter === 'PROCESS' && !isProc) return;
            if (typeFilter === 'RMD' && !isRMD) return;

            let q = parseFloat(row[12])||0;
            let val = q * (parseFloat(row[11])||0);
            
            let categoryStr = (row[14] || "").toString().toUpperCase();

            if (categoryStr.includes("FRESH")) { cats['FRESH'] += val; }
            else if (categoryStr.includes("REWORK")) { cats['REWORK'] += val; }
            else if (categoryStr.includes("OLD WIP")) { cats['OLD WIP'] += val; } 
            else if (categoryStr.includes("WIP")) { cats['WIP'] += val; } 
            else if (categoryStr.includes("SHORT")) { cats['SHORT'] += val; }
            else { cats['OTHER'] += val; }
        });
    }

    const tbody = document.getElementById('caTableBody');
    tbody.innerHTML = "";
    let labels = ['FRESH', 'REWORK', 'WIP', 'OLD WIP', 'SHORT'];
    let chartData = [];
    let chartColors = ['#28a745', '#ffc107', '#17a2b8', '#6c757d', '#dc3545'];

    labels.forEach(lbl => {
        let sVal = cats[lbl];
        let rate = totalFloorProdVal > 0 ? (sVal / totalFloorProdVal * 100) : 0;
        chartData.push(sVal);
        
        let row = `<tr>
            <td class="fw-bold text-start">${lbl}</td>
            <td class="fw-bold">${formatCurrency(sVal)}</td>
            <td class="text-danger fw-bold">${rate.toFixed(3)}%</td>
        </tr>`;
        tbody.innerHTML += row;
    });

    if(cats['OTHER'] > 0) {
        let sVal = cats['OTHER'];
        let rate = totalFloorProdVal > 0 ? (sVal / totalFloorProdVal * 100) : 0;
            let row = `<tr>
            <td class="fw-bold text-start text-muted">OTHER</td>
            <td class="fw-bold text-muted">${formatCurrency(sVal)}</td>
            <td class="text-muted">${rate.toFixed(3)}%</td>
        </tr>`;
        tbody.innerHTML += row;
    }

    const ctx = document.getElementById('caChartCanvas').getContext('2d');
    if (caChart) caChart.destroy();

    caChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Scrap Value (₹)',
                data: chartData,
                backgroundColor: chartColors,
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                datalabels: {
                    color: '#000',
                    anchor: 'end',
                    align: 'top',
                    formatter: (val) => val > 0 ? formatCurrency(val) : ''
                }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}