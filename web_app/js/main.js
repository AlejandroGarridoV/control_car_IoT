// Configuración global
const apiBase = "http://98.91.45.27:5000/api";
let modoDemo = false;
let connectionStatus;

// Variables para control por mantenimiento
let movimientoActual = null;
let intervaloMovimiento = null;
let ultimoMovimientoEnviado = null;
const intervaloEnvio = 300; // ms entre envíos de comandos

// Mapeo de estados
const statusMap = {
    1: { name: "Quieto", class: "status-1", description: "El carro está detenido" },
    2: { name: "En movimiento", class: "status-2", description: "El carro se está moviendo" },
    3: { name: "Bailando", class: "status-3", description: "El carro ejecuta giro de 360°" },
    4: { name: "En secuencia", class: "status-4", description: "El carro sigue una secuencia de movimientos" },
    5: { name: "Evitando obstáculo", class: "status-5", description: "El carro detectó y evade un obstáculo" },
    6: { name: "Error", class: "status-6", description: "El sistema reportó un error" }
};

// Elementos DOM
let estadoElement, statusIndicator, statusText, statusDetail, progressBar, lastUpdate, eventCount, listaEventos, listaSecuencia, listaObstaculos, demoAlert, connectionMode;

// Arrays para almacenar datos
let secuenciaMovimientos = [];
let eventosDemo = [];
let obstaculosDemo = [];
let estadoDemo = { id_estado: 1, nombre: "Quieto", paso_actual: null };

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    checkConnection();
    loadInitialData();
    startAutoRefresh();
});

function initializeElements() {
    estadoElement = document.getElementById('estado');
    statusIndicator = document.getElementById('status-indicator');
    statusText = document.getElementById('status-text');
    statusDetail = document.getElementById('status-detail');
    progressBar = document.getElementById('progress-bar');
    lastUpdate = document.getElementById('last-update');
    eventCount = document.getElementById('event-count');
    listaEventos = document.getElementById('listaEventos');
    listaSecuencia = document.getElementById('listaSecuencia');
    listaObstaculos = document.getElementById('listaObstaculos');
    demoAlert = document.getElementById('demo-alert');
    connectionStatus = document.getElementById('connection-status');
    connectionMode = document.getElementById('connection-mode');
}

function setupEventListeners() {
    // Prevenir el menú contextual en botones
    document.querySelectorAll('.control-btn').forEach(btn => {
        btn.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            return false;
        });
    });
    
    // Detener movimiento si se pierde el foco de la ventana
    window.addEventListener('blur', function() {
        if (movimientoActual) {
            detenerMovimiento();
        }
    });
    
    // Detener movimiento con la tecla Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && movimientoActual) {
            detenerMovimiento();
        }
    });
    
    // Prevenir arrastre de imágenes en botones
    document.querySelectorAll('.control-btn i').forEach(icon => {
        icon.addEventListener('dragstart', function(e) {
            e.preventDefault();
            return false;
        });
    });
}

// Verificar conexión con el servidor
async function checkConnection() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch(`${apiBase}/estado/1`, {
            method: 'GET',
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            modoDemo = false;
            demoAlert.classList.add('d-none');
            connectionStatus.innerHTML = '<i class="fas fa-signal me-1"></i> Conectado';
            connectionStatus.classList.remove('connection-offline');
            if (connectionMode) {
                connectionMode.textContent = 'En Línea';
                connectionMode.className = 'badge bg-success';
            }
            return true;
        } else {
            throw new Error('Servidor no disponible');
        }
    } catch (error) {
        console.warn("No se pudo conectar con el servidor, activando modo demo:", error.message);
        modoDemo = true;
        demoAlert.classList.remove('d-none');
        connectionStatus.innerHTML = '<i class="fas fa-signal me-1"></i> Modo Demo';
        connectionStatus.classList.add('connection-offline');
        if (connectionMode) {
            connectionMode.textContent = 'Modo Demo';
            connectionMode.className = 'badge bg-warning';
        }
        return false;
    }
}

