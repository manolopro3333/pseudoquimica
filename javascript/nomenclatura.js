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

function getSubstituentName(carbons, connections) {
    if (carbons.length === 0) return '';
    const mainChain = findLongestChainFromStart(carbons, connections, 0);
    if (mainChain.length === 0) return '';
    const subSubs = findSubstituents(carbons, connections, mainChain);
    subSubs.sort((a, b) => a.position - b.position);
    
    const grouped = {};
    subSubs.forEach(s => {
        const subName = getSubstituentName(s.carbons, s.connections);
        if (!grouped[subName]) grouped[subName] = [];
        grouped[subName].push(s.position);
    });
    
    const subParts = [];
    for (const [name, positions] of Object.entries(grouped)) {
        positions.sort((a, b) => a - b);
        let prefix = '';
        if (positions.length === 2) prefix = 'di';
        else if (positions.length === 3) prefix = 'tri';
        const posStr = positions.join(',');
        subParts.push(`${posStr}-${prefix}${name}`);
    }
    
    const subStr = subParts.join(' ');
    const baseName = substituentNames[mainChain.length] || mainChain.length + 'il';
    const fullName = baseName;
    const result = subStr ? `${subStr} ${fullName}` : fullName;
    return subSubs.length > 0 ? `(${result})` : result;
}

function buildAdj(carbons, connections) {
    const adj = carbons.map(() => []);
    connections.forEach(c => {
        adj[c.i].push(c.j);
        adj[c.j].push(c.i);
    });
    return adj;
}

function isSimpleChain(carbons, connections) {
    if (carbons.length === 0) return false;
    if (carbons.length > 15) return false;
    const adj = buildAdj(carbons, connections);
    const visited = new Set();
    function dfs(node) {
        visited.add(node);
        adj[node].forEach(neigh => {
            if (!visited.has(neigh)) dfs(neigh);
        });
    }
    dfs(0);
    if (visited.size !== carbons.length) return false;
    if (connections.length !== carbons.length - 1) return false;
    let deg1 = 0;
    for (let i = 0; i < adj.length; i++) {
        const deg = adj[i].length;
        if (deg === 1) deg1++;
        else if (deg !== 2 && !(carbons.length === 1 && deg === 0)) return false;
    }
    if (carbons.length === 1) return deg1 === 0;
    return deg1 === 2;
}

function getAlkaneName(carbons, connections) {
    if (!isSimpleChain(carbons, connections)) return null;
    const count = carbons.length;
    return alkaneNames[count] || `${count}ano`;
}

function findLongestChain(carbons, connections) {
    if (carbons.length === 1) return [0];
    const adj = buildAdj(carbons, connections);
    const ends = [];
    for (let i = 0; i < adj.length; i++) {
        if (adj[i].length === 1) ends.push(i);
    }
    let longestPaths = [];
    let maxLength = 0;
    function dfs(path, visited) {
        const last = path[path.length - 1];
        if (path.length > maxLength) {
            maxLength = path.length;
            longestPaths = [[...path]];
        } else if (path.length === maxLength) {
            longestPaths.push([...path]);
        }
        for (const neigh of adj[last]) {
            if (!visited.has(neigh)) {
                visited.add(neigh);
                path.push(neigh);
                dfs(path, visited);
                path.pop();
                visited.delete(neigh);
            }
        }
    }
    for (const start of ends) {
        dfs([start], new Set([start]));
    }
    let bestChain = longestPaths[0];
    let bestPositions = [];
    for (const chain of longestPaths) {
        const subs = findSubstituents(carbons, connections, chain);
        const positions = subs.map(s => s.position).sort((a, b) => a - b);
        if (positions.length < bestPositions.length || (positions.length === bestPositions.length && JSON.stringify(positions) < JSON.stringify(bestPositions))) {
            bestChain = chain;
            bestPositions = positions;
        }
    }
    return bestChain;
}

function findLongestChainFromStart(carbons, connections, start) {
    if (carbons.length === 1) return [0];
    const adj = buildAdj(carbons, connections);
    let longestPath = [];
    function dfs(path, visited) {
        if (path.length > longestPath.length) {
            longestPath = [...path];
        }
        const last = path[path.length - 1];
        for (const neigh of adj[last]) {
            if (!visited.has(neigh)) {
                visited.add(neigh);
                path.push(neigh);
                dfs(path, visited);
                path.pop();
                visited.delete(neigh);
            }
        }
    }
    dfs([start], new Set([start]));
    return longestPath;
}

function findSubstituents(carbons, connections, mainChain) {
    const adj = buildAdj(carbons, connections);
    const mainSet = new Set(mainChain);
    const substituents = [];
    for (const mainNode of mainChain) {
        for (const neigh of adj[mainNode]) {
            if (!mainSet.has(neigh)) {
                const branchCarbons = [];
                const branchConnections = [];
                const visited = new Set();
                function dfsBranch(node) {
                    visited.add(node);
                    branchCarbons.push(node);
                    for (const n of adj[node]) {
                        if (!visited.has(n) && !mainSet.has(n)) {
                            branchConnections.push({i: branchCarbons.indexOf(node), j: branchCarbons.length});
                            dfsBranch(n);
                        }
                    }
                }
                dfsBranch(neigh);
                substituents.push({
                    position: mainChain.indexOf(mainNode) + 1,
                    carbons: branchCarbons,
                    connections: branchConnections
                });
            }
        }
    }
    return substituents;
}

function getBranchedAlkaneName(carbons, connections) {
    if (carbons.length === 0) return null;
    const mainChain = findLongestChain(carbons, connections);
    if (mainChain.length === 0) return null;
    const substituents = findSubstituents(carbons, connections, mainChain);
    substituents.sort((a, b) => a.position - b.position);
    
    const grouped = {};
    substituents.forEach(s => {
        const name = getSubstituentName(s.carbons, s.connections);
        if (!grouped[name]) grouped[name] = [];
        grouped[name].push(s.position);
    });
    
    const substituentParts = [];
    for (const [name, positions] of Object.entries(grouped)) {
        positions.sort((a, b) => a - b);
        let prefix = '';
        if (positions.length === 2) prefix = 'di';
        else if (positions.length === 3) prefix = 'tri';
        else if (positions.length === 4) prefix = 'tetra';
        const posStr = positions.join(',');
        substituentParts.push(`${posStr}-${prefix}${name}`);
    }
    
    const substituentStr = substituentParts.join(' ');
    const suffix = getSuffix(carbons, connections, mainChain);
    const mainName = alkaneNames[mainChain.length] ? alkaneNames[mainChain.length].replace('ano', suffix) : `${mainChain.length}${suffix}`;
    return substituentStr ? `${substituentStr} ${mainName}` : mainName;
}
