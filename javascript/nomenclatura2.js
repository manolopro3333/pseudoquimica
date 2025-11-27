const functionalGroupPriority = {
    'carboxilo': 1,
    'sulfonico': 2,
    'sulfinico': 3,
    'sulfonilo': 3,
    'formilo': 4,
    'oxo': 5,
    'hidroxi': 6,
    'amino': 7,
    'nitro': 8,
    'nitroso': 7,
    'nitrito': 6,
    'nitrato': 5,
    'sulfhidrilo': 9,
    'sulfoxido': 10,
    'sulfona': 11,
    'sulfuro': 12,
    'halo': 13
};

const functionalGroupNames = {
    'NO2': 'nitro',
    'NO': 'nitroso',
    'ONO': 'nitrito',
    'ONO2': 'nitrato',
    'NH2': 'amino',
    'OH': 'hidroxi',
    'SH': 'sulfhidrilo',
    'SO3H': 'sulfonico',
    'SO2H': 'sulfinico',
    'SOH': 'sulfenico',
    'COOH': 'carboxilo',
    'CHO': 'formilo',
    'CO': 'oxo',
    'S=O': 'sulfoxido',
    'SO2': 'sulfona',
    'SR': 'sulfuro'
};

const haloGroups = {
    'F': 'fluoro',
    'Cl': 'cloro',
    'Br': 'bromo',
    'I': 'yodo'
};

