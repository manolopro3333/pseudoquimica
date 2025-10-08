const alkaneNames = {
    1: 'metano',
    2: 'etano',
    3: 'propano',
    4: 'butano',
    5: 'pentano',
    6: 'hexano',
    7: 'heptano',
    8: 'octano',
    9: 'nonano',
    10: 'decano',
    11: 'undecano',
    12: 'dodecano',
    13: 'tridecano',
    14: 'tetradecano',
    15: 'pentadecano'
};

const substituentNames = {
    1: 'metil',
    2: 'etil',
    3: 'propil',
    4: 'butil',
    5: 'pentil',
    6: 'hexil',
    7: 'heptil',
    8: 'octil',
    9: 'nonil',
    10: 'decil'
};

const enylNames = {
    1: 'etenil',
    2: 'propenil',
    3: 'butilenil',
    4: 'pentenil',
    5: 'hexenil',
    6: 'heptenil',
    7: 'octenil',
    8: 'nonenil'
};

const inylNames = {
    1: 'etinil',
    2: 'propinil',
    3: 'butilinil',
    4: 'pentinil',
    5: 'hexinil',
    6: 'heptinil',
    7: 'octinil',
    8: 'noninil'
};

function detectSubstituentFunctionalGroup(atoms, connections) {
    const sorted = atoms.slice().sort((a, b) => a.type.localeCompare(b.type));
    const key = sorted.map(a => a.type).join(' ');
    const functionalMap = {
        'H O': 'hidroxi',
        'H S': 'sulfhidrilo',
        'I': 'yodo',
        'N O O': 'nitro',
        'H O O O S': 'sulfo',
        'H O O S': 'sulfinilo',
        'H O S': 'sulfenilo',
        'O O S': 'sulfonilo'
    };
    return functionalMap[key];
}

function buildAdj(carbons, connections) {
    const n = Array.isArray(carbons) ? carbons.length : 0;
    let maxIdx = -Infinity;
    (connections || []).forEach(c => {
        if (typeof c.i === 'number' && typeof c.j === 'number') {
            maxIdx = Math.max(maxIdx, c.i, c.j);
        }
    });
    const offset = (maxIdx >= n && n > 0) ? 1 : 0;
    const adjSets = Array.from({ length: n }, () => new Set());
    const bondType = {};
    (connections || []).forEach(c => {
        if (typeof c.i !== 'number' || typeof c.j !== 'number') return;
        const i = c.i - offset;
        const j = c.j - offset;
        if (i < 0 || j < 0 || i >= n || j >= n) return;
        if (i === j) return;
        adjSets[i].add(j);
        adjSets[j].add(i);
        const a = Math.min(i, j);
        const b = Math.max(i, j);
        bondType[`${a}-${b}`] = c.type || 'single';
    });
    const adj = adjSets.map(s => Array.from(s));
    return { adj, bondType };
}

function findCycle(carbons, connections) {
    const { adj } = buildAdj(carbons, connections);
    const n = carbons.length;
    const visited = new Array(n).fill(false);
    const parent = new Array(n).fill(-1);
    let cycle = [];

    function dfs(u, p) {
        visited[u] = true;
        parent[u] = p;
        for (const v of adj[u]) {
            if (v === p) continue;
            if (!visited[v]) {
                if (dfs(v, u)) return true;
            } else {
                const path = [];
                let cur = u;
                while (cur !== -1) {
                    path.push(cur);
                    if (cur === v) break;
                    cur = parent[cur];
                }
                if (path[path.length - 1] !== v) continue;
                path.reverse();
                if (path.length >= 3) {
                    cycle = path;
                    return true;
                }
            }
        }
        return false;
    }

    for (let i = 0; i < n; i++) {
        if (!visited[i]) {
            if (dfs(i, -1)) return cycle;
        }
    }
    return [];
}

function hasCycle(carbons, connections) {
    return findCycle(carbons, connections).length > 0;
}

