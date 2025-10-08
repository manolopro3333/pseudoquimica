let atoms = []; 
let connections = [];
let hidrogenos = [];
let hydrogenAttachments = [];
let creatingConnection = false;

function getPrioritizedAngles() {
    return [0, Math.PI, Math.PI / 4, 3 * Math.PI / 4, 5 * Math.PI / 4, 7 * Math.PI / 4, Math.PI / 2, 3 * Math.PI / 2, Math.PI / 3, 2 * Math.PI / 3, 4 * Math.PI / 3, 5 * Math.PI / 3];
}


function tryCreateConnection(i, j) {
    if (creatingConnection) return;
    creatingConnection = true;
    try {
        addConnection(i, j);
    } finally {
        // retardo corto para proteger contra eventos repetidos inmediatos
        setTimeout(() => creatingConnection = false, 50);
    }
}

function findClosestTarget(currentX, currentY) {
    let closestK = -1;
    let closestTargetDist = Infinity;
    let targetX = null;
    let targetY = null;
    for (let k = 0; k < atoms.length; k++) {
        if (k === draggedIndex) continue;
        const otherCenter = getCenter(atoms[k].element);
        const angles = getPrioritizedAngles();
        for (let angle of angles) {
            const tx = otherCenter.x + BOND_LENGTH * Math.cos(angle);
            const ty = otherCenter.y + BOND_LENGTH * Math.sin(angle);
            let isFree = true;
            for (let m = 0; m < atoms.length; m++) {
                if (m === draggedIndex || m === k) continue;
                const oc = getCenter(atoms[m].element);
                const d = Math.sqrt((tx - oc.x)**2 + (ty - oc.y)**2);
                if (d < BOND_LENGTH - 10) {
                    isFree = false;
                    break;
                }
            }
            if (!isFree) continue;
            const d = Math.sqrt((currentX - tx)**2 + (currentY - ty)**2);
            if (d < closestTargetDist) {
                closestTargetDist = d;
                closestK = k;
                targetX = tx;
                targetY = ty;
            }
        }
    }
    return {closestK, closestTargetDist, targetX, targetY};
}

function isConnected(i, j) {
    const min = Math.min(i, j);
    const max = Math.max(i, j);
    return connections.some(c => (c.i === min && c.j === max));
}

function addConnection(i, j) {
    const min = Math.min(i, j);
    const max = Math.max(i, j);
    // si ya existe, no agregues otra
    const existing = connections.find(c => c.i === min && c.j === max);
    if (existing) return existing;
    const newConn = { i: min, j: max, type: 'single' };
    connections.push(newConn);
    normalizeConnections(); // opcional, por seguridad
    updateLines();
    return newConn;
}


function removeConnection(i, j) {
    const min = Math.min(i, j);
    const max = Math.max(i, j);
    connections = connections.filter(c => !(c.i === min && c.j === max));
    normalizeConnections();
    updateLines();
}

function detectCrossing(conn1, conn2) {
    return false;
}

