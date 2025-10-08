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
            const oxygenNeighbors = neighbors.filter(n => atoms[n] && atoms[n].type === 'O');
            const carbonNeighbors = neighbors.filter(n => atoms[n] && atoms[n].type === 'C');

            console.log("oxigenos: " + oxygenNeighbors.length + " carbonos: " + carbonNeighbors.length);


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

    const carboxiloGroup = functionalGroups.find(fg => fg.type === 'COOH');
    if (carboxiloGroup) {
        const carbonPos = findConnectedCarbon(carboxiloGroup.position, allAtoms, allConnections);
        if (carbonPos !== -1) {
            const carbonIndex = carbonIndices.indexOf(carbonPos);
            if (carbonIndex !== -1) {
                const suffixMatch = finalName.match(/(ano|eno|ino)$/);
                if (suffixMatch) {
                    const suffix = suffixMatch[1];
                    const newSuffix = suffix === 'ano' ? 'anoico' : suffix === 'eno' ? 'enoico' : 'inoico';
                    finalName = `ácido ${finalName.replace(suffix, newSuffix)}`;
                }
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
                const suffixMatch = finalName.match(/(ano|eno|ino)$/);
                if (suffixMatch) {
                    const suffix = suffixMatch[1];
                    const newSuffix = suffix === 'ano' ? `an-${position}-ona` : suffix === 'eno' ? `en-${position}-ona` : `in-${position}-ona`;
                    finalName = finalName.replace(suffix, newSuffix);
                }
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
                const suffixMatch = finalName.match(/(ano|eno|ino)$/);
                if (suffixMatch) {
                    const suffix = suffixMatch[1];
                    const newSuffix = suffix === 'ano' ? `an-${position}-ol` : suffix === 'eno' ? `en-${position}-ol` : `in-${position}-ol`;
                    finalName = finalName.replace(suffix, newSuffix);
                }
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
                const suffixMatch = finalName.match(/(ano|eno|ino)$/);
                if (suffixMatch) {
                    const suffix = suffixMatch[1];
                    const newSuffix = suffix === 'ano' ? `an-${position}-tiol` : suffix === 'eno' ? `en-${position}-tiol` : `in-${position}-tiol`;
                    finalName = finalName.replace(suffix, newSuffix);
                }
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
                const suffixMatch = finalName.match(/(ano|eno|ino)$/);
                if (suffixMatch) {
                    const suffix = suffixMatch[1];
                    const newSuffix = suffix === 'ano' ? `an-${position}-sulfóxido` : suffix === 'eno' ? `en-${position}-sulfóxido` : `in-${position}-sulfóxido`;
                    finalName = finalName.replace(suffix, newSuffix);
                }
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
                const suffixMatch = finalName.match(/(ano|eno|ino)$/);
                if (suffixMatch) {
                    const suffix = suffixMatch[1];
                    const newSuffix = suffix === 'ano' ? `an-${position}-sulfona` : suffix === 'eno' ? `en-${position}-sulfona` : `in-${position}-sulfona`;
                    finalName = finalName.replace(suffix, newSuffix);
                }
                return finalName;
            }
        }
    }

    const sulfoniloGroup = functionalGroups.find(fg => fg.type === 'SO2_sulfonilo');
    if (sulfoniloGroup) {
        const carbonPos = findConnectedCarbon(sulfoniloGroup.position, allAtoms, allConnections);
        if (carbonPos !== -1) {
            const carbonIndex = carbonIndices.indexOf(carbonPos);
            if (carbonIndex !== -1) {
                const position = mainChain.indexOf(carbonIndex) + 1;
                const suffixMatch = finalName.match(/(ano|eno|ino)$/);
                if (suffixMatch) {
                    const suffix = suffixMatch[1];
                    const newSuffix = suffix === 'ano' ? `an-${position}-sulfonilo` : suffix === 'eno' ? `en-${position}-sulfonilo` : `in-${position}-sulfonilo`;
                    finalName = finalName.replace(suffix, newSuffix);
                }
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
                const suffixMatch = finalName.match(/(ano|eno|ino)$/);
                if (suffixMatch) {
                    const suffix = suffixMatch[1];
                    const newSuffix = suffix === 'ano' ? `an-${position}-amina` : suffix === 'eno' ? `en-${position}-amina` : `in-${position}-amina`;
                    finalName = finalName.replace(suffix, newSuffix);
                }
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
    const suffixTypes = ['OH', 'CO', 'SH', 'SO2', 'SO', 'SO2_sulfonilo', 'NH2', 'CHO', 'COOH', 'SO3H', 'SO2H'];
    const principal = functionalGroups.find(fg => suffixTypes.includes(fg.type));
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