function findLongestChain(carbons, connections, start = null) {
    const { adj, bondType } = buildAdj(carbons, connections);
    const n = carbons.length;
    if (n === 0) return [];
    if (n === 1) return [0];
    if (hasCycle(carbons, connections)) return findCycle(carbons, connections);

    const degrees = adj.map(a => a.length);
    const leaves = [];
    if (start !== null) {
        leaves.push(start);
    } else {
        for (let i = 0; i < n; i++) if (degrees[i] === 1) leaves.push(i);
        if (leaves.length === 0) leaves.push(0);
    }

    let best = { path: [], unsat: 0, len: 0 };

    function edgeUnsat(u, v) {
        const a = Math.min(u, v);
        const b = Math.max(u, v);
        const t = bondType[`${a}-${b}`] || 'single';
        return (t === 'double' || t === 'triple' || t === 2 || t === 3) ? 1 : 0;
    }

    function dfs(u, visited, path, unsatCount) {
        visited[u] = true;
        path.push(u);
        if (unsatCount > best.unsat || (unsatCount === best.unsat && path.length > best.len)) {
            best = { path: [...path], unsat: unsatCount, len: path.length };
        }
        for (const v of adj[u]) {
            if (!visited[v]) {
                const add = edgeUnsat(u, v);
                dfs(v, visited, path, unsatCount + add);
            }
        }
        path.pop();
        visited[u] = false;
    }

    for (const leaf of leaves) dfs(leaf, new Array(n).fill(false), [], 0);
    return best.path;
}

function findSubstituents(carbons, connections, mainChain) {
    const { adj, bondType } = buildAdj(carbons, connections);
    const mainSet = new Set(mainChain);
    const substituents = [];

    for (const mainNode of mainChain) {
        for (const neigh of adj[mainNode]) {
            if (mainSet.has(neigh)) continue;
            const branchNodes = [];
            const visited = new Set();
            function dfsBranch(node, parent) {
                visited.add(node);
                branchNodes.push(node);
                for (const nb of adj[node]) {
                    if (nb === parent) continue;
                    if (mainSet.has(nb)) continue;
                    if (!visited.has(nb)) dfsBranch(nb, node);
                }
            }
            dfsBranch(neigh, mainNode);

            const a = Math.min(mainNode, neigh);
            const b = Math.max(mainNode, neigh);
            const linkType = bondType[`${a}-${b}`] || 'single';

            substituents.push({
                position: mainChain.indexOf(mainNode) + 1,
                carbons: branchNodes.sort((a,b)=>a-b),
                size: branchNodes.length,
                linkType
            });
        }
    }
    return substituents;
}

function getSubstituentName(branchIndices, fullAtoms, connections, parentConnectionType) {
    if (!branchIndices || branchIndices.length === 0) return '';
    const branchAtoms = branchIndices.map(i => fullAtoms[i]);
    const branchConnections = connections.filter(c => branchIndices.includes(c.i) && branchIndices.includes(c.j));
    const functional = detectSubstituentFunctionalGroup(branchAtoms, branchConnections);
    if (functional) return functional;
    let hasDouble = false, hasTriple = false;
    branchConnections.forEach(c => {
        if (c.type === 'double') hasDouble = true;
        if (c.type === 'triple') hasTriple = true;
    });
    if (parentConnectionType === 'double') hasDouble = true;
    if (parentConnectionType === 'triple') hasTriple = true;
    const size = branchAtoms.length;
    if (hasTriple) return inylNames[size] || 'etinil';
    if (hasDouble) return enylNames[size] || 'etenil';
    return substituentNames[size] || `${size}il`;
}

function getSuffix(carbons, connections, mainChain) {
    let hasDouble = false;
    let hasTriple = false;
    connections.forEach(c => {
        if (mainChain.includes(c.i) && mainChain.includes(c.j)) {
            if (c.type === 'double') hasDouble = true;
            if (c.type === 'triple') hasTriple = true;
        }
    });
    if (hasTriple) return 'ino';
    if (hasDouble) return 'eno';
    return 'ano';
}

