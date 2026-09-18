/* ============================================================
   CROPIX v1.1 — script.js
   ============================================================ */

/* ============================================================
   State
   ============================================================ */
const state = {
    img: null,
    selection: { x: 0, y: 0, w: 0, h: 0 },
    isDragging: false,
    poses: [],
    selectedIndex: -1,
    autoAdd: true,
    zoom: 1,
    history: [],
    historyIndex: -1,
    activeHandle: null,
    snapThreshold: 6,
};

const el = {
    fileInput: document.getElementById('fileInput'),
    uploadZone: document.getElementById('uploadZone'),
    canvasArea: document.getElementById('canvasArea'),
    canvas: document.getElementById('canvas'),
    canvasViewport: document.getElementById('canvasViewport'),
    canvasStatus: document.getElementById('canvasStatus'),
    gallery: document.getElementById('gallery'),
    galleryCount: document.getElementById('galleryCount'),
    statPos: document.getElementById('statPos'),
    statSize: document.getElementById('statSize'),
    statTotal: document.getElementById('statTotal'),
    autoAddToggle: document.getElementById('autoAddToggle'),
    toastStack: document.getElementById('toastStack'),
    zoomLabel: document.getElementById('zoomLabel'),
    undoBtn: document.getElementById('undoBtn'),
    redoBtn: document.getElementById('redoBtn'),
    deleteSelectionBtn: document.getElementById('deleteSelectionBtn'),
};

const ctx = el.canvas.getContext('2d');
const HANDLE_SIZE = 8;

/* ============================================================
   Upload
   ============================================================ */
el.uploadZone.addEventListener('click', () => el.fileInput.click());
el.fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) loadImage(file);
});

['dragenter', 'dragover'].forEach(evt => {
    el.uploadZone.addEventListener(evt, (e) => {
        e.preventDefault();
        el.uploadZone.classList.add('drag-over');
    });
});
['dragleave', 'drop'].forEach(evt => {
    el.uploadZone.addEventListener(evt, (e) => {
        e.preventDefault();
        el.uploadZone.classList.remove('drag-over');
    });
});
el.uploadZone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) loadImage(file);
});

document.addEventListener('paste', (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
        if (item.type.startsWith('image/')) {
            loadImage(item.getAsFile());
            break;
        }
    }
});

function loadImage(file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
            state.img = img;
            el.canvas.width = img.width;
            el.canvas.height = img.height;
            state.selection = { x: 0, y: 0, w: 0, h: 0 };
            state.poses = [];
            state.selectedIndex = -1;
            state.history = [];
            state.historyIndex = -1;
            el.uploadZone.style.display = 'none';
            el.canvasArea.classList.add('active');
            el.canvasStatus.textContent = `${img.width} × ${img.height}px`;
            pushHistory();
            fitToView();
            draw();
            updateStats();
            renderGallery();
            updateUndoRedoButtons();
            toast('Image loaded');
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
}

/* ============================================================
   History (Undo/Redo)
   ============================================================ */
function pushHistory() {
    state.history = state.history.slice(0, state.historyIndex + 1);
    state.history.push(JSON.stringify({
        poses: state.poses,
        selection: state.selection,
        selectedIndex: state.selectedIndex,
    }));
    state.historyIndex = state.history.length - 1;
    if (state.history.length > 50) {
        state.history.shift();
        state.historyIndex--;
    }
    updateUndoRedoButtons();
}

function applyHistory(snapshot) {
    const s = JSON.parse(snapshot);
    state.poses = s.poses;
    state.selection = s.selection;
    state.selectedIndex = s.selectedIndex;
    draw();
    updateStats();
    renderGallery();
    updateUndoRedoButtons();
}

function undo() {
    if (state.historyIndex <= 0) return;
    state.historyIndex--;
    applyHistory(state.history[state.historyIndex]);
    toast('Undo');
}

function redo() {
    if (state.historyIndex >= state.history.length - 1) return;
    state.historyIndex++;
    applyHistory(state.history[state.historyIndex]);
    toast('Redo');
}

