const elementos = {
    H: {
        simbolo: 'H',
        nombre: 'Hidrógeno',
        valencia: 1,
        color: '#ffffff',
        radio: HYDROGEN_SIZE
    },
    C: {
        simbolo: 'C',
        nombre: 'Carbono',
        valencia: 4,
        color: '#000000',
        radio: ELEMENT_SIZE
    },
    O: {
        simbolo: 'O',
        nombre: 'Oxígeno',
        valencia: 2,
        color: '#ff0000',
        radio: ELEMENT_SIZE
    },
    S: {
        simbolo: 'S',
        nombre: 'Azufre',
        valencia: 6,
        color: '#ffff00',
        radio: ELEMENT_SIZE
    },
    N: {
        simbolo: 'N',
        nombre: 'Nitrógeno',
        valencia: 3,
        color: '#0000ff',
        radio: ELEMENT_SIZE
    },
    I: {
        simbolo: 'I',
        nombre: 'Yodo',
        valencia: 1,
        color: '#800080',
        radio: ELEMENT_SIZE
    }
};

function getElement(symbol) {
    return elementos[symbol];
}

function getValencia(symbol) {
    const el = getElement(symbol);
    return el ? el.valencia : 0;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        elementos,
        getElement,
        getValencia
    };
}
