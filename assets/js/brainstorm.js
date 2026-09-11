(function(){
'use strict';

var STORAGE_KEY = 'brainstorm-board-v1';
var SVG_NS = 'http://www.w3.org/2000/svg';
var MIN_ZOOM = 0.2, MAX_ZOOM = 2.5;
var DEFAULT_W = 220, DEFAULT_H = 56;

var PALETTE = [
  { key:'slate',  hex:'#7c828c' },
  { key:'amber',  hex:'#e3a13a' },
  { key:'rust',   hex:'#c9694a' },
  { key:'teal',   hex:'#3f9f95' },
  { key:'indigo', hex:'#6d7fc9' },
  { key:'moss',   hex:'#8ba888' }
];

var state = {
  title: '無題のボード',
  nodes: [],
  edges: [],
  pan: { x: 0, y: 0 },
  zoom: 1
};

var nodesById = new Map();
var edgesById = new Map();
var nodeElsById = new Map();
var edgeElsById = new Map();

var selectedNodeIds = new Set();
var selectedEdgeId = null;

var interaction = null;
var spaceDown = false;
var previewPathEl = null;
var selectRectEl = null;
var lastHoverEl = null;

// ---------- DOM refs ----------
var viewport, world, edgesG, nodesLayer, emptyHintEl;
var nodeToolbarEl, helpPopEl, boardTitleInput, zoomValueEl;
var btnAddNode, btnFit, btnZoomIn, btnZoomOut, btnExport, btnImport, btnClear, btnHelp, importInput;

document.addEventListener('DOMContentLoaded', init);

function init(){
  viewport = document.getElementById('viewport');
  world = document.getElementById('world');
  edgesG = document.getElementById('edges-g');
  nodesLayer = document.getElementById('nodes-layer');
  emptyHintEl = document.getElementById('empty-hint');
  nodeToolbarEl = document.getElementById('node-toolbar');
  helpPopEl = document.getElementById('help-pop');
  boardTitleInput = document.getElementById('board-title');
  zoomValueEl = document.getElementById('zoom-value');
  btnAddNode = document.getElementById('btn-add-node');
  btnFit = document.getElementById('btn-fit');
  btnZoomIn = document.getElementById('btn-zoom-in');
  btnZoomOut = document.getElementById('btn-zoom-out');
  btnExport = document.getElementById('btn-export');
  btnImport = document.getElementById('btn-import');
  btnClear = document.getElementById('btn-clear');
  btnHelp = document.getElementById('btn-help');
  importInput = document.getElementById('import-input');

  buildNodeToolbar();
  wireGlobalEvents();

  var fresh = loadState();
  rebuildIndexes();
  renderAll();
  if(fresh){ fitView(); } else { applyTransform(); }
}

// ================= persistence =================

function loadState(){
  var raw = null;
  try{ raw = localStorage.getItem(STORAGE_KEY); }catch(err){}
  if(raw){
    try{
      var data = JSON.parse(raw);
      state.title = data.title || '無題のボード';
      state.nodes = Array.isArray(data.nodes) ? data.nodes : [];
      state.edges = Array.isArray(data.edges) ? data.edges : [];
      state.pan = (data.pan && typeof data.pan.x === 'number') ? data.pan : { x:0, y:0 };
      state.zoom = typeof data.zoom === 'number' ? data.zoom : 1;
      state.nodes.forEach(function(n){
        n.w = n.w || DEFAULT_W;
        n.h = n.h || DEFAULT_H;
        n.color = n.color || PALETTE[0].hex;
        n.text = n.text || '';
        if(n.autoHeight === undefined) n.autoHeight = true;
        n.x = n.x || 0; n.y = n.y || 0;
      });
      return false;
    }catch(err){ /* corrupt data -> fall through to seed */ }
  }
  seedExample();
  return true;
}

function saveState(){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      title: state.title,
      nodes: state.nodes,
      edges: state.edges,
      pan: state.pan,
      zoom: state.zoom
    }));
  }catch(err){ /* storage unavailable - board still works this session */ }
}

function seedExample(){
  var a = { id: uid(), x: -40,  y: -40,  w: DEFAULT_W, h: DEFAULT_H, text: 'メインテーマ',     color: PALETTE[1].hex, autoHeight: true };
  var b = { id: uid(), x: 300,  y: -150, w: DEFAULT_W, h: DEFAULT_H, text: 'サブアイデア A', color: PALETTE[0].hex, autoHeight: true };
  var c = { id: uid(), x: 300,  y: 60,   w: DEFAULT_W, h: DEFAULT_H, text: 'サブアイデア B', color: PALETTE[0].hex, autoHeight: true };
  state.title = '無題のボード';
  state.nodes = [a, b, c];
  state.edges = [
    { id: uid(), from: a.id, to: b.id },
    { id: uid(), from: a.id, to: c.id }
  ];
  state.pan = { x:0, y:0 };
  state.zoom = 1;
}