function updateUndoRedoButtons() {
    el.undoBtn.disabled = state.historyIndex <= 0;
    el.redoBtn.disabled = state.historyIndex >= state.history.length - 1;
}

el.undoBtn.addEventListener('click', undo);
el.redoBtn.addEventListener('click', redo);

/* ============================================================
   Zoom & Pan
   ============================================================ */
function applyZoom() {
    if (!state.img) return;
    const w = state.img.width * state.zoom;
    const h = state.img.height * state.zoom;
    el.canvas.style.width = w + 'px';
    el.canvas.style.height = h + 'px';
    el.zoomLabel.textContent = Math.round(state.zoom * 100) + '%';
}

function setZoom(newZoom) {
    state.zoom = Math.max(0.1, Math.min(8, newZoom));
    applyZoom();
}

function zoomIn() { setZoom(state.zoom * 1.25); }
function zoomOut() { setZoom(state.zoom / 1.25); }

function fitToView() {
    if (!state.img) return;
    const vp = el.canvasViewport;
    const pad = 60;
    const availW = vp.clientWidth - pad;
    const availH = vp.clientHeight - pad;
    const scaleW = availW / state.img.width;
    const scaleH = availH / state.img.height;
    state.zoom = Math.min(scaleW, scaleH, 1);
    applyZoom();
    setTimeout(() => {
        vp.scrollLeft = (vp.scrollWidth - vp.clientWidth) / 2;
        vp.scrollTop = (vp.scrollHeight - vp.clientHeight) / 2;
    }, 0);
}

function resetZoom() {
    state.zoom = 1;
    applyZoom();
}

document.getElementById('zoomInBtn').addEventListener('click', zoomIn);
document.getElementById('zoomOutBtn').addEventListener('click', zoomOut);
document.getElementById('fitBtn').addEventListener('click', fitToView);
document.getElementById('resetZoomBtn').addEventListener('click', resetZoom);

el.canvasViewport.addEventListener('wheel', (e) => {
    if (!state.img) return;
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const oldZoom = state.zoom;
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom(state.zoom * delta);

        const vp = el.canvasViewport;
        const rect = vp.getBoundingClientRect();
        const mx = e.clientX - rect.left + vp.scrollLeft;
        const my = e.clientY - rect.top + vp.scrollTop;
        const scale = state.zoom / oldZoom;
        vp.scrollLeft = mx * scale - (e.clientX - rect.left);
        vp.scrollTop = my * scale - (e.clientY - rect.top);
    }
}, { passive: false });

/* ============================================================
   Draw
   ============================================================ */