// Funciones para control por mantenimiento
function iniciarMovimiento(tipo) {
    // Prevenir múltiples inicios
    if (movimientoActual === tipo) return;
    
    // Detener cualquier movimiento anterior
    if (movimientoActual) {
        detenerMovimiento();
    }
    
    movimientoActual = tipo;
    
    // Marcar botón como presionado
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('presionado');
    }
    
    // Enviar comando inmediatamente
    enviarMovimientoContinuo(tipo);
    
    // Actualizar estado visual
    const estadoMovimiento = obtenerEstadoPorMovimiento(tipo);
    actualizarEstadoVisual(estadoMovimiento.id, estadoMovimiento.nombre, `Ejecutando: ${tipo}`);
    
    // Mostrar indicador de movimiento activo
    const indicador = document.getElementById('movimiento-activo');
    if (indicador) {
        indicador.textContent = `Movimiento activo: ${tipo}`;
        indicador.classList.add('activo');
    }
    
    // Configurar intervalo para envío continuo
    intervaloMovimiento = setInterval(() => {
        enviarMovimientoContinuo(tipo);
    }, intervaloEnvio);
    
    console.log(`▶️ Iniciando movimiento: ${tipo}`);
}

function detenerMovimiento() {
    if (!movimientoActual) return;
    
    console.log(`⏹️ Deteniendo movimiento: ${movimientoActual}`);
    
    // Limpiar intervalo
    if (intervaloMovimiento) {
        clearInterval(intervaloMovimiento);
        intervaloMovimiento = null;
    }
    
    // Quitar clase de presionado de todos los botones
    document.querySelectorAll('.control-btn').forEach(btn => {
        btn.classList.remove('presionado');
    });
    
    // Enviar comando de detención
    enviarEvento('Detenerse');
    
    // Limpiar movimiento actual
    const movimientoAnterior = movimientoActual;
    movimientoActual = null;
    ultimoMovimientoEnviado = null;
    
    // Ocultar indicador de movimiento activo
    const indicador = document.getElementById('movimiento-activo');
    if (indicador) {
        indicador.textContent = 'Presiona y mantén para mover';
        indicador.classList.remove('activo');
    }
    
    // Actualizar estado visual a quieto
    actualizarEstadoVisual(1, 'Quieto', 'Movimiento detenido');
}

function enviarMovimientoContinuo(tipo) {
    // Evitar enviar el mismo comando repetidamente
    if (ultimoMovimientoEnviado === tipo) return;
    
    const evento = {
        id_dispositivo: 1,
        tipo: tipo,
        detalle: `Movimiento continuo: ${tipo}`
    };
    
    if (modoDemo) {
        // En modo demo, solo actualizar el estado visual
        console.log(`🎮 Demo: ${tipo}`);
        ultimoMovimientoEnviado = tipo;
        return;
    }
    
    // Enviar comando al servidor
    fetch(`${apiBase}/evento`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(evento)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        return response.json();
    })
    .then(result => {
        if (result.status === "error") {
            throw new Error(result.message);
        }
        ultimoMovimientoEnviado = tipo;
        console.log(`↗️ Enviado: ${tipo}`);
    })
    .catch(error => {
        console.error("Error enviando movimiento continuo:", error);
        // Si hay error de conexión, activar modo demo
        if (error.message.includes('Failed to fetch') || error.message.includes('CORS') || error.message.includes('NetworkError')) {
            modoDemo = true;
            demoAlert.classList.remove('d-none');
            connectionStatus.innerHTML = '<i class="fas fa-signal me-1"></i> Modo Demo';
            connectionStatus.classList.add('connection-offline');
            if (connectionMode) {
                connectionMode.textContent = 'Modo Demo';
                connectionMode.className = 'badge bg-warning';
            }
        }
    });
}