function rebuildIndexes(){
  nodesById.clear();
  state.nodes.forEach(function(n){ nodesById.set(n.id, n); });
  edgesById.clear();
  state.edges.forEach(function(e){ edgesById.set(e.id, e); });
}

// ================= helpers =================

function uid(){
  if(window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }
function getNode(id){ return nodesById.get(id); }
function getEdge(id){ return edgesById.get(id); }
function nodeEl(id){ return nodeElsById.get(id); }

function clientToViewport(e){
  var r = viewport.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}
function screenToWorld(pt){
  return { x: (pt.x - state.pan.x) / state.zoom, y: (pt.y - state.pan.y) / state.zoom };
}
function worldToScreen(pt){
  return { x: pt.x * state.zoom + state.pan.x, y: pt.y * state.zoom + state.pan.y };
}

function findNodeAtWorldPoint(x, y, excludeId){
  for(var i = state.nodes.length - 1; i >= 0; i--){
    var n = state.nodes[i];
    if(excludeId && n.id === excludeId) continue;
    if(x >= n.x && x <= n.x + n.w && y >= n.y && y <= n.y + n.h) return n;
  }
  return null;
}

function edgeExists(a, b){
  return state.edges.some(function(e){
    return (e.from === a && e.to === b) || (e.from === b && e.to === a);
  });
}

// ================= transform / view =================

function applyTransform(){
  world.style.transform = 'translate(' + state.pan.x + 'px, ' + state.pan.y + 'px) scale(' + state.zoom + ')';
  var size = Math.max(6, 18 * state.zoom);
  viewport.style.backgroundPosition = state.pan.x + 'px ' + state.pan.y + 'px';
  viewport.style.backgroundSize = size + 'px ' + size + 'px';
  zoomValueEl.textContent = Math.round(state.zoom * 100) + '%';
  if(selectedNodeIds.size) positionNodeToolbar();
}

function zoomAt(cx, cy, newZoomRaw){
  var newZoom = clamp(newZoomRaw, MIN_ZOOM, MAX_ZOOM);
  var worldPoint = screenToWorld({ x: cx, y: cy });
  state.zoom = newZoom;
  state.pan.x = cx - worldPoint.x * newZoom;
  state.pan.y = cy - worldPoint.y * newZoom;
  applyTransform();
}

function zoomAtCenter(factor){
  var vr = viewport.getBoundingClientRect();
  zoomAt(vr.width / 2, vr.height / 2, state.zoom * factor);
}

function fitView(){
  var vr = viewport.getBoundingClientRect();
  if(state.nodes.length === 0){
    state.pan = { x: vr.width/2 - 40, y: vr.height/2 - 40 };
    state.zoom = 1;
    applyTransform();
    return;
  }
  var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  state.nodes.forEach(function(n){
    minX = Math.min(minX, n.x); minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.w); maxY = Math.max(maxY, n.y + n.h);
  });
  var pad = 80;
  var bw = Math.max(1, (maxX - minX) + pad*2), bh = Math.max(1, (maxY - minY) + pad*2);
  var scale = Math.min(vr.width / bw, vr.height / bh);
  scale = clamp(scale, MIN_ZOOM, 1.4);
  var cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  state.zoom = scale;
  state.pan.x = vr.width/2 - cx*scale;
  state.pan.y = vr.height/2 - cy*scale;
  applyTransform();
}

// ================= rendering =================

function renderAll(){
  nodesLayer.innerHTML = '';
  nodeElsById.clear();
  edgesG.innerHTML = '';
  edgeElsById.clear();

  state.nodes.forEach(function(n){ nodesLayer.appendChild(renderNodeEl(n)); });
  state.nodes.forEach(function(n){ measureAndStoreHeight(n); });
  state.edges.forEach(function(e){ renderEdgeEl(e); });

  boardTitleInput.value = state.title || '無題のボード';
  updateEmptyHint();
  applyTransform();
}

function updateEmptyHint(){
  emptyHintEl.classList.toggle('hidden', state.nodes.length > 0);
}