function detectFunctionalGroups(atoms, connections) {
    const functionalGroups = [];
    const { adj, bondType } = buildAdj(atoms, connections);

    for (let i = 0; i < atoms.length; i++) {
        const atom = atoms[i];
        if (!atom) continue;

        if (atom.type === 'N') {
            const neighbors = adj[i] || [];
            const oxygenNeighbors = neighbors.filter(n => atoms[n] && atoms[n].type === 'O');

            // Detect nitroso: N with 1 O, double bond
            if (oxygenNeighbors.length === 1) {
                const ox = oxygenNeighbors[0];
                const bondKey = `${Math.min(i, ox)}-${Math.max(i, ox)}`;
                const bond = bondType[bondKey];
                if (bond === 'double') {
                    functionalGroups.push({ type: 'NO', position: i, priority: functionalGroupPriority['nitroso'], name: 'nitroso' });
                    continue;
                }
            }

            // Detect nitrito: N with 2 O, one double, one single to C
            if (oxygenNeighbors.length === 2) {
                let hasDouble = false;
                let hasSingleToC = false;
                for (const ox of oxygenNeighbors) {
                    const bondKey = `${Math.min(i, ox)}-${Math.max(i, ox)}`;
                    const bond = bondType[bondKey];
                    if (bond === 'double') hasDouble = true;
                    // Check if O is connected to C
                    const oxNeighbors = adj[ox] || [];
                    if (oxNeighbors.some(nb => atoms[nb] && atoms[nb].type === 'C' && nb !== i)) {
                        hasSingleToC = true;
                    }
                }
                if (hasDouble && hasSingleToC) {
                    functionalGroups.push({ type: 'ONO', position: i, priority: functionalGroupPriority['nitrito'], name: 'nitrito' });
                    continue;
                }
            }

            // Detect nitrato: N with 3 O, connected to C via O
            if (oxygenNeighbors.length === 3) {
                const connectedToC = oxygenNeighbors.some(ox => {
                    const oxNeighbors = adj[ox] || [];
                    return oxNeighbors.some(nb => atoms[nb] && atoms[nb].type === 'C' && nb !== i);
                });
                if (connectedToC) {
                    functionalGroups.push({ type: 'ONO2', position: i, priority: functionalGroupPriority['nitrato'], name: 'nitrato' });
                    continue;
                }
            }

            // Detect nitro: N with 2 O, not nitrito
            if (oxygenNeighbors.length >= 2) {
                functionalGroups.push({ type: 'NO2', position: i, priority: functionalGroupPriority['nitro'], name: 'nitro' });
            }

            // Amino
            const carbonNeighbors = neighbors.filter(n => atoms[n] && atoms[n].type === 'C');
            // Fix: Ensure N does not have O neighbors (to avoid confusion with Nitro, Nitroso, etc.)
            const hasOxygenNeighbor = neighbors.some(n => atoms[n] && atoms[n].type === 'O');
            if (carbonNeighbors.length === 1 && neighbors.length <= 3 && !hasOxygenNeighbor) {
                functionalGroups.push({ type: 'NH2', position: i, priority: functionalGroupPriority['amino'], name: 'amino' });
            }
        }

        if (atom.type === 'O') {
            const neighbors = adj[i] || [];
            const carbonNeighbors = neighbors.filter(n => atoms[n] && atoms[n].type === 'C');
            // Fix: Allow explicit Hydrogens. Check that it has exactly 1 non-Hydrogen neighbor (which must be C)
            const nonHydrogenNeighbors = neighbors.filter(n => atoms[n] && atoms[n].type !== 'H');

            if (carbonNeighbors.length === 1 && nonHydrogenNeighbors.length === 1) {
                // Check bond type to distinguish from Carbonyl (C=O)
                const bondKey = `${Math.min(i, carbonNeighbors[0])}-${Math.max(i, carbonNeighbors[0])}`;
                const bond = bondType[bondKey];
                if (bond === 'single') {
                    functionalGroups.push({ type: 'OH', position: i, priority: functionalGroupPriority['hidroxi'], name: 'hidroxi' });
                }
            }
        }

        if (atom.type === 'S') {
            const neighbors = adj[i] || [];
            const oxygenNeighbors = neighbors.filter(n => atoms[n] && atoms[n].type === 'O');
            const carbonNeighbors = neighbors.filter(n => atoms[n] && atoms[n].type === 'C');

            // sulfonico (–SO3H)
            if (oxygenNeighbors.length >= 3) {
                functionalGroups.push({ type: 'SO3H', position: i, priority: functionalGroupPriority['sulfonico'], name: 'sulfonico' });
                continue;
            }

            // sulfona o sulfonilo (–SO2–)
            if (oxygenNeighbors.length === 2) {
                if (carbonNeighbors.length === 2) {
                    functionalGroups.push({ type: 'SO2', position: i, priority: functionalGroupPriority['sulfona'], name: 'sulfona' });
                } else {
                    functionalGroups.push({ type: 'SO2_sulfonilo', position: i, priority: functionalGroupPriority['sulfonilo'], name: 'sulfonilo' });
                }
                continue;
            }

            // sulfoxido (–S=O)
            if (oxygenNeighbors.length === 1) {
                functionalGroups.push({ type: 'SO', position: i, priority: functionalGroupPriority['sulfoxido'], name: 'sulfoxido' });
                continue;
            }

            // sulfhidrilo (–SH)
            if (carbonNeighbors.length === 1 && oxygenNeighbors.length === 0) {
                functionalGroups.push({ type: 'SH', position: i, priority: functionalGroupPriority['sulfhidrilo'], name: 'sulfhidrilo' });
                continue;
            }

            // sulfuro (–S–)
            if (carbonNeighbors.length >= 2 && oxygenNeighbors.length === 0) {
                functionalGroups.push({ type: 'SR', position: i, priority: functionalGroupPriority['sulfuro'], name: 'sulfuro' });
                continue;
            }
        }


        if (atom.type === 'C') {
            const neighbors = adj[i] || [];
            const oxygenNeighbors = neighbors.filter(n => atoms[n] && atoms[n].type === 'O');
            const carbonNeighbors = neighbors.filter(n => atoms[n] && atoms[n].type === 'C');
            if (oxygenNeighbors.length === 2 && carbonNeighbors.length <= 1) {
                let hasDoubleBond = false;
                let hasSingleBond = false;
                for (const ox of oxygenNeighbors) {
                    const bondKey = `${Math.min(i, ox)}-${Math.max(i, ox)}`;
                    const bond = bondType[bondKey];
                    if (bond === 'double') hasDoubleBond = true;
                    if (bond === 'single') hasSingleBond = true;
                }
                if (hasDoubleBond && hasSingleBond) {
                    functionalGroups.push({ type: 'COOH', position: i, priority: functionalGroupPriority['carboxilo'], name: 'carboxilo' });
                }
            }
        }

        if (atom.type === 'C') {
            const neighbors = adj[i] || [];
            const oxygenNeighbors = neighbors.filter(n => atoms[n] && atoms[n].type === 'O');
            const hydrogenPresent = neighbors.some(n => atoms[n] && atoms[n].type === 'H');

            // Allow implicit Hydrogen for CHO if terminal (<= 1 C neighbor) and 1 O neighbor (double bonded)
            const carbonNeighbors = neighbors.filter(n => atoms[n] && atoms[n].type === 'C');
            const isTerminal = carbonNeighbors.length <= 1;

            if (oxygenNeighbors.length === 1 && (hydrogenPresent || isTerminal)) {
                const bondKey = `${Math.min(i, oxygenNeighbors[0])}-${Math.max(i, oxygenNeighbors[0])}`;
                const bond = bondType[bondKey];
                if (bond === 'double') {
                    functionalGroups.push({ type: 'CHO', position: i, priority: functionalGroupPriority['formilo'], name: 'formilo' });
                }
            }
        }

        if (atom.type === 'C') {
            const neighbors = adj[i] || [];
            const oxygenNeighbors = neighbors.filter(n => atoms[n] && atoms[n].type === 'O');
            const carbonNeighbors = neighbors.filter(n => atoms[n] && atoms[n].type === 'C');
            if (oxygenNeighbors.length === 1 && carbonNeighbors.length >= 2) {
                const bondKey = `${Math.min(i, oxygenNeighbors[0])}-${Math.max(i, oxygenNeighbors[0])}`;
                const bond = bondType[bondKey];
                if (bond === 'double') {
                    functionalGroups.push({ type: 'CO', position: i, priority: functionalGroupPriority['oxo'], name: 'oxo' });
                }
            }
        }

        if (haloGroups[atom.type]) {
            functionalGroups.push({ type: atom.type, position: i, priority: functionalGroupPriority['halo'], name: haloGroups[atom.type] });
        }
    }

    functionalGroups.sort((a, b) => a.priority - b.priority);
    return functionalGroups;
}

