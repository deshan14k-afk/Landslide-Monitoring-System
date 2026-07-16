/* ===== Clock ===== */
function updateClock(){
  const now = new Date();
  document.getElementById('datetime').textContent =
    now.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) + ' • ' +
    now.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
}
updateClock(); setInterval(updateClock,1000);

/* ===== Mock Data =====
   Replace this with your real ESP32 -> GA6 -> PHP bridge -> Firebase/InfluxDB fetch logic. */
function genData(n){
  const rows=[]; const risks=['Safe','Safe','Safe','Warning','Safe','Danger'];
  let t = new Date();
  for(let i=0;i<n;i++){
    const time = new Date(t.getTime() - i*30*60000);
    rows.push({
      ts: time.toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}),
      soil: (55 + Math.random()*30).toFixed(1),
      x: (Math.random()*0.2-0.1).toFixed(2),
      y: (Math.random()*0.2-0.1).toFixed(2),
      z: (0.9 + Math.random()*0.15).toFixed(2),
      rain: (Math.random()*20).toFixed(1),
      risk: risks[Math.floor(Math.random()*risks.length)]
    });
  }
  return rows;
}
const allData = genData(40);

/* ===== Charts ===== */
const labels = allData.slice(0,12).reverse().map(r=>r.ts.split(',')[1]);

const moistureCtx = document.getElementById('moistureChart');
new Chart(moistureCtx, {
  type:'line',
  data:{ labels, datasets:[{
    data: allData.slice(0,12).reverse().map(r=>r.soil),
    borderColor:'#22C55E', backgroundColor:'rgba(34,197,94,.1)',
    fill:true, tension:.4, pointRadius:0, borderWidth:2.5
  }]},
  options:{ plugins:{legend:{display:false}}, scales:{ x:{grid:{display:false}}, y:{grid:{color:'#F1F5F9'}} }, maintainAspectRatio:false }
});

const rainfallCtx = document.getElementById('rainfallChart');
new Chart(rainfallCtx, {
  type:'line',
  data:{ labels, datasets:[{
    data: allData.slice(0,12).reverse().map(r=>r.rain),
    borderColor:'#3B82F6', backgroundColor:'rgba(59,130,246,.1)',
    fill:true, tension:.4, pointRadius:0, borderWidth:2.5
  }]},
  options:{ plugins:{legend:{display:false}}, scales:{ x:{grid:{display:false}}, y:{grid:{color:'#F1F5F9'}} }, maintainAspectRatio:false }
});

/* ===== Table + Search + Pagination ===== */
let filtered = allData.slice();
let currentPage = 1;
const pageSize = 8;

function riskTagHTML(risk){
  if(risk==='Safe') return `<span class="risk-tag" style="background:var(--green-soft);color:#15803D;">Safe</span>`;
  if(risk==='Warning') return `<span class="risk-tag" style="background:var(--orange-soft);color:#B45309;">Warning</span>`;
  return `<span class="risk-tag" style="background:var(--red-soft);color:#B91C1C;">Danger</span>`;
}

function renderTable(){
  const start = (currentPage-1)*pageSize;
  const pageRows = filtered.slice(start, start+pageSize);
  document.getElementById('tableBody').innerHTML = pageRows.map(r=>`
    <tr>
      <td>${r.ts}</td><td>${r.soil}</td><td>${r.x}</td><td>${r.y}</td><td>${r.z}</td><td>${r.rain}</td>
      <td>${riskTagHTML(r.risk)}</td>
    </tr>`).join('');

  const totalPages = Math.max(1, Math.ceil(filtered.length/pageSize));
  document.getElementById('pageInfo').textContent =
    `Showing ${filtered.length? start+1:0}–${Math.min(start+pageSize,filtered.length)} of ${filtered.length}`;

  const pgBtns = document.getElementById('pgBtns');
  pgBtns.innerHTML='';
  for(let p=1;p<=totalPages;p++){
    const b = document.createElement('button');
    b.className = 'pg-btn' + (p===currentPage?' active':'');
    b.textContent = p;
    b.onclick = ()=>{ currentPage=p; renderTable(); };
    pgBtns.appendChild(b);
  }
}
renderTable();

document.getElementById('searchInput').addEventListener('input', e=>{
  const q = e.target.value.toLowerCase();
  filtered = allData.filter(r => r.ts.toLowerCase().includes(q) || r.risk.toLowerCase().includes(q));
  currentPage = 1;
  renderTable();
});

/* ===== Toast ===== */
function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 2600);
}

/* ===== Export to Excel ===== */
document.getElementById('exportBtn').addEventListener('click', ()=>{
  const ws = XLSX.utils.json_to_sheet(allData.map(r=>({
    Timestamp:r.ts, 'Soil Moisture (%)':r.soil, 'ADXL X':r.x, 'ADXL Y':r.y, 'ADXL Z':r.z, 'Rainfall (mm)':r.rain, 'Risk Level':r.risk
  })));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sensor Data');
  XLSX.writeFile(wb, 'landslide_monitoring_data.xlsx');
  showToast('✅ Excel file downloaded');
});

/* ===== Reset Modal ===== */
const overlay = document.getElementById('overlay');
document.getElementById('resetBtn').addEventListener('click', ()=> overlay.classList.add('show'));
document.getElementById('cancelBtn').addEventListener('click', ()=> overlay.classList.remove('show'));
document.getElementById('confirmBtn').addEventListener('click', ()=>{
  overlay.classList.remove('show');
  filtered = []; allData.length = 0; currentPage = 1; renderTable();
  showToast('🗑️ Database reset successfully');
});
overlay.addEventListener('click', e=>{ if(e.target===overlay) overlay.classList.remove('show'); });