// Función auxiliar para obtener estado por tipo de movimiento
function obtenerEstadoPorMovimiento(movimiento) {
    switch(movimiento) {
        case 'Bailar':
            return { id: 3, nombre: 'Bailando' };
        case 'Detenerse':
            return { id: 1, nombre: 'Quieto' };
        case 'Adelante':
        case 'Atrás':
        case 'Izquierda':
        case 'Derecha':
            return { id: 2, nombre: 'En movimiento' };
        default:
            return { id: 2, nombre: 'En movimiento' };
    }
}

// Función para actualizar el estado visual inmediatamente
function actualizarEstadoVisual(idEstado, nombre, descripcion) {
    const statusInfo = statusMap[idEstado] || { 
        name: nombre, 
        class: "status-1", 
        description: descripcion 
    };
    
    statusIndicator.className = `status-indicator ${statusInfo.class}`;
    statusText.textContent = statusInfo.name;
    statusDetail.textContent = descripcion || statusInfo.description;
    
    // Actualizar timestamp
    lastUpdate.textContent = new Date().toLocaleTimeString();
}

// Funciones para manejar secuencias
function agregarMovimiento(movimiento) {
    secuenciaMovimientos.push(movimiento);
    actualizarListaSecuencia();
}

function agregarMovimientoPersonalizado() {
    const movimientos = ['Adelante', 'Izquierda', 'Derecha', 'Atrás', 'Detenerse', 'Bailar'];
    const movimiento = movimientos[Math.floor(Math.random() * movimientos.length)];
    secuenciaMovimientos.push(movimiento);
    actualizarListaSecuencia();
}

function eliminarMovimiento(index) {
    secuenciaMovimientos.splice(index, 1);
    actualizarListaSecuencia();
}

function actualizarListaSecuencia() {
    if (secuenciaMovimientos.length === 0) {
        listaSecuencia.innerHTML = `
            <div class="empty-sequence">
                <i class="fas fa-list-ul fa-lg mb-2"></i>
                <p class="small">No hay movimientos</p>
            </div>
        `;
        return;
    }

    listaSecuencia.innerHTML = '';
    secuenciaMovimientos.forEach((movimiento, index) => {
        const item = document.createElement('div');
        item.className = 'sequence-item';
        item.innerHTML = `
            ${index + 1}. ${movimiento}
            <button class="remove-btn" onclick="eliminarMovimiento(${index})">
                <i class="fas fa-times"></i>
            </button>
        `;
        listaSecuencia.appendChild(item);
    });
}

function limpiarSecuencia() {
    secuenciaMovimientos = [];
    actualizarListaSecuencia();
}

async function ejecutarSecuencia() {
    if (secuenciaMovimientos.length === 0) {
        showAlert('No hay movimientos en la secuencia para ejecutar', 'warning');
        return;
    }

    // Si estamos en modo demo, usar simulación
    if (modoDemo) {
        await ejecutarSecuenciaDemo();
        return;
    }

    // Intentar enviar la secuencia al servidor
    try {
        // Cambiar estado a "En secuencia" inmediatamente
        actualizarEstadoVisual(4, 'En secuencia', 'Ejecutando secuencia programada');
        
        // Opción 1: Intentar enviar como secuencia (si el endpoint existe)
        try {
            const secuencia = {
                id_dispositivo: 1,
                tipo: 'Secuencia',
                detalle: `Secuencia programada con ${secuenciaMovimientos.length} movimientos`,
                movimientos: secuenciaMovimientos
            };
            
            const response = await fetch(`${apiBase}/secuencia`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(secuencia)
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.status === "error") {
                    throw new Error(result.message);
                }
                
                console.log(`Secuencia ejecutada: ${secuenciaMovimientos.length} movimientos`);
                await cargarEventos();
                showAlert('Secuencia ejecutada correctamente', 'success');
                
                // Volver al estado quieto después de 2 segundos
                setTimeout(() => {
                    actualizarEstadoVisual(1, 'Quieto', 'Secuencia completada');
                }, 2000);
                
                return;
            } else if (response.status === 404) {
                // Si el endpoint de secuencia no existe, usar el método alternativo
                throw new Error('Endpoint de secuencia no disponible');
            } else {
                throw new Error(`Error HTTP: ${response.status}`);
            }
        } catch (secuenciaError) {
            console.warn('No se pudo usar el endpoint de secuencia, usando método alternativo:', secuenciaError.message);
            
            // Opción 2: Enviar movimientos individualmente
            await ejecutarSecuenciaMovimientosIndividuales();
        }
        
    } catch (error) {
        console.error("Error ejecutando secuencia:", error);
        showError("No se pudo ejecutar la secuencia: " + error.message);
        
        // Activar modo demo si hay error de conexión
        if (error.message.includes('Failed to fetch') || error.message.includes('CORS') || error.message.includes('NetworkError')) {
            modoDemo = true;
            demoAlert.classList.remove('d-none');
            connectionStatus.innerHTML = '<i class="fas fa-signal me-1"></i> Modo Demo';
            connectionStatus.classList.add('connection-offline');
            if (connectionMode) {
                connectionMode.textContent = 'Modo Demo';
                connectionMode.className = 'badge bg-warning';
            }
            
            // Ejecutar en modo demo
            await ejecutarSecuenciaDemo();
        }
    }
}

