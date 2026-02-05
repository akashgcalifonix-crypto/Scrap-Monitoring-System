function uploadExcel() { 
    let f = document.getElementById('uploadFile').files[0]; 
    if(!f) return Swal.fire("Error","Select file","warning"); 
    let r = new FileReader(); 
    r.onload = e => { 
        let w = XLSX.read(e.target.result,{type:'array'}); 
        let j = XLSX.utils.sheet_to_json(w.Sheets[w.SheetNames[0]]); 
        document.getElementById('loader').style.display='flex'; 
        fetch(API_URL,{method:'POST',mode:'no-cors',body:JSON.stringify({action:'bulk_scrap',rows:j})}).then(()=>{ document.getElementById('loader').style.display='none'; Swal.fire("Success","Uploaded","success"); }); 
    }; 
    r.readAsArrayBuffer(f); 
}

function saveProduction() { 
    let dateVal = document.getElementById('pDate').value;
    let lineVal = document.getElementById('pLine').value;
    let productVal = document.getElementById('pProduct').value;
    let modelVal = document.getElementById('pModel').value;
    let outVal = document.getElementById('pOut').value;
    if(!dateVal || !lineVal || !productVal || !modelVal || !outVal) { Swal.fire("Incomplete Data", "Please fill all fields", "warning"); return; }
    let p = { action:'production', date: dateVal, lineNo: lineVal, product: productVal, model: modelVal, output: outVal }; 
    document.getElementById('loader').style.display='flex';
    fetch(API_URL,{method:'POST',mode:'no-cors',body:JSON.stringify(p)}).then(()=>{ document.getElementById('loader').style.display='none'; Swal.fire("Saved","Production Entry Saved Successfully","success"); document.getElementById('prodForm').reset(); }); 
}

function exportTable() { XLSX.writeFile(XLSX.utils.table_to_book(document.getElementById("analysisTable")), "Quality_Report.xlsx"); }