// Pan and zoom functionality for the drawing area
let zoom = 1;
let panX = 0;
let panY = 0;
const world = document.getElementById('world');
const centerArea = document.getElementById('center-area');

function updateTransform() {
    world.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
    const linesSvg = document.getElementById('lines-svg');
    linesSvg.style.transform = world.style.transform;
}

function clampZoom() {
    zoom = Math.max(0.1, Math.min(2, zoom));
}

function clampPan() {
    const maxPanX = (2000 * zoom - centerArea.clientWidth) / 2;
    const maxPanY = (2000 * zoom - centerArea.clientHeight) / 2;
    panX = Math.max(-maxPanX, Math.min(maxPanX, panX));
    panY = Math.max(-maxPanY, Math.min(maxPanY, panY));
}

centerArea.addEventListener('wheel', function(e) {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const rect = centerArea.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const worldMouseX = (mouseX - panX) / zoom;
    const worldMouseY = (mouseY - panY) / zoom;
    zoom *= zoomFactor;
    clampZoom();
    panX = mouseX - worldMouseX * zoom;
    panY = mouseY - worldMouseY * zoom;
    clampPan();
    updateTransform();
});

let isPanning = false;
let panStartX, panStartY;

centerArea.addEventListener('mousedown', function(e) {
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) { 
        e.preventDefault();
        isPanning = true;
        panStartX = e.clientX - panX;
        panStartY = e.clientY - panY;
    }
});

document.addEventListener('mousemove', function(e) {
    if (isPanning) {
        panX = e.clientX - panStartX;
        panY = e.clientY - panStartY;
        clampPan();
        updateTransform();
    }
});

document.addEventListener('mouseup', function(e) {
    if (isPanning) {
        isPanning = false;
    }
});

// Initial update
updateTransform();