// Ejecutar secuencia enviando movimientos individualmente
async function ejecutarSecuenciaMovimientosIndividuales() {
    showAlert('Ejecutando secuencia movimiento por movimiento...', 'info');
    
    for (let i = 0; i < secuenciaMovimientos.length; i++) {
        const movimiento = secuenciaMovimientos[i];
        
        try {
            // Actualizar estado visual para cada movimiento
            const estadoMovimiento = obtenerEstadoPorMovimiento(movimiento);
            actualizarEstadoVisual(estadoMovimiento.id, estadoMovimiento.nombre, `Ejecutando: ${movimiento} (${i+1}/${secuenciaMovimientos.length})`);
            
            const evento = {
                id_dispositivo: 1,
                tipo: movimiento,
                detalle: `Movimiento ${i+1}/${secuenciaMovimientos.length} de la secuencia: ${movimiento}`
            };
            
            const response = await fetch(`${apiBase}/evento`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(evento)
            });
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.status === "error") {
                throw new Error(result.message);
            }
            
            console.log(`Movimiento ${i+1} ejecutado: ${movimiento}`);
            
            // Pequeña pausa entre movimientos
            await new Promise(resolve => setTimeout(resolve, 800));
            
        } catch (error) {
            console.error(`Error en movimiento ${i+1}:`, error);
            throw new Error(`Error en movimiento ${i+1}: ${error.message}`);
        }
    }
    
    await cargarEventos();
    showAlert('Secuencia ejecutada correctamente (movimiento por movimiento)', 'success');
    
    // Volver al estado quieto
    actualizarEstadoVisual(1, 'Quieto', 'Secuencia completada');
}