function getAlkaneName(carbons, connections) {
    if (!isSimpleChain(carbons, connections)) return null;
    const backbone = findLongestChain(carbons, connections);
    const count = backbone.length;
    return alkaneNames[count] || `${count}ano`;
}

function getBranchedAlkaneName(atoms, carbons, connections, carbonIndices, mainChain = null) {
    if (!Array.isArray(carbons) || !Array.isArray(connections) || carbons.length === 0) return null;
    if (!isConnected(carbons, connections)) return null;

    const cycle = findCycle(carbons, connections);
    const cycleSize = cycle.length;

    if (cycleSize > 0 && cycleSize === carbons.length) {
        const suffix = getCycleSuffix(carbons, connections);
        const mainName = alkaneNames[cycleSize] ? alkaneNames[cycleSize].replace('ano', suffix) : `${cycleSize}${suffix}`;
        return `ciclo${mainName}`;
    } else if (cycleSize > 0 && cycleSize < carbons.length) {
        const cycleSet = new Set(cycle);
        const subs = [];
        const { adj } = buildAdj(carbons, connections);
        for (let i = 0; i < cycle.length; i++) {
            const node = cycle[i];
            for (const neigh of adj[node]) {
                if (cycleSet.has(neigh)) continue;
                const branchNodes = [];
                (function dfsBranch(u, parent) {
                    branchNodes.push(u);
                    for (const v of adj[u]) {
                        if (v === parent) continue;
                        if (cycleSet.has(v)) continue;
                        if (!branchNodes.includes(v)) dfsBranch(v, u);
                    }
                })(neigh, node);
                subs.push({ position: i + 1, carbons: branchNodes });
            }
        }
        const grouped = {};
        subs.forEach(s => {
            const name = getSubstituentName(s.carbons, carbons, connections);
            if (!grouped[name]) grouped[name] = [];
            grouped[name].push(s.position);
        });
        const parts = [];
        for (const [name, positions] of Object.entries(grouped)) {
            positions.sort((a,b)=>a-b);
            let prefix = '';
            if (positions.length === 2) prefix = 'di';
            else if (positions.length === 3) prefix = 'tri';
            else if (positions.length === 4) prefix = 'tetra';
            parts.push(`${positions.join(',')}-${prefix}${name}`);
        }
        const suffix = getCycleSuffix(carbons, connections);
        const mainName = alkaneNames[cycleSize] ? alkaneNames[cycleSize].replace('ano', suffix) : `${cycleSize}${suffix}`;
        return parts.length ? `${parts.join(' ')} ciclo${mainName}` : `ciclo${mainName}`;
    } else {
        if (!mainChain) mainChain = findLongestChain(carbons, connections);
        if (mainChain.length === 0) return null;
        const substituents = [];
        const { adj } = buildAdj(atoms, connections);
        for (const mainIdx of mainChain) {
            const actualMainIdx = carbonIndices[mainIdx];
            for (const neigh of adj[actualMainIdx]) {
                if (atoms[neigh].type === 'C') continue;
                const branchNodes = [];
                const visited = new Set();
                function dfsBranch(node, parent) {
                    visited.add(node);
                    branchNodes.push(node);
                    for (const nb of adj[node]) {
                        if (nb === parent) continue;
                        if (atoms[nb].type === 'C' && carbonIndices.includes(nb)) continue;
                        if (!visited.has(nb)) dfsBranch(nb, node);
                    }
                }
                dfsBranch(neigh, actualMainIdx);
                const branchAtoms = branchNodes.map(i => atoms[i]);
                const branchConnections = connections.filter(c => branchNodes.includes(c.i) && branchNodes.includes(c.j));
                const functional = detectSubstituentFunctionalGroup(branchAtoms, branchConnections);
                if (functional) {
                    substituents.push({
                        position: mainIdx + 1,
                        name: functional,
                        linkType: connections.find(c => (c.i === actualMainIdx && c.j === neigh) || (c.i === neigh && c.j === actualMainIdx))?.type || 'single'
                    });
                }
            }
        }
        const substituentStr = substituents.map(s => `${s.position}-${s.name}`).join(' ');
        const suffix = getSuffix(carbons, connections, mainChain);
        let mainName = alkaneNames[mainChain.length] ? alkaneNames[mainChain.length].replace('ano', suffix) : `${mainChain.length}${suffix}`;
        if (suffix === 'eno' || suffix === 'ino') {
            const unsatPositions = [];
            connections.forEach(c => {
                if ((suffix === 'eno' && c.type === 'double') || (suffix === 'ino' && c.type === 'triple')) {
                    const iIdx = mainChain.indexOf(c.i);
                    const jIdx = mainChain.indexOf(c.j);
                    if (iIdx !== -1 && jIdx !== -1) {
                        const pos = Math.min(iIdx, jIdx) + 1;
                        unsatPositions.push(pos);
                    }
                }
            });
            unsatPositions.sort((a, b) => a - b);
            if (unsatPositions.length > 0) {
                const posStr = unsatPositions.join(',');
                const suffixLetter = suffix === 'eno' ? 'en' : 'in';
                mainName = mainName.replace(suffix, `-${posStr}-${suffixLetter}o`);
            }
        }
        return substituentStr ? `${substituentStr} ${mainName}` : mainName;
    }
}

