const functionalGroupPriority = {
    'carboxilo': 1,
    'sulfonico': 2,
    'sulfinico': 3,
    'formilo': 4,
    'oxo': 5,
    'hidroxi': 6,
    'amino': 7,
    'nitro': 8,
    'sulfhidrilo': 9,
    'sulfoxido': 10,
    'sulfona': 11,
    'sulfuro': 12,
    'halo': 13
};

const functionalGroupNames = {
    'NO2': 'nitro',
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
            if (oxygenNeighbors.length >= 2) {
                functionalGroups.push({ type: 'NO2', position: i, priority: functionalGroupPriority['nitro'], name: 'nitro' });
            }
        }

        if (atom.type === 'N') {
            const neighbors = adj[i] || [];
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
            const hydrogenNeighbors = neighbors.filter(n => atoms[n] && atoms[n].type === 'H');
            const carbonNeighbors = neighbors.filter(n => atoms[n] && atoms[n].type === 'C');
            const oxygenNeighbors = neighbors.filter(n => atoms[n] && atoms[n].type === 'O');
            const sulfurNeighbors = neighbors.filter(n => atoms[n] && atoms[n].type === 'S');

            if (oxygenNeighbors.length === 4 && carbonNeighbors.length === 0) {
                let doubleBondCount = 0;
                let ohCount = 0;
                for (const ox of oxygenNeighbors) {
                    const bondKey = `${Math.min(i, ox)}-${Math.max(i, ox)}`;
                    const bond = bondType[bondKey];
                    if (bond === 'double') doubleBondCount++;
                    const oxNeighbors = adj[ox] || [];
                    if (oxNeighbors.some(n => atoms[n] && atoms[n].type === 'H')) ohCount++;
                }
                if (doubleBondCount === 2 && ohCount === 2) {
                    functionalGroups.push({ type: 'H2SO4', position: i, priority: 1, name: 'sulfúrico' });
                    continue;
                }
            }

            if (oxygenNeighbors.length === 3 && carbonNeighbors.length === 1) {
                let doubleBondCount = 0;
                let hasOH = false;
                for (const ox of oxygenNeighbors) {
                    const bondKey = `${Math.min(i, ox)}-${Math.max(i, ox)}`;
                    const bond = bondType[bondKey];
                    if (bond === 'double') doubleBondCount++;
                    const oxNeighbors = adj[ox] || [];
                    if (oxNeighbors.some(n => atoms[n] && atoms[n].type === 'H')) hasOH = true;
                }
                if (doubleBondCount === 2 && hasOH) {
                    functionalGroups.push({ type: 'SO3H', position: i, priority: functionalGroupPriority['sulfonico'], name: 'sulfonico' });
                    continue;
                }
            }

            if (oxygenNeighbors.length === 2 && carbonNeighbors.length === 1) {
                let doubleBondCount = 0;
                let hasOH = false;
                for (const ox of oxygenNeighbors) {
                    const bondKey = `${Math.min(i, ox)}-${Math.max(i, ox)}`;
                    const bond = bondType[bondKey];
                    if (bond === 'double') doubleBondCount++;
                    const oxNeighbors = adj[ox] || [];
                    if (oxNeighbors.some(n => atoms[n] && atoms[n].type === 'H')) hasOH = true;
                }
                if (doubleBondCount === 1 && hasOH) {
                    functionalGroups.push({ type: 'SO2H', position: i, priority: functionalGroupPriority['sulfinico'], name: 'sulfinico' });
                    continue;
                }
            }

            if (oxygenNeighbors.length === 2 && carbonNeighbors.length === 2) {
                let doubleBondCount = 0;
                for (const ox of oxygenNeighbors) {
                    const bondKey = `${Math.min(i, ox)}-${Math.max(i, ox)}`;
                    const bond = bondType[bondKey];
                    if (bond === 'double') doubleBondCount++;
                }
                if (doubleBondCount === 2) {
                    functionalGroups.push({ type: 'SO2', position: i, priority: functionalGroupPriority['sulfona'], name: 'sulfona' });
                    continue;
                }
            }

            if (oxygenNeighbors.length === 1 && carbonNeighbors.length >= 2) {
                const bondKey = `${Math.min(i, oxygenNeighbors[0])}-${Math.max(i, oxygenNeighbors[0])}`;
                const bond = bondType[bondKey];
                if (bond === 'double') {
                    functionalGroups.push({ type: 'S=O', position: i, priority: functionalGroupPriority['sulfoxido'], name: 'sulfoxido' });
                    continue;
                }
            }

            if ((hydrogenNeighbors.length === 1 && carbonNeighbors.length === 1 && neighbors.length === 2) || (hydrogenNeighbors.length === 0 && carbonNeighbors.length === 1 && neighbors.length === 1)) {
                functionalGroups.push({ type: 'SH', position: i, priority: functionalGroupPriority['sulfhidrilo'], name: 'sulfhidrilo' });
                continue;
            }

            if (carbonNeighbors.length === 2 && oxygenNeighbors.length === 0 && hydrogenNeighbors.length === 0) {
                functionalGroups.push({ type: 'SR', position: i, priority: functionalGroupPriority['sulfuro'], name: 'sulfuro' });
                continue;
            }

            if (sulfurNeighbors.length >= 1) {
                const connectedToS = sulfurNeighbors.some(sidx => atoms[sidx] && atoms[sidx].type === 'S');
                if (connectedToS) {
                    functionalGroups.push({ type: 'S-S', position: i, priority: functionalGroupPriority['sulfuro'], name: 'disulfuro' });
                    continue;
                }
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

    const carboxiloGroup = functionalGroups.find(fg => fg.type === 'COOH');
    if (carboxiloGroup) {
        const carbonPos = findConnectedCarbon(carboxiloGroup.position, allAtoms, allConnections);
        if (carbonPos !== -1) {
            const carbonIndex = carbonIndices.indexOf(carbonPos);
            if (carbonIndex !== -1) {
                finalName = `ácido ${finalName.replace('ano', 'anoico')}`;
                return finalName;
            }
        }
    }

    const sulfoGroup = functionalGroups.find(fg => fg.type === 'SO3H');
    if (sulfoGroup) {
        const carbonPos = findConnectedCarbon(sulfoGroup.position, allAtoms, allConnections);
        if (carbonPos !== -1) {
            const carbonIndex = carbonIndices.indexOf(carbonPos);
            if (carbonIndex !== -1) {
                const position = mainChain.indexOf(carbonIndex) + 1;
                finalName = `ácido ${position}-${finalName.replace('ano', 'sulfónico')}`;
                return finalName;
            }
        }
    }

    const sulfinicoGroup = functionalGroups.find(fg => fg.type === 'SO2H');
    if (sulfinicoGroup) {
        const carbonPos = findConnectedCarbon(sulfinicoGroup.position, allAtoms, allConnections);
        if (carbonPos !== -1) {
            const carbonIndex = carbonIndices.indexOf(carbonPos);
            if (carbonIndex !== -1) {
                const position = mainChain.indexOf(carbonIndex) + 1;
                finalName = `ácido ${position}-${finalName.replace('ano', 'sulfinico')}`;
                return finalName;
            }
        }
    }

    const formiloGroup = functionalGroups.find(fg => fg.type === 'CHO');
    if (formiloGroup) {
        const carbonPos = findConnectedCarbon(formiloGroup.position, allAtoms, allConnections);
        if (carbonPos !== -1) {
            const carbonIndex = carbonIndices.indexOf(carbonPos);
            if (carbonIndex !== -1) {
                finalName = finalName.replace('ano', 'anal');
                return finalName;
            }
        }
    }

    const oxoGroup = functionalGroups.find(fg => fg.type === 'CO');
    if (oxoGroup) {
        const carbonPos = findConnectedCarbon(oxoGroup.position, allAtoms, allConnections);
        if (carbonPos !== -1) {
            const carbonIndex = carbonIndices.indexOf(carbonPos);
            if (carbonIndex !== -1) {
                const position = mainChain.indexOf(carbonIndex) + 1;
                finalName = finalName.replace('ano', `an-${position}-ona`);
                return finalName;
            }
        }
    }

    const hidroxiGroup = functionalGroups.find(fg => fg.type === 'OH');
    if (hidroxiGroup) {
        const carbonPos = findConnectedCarbon(hidroxiGroup.position, allAtoms, allConnections);
        if (carbonPos !== -1) {
            const carbonIndex = carbonIndices.indexOf(carbonPos);
            if (carbonIndex !== -1) {
                const position = mainChain.indexOf(carbonIndex) + 1;
                finalName = finalName.replace('ano', `an-${position}-ol`);
                return finalName;
            }
        }
    }

    const tiolGroup = functionalGroups.find(fg => fg.type === 'SH');
    if (tiolGroup) {
        const carbonPos = findConnectedCarbon(tiolGroup.position, allAtoms, allConnections);
        if (carbonPos !== -1) {
            const carbonIndex = carbonIndices.indexOf(carbonPos);
            if (carbonIndex !== -1) {
                const position = mainChain.indexOf(carbonIndex) + 1;
                finalName = finalName.replace('ano', `an-${position}-tiol`);
                return finalName;
            }
        }
    }

    const sulfoxidoGroup = functionalGroups.find(fg => fg.type === 'S=O');
    if (sulfoxidoGroup) {
        const carbonPos = findConnectedCarbon(sulfoxidoGroup.position, allAtoms, allConnections);
        if (carbonPos !== -1) {
            const carbonIndex = carbonIndices.indexOf(carbonPos);
            if (carbonIndex !== -1) {
                const position = mainChain.indexOf(carbonIndex) + 1;
                finalName = finalName.replace('ano', `an-${position}-sulfóxido`);
                return finalName;
            }
        }
    }

    const sulfonaGroup = functionalGroups.find(fg => fg.type === 'SO2');
    if (sulfonaGroup) {
        const carbonPos = findConnectedCarbon(sulfonaGroup.position, allAtoms, allConnections);
        if (carbonPos !== -1) {
            const carbonIndex = carbonIndices.indexOf(carbonPos);
            if (carbonIndex !== -1) {
                const position = mainChain.indexOf(carbonIndex) + 1;
                finalName = finalName.replace('ano', `an-${position}-sulfona`);
                return finalName;
            }
        }
    }

    const aminoGroup = functionalGroups.find(fg => fg.type === 'NH2');
    if (aminoGroup) {
        const carbonPos = findConnectedCarbon(aminoGroup.position, allAtoms, allConnections);
        if (carbonPos !== -1) {
            const carbonIndex = carbonIndices.indexOf(carbonPos);
            if (carbonIndex !== -1) {
                const position = mainChain.indexOf(carbonIndex) + 1;
                finalName = finalName.replace('ano', `an-${position}-amina`);
                return finalName;
            }
        }
    }

    const prefixGroups = functionalGroups.filter(fg => fg.type === 'NO2' || (fg.type in haloGroups));
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
    const carbonConnections = connections.filter(conn =>
        atoms[conn.i] && atoms[conn.i].type === 'C' && atoms[conn.j] && atoms[conn.j].type === 'C'
    ).map(conn => ({
        i: carbonIndices.indexOf(conn.i),
        j: carbonIndices.indexOf(conn.j),
        type: conn.type
    }));
    let baseName = getBranchedAlkaneName(carbonAtoms, carbonConnections);
    if (!baseName) baseName = 'metano';
    const functionalGroups = detectFunctionalGroups(atoms, connections);
    const completeName = getFunctionalGroupName(baseName, functionalGroups, carbonAtoms, carbonConnections, atoms, connections, carbonIndices);
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
    return {
        nombreCompleto: completeName,
        gruposFuncionales: functionalGroups,
        cadenaPrincipal: findLongestChain(
            atoms.filter(atom => atom && atom.type === 'C'),
            connections.filter(conn => atoms[conn.i] && atoms[conn.i].type === 'C' && atoms[conn.j] && atoms[conn.j].type === 'C')
        ).length
    };
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
        haloGroups
    };
}
