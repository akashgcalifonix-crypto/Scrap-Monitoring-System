const API_URL = "https://script.google.com/macros/s/AKfycbyD8FFtDs-2BR-9k2UkvdhaMcF1WrCWoVNOYcm8qI9aq0uT8OntsthgjgMIwNFlyFCtGw/exec"; 

Chart.register(ChartDataLabels);

let rawData = { production: [], scrap: [], models: [] };
let modelPrices = {};
let aggregatedModelData = {}; 
let currentMaterialsList = [];
let currentLineWeeklyData = {}; 

let scrapTrendChart = null;
let componentChart = null;
let modelValueChart = null;
let modelQtyChart = null;
let daTrendChart = null;
let daPcbaChart = null;
let daSpkrChart = null;
let daBattChart = null;
let wcChart = null;
let caChart = null; 

window.onload = function() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    document.getElementById('dateFrom').value = firstDay.toISOString().split('T')[0];
    document.getElementById('dateTo').value = today.toISOString().split('T')[0];
    loadData();
};

function switchSection(id) {
    document.querySelectorAll('.content-section').forEach(el => el.style.display = 'none');
    document.getElementById(id + '-section').style.display = 'block';
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => {
         if(l.getAttribute('onclick') && l.getAttribute('onclick').includes(id)) l.classList.add('active');
    });
    if (id === 'detail-analysis' && typeof renderDetailLines === 'function') { renderDetailLines(); }
    if (id === 'category-analysis' && typeof renderCategoryAnalysis === 'function') { renderCategoryAnalysis(); }
}

async function loadData() {
    document.getElementById('loader').style.display = 'flex';
    try {
        let res = await fetch(API_URL);
        let json = await res.json();
        if(!json.production || !json.scrap) throw new Error("Invalid Data Structure");
        rawData = json;
        if(json.models) {
            let pSelect = document.getElementById('pModel');
            if(pSelect) {
                pSelect.innerHTML = "";
                json.models.slice(1).forEach(r => {
                    let mName = (r[0] || "").toString().trim().toUpperCase();
                    modelPrices[mName] = parseFloat(r[1]) || 0;
                    pSelect.add(new Option(r[0], r[0]));
                });
            }
        }
        if(typeof processAndRender === 'function') processAndRender();
    } catch(e) { 
        console.error(e);
        Swal.fire("Error", "Details: " + e.message, "error"); 
    }
    document.getElementById('loader').style.display = 'none';
}

function normalizeDate(dateInput) {
    if(!dateInput) return null;
    let d;
    if (typeof dateInput === 'number') {
        d = new Date(Math.round((dateInput - 25569) * 86400 * 1000));
    } else {
        d = new Date(dateInput);
    }
    if(isNaN(d.getTime())) return null;
    let year = d.getFullYear();
    let month = String(d.getMonth() + 1).padStart(2, '0');
    let day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function normalizeLine(str) { return str ? str.toString().toUpperCase().trim().replace("L-", "").replace("LINE", "").replace(/^0+/, '') : "Unknown"; }

function formatCurrency(val) {
    if (val >= 10000000) return "₹" + (val / 10000000).toFixed(2) + "Cr";
    if (val >= 100000) return "₹" + (val / 100000).toFixed(2) + "L";
    if (val >= 1000) return "₹" + (val / 1000).toFixed(2) + "K";
    return "₹" + Math.round(val).toLocaleString();
}

function getProductCategory(prodStr, lineStr) {
    let p = (prodStr || "").toString().toUpperCase();
    let l = (lineStr || "").toString().toUpperCase();
    let combined = p + " " + l;
    if(combined.includes('DASHCAM') || combined.includes('DASH CAM')) return 'DASHCAM';
    if(combined.includes('WATCH')) return 'SMART WATCH';
    if(combined.includes('HEADPHONE')) return 'HEADPHONE';
    if(combined.includes('CHARGING') || combined.includes('CASE')) return 'CHARGING CASE';
    if(combined.includes('BUD') || combined.includes('EAR') || combined.includes('TWS') || combined.includes('AIR') || combined.includes('ANC') || combined.includes('ENC') || combined.includes('POD')) return 'EARBUDS';
    return 'OTHER';
}