function renderNodeEl(node){
  var el = document.createElement('div');
  el.className = 'node';
  el.dataset.id = node.id;
  el.style.left = node.x + 'px';
  el.style.top = node.y + 'px';
  el.style.width = node.w + 'px';
  el.style.setProperty('--node-color', node.color);
  if(node.autoHeight === false){
    el.classList.add('is-fixed-size');
    el.style.height = node.h + 'px';
  }

  var text = document.createElement('div');
  text.className = 'node-text';
  text.contentEditable = 'false';
  text.setAttribute('data-placeholder', '内容を入力');
  text.textContent = node.text || '';
  el.appendChild(text);

  ['n','s','e','w'].forEach(function(dir){
    var port = document.createElement('span');
    port.className = 'node-port ' + dir;
    port.dataset.dir = dir;
    el.appendChild(port);
  });

  var resize = document.createElement('span');
  resize.className = 'node-resize';
  el.appendChild(resize);

  wireNodeEvents(el, node, text, resize);

  nodeElsById.set(node.id, el);
  return el;
}

function updateNodePosition(node){
  var el = nodeEl(node.id);
  if(!el) return;
  el.style.left = node.x + 'px';
  el.style.top = node.y + 'px';
}

function measureAndStoreHeight(node){
  if(node.autoHeight === false) return;
  var el = nodeEl(node.id);
  if(!el) return;
  var h = el.getBoundingClientRect().height / state.zoom;
  if(h > 0 && Math.abs(h - node.h) > 0.5){
    node.h = h;
    updateEdgesForNode(node.id);
  }
}

function renderSelectionClasses(){
  nodeElsById.forEach(function(el, id){
    el.classList.toggle('is-selected', selectedNodeIds.has(id));
  });
  edgeElsById.forEach(function(g, id){
    var isSel = id === selectedEdgeId;
    g.classList.toggle('is-selected', isSel);
    var vis = g.querySelector('.edge');
    if(vis) vis.setAttribute('marker-end', isSel ? 'url(#arrow-selected)' : 'url(#arrow)');
  });
}

// ---------- edges ----------

function borderPoint(node, towardX, towardY){
  var cx = node.x + node.w/2, cy = node.y + node.h/2;
  var dx = towardX - cx, dy = towardY - cy;
  if(dx === 0 && dy === 0){ dx = 1; dy = 0; }
  var halfW = node.w/2, halfH = node.h/2;
  var scale = Math.min(halfW / Math.abs(dx || 1e-6), halfH / Math.abs(dy || 1e-6));
  return { x: cx + dx*scale, y: cy + dy*scale };
}

function curvedPath(p1, p2){
  var dx = p2.x - p1.x, dy = p2.y - p1.y;
  var cx1, cy1, cx2, cy2;
  if(Math.abs(dx) >= Math.abs(dy)){
    var offX = Math.max(40, Math.abs(dx) * 0.5);
    var sx = dx >= 0 ? 1 : -1;
    cx1 = p1.x + sx*offX; cy1 = p1.y;
    cx2 = p2.x - sx*offX; cy2 = p2.y;
  } else {
    var offY = Math.max(40, Math.abs(dy) * 0.5);
    var sy = dy >= 0 ? 1 : -1;
    cx1 = p1.x; cy1 = p1.y + sy*offY;
    cx2 = p2.x; cy2 = p2.y - sy*offY;
  }
  return 'M ' + p1.x + ' ' + p1.y + ' C ' + cx1 + ' ' + cy1 + ', ' + cx2 + ' ' + cy2 + ', ' + p2.x + ' ' + p2.y;
}

function pathFor(fromNode, toNode){
  var c1 = { x: fromNode.x + fromNode.w/2, y: fromNode.y + fromNode.h/2 };
  var c2 = { x: toNode.x + toNode.w/2, y: toNode.y + toNode.h/2 };
  var p1 = borderPoint(fromNode, c2.x, c2.y);
  var p2 = borderPoint(toNode, c1.x, c1.y);
  return curvedPath(p1, p2);
}

function renderEdgeEl(edge){
  var g = document.createElementNS(SVG_NS, 'g');
  g.dataset.id = edge.id;
  g.classList.add('edge-group');

  var hit = document.createElementNS(SVG_NS, 'path');
  hit.classList.add('edge-hit');
  var vis = document.createElementNS(SVG_NS, 'path');
  vis.classList.add('edge');
  vis.setAttribute('marker-end', 'url(#arrow)');

  [hit, vis].forEach(function(p){
    p.addEventListener('pointerdown', function(e){
      e.stopPropagation();
      selectEdge(edge.id);
    });
  });

  g.appendChild(hit);
  g.appendChild(vis);
  edgesG.appendChild(g);
  edgeElsById.set(edge.id, g);
  updateEdgeGeometry(edge.id);
}

