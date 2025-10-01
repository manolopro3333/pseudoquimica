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

        if (elementType === 'C' && carbons.length >= MAX_CARBONS) {
            return;
        }

        if (elementType === 'C') {
            if (carbons.length === 0) {
                const centerX = (-panX + viewport.clientWidth / 2) / zoom;
                const centerY = (-panY + viewport.clientHeight / 2) / zoom;
                newElement.style.left = (centerX - size / 2) + 'px';
                newElement.style.top = (centerY - size / 2) + 'px';
                newElement.addEventListener('mousedown', startDrag);
                newElement.addEventListener('touchstart', startDrag);
                carbons.push(newElement);
                newElement.addEventListener('dblclick', function() {
                    const index = carbons.indexOf(newElement);
                    if (index > -1) {
                        carbons.splice(index, 1);
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
                carbons.push(newElement);
                newElement.addEventListener('dblclick', function() {
                    const index = carbons.indexOf(newElement);
                    if (index > -1) {
                        carbons.splice(index, 1);
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
        const name = getBranchedAlkaneName(carbons, connections);
        if (name) {
            nameDisplay.textContent = name;
            numberMainChainCarbons(carbons, connections);
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
            if (!carbons.includes(el)) {
                world.removeChild(el);
            }
        });


        updateLines();
        const name = getBranchedAlkaneName(carbons, connections);
        if (name) {
            nameDisplay.textContent = name;
        } else {
            nameDisplay.textContent = 'Benceno';
        }
    }
});

function numberMainChainCarbons(carbons, connections) {
    carbons.forEach(c => {
        const numSpan = c.querySelector('.carbon-number');
        if (numSpan) numSpan.remove();
    });
    const mainChain = findLongestChain(carbons, connections);
    mainChain.forEach((carbonIndex, i) => {
        const carbonDiv = carbons[carbonIndex];
        const numSpan = document.createElement('span');
        numSpan.className = 'carbon-number';
        numSpan.textContent = (i + 1).toString();
        carbonDiv.appendChild(numSpan);
    });
}