function draw() {
    if (!state.img) return;
    ctx.clearRect(0, 0, el.canvas.width, el.canvas.height);
    ctx.drawImage(state.img, 0, 0);

    state.poses.forEach((p, i) => {
        const isSelected = state.selectedIndex === i;
        ctx.strokeStyle = isSelected ? '#2563eb' : 'rgba(37, 99, 235, 0.35)';
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.setLineDash(isSelected ? [] : [4, 4]);
        ctx.strokeRect(p.x + 0.5, p.y + 0.5, p.width - 1, p.height - 1);
        ctx.setLineDash([]);

        const badgeX = p.x + 6;
        const badgeY = p.y + 6;
        const badgeSize = 22;
        ctx.fillStyle = isSelected ? '#2563eb' : 'rgba(37, 99, 235, 0.85)';
        ctx.beginPath();
        roundRect(ctx, badgeX, badgeY, badgeSize, badgeSize, 6);
        ctx.fill();

        ctx.fillStyle = 'white';
        ctx.font = '600 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(i + 1), badgeX + badgeSize / 2, badgeY + badgeSize / 2 + 0.5);
    });

    const s = state.selection;
    if (s.w > 0 && s.h > 0) {
        ctx.fillStyle = 'rgba(10, 10, 11, 0.55)';
        ctx.fillRect(0, 0, el.canvas.width, el.canvas.height);
        ctx.clearRect(s.x, s.y, s.w, s.h);
        ctx.drawImage(state.img, s.x, s.y, s.w, s.h, s.x, s.y, s.w, s.h);

        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(s.x + 0.75, s.y + 0.75, s.w - 1.5, s.h - 1.5);

        const corners = [
            [s.x, s.y],
            [s.x + s.w, s.y],
            [s.x, s.y + s.h],
            [s.x + s.w, s.y + s.h],
        ];
        corners.forEach(([cx, cy]) => {
            ctx.fillStyle = 'white';
            ctx.strokeStyle = '#2563eb';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(cx, cy, HANDLE_SIZE / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        });

        const edges = [
            [s.x + s.w / 2, s.y],
            [s.x + s.w / 2, s.y + s.h],
            [s.x, s.y + s.h / 2],
            [s.x + s.w, s.y + s.h / 2],
        ];
        edges.forEach(([cx, cy]) => {
            ctx.fillStyle = 'white';
            ctx.strokeStyle = '#2563eb';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(cx, cy, HANDLE_SIZE / 2 - 1, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        });

        if (state.isDragging) {
            const label = `${Math.round(s.w)} × ${Math.round(s.h)}`;
            ctx.font = '500 11px "JetBrains Mono", monospace';
            const metrics = ctx.measureText(label);
            const padX = 8;
            const tw = metrics.width + padX * 2;
            const th = 20;
            let tx = s.x + s.w / 2 - tw / 2;
            let ty = s.y - th - 6;
            if (ty < 0) ty = s.y + s.h + 6;

            ctx.fillStyle = '#0a0a0b';
            ctx.beginPath();
            roundRect(ctx, tx, ty, tw, th, 6);
            ctx.fill();

            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, tx + tw / 2, ty + th / 2 + 0.5);
        }
    }
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

/* ============================================================
   Pointer interaction
   ============================================================ */
function getPointer(e) {
    const rect = el.canvas.getBoundingClientRect();
    const scaleX = el.canvas.width / rect.width;
    const scaleY = el.canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
    };
}

function getHandleAt(p) {
    const s = state.selection;
    if (s.w === 0 || s.h === 0) return null;
    const tolerance = HANDLE_SIZE;

    const handles = [
        { name: 'nw', x: s.x, y: s.y },
        { name: 'ne', x: s.x + s.w, y: s.y },
        { name: 'sw', x: s.x, y: s.y + s.h },
        { name: 'se', x: s.x + s.w, y: s.y + s.h },
        { name: 'n', x: s.x + s.w / 2, y: s.y },
        { name: 's', x: s.x + s.w / 2, y: s.y + s.h },
        { name: 'w', x: s.x, y: s.y + s.h / 2 },
        { name: 'e', x: s.x + s.w, y: s.y + s.h / 2 },
    ];

    for (const h of handles) {
        if (Math.abs(p.x - h.x) <= tolerance && Math.abs(p.y - h.y) <= tolerance) {
            return h.name;
        }
    }
    if (p.x >= s.x && p.x <= s.x + s.w && p.y >= s.y && p.y <= s.y + s.h) {
        return 'move';
    }
    return null;
}

function snapValue(value, dimension) {
    if (value < state.snapThreshold) return 0;
    if (Math.abs(value - dimension) < state.snapThreshold) return dimension;
    return value;
}

let dragMode = null;
let dragStart = null;
let startSelection = null;

function startPointer(p) {
    if (!state.img) return;

    const handle = getHandleAt(p);
    if (handle === 'move') {
        dragMode = 'move';
        dragStart = p;
        startSelection = { ...state.selection };
    } else if (handle) {
        dragMode = handle;
        dragStart = p;
        startSelection = { ...state.selection };
    } else {
        dragMode = 'new';
        dragStart = p;
        state.selection = { x: p.x, y: p.y, w: 0, h: 0 };
        state.selectedIndex = -1;
    }
    state.isDragging = true;
}

function movePointer(p) {
    if (!state.isDragging) return;

    if (dragMode === 'new') {
        let x = dragStart.x;
        let y = dragStart.y;
        let w = p.x - x;
        let h = p.y - y;
        if (w < 0) { x += w; w = -w; }
        if (h < 0) { y += h; h = -h; }

        const snappedX = snapValue(x, 0);
        const snappedY = snapValue(y, 0);
        const snappedRight = snapValue(x + w, el.canvas.width);
        const snappedBottom = snapValue(y + h, el.canvas.height);
        x = snappedX;
        y = snappedY;
        w = snappedRight - x;
        h = snappedBottom - y;

        x = Math.max(0, Math.min(x, el.canvas.width));
        y = Math.max(0, Math.min(y, el.canvas.height));
        w = Math.min(w, el.canvas.width - x);
        h = Math.min(h, el.canvas.height - y);

        state.selection = { x, y, w, h };
    } else if (dragMode === 'move') {
        const dx = p.x - dragStart.x;
        const dy = p.y - dragStart.y;
        let newX = startSelection.x + dx;
        let newY = startSelection.y + dy;
        newX = Math.max(0, Math.min(newX, el.canvas.width - startSelection.w));
        newY = Math.max(0, Math.min(newY, el.canvas.height - startSelection.h));
        state.selection = { x: newX, y: newY, w: startSelection.w, h: startSelection.h };
    } else {
        let { x, y, w, h } = startSelection;
        const right = x + w;
        const bottom = y + h;

        if (dragMode.includes('n')) {
            const newY = Math.max(0, Math.min(p.y, bottom - 1));
            y = newY;
            h = bottom - newY;
        }
        if (dragMode.includes('s')) {
            const newBottom = Math.min(el.canvas.height, Math.max(p.y, y + 1));
            h = newBottom - y;
        }
        if (dragMode.includes('w')) {
            const newX = Math.max(0, Math.min(p.x, right - 1));
            x = newX;
            w = right - newX;
        }
        if (dragMode.includes('e')) {
            const newRight = Math.min(el.canvas.width, Math.max(p.x, x + 1));
            w = newRight - x;
        }

        state.selection = { x, y, w, h };
    }

    draw();
    updateStats();
}

function endPointer() {
    if (!state.isDragging) return;
    state.isDragging = false;

    const s = state.selection;
    if (dragMode === 'new' && state.autoAdd && s.w >= 16 && s.h >= 16) {
        addPose();
    } else if ((dragMode === 'move' || (dragMode && dragMode.length <= 2 && dragMode !== 'new')) && state.selectedIndex >= 0 && state.poses[state.selectedIndex]) {
        const p = state.poses[state.selectedIndex];
        const changed = p.x !== s.x || p.y !== s.y || p.width !== s.w || p.height !== s.h;
        if (changed && s.w >= 4 && s.h >= 4) {
            const c = document.createElement('canvas');
            c.width = s.w;
            c.height = s.h;
            c.getContext('2d').drawImage(state.img, s.x, s.y, s.w, s.h, 0, 0, s.w, s.h);
            p.dataURL = c.toDataURL('image/png');
            p.x = s.x;
            p.y = s.y;
            p.width = Math.round(s.w);
            p.height = Math.round(s.h);
            pushHistory();
            renderGallery();
        }
    }

    dragMode = null;
    draw();
    updateStats();
}

el.canvas.addEventListener('mousedown', (e) => startPointer(getPointer(e)));
document.addEventListener('mousemove', (e) => { if (state.isDragging) movePointer(getPointer(e)); });
document.addEventListener('mouseup', endPointer);

el.canvas.addEventListener('touchstart', (e) => { e.preventDefault(); startPointer(getPointer(e)); }, { passive: false });
document.addEventListener('touchmove', (e) => { if (state.isDragging) { e.preventDefault(); movePointer(getPointer(e)); } }, { passive: false });
document.addEventListener('touchend', endPointer);

/* ============================================================
   Add pose
   ============================================================ */
function addPose() {
    const s = state.selection;
    const c = document.createElement('canvas');
    c.width = s.w;
    c.height = s.h;
    c.getContext('2d').drawImage(state.img, s.x, s.y, s.w, s.h, 0, 0, s.w, s.h);

    state.poses.push({
        dataURL: c.toDataURL('image/png'),
        width: Math.round(s.w),
        height: Math.round(s.h),
        x: s.x,
        y: s.y,
        name: `region-${String(state.poses.length + 1).padStart(2, '0')}`,
    });
    pushHistory();
    renderGallery();
    updateStats();
    toast(`Added region ${state.poses.length}`);
}

/* ============================================================
   Gallery
   ============================================================ */
function renderGallery() {
    el.galleryCount.textContent = `${state.poses.length} ${state.poses.length === 1 ? 'item' : 'items'}`;

    if (state.poses.length === 0) {
        el.gallery.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <path d="m21 15-5-5L5 21"></path>
                    </svg>
                </div>
                <div class="empty-state-title">No regions captured yet</div>
                <div class="empty-state-sub">Select an area on the canvas to begin</div>
            </div>
        `;
        return;
    }

    el.gallery.innerHTML = state.poses.map((p, i) => `
        <div class="pose-item ${state.selectedIndex === i ? 'selected' : ''}" data-i="${i}">
            <button class="pose-delete" data-delete="${i}" title="Delete">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
            <img class="pose-thumb" src="${p.dataURL}" alt="${p.name}">
            <div class="pose-meta">
                <span class="pose-name">${p.name}</span>
                <span class="pose-size">${p.width}×${p.height}</span>
            </div>
        </div>
    `).join('');

    el.gallery.querySelectorAll('.pose-item').forEach(node => {
        node.addEventListener('click', (e) => {
            if (e.target.closest('[data-delete]')) return;
            selectPose(parseInt(node.dataset.i));
        });
    });

    el.gallery.querySelectorAll('[data-delete]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deletePose(parseInt(btn.dataset.delete));
        });
    });
}

function selectPose(i) {
    state.selectedIndex = i;
    const p = state.poses[i];
    if (p) {
        state.selection = { x: p.x, y: p.y, w: p.width, h: p.height };
        draw();
        updateStats();
    }
    renderGallery();
}

function deletePose(i) {
    state.poses.splice(i, 1);
    state.poses.forEach((p, idx) => p.name = `region-${String(idx + 1).padStart(2, '0')}`);
    if (state.selectedIndex >= state.poses.length) state.selectedIndex = state.poses.length - 1;
    if (state.selectedIndex < 0 && state.poses.length > 0) state.selectedIndex = 0;
    pushHistory();
    renderGallery();
    updateStats();
    toast('Region deleted');
}

/* ============================================================
   Stats
   ============================================================ */
function updateStats() {
    const s = state.selection;
    if (s.w > 0 && s.h > 0) {
        el.statPos.textContent = `${Math.round(s.x)}, ${Math.round(s.y)}`;
        el.statSize.textContent = `${Math.round(s.w)} × ${Math.round(s.h)}`;
    } else {
        el.statPos.textContent = '—';
        el.statSize.textContent = '—';
    }
    el.statTotal.textContent = state.poses.length;
}

/* ============================================================
   Controls
   ============================================================ */
el.autoAddToggle.addEventListener('change', (e) => {
    state.autoAdd = e.target.checked;
    toast(e.target.checked ? 'Auto-add enabled' : 'Manual mode');
});

document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        if (!state.img) { toast('Upload an image first', true); return; }
        const size = parseInt(btn.dataset.size);
        const w = Math.min(size, state.img.width);
        const h = Math.min(size, state.img.height);
        const x = (state.img.width - w) / 2;
        const y = (state.img.height - h) / 2;
        state.selection = { x, y, w, h };
        state.selectedIndex = -1;
        draw();
        updateStats();
    });
});

document.getElementById('centerCropBtn').addEventListener('click', () => {
    if (!state.img) { toast('Upload an image first', true); return; }
    const size = Math.min(state.img.width, state.img.height);
    const x = (state.img.width - size) / 2;
    const y = (state.img.height - size) / 2;
    state.selection = { x, y, w: size, h: size };
    state.selectedIndex = -1;
    draw();
    updateStats();
});

el.deleteSelectionBtn.addEventListener('click', () => {
    if (state.selectedIndex >= 0) {
        deletePose(state.selectedIndex);
    } else {
        state.selection = { x: 0, y: 0, w: 0, h: 0 };
        draw();
        updateStats();
    }
});

document.getElementById('resetBtn').addEventListener('click', () => {
    if (!state.img) return;
    state.selection = { x: 0, y: 0, w: 0, h: 0 };
    state.selectedIndex = -1;
    draw();
    updateStats();
    renderGallery();
});

document.getElementById('clearBtn').addEventListener('click', () => {
    if (state.poses.length === 0) return;
    if (!confirm('Clear all captured regions?')) return;
    state.poses = [];
    state.selectedIndex = -1;
    state.selection = { x: 0, y: 0, w: 0, h: 0 };
    pushHistory();
    draw();
    updateStats();
    renderGallery();
    toast('All regions cleared');
});

/* ============================================================
   Export
   ============================================================ */
document.getElementById('exportBtn').addEventListener('click', async () => {
    if (state.poses.length === 0) { toast('No regions to export', true); return; }

    toast('Preparing export...');

    const zip = new JSZip();
    state.poses.forEach(p => {
        zip.file(`${p.name}.png`, p.dataURL.split(',')[1], { base64: true });
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cropix-${state.poses.length}-regions.zip`;
    a.click();
    toast(`Exported ${state.poses.length} regions`);
});

/* ============================================================
   Keyboard shortcuts
   ============================================================ */
document.addEventListener('keydown', (e) => {
    const isMod = e.ctrlKey || e.metaKey;

    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (isMod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
    }
    if (isMod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
        return;
    }

    if (isMod && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        document.getElementById('exportBtn').click();
        return;
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
        if (state.selectedIndex >= 0) {
            e.preventDefault();
            deletePose(state.selectedIndex);
        } else if (state.selection.w > 0) {
            e.preventDefault();
            state.selection = { x: 0, y: 0, w: 0, h: 0 };
            draw();
            updateStats();
        }
        return;
    }

    if (e.key === 'Escape') {
        state.selection = { x: 0, y: 0, w: 0, h: 0 };
        state.selectedIndex = -1;
        draw();
        updateStats();
        renderGallery();
        return;
    }

    if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomIn();
        return;
    }
    if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        zoomOut();
        return;
    }
    if (e.key === '0' && isMod) {
        e.preventDefault();
        resetZoom();
        return;
    }

    if (state.selection.w > 0 && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const s = state.selection;
        if (e.key === 'ArrowUp') s.y = Math.max(0, s.y - step);
        if (e.key === 'ArrowDown') s.y = Math.min(el.canvas.height - s.h, s.y + step);
        if (e.key === 'ArrowLeft') s.x = Math.max(0, s.x - step);
        if (e.key === 'ArrowRight') s.x = Math.min(el.canvas.width - s.w, s.x + step);
        draw();
        updateStats();
        return;
    }
});

/* ============================================================
   Toast
   ============================================================ */
function toast(msg, isError = false) {
    const t = document.createElement('div');
    t.className = 'toast' + (isError ? ' error' : '');
    t.innerHTML = `<span class="toast-dot"></span><span>${msg}</span>`;
    el.toastStack.appendChild(t);
    setTimeout(() => {
        t.style.transition = 'opacity 0.2s, transform 0.2s';
        t.style.opacity = '0';
        t.style.transform = 'translateX(20px)';
        setTimeout(() => t.remove(), 200);
    }, 2200);
}

/* ============================================================
   Init
   ============================================================ */
renderGallery();
updateStats();
updateUndoRedoButtons();