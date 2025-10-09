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
            if (carbonNeighbors.length === 1 && neighbors.length <= 3) {
                functionalGroups.push({ type: 'NH2', position: i, priority: functionalGroupPriority['amino'], name: 'amino' });
            }
        }

        if (atom.type === 'O') {
            const neighbors = adj[i] || [];
            const carbonNeighbors = neighbors.filter(n => atoms[n] && atoms[n].type === 'C');
            if (carbonNeighbors.length === 1 && neighbors.length === 1) {
                functionalGroups.push({ type: 'OH', position: i, priority: functionalGroupPriority['hidroxi'], name: 'hidroxi' });
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
            if (oxygenNeighbors.length === 2 && carbonNeighbors.length === 1) {
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
            if (oxygenNeighbors.length === 1 && hydrogenPresent) {
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

function getFunctionalGroupName(complexName, functionalGroups, carbons, connections, allAtoms, allConnections, carbonIndices) {
    if (functionalGroups.length === 0) return complexName;

    const sulfuricGroup = functionalGroups.find(fg => fg.type === 'H2SO4');
    if (sulfuricGroup) return 'ácido sulfúrico';

    const mainChain = findLongestChain(carbons, connections);
    let finalName = complexName;
    let acidPrefix = '';
    let suffixReplaced = false;

    const suffixTypes = ['SO2', 'SO2_sulfonilo', 'OH', 'CO', 'SH', 'SO', 'NH2', 'CHO', 'COOH', 'SO3H', 'SO2H', 'ONO', 'ONO2'];

    // Find the principal functional group (highest priority suffix)
    const principal = functionalGroups.find(fg => suffixTypes.includes(fg.type));
    if (principal) {
        const carbonPos = findConnectedCarbon(principal.position, allAtoms, allConnections);
        if (carbonPos !== -1) {
            const carbonIndex = carbonIndices.indexOf(carbonPos);
            if (carbonIndex !== -1) {
                const position = mainChain.indexOf(carbonIndex) + 1;
                const suffixMatch = finalName.match(/(ano|eno|ino)$/);
                if (suffixMatch) {
                    const suffix = suffixMatch[1];
                    let newSuffix = '';
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
                        newSuffix = suffix === 'ano' ? `an-${position}-ona` : suffix === 'eno' ? `en-${position}-ona` : `in-${position}-ona`;
                    } else if (principal.type === 'OH') {
                        newSuffix = suffix === 'ano' ? `an-${position}-ol` : suffix === 'eno' ? `en-${position}-ol` : `in-${position}-ol`;
                    } else if (principal.type === 'SH') {
                        newSuffix = suffix === 'ano' ? `an-${position}-tiol` : suffix === 'eno' ? `en-${position}-tiol` : `in-${position}-tiol`;
                    } else if (principal.type === 'S=O') {
                        newSuffix = suffix === 'ano' ? `an-${position}-sulfóxido` : suffix === 'eno' ? `en-${position}-sulfóxido` : `in-${position}-sulfóxido`;
                    } else if (principal.type === 'SO2') {
                        newSuffix = suffix === 'ano' ? `an-${position}-sulfona` : suffix === 'eno' ? `en-${position}-sulfona` : `in-${position}-sulfona`;
                    } else if (principal.type === 'SO2_sulfonilo') {
                        newSuffix = suffix === 'ano' ? `an-${position}-sulfonilo` : suffix === 'eno' ? `en-${position}-sulfonilo` : `in-${position}-sulfonilo`;
                    } else if (principal.type === 'NH2') {
                        newSuffix = suffix === 'ano' ? `an-${position}-amina` : suffix === 'eno' ? `en-${position}-amina` : `in-${position}-amina`;
                    } else if (principal.type === 'ONO') {
                        newSuffix = suffix === 'ano' ? `an-${position}-nitrito` : suffix === 'eno' ? `en-${position}-nitrito` : `in-${position}-nitrito`;
                    } else if (principal.type === 'ONO2') {
                        newSuffix = suffix === 'ano' ? `an-${position}-nitrato` : suffix === 'eno' ? `en-${position}-nitrato` : `in-${position}-nitrato`;
                    }
                    if (newSuffix && !suffixReplaced) {
                        finalName = finalName.replace(suffix, newSuffix);
                        suffixReplaced = true;
                    }
                }
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
                    const position = mainChain.indexOf(carbonIndex) + 1;
                    prefixParts.push({ position: position, name: group.name });
                } else {
                    prefixParts.push({ position: 1, name: group.name });
                }
            } else {
                prefixParts.push({ position: 1, name: group.name });
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
                mainChainOverride = findLongestChain(carbonAtoms, carbonConnections, carbonIdx);
            }
        }
    }

    let baseName = getBranchedAlkaneName(atoms, carbonAtoms, carbonConnections, carbonIndices, mainChainOverride);
    if (!baseName) baseName = 'metano';
    let completeName = getFunctionalGroupName(baseName, functionalGroups, carbonAtoms, carbonConnections, atoms, connections, carbonIndices);

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