// Ejecutar secuencia en modo demo
async function ejecutarSecuenciaDemo() {
    showAlert('Ejecutando secuencia en modo demo...', 'info');
    
    // Cambiar estado a "En secuencia"
    actualizarEstadoVisual(4, 'En secuencia', 'Ejecutando secuencia programada en modo demo');
    
    // Simular ejecución de cada movimiento con delays
    for (let i = 0; i < secuenciaMovimientos.length; i++) {
        const movimiento = secuenciaMovimientos[i];
        
        // Actualizar estado para este movimiento
        const estadoMovimiento = obtenerEstadoPorMovimiento(movimiento);
        actualizarEstadoVisual(estadoMovimiento.id, estadoMovimiento.nombre, `Ejecutando: ${movimiento} (${i+1}/${secuenciaMovimientos.length})`);
        
        // Agregar evento a la lista demo
        eventosDemo.unshift({
            tipo_evento: `Secuencia [${i+1}/${secuenciaMovimientos.length}]`,
            detalle: `Movimiento: ${movimiento}`,
            fecha_hora: new Date().toISOString()
        });
        
        // Actualizar la lista de eventos
        updateEventsList(eventosDemo);
        
        // Pequeña pausa entre movimientos
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Agregar evento final de secuencia completada
    eventosDemo.unshift({
        tipo_evento: 'Secuencia Completada',
        detalle: `Secuencia ejecutada: ${secuenciaMovimientos.join(' → ')}`,
        fecha_hora: new Date().toISOString()
    });
    
    updateEventsList(eventosDemo);
    
    // Volver al estado normal después de 2 segundos
    setTimeout(() => {
        actualizarEstadoVisual(1, 'Quieto', 'Secuencia completada');
    }, 2000);
    
    showAlert('Secuencia ejecutada en modo demo', 'success');
}

async function enviarEvento(tipo) {
    // Si es un movimiento que se maneja con presión, usar ese sistema
    if (['Adelante', 'Atrás', 'Izquierda', 'Derecha'].includes(tipo)) {
        return; // Estos se manejan con iniciarMovimiento/detenerMovimiento
    }
    
    const evento = {
        id_dispositivo: 1,
        tipo: tipo,
        detalle: `El carro ejecutó: ${tipo}`
    };
    
    try {
        // Feedback visual inmediato
        if (event && event.currentTarget) {
            provideButtonFeedback(event.currentTarget);
        }
        
        // Actualizar estado visual inmediatamente
        const estadoMovimiento = obtenerEstadoPorMovimiento(tipo);
        actualizarEstadoVisual(estadoMovimiento.id, estadoMovimiento.nombre, `Ejecutando: ${tipo}`);
        
        if (modoDemo) {
            // Simular envío en modo demo
            setTimeout(() => {
                // Agregar evento a la lista demo
                eventosDemo.unshift({
                    tipo_evento: tipo,
                    detalle: `Comando ejecutado: ${tipo}`,
                    fecha_hora: new Date().toISOString()
                });
                updateEventsList(eventosDemo);
                
                // Volver al estado quieto después de 1 segundo (excepto para Detenerse)
                if (tipo !== 'Detenerse') {
                    setTimeout(() => {
                        actualizarEstadoVisual(1, 'Quieto', 'Comando completado');
                    }, 1000);
                }
            }, 300);
            
            return;
        }
        
        // Enviar evento al servidor (modo real)
        const response = await fetch(`${apiBase}/evento`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(evento)
        });
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.status === "error") {
            throw new Error(result.message);
        }
        
        console.log(`Evento enviado: ${tipo}`);
        await cargarEventos();
        
        // Volver al estado quieto después de 1 segundo (excepto para Detenerse)
        if (tipo !== 'Detenerse') {
            setTimeout(() => {
                actualizarEstadoVisual(1, 'Quieto', 'Comando completado');
            }, 1000);
        }
        
    } catch (error) {
        console.error("Error enviando evento:", error);
        showError("No se pudo enviar el comando: " + error.message);
        // Activar modo demo si hay error de conexión
        if (error.message.includes('Failed to fetch') || error.message.includes('CORS') || error.message.includes('NetworkError')) {
            modoDemo = true;
            demoAlert.classList.remove('d-none');
            connectionStatus.innerHTML = '<i class="fas fa-signal me-1"></i> Modo Demo';
            connectionStatus.classList.add('connection-offline');
            if (connectionMode) {
                connectionMode.textContent = 'Modo Demo';
                connectionMode.className = 'badge bg-warning';
            }
        }
    }
}

function provideButtonFeedback(button) {
    if (!button) return;
    
    const originalBg = button.style.backgroundColor;
    const originalColor = button.style.color;
    
    button.style.backgroundColor = "white";
    button.style.color = "black";
    button.style.transform = "scale(0.95)";
    
    setTimeout(() => {
        button.style.backgroundColor = originalBg;
        button.style.color = originalColor;
        button.style.transform = "";
    }, 200);
}