function updateEdgeGeometry(id){
  var edge = getEdge(id);
  if(!edge) return;
  var from = getNode(edge.from), to = getNode(edge.to);
  if(!from || !to) return;
  var d = pathFor(from, to);
  var g = edgeElsById.get(id);
  if(!g) return;
  g.querySelectorAll('path').forEach(function(p){ p.setAttribute('d', d); });
}

function updateEdgesForNode(nodeId){
  state.edges.forEach(function(e){
    if(e.from === nodeId || e.to === nodeId) updateEdgeGeometry(e.id);
  });
}

function addEdge(fromId, toId){
  var edge = { id: uid(), from: fromId, to: toId };
  state.edges.push(edge);
  edgesById.set(edge.id, edge);
  renderEdgeEl(edge);
  return edge;
}

function removeEdgeEl(id){
  var g = edgeElsById.get(id);
  if(g) g.remove();
  edgeElsById.delete(id);
}

function deleteEdge(id){
  removeEdgeEl(id);
  state.edges = state.edges.filter(function(e){ return e.id !== id; });
  edgesById.delete(id);
  if(selectedEdgeId === id) selectedEdgeId = null;
}

function deleteNode(id){
  var toRemove = state.edges.filter(function(e){ return e.from === id || e.to === id; }).map(function(e){ return e.id; });
  toRemove.forEach(removeEdgeEl);
  state.edges = state.edges.filter(function(e){ return e.from !== id && e.to !== id; });
  toRemove.forEach(function(eid){ edgesById.delete(eid); });

  var el = nodeEl(id);
  if(el) el.remove();
  nodeElsById.delete(id);
  state.nodes = state.nodes.filter(function(n){ return n.id !== id; });
  nodesById.delete(id);
  selectedNodeIds.delete(id);
}

// ================= selection =================

function setSelection(ids){
  selectedNodeIds = new Set(ids);
  selectedEdgeId = null;
  renderSelectionClasses();
  positionNodeToolbar();
}
function toggleSelect(id){
  if(selectedNodeIds.has(id)) selectedNodeIds.delete(id);
  else selectedNodeIds.add(id);
  selectedEdgeId = null;
  renderSelectionClasses();
  positionNodeToolbar();
}
function clearSelection(){
  selectedNodeIds.clear();
  selectedEdgeId = null;
  renderSelectionClasses();
  nodeToolbarEl.classList.add('hidden');
}
function selectEdge(id){
  selectedNodeIds.clear();
  selectedEdgeId = id;
  renderSelectionClasses();
  nodeToolbarEl.classList.add('hidden');
}

function deleteSelection(){
  if(selectedEdgeId){
    deleteEdge(selectedEdgeId);
    saveState();
    return;
  }
  if(selectedNodeIds.size){
    Array.from(selectedNodeIds).forEach(deleteNode);
    selectedNodeIds.clear();
    nodeToolbarEl.classList.add('hidden');
    updateEmptyHint();
    saveState();
  }
}

function duplicateSelected(){
  if(!selectedNodeIds.size) return;
  var offset = 28;
  var idMap = {};
  var newIds = [];
  var ids = Array.from(selectedNodeIds);
  ids.forEach(function(id){
    var n = getNode(id);
    var copy = {
      id: uid(), x: n.x + offset, y: n.y + offset, w: n.w, h: n.h,
      text: n.text, color: n.color, autoHeight: n.autoHeight
    };
    state.nodes.push(copy);
    nodesById.set(copy.id, copy);
    nodesLayer.appendChild(renderNodeEl(copy));
    measureAndStoreHeight(copy);
    idMap[id] = copy.id;
    newIds.push(copy.id);
  });
  state.edges.forEach(function(e){
    if(idMap[e.from] && idMap[e.to]) addEdge(idMap[e.from], idMap[e.to]);
  });
  setSelection(newIds);
  updateEmptyHint();
  saveState();
}

function applyColorToSelection(hex){
  selectedNodeIds.forEach(function(id){
    var n = getNode(id);
    n.color = hex;
    var el = nodeEl(id);
    if(el) el.style.setProperty('--node-color', hex);
  });
  updateToolbarActiveSwatch();
  saveState();
}

// ================= node creation =================

function createNodeAt(wx, wy, centered, text){
  var w = DEFAULT_W;
  var node = {
    id: uid(),
    x: centered ? wx - w/2 : wx,
    y: centered ? wy - 28 : wy,
    w: w, h: DEFAULT_H,
    text: text || '',
    color: PALETTE[0].hex,
    autoHeight: true
  };
  state.nodes.push(node);
  nodesById.set(node.id, node);
  nodesLayer.appendChild(renderNodeEl(node));
  measureAndStoreHeight(node);
  setSelection([node.id]);
  updateEmptyHint();
  saveState();
  return node;
}

