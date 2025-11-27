// Modo Práctica - Lógica del juego
let config = null;
let practiceElementsInitialized = false;
let gameState = {
    difficulty: 'normal',
    currentQuestion: 0,
    score: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    selectedElements: [],
    timePerQuestion: 60,
    timeRemaining: 60,
    timerInterval: null,
    startTime: null,
    questionTimes: []
};

// Cargar configuración de dificultades
async function loadConfig() {
    try {
        const response = await fetch('config/dificultades.json');
        config = await response.json();
        console.log('Configuración cargada:', config);
    } catch (error) {
        console.error('Error al cargar configuración:', error);
        // Configuración por defecto si falla la carga
        config = {
            facil: {
                elementos: ["metano", "etano", "propano"],
                tiempoSegundos: 45,
                descripcion: "Moléculas simples"
            },
            normal: {
                elementos: ["pentano", "hexano", "butanol"],
                tiempoSegundos: 60,
                descripcion: "Moléculas con ramificaciones"
            },
            dificil: {
                elementos: ["2,3-dimetilpentano", "3-etil-2-metilhexano"],
                tiempoSegundos: 90,
                descripcion: "Moléculas complejas"
            }
        };
    }
}

// Inicializar el juego al cargar la página
document.addEventListener('DOMContentLoaded', async () => {
    await loadConfig();
    initMenuScreen();
});

// ===== PANTALLA DE MENÚ =====
function initMenuScreen() {
    const cards = document.querySelectorAll('.difficulty-card');
    const startBtn = document.querySelector('.btn-start');

    // Selección de dificultad
    cards.forEach(card => {
        card.addEventListener('click', () => {
            cards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            gameState.difficulty = card.dataset.difficulty;
        });
    });

    // Botón de comenzar
    startBtn.addEventListener('click', () => {
        startGame();
    });
}

function startGame() {
    // Seleccionar elementos aleatorios según la dificultad
    const difficultyConfig = config[gameState.difficulty];
    gameState.timePerQuestion = difficultyConfig.tiempoSegundos;

    // Usar el número de preguntas del config, o 10 por defecto
    const numQuestions = difficultyConfig.numeroPreguntas || 10;

    const allElements = difficultyConfig.elementos;
    gameState.selectedElements = selectRandomElements(allElements, numQuestions);

    console.log(`Juego iniciado con ${numQuestions} preguntas:`, gameState.selectedElements);

    // Resetear estado del juego
    gameState.currentQuestion = 0;
    gameState.score = 0;
    gameState.correctAnswers = 0;
    gameState.wrongAnswers = 0;
    gameState.questionTimes = [];

    // Mostrar cuenta regresiva
    showCountdown();
}

function selectRandomElements(array, count) {
    const shuffled = [...array].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, array.length));
}

// ===== CUENTA REGRESIVA =====
function showCountdown() {
    showScreen('countdown-screen');
    const countdownNumber = document.querySelector('.countdown-number');

    let count = 3;
    countdownNumber.textContent = count;

    const interval = setInterval(() => {
        count--;
        if (count > 0) {
            countdownNumber.textContent = count;
            countdownNumber.style.animation = 'none';
            setTimeout(() => {
                countdownNumber.style.animation = 'pulse 1s ease-in-out';
            }, 10);
        } else {
            clearInterval(interval);
            startGameRound();
        }
    }, 1000);
}

