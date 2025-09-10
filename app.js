const API_URL = "/.netlify/functions/getProducts";

const state = {
  products: [],
  cart: [],
};

const el = (sel) => document.querySelector(sel);

function euro(n){
  if (typeof n !== "number" || Number.isNaN(n)) n = 0;
  return n.toLocaleString("es-ES", { style:"currency", currency:"EUR" });
}

async function loadProducts(){
  const res = await fetch(API_URL);
  const data = await res.json();
  if(!data.ok){ throw new Error(data.error || "Error cargando productos"); }
  state.products = data.items.filter(p => typeof p.priceKg === "number" && !Number.isNaN(p.priceKg));
  // poblar datalist
  const dl = el("#productos");
  dl.innerHTML = "";
  state.products.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.name;
    opt.label = `${p.name} · ${euro(p.priceKg)}/kg`;
    dl.appendChild(opt);
  });
}

function findProductByName(name){
  const n = (name||"").trim().toLowerCase();
  return state.products.find(p => p.name.trim().toLowerCase() === n);
}

function render(){
  const tbody = el("#tabla tbody");
  tbody.innerHTML = "";
  let subtotal = 0;

  state.cart.forEach((item, idx) => {
    subtotal += item.total;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.name}</td>
      <td class="num">${euro(item.priceKg)}</td>
      <td class="num">${item.kg}</td>
      <td class="num">${euro(item.total)}</td>
      <td class="num"><button data-idx="${idx}" class="btn">✕</button></td>
    `;
    tbody.appendChild(tr);
  });

  el("#subtotal").textContent = euro(subtotal);
  const porte = parseFloat(el("#porteTotal").value || "0");
  const total = subtotal + (Number.isNaN(porte) ? 0 : porte);
  el("#total").textContent = euro(total);
}

function addItem(){
  const nombre = el("#buscador").value;
  const kg = parseFloat(el("#kg").value);
  const p = findProductByName(nombre);
  if(!p){ alert("Selecciona un producto válido de la lista"); return; }
  if(!(kg > 0)){ alert("Indica una cantidad en kg"); return; }

  const existing = state.cart.find(x => x.name === p.name);
  if(existing){
    existing.kg = parseFloat((existing.kg + kg).toFixed(2));
    existing.total = parseFloat((existing.kg * existing.priceKg).toFixed(2));
  } else {
    state.cart.push({
      name: p.name,
      priceKg: p.priceKg,
      kg: parseFloat(kg.toFixed(2)),
      total: parseFloat((kg * p.priceKg).toFixed(2))
    });
  }
  el("#buscador").value = "";
  el("#kg").value = "1";
  render();
}

function removeItem(idx){
  state.cart.splice(idx,1);
  render();
}

// PDF
async function exportPDF(){
  if(state.cart.length === 0){ alert("Añade al menos un producto"); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 40;
  let y = margin;

  const cliente = el("#cliente").value || "";
  const comercial = el("#comercial").value || "";
  const fecha = el("#fecha").value || new Date().toISOString().slice(0,10);
  const notas = el("#notas").value || "";

  // Cabecera
  doc.setFont("helvetica","bold");
  doc.setFontSize(16);
  doc.text("EAP · Presupuesto mayorista", margin, y);
  y += 22;

  doc.setFontSize(10);
  doc.setFont("helvetica","normal");
  doc.text(`Cliente: ${cliente}`, margin, y); y += 14;
  doc.text(`Comercial: ${comercial}`, margin, y); y += 14;
  doc.text(`Fecha: ${fecha}`, margin, y); y += 18;

  if(notas){
    doc.setFont("helvetica","italic");
    doc.text(`Notas: ${notas}`, margin, y);
    y += 18;
    doc.setFont("helvetica","normal");
  }

  // Tabla
  const rows = state.cart.map(it => [it.name, euro(it.priceKg), `${it.kg}`, euro(it.total)]);
  doc.autoTable({
    startY: y,
    head: [["Producto","€/kg","kg","Importe"]],
    body: rows,
    styles: { font:"helvetica", fontSize:10, cellPadding:6 },
    headStyles: { fillColor:[15,23,42], textColor:[255,255,255] },
    columnStyles: { 1:{ halign:"right"}, 2:{ halign:"right"}, 3:{ halign:"right"} },
    margin: { left: margin, right: margin }
  });
  y = doc.lastAutoTable.finalY + 10;

  const subtotalText = el("#subtotal").textContent;
  const porteVal = parseFloat(el("#porteTotal").value || "0");
  const porteText = euro(porteVal);
  const totalText = el("#total").textContent;

  doc.setFont("helvetica","bold");
  doc.text(`Subtotal: ${subtotalText}`, 400, y, { align:"left" });
  y += 16;
  doc.text(`Porte: ${porteText}`, 400, y, { align:"left" });
  y += 16;
  doc.setFontSize(12);
  doc.text(`TOTAL: ${totalText}`, 400, y, { align:"left" });

  doc.save(`EAP-presupuesto-${fecha}.pdf`);
}

document.addEventListener("click", (e)=>{
  if(e.target.matches("button[data-idx]")){
    removeItem(parseInt(e.target.getAttribute("data-idx"),10));
  }
});

el("#btn-add").addEventListener("click", addItem);
el("#porteTotal").addEventListener("input", render);
el("#btn-export").addEventListener("click", exportPDF);

// set default date today
el("#fecha").value = new Date().toISOString().slice(0,10);

// init
loadProducts().then(render).catch(err => {
  console.error(err);
  alert("No se pudieron cargar los productos. Revisa la función de Netlify o tus credenciales de Notion.");
});