function addNodeCentered(){
  var vr = viewport.getBoundingClientRect();
  var world = screenToWorld({ x: vr.width/2, y: vr.height/2 });
  var n = createNodeAt(world.x, world.y, true);
  requestAnimationFrame(function(){ startEditingNode(n.id); });
}

function startEditingNode(id){
  var el = nodeEl(id);
  if(!el) return;
  var textEl = el.querySelector('.node-text');
  textEl.contentEditable = 'true';
  el.classList.add('is-editing');
  textEl.focus();
  placeCaretAtEnd(textEl);
}

function placeCaretAtEnd(el){
  var range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  var sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

// ================= node toolbar (floating) =================

function buildNodeToolbar(){
  var html = PALETTE.map(function(p){
    return '<span class="swatch" data-color="' + p.hex + '" style="background:' + p.hex + ';color:' + p.hex + '" title="' + p.key + '"></span>';
  }).join('');
  html += '<span class="nt-sep"></span>' +
    '<button class="nt-btn" data-action="dup" title="複製 (⌘/Ctrl+D)">複製</button>' +
    '<button class="nt-btn danger" data-action="del" title="削除 (Delete)">削除</button>';
  nodeToolbarEl.innerHTML = html;

  nodeToolbarEl.addEventListener('pointerdown', function(e){ e.stopPropagation(); });
  nodeToolbarEl.addEventListener('click', function(e){
    var sw = e.target.closest('.swatch');
    if(sw){ applyColorToSelection(sw.dataset.color); return; }
    var btn = e.target.closest('[data-action]');
    if(!btn) return;
    if(btn.dataset.action === 'dup') duplicateSelected();
    if(btn.dataset.action === 'del') deleteSelection();
  });
}

function updateToolbarActiveSwatch(){
  var colors = new Set();
  selectedNodeIds.forEach(function(id){ colors.add(getNode(id).color); });
  var only = colors.size === 1 ? Array.from(colors)[0] : null;
  nodeToolbarEl.querySelectorAll('.swatch').forEach(function(s){
    s.classList.toggle('is-active', !!only && s.dataset.color === only);
  });
}

function positionNodeToolbar(){
  if(!selectedNodeIds.size){ nodeToolbarEl.classList.add('hidden'); return; }
  var minX = Infinity, minY = Infinity, maxX = -Infinity;
  selectedNodeIds.forEach(function(id){
    var n = getNode(id);
    if(!n) return;
    minX = Math.min(minX, n.x); minY = Math.min(minY, n.y); maxX = Math.max(maxX, n.x + n.w);
  });
  if(minX === Infinity) { nodeToolbarEl.classList.add('hidden'); return; }
  var topCenter = worldToScreen({ x: (minX + maxX)/2, y: minY });
  var vr = viewport.getBoundingClientRect();
  nodeToolbarEl.classList.remove('hidden');
  updateToolbarActiveSwatch();
  var tw = nodeToolbarEl.offsetWidth;
  var left = vr.left + topCenter.x - tw/2;
  var top = vr.top + topCenter.y - 46;
  left = clamp(left, 8, window.innerWidth - tw - 8);
  top = Math.max(48, top);
  nodeToolbarEl.style.left = left + 'px';
  nodeToolbarEl.style.top = top + 'px';
}

// ================= hover highlight during connect =================

function setHoverHighlight(el){
  if(lastHoverEl === el) return;
  if(lastHoverEl) lastHoverEl.classList.remove('is-connect-target');
  lastHoverEl = el;
  if(lastHoverEl) lastHoverEl.classList.add('is-connect-target');
}
function clearHoverHighlight(){ setHoverHighlight(null); }

// ================= node event wiring =================

function wireNodeEvents(el, node, textEl, resizeEl){
  el.addEventListener('pointerdown', function(e){
    if(e.button !== 0) return;
    if(e.target.closest('.node-port') || e.target.closest('.node-resize')) return;
    if(el.classList.contains('is-editing')) return;
    e.stopPropagation();
    var id = node.id;
    if(e.shiftKey){
      toggleSelect(id);
    } else if(!selectedNodeIds.has(id)){
      setSelection([id]);
    }
    beginNodeDrag(e, id);
  });

  textEl.addEventListener('dblclick', function(e){
    e.stopPropagation();
    startEditingNode(node.id);
  });
  textEl.addEventListener('pointerdown', function(e){
    if(textEl.isContentEditable) e.stopPropagation();
  });
  textEl.addEventListener('keydown', function(e){
    e.stopPropagation();
    if(e.key === 'Escape'){ e.preventDefault(); textEl.blur(); }
  });
  textEl.addEventListener('input', function(){ measureAndStoreHeight(node); });
  textEl.addEventListener('blur', function(){
    textEl.contentEditable = 'false';
    el.classList.remove('is-editing');
    var val = textEl.innerText.replace(/\n+$/, '');
    node.text = val;
    textEl.textContent = val;
    measureAndStoreHeight(node);
    saveState();
  });

  el.querySelectorAll('.node-port').forEach(function(port){
    port.addEventListener('pointerdown', function(e){
      e.stopPropagation();
      e.preventDefault();
      beginConnectDrag(node.id, e);
    });
  });

  resizeEl.addEventListener('pointerdown', function(e){
    e.stopPropagation();
    e.preventDefault();
    beginResizeDrag(node.id, e);
  });
}

// ================= interaction: pan / select-rect on empty canvas =================

function wireGlobalEvents(){
  viewport.addEventListener('pointerdown', function(e){
    if(e.button === 1){ e.preventDefault(); beginPan(e); return; }
    if(e.button !== 0) return;
    if(spaceDown){ beginPan(e); return; }
    beginSelectRect(e);
  });

  viewport.addEventListener('dblclick', function(e){
    if(e.target.closest('.node')) return;
    var vp = clientToViewport(e);
    var world = screenToWorld(vp);
    var n = createNodeAt(world.x, world.y, true);
    requestAnimationFrame(function(){ startEditingNode(n.id); });
  });

  viewport.addEventListener('contextmenu', function(e){ e.preventDefault(); });

  viewport.addEventListener('wheel', function(e){
    e.preventDefault();
    if(e.ctrlKey || e.metaKey){
      var vp = clientToViewport(e);
      var factor = Math.exp(-e.deltaY * 0.01);
      zoomAt(vp.x, vp.y, state.zoom * factor);
    } else {
      state.pan.x -= e.deltaX;
      state.pan.y -= e.deltaY;
      applyTransform();
    }
  }, { passive: false });

  window.addEventListener('pointermove', onWindowPointerMove);
  window.addEventListener('pointerup', onWindowPointerUp);

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', function(e){
    if(e.code === 'Space'){ spaceDown = false; viewport.classList.remove('is-space-down'); }
  });

  btnAddNode.addEventListener('click', addNodeCentered);
  btnFit.addEventListener('click', fitView);
  btnZoomIn.addEventListener('click', function(){ zoomAtCenter(1.2); });
  btnZoomOut.addEventListener('click', function(){ zoomAtCenter(1/1.2); });
  btnExport.addEventListener('click', exportBoard);
  btnImport.addEventListener('click', function(){ importInput.click(); });
  importInput.addEventListener('change', handleImportFile);
  btnClear.addEventListener('click', clearBoard);
  btnHelp.addEventListener('click', function(e){
    e.stopPropagation();
    helpPopEl.classList.toggle('hidden');
  });
  document.addEventListener('pointerdown', function(e){
    if(!helpPopEl.classList.contains('hidden') && !helpPopEl.contains(e.target) && e.target !== btnHelp){
      helpPopEl.classList.add('hidden');
    }
  }, true);

  boardTitleInput.addEventListener('change', function(){
    state.title = boardTitleInput.value.trim() || '無題のボード';
    boardTitleInput.value = state.title;
    saveState();
  });
  boardTitleInput.addEventListener('keydown', function(e){
    e.stopPropagation();
    if(e.key === 'Enter'){ e.preventDefault(); boardTitleInput.blur(); }
    if(e.key === 'Escape'){ boardTitleInput.blur(); }
  });

  window.addEventListener('beforeunload', saveState);
}

