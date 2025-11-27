const fs = require('fs');
const path = require('path');

const nomenclaturaPath = path.join(__dirname, 'javascript', 'nomenclatura.js');
const nomenclatura2Path = path.join(__dirname, 'javascript', 'nomenclatura2.js');

const nomenclaturaContent = fs.readFileSync(nomenclaturaPath, 'utf8');
const nomenclatura2Content = fs.readFileSync(nomenclatura2Path, 'utf8');

// Mock browser environment
global.window = global;
global.elementos = {
    'C': { nombre: 'Carbono' },
    'H': { nombre: 'Hidrógeno' },
    'S': { nombre: 'Azufre' },
    'O': { nombre: 'Oxígeno' },
    'N': { nombre: 'Nitrógeno' },
    'I': { nombre: 'Yodo' }
};
global.hidrogenos = [];

// Eval the scripts in global scope
eval(nomenclaturaContent);
eval(nomenclatura2Content);

// Mock atoms and connections for Butane-2-thiol
// C0 - C1(SH) - C2 - C3
// 1-methyl propan-2-thiol would be if it sees C1-C2-C3 as chain and C0 as methyl.
// Butane-2-thiol:
// Chain: C0-C1-C2-C3 (4 carbons)
// SH on C1.
// Numbering from left: 2-thiol.
// Numbering from right: 3-thiol.
// Should be butane-2-thiol.

const atoms = [
    { type: 'C' }, // 0
    { type: 'C' }, // 1 (This one has the SH)
    { type: 'C' }, // 2
    { type: 'C' }, // 3
    { type: 'S' }, // 4
    { type: 'H' }  // 5
];

const connections = [
    { i: 0, j: 1, type: 'single' },
    { i: 1, j: 2, type: 'single' },
    { i: 2, j: 3, type: 'single' },
    { i: 1, j: 4, type: 'single' }, // C1 - S
    { i: 4, j: 5, type: 'single' }  // S - H
];

const name = getCompleteName(atoms, connections);
console.log('Resulting Name:', name);
