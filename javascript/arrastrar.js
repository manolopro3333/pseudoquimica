let draggedElement = null;
let offsetX = 0;
let offsetY = 0;
let draggedIndex = -1;
let isHydrogen = false;
let tempLine = null; 

function startDrag(e) {
    e.preventDefault();
    draggedElement = e.target;
    draggedIndex = -1;
    isHydrogen = false;
    if (draggedElement.textContent === 'C') {
        draggedIndex = atoms.findIndex(a => a.element === draggedElement);
    } else if (draggedElement.textContent === 'H') {
        draggedIndex = hidrogenos.indexOf(draggedElement);
        isHydrogen = true;
    } else {
        draggedIndex = atoms.findIndex(a => a.element === draggedElement);
    }
    const rect = centerArea.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;
    const worldX = (screenX - panX) / zoom;
    const worldY = (screenY - panY) / zoom;
    const elCenter = getCenter(draggedElement);
    offsetX = worldX - elCenter.x;
    offsetY = worldY - elCenter.y;
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchmove', drag, { passive: false });
    document.addEventListener('touchend', stopDrag);
}

function drag(e) {
    e.preventDefault();
    if (draggedElement) {
        const rect = centerArea.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        const screenX = clientX - rect.left;
        const screenY = clientY - rect.top;
        let worldX = (screenX - panX) / zoom;
        let worldY = (screenY - panY) / zoom;
        let newX = worldX - offsetX;
        let newY = worldY - offsetY;
        newX = Math.max(0, Math.min(MAX_POS, newX));
        newY = Math.max(0, Math.min(MAX_POS, newY));
        draggedElement.style.left = (newX - getSize(draggedElement)/2) + 'px';
        draggedElement.style.top = (newY - getSize(draggedElement)/2) + 'px';

        if (draggedIndex >= 0 && !isHydrogen) {
            for (let att of hydrogenAttachments) {
                if (att.cIndex === draggedIndex) {
                    const hEl = hidrogenos[att.hIndex];
                    if (hEl) {
                        const cCenter = getCenter(atoms[draggedIndex].element);
                        const offsetX = 40;
                        const offsetY = 0;
                        hEl.style.left = (cCenter.x + offsetX - getSize(hEl)/2) + 'px';
                        hEl.style.top = (cCenter.y + offsetY - getSize(hEl)/2) + 'px';
                    }
                }
            }
            const currentCenter = getCenter(draggedElement);
            const {closestK, closestTargetDist, targetX, targetY} = findClosestTarget(currentCenter.x, currentCenter.y);
            if (closestTargetDist < CONNECT_THRESHOLD && closestK !== -1) {
                if (!tempLine) {
                    tempLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    tempLine.setAttribute('stroke', 'gray');
                    tempLine.setAttribute('stroke-width', '2');
                    tempLine.setAttribute('stroke-dasharray', '5,5');
                    tempLine.setAttribute('stroke-linecap', 'round');
                    linesSvg.appendChild(tempLine);
                }
                const otherCenter = getCenter(atoms[closestK].element);
                tempLine.setAttribute('x1', otherCenter.x);
                tempLine.setAttribute('y1', otherCenter.y);
                tempLine.setAttribute('x2', targetX);
                tempLine.setAttribute('y2', targetY);
            } else if (tempLine) {
                if (tempLine && tempLine.parentNode === linesSvg) {
                    linesSvg.removeChild(tempLine);
                }
                tempLine = null;
            }
        } else if (isHydrogen) {
            const currentCenter = getCenter(draggedElement);
            let closestK = -1;
            let closestDist = Infinity;
            let targetX = null;
            let targetY = null;
        for (let k = 0; k < atoms.length; k++) {
            const cCenter = getCenter(atoms[k].element);
            const angles = getPrioritizedAngles();
            for (let angle of angles) {
                const tx = cCenter.x + HYDROGEN_BOND_LENGTH * Math.cos(angle);
                const ty = cCenter.y + HYDROGEN_BOND_LENGTH * Math.sin(angle);
                const d = Math.sqrt((currentCenter.x - tx)**2 + (currentCenter.y - ty)**2);
                if (d < closestDist) {
                    closestDist = d;
                    closestK = k;
                    targetX = tx;
                    targetY = ty;
                }
            }
        }
            if (closestDist < CONNECT_THRESHOLD && closestK !== -1) {
                if (!tempLine) {
                    tempLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    tempLine.setAttribute('stroke', 'gray');
                    tempLine.setAttribute('stroke-width', '2');
                    tempLine.setAttribute('stroke-dasharray', '5,5');
                    tempLine.setAttribute('stroke-linecap', 'round');
                    linesSvg.appendChild(tempLine);
                }
                const cCenter = getCenter(atoms[closestK].element);
                tempLine.setAttribute('x1', cCenter.x);
                tempLine.setAttribute('y1', cCenter.y);
                tempLine.setAttribute('x2', targetX);
                tempLine.setAttribute('y2', targetY);
            } else if (tempLine) {
                if (tempLine && tempLine.parentNode === linesSvg) {
                    linesSvg.removeChild(tempLine);
                }
                tempLine = null;
            }
        }
    }
}