async function cargarEventos() {
    if (modoDemo) {
        // Usar datos demo
        if (eventosDemo.length === 0) {
            // Inicializar con algunos eventos demo
            eventosDemo = [
                {
                    tipo_evento: "Sistema",
                    detalle: "Aplicación iniciada en modo demo",
                    fecha_hora: new Date().toISOString()
                }
            ];
        }
        updateEventsList(eventosDemo);
        return;
    }
    
    try {
        const res = await fetch(`${apiBase}/eventos/1`);
        
        if (!res.ok) {
            throw new Error(`Error HTTP: ${res.status}`);
        }
        
        const data = await res.json();
        
        // Verificar si la respuesta tiene formato de error
        if (data.status === "error") {
            throw new Error(data.message);
        }
        
        updateEventsList(data);
        
    } catch (error) {
        console.error("Error cargando eventos:", error);
        // Cambiar a modo demo en caso de error
        modoDemo = true;
        demoAlert.classList.remove('d-none');
        connectionStatus.innerHTML = '<i class="fas fa-signal me-1"></i> Modo Demo';
        connectionStatus.classList.add('connection-offline');
        if (connectionMode) {
            connectionMode.textContent = 'Modo Demo';
            connectionMode.className = 'badge bg-warning';
        }
        
        // Cargar eventos demo
        if (eventosDemo.length === 0) {
            eventosDemo = [
                {
                    tipo_evento: "Sistema",
                    detalle: "Modo demo activado por error de conexión",
                    fecha_hora: new Date().toISOString()
                }
            ];
        }
        updateEventsList(eventosDemo);
    }
}