function onKeyDown(e){
  var ae = document.activeElement;
  var isEditable = ae && (ae.isContentEditable || ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA');

  if(e.code === 'Space' && !spaceDown && !isEditable){
    spaceDown = true;
    viewport.classList.add('is-space-down');
  }

  if(isEditable) return;

  if(e.key === 'Delete' || e.key === 'Backspace'){
    if(selectedNodeIds.size || selectedEdgeId){ e.preventDefault(); deleteSelection(); }
  } else if((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd'){
    if(selectedNodeIds.size){ e.preventDefault(); duplicateSelected(); }
  } else if(e.key === 'Escape'){
    if(interaction && interaction.mode === 'connect') cancelConnectInteraction();
    clearSelection();
    helpPopEl.classList.add('hidden');
  } else if(e.key.toLowerCase() === 'a' && !e.metaKey && !e.ctrlKey){
    addNodeCentered();
  } else if(e.key.toLowerCase() === 'f' && !e.metaKey && !e.ctrlKey){
    fitView();
  }
}

function beginPan(e){
  e.preventDefault();
  interaction = { mode: 'pan', startX: e.clientX, startY: e.clientY, startPanX: state.pan.x, startPanY: state.pan.y };
  viewport.classList.add('is-panning');
}

function beginSelectRect(e){
  var additive = e.shiftKey;
  if(!additive) clearSelection();
  var vp = clientToViewport(e);
  interaction = {
    mode: 'select-rect',
    startX: vp.x, startY: vp.y,
    additive: additive,
    baseSelection: new Set(selectedNodeIds)
  };
  selectRectEl = document.createElement('div');
  selectRectEl.className = 'select-rect';
  viewport.appendChild(selectRectEl);
}

function beginNodeDrag(e, primaryId){
  e.preventDefault();
  var ids = selectedNodeIds.size ? Array.from(selectedNodeIds) : [primaryId];
  var items = ids.map(function(id){
    var n = getNode(id);
    return { id: id, startX: n.x, startY: n.y };
  });
  interaction = { mode: 'drag-nodes', startX: e.clientX, startY: e.clientY, items: items, moved: false };
  ids.forEach(function(id){ var el = nodeEl(id); if(el) el.classList.add('is-dragging'); });
}

function beginConnectDrag(sourceId, e){
  interaction = {
    mode: 'connect', sourceId: sourceId,
    startClientX: e.clientX, startClientY: e.clientY,
    curX: e.clientX, curY: e.clientY
  };
  previewPathEl = document.createElementNS(SVG_NS, 'path');
  previewPathEl.classList.add('edge-preview');
  edgesG.appendChild(previewPathEl);
}

function beginResizeDrag(id, e){
  var node = getNode(id);
  interaction = {
    mode: 'resize', id: id,
    startX: e.clientX, startY: e.clientY,
    startW: node.w, startH: node.h
  };
}

function cancelConnectInteraction(){
  if(previewPathEl){ previewPathEl.remove(); previewPathEl = null; }
  clearHoverHighlight();
  interaction = null;
}

function onWindowPointerMove(e){
  if(!interaction) return;

  if(interaction.mode === 'pan'){
    state.pan.x = interaction.startPanX + (e.clientX - interaction.startX);
    state.pan.y = interaction.startPanY + (e.clientY - interaction.startY);
    applyTransform();

  } else if(interaction.mode === 'drag-nodes'){
    var dx = (e.clientX - interaction.startX) / state.zoom;
    var dy = (e.clientY - interaction.startY) / state.zoom;
    if(Math.abs(e.clientX - interaction.startX) > 2 || Math.abs(e.clientY - interaction.startY) > 2) interaction.moved = true;
    interaction.items.forEach(function(it){
      var n = getNode(it.id);
      if(!n) return;
      n.x = it.startX + dx;
      n.y = it.startY + dy;
      updateNodePosition(n);
      updateEdgesForNode(n.id);
    });
    if(interaction.moved) positionNodeToolbar();

  } else if(interaction.mode === 'connect'){
    interaction.curX = e.clientX; interaction.curY = e.clientY;
    var vp = clientToViewport(e);
    var world = screenToWorld(vp);
    var source = getNode(interaction.sourceId);
    if(source && previewPathEl){
      var p1 = borderPoint(source, world.x, world.y);
      previewPathEl.setAttribute('d', curvedPath(p1, world));
    }
    var target = findNodeAtWorldPoint(world.x, world.y, interaction.sourceId);
    setHoverHighlight(target ? nodeEl(target.id) : null);

  } else if(interaction.mode === 'select-rect'){
    var vp2 = clientToViewport(e);
    var x0 = Math.min(vp2.x, interaction.startX), x1 = Math.max(vp2.x, interaction.startX);
    var y0 = Math.min(vp2.y, interaction.startY), y1 = Math.max(vp2.y, interaction.startY);
    selectRectEl.style.left = x0 + 'px';
    selectRectEl.style.top = y0 + 'px';
    selectRectEl.style.width = (x1 - x0) + 'px';
    selectRectEl.style.height = (y1 - y0) + 'px';

    var wA = screenToWorld({ x: x0, y: y0 }), wB = screenToWorld({ x: x1, y: y1 });
    var hitIds = state.nodes.filter(function(n){
      return n.x < wB.x && n.x + n.w > wA.x && n.y < wB.y && n.y + n.h > wA.y;
    }).map(function(n){ return n.id; });

    var next = new Set(interaction.additive ? interaction.baseSelection : []);
    hitIds.forEach(function(id){ next.add(id); });
    selectedNodeIds = next;
    selectedEdgeId = null;
    renderSelectionClasses();

  } else if(interaction.mode === 'resize'){
    var rdx = (e.clientX - interaction.startX) / state.zoom;
    var rdy = (e.clientY - interaction.startY) / state.zoom;
    var node = getNode(interaction.id);
    if(node){
      node.w = clamp(interaction.startW + rdx, 160, 560);
      node.h = clamp(interaction.startH + rdy, 44, 640);
      node.autoHeight = false;
      var el = nodeEl(node.id);
      if(el){
        el.classList.add('is-fixed-size');
        el.style.width = node.w + 'px';
        el.style.height = node.h + 'px';
      }
      updateEdgesForNode(node.id);
    }
  }
}

function onWindowPointerUp(e){
  if(!interaction) return;
  var mode = interaction.mode;

  if(mode === 'pan'){
    viewport.classList.remove('is-panning');

  } else if(mode === 'drag-nodes'){
    interaction.items.forEach(function(it){
      var el = nodeEl(it.id);
      if(el) el.classList.remove('is-dragging');
    });
    saveState();

  } else if(mode === 'connect'){
    var moved = Math.hypot(e.clientX - interaction.startClientX, e.clientY - interaction.startClientY) > 6;
    cancelConnectPreviewOnly();
    clearHoverHighlight();
    if(moved){
      var vp = clientToViewport(e);
      var world = screenToWorld(vp);
      var target = findNodeAtWorldPoint(world.x, world.y, null);
      var source = interaction.sourceId;
      if(target && target.id !== source){
        if(!edgeExists(source, target.id)) addEdge(source, target.id);
        saveState();
      } else if(!target){
        var n = createNodeAt(world.x, world.y, true);
        addEdge(source, n.id);
        saveState();
        requestAnimationFrame(function(){ startEditingNode(n.id); });
      }
    }

  } else if(mode === 'select-rect'){
    if(selectRectEl){ selectRectEl.remove(); selectRectEl = null; }
    if(selectedNodeIds.size) positionNodeToolbar();

  } else if(mode === 'resize'){
    saveState();
  }

  interaction = null;
}

function cancelConnectPreviewOnly(){
  if(previewPathEl){ previewPathEl.remove(); previewPathEl = null; }
}

// ================= export / import / clear =================

function exportBoard(){
  var data = { version: 1, title: state.title, nodes: state.nodes, edges: state.edges };
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = (state.title || 'board').replace(/[\\/:*?"<>|]/g, '_') + '.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
}

function handleImportFile(e){
  var file = e.target.files[0];
  if(!file) return;
  var reader = new FileReader();
  reader.onload = function(){
    try{
      var data = JSON.parse(reader.result);
      if(!Array.isArray(data.nodes) || !Array.isArray(data.edges)) throw new Error('invalid');
      if(!confirm('現在のボードを置き換えて読み込みます。よろしいですか？')){ return; }
      state.title = data.title || '読み込んだボード';
      state.nodes = data.nodes.map(function(n){
        return {
          id: n.id || uid(),
          x: +n.x || 0, y: +n.y || 0,
          w: +n.w || DEFAULT_W, h: +n.h || DEFAULT_H,
          text: String(n.text || ''),
          color: n.color || PALETTE[0].hex,
          autoHeight: n.autoHeight !== false
        };
      });
      var idSet = new Set(state.nodes.map(function(n){ return n.id; }));
      state.edges = data.edges.filter(function(ed){ return idSet.has(ed.from) && idSet.has(ed.to); })
        .map(function(ed){ return { id: ed.id || uid(), from: ed.from, to: ed.to }; });
      rebuildIndexes();
      clearSelection();
      renderAll();
      fitView();
      saveState();
    }catch(err){
      alert('読み込みに失敗しました。ファイル形式を確認してください。');
    }finally{
      importInput.value = '';
    }
  };
  reader.readAsText(file);
}

function clearBoard(){
  if(!state.nodes.length && !state.edges.length) return;
  if(!confirm('ボードを空にします。元に戻せません。よろしいですか？')) return;
  state.nodes = [];
  state.edges = [];
  rebuildIndexes();
  clearSelection();
  renderAll();
  saveState();
}

})();