function stopDrag() {
    if (draggedIndex >= 0 && !isHydrogen) {
        const draggedEl = atoms[draggedIndex].element;
        let finalCenter = getCenter(draggedEl);
        const {closestK, closestTargetDist, targetX, targetY} = findClosestTarget(finalCenter.x, finalCenter.y);
        let snapped = false;
        if (closestTargetDist < SNAP_THRESHOLD && closestK !== -1) {
            draggedEl.style.left = (targetX - getSize(draggedEl)/2) + 'px';
            draggedEl.style.top = (targetY - getSize(draggedEl)/2) + 'px';
            finalCenter.x = targetX;
            finalCenter.y = targetY;
            snapped = true;
        }
        if (closestTargetDist < CONNECT_THRESHOLD && closestK !== -1 && !isConnected(draggedIndex, closestK)) {
            addConnection(draggedIndex, closestK);
        }

        for (let k = 0; k < atoms.length; k++) {
            if (atoms[k].type !== 'C' || k === draggedIndex) continue;
            const otherCenter = getCenter(atoms[k].element);
            const dist = Math.sqrt((finalCenter.x - otherCenter.x)**2 + (finalCenter.y - otherCenter.y)**2);
            if (isConnected(draggedIndex, k)) {
                if (dist > DISCONNECT_THRESHOLD) {
                    removeConnection(draggedIndex, k);
                }
            } else if (dist < CONNECT_THRESHOLD && !snapped && k === closestK) {
            }
        }
    } else if (isHydrogen) {
        const draggedEl = hidrogenos[draggedIndex];
        let finalCenter = getCenter(draggedEl);
        let closestK = -1;
        let closestDist = Infinity;
        let targetX = null;
        let targetY = null;
        for (let k = 0; k < atoms.length; k++) {
            const cCenter = getCenter(atoms[k].element);
            const angles = getPrioritizedAngles();
            for (let angle of angles) {
                const tx = cCenter.x + HYDROGEN_BOND_LENGTH * Math.cos(angle);
                const ty = cCenter.y + HYDROGEN_BOND_LENGTH * Math.sin(angle);
                const d = Math.sqrt((finalCenter.x - tx)**2 + (finalCenter.y - ty)**2);
                if (d < closestDist) {
                    closestDist = d;
                    closestK = k;
                    targetX = tx;
                    targetY = ty;
                }
            }
        }
        let snapped = false;
        if (closestDist < SNAP_THRESHOLD && closestK !== -1) {
            draggedEl.style.left = (targetX - getSize(draggedEl)/2) + 'px';
            draggedEl.style.top = (targetY - getSize(draggedEl)/2) + 'px';
            finalCenter.x = targetX;
            finalCenter.y = targetY;
            snapped = true;
        }
        if (closestDist < CONNECT_THRESHOLD && closestK !== -1 && !hydrogenAttachments.some(a => a.hIndex === draggedIndex)) {
            hydrogenAttachments.push({hIndex: draggedIndex, cIndex: closestK});
        }

        for (let att of hydrogenAttachments) {
            if (att.hIndex === draggedIndex) {
                const cCenter = getCenter(atoms[att.cIndex].element);
                const dist = Math.sqrt((finalCenter.x - cCenter.x)**2 + (finalCenter.y - cCenter.y)**2);
                if (dist > DISCONNECT_THRESHOLD) {
                    hydrogenAttachments = hydrogenAttachments.filter(a => !(a.hIndex === draggedIndex && a.cIndex === att.cIndex));
                }
            }
        }
    }

    if (tempLine) {
        if (tempLine && tempLine.parentNode === linesSvg) {
            linesSvg.removeChild(tempLine);
        }
        tempLine = null;
    }

    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', stopDrag);
    document.removeEventListener('touchmove', drag);
    document.removeEventListener('touchend', stopDrag);
    draggedElement = null;
    draggedIndex = -1;
    isHydrogen = false;
    updateLines();
}
