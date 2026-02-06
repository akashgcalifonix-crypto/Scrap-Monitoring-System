// js/detail.js

// Global variable to store current modal data for filtering/exporting
let currentLineData = [];
let currentLineNumber = "";

function renderDetailLines() {
    const grid = document.getElementById('lineGridContainer');
    grid.innerHTML = "";
    for (let i = 1; i <= 24; i++) {
        let ln = i.toString();
        let div = document.createElement('div');
        div.className = 'line-box';
        div.innerHTML = `<h5>${ln}</h5><small>Click for Report</small>`;
        div.onclick = () => openLineHistory(ln);
        grid.appendChild(div);
    }
}

function getMatCat(matName) {
    let m = matName.toUpperCase();
    if(m.includes("FPC") || m.includes("ANTENNA")) return "FPC";
    if(m.includes("MAGNET")) return "MAGNET";
    if(m.includes("SHELL") || m.includes("HSG") || m.includes("HOUSING") || m.includes("MOLDING") || m.includes("COVER") || m.includes("DECORATIVE")) return "MOLDING";
    if(m.includes("SPEAKER") || m.includes("DRIVER")) return "SPEAKER";
    if(m.includes("PCB") || m.includes("MAIN BOARD")) return "PCBA";
    if(m.includes("BATTERY")) return "BATTERY";
    return "OTHERS";
}

function openLineHistory(lineNo) {
    currentLineNumber = lineNo;
    document.getElementById('lineModalTitle').innerText = `Line ${lineNo} - Professional Quality Report`;
    const modal = new bootstrap.Modal(document.getElementById('lineHistoryModal'));
    
    // Inject Custom Layout for Report
    const modalBody = document.querySelector('#lineHistoryModal .modal-body');
    modalBody.innerHTML = `
        <div class="card shadow-sm border-0 mb-3">
            <div class="card-header bg-white py-3">
                <div class="row g-2 align-items-end">
                    <div class="col-md-3">
                        <label class="small fw-bold text-muted">From Date</label>
                        <input type="date" id="repFrom" class="form-control form-control-sm">
                    </div>
                    <div class="col-md-3">
                        <label class="small fw-bold text-muted">To Date</label>
                        <input type="date" id="repTo" class="form-control form-control-sm">
                    </div>
                    <div class="col-md-3">
                        <label class="small fw-bold text-muted">Filter Category</label>
                        <select id="repCat" class="form-select form-select-sm">
                            <option value="ALL">All Categories</option>
                            <option value="MOLDING">Molding</option>
                            <option value="FPC">FPC</option>
                            <option value="PCBA">PCBA</option>
                            <option value="SPEAKER">Speaker</option>
                            <option value="MAGNET">Magnet</option>
                            <option value="OTHERS">Others</option>
                        </select>
                    </div>
                    <div class="col-md-3 d-flex gap-2">
                        <button class="btn btn-sm btn-primary w-50" onclick="generateLineReport()"><i class="fas fa-filter"></i> Apply</button>
                        <div class="dropdown w-50">
                            <button class="btn btn-sm btn-success w-100 dropdown-toggle" type="button" data-bs-toggle="dropdown"><i class="fas fa-download"></i> Export</button>
                            <ul class="dropdown-menu">
                                <li><a class="dropdown-item" href="#" onclick="exportLineExcel()">Download Excel</a></li>
                                <li><a class="dropdown-item" href="#" onclick="exportLinePPT()">Download PPT</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Summary Cards -->
        <div class="row mb-3" id="repCards"></div>

        <!-- Main Report Table -->
        <div class="card shadow-sm border-0">
            <div class="card-header bg-dark text-white fw-bold d-flex justify-content-between">
                <span>Detailed Defect Analysis</span>
                <span id="totalSummaryVal">Total: ₹0</span>
            </div>
            <div class="card-body p-0">
                <div class="table-responsive" style="max-height: 500px; overflow-y: auto;">
                    <table class="table table-hover table-bordered mb-0" id="repTable" style="font-size:0.85rem;">
                        <thead class="bg-light sticky-top" style="z-index:5;">
                            <tr>
                                <th style="width:50%">Material Description</th>
                                <th style="width:20%">Model</th>
                                <th class="text-center" style="width:15%">Reject Qty</th>
                                <th class="text-center" style="width:15%">Reject Value (₹)</th>
                            </tr>
                        </thead>
                        <tbody id="repTableBody"></tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    // Set Default Dates
    document.getElementById('repFrom').value = document.getElementById('dateFrom').value;
    document.getElementById('repTo').value = document.getElementById('dateTo').value;

    modal.show();
    generateLineReport();
}

function generateLineReport() {
    const dFrom = document.getElementById('repFrom').value;
    const dTo = document.getElementById('repTo').value;
    const catFilter = document.getElementById('repCat').value;
    const ln = currentLineNumber;

    let summary = {};
    let groupedData = {};
    let grandTotalVal = 0;
    currentLineData = []; // Reset for export

    if(rawData.scrap.length > 0) {
        rawData.scrap.slice(1).forEach(row => {
            let d = normalizeDate(row[0]);
            let rowLn = normalizeLine(row[4]);
            
            // Filter: Line & Date
            if(rowLn !== ln && rowLn !== "0"+ln) return;
            if(!d || d < dFrom || d > dTo) return;

            let matName = (row[7] || row[6] || "Unknown").toString();
            let model = (row[8] || "").toString();
            let q = parseFloat(row[12])||0;
            let val = q * (parseFloat(row[11])||0);
            
            // Determine Category
            let category = getMatCat(matName);

            // Filter: Category
            if(catFilter !== 'ALL' && category !== catFilter) return;

            // Add to Grouped Data
            if(!groupedData[category]) groupedData[category] = [];
            groupedData[category].push({ mat: matName, model: model, qty: q, val: val });

            // Add to Summary
            if(!summary[category]) summary[category] = { qty:0, val:0 };
            summary[category].qty += q;
            summary[category].val += val;

            grandTotalVal += val;
        });
    }

    // 1. Render Summary Cards
    const cardsDiv = document.getElementById('repCards');
    cardsDiv.innerHTML = "";
    Object.keys(summary).sort((a,b) => summary[b].val - summary[a].val).forEach(cat => {
        let s = summary[cat];
        cardsDiv.innerHTML += `
            <div class="col-md-2 col-4 mb-2">
                <div class="card h-100 border-start border-4 border-dark shadow-sm">
                    <div class="card-body p-2 text-center">
                        <small class="text-muted fw-bold d-block">${cat}</small>
                        <span class="fw-bold text-dark d-block">${s.qty}</span>
                        <small class="text-danger fw-bold">${formatCurrency(s.val)}</small>
                    </div>
                </div>
            </div>`;
    });

    // 2. Render Main Table (Grouped like Screenshot)
    const tbody = document.getElementById('repTableBody');
    tbody.innerHTML = "";
    document.getElementById('totalSummaryVal').innerText = `Total Loss: ${formatCurrency(grandTotalVal)}`;

    let exportList = [];

    // Sort categories by value
    let sortedCats = Object.keys(groupedData).sort((a,b) => summary[b].val - summary[a].val);

    sortedCats.forEach(cat => {
        let items = groupedData[cat];
        let subTotalQ = 0;
        let subTotalV = 0;

        // Aggregate identical materials within category
        let aggItems = {};
        items.forEach(i => {
            let key = i.mat + "|" + i.model;
            if(!aggItems[key]) aggItems[key] = { mat: i.mat, model: i.model, qty:0, val:0 };
            aggItems[key].qty += i.qty;
            aggItems[key].val += i.val;
            subTotalQ += i.qty;
            subTotalV += i.val;
        });

        // Add Category Header Row
        tbody.innerHTML += `
            <tr class="table-secondary border-bottom border-dark">
                <td colspan="2" class="fw-bold text-start"><i class="fas fa-caret-right me-2"></i>${cat}</td>
                <td class="fw-bold text-center">${subTotalQ}</td>
                <td class="fw-bold text-center">${formatCurrency(subTotalV)}</td>
            </tr>
        `;

        // Add Items
        let sortedItems = Object.values(aggItems).sort((a,b) => b.val - a.val);
        sortedItems.forEach(item => {
            tbody.innerHTML += `
                <tr>
                    <td class="text-start ps-4">${item.mat}</td>
                    <td class="text-muted small">${item.model}</td>
                    <td class="text-center fw-bold">${item.qty}</td>
                    <td class="text-center text-danger">${formatCurrency(item.val)}</td>
                </tr>
            `;
            // Prepare data for export
            exportList.push({ Category: cat, Material: item.mat, Model: item.model, Qty: item.qty, Value: item.val });
        });
    });

    if(exportList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">No data found for selected criteria</td></tr>`;
    }

    currentLineData = exportList;
}