function getFunctionalGroupName(complexName, functionalGroups, carbons, connections, allAtoms, allConnections, carbonIndices, externalMainChain = null) {
    if (functionalGroups.length === 0) return complexName;

    const sulfuricGroup = functionalGroups.find(fg => fg.type === 'H2SO4');
    if (sulfuricGroup) return 'ácido sulfúrico';

    const suffixTypes = ['SO2', 'SO2_sulfonilo', 'OH', 'CO', 'SH', 'SO', 'NH2', 'CHO', 'COOH', 'SO3H', 'SO2H', 'ONO', 'ONO2'];

    const mainChain = externalMainChain || (function () {
        const principal = functionalGroups.find(fg => suffixTypes.includes(fg.type));
        if (principal) {
            const carbonPos = findConnectedCarbon(principal.position, allAtoms, allConnections);
            if (carbonPos !== -1) {
                const carbonIndex = carbonIndices.indexOf(carbonPos);
                if (carbonIndex !== -1) {
                    // Check if there's a cycle
                    const cycle = findCycle(carbons, connections);
                    if (cycle.length > 0) {
                        // There is a cycle - we need to determine if cycle or chain is parent
                        if (cycle.includes(carbonIndex)) {
                            // Principal group is ON the cycle -> Cycle is parent
                            // Return null to let getBranchedAlkaneName handle the cycle
                            return null;
                        } else {
                            // Principal group is on a chain attached to the cycle
                            // Measure the acyclic chain length (not going through the cycle)
                            const { adj } = buildAdj(carbons, connections);
                            const cycleSet = new Set(cycle);

                            let maxChainLen = 0;
                            let bestPath = [];

                            // DFS to find longest acyclic path from carbonIndex
                            function dfsChain(u, path, visited) {
                                visited.add(u);
                                path.push(u);

                                let foundNeighbor = false;
                                for (const v of adj[u]) {
                                    if (visited.has(v)) continue;
                                    if (cycleSet.has(v)) {
                                        // Reached cycle - this ends the acyclic chain
                                        // Update best if this path is longer
                                        if (path.length > maxChainLen) {
                                            maxChainLen = path.length;
                                            bestPath = [...path];
                                        }
                                        continue;
                                    }
                                    foundNeighbor = true;
                                    dfsChain(v, path, visited);
                                }

                                // If no valid neighbors and didn't reach cycle, this is a leaf
                                if (!foundNeighbor && path.length > maxChainLen) {
                                    maxChainLen = path.length;
                                    bestPath = [...path];
                                }

                                path.pop();
                                visited.delete(u);
                            }

                            dfsChain(carbonIndex, [], new Set());

                            // Compare chain length vs cycle size
                            if (maxChainLen > cycle.length) {
                                // Chain wins - use it as parent
                                return bestPath;
                            } else {
                                // Cycle wins - return null to use cycle
                                return null;
                            }
                        }
                    } else {
                        // No cycle - use longest chain containing the principal group
                        if (typeof findLongestChainContaining === 'function') {
                            return findLongestChainContaining(carbons, connections, carbonIndex);
                        }
                    }
                }
            }
        } else {
            // Check for prefix groups
            const importantPrefixes = functionalGroups.filter(fg =>
                fg.type === 'NO2' || fg.type === 'NO' || haloGroups[fg.type]
            );
            if (importantPrefixes.length > 0) {
                const firstPrefix = importantPrefixes[0];
                const carbonPos = findConnectedCarbon(firstPrefix.position, allAtoms, allConnections);
                if (carbonPos !== -1) {
                    const carbonIndex = carbonIndices.indexOf(carbonPos);
                    if (carbonIndex !== -1 && typeof findLongestChainContaining === 'function') {
                        return findLongestChainContaining(carbons, connections, carbonIndex);
                    }
                }
            }
        }
        return findLongestChain(carbons, connections);
    })();

    let finalName = complexName;
    let acidPrefix = '';
    let suffixReplaced = false;

    // Find the principal functional group (highest priority suffix)
    const principal = functionalGroups.find(fg => suffixTypes.includes(fg.type));
    if (principal) {
        const carbonPos = findConnectedCarbon(principal.position, allAtoms, allConnections);
        if (carbonPos !== -1) {
            const carbonIndex = carbonIndices.indexOf(carbonPos);
            // IMPORTANT: Only apply as suffix if the functional group is ON the main chain
            // If it's on a substituent, it should be part of the substituent name instead
            if (carbonIndex !== -1 && mainChain.indexOf(carbonIndex) !== -1) {
                // Check direction: minimize locant
                const currentPos = mainChain.indexOf(carbonIndex);
                const reversePos = mainChain.length - 1 - currentPos;
                if (reversePos < currentPos) {
                    mainChain.reverse();
                }

                const position = mainChain.indexOf(carbonIndex) + 1;
                const suffixMatch = finalName.match(/(ano|eno|ino)$/);
                if (suffixMatch) {
                    const suffix = suffixMatch[1];
                    let newSuffix = '';

                    // Helper to format name with position, omitting 1 for simple cases if desired
                    // For Ethanol (2 carbons) and Methanol (1 carbon), position is always 1, so we omit it.
                    const formatSuffix = (base, pos, ending) => {
                        if (pos === 1) {
                            return `${base}${ending}`; // e.g. etanol, metanol, propanol
                        }
                        return `${base}-${pos}-${ending}`; // e.g. propan-2-ol
                    };

                    if (principal.type === 'COOH') {
                        newSuffix = suffix === 'ano' ? 'anoico' : suffix === 'eno' ? 'enoico' : 'inoico';
                        acidPrefix = 'ácido ';
                    } else if (principal.type === 'SO3H') {
                        newSuffix = suffix === 'ano' ? 'sulfónico' : suffix === 'eno' ? 'sulfónico' : 'sulfónico';
                        finalName = `${position}-${finalName.replace(/(ano|eno|ino)$/, newSuffix)}`;
                        acidPrefix = 'ácido ';
                        suffixReplaced = true;
                        // Skip further replacement
                    } else if (principal.type === 'SO2H') {
                        newSuffix = suffix === 'ano' ? 'sulfinico' : suffix === 'eno' ? 'sulfinico' : 'sulfinico';
                        finalName = `${position}-${finalName.replace(/(ano|eno|ino)$/, newSuffix)}`;
                        acidPrefix = 'ácido ';
                        suffixReplaced = true;
                    } else if (principal.type === 'CHO') {
                        newSuffix = 'anal';
                    } else if (principal.type === 'CO') {
                        newSuffix = suffix === 'ano' ? formatSuffix('an', position, 'ona') : suffix === 'eno' ? formatSuffix('en', position, 'ona') : formatSuffix('in', position, 'ona');
                    } else if (principal.type === 'OH') {
                        newSuffix = suffix === 'ano' ? formatSuffix('an', position, 'ol') : suffix === 'eno' ? formatSuffix('en', position, 'ol') : formatSuffix('in', position, 'ol');
                    } else if (principal.type === 'SH') {
                        newSuffix = suffix === 'ano' ? formatSuffix('an', position, 'tiol') : suffix === 'eno' ? formatSuffix('en', position, 'tiol') : formatSuffix('in', position, 'tiol');
                    } else if (principal.type === 'S=O') {
                        newSuffix = suffix === 'ano' ? formatSuffix('an', position, 'sulfóxido') : suffix === 'eno' ? formatSuffix('en', position, 'sulfóxido') : formatSuffix('in', position, 'sulfóxido');
                    } else if (principal.type === 'SO2') {
                        newSuffix = suffix === 'ano' ? formatSuffix('an', position, 'sulfona') : suffix === 'eno' ? formatSuffix('en', position, 'sulfona') : formatSuffix('in', position, 'sulfona');
                    } else if (principal.type === 'SO2_sulfonilo') {
                        newSuffix = suffix === 'ano' ? formatSuffix('an', position, 'sulfonilo') : suffix === 'eno' ? formatSuffix('en', position, 'sulfonilo') : formatSuffix('in', position, 'sulfonilo');
                    } else if (principal.type === 'NH2') {
                        newSuffix = suffix === 'ano' ? formatSuffix('an', position, 'amina') : suffix === 'eno' ? formatSuffix('en', position, 'amina') : formatSuffix('in', position, 'amina');
                    } else if (principal.type === 'ONO') {
                        newSuffix = suffix === 'ano' ? formatSuffix('an', position, 'nitrito') : suffix === 'eno' ? formatSuffix('en', position, 'nitrito') : formatSuffix('in', position, 'nitrito');
                    } else if (principal.type === 'ONO2') {
                        newSuffix = suffix === 'ano' ? formatSuffix('an', position, 'nitrato') : suffix === 'eno' ? formatSuffix('en', position, 'nitrato') : formatSuffix('in', position, 'nitrato');
                    }
                    if (newSuffix && !suffixReplaced) {
                        finalName = finalName.replace(suffix, newSuffix);
                        suffixReplaced = true;
                    }
                }
                // Skip the rest of the block since we handled it
                acidPrefix = acidPrefix; // Dummy assignment to keep logic structure if needed
            } else {
                // Fallback if not in mainChain (shouldn't happen for principal group if logic is correct)
            }
        }
    }

    const prefixGroups = functionalGroups.filter(fg => !suffixTypes.includes(fg.type) && (fg.type === 'NO2' || fg.type === 'NO' || fg.type === 'OH' || (fg.type in haloGroups)));
    if (prefixGroups.length > 0) {
        const prefixParts = [];
        for (const group of prefixGroups) {
            const carbonPos = findConnectedCarbon(group.position, allAtoms, allConnections);
            if (carbonPos !== -1) {
                const carbonIndex = carbonIndices.indexOf(carbonPos);
                if (carbonIndex !== -1) {
                    const idx = mainChain.indexOf(carbonIndex);
                    if (idx !== -1) {
                        const position = idx + 1;
                        prefixParts.push({ position: position, name: group.name });
                    }
                }
            }
        }
        prefixParts.sort((a, b) => a.position - b.position);
        const groupedPrefixes = {};
        prefixParts.forEach(prefix => {
            if (!groupedPrefixes[prefix.position]) groupedPrefixes[prefix.position] = [];
            groupedPrefixes[prefix.position].push(prefix.name);
        });
        const prefixStrings = [];
        for (const [position, names] of Object.entries(groupedPrefixes)) {
            if (names.length === 1) {
                prefixStrings.push(`${position}-${names[0]}`);
            } else {
                names.sort();
                prefixStrings.push(`${position}-${names.join('-')}`);
            }
        }
        if (prefixStrings.length > 0) finalName = `${prefixStrings.join('-')} ${finalName}`;
    }

    if (acidPrefix) {
        finalName = acidPrefix + finalName;
    }

    return finalName;
}

