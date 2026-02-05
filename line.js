function renderLineComponentAnalysis(lineCompStats, lineProdQtyMap) {
    const prodFilter = document.getElementById('laProduct').value;
    const typeFilter = document.getElementById('laType').value; 
    const compFilter = document.getElementById('laComponent').value; 
    let allKeys = new Set([...Object.keys(lineCompStats), ...Object.keys(lineProdQtyMap)]);
    let keys = Array.from(allKeys).sort(); 
    let processedData = []; let totalEffectiveProd = 0; let totalRawProd = 0; let totalP = 0, totalS = 0, totalB = 0;
    keys.forEach(k => {
        let [ln, cat] = k.split("|");
        if (prodFilter !== 'ALL' && cat !== prodFilter) return;
        let stats = lineCompStats[k] || { raw: {} }; let raw = stats.raw || {};
        let pQ = 0, sQ = 0, bQ = 0;
        if(typeFilter === 'ALL') { pQ = (raw.pcba_proc||0) + (raw.pcba_rmd||0); sQ = (raw.spkr_proc||0) + (raw.spkr_rmd||0); bQ = (raw.batt_proc||0) + (raw.batt_rmd||0); } 
        else if (typeFilter === 'PROCESS') { pQ = raw.pcba_proc||0; sQ = raw.spkr_proc||0; bQ = raw.batt_proc||0; } 
        else { pQ = raw.pcba_rmd||0; sQ = raw.spkr_proc||0; bQ = raw.batt_rmd||0; }
        let prodRaw = lineProdQtyMap[k] || 0;
        let effectiveProd = prodRaw; 
        if (cat === 'EARBUDS') { effectiveProd = prodRaw * 2; } else { effectiveProd = prodRaw * 1; }
        if(prodRaw === 0 && pQ === 0 && sQ === 0 && bQ === 0) return;
        let pR = effectiveProd > 0 ? (pQ / effectiveProd * 100) : 0;
        let sR = effectiveProd > 0 ? (sQ / effectiveProd * 100) : 0;
        let bR = effectiveProd > 0 ? (bQ / effectiveProd * 100) : 0;
        totalEffectiveProd += effectiveProd; totalRawProd += prodRaw; totalP += pQ; totalS += sQ; totalB += bQ;
        processedData.push({ ln: ln, cat: cat, prodDisplay: prodRaw, prodEffective: effectiveProd, pQ: pQ, pR: pR, sQ: sQ, sR: sR, bQ: bQ, bR: bR, sortMetric: (compFilter==='ALL'?(pQ+sQ+bQ):(compFilter==='PCBA'?pQ:(compFilter==='SPEAKER'?sQ:bQ))) });
    });
    processedData.sort((a,b) => { if (a.cat < b.cat) return -1; if (a.cat > b.cat) return 1; if (a.ln < b.ln) return -1; if (a.ln > b.ln) return 1; return 0; });
    let totPR = totalEffectiveProd > 0 ? (totalP/totalEffectiveProd*100) : 0;
    let totSR = totalEffectiveProd > 0 ? (totalS/totalEffectiveProd*100) : 0;
    let totBR = totalEffectiveProd > 0 ? (totalB/totalEffectiveProd*100) : 0;
    let tableHTML = `<tr class="fw-bold bg-secondary text-white border-top border-3 border-dark" id="subtotalRow"><td class="text-end">GRAND TOTAL</td><td>-</td><td data-val="${totalRawProd}">${totalRawProd.toLocaleString()}</td><td data-val="${totalP}">${totalP}</td><td class="small text-danger fw-bold" data-val="${totPR}">${totPR.toFixed(2)}%</td><td data-val="${totalS}">${totalS}</td><td class="small text-danger fw-bold" data-val="${totSR}">${totSR.toFixed(2)}%</td><td data-val="${totalB}">${totalB}</td><td class="small text-danger fw-bold" data-val="${totBR}">${totBR.toFixed(2)}%</td></tr>`;
    processedData.forEach(d => {
        let bClass = d.cat === 'EARBUDS' ? 'bg-primary' : (d.cat === 'CHARGING CASE' ? 'bg-danger' : 'bg-dark');
        tableHTML += `<tr><td class="fw-bold" data-val="${d.ln}">${d.ln}</td><td data-val="${d.cat}"><span class="badge ${bClass} badge-prod">${d.cat}</span></td><td class="bg-light fw-bold" data-val="${d.prodDisplay}">${d.prodDisplay.toLocaleString()}</td><td class="text-primary" data-val="${d.pQ}">${d.pQ}</td><td class="text-danger fw-bold small" data-val="${d.pR}">${d.pR.toFixed(2)}%</td><td class="text-warning text-dark" data-val="${d.sQ}">${d.sQ}</td><td class="text-danger fw-bold small" data-val="${d.sR}">${d.sR.toFixed(2)}%</td><td class="text-success" data-val="${d.bQ}">${d.bQ}</td><td class="text-danger fw-bold small" data-val="${d.bR}">${d.bR.toFixed(2)}%</td></tr>`;
    });
    document.getElementById('compTableBody').innerHTML = tableHTML;
    let graphData = [...processedData].sort((a,b) => b.sortMetric - a.sortMetric);
    const ctx = document.getElementById('componentAnalysisCanvas').getContext('2d');
    if (componentChart) componentChart.destroy();
    let gl = graphData.map(d => d.ln);
    let gpQ = graphData.map(d => d.pQ); let gpR = graphData.map(d => d.pR);
    let gsQ = graphData.map(d => d.sQ); let gsR = graphData.map(d => d.sR);
    let gbQ = graphData.map(d => d.bQ); let gbR = graphData.map(d => d.bR);
    const lblStyle = { display: true, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 3, color: 'black', font: { weight: 'bold', size: 9 }, padding: 3 };
    let datasets = [];
    if(compFilter === 'ALL') {
            datasets.push({ label: 'PCBA Qty', data: gpQ, backgroundColor: '#0d6efd', order:2, datalabels: { align:'end', anchor:'end', ...lblStyle } });
            datasets.push({ label: 'Spkr Qty', data: gsQ, backgroundColor: '#ffc107', order:2, datalabels: { align:'end', anchor:'end', ...lblStyle } });
            datasets.push({ label: 'Batt Qty', data: gbQ, backgroundColor: '#198754', order:2, datalabels: { align:'end', anchor:'end', ...lblStyle } });
    } else if (compFilter === 'PCBA') {
        datasets.push({ label: 'PCBA Qty', data: gpQ, backgroundColor: '#0d6efd', order:2, yAxisID: 'y', datalabels: { align:'end', anchor:'end', ...lblStyle } });
        datasets.push({ label: 'PCBA Rate %', data: gpR, type: 'line', borderColor: '#0d6efd', borderWidth: 2, pointRadius: 4, order:1, yAxisID: 'y1', datalabels: { align:'top', anchor:'start', offset:5, ...lblStyle, color:'#0d6efd', formatter: v=>v.toFixed(2)+'%' } });
    } else if (compFilter === 'SPEAKER') {
        datasets.push({ label: 'Spkr Qty', data: gsQ, backgroundColor: '#ffc107', order:2, yAxisID: 'y', datalabels: { align:'end', anchor:'end', ...lblStyle } });
        datasets.push({ label: 'Spkr Rate %', data: gsR, type: 'line', borderColor: '#ffc107', borderWidth: 2, pointRadius: 4, order:1, yAxisID: 'y1', datalabels: { align:'top', anchor:'start', offset:5, ...lblStyle, color:'#d39e00', formatter: v=>v.toFixed(2)+'%' } });
    } else if (compFilter === 'BATTERY') {
        datasets.push({ label: 'Batt Qty', data: gbQ, backgroundColor: '#198754', order:2, yAxisID: 'y', datalabels: { align:'end', anchor:'end', ...lblStyle } });
        datasets.push({ label: 'Batt Rate %', data: gbR, type: 'line', borderColor: '#198754', borderWidth: 2, pointRadius: 4, order:1, yAxisID: 'y1', datalabels: { align:'top', anchor:'start', offset:5, ...lblStyle, color:'#198754', formatter: v=>v.toFixed(2)+'%' } });
    }
    componentChart = new Chart(ctx, {
        type: 'bar',
        data: { labels: gl, datasets: datasets },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, title: {display:true, text:'Quantity'} }, y1: { display: (compFilter!=='ALL'), position: 'right', beginAtZero: true, title: {display:true, text:'Rate %'}, grid: {drawOnChartArea:false} } } }
    });
}