function updateLines() {
    normalizeConnections();
    linesSvg.innerHTML = '';
    const existingToggle = document.querySelector('.bond-toggle');
    if (existingToggle) {
        existingToggle.remove();
    }
    for (let conn of connections) {
        const i = conn.i, j = conn.j;
        if (i < 0 || i >= atoms.length || j < 0 || j >= atoms.length) continue;
        const el1 = atoms[i].element;
        const el2 = atoms[j].element;
        if (el1 && el2) {
            const center1 = getCenter(el1);
            const center2 = getCenter(el2);
            const dx = center2.x - center1.x;
            const dy = center2.y - center1.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const ux = dx / length;
            const uy = dy / length;
            const perpX = -uy;
            const perpY = ux;
            let offset = 3;
            if (conn.type === 'double' || conn.type === 'triple') offset = 8;

            let linesToDraw = [];
            if (conn.type === 'single') {
                linesToDraw = [{x1: center1.x, y1: center1.y, x2: center2.x, y2: center2.y}];
            } else if (conn.type === 'double') {
                linesToDraw = [
                    {x1: center1.x + offset * perpX, y1: center1.y + offset * perpY, x2: center2.x + offset * perpX, y2: center2.y + offset * perpY},
                    {x1: center1.x - offset * perpX, y1: center1.y - offset * perpY, x2: center2.x - offset * perpX, y2: center2.y - offset * perpY}
                ];
            } else if (conn.type === 'triple') {
                linesToDraw = [
                    {x1: center1.x, y1: center1.y, x2: center2.x, y2: center2.y},
                    {x1: center1.x + offset * perpX, y1: center1.y + offset * perpY, x2: center2.x + offset * perpX, y2: center2.y + offset * perpY},
                    {x1: center1.x - offset * perpX, y1: center1.y - offset * perpY, x2: center2.x - offset * perpX, y2: center2.y - offset * perpY}
                ];
            }

            linesToDraw.forEach((lineData, index) => {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', lineData.x1);
                line.setAttribute('y1', lineData.y1);
                line.setAttribute('x2', lineData.x2);
                line.setAttribute('y2', lineData.y2);
                line.setAttribute('stroke', '#333');
                line.setAttribute('stroke-width', '1.5');
                line.setAttribute('stroke-linecap', 'round');
                line.setAttribute('data-i', i);
                line.setAttribute('data-j', j);
                line.style.pointerEvents = 'stroke';
                if (index === 0) { 
                    line.addEventListener('mouseenter', function(e) {
                        const existingToggle = document.querySelector('.bond-toggle');
                        if (existingToggle) existingToggle.remove();
                        const toggleBtn = document.createElement('div');
                        toggleBtn.className = 'bond-toggle';
                        toggleBtn.textContent = '→';
                        const midX = (center1.x + center2.x) / 2;
                        const midY = (center1.y + center2.y) / 2;
                        toggleBtn.style.left = (midX + 5) + 'px';
                        toggleBtn.style.top = (midY - 10) + 'px';
                        toggleBtn.style.opacity = '1';
                        toggleBtn.style.position = 'absolute';
                        toggleBtn.style.pointerEvents = 'auto';
                        toggleBtn.style.userSelect = 'none';
                        toggleBtn.style.transition = 'opacity 0.5s ease-out';
                        world.appendChild(toggleBtn);

                        toggleBtn.onclick = function() {
                            const ci = parseInt(line.getAttribute('data-i'));
                            const cj = parseInt(line.getAttribute('data-j'));
                            const connection = connections.find(c => c.i === ci && c.j === cj);
                            if (connection) {
                                if (connection.type === 'single') connection.type = 'double';
                                else if (connection.type === 'double') connection.type = 'triple';
                                else connection.type = 'single';
                                updateLines();
                            }
                            toggleBtn.style.opacity = '0';
                            setTimeout(() => {
                                if (toggleBtn.parentNode) toggleBtn.parentNode.removeChild(toggleBtn);
                            }, 500);
                        };

                        setTimeout(() => {
                            toggleBtn.style.opacity = '0';
                            setTimeout(() => {
                                if (toggleBtn.parentNode) toggleBtn.parentNode.removeChild(toggleBtn);
                            }, 500);
                        }, 2000);
                    });
                }
                linesSvg.appendChild(line);
            });
        }
    }

    for (let att of hydrogenAttachments) {
        if (att.hIndex < 0 || att.hIndex >= hidrogenos.length || att.cIndex < 0 || att.cIndex >= atoms.length) continue;
        const hEl = hidrogenos[att.hIndex];
        const cEl = atoms[att.cIndex].element;
        if (hEl && cEl) {
            const hCenter = getCenter(hEl);
            const cCenter = getCenter(cEl);
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', hCenter.x);
            line.setAttribute('y1', hCenter.y);
            line.setAttribute('x2', cCenter.x);
            line.setAttribute('y2', cCenter.y);
            line.setAttribute('stroke', '#333');
            line.setAttribute('stroke-width', '1.5');
            line.setAttribute('stroke-linecap', 'round');
            linesSvg.appendChild(line);
        }
    }
}

function connectionRank(type) {
    if (type === 'single') return 1;
    if (type === 'double') return 2;
    if (type === 'triple') return 3;
    return 1;
}

function normalizeConnections() {
    const map = new Map();
    for (const c of connections) {
        const key = `${c.i}-${c.j}`;
        const rank = connectionRank(c.type);
        if (!map.has(key) || rank > map.get(key).rank) {
            map.set(key, { i: c.i, j: c.j, type: c.type, rank });
        }
    }
    connections = Array.from(map.values()).map(o => ({ i: o.i, j: o.j, type: o.type }));
}


function countCarbonBonds(carbonIndex) {
    return connections.filter(c => c.i === carbonIndex || c.j === carbonIndex).reduce((sum, c) => {
        if (c.type === 'single') return sum + 1;
        if (c.type === 'double') return sum + 2;
        if (c.type === 'triple') return sum + 3;
        return sum + 1;
    }, 0);
}

function countBonds(index) {
    return connections.filter(c => c.i === index || c.j === index).reduce((sum, c) => {
        if (c.type === 'single') return sum + 1;
        if (c.type === 'double') return sum + 2;
        if (c.type === 'triple') return sum + 3;
        return sum + 1;
    }, 0);
}