// Función para inicializar los eventos de creación de elementos
function initializeElementCreation() {
    const elements = document.querySelectorAll('.element');

    elements.forEach(element => {
        element.addEventListener('click', function (e) {
            const elementType = e.target.dataset.element;
            const size = elementType === 'H' ? HYDROGEN_SIZE : ELEMENT_SIZE;
            const elementData = getElement(elementType);

            const newElement = document.createElement('div');
            newElement.classList.add('atom');
            newElement.textContent = elementType;
            newElement.style.position = 'absolute';
            newElement.style.width = size + 'px';
            newElement.style.height = size + 'px';
            newElement.style.backgroundColor = elementData.color;
            if (elementType === 'C' || elementType === 'N' || elementType === 'O' || elementType === 'S' || elementType === 'I') {
                newElement.style.color = 'white';
                if (elementType === 'S') newElement.style.color = 'black';
            }

            world.appendChild(newElement);

            if (elementType === 'C' && atoms.filter(a => a.type === 'C').length >= MAX_CARBONS) {
                return;
            }

            if (elementType === 'C') {
                if (atoms.length === 0) {
                    const centerX = (-panX + viewport.clientWidth / 2) / zoom;
                    const centerY = (-panY + viewport.clientHeight / 2) / zoom;
                    newElement.style.left = (centerX - size / 2) + 'px';
                    newElement.style.top = (centerY - size / 2) + 'px';
                    newElement.addEventListener('mousedown', startDrag);
                    newElement.addEventListener('touchstart', startDrag);
                    atoms.push({ type: 'C', element: newElement });

                    newElement.addEventListener('dblclick', function () {
                        const index = atoms.findIndex(a => a.element === newElement);
                        if (index > -1) {
                            atoms.splice(index, 1);
                            const attachedHAttachments = hydrogenAttachments.filter(a => a.cIndex === index);
                            attachedHAttachments.forEach(att => {
                                const hEl = hidrogenos[att.hIndex];
                                if (hEl && hEl.parentNode === world) {
                                    world.removeChild(hEl);
                                }
                            });
                            hydrogenAttachments = hydrogenAttachments.filter(a => a.cIndex !== index);
                            hydrogenAttachments.forEach(a => {
                                if (a.cIndex > index) a.cIndex--;
                            });
                            hidrogenos = hidrogenos.filter(h => h.parentNode === world);
                            const oldH = [...hidrogenos];
                            hidrogenos = [];
                            oldH.forEach(h => {
                                if (h.parentNode === world) hidrogenos.push(h);
                            });
                            connections = connections.filter(c => c.i !== index && c.j !== index);
                            connections.forEach(c => {
                                if (c.i > index) c.i--;
                                if (c.j > index) c.j--;
                            });
                            world.removeChild(newElement);
                            updateLines();
                        }
                    });
                } else {
                    const minX = (-panX) / zoom;
                    const minY = (-panY) / zoom;
                    const maxX = minX + viewport.clientWidth / zoom - size;
                    const maxY = minY + viewport.clientHeight / zoom - size;
                    const x = Math.random() * (maxX - minX) + minX;
                    const y = Math.random() * (maxY - minY) + minY;
                    newElement.style.left = x + 'px';
                    newElement.style.top = y + 'px';
                    newElement.addEventListener('mousedown', startDrag);
                    newElement.addEventListener('touchstart', startDrag);
                    atoms.push({ type: 'C', element: newElement });

                    newElement.addEventListener('dblclick', function () {
                        const index = atoms.findIndex(a => a.element === newElement);
                        if (index > -1) {
                            atoms.splice(index, 1);
                            const attachedHAttachments = hydrogenAttachments.filter(a => a.cIndex === index);
                            attachedHAttachments.forEach(att => {
                                const hEl = hidrogenos[att.hIndex];
                                if (hEl && hEl.parentNode === world) {
                                    world.removeChild(hEl);
                                }
                            });
                            hydrogenAttachments = hydrogenAttachments.filter(a => a.cIndex !== index);
                            hydrogenAttachments.forEach(a => {
                                if (a.cIndex > index) a.cIndex--;
                            });
                            hidrogenos = hidrogenos.filter(h => h.parentNode === world);
                            const oldH = [...hidrogenos];
                            hidrogenos = [];
                            oldH.forEach(h => {
                                if (h.parentNode === world) hidrogenos.push(h);
                            });
                            connections = connections.filter(c => c.i !== index && c.j !== index);
                            connections.forEach(c => {
                                if (c.i > index) c.i--;
                                if (c.j > index) c.j--;
                            });
                            world.removeChild(newElement);
                            updateLines();
                        }
                    });
                }
            } else if (elementType === 'H') {
                const minX = (-panX) / zoom;
                const minY = (-panY) / zoom;
                const maxX = minX + viewport.clientWidth / zoom - size;
                const maxY = minY + viewport.clientHeight / zoom - size;
                const x = Math.random() * (maxX - minX) + minX;
                const y = Math.random() * (maxY - minY) + minY;
                newElement.style.left = x + 'px';
                newElement.style.top = y + 'px';
                newElement.addEventListener('mousedown', startDrag);
                newElement.addEventListener('touchstart', startDrag);
                hidrogenos.push(newElement);

                newElement.addEventListener('dblclick', function () {
                    const index = hidrogenos.indexOf(newElement);
                    if (index > -1) {
                        hidrogenos.splice(index, 1);
                        hydrogenAttachments = hydrogenAttachments.filter(a => a.hIndex !== index);
                        hydrogenAttachments.forEach(a => {
                            if (a.hIndex > index) a.hIndex--;
                        });
                        world.removeChild(newElement);
                        updateLines();
                    }
                });
            } else {
                const minX = (-panX) / zoom;
                const minY = (-panY) / zoom;
                const maxX = minX + viewport.clientWidth / zoom - size;
                const maxY = minY + viewport.clientHeight / zoom - size;
                const x = Math.random() * (maxX - minX) + minX;
                const y = Math.random() * (maxY - minY) + minY;
                newElement.style.left = x + 'px';
                newElement.style.top = y + 'px';
                newElement.addEventListener('mousedown', startDrag);
                newElement.addEventListener('touchstart', startDrag);
                atoms.push({ type: elementType, element: newElement });

                newElement.addEventListener('dblclick', function () {
                    const index = atoms.findIndex(a => a.element === newElement);
                    if (index > -1) {
                        atoms.splice(index, 1);
                        connections = connections.filter(c => c.i !== index && c.j !== index);
                        connections.forEach(c => {
                            if (c.i > index) c.i--;
                            if (c.j > index) c.j--;
                        });
                        world.removeChild(newElement);
                        updateLines();
                    }
                });
            }

            updateLines();
        });
    });
}

