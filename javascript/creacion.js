const elements = document.querySelectorAll('.element');

function showErrorModal(message) {
    document.getElementById('error-message').textContent = message;
    document.getElementById('error-modal').style.display = 'flex';
}

document.querySelector('.close').addEventListener('click', function() {
    document.getElementById('error-modal').style.display = 'none';
});

window.addEventListener('click', function(event) {
    const modal = document.getElementById('error-modal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});

elements.forEach(element => {
    element.addEventListener('click', function(e) {
        const elementType = e.target.dataset.element;
        const size = elementType === 'H' ? HYDROGEN_SIZE : ELEMENT_SIZE;
        const newElement = document.createElement('div');
        newElement.className = 'dragged-element';
        newElement.textContent = elementType;
        newElement.style.position = 'absolute';
        newElement.style.width = size + 'px';
        newElement.style.height = size + 'px';
        world.appendChild(newElement);

        if (elementType === 'C' && atoms.filter(a => a.type === 'C').length >= MAX_CARBONS) {
            return;
        }

        if (elementType === 'C') {
            if (atoms.length === 0) {
                const centerX = (-panX + viewport.clientWidth / 2) / zoom;
                const centerY = (-panY + viewport.clientHeight / 2) / zoom;
                newElement.style.left = (centerX - size / 2) + 'px';
                newElement.style.top = (centerY - size / 2) + 'px';
                newElement.addEventListener('mousedown', startDrag);
                newElement.addEventListener('touchstart', startDrag);
                atoms.push({type: 'C', element: newElement});
                newElement.addEventListener('dblclick', function() {
                    const index = atoms.findIndex(a => a.element === newElement);
                    if (index > -1) {
                        atoms.splice(index, 1);
                        // Remove attached hydrogens
                        const attachedHAttachments = hydrogenAttachments.filter(a => a.cIndex === index);
                        const attachedHIndices = attachedHAttachments.map(a => a.hIndex).sort((a,b) => b - a);
                        attachedHIndices.forEach(hIdx => {
                            const hEl = hidrogenos[hIdx];
                            hidrogenos.splice(hIdx, 1);
                            world.removeChild(hEl);
                            hydrogenAttachments = hydrogenAttachments.filter(a => a.hIndex !== hIdx);
                            hydrogenAttachments.forEach(a => {
                                if (a.hIndex > hIdx) a.hIndex--;
                            });
                        });
                        // Adjust cIndex for remaining attachments
                        hydrogenAttachments = hydrogenAttachments.filter(a => a.cIndex !== index);
                        hydrogenAttachments.forEach(a => {
                            if (a.cIndex > index) a.cIndex--;
                        });
                        connections = connections.filter(c => c.i !== index && c.j !== index);
                        connections.forEach(c => {
                            if (c.i > index) c.i--;
                            if (c.j > index) c.j--;
                        });
                        world.removeChild(newElement);
                        updateLines();
                    }
                });
            } else {
                const minX = (-panX) / zoom;
                const minY = (-panY) / zoom;
                const maxX = minX + viewport.clientWidth / zoom - size;
                const maxY = minY + viewport.clientHeight / zoom - size;
                const x = Math.random() * (maxX - minX) + minX;
                const y = Math.random() * (maxY - minY) + minY;
                newElement.style.left = x + 'px';
                newElement.style.top = y + 'px';
                newElement.addEventListener('mousedown', startDrag);
                newElement.addEventListener('touchstart', startDrag);
                atoms.push({type: 'C', element: newElement});
                newElement.addEventListener('dblclick', function() {
                    const index = atoms.findIndex(a => a.element === newElement);
                    if (index > -1) {
                        atoms.splice(index, 1);
                        // Remove attached hydrogens
                        const attachedHAttachments = hydrogenAttachments.filter(a => a.cIndex === index);
                        const attachedHIndices = attachedHAttachments.map(a => a.hIndex).sort((a,b) => b - a);
                        attachedHIndices.forEach(hIdx => {
                            const hEl = hidrogenos[hIdx];
                            hidrogenos.splice(hIdx, 1);
                            world.removeChild(hEl);
                            hydrogenAttachments = hydrogenAttachments.filter(a => a.hIndex !== hIdx);
                            hydrogenAttachments.forEach(a => {
                                if (a.hIndex > hIdx) a.hIndex--;
                            });
                        });
                        // Adjust cIndex for remaining attachments
                        hydrogenAttachments = hydrogenAttachments.filter(a => a.cIndex !== index);
                        hydrogenAttachments.forEach(a => {
                            if (a.cIndex > index) a.cIndex--;
                        });
                        connections = connections.filter(c => c.i !== index && c.j !== index);
                        connections.forEach(c => {
                            if (c.i > index) c.i--;
                            if (c.j > index) c.j--;
                        });
                        world.removeChild(newElement);
                        updateLines();
                    }
                });
            }
        } else if (elementType === 'H') {
            const minX = (-panX) / zoom;
            const minY = (-panY) / zoom;
            const maxX = minX + viewport.clientWidth / zoom - size;
            const maxY = minY + viewport.clientHeight / zoom - size;
            const x = Math.random() * (maxX - minX) + minX;
            const y = Math.random() * (maxY - minY) + minY;
            newElement.style.left = x + 'px';
            newElement.style.top = y + 'px';
            newElement.addEventListener('mousedown', startDrag);
            newElement.addEventListener('touchstart', startDrag);
            hidrogenos.push(newElement);
            newElement.addEventListener('dblclick', function() {
                const index = hidrogenos.indexOf(newElement);
                if (index > -1) {
                    hidrogenos.splice(index, 1);
                    hydrogenAttachments = hydrogenAttachments.filter(a => a.hIndex !== index);
                    hydrogenAttachments.forEach(a => {
                        if (a.hIndex > index) a.hIndex--;
                    });
                    world.removeChild(newElement);
                    updateLines();
                }
            });
        } else {
            const minX = (-panX) / zoom;
            const minY = (-panY) / zoom;
            const maxX = minX + viewport.clientWidth / zoom - size;
            const maxY = minY + viewport.clientHeight / zoom - size;
            const x = Math.random() * (maxX - minX) + minX;
            const y = Math.random() * (maxY - minY) + minY;
            newElement.style.left = x + 'px';
            newElement.style.top = y + 'px';
            newElement.addEventListener('mousedown', startDrag);
            newElement.addEventListener('touchstart', startDrag);
            atoms.push({type: elementType, element: newElement});
            newElement.addEventListener('dblclick', function() {
                const index = atoms.findIndex(a => a.element === newElement);
                if (index > -1) {
                    atoms.splice(index, 1);
                    connections = connections.filter(c => c.i !== index && c.j !== index);
                    connections.forEach(c => {
                        if (c.i > index) c.i--;
                        if (c.j > index) c.j--;
                    });
                    world.removeChild(newElement);
                    updateLines();
                }
            });
        }

        updateLines();
    });

    const validarBtn = document.getElementById('validar');
    const nameDisplay = document.getElementById('element-name');

    validarBtn.addEventListener('click', function() {
        const isValid = validateAndAdjustHydrogens();
        if (!isValid) {
            showErrorModal('No es posible el elemento');
            return;
        }
        const name = getCompleteName(atoms, connections);
        if (name) {
            nameDisplay.textContent = name;
            numberMainChainCarbons(atoms, connections);
        } else {
            showErrorModal('No es una cadena simple');
        }
    });

    const limpiarBtn = document.querySelector('footer button:first-child');

    limpiarBtn.addEventListener('click', function() {
        cleanNonMainElements();
    });

    function cleanNonMainElements() {
        hidrogenos.forEach(h => world.removeChild(h));
        hidrogenos = [];
        hydrogenAttachments = [];

        const allDragged = world.querySelectorAll('.dragged-element');
        allDragged.forEach(el => {
            if (!atoms.some(a => a.element === el)) {
                world.removeChild(el);
            }
        });

        const newAtoms = [];
        const indexMap = new Map();
        atoms.forEach((a, oldIndex) => {
            const newIndex = newAtoms.length;
            newAtoms.push(a);
            indexMap.set(oldIndex, newIndex);
        });
        atoms = newAtoms;

        connections = connections.filter(c => indexMap.has(c.i) && indexMap.has(c.j)).map(c => ({
            i: indexMap.get(c.i),
            j: indexMap.get(c.j),
            type: c.type
        }));

        updateLines();
        const name = getCompleteName(atoms, connections);
        if (name) {
            nameDisplay.textContent = name;
        } else {
            nameDisplay.textContent = 'Benceno';
        }
    }
});

function numberMainChainCarbons(atoms, connections) {
    // Clear existing numbers
    atoms.forEach(a => {
        if (a.element) {
            const numSpan = a.element.querySelector('.carbon-number');
            if (numSpan) numSpan.remove();
        }
    });

    // Get carbon atoms and map indices
    const carbonIndices = [];
    const carbonAtoms = [];
    atoms.forEach((atom, idx) => {
        if (atom.type === 'C') {
            carbonIndices.push(idx);
            carbonAtoms.push(atom);
        }
    });

    // Map connections
    const carbonConnections = connections.filter(conn =>
        atoms[conn.i].type === 'C' && atoms[conn.j].type === 'C'
    ).map(conn => ({
        i: carbonIndices.indexOf(conn.i),
        j: carbonIndices.indexOf(conn.j),
        type: conn.type
    }));

    const mainChain = findLongestChain(carbonAtoms, carbonConnections);
    mainChain.forEach((carbonIndex, i) => {
        const originalIndex = carbonIndices[carbonIndex];
        const carbonDiv = atoms[originalIndex].element;
        const numSpan = document.createElement('span');
        numSpan.className = 'carbon-number';
        numSpan.textContent = (i + 1).toString();
        carbonDiv.appendChild(numSpan);
    });
}
