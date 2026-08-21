// Encuadre de portada — mapea un recorte 390x844 sobre la imagen original.
const SRC = './cover-retrato.jpg';
const AR = 390 / 844;
const stage = document.getElementById('stage'), canv = document.getElementById('canv');
const img = document.getElementById('img'), himg = document.getElementById('himg');
const mask = document.getElementById('mask'), crop = document.getElementById('crop');
const zoom = document.getElementById('zoom'), zoomval = document.getElementById('zoomval');
let box = {x:0,y:0,w:0,h:0};      // crop rect in stage px
let nat = {w:0,h:0};              // natural image size
let base = 1;                     // scale that makes the image cover the crop box
let s = 1, tx = 0, ty = 0;        // current scale + translation of the image, in stage px

function layoutBox(){
  const r = stage.getBoundingClientRect(), pad = 26;
  let h = r.height - pad*2, w = h * AR;
  if (w > r.width - pad*2) { w = r.width - pad*2; h = w / AR; }
  box = {w, h, x:(r.width-w)/2, y:(r.height-h)/2};
  Object.assign(crop.style, {left:box.x+'px', top:box.y+'px', width:w+'px', height:h+'px'});
  mask.style.webkitMaskImage = mask.style.maskImage = 'linear-gradient(#000,#000),linear-gradient(#000,#000)';
  mask.style.webkitMaskPosition = mask.style.maskPosition = `0 0, ${box.x}px ${box.y}px`;
  mask.style.webkitMaskSize = mask.style.maskSize = `100% 100%, ${w}px ${h}px`;
}
// El zoom mínimo del control acompaña la escala real de "Ajustar entera".
function syncZoomRange(){
  const fit = Math.min(box.w/nat.w, box.h/nat.h);
  zoom.min = Math.max(10, Math.floor(fit/base*100));
}
function clamp(){
  const iw = nat.w*s, ih = nat.h*s;
  if (iw >= box.w) tx = Math.min(box.x, Math.max(box.x+box.w-iw, tx));
  else tx = box.x + (box.w-iw)/2;
  if (ih >= box.h) ty = Math.min(box.y, Math.max(box.y+box.h-ih, ty));
  else ty = box.y + (box.h-ih)/2;
}
function paint(){
  clamp();
  img.style.transform = `translate(${tx}px,${ty}px) scale(${s})`;
  // map to the 390x844 hero: crop box -> phone
  const k = 390 / box.w;
  himg.style.width = nat.w+'px';
  himg.style.transform = `translate(${(tx-box.x)*k}px,${(ty-box.y)*k}px) scale(${s*k})`;
  const pctNow = Math.round(s/base*100);
  zoomval.textContent = pctNow+'%';
  zoom.value = Math.min(+zoom.max, Math.max(+zoom.min, pctNow));
}
// Heurística: ¿hay una franja clara y uniforme (típica de tapas con título) dentro de la zona del título?
const presets = {
  fill(){ s = base; tx = box.x + (box.w-nat.w*s)/2; ty = box.y + (box.h-nat.h*s)/2; },
  fit(){ s = Math.min(box.w/nat.w, box.h/nat.h); tx = box.x + (box.w-nat.w*s)/2; ty = box.y + (box.h-nat.h*s)/2; },
  top(){ s = base; tx = box.x + (box.w-nat.w*s)/2; ty = box.y; },
  face(){ s = base*1.45; tx = box.x + (box.w-nat.w*s)/2; ty = box.y - nat.h*s*0.06; }
};
let activePreset = 'fill';
function setPreset(k, el){
  document.querySelectorAll('.preset').forEach(c => c.classList.remove('on'));
  el = el || document.getElementById('p-' + k);
  if (el) el.classList.add('on');
  activePreset = k;
  presets[k](); paint();
}
img.onload = () => {
  nat = {w: img.naturalWidth, h: img.naturalHeight};
  img.style.width = nat.w+'px';
  layoutBox();
  base = Math.max(box.w/nat.w, box.h/nat.h);
  syncZoomRange();
  setPreset(activePreset);
};
const bimg = document.getElementById('bimg');
function loadCover(src){ img.src = src; himg.src = src; bimg.src = src; }
// Un solo lugar escribe el héroe: título, autor, unidad, progreso y pips.
function applyBook(b){
  const d = b.dataset;
  document.getElementById('booktitle').textContent = d.title;
  document.getElementById('bookauthor').textContent = d.author;
  document.getElementById('bookunit').textContent = d.unit;
  document.getElementById('bookpct').textContent = d.pct + '%';
  document.getElementById('bookpos').textContent = d.pos;
  const n = +d.n, on = +d.on;
  document.getElementById('bookpips').innerHTML =
    Array.from({length:n}, (_,i) => '<i class="pip' + (i < on ? ' on' : i === on ? ' now' : '') + '"></i>').join('');
  loadCover(d.src);
}
document.querySelectorAll('.cchip').forEach(b => b.onclick = () => {
  document.querySelectorAll('.cchip').forEach(c => c.classList.remove('on'));
  b.classList.add('on');
  applyBook(b);
});
zoom.oninput = () => {
  const cx = box.x+box.w/2, cy = box.y+box.h/2;
  const nx = (cx-tx)/s, ny = (cy-ty)/s;
  s = base * zoom.value/100;
  tx = cx - nx*s; ty = cy - ny*s;
  document.querySelectorAll('.preset').forEach(c => c.classList.remove('on'));
  activePreset = 'fill';
  paint();
};
let drag = null;
stage.addEventListener('pointerdown', e => {
  drag = {px:e.clientX, py:e.clientY, tx, ty};
  stage.classList.add('drag'); stage.setPointerCapture(e.pointerId);
});
stage.addEventListener('pointermove', e => {
  if (!drag) return;
  tx = drag.tx + (e.clientX-drag.px); ty = drag.ty + (e.clientY-drag.py);
  document.querySelectorAll('.preset').forEach(c => c.classList.remove('on'));
  activePreset = 'fill';
  paint();
});
stage.addEventListener('pointerup', () => { drag = null; stage.classList.remove('drag'); });
stage.addEventListener('wheel', e => {
  e.preventDefault();
  const r = stage.getBoundingClientRect(), cx = e.clientX-r.left, cy = e.clientY-r.top;
  const nx = (cx-tx)/s, ny = (cy-ty)/s;
  s = Math.min(base*3.2, Math.max(base, s * (e.deltaY > 0 ? 0.94 : 1.06)));
  tx = cx - nx*s; ty = cy - ny*s;
  paint();
}, {passive:false});
document.getElementById('p-fill').onclick = e => setPreset('fill', e.currentTarget);
document.getElementById('p-fit').onclick = e => setPreset('fit', e.currentTarget);
document.getElementById('p-top').onclick = e => setPreset('top', e.currentTarget);
document.getElementById('p-face').onclick = e => setPreset('face', e.currentTarget);
document.getElementById('reset').onclick = () => setPreset('fill', document.getElementById('p-fill'));
window.addEventListener('resize', () => { layoutBox(); base = Math.max(box.w/nat.w, box.h/nat.h); syncZoomRange(); paint(); });
lucide.createIcons({nameAttr:'data-lucide', attrs:{'stroke-width':1.75}});

// La tapa que ya muestra el título no necesita que la app lo repita:
// se oculta el h1 del héroe y el kicker toma su lugar.
const dup = document.getElementById('dup');
const phone = document.querySelector('.phone');
function syncDup(){
  phone.classList.toggle('notitle', dup.checked);
  dup.parentElement.classList.toggle('on', dup.checked);
}
dup.onchange = syncDup;
document.querySelectorAll('.cchip').forEach(b => b.addEventListener('click', () => {
  dup.checked = b.dataset.hastitle === '1';
  syncDup();
}));
// sembrar del chip que ya está activo, no del default del HTML
const active = document.querySelector('.cchip.on');
if (active) { dup.checked = active.dataset.hastitle === '1'; applyBook(active); }
syncDup();