function isConnected(carbons, connections) {
    if (!Array.isArray(carbons) || !Array.isArray(connections)) return false;
    if (carbons.length === 0) return true;
    const { adj } = buildAdj(carbons, connections);
    if (adj.length === 0) return false;
    const visited = new Set();
    function dfs(node) {
        visited.add(node);
        (adj[node] || []).forEach(neigh => {
            if (!visited.has(neigh)) dfs(neigh);
        });
    }
    dfs(0);
    return visited.size === carbons.length;
}

function getCycleSuffix(carbons, connections) {
    let hasDouble = false;
    let hasTriple = false;
    connections.forEach(c => {
        if (c.type === 'double') hasDouble = true;
        if (c.type === 'triple') hasTriple = true;
    });
    if (hasTriple) return 'ino';
    if (hasDouble) return 'eno';
    return 'ano';
}

function isSimpleChain(carbons, connections, maxBranchLength = 2) {
    if (carbons.length === 0) return false;
    if (carbons.length > 100) return false;
    const { adj } = buildAdj(carbons, connections);
    const backbone = findLongestChain(carbons, connections);
    if (backbone.length === 0) return false;
    const backboneSet = new Set(backbone);

    for (let i = 0; i < carbons.length; i++) {
        if (backboneSet.has(i)) continue;
        let backboneNeighbors = 0;
        for (const nb of adj[i]) if (backboneSet.has(nb)) backboneNeighbors++;
        if (backboneNeighbors !== 1) return false;
    }

    const subs = findSubstituents(carbons, connections, backbone);
    for (const s of subs) if (s.size > maxBranchLength) return false;

    for (const node of backbone) {
        const count = adj[node].filter(x => backboneSet.has(x)).length;
        if (backbone.length === 1) {
            if (count !== 0) return false;
        } else if (node === backbone[0] || node === backbone[backbone.length - 1]) {
            if (count !== 1) return false;
        } else {
            if (count !== 2) return false;
        }
    }

    return true;
}

function calculateHydrogens(carbons, connections) {
    const { adj, bondType } = buildAdj(carbons, connections);
    return carbons.map((_, i) => {
        let valence = 0;
        for (const j of adj[i]) {
            const key = `${Math.min(i,j)}-${Math.max(i,j)}`;
            const t = bondType[key] || 'single';
            let order = 1;
            if (t === 'double' || t === 2 || t === '2') order = 2;
            else if (t === 'triple' || t === 3 || t === '3') order = 3;
            valence += order;
        }
        return Math.max(0, 4 - valence);
    });
}


if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getBranchedAlkaneName,
        getAlkaneName,
        isSimpleChain,
        findCycle,
        findSubstituents,
        buildAdj,
        calculateHydrogens,
        findLongestChain
    };
}