function updateEventsList(data) {
    // Asegurarnos de que data es un array
    const eventosArray = Array.isArray(data) ? data : [];
    
    eventCount.textContent = eventosArray.length;
    
    // Actualizar también el badge de eventos si existe
    const eventCountBadge = document.getElementById('event-count-badge');
    if (eventCountBadge) {
        eventCountBadge.textContent = eventosArray.length;
    }
    
    if (eventosArray.length === 0) {
        listaEventos.innerHTML = '<div class="text-center text-muted py-3"><i class="fas fa-clock fa-lg mb-2"></i><p class="small">Cargando eventos...</p></div>';
        return;
    }
    
    // Mostrar solo los últimos 10 eventos
    const eventosRecientes = eventosArray.slice(0, 10);
    listaEventos.innerHTML = '';
    
    eventosRecientes.forEach(ev => {
        const eventItem = document.createElement("div");
        eventItem.classList.add("event-item");
        
        // Usar el campo correcto según la respuesta de la API
        const tipoEvento = ev.tipo_evento || ev.tipo || 'Evento';
        const detalle = ev.detalle || 'Sin detalles';
        const fechaHora = ev.fecha_hora || ev.fecha || new Date().toISOString();
        
        const fecha = new Date(fechaHora).toLocaleTimeString();
        eventItem.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <strong>${tipoEvento}</strong>
                <span class="event-time">${fecha}</span>
            </div>
            <div class="text-muted small">${detalle}</div>
        `;
        listaEventos.appendChild(eventItem);
    });
}

async function cargarObstaculos() {
    if (modoDemo) {
        // Usar datos demo para obstáculos
        if (obstaculosDemo.length === 0) {
            obstaculosDemo = [
                {
                    id_obstaculo: 1,
                    descripcion: "Obstáculo detectado al frente",
                    fecha: "2025-10-23 00:42:41",
                    accion: "Giro a la derecha para evadir",
                    estado: "evitado"
                },
                {
                    id_obstaculo: 2,
                    descripcion: "Pared detectada a 30cm",
                    fecha: "2025-10-23 00:40:15",
                    accion: "Retroceso y cambio de dirección",
                    estado: "evitado"
                },
                {
                    id_obstaculo: 3,
                    descripcion: "Objeto pequeño en el camino",
                    fecha: "2025-10-23 00:38:22",
                    accion: "Desvío suave a la izquierda",
                    estado: "evitado"
                }
            ];
        }
        updateObstaclesList(obstaculosDemo);
        return;
    }
    
    try {
        const res = await fetch(`${apiBase}/obstaculos/1`);
        
        if (!res.ok) {
            throw new Error(`Error HTTP: ${res.status}`);
        }
        
        const data = await res.json();
        
        if (data.status === "error") {
            throw new Error(data.message);
        }
        
        updateObstaclesList(data);
        
    } catch (error) {
        console.error("Error cargando obstáculos:", error);
        showErrorObstacles("No se pudieron cargar los obstáculos: " + error.message);
    }
}

function updateObstaclesList(data) {
    const obstaculosArray = Array.isArray(data) ? data : [];
    
    // Actualizar contador de obstáculos
    const obstacleCount = document.getElementById('obstacle-count');
    if (obstacleCount) {
        obstacleCount.textContent = `${obstaculosArray.length} detectados`;
    }
    
    if (obstaculosArray.length === 0) {
        listaObstaculos.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="fas fa-check-circle fa-2x mb-2"></i>
                <p>No se han detectado obstáculos</p>
                <small class="text-muted">El carro se está moviendo libremente</small>
            </div>
        `;
        return;
    }
    
    listaObstaculos.innerHTML = '';
    
    obstaculosArray.forEach(obs => {
        const obstacleItem = document.createElement("div");
        obstacleItem.classList.add("obstacle-item");
        
        const descripcion = obs.descripcion || obs.detalle || 'Obstáculo detectado';
        const fechaHora = obs.fecha || obs.fecha_hora || obs.techa || new Date().toISOString();
        const accion = obs.accion || 'Obstáculo evitado exitosamente';
        const estado = obs.estado || 'detectado';
        
        const fecha = new Date(fechaHora).toLocaleString();
        
        obstacleItem.innerHTML = `
            <div class="d-flex justify-content-between align-items-start mb-2">
                <div class="obstacle-descripcion flex-grow-1">
                    <i class="fas fa-exclamation-triangle me-2 text-warning"></i>
                    ${descripcion}
                </div>
                <span class="obstacle-estado ${estado}">
                    ${estado === 'evitado' ? 'Evitado' : 'Detectado'}
                </span>
            </div>
            <div class="obstacle-accion">
                <i class="fas fa-route me-1 text-info"></i>
                ${accion}
            </div>
            <div class="obstacle-time mt-2">
                <i class="far fa-clock me-1"></i>${fecha}
            </div>
        `;
        
        if (estado === 'evitado') {
            obstacleItem.classList.add('resuelto');
        }
        
        listaObstaculos.appendChild(obstacleItem);
    });
}

function showErrorObstacles(message) {
    listaObstaculos.innerHTML = `
        <div class="text-center text-danger py-4">
            <i class="fas fa-exclamation-circle fa-2x mb-2"></i>
            <p>${message}</p>
            <button class="btn btn-sm btn-outline-warning mt-2" onclick="cargarObstaculos()">
                Reintentar
            </button>
        </div>
    `;
}

async function cargarEstado() {
    if (modoDemo) {
        // Usar estado demo
        updateStatusDisplay([estadoDemo]);
        lastUpdate.textContent = new Date().toLocaleTimeString();
        return;
    }
    
    try {
        // Mostrar indicador de actualización
        estadoElement.classList.add('status-updating');
        
        const res = await fetch(`${apiBase}/estado/1`);
        
        if (!res.ok) {
            throw new Error(`Error HTTP: ${res.status}`);
        }
        
        const data = await res.json();
        
        // Verificar si la respuesta tiene formato de error
        if (data.status === "error") {
            throw new Error(data.message);
        }
        
        updateStatusDisplay(data);
        
        // Actualizar timestamp
        lastUpdate.textContent = new Date().toLocaleTimeString();
        
    } catch (error) {
        console.error("Error cargando estado:", error);
        // Cambiar a modo demo en caso de error
        modoDemo = true;
        demoAlert.classList.remove('d-none');
        connectionStatus.innerHTML = '<i class="fas fa-signal me-1"></i> Modo Demo';
        connectionStatus.classList.add('connection-offline');
        if (connectionMode) {
            connectionMode.textContent = 'Modo Demo';
            connectionMode.className = 'badge bg-warning';
        }
        
        // Usar estado demo
        updateStatusDisplay([estadoDemo]);
        lastUpdate.textContent = new Date().toLocaleTimeString();
    } finally {
        estadoElement.classList.remove('status-updating');
    }
}

function updateStatusDisplay(data) {
    // Asegurarnos de que data es un array
    const estadosArray = Array.isArray(data) ? data : [];
    
    if (estadosArray.length > 0) {
        const estado = estadosArray[0];
        
        // Usar los campos correctos según tu base de datos
        const idEstado = estado.id_estado || estado.estado_id || 1;
        const nombreEstado = estado.nombre || estado.nombre_estado || 'Desconocido';
        const pasoActual = estado.paso_actual || estado.paso || null;
        
        const statusInfo = statusMap[idEstado] || { 
            name: nombreEstado, 
            class: "status-1", 
            description: "Estado no definido" 
        };
        
        // Actualizar indicador de estado
        statusIndicator.className = `status-indicator ${statusInfo.class}`;
        statusText.textContent = statusInfo.name;
        statusDetail.textContent = statusInfo.description;
        
        // Actualizar barra de progreso si hay paso actual
        if (pasoActual !== undefined && pasoActual !== null) {
            const progressPercentage = (pasoActual / 10) * 100;
            progressBar.style.width = `${progressPercentage}%`;
            progressBar.textContent = `Paso ${pasoActual}/10`;
        } else {
            progressBar.style.width = "0%";
            progressBar.textContent = "";
        }
    } else {
        // No hay datos de estado
        statusIndicator.className = 'status-indicator status-1';
        statusText.textContent = 'Sin datos';
        statusDetail.textContent = 'No se recibió información del estado';
        progressBar.style.width = "0%";
        progressBar.textContent = "";
    }
}

function showError(message) {
    statusIndicator.className = 'status-indicator status-6';
    statusText.textContent = 'Error';
    statusDetail.textContent = message;
    progressBar.style.width = "0%";
    progressBar.textContent = "";
}

function showAlert(message, type) {
    // Crear alerta Bootstrap temporal
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Insertar después del navbar
    const navbar = document.querySelector('.navbar');
    navbar.parentNode.insertBefore(alertDiv, navbar.nextSibling);
    
    // Auto-eliminar después de 3 segundos
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.parentNode.removeChild(alertDiv);
        }
    }, 3000);
}

function loadInitialData() {
    cargarEstado();
    cargarEventos();
    cargarObstaculos();
}

function startAutoRefresh() {
    // Actualizar estado cada 3 segundos
    setInterval(cargarEstado, 3000);
    
    // Actualizar eventos cada 5 segundos
    setInterval(cargarEventos, 5000);
    
    // Actualizar obstáculos cada 10 segundos
    setInterval(cargarObstaculos, 10000);
    
    // Verificar conexión cada 10 segundos
    setInterval(checkConnection, 10000);
}

// Manejo de errores global
window.addEventListener('error', function(e) {
    console.error('Error global:', e.error);
});

// Exportar funciones para uso global
window.enviarEvento = enviarEvento;
window.cargarEventos = cargarEventos;
window.cargarEstado = cargarEstado;
window.agregarMovimiento = agregarMovimiento;
window.agregarMovimientoPersonalizado = agregarMovimientoPersonalizado;
window.eliminarMovimiento = eliminarMovimiento;
window.limpiarSecuencia = limpiarSecuencia;
window.ejecutarSecuencia = ejecutarSecuencia;
window.cargarObstaculos = cargarObstaculos;
window.iniciarMovimiento = iniciarMovimiento;
window.detenerMovimiento = detenerMovimiento;