function triggerCompSort(colIndex, type, selectEl) { 
    let dir = selectEl.value; if(!dir) return; 
    sortCompTable(colIndex, type, dir); 
}

function sortCompTable(colIndex, type, dir) { 
    const tbody = document.getElementById('compTableBody'); 
    const rows = Array.from(tbody.querySelectorAll('tr')); 
    const subtotalRow = rows.shift(); 
    rows.sort((rowA, rowB) => { 
        const cellA = rowA.children[colIndex]; 
        const cellB = rowB.children[colIndex]; 
        let valA, valB; 
        if (type === 'num') { valA = parseFloat(cellA.getAttribute('data-val')) || 0; valB = parseFloat(cellB.getAttribute('data-val')) || 0; } 
        else { valA = cellA.innerText.trim().toLowerCase(); valB = cellB.innerText.trim().toLowerCase(); } 
        if (valA < valB) return dir === 'asc' ? -1 : 1; 
        if (valA > valB) return dir === 'asc' ? 1 : -1; 
        return 0; 
    }); 
    tbody.appendChild(subtotalRow); 
    rows.forEach(row => tbody.appendChild(row)); 
}

function applyCompProdFilter(selectEl) { 
    const filter = selectEl.value.toUpperCase(); 
    const tr = document.getElementById("compTable").getElementsByTagName("tr"); 
    for (let i = 2; i < tr.length; i++) { 
        const td = tr[i].getElementsByTagName("td")[1]; 
        if (td) { 
            const txt = td.getAttribute('data-val') || td.textContent; 
            tr[i].style.display = (filter === "" || txt.toUpperCase().indexOf(filter) > -1) ? "" : "none"; 
        } 
    } 
}	