const BOND_LENGTH = 150;
const HYDROGEN_BOND_LENGTH = 100; 
const SNAP_THRESHOLD = 100; 
const CONNECT_THRESHOLD = 170; 
const MAX_CARBONS = 15;
const DISCONNECT_THRESHOLD = BOND_LENGTH + 30;
const BOND_TOLERANCE = 15; 
const WORLD_SIZE = 2000;
const ELEMENT_SIZE = 60;
const HYDROGEN_SIZE = 40;
const MAX_POS = WORLD_SIZE - ELEMENT_SIZE;

function getSize(el) {
    if (!el || !el.style) return ELEMENT_SIZE;
    return parseFloat(el.style.width) || ELEMENT_SIZE;
}

function getCenter(el) {
    if (!el || !el.style) return { x: 0, y: 0 };
    const size = getSize(el);
    return {
        x: parseFloat(el.style.left) + size / 2,
        y: parseFloat(el.style.top) + size / 2
    };
}