function countAttachedHydrogens(carbonIndex) {
    return hydrogenAttachments.filter(a => a.cIndex === carbonIndex).reduce((sum, a) => {
        const hEl = hidrogenos[a.hIndex];
        if (hEl && hEl.classList.contains('grouped-hydrogen')) {
            const num = parseInt(hEl.textContent) || 0;
            return sum + num;
        } else {
            return sum + 1;
        }
    }, 0);
}

function addHydrogenToCarbon(carbonIndex) {
    const hEl = document.createElement('div');
    hEl.className = 'dragged-element';
    hEl.textContent = 'H';
    hEl.style.position = 'absolute';
    hEl.style.width = HYDROGEN_SIZE + 'px';
    hEl.style.height = HYDROGEN_SIZE + 'px';

    const cCenter = getCenter(atoms[carbonIndex].element);
    const angles = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2];
    let placed = false;
    for (let angle of angles) {
        const hx = cCenter.x + HYDROGEN_BOND_LENGTH * Math.cos(angle);
        const hy = cCenter.y + HYDROGEN_BOND_LENGTH * Math.sin(angle);
        let free = true;
        for (let other of atoms.map(a => a.element)) {
            const oc = getCenter(other);
            if (Math.sqrt((hx - oc.x) ** 2 + (hy - oc.y) ** 2) < HYDROGEN_SIZE) free = false;
        }
        for (let h of hidrogenos) {
            const hc = getCenter(h);
            if (Math.sqrt((hx - hc.x) ** 2 + (hy - hc.y) ** 2) < HYDROGEN_SIZE) free = false;
        }
        if (free) {
            hEl.style.left = (hx - HYDROGEN_SIZE / 2) + 'px';
            hEl.style.top = (hy - HYDROGEN_SIZE / 2) + 'px';
            placed = true;
            break;
        }
    }
    if (!placed) {
        hEl.style.left = (cCenter.x - HYDROGEN_SIZE / 2) + 'px';
        hEl.style.top = (cCenter.y - HYDROGEN_SIZE / 2 + HYDROGEN_BOND_LENGTH) + 'px';
    }
    hEl.addEventListener('mousedown', startDrag);
    hEl.addEventListener('touchstart', startDrag);
    hidrogenos.push(hEl);
    const hIndex = hidrogenos.length - 1;
    hydrogenAttachments.push({ hIndex, cIndex: carbonIndex });
    world.appendChild(hEl);
    hEl.addEventListener('dblclick', function() {
        const index = hidrogenos.indexOf(hEl);
        if (index > -1) {
            hidrogenos.splice(index, 1);
            hydrogenAttachments = hydrogenAttachments.filter(a => a.hIndex !== index);
            hydrogenAttachments.forEach(a => {
                if (a.hIndex > index) a.hIndex--;
            });
            world.removeChild(hEl);
            updateLines();
        }
    });
}

function removeHydrogenFromCarbon(carbonIndex) {
    const att = hydrogenAttachments.find(a => a.cIndex === carbonIndex);
    if (att) {
        const hEl = hidrogenos[att.hIndex];
        hidrogenos.splice(att.hIndex, 1);
        hydrogenAttachments = hydrogenAttachments.filter(a => a.hIndex !== att.hIndex);
        hydrogenAttachments.forEach(a => {
            if (a.hIndex > att.hIndex) a.hIndex--;
        });
        world.removeChild(hEl);
    }
}

