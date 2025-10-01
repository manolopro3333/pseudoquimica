let centerArea;
let viewport;
let world;
let linesSvg;

document.addEventListener('DOMContentLoaded', function() {
    const toggleButton = document.getElementById('toggle-sidebar');
    const sidebar = document.getElementById('sidebar');
    centerArea = document.getElementById('center-area');
    viewport = document.getElementById('viewport');
    world = document.getElementById('world');
    linesSvg = document.getElementById('lines-svg');
    viewport.style.cursor = 'grab';


    const viewportWidth = viewport.clientWidth;
    const viewportHeight = viewport.clientHeight;
    panX = -1000 + viewportWidth / 2;
    panY = -1000 + viewportHeight / 2;
    updateWorldTransform();

    toggleButton.addEventListener('click', function() {
        sidebar.classList.toggle('hidden');
    });

    viewport.addEventListener('wheel', function(e) {
        e.preventDefault();
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        zoom *= zoomFactor;
        zoom = Math.max(0.1, Math.min(5, zoom)); 
        updateWorldTransform();
    });

    viewport.addEventListener('mousedown', function(e) {
        if (e.button === 0 && !draggedElement) {
            isPanning = true;
            lastPanX = e.clientX;
            lastPanY = e.clientY;
            viewport.style.cursor = 'grabbing';
        }
    });

    document.addEventListener('mousemove', function(e) {
        if (isPanning) {
            panX += e.clientX - lastPanX;
            panY += e.clientY - lastPanY;
            lastPanX = e.clientX;
            lastPanY = e.clientY;
            updateWorldTransform();
        }
    });

    document.addEventListener('mouseup', function() {
        if (isPanning) {
            isPanning = false;
            viewport.style.cursor = 'grab';
        }
    });


    viewport.addEventListener('touchstart', function(e) {
        if (draggedElement) return; 
        if (e.touches.length === 1) {

            isPanning = true;
            lastPanX = e.touches[0].clientX;
            lastPanY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {

            e.preventDefault();
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            initialDistance = Math.sqrt((touch1.clientX - touch2.clientX) ** 2 + (touch1.clientY - touch2.clientY) ** 2);
            initialZoom = zoom;
        }
    }, { passive: false });

    viewport.addEventListener('touchmove', function(e) {
        if (draggedElement) return;
        if (e.touches.length === 1 && isPanning) {

            e.preventDefault();
            panX += e.touches[0].clientX - lastPanX;
            panY += e.touches[0].clientY - lastPanY;
            lastPanX = e.touches[0].clientX;
            lastPanY = e.touches[0].clientY;
            updateWorldTransform();
        } else if (e.touches.length === 2) {

            e.preventDefault();
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const currentDistance = Math.sqrt((touch1.clientX - touch2.clientX) ** 2 + (touch1.clientY - touch2.clientY) ** 2);
            zoom = initialZoom * (currentDistance / initialDistance);
            zoom = Math.max(0.1, Math.min(5, zoom));
            updateWorldTransform();
        }
    }, { passive: false });

    viewport.addEventListener('touchend', function(e) {
        if (isPanning && e.touches.length === 0) {
            isPanning = false;
        }
    });
});


let panX = 0;
let panY = 0;
let zoom = 1;
let isPanning = false;
let lastPanX, lastPanY;
let initialDistance = 0;
let initialZoom = 1;

function updateWorldTransform() {
    world.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
}