function findConnectedCarbon(atomIndex, allAtoms, allConnections) {
    const { adj } = buildAdj(allAtoms, allConnections);
    const visited = new Set();
    const queue = [atomIndex];
    while (queue.length > 0) {
        const current = queue.shift();
        if (visited.has(current)) continue;
        visited.add(current);
        if (allAtoms[current] && allAtoms[current].type === 'C') return current;
        for (const neighbor of adj[current] || []) {
            if (!visited.has(neighbor)) queue.push(neighbor);
        }
    }
    return -1;
}

function getCompleteName(atoms, connections) {
    // Check for water (H2O)
    const counts = {};
    atoms.forEach(a => counts[a.type] = (counts[a.type] || 0) + 1);
    hidrogenos.forEach(h => counts['H'] = (counts['H'] || 0) + 1);
    if (counts['H'] === 2 && counts['O'] === 1 && Object.keys(counts).length === 2) {
        return 'agua';
    }

    if (isSpecialMolecule(atoms, connections)) {
        return "I CANT STOP, HAGALEE";
    }

    const anionName = getAnionName(atoms, connections);
    if (anionName) return anionName;

    const carbonIndices = [];
    const carbonAtoms = [];
    atoms.forEach((atom, idx) => {
        if (atom && atom.type === 'C') {
            carbonIndices.push(idx);
            carbonAtoms.push(atom);
        }
    });
    const functionalGroups = detectFunctionalGroups(atoms, connections);
    const carbonConnections = connections.filter(conn =>
        atoms[conn.i] && atoms[conn.i].type === 'C' && atoms[conn.j] && atoms[conn.j].type === 'C'
    ).map(conn => ({
        i: carbonIndices.indexOf(conn.i),
        j: carbonIndices.indexOf(conn.j),
        type: conn.type
    }));

    // Add virtual connections for sulfona (SO2) functional groups connecting two carbons
    functionalGroups.forEach(fg => {
        if (fg.type === 'SO2') {
            const { adj } = buildAdj(atoms, connections);
            const neighbors = adj[fg.position] || [];
            const carbonNeighbors = neighbors.filter(n => atoms[n] && atoms[n].type === 'C');
            if (carbonNeighbors.length === 2) {
                const i = carbonIndices.indexOf(carbonNeighbors[0]);
                const j = carbonIndices.indexOf(carbonNeighbors[1]);
                if (i !== -1 && j !== -1) {
                    // Check if connection already exists
                    const exists = carbonConnections.some(c => (c.i === i && c.j === j) || (c.i === j && c.j === i));
                    if (!exists) {
                        carbonConnections.push({ i, j, type: 'single' });
                    }
                }
            }
        }
    });

    let mainChainOverride = null;
    const suffixTypes = ['SO2', 'SO2_sulfonilo', 'OH', 'CO', 'SH', 'SO', 'NH2', 'CHO', 'COOH', 'SO3H', 'SO2H', 'ONO', 'ONO2'];
    const principal = functionalGroups.find(fg => suffixTypes.includes(fg.type));

    // Special handling for sulfona as principal functional group
    if (principal && principal.type === 'SO2') {
        const { adj } = buildAdj(atoms, connections);
        const neighbors = adj[principal.position] || [];
        const carbonNeighbors = neighbors.filter(n => atoms[n] && atoms[n].type === 'C');
        if (carbonNeighbors.length === 2) {
            const alkylNames = carbonNeighbors.map(carbonIdx => {
                // Get the alkyl name for this carbon branch
                const branchAtoms = [];
                const branchIndices = [];
                const visited = new Set();
                function dfs(node) {
                    visited.add(node);
                    branchAtoms.push(atoms[node]);
                    branchIndices.push(node);
                    for (const nb of adj[node]) {
                        if (nb === principal.position) continue;
                        if (!visited.has(nb)) dfs(nb);
                    }
                }
                dfs(carbonIdx);
                // Filter to carbons only for naming
                const branchCarbonIndices = branchIndices.filter(idx => atoms[idx].type === 'C');
                const branchCarbonAtoms = branchCarbonIndices.map(idx => atoms[idx]);
                const branchCarbonConnections = connections.filter(c =>
                    branchCarbonIndices.includes(c.i) && branchCarbonIndices.includes(c.j)
                ).map(c => ({
                    i: branchCarbonIndices.indexOf(c.i),
                    j: branchCarbonIndices.indexOf(c.j),
                    type: c.type
                }));
                const alkylName = getBranchedAlkaneName(atoms, branchCarbonAtoms, branchCarbonConnections, branchCarbonIndices);
                return alkylName || 'metil';
            });
            alkylNames.sort();
            if (alkylNames[0] === alkylNames[1]) {
                return alkylNames[0] === 'metil' ? `dimetil sulfona` : `di${alkylNames[0]} sulfona`;
            } else {
                return `${alkylNames[0]} ${alkylNames[1]} sulfona`;
            }
        }
    }

    if (principal) {
        const carbonPos = findConnectedCarbon(principal.position, atoms, connections);
        if (carbonPos !== -1) {
            const carbonIdx = carbonIndices.indexOf(carbonPos);
            if (carbonIdx !== -1) {
                // Check for cycle vs chain priority
                const cycle = findCycle(carbonAtoms, carbonConnections);
                if (cycle.length > 0) {
                    const inCycle = cycle.includes(carbonIdx);
                    if (inCycle) {
                        // Principal group is on the cycle -> Cycle is parent
                        mainChainOverride = null;
                    } else {
                        // Principal group is on a chain attached to the cycle
                        // Measure the acyclic chain length (not going through the cycle)
                        const { adj } = buildAdj(carbonAtoms, carbonConnections);
                        const cycleSet = new Set(cycle);

                        let maxChainLen = 0;
                        let bestPath = [];

                        // DFS to find longest acyclic path from carbonIdx
                        function dfsChain(u, path, visited) {
                            visited.add(u);
                            path.push(u);

                            let foundNeighbor = false;
                            for (const v of adj[u]) {
                                if (visited.has(v)) continue;
                                if (cycleSet.has(v)) {
                                    // Reached cycle - this ends the acyclic chain
                                    // Update best if this path is longer
                                    if (path.length > maxChainLen) {
                                        maxChainLen = path.length;
                                        bestPath = [...path];
                                    }
                                    continue;
                                }
                                foundNeighbor = true;
                                dfsChain(v, path, visited);
                            }

                            // If no valid neighbors and didn't reach cycle, this is a leaf
                            if (!foundNeighbor && path.length > maxChainLen) {
                                maxChainLen = path.length;
                                bestPath = [...path];
                            }

                            path.pop();
                            visited.delete(u);
                        }

                        dfsChain(carbonIdx, [], new Set());

                        // Compare chain length vs cycle size
                        if (maxChainLen > cycle.length) {
                            // Chain wins - use it as parent
                            mainChainOverride = bestPath;
                        } else {
                            // Cycle wins
                            mainChainOverride = null;
                        }
                    }
                } else {
                    // No cycle, just find chain
                    if (typeof findLongestChainContaining === 'function') {
                        mainChainOverride = findLongestChainContaining(carbonAtoms, carbonConnections, carbonIdx);
                    } else {
                        mainChainOverride = findLongestChain(carbonAtoms, carbonConnections, carbonIdx);
                    }
                }
            }
        }
    } else {
        // If no principal group, check for prefix groups (Nitro, Halo, etc.) to prioritize chain over cycle
        // BUT, if it's a prefix, it doesn't force the parent.
        // We should follow Ring vs Chain size.

        const cycle = findCycle(carbonAtoms, carbonConnections);
        if (cycle.length > 0) {
            // We have a cycle.
            // Find longest chain in the molecule (excluding cycle? or just longest path?)
            // If we let `getBranchedAlkaneName` handle it, it checks `cycleSize === carbons.length` (Case 1)
            // or `cycleSize > 0` (Case 2).
            // Case 2 in `getBranchedAlkaneName` assumes Cycle is parent if `!mainChain`.

            // So if we want Cycle to be parent, we must NOT set `mainChainOverride`.
            // If we want Chain to be parent, we MUST set `mainChainOverride`.

            // We need to decide here.
            // Compare Cycle Size vs Longest Chain Length.

            // 1. Cycle Size
            const cycleSize = cycle.length;

            // 2. Longest Chain Length
            // We need to find the longest chain that is NOT the cycle.
            // The current `findLongestChain` might return the cycle nodes if they form a long path?
            // No, `findLongestChain` does `if (hasCycle) return findCycle`.
            // So `findLongestChain` prefers cycle if it exists!

            // Wait, `findLongestChain` implementation:
            // line 233: if (hasCycle(carbons, connections)) return findCycle(carbons, connections);
            // This forces Cycle if one exists.

            // So by default, if we pass `mainChainOverride = null`, `getBranchedAlkaneName` calls `findLongestChain`,
            // which returns the cycle. So Cycle is default parent.

            // So we only need to override if Chain > Cycle.

            // How to find longest chain IGNORING the cycle preference?
            // We can't easily with current `findLongestChain`.

            // However, the issue is that for (2-nitroethyl)cyclopropane:
            // Cycle = 3. Chain = 2 (ethyl).
            // Cycle (3) > Chain (2). So Cycle should be parent.
            // So `mainChainOverride` should be null.

            // Why did it fail?
            // In the failing case:
            // "User Report: (2-nitroethyl)cyclopropane"
            // Result: "5-nitro pentano"
            // This implies `mainChainOverride` WAS set to a 5-carbon chain.

            // Why?
            // Because of this block:
            /*
            const importantPrefixes = functionalGroups.filter(fg =>
                fg.type === 'NO2' || fg.type === 'NO' || haloGroups[fg.type]
            );
            if (importantPrefixes.length > 0) {
                // ...
                mainChainOverride = findLongestChainContaining(...)
            }
            */

            // This block forces the chain containing the Nitro group to be the main chain.
            // And `findLongestChainContaining` (DFS) finds the longest path containing that node.
            // In (2-nitroethyl)cyclopropane, the longest path containing the nitro-carbon (C4)
            // is C4-C3-C0-C1-C2 (length 5, going into the ring).
            // So it creates a 5-carbon chain "pentano".

            // FIX:
            // We should NOT force `mainChainOverride` for prefix groups if the Cycle is larger or equal.
            // Or rather, we should only force it if we are sure the Chain wins.

            // If we have a cycle, we should check if the chain containing the prefix is actually longer than the cycle *as a valid chain*.
            // But a path that goes into the ring is not a valid alkane chain for nomenclature usually (ring opening).

            // So, if there is a cycle, we should probably NOT use `findLongestChainContaining` blindly.

            // Proposed Logic:
            // If `importantPrefixes` exist:
            // 1. Check if we have a cycle.
            // 2. If NO cycle -> Proceed as before (force chain).
            // 3. If YES cycle ->
            //    Check if the prefix is on the cycle.
            //    If on cycle -> Cycle is parent (do not override).
            //    If on chain -> 
            //       Compare Chain Length vs Cycle Size.
            //       How to get Chain Length?
            //       The chain is the branch attached to the cycle.
            //       We can find the cycle, identify the attachment point.
            //       Measure branch length.
            //       If Branch > Cycle -> Override with Branch.
            //       Else -> Do not override (Cycle wins).

            const importantPrefixes = functionalGroups.filter(fg =>
                fg.type === 'NO2' || fg.type === 'NO' || haloGroups[fg.type]
            );

            if (importantPrefixes.length > 0) {
                const firstPrefix = importantPrefixes[0];
                const carbonPos = findConnectedCarbon(firstPrefix.position, atoms, connections);

                if (carbonPos !== -1) {
                    const carbonIdx = carbonIndices.indexOf(carbonPos);
                    if (carbonIdx !== -1) {
                        const cycle = findCycle(carbonAtoms, carbonConnections);
                        if (cycle.length > 0) {
                            if (cycle.includes(carbonIdx)) {
                                // Prefix on cycle -> Cycle is parent
                                mainChainOverride = null;
                            } else {
                                // Prefix on chain.
                                // We need to measure the chain length properly (stopping at cycle).
                                // But `findLongestChainContaining` doesn't stop.

                                // Hack: If we don't override, `getBranchedAlkaneName` will default to Cycle.
                                // Then it will treat the chain as a substituent.
                                // This is CORRECT for (2-nitroethyl)cyclopropane (Cycle 3 > Chain 2).

                                // What if Chain > Cycle? e.g. (4-nitrobutyl)cyclopropane.
                                // Chain 4 > Cycle 3. Parent should be Butane.
                                // If we leave `mainChainOverride = null`, it picks Cycle. Wrong.

                                // So we DO need to detect if Chain > Cycle.
                                // How to measure chain length?
                                // BFS from carbonIdx until we hit the cycle?

                                // Let's try to find the path from carbonIdx to the cycle.
                                const { adj } = buildAdj(carbonAtoms, carbonConnections);
                                const cycleSet = new Set(cycle);

                                let maxChainLen = 0;
                                let bestPath = [];

                                // DFS to find longest path starting at carbonIdx that does NOT enter the cycle (except at the attachment point)
                                // Actually, the chain ends at the attachment point.

                                const visited = new Set();
                                function dfsChain(u, path) {
                                    visited.add(u);
                                    path.push(u);

                                    let isEnd = true;
                                    for (const v of adj[u]) {
                                        if (path.includes(v)) continue; // avoid loops
                                        if (cycleSet.has(v)) {
                                            // Reached cycle. This is the end of the acyclic chain.
                                            // Path length includes u, but not v (cycle atom).
                                            // So current path is the chain.
                                            if (path.length > maxChainLen) {
                                                maxChainLen = path.length;
                                                bestPath = [...path];
                                            }
                                        } else {
                                            isEnd = false;
                                            dfsChain(v, path);
                                        }
                                    }

                                    if (isEnd) {
                                        // End of branch (leaf)
                                        if (path.length > maxChainLen) {
                                            maxChainLen = path.length;
                                            bestPath = [...path];
                                        }
                                    }

                                    path.pop();
                                    visited.delete(u);
                                }

                                dfsChain(carbonIdx, []);

                                if (maxChainLen > cycle.length) {
                                    // Chain wins.
                                    // We need to set mainChainOverride to this chain.
                                    // But `bestPath` is just from Nitro to Cycle.
                                    // The chain might extend in other directions?
                                    // Assume linear chain for now.
                                    mainChainOverride = bestPath;
                                } else {
                                    // Cycle wins.
                                    mainChainOverride = null;
                                }
                            }
                        } else {
                            // No cycle, force chain
                            if (typeof findLongestChainContaining === 'function') {
                                mainChainOverride = findLongestChainContaining(carbonAtoms, carbonConnections, carbonIdx);
                            }
                        }
                    }
                }
            }
        }
    }

    // Determine the main chain used for functional group positioning
    let usedMainChain = mainChainOverride;
    if (!usedMainChain) {
        const cycle = findCycle(carbonAtoms, carbonConnections);
        if (cycle.length > 0) {
            usedMainChain = cycle;
        } else {
            usedMainChain = findLongestChain(carbonAtoms, carbonConnections);
        }
    }

    let baseName = getBranchedAlkaneName(atoms, carbonAtoms, carbonConnections, carbonIndices, mainChainOverride, connections);
    if (!baseName) baseName = 'metano';

    let completeName = getFunctionalGroupName(baseName, functionalGroups, carbonAtoms, carbonConnections, atoms, connections, carbonIndices, usedMainChain);

    // If no organic name, try inorganic
    if ((!completeName || completeName === 'metano') && carbonIndices.length === 0) {
        if (atoms.length === 1) {
            return elementos[atoms[0].type].nombre;
        } else {
            const counts = {};
            atoms.forEach(a => counts[a.type] = (counts[a.type] || 0) + 1);
            // else formula
            let formula = '';
            const order = ['C', 'H', 'O', 'N', 'S', 'I'];
            order.forEach(el => {
                if (counts[el]) {
                    formula += el + (counts[el] > 1 ? counts[el] : '');
                }
            });
            return formula;
        }
    }

    return completeName;
}