// ===== PANTALLA DE JUEGO =====
function startGameRound() {
    showScreen('game-screen');
    if (!practiceElementsInitialized) {
        // Asegurar que las variables globales estén inicializadas
        if (typeof atoms === 'undefined') atoms = [];
        if (typeof connections === 'undefined') connections = [];
        if (typeof hidrogenos === 'undefined') hidrogenos = [];
        if (typeof hydrogenAttachments === 'undefined') hydrogenAttachments = [];

        initializeElementCreation(); // Inicializar la creación de elementos
        practiceElementsInitialized = true;
    }

    // Force resize event to ensure viewport dimensions are correct
    window.dispatchEvent(new Event('resize'));

    // Force update world transform
    if (typeof updateWorldTransform === 'function') {
        // Reset pan and zoom to default if needed, or just update
        setTimeout(() => {
            updateWorldTransform();
        }, 50);
    }

    loadNextQuestion();

    // Configurar botones
    const quitBtn = document.querySelector('.btn-quit');
    const clearBtn = document.querySelector('.btn-clear');
    const validateBtn = document.querySelector('#validar');

    quitBtn.addEventListener('click', confirmQuit);
    clearBtn.addEventListener('click', clearWorkspace);
    validateBtn.addEventListener('click', validateAnswer);
}

function loadNextQuestion() {
    if (gameState.currentQuestion >= gameState.selectedElements.length) {
        endGame();
        return;
    }

    // Limpiar workspace
    clearWorkspace();

    // Actualizar UI
    const targetName = gameState.selectedElements[gameState.currentQuestion];
    document.getElementById('target-name').textContent = targetName;
    document.getElementById('current-question').textContent = gameState.currentQuestion + 1;
    document.getElementById('score').textContent = gameState.score;

    // Iniciar temporizador
    startTimer();
}