// --- EXPORT FUNCTIONS ---

function exportLineExcel() {
    if(currentLineData.length === 0) { Swal.fire("No Data", "Nothing to export", "warning"); return; }
    
    let ws = XLSX.utils.json_to_sheet(currentLineData);
    let wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Line Report");
    XLSX.writeFile(wb, `Line_${currentLineNumber}_Report.xlsx`);
}

function exportLinePPT() {
    if(currentLineData.length === 0) { Swal.fire("No Data", "Nothing to export", "warning"); return; }

    let pptx = new PptxGenJS();
    
    // Slide 1: Title
    let slide1 = pptx.addSlide();
    slide1.background = { color: "F1F1F1" };
    slide1.addText(`Scrap Analysis Report - Line ${currentLineNumber}`, { x: 1, y: 1, w: '80%', fontSize: 24, bold: true, color: '003366' });
    slide1.addText(`Generated on: ${new Date().toLocaleDateString()}`, { x: 1, y: 1.5, fontSize: 12, color: '666666' });

    // Prepare Table Data for PPT
    // Headers
    let rows = [
        [
            { text: "Category", options: { bold: true, fill: "003366", color: "FFFFFF" } },
            { text: "Material Description", options: { bold: true, fill: "003366", color: "FFFFFF" } },
            { text: "Model", options: { bold: true, fill: "003366", color: "FFFFFF" } },
            { text: "Qty", options: { bold: true, fill: "003366", color: "FFFFFF" } },
            { text: "Value (INR)", options: { bold: true, fill: "003366", color: "FFFFFF" } }
        ]
    ];

    // Data Rows
    currentLineData.forEach(d => {
        rows.push([
            d.Category,
            d.Material,
            d.Model,
            d.Qty,
            Math.round(d.Value)
        ]);
    });

    // Slide 2: Data Table
    let slide2 = pptx.addSlide();
    slide2.addText("Detailed Breakdown", { x: 0.5, y: 0.5, fontSize: 18, bold: true, color: '003366' });
    
    slide2.addTable(rows, {
        x: 0.2, y: 1, w: 9.0,
        fontSize: 9,
        border: { pt: 1, color: "DDDDDD" },
        autoPage: true // Auto create new slides if table is long
    });

    pptx.writeFile({ fileName: `Line_${currentLineNumber}_Analysis.pptx` });
}