function getFunctionalGroupInfo(atoms, connections) {
    const groups = detectFunctionalGroups(atoms, connections);
    return groups.map(group => ({ type: group.type, name: group.name, position: group.position, priority: group.priority }));
}

function getAnionName(atoms, connections) {
    const { adj } = buildAdj(atoms, connections);
    let central = -1;
    let maxNeighbors = 0;
    for (let i = 0; i < atoms.length; i++) {
        const atom = atoms[i];
        if (!atom || atom.type === 'H') continue;
        const neighbors = adj[i] || [];
        if (neighbors.length > maxNeighbors) {
            maxNeighbors = neighbors.length;
            central = i;
        }
    }
    if (central === -1) return null;
    const centralType = atoms[central].type;
    if (centralType !== 'N' && centralType !== 'S' && centralType !== 'C') return null;
    const neighbors = adj[central] || [];
    let oCount = 0;
    let hCount = 0;
    let hasCNeighbor = false;
    for (const n of neighbors) {
        const nType = atoms[n] ? atoms[n].type : '';
        if (nType === 'O') oCount++;
        else if (nType === 'H') hCount++;
        else if (nType === 'C') hasCNeighbor = true;
    }
    if (hasCNeighbor) return null;
    if (centralType === 'N') {
        if (oCount === 3) return 'ion nitrato';
        if (oCount === 2) return 'ion nitrito';
    } else if (centralType === 'S') {
        if (oCount === 4) return 'ion sulfato';
        if (oCount === 3) return 'ion sulfito';
    } else if (centralType === 'C') {
        if (oCount === 3) return 'ion carbonato';
        if (oCount === 2 && hCount === 1) return 'ion hidrogenocarbonato';
    }
    return null;
}