function startTimer() {
    gameState.timeRemaining = gameState.timePerQuestion;
    gameState.startTime = Date.now();

    updateTimerDisplay();

    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
    }

    gameState.timerInterval = setInterval(() => {
        gameState.timeRemaining--;
        updateTimerDisplay();

        if (gameState.timeRemaining <= 0) {
            clearInterval(gameState.timerInterval);
            timeUp();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const timerText = document.getElementById('timer');
    const timerFill = document.querySelector('.timer-fill');

    timerText.textContent = gameState.timeRemaining;

    const percentage = (gameState.timeRemaining / gameState.timePerQuestion) * 100;
    timerFill.style.width = percentage + '%';

    // Cambiar color cuando queda poco tiempo
    if (gameState.timeRemaining <= 10) {
        timerFill.classList.add('warning');
        timerText.style.color = '#ff0055';
    } else {
        timerFill.classList.remove('warning');
        timerText.style.color = '#00ff88';
    }
}

function clearWorkspace() {
    // Limpiar el mundo de elementos
    const world = document.getElementById('world');
    const elements = world.querySelectorAll('.atom');
    elements.forEach(el => el.remove());

    // Limpiar líneas SVG
    const svg = document.getElementById('lines-svg');
    svg.innerHTML = '';

    // Reiniciar estado global si existe
    if (typeof atoms !== 'undefined') {
        atoms = [];
    }
    if (typeof connections !== 'undefined') {
        connections = [];
    }
    if (typeof hidrogenos !== 'undefined') {
        hidrogenos = [];
    }
    if (typeof hydrogenAttachments !== 'undefined') {
        hydrogenAttachments = [];
    }
    if (typeof panX !== 'undefined') {
        panX = 0;
    }
    if (typeof panY !== 'undefined') {
        panY = 0;
    }
    if (typeof zoom !== 'undefined') {
        zoom = 1;
    }
}

function validateAnswer() {
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
    }

    // Calcular tiempo empleado
    const timeUsed = Math.floor((Date.now() - gameState.startTime) / 1000);
    gameState.questionTimes.push(timeUsed);

    // Obtener el nombre de la molécula creada
    let createdMolecule = '';
    try {
        // Intentar obtener el nombre usando las funciones de nomenclatura existentes
        if (typeof getCompleteName === 'function') {
            createdMolecule = getCompleteName(atoms, connections);
        } else {
            createdMolecule = 'Error: getCompleteName no encontrado';
        }
    } catch (error) {
        console.error('Error al validar:', error);
        createdMolecule = 'Error';
    }

    const targetMolecule = gameState.selectedElements[gameState.currentQuestion];

    // Normalizar nombres para comparación (quitar acentos, espacios, mayúsculas)
    const normalize = (str) => str.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, '');

    const isCorrect = normalize(createdMolecule) === normalize(targetMolecule);

    if (isCorrect) {
        // Calcular puntos basados en tiempo restante
        const basePoints = 100;
        const timeBonus = Math.floor(gameState.timeRemaining * 2);
        const points = basePoints + timeBonus;

        gameState.score += points;
        gameState.correctAnswers++;

        showFeedback('¡Correcto! +' + points + ' puntos', 'success');
    } else {
        gameState.wrongAnswers++;
        showFeedback('Incorrecto. Era: ' + targetMolecule + ' | Creaste: ' + createdMolecule, 'error');
    }

    // Avanzar a la siguiente pregunta después de un delay
    setTimeout(() => {
        gameState.currentQuestion++;
        loadNextQuestion();
    }, 2000);
}

function timeUp() {
    gameState.wrongAnswers++;
    gameState.questionTimes.push(gameState.timePerQuestion);

    const targetMolecule = gameState.selectedElements[gameState.currentQuestion];
    showFeedback('¡Tiempo agotado! La respuesta era: ' + targetMolecule, 'error');

    setTimeout(() => {
        gameState.currentQuestion++;
        loadNextQuestion();
    }, 2000);
}

function showFeedback(message, type) {
    const modal = document.getElementById('error-modal');
    const modalMessage = document.getElementById('error-message');

    modalMessage.textContent = message;
    modalMessage.style.color = type === 'success' ? '#00ff88' : '#ff0055';
    modal.style.display = 'block';

    // Cerrar automáticamente después de 1.5 segundos
    setTimeout(() => {
        modal.style.display = 'none';
    }, 1500);
}

function confirmQuit() {
    if (confirm('¿Seguro que quieres abandonar el juego?')) {
        if (gameState.timerInterval) {
            clearInterval(gameState.timerInterval);
        }
        window.location.reload();
    }
}

// ===== PANTALLA DE RESULTADOS =====
function endGame() {
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
    }

    showScreen('results-screen');

    // Calcular estadísticas
    const avgTime = gameState.questionTimes.length > 0
        ? Math.floor(gameState.questionTimes.reduce((a, b) => a + b, 0) / gameState.questionTimes.length)
        : 0;

    // Mostrar resultados
    document.getElementById('final-score').textContent = gameState.score;
    document.getElementById('correct-answers').textContent = gameState.correctAnswers;
    document.getElementById('wrong-answers').textContent = gameState.wrongAnswers;
    document.getElementById('avg-time').textContent = avgTime + 's';

    // Configurar botones
    const restartBtn = document.querySelector('.btn-restart');
    restartBtn.addEventListener('click', () => {
        window.location.reload();
    });
}

// ===== UTILIDADES =====
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// Cerrar modal con X
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('close')) {
        document.getElementById('error-modal').style.display = 'none';
    }
});

// Cerrar modal al hacer click fuera
window.addEventListener('click', (e) => {
    const modal = document.getElementById('error-modal');
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});
