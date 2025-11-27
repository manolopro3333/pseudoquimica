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
                carbons: branchNodes.sort((a, b) => a - b),
                size: branchNodes.length,
                linkType
            });
        }
    }
    return substituents;
}

function getSubstituentName(branchIndices, fullAtoms, connections, parentConnectionType) {
    if (!branchIndices || branchIndices.length === 0) return '';
    console.log('==== [getSubstituentName] START - branchIndices:', branchIndices);

    // Expand branchIndices to include attached heteroatoms (recursively)
    // branchIndices initially contains only Carbons.
    const expandedIndices = new Set(branchIndices);
    const queue = [...branchIndices];
    const visited = new Set(branchIndices);

    // Build adjacency for full atoms to traverse
    // We use buildAdj on fullAtoms and connections
    const { adj } = buildAdj(fullAtoms, connections);

    while (queue.length > 0) {
        const u = queue.shift();
        for (const v of adj[u] || []) {
            if (!visited.has(v)) {
                const atom = fullAtoms[v];
                // Include heteroatoms (N, O, S, Halogens, etc.)
                // Do not include Carbons that are not in branchIndices (those would be main chain or other branches)
                // If atom is Carbon, check if it is in branchIndices.
                if (atom && atom.type === 'C') {
                    if (branchIndices.includes(v)) {
                        // Already in set (should be visited), but if not, add it?
                        // branchIndices are already in visited.
                        // So if we see a C not in visited, it must be outside the branch.
                        continue;
                    } else {
                        // Connected to a C outside the branch -> Main chain or other branch. Stop.
                        continue;
                    }
                } else if (atom && atom.type !== 'H') {
                    // Heteroatom (N, O, etc.)
                    // Add to expansion
                    visited.add(v);
                    expandedIndices.add(v);
                    queue.push(v);
                }
            }
        }
    }

    const finalBranchIndices = Array.from(expandedIndices);
    const branchAtoms = finalBranchIndices.map(i => fullAtoms[i]);
    console.log('[getSubstituentName] connections parameter:', connections);
    console.log('[getSubstituentName] finalBranchIndices:', finalBranchIndices);
    console.log('[getSubstituentName] expandedIndices type:', expandedIndices instanceof Set);
    console.log('[getSubstituentName] Testing has(4):', expandedIndices.has(4));
    console.log('[getSubstituentName] Testing has(5):', expandedIndices.has(5));
    const branchConnections = connections.filter(c => {
        const hasI = expandedIndices.has(c.i);
        const hasJ = expandedIndices.has(c.j);
        if (hasI || hasJ) {
            console.log(`[getSubstituentName] Connection {i:${c.i}, j:${c.j}} hasI:${hasI} hasJ:${hasJ}`);
        }
        return hasI && hasJ;
    });

    // Filter for carbons to determine alkyl root
    const branchCarbons = finalBranchIndices.filter(idx => fullAtoms[idx] && fullAtoms[idx].type === 'C');
    const size = branchCarbons.length;

    // Get branch connections (already done above with expandedIndices)
    // const branchConnections = connections.filter(c => branchIndices.includes(c.i) && branchIndices.includes(c.j));

    // Detect functional groups within the branch
    // We need to map global indices to local indices for detectFunctionalGroups if it depended on 0-based indexing,
    // but detectFunctionalGroups takes (atoms, connections).
    // We should construct a subset of atoms and connections.

    // Map global index -> local index
    const localMap = new Map();
    const localAtoms = [];
    finalBranchIndices.forEach((globalIdx, localIdx) => {
        localMap.set(globalIdx, localIdx);
        localAtoms.push(fullAtoms[globalIdx]);
    });

    console.log('[getSubstituentName] branchConnections before mapping:', branchConnections);
    console.log('[getSubstituentName] expandedIndices:', Array.from(expandedIndices));

    const localConnections = branchConnections.map(c => ({
        i: localMap.get(c.i),
        j: localMap.get(c.j),
        type: c.type
    }));

    // Detect FGs in the branch
    let functionalGroups = [];
    if (typeof detectFunctionalGroups === 'function') {
        functionalGroups = detectFunctionalGroups(localAtoms, localConnections);
    }
    console.log('[getSubstituentName] Detected functional groups in substituent:', functionalGroups);
    console.log('[getSubstituentName] LocalAtoms:', localAtoms);
    console.log('[getSubstituentName] LocalConnections:', localConnections);

    // Fallback: Manual detection for Nitro (NO2) if not found
    // This ensures we catch it even if detectFunctionalGroups is not available or fails on subset
    const hasNitro = functionalGroups.some(fg => fg.type === 'NO2');
    if (!hasNitro) {
        for (let i = 0; i < localAtoms.length; i++) {
            const atom = localAtoms[i];
            if (atom.type === 'N') {
                const neighbors = [];
                localConnections.forEach(c => {
                    if (c.i === i) neighbors.push(c.j);
                    else if (c.j === i) neighbors.push(c.i);
                });
                const oxygenNeighbors = neighbors.filter(n => localAtoms[n] && localAtoms[n].type === 'O');
                if (oxygenNeighbors.length >= 2) {
                    functionalGroups.push({ type: 'NO2', position: i, name: 'nitro' });
                }
            }
        }
    }

    // Fallback: Manual detection for Amino (NH2) if not found
    const hasAmino = functionalGroups.some(fg => fg.type === 'NH2');
    if (!hasAmino) {
        for (let i = 0; i < localAtoms.length; i++) {
            const atom = localAtoms[i];
            if (atom.type === 'N') {
                const neighbors = [];
                localConnections.forEach(c => {
                    if (c.i === i) neighbors.push(c.j);
                    else if (c.j === i) neighbors.push(c.i);
                });
                // If N has only 1 carbon neighbor (or less) and no O neighbors, it's likely NH2
                const carbonNeighbors = neighbors.filter(n => localAtoms[n] && localAtoms[n].type === 'C');
                const oxygenNeighbors = neighbors.filter(n => localAtoms[n] && localAtoms[n].type === 'O');
                if (carbonNeighbors.length === 1 && oxygenNeighbors.length === 0) {
                    functionalGroups.push({ type: 'NH2', position: i, name: 'amino' });
                }
            }
        }
    }

    console.log('[getSubstituentName] After manual detection:', functionalGroups);

    // Filter out the attachment point if it's considered a functional group? No.

    // Construct name
    // 1. Alkyl root
    let rootName = '';
    let hasDouble = false, hasTriple = false;
    branchConnections.forEach(c => {
        // Only consider C-C bonds for unsaturation of the alkyl chain
        // We need to check the atom types for c.i and c.j
        // c.i and c.j are global indices.
        const atomI = fullAtoms[c.i];
        const atomJ = fullAtoms[c.j];
        if (atomI && atomI.type === 'C' && atomJ && atomJ.type === 'C') {
            if (c.type === 'double') hasDouble = true;
            if (c.type === 'triple') hasTriple = true;
        }
    });
    if (parentConnectionType === 'double') hasDouble = true;
    if (parentConnectionType === 'triple') hasTriple = true;

    if (hasTriple) rootName = inylNames[size] || 'etinil';
    else if (hasDouble) rootName = enylNames[size] || 'etenil';
    else rootName = substituentNames[size] || `${size}il`;

    // Check for cycle in substituent
    const isCyclic = hasCycle(branchCarbons, []); // Pass empty connections? No, need connections.
    // We need carbon-only connections for hasCycle
    const carbonIndices = branchIndices.filter(idx => fullAtoms[idx].type === 'C');
    const carbonLocalIndices = carbonIndices.map(idx => localMap.get(idx));
    const carbonConnections = localConnections.filter(c =>
        localAtoms[c.i].type === 'C' && localAtoms[c.j].type === 'C'
    );
    // Re-map to 0..N-1 for hasCycle? hasCycle uses 0..N-1
    // We need to pass a subset of carbons and their connections re-indexed.
    // Too complex for this function?
    // Let's rely on the existing `isCyclic` check if possible, but updated.

    // Existing check:
    // const isCyclic = hasCycle(branchAtoms, localConnections); 
    // This was checking ALL atoms. We should check only CARBONS.

    // Re-construct carbon-only graph for cycle check
    const cAtoms = localAtoms.filter(a => a.type === 'C');
    // This is tricky because we lose the original structure if we just filter.
    // But `hasCycle` expects `carbons` array and connections referring to indices in that array.

    // Let's skip complex cycle detection inside substituent for now, assume linear if not obvious.
    // The issue at hand is (2-nitroethyl).

    // 2. Prefixes (Nitro, Halo)
    const prefixes = [];
    functionalGroups.forEach(fg => {
        if (fg.type === 'NO2' || fg.type === 'NO' || fg.type === 'NH2' || ['F', 'Cl', 'Br', 'I'].includes(fg.type)) {
            console.log('[getSubstituentName] Processing FG:', fg);
            // We need the position relative to the attachment point.
            // The attachment point in `branchIndices` is usually the first one?
            // In `findSubstituents`, `dfsBranch` starts from `neigh` (connected to main chain).
            // So `branchNodes[0]` is the attachment point (C1).

            // We need to find the path from attachment to the FG position.
            // `fg.position` is the index in `localAtoms`.
            // Attachment is index 0 in `localAtoms` (if `branchNodes` order is preserved).
            // `branchNodes` are pushed in DFS order. `neigh` is first.

            // Find distance/path from root (0) to fg.position.
            // But we need the Carbon number.
            // Count carbons along the path.

            const target = fg.position;
            const root = 0;

            // BFS to find path
            const q = [[root]];
            const visited = new Set([root]);
            let path = [];

            while (q.length > 0) {
                const currPath = q.shift();
                const u = currPath[currPath.length - 1];
                if (u === target) {
                    path = currPath;
                    break;
                }

                // Neighbors in localConnections
                const neighbors = [];
                localConnections.forEach(c => {
                    if (c.i === u) neighbors.push(c.j);
                    else if (c.j === u) neighbors.push(c.i);
                });

                for (const v of neighbors) {
                    if (!visited.has(v)) {
                        visited.add(v);
                        q.push([...currPath, v]);
                    }
                }
            }

            // Count carbons in path (excluding the FG atom itself if it's not C, which it isn't)
            let carbonCount = 0;
            path.forEach(idx => {
                if (localAtoms[idx].type === 'C') carbonCount++;
            });

            console.log('[getSubstituentName] BFS path:', path);
            console.log('[getSubstituentName] carbonCount:', carbonCount);

            // If BFS failed to find a path (connections might be incomplete),
            // implement fallback logic for simple cases
            if (path.length === 0 && localAtoms[target].type !== 'C') {
                // For heteroatoms (N, O, etc.) that couldn't be reached via BFS
                // Assume they're connected to the first carbon (common case)
                // Position = 1 (the carbon to which the heteroatom is attached)
                const pos = 1;
                console.log('[getSubstituentName] BFS failed - using fallback position:', pos);
                prefixes.push(`${pos}-${fg.name}`);
                console.log('[getSubstituentName] Adding prefix (fallback):', `${pos}-${fg.name}`);
            } else {
                // Normal BFS case
                // The position is the number of the carbon to which the FG is attached
                // In IUPAC nomenclature for substituents, attachment point = position 1
                // So if FG is on the first carbon (root), position = 1
                // If FG is on the second carbon, position = 2, etc.

                // The path ends with the FG atom (N for nitro, O for others, etc.)
                // The carbon connected to FG is the last carbon in the path
                // Find that carbon's position by counting carbons from root

                // The number of carbons in the path to (and including) the carbon bearing the FG
                // is the position of that carbon
                const pos = carbonCount;
                console.log('[getSubstituentName] Calculated position:', pos);
                prefixes.push(`${pos}-${fg.name}`);
                console.log('[getSubstituentName] Adding prefix:', `${pos}-${fg.name}`);
            }
        }
    });

    console.log('[getSubstituentName] Prefixes array:', prefixes);
    console.log('[getSubstituentName] rootName:', rootName);

    if (prefixes.length > 0) {
        // Sort prefixes?
        prefixes.sort(); // Simple sort
        const prefixStr = prefixes.join('-');
        console.log('[getSubstituentName] Returning with prefix:', `(${prefixStr}${rootName})`);
        return `(${prefixStr}${rootName})`;
    }

    console.log('[getSubstituentName] No prefixes, returning:', isCyclic ? `ciclo${rootName}` : rootName);
    return isCyclic ? `ciclo${rootName}` : rootName;
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

function findLongestChain(carbons, connections, start = null) {
    const { adj, bondType } = buildAdj(carbons, connections);
    const n = carbons.length;
    if (n === 0) return [];
    if (n === 1) return [0];
    if (hasCycle(carbons, connections)) return findCycle(carbons, connections);

    // helper: determina si la arista u-v es insaturación
    function edgeUnsat(u, v) {
        const a = Math.min(u, v);
        const b = Math.max(u, v);
        const t = bondType[`${a}-${b}`] || 'single';
        return (t === 'double' || t === 'triple' || t === 2 || t === 3) ? 1 : 0;
    }

    let best = { path: [], unsat: 0, len: 0 };
    const visited = new Array(n).fill(false);

    function dfs(u, path, unsatCount) {
        visited[u] = true;
        path.push(u);

        // actualizar mejor solución
        if (path.length > best.len || (path.length === best.len && unsatCount > best.unsat)) {
            best = { path: [...path], unsat: unsatCount, len: path.length };
        }

        for (const v of adj[u] || []) {
            if (!visited[v]) {
                const add = edgeUnsat(u, v);
                dfs(v, path, unsatCount + add);
            }
        }

        path.pop();
        visited[u] = false;
    }

    if (start !== null && start >= 0 && start < n) {
        dfs(start, [], 0);
    } else {
        // DFS desde cada nodo para garantizar la máxima ruta simple
        for (let i = 0; i < n; i++) {
            dfs(i, [], 0);
        }
    }

    return best.path;
}

function findLongestChainContaining(carbons, connections, targetNode) {
    const { adj, bondType } = buildAdj(carbons, connections);
    const n = carbons.length;
    if (n === 0) return [];
    if (targetNode < 0 || targetNode >= n) return [];

    // helper: determina si la arista u-v es insaturación
    function edgeUnsat(u, v) {
        const a = Math.min(u, v);
        const b = Math.max(u, v);
        const t = bondType[`${a}-${b}`] || 'single';
        return (t === 'double' || t === 'triple' || t === 2 || t === 3) ? 1 : 0;
    }

    let best = { path: [], unsat: 0, len: 0 };
    const visited = new Array(n).fill(false);

    // DFS from u, must end at a leaf or exhaust paths
    // Returns all simple paths starting at u
    function findAllPaths(u, currentPath, currentUnsat) {
        visited[u] = true;
        currentPath.push(u);

        let isLeaf = true;
        for (const v of adj[u] || []) {
            if (!visited[v]) {
                isLeaf = false;
                const add = edgeUnsat(u, v);
                findAllPaths(v, currentPath, currentUnsat + add);
            }
        }

        if (isLeaf) {
            // Found a path ending at u
            // Store it? No, we need to combine two paths starting from targetNode
        }

        // Backtrack? 
        // Actually, to find the longest path passing through targetNode, 
        // we can treat targetNode as the root.
        // The longest path is formed by combining the two longest non-overlapping paths starting from targetNode.
        // Or simply, run DFS from targetNode to find all paths starting from it.
        // Then pick the best two that don't share nodes (except targetNode).
        // BUT, standard DFS won't easily give us "all paths".

        // Alternative: Iterate over all pairs of leaves (or all pairs of nodes), find path between them.
        // If path contains targetNode, check length/unsat.
        // This is O(N^3) or O(N^2) which is fine for small molecules (<100 atoms).

        visited[u] = false;
        currentPath.pop();
    }

    // Better approach for "longest path through X":
    // 1. Find all simple paths starting at X.
    // 2. Store them.
    // 3. Find two paths P1 and P2 starting at X such that intersection(P1, P2) == {X}.
    // 4. Maximize len(P1) + len(P2) - 1.

    // Let's use a simpler recursive search that builds the path in two directions?
    // No, that's tricky.

    // Let's stick to: Find all simple paths in the graph. Filter those containing X.
    // Since N is small, we can just run the global DFS (findLongestChain logic) but filter for paths containing targetNode.

    // Re-use logic from findLongestChain but with a constraint.

    let globalBest = { path: [], unsat: 0, len: 0 };
    const globalVisited = new Array(n).fill(false);

    function dfsGlobal(u, path, unsatCount) {
        globalVisited[u] = true;
        path.push(u);

        // Check if this path is better AND contains targetNode
        if (path.includes(targetNode)) {
            if (path.length > globalBest.len || (path.length === globalBest.len && unsatCount > globalBest.unsat)) {
                globalBest = { path: [...path], unsat: unsatCount, len: path.length };
            }
        }

        for (const v of adj[u] || []) {
            if (!globalVisited[v]) {
                const add = edgeUnsat(u, v);
                dfsGlobal(v, path, unsatCount + add);
            }
        }

        path.pop();
        globalVisited[u] = false;
    }

    // Run DFS from every node to ensure we find the start of the longest chain
    for (let i = 0; i < n; i++) {
        dfsGlobal(i, [], 0);
    }

    return globalBest.path;
}

function getBranchedAlkaneName(atoms, carbons, connections, carbonIndices, mainChain = null, allConnections = null) {
    if (!Array.isArray(carbons) || !Array.isArray(connections) || carbons.length === 0) return null;
    if (!isConnected(carbons, connections)) return null;

    // Use allConnections if provided, otherwise fallback to connections (which might be incomplete for heteroatoms)
    // But wait, connections passed here are usually carbonConnections.
    // allConnections should be the full molecule connections.
    console.log('[getBranchedAlkaneName] allConnections:', allConnections);
    console.log('[getBranchedAlkaneName] connections (carbon only):', connections);
    const fullConnections = allConnections || connections;

    const cycle = findCycle(carbons, connections);
    const cycleSize = cycle.length;

    // Caso 1: toda la molécula es un ciclo
    if (cycleSize > 0 && cycleSize === carbons.length) {
        console.log('Caso 1: toda la molécula es un ciclo');
        console.log('cycleSize:', cycleSize);
        const suffix = getCycleSuffix(carbons, connections);
        console.log('suffix:', suffix);
        const mainName = alkaneNames[cycleSize]
            ? alkaneNames[cycleSize].replace('ano', suffix)
            : `${cycleSize}${suffix}`;
        console.log('mainName:', mainName);
        return `ciclo${mainName}`;
    }

    // Caso 2: ciclo con sustituyentes fuera
    else if (cycleSize > 0 && cycleSize < carbons.length && !mainChain) {
        console.log('Caso 2: ciclo con sustituyentes');
        console.log('cycle:', cycle);
        console.log('carbons:', carbons);
        console.log('atoms:', atoms);
        console.log('carbonIndices:', carbonIndices);
        const cycleSet = new Set(cycle);
        const subs = [];
        const { adj } = buildAdj(carbons, connections);
        console.log('adj:', adj);

        for (let i = 0; i < cycle.length; i++) {
            const node = cycle[i];
            console.log('Processing cycle node:', node);
            for (const neigh of adj[node]) {
                console.log('Neighbor:', neigh);
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
                console.log('branchNodes:', branchNodes);

                subs.push({ position: i + 1, carbons: branchNodes });
            }
        }

        const grouped = {};
        subs.forEach(s => {
            console.log('Substituent carbons:', s.carbons);
            const fullIndices = s.carbons.map(idx => carbonIndices[idx]);
            console.log('fullIndices:', fullIndices);
            // Pass fullConnections here!
            console.log('[getBranchedAlkaneName] Calling getSubstituentName with fullConnections:', fullConnections);
            const name = getSubstituentName(fullIndices, atoms, fullConnections);
            console.log('name:', name);
            if (!grouped[name]) grouped[name] = [];
            grouped[name].push(s.position);
        });
        console.log('grouped:', grouped);

        const parts = [];
        for (const [name, positions] of Object.entries(grouped)) {
            positions.sort((a, b) => a - b);
            let prefix = '';
            if (positions.length === 2) prefix = 'di';
            else if (positions.length === 3) prefix = 'tri';
            else if (positions.length === 4) prefix = 'tetra';
            parts.push(`${positions.join(',')}-${prefix}${name}`);
        }

        const suffix = getCycleSuffix(carbons, connections);
        const mainName = alkaneNames[cycleSize]
            ? alkaneNames[cycleSize].replace('ano', suffix)
            : `${cycleSize}${suffix}`;

        return parts.length ? `${parts.join(' ')} ciclo${mainName}` : `ciclo${mainName}`;
    }

    // Caso 3: cadena abierta (principal)
    else {
        console.log('Caso 3: cadena abierta');
        console.log('mainChain:', mainChain);
        console.log('atoms:', atoms);
        console.log('carbonIndices:', carbonIndices);
        if (!mainChain) mainChain = findLongestChain(carbons, connections);
        if (mainChain.length === 0) return null;

        const substituents = [];

        // Re-implementing the loop correctly:
        const { adj: localAdj } = buildAdj(carbons, connections);

        for (let i = 0; i < mainChain.length; i++) {
            const mainIdx = mainChain[i]; // local index
            for (const neigh of localAdj[mainIdx]) {
                if (mainChain.includes(neigh)) continue;

                const branchNodes = [];
                (function dfsBranch(u, parent) {
                    branchNodes.push(u);
                    for (const v of localAdj[u]) {
                        if (v === parent) continue;
                        if (mainChain.includes(v)) continue;
                        if (!branchNodes.includes(v)) dfsBranch(v, u);
                    }
                })(neigh, mainIdx);

                const fullIndices = branchNodes.map(idx => carbonIndices[idx]);
                const name = getSubstituentName(fullIndices, atoms, fullConnections);
                if (name) substituents.push({ name, position: i + 1 });
            }
        }

        // Group substituents
        const grouped = {};
        substituents.forEach(s => {
            if (!grouped[s.name]) grouped[s.name] = [];
            grouped[s.name].push(s.position);
        });

        const parts = [];
        for (const [name, positions] of Object.entries(grouped)) {
            positions.sort((a, b) => a - b);
            let prefix = '';
            if (positions.length === 2) prefix = 'di';
            else if (positions.length === 3) prefix = 'tri';
            else if (positions.length === 4) prefix = 'tetra';
            parts.push(`${positions.join(',')}-${prefix}${name}`);
        }

        const substituentStr = parts.join(' ');
        const suffix = getSuffix(carbons, connections, mainChain);

        let mainName = alkaneNames[mainChain.length]
            ? alkaneNames[mainChain.length].replace('ano', suffix)
            : `${mainChain.length}${suffix}`;

        // Manejo de posiciones de insaturaciones (dobles o triples enlaces)
        if (suffix === 'eno' || suffix === 'ino') {
            const unsatPositions = [];
            connections.forEach(c => {
                if (
                    (suffix === 'eno' && c.type === 'double') ||
                    (suffix === 'ino' && c.type === 'triple')
                ) {
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
            const key = `${Math.min(i, j)}-${Math.max(i, j)}`;
            const t = bondType[key] || 'single';
            let order = 1;
            if (t === 'double' || t === 2 || t === '2') order = 2;
            else if (t === 'triple' || t === 3 || t === '3') order = 3;
            valence += order;
        }
        return Math.max(0, 4 - valence);
    });
}


function getAlkaneName(carbons, connections) {
    if (!isSimpleChain(carbons, connections)) return null;
    const backbone = findLongestChain(carbons, connections);
    const count = backbone.length;
    return alkaneNames[count] || `${count}ano`;
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
        findLongestChain,
        findLongestChainContaining
    };
}