function getDetailedNomenclature(atoms, connections) {
    const completeName = getCompleteName(atoms, connections);
    const functionalGroups = getFunctionalGroupInfo(atoms, connections);
    const carbonIndices = [];
    atoms.forEach((atom, idx) => {
        if (atom && atom.type === 'C') carbonIndices.push(idx);
    });
    const carbonAtoms = carbonIndices.map(idx => atoms[idx]);
    const carbonConnections = connections.filter(conn =>
        atoms[conn.i] && atoms[conn.i].type === 'C' && atoms[conn.j] && atoms[conn.j].type === 'C'
    ).map(conn => ({
        i: carbonIndices.indexOf(conn.i),
        j: carbonIndices.indexOf(conn.j),
        type: conn.type
    }));
    return {
        nombreCompleto: completeName,
        gruposFuncionales: functionalGroups,
        cadenaPrincipal: findLongestChain(carbonAtoms, carbonConnections).length
    };
}

function isSpecialMolecule(atoms, connections) {
    // New check: if molecule contains sulfur (S), nitro (NO2), or iodine (I), return false
    if (atoms.some(a => a.type === 'S' || a.type === 'I' || a.type === 'NO2')) {
        return false;
    }

    const carbonIndices = atoms.map((a, i) => a.type === 'C' ? i : -1).filter(i => i !== -1);
    if (carbonIndices.length < 5) return false;

    const { adj } = buildAdj(atoms, connections);
    const functionalGroups = detectFunctionalGroups(atoms, connections);

    const coohGroups = functionalGroups.filter(fg => fg.type === 'COOH');
    const ohGroups = functionalGroups.filter(fg => fg.type === 'OH');
    if (coohGroups.length < 3 || ohGroups.length < 1) return false;

    const carbonConnections = connections.filter(conn => carbonIndices.includes(conn.i) && carbonIndices.includes(conn.j));
    const carbonAtoms = carbonIndices.map(idx => atoms[idx]);
    const longest = findLongestChain(carbonAtoms, carbonConnections);
    const mainChain = longest;
    const chainCarbons = mainChain.map(i => carbonIndices[i]);

    const coohOnEnds = coohGroups.filter(fg => {
        const connectedC = findConnectedCarbon(fg.position, atoms, connections);
        return connectedC === chainCarbons[0] || connectedC === chainCarbons[chainCarbons.length - 1];
    });

    if (coohOnEnds.length !== 2) return false;

    const ohOnMiddle = ohGroups.some(fg => {
        const connectedC = findConnectedCarbon(fg.position, atoms, connections);
        return chainCarbons.includes(connectedC) && connectedC !== chainCarbons[0] && connectedC !== chainCarbons[chainCarbons.length - 1];
    });

    if (!ohOnMiddle) return false;

    const externalCOOH = coohGroups.find(fg => {
        const connectedC = findConnectedCarbon(fg.position, atoms, connections);
        return !chainCarbons.includes(connectedC);
    });

    return !!externalCOOH;
}



if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        detectFunctionalGroups,
        getFunctionalGroupName,
        getCompleteName,
        getFunctionalGroupInfo,
        getDetailedNomenclature,
        getAnionName,
        functionalGroupPriority,
        functionalGroupNames,
        haloGroups,
        isSpecialMolecule
    };
}