function validateAndAdjustHydrogens() {
    let valid = true;
    for (let i = 0; i < atoms.length; i++) {
        if (atoms[i].type !== 'C') continue;
        const bonds = countCarbonBonds(i);
        const hs = countAttachedHydrogens(i);
        const total = bonds + hs;
        if (total > 4) {
            valid = false;
        } else if (total < 4) {
            const countToAdd = 4 - bonds;
            const attachments = hydrogenAttachments.filter(a => a.cIndex === i);
            if (attachments.length === 1 && hidrogenos[attachments[0].hIndex].classList.contains('grouped-hydrogen')) {
                const hEl = hidrogenos[attachments[0].hIndex];
                hEl.textContent = countToAdd + 'H';
            } else if (attachments.length >= 1 && attachments.length <= 3 && attachments.every(a => !hidrogenos[a.hIndex].classList.contains('grouped-hydrogen'))) {
                const missing = countToAdd - hs;
                if (missing === 1) {
                    addHydrogenToCarbon(i);
                } else {
                    const hEl = document.createElement('div');
                    hEl.className = 'dragged-element grouped-hydrogen';
                    hEl.textContent = missing + 'H';
                    hEl.style.position = 'absolute';
                    hEl.style.width = HYDROGEN_SIZE + 'px';
                    hEl.style.height = HYDROGEN_SIZE + 'px';
                    hEl.style.borderRadius = '50%';
                    hEl.style.backgroundColor = '#aaf';
                    hEl.style.color = '#003366';
                    hEl.style.display = 'flex';
                    hEl.style.alignItems = 'center';
                    hEl.style.justifyContent = 'center';
                    hEl.style.fontWeight = 'bold';
                    hEl.style.fontSize = '16px';
                    hEl.style.boxShadow = '0 0 5px rgba(0,0,0,0.3)';

                    const cCenter = getCenter(atoms[i].element);
                    const offsetX = 40;
                    const offsetY = 0;
                    hEl.style.left = (cCenter.x + offsetX - HYDROGEN_SIZE / 2) + 'px';
                    hEl.style.top = (cCenter.y + offsetY - HYDROGEN_SIZE / 2) + 'px';

                    hEl.addEventListener('mousedown', startDrag);
                    hEl.addEventListener('touchstart', startDrag);
                    hidrogenos.push(hEl);
                    const hIndex = hidrogenos.length - 1;
                    hydrogenAttachments.push({ hIndex, cIndex: i });
                    world.appendChild(hEl);
                    hEl.addEventListener('dblclick', function() {
                        const index = hidrogenos.indexOf(hEl);
                        if (index > -1) {
                            hidrogenos.splice(index, 1);
                            hydrogenAttachments = hydrogenAttachments.filter(a => a.hIndex !== index);
                            hydrogenAttachments.forEach(a => {
                                if (a.hIndex > index) a.hIndex--;
                            });
                            world.removeChild(hEl);
                            updateLines();
                        }
                    });
                }
            } else {
                while (countAttachedHydrogens(i) > 0) {
                    removeHydrogenFromCarbon(i);
                }
                const hEl = document.createElement('div');
                hEl.className = 'dragged-element grouped-hydrogen';
                hEl.textContent = countToAdd + 'H';
                hEl.style.position = 'absolute';
                hEl.style.width = HYDROGEN_SIZE + 'px';
                hEl.style.height = HYDROGEN_SIZE + 'px';
                hEl.style.borderRadius = '50%';
                hEl.style.backgroundColor = '#aaf';
                hEl.style.color = '#003366';
                hEl.style.display = 'flex';
                hEl.style.alignItems = 'center';
                hEl.style.justifyContent = 'center';
                hEl.style.fontWeight = 'bold';
                hEl.style.fontSize = '16px';
                hEl.style.boxShadow = '0 0 5px rgba(0,0,0,0.3)';

                const cCenter = getCenter(atoms[i].element);
                const offsetX = 40;
                const offsetY = 0;
                hEl.style.left = (cCenter.x + offsetX - HYDROGEN_SIZE / 2) + 'px';
                hEl.style.top = (cCenter.y + offsetY - HYDROGEN_SIZE / 2) + 'px';

                hEl.addEventListener('mousedown', startDrag);
                hEl.addEventListener('touchstart', startDrag);
                hidrogenos.push(hEl);
                const hIndex = hidrogenos.length - 1;
                hydrogenAttachments.push({ hIndex, cIndex: i });
                world.appendChild(hEl);
                hEl.addEventListener('dblclick', function() {
                    const index = hidrogenos.indexOf(hEl);
                    if (index > -1) {
                        hidrogenos.splice(index, 1);
                        hydrogenAttachments = hydrogenAttachments.filter(a => a.hIndex !== index);
                        hydrogenAttachments.forEach(a => {
                            if (a.hIndex > index) a.hIndex--;
                        });
                        world.removeChild(hEl);
                        updateLines();
                    }
                });
            }
        }
    }

    // Check valence for non-carbon atoms
    for (let i = 0; i < atoms.length; i++) {
        const bonds = countBonds(i);
        const valencia = getValencia(atoms[i].type);
        if (bonds > valencia) {
            valid = false;
        }
    }

    const uniqueConnections = [];
    connections.forEach(c => {
        if (c.i >= 0 && c.j >= 0 && c.i < atoms.length && c.j < atoms.length) {
            if (!uniqueConnections.some(u => (u.i === c.i && u.j === c.j) || (u.i === c.j && u.j === c.i))) {
                uniqueConnections.push(c);
            }
        }
    });
    connections = uniqueConnections;


    updateLines();
    return valid;
}
