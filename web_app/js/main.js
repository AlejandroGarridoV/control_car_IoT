// --- CONFIGURACIÓN ---
const SERVER_URL = "http://98.91.45.27:5000";
const WS_URL = "ws://98.91.45.27:5000/ws";
let ws = null;

// --- ESTADO INICIAL ---
let eventoCount = 0;
let lastMovimiento = "";
let progreso = 0;
let secuencia = [];
let secuenciasGuardadas = [];

// --- ELEMENTOS DOM ---
let statusText, statusDetail, progressBar, lastUpdate, eventCount, eventCountBadge, movimientoActivo, listaEventos;

// =============================================================
// 🎮 FUNCIONES DE CONTROL DEL CARRO
// =============================================================
function iniciarMovimiento(tipo) {
  lastMovimiento = tipo;
  if (movimientoActivo) {
    movimientoActivo.innerText = `Moviendo: ${tipo}`;
    movimientoActivo.classList.add('activo');
  }
  enviarEventoWS(tipo);
}

function detenerMovimiento() {
  if (lastMovimiento) {
    if (movimientoActivo) {
      movimientoActivo.innerText = "Detenido";
      movimientoActivo.classList.remove('activo');
    }
    enviarEventoWS("Detenerse");
    lastMovimiento = "";
  }
}

// =============================================================
// 📡 ENVIAR EVENTOS POR WEBSOCKET
// =============================================================
function enviarEventoWS(tipo_evento) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.warn("⚠️ WebSocket no conectado, intentando reconectar...");
    conectarWebSocket();
    mostrarModoDemo();
    return;
  }

  const data = {
    id_dispositivo: 1,
    tipo_evento: tipo_evento,
    detalle: `Movimiento: ${tipo_evento}`,
    fecha_hora: new Date().toISOString(),
  };

  try {
    ws.send(JSON.stringify(data));
    console.log("📤 Evento enviado por WebSocket:", data);
    actualizarEstado(data);
  } catch (err) {
    console.error("❌ Error al enviar evento por WebSocket:", err);
    mostrarModoDemo();
  }
}

// =============================================================
// 🧩 SECUENCIAS
// =============================================================
function agregarMovimiento(tipo) {
  secuencia.push(tipo);
  actualizarSecuenciaUI();
}

function agregarMovimientoPersonalizado() {
  const movimientos = [
    "Adelante", "Atrás", "Izquierda", "Derecha", "Demo",
    "Curva Derecha Adelante", "Curva Izquierda Adelante",
    "Curva Izquierda Atrás", "Curva Derecha Atrás"
  ];
  const random = movimientos[Math.floor(Math.random() * movimientos.length)];
  agregarMovimiento(random);
}

function ejecutarSecuencia() {
  if (secuencia.length === 0) {
    alert('❌ No hay movimientos en la secuencia');
    return;
  }
  
  const secuenciaActivaInfo = document.getElementById('secuencia-activa-info');
  if (secuenciaActivaInfo) {
    secuenciaActivaInfo.innerHTML = `
      <strong>Ejecutando secuencia actual</strong><br>
      <small>${secuencia.length} movimientos</small>
    `;
  }
  
  secuencia.forEach((mov, i) => {
    setTimeout(() => {
      enviarEventoWS(mov);
      
      // Actualizar progreso
      const progreso = ((i + 1) / secuencia.length) * 100;
      const progresoSecuencia = document.getElementById('progreso-secuencia');
      if (progresoSecuencia) {
        progresoSecuencia.style.width = `${progreso}%`;
      }
      
      if (i === secuencia.length - 1) {
        setTimeout(() => {
          if (secuenciaActivaInfo) secuenciaActivaInfo.innerHTML = '';
          if (progresoSecuencia) progresoSecuencia.style.width = '0%';
        }, 1000);
      }
    }, i * 1000);
  });
}

function limpiarSecuencia() {
  secuencia = [];
  actualizarSecuenciaUI();
}

function actualizarSecuenciaUI() {
  const listaSecuencia = document.getElementById("listaSecuencia");
  if (!listaSecuencia) return;
  
  listaSecuencia.innerHTML = "";
  if (secuencia.length === 0) {
    listaSecuencia.innerHTML = `<div class="empty-sequence">
      <i class="fas fa-list-ul fa-lg mb-2"></i>
      <p class="small">No hay movimientos</p>
    </div>`;
  } else {
    secuencia.forEach((mov, i) => {
      const div = document.createElement("div");
      div.classList.add("sequence-item");
      div.innerHTML = `${i + 1}. ${mov}`;
      listaSecuencia.appendChild(div);
    });
  }
}

// =============================================================
// 💾 ALMACENAMIENTO DE SECUENCIAS
// =============================================================

function cargarSecuenciasGuardadas() {
  const guardadas = localStorage.getItem('secuenciasCarro');
  if (guardadas) {
    secuenciasGuardadas = JSON.parse(guardadas);
    actualizarListaSecuenciasGuardadas();
  }
}

function guardarSecuencia() {
  if (secuencia.length === 0) {
    alert('❌ No hay movimientos en la secuencia para guardar');
    return;
  }

  const nombre = prompt('📝 Nombre para esta secuencia:');
  if (!nombre) return;

  const nuevaSecuencia = {
    id: Date.now(),
    nombre: nombre,
    movimientos: [...secuencia],
    fecha: new Date().toLocaleString(),
    duracion: secuencia.length
  };

  secuenciasGuardadas.unshift(nuevaSecuencia);
  guardarEnLocalStorage();
  actualizarListaSecuenciasGuardadas();
  
  // Feedback visual
  const btn = document.getElementById('btn-guardar-secuencia');
  if (btn) {
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check"></i> Guardada!';
    setTimeout(() => {
      btn.innerHTML = originalText;
    }, 2000);
  }
}

function ejecutarSecuenciaGuardada(id) {
  const secuenciaEncontrada = secuenciasGuardadas.find(s => s.id === id);
  if (secuenciaEncontrada) {
    const secuenciaActivaInfo = document.getElementById('secuencia-activa-info');
    if (secuenciaActivaInfo) {
      secuenciaActivaInfo.innerHTML = `
        <strong>Ejecutando:</strong> ${secuenciaEncontrada.nombre}<br>
        <small>${secuenciaEncontrada.movimientos.length} movimientos</small>
      `;
    }
    
    secuenciaEncontrada.movimientos.forEach((mov, i) => {
      setTimeout(() => {
        enviarEventoWS(mov);
        
        // Actualizar progreso
        const progreso = ((i + 1) / secuenciaEncontrada.movimientos.length) * 100;
        const progresoSecuencia = document.getElementById('progreso-secuencia');
        if (progresoSecuencia) {
          progresoSecuencia.style.width = `${progreso}%`;
        }
        
        if (i === secuenciaEncontrada.movimientos.length - 1) {
          setTimeout(() => {
            if (secuenciaActivaInfo) secuenciaActivaInfo.innerHTML = '';
            if (progresoSecuencia) progresoSecuencia.style.width = '0%';
          }, 1000);
        }
      }, i * 1000);
    });
  }
}

function eliminarSecuenciaGuardada(id, event) {
  event.stopPropagation();
  if (confirm('¿Eliminar esta secuencia?')) {
    secuenciasGuardadas = secuenciasGuardadas.filter(s => s.id !== id);
    guardarEnLocalStorage();
    actualizarListaSecuenciasGuardadas();
  }
}

function guardarEnLocalStorage() {
  localStorage.setItem('secuenciasCarro', JSON.stringify(secuenciasGuardadas));
}

function actualizarListaSecuenciasGuardadas() {
  const lista = document.getElementById('lista-secuencias-guardadas');
  if (!lista) return;

  if (secuenciasGuardadas.length === 0) {
    lista.innerHTML = `
      <div class="empty-sequence">
        <i class="fas fa-inbox fa-lg mb-2"></i>
        <p class="small">No hay secuencias guardadas</p>
        <small class="text-muted">Guarda tus secuencias para reutilizarlas</small>
      </div>
    `;
    return;
  }

  lista.innerHTML = secuenciasGuardadas.map(sec => `
    <div class="saved-sequence-item" onclick="ejecutarSecuenciaGuardada(${sec.id})">
      <div class="sequence-info">
        <strong>${sec.nombre}</strong>
        <div class="sequence-meta">
          <small>${sec.movimientos.length} movimientos • ${sec.fecha}</small>
        </div>
        <div class="sequence-preview">
          ${sec.movimientos.slice(0, 3).map(mov => 
            `<span class="movement-tag">${mov}</span>`
          ).join('')}
          ${sec.movimientos.length > 3 ? '<span class="movement-tag">...</span>' : ''}
        </div>
      </div>
      <button class="btn-delete-sequence" onclick="eliminarSecuenciaGuardada(${sec.id}, event)">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `).join('');
}

function exportarSecuencias() {
  if (secuenciasGuardadas.length === 0) {
    alert('No hay secuencias para exportar');
    return;
  }

  const dataStr = JSON.stringify(secuenciasGuardadas, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(dataBlob);
  link.download = `secuencias-carro-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
}

function importarSecuencias() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = event => {
      try {
        const imported = JSON.parse(event.target.result);
        if (Array.isArray(imported)) {
          secuenciasGuardadas = [...secuenciasGuardadas, ...imported];
          guardarEnLocalStorage();
          actualizarListaSecuenciasGuardadas();
          alert(`✅ ${imported.length} secuencias importadas correctamente`);
        } else {
          alert('❌ Formato de archivo inválido');
        }
      } catch (err) {
        alert('❌ Error al importar el archivo');
      }
    };
    reader.readAsText(file);
  };
  
  input.click();
}

// =============================================================
// 🧠 ACTUALIZAR INTERFAZ
// =============================================================
function actualizarEstado(evento) {
  // Verificar que los elementos existan antes de actualizarlos
  if (statusText) statusText.innerText = evento.tipo_evento || "Sin tipo";
  if (statusDetail) statusDetail.innerText = evento.detalle || "Sin detalle";
  
  progreso = Math.min(progreso + 10, 100);
  if (progressBar) progressBar.style.width = `${progreso}%`;
  if (lastUpdate) lastUpdate.innerText = new Date().toLocaleTimeString();

  eventoCount++;
  if (eventCount) eventCount.innerText = eventoCount;
  if (eventCountBadge) eventCountBadge.innerText = eventoCount;

  if (listaEventos) {
    const div = document.createElement("div");
    div.classList.add("event-item");
    div.innerHTML = `<small>${new Date().toLocaleTimeString()}</small> - ${evento.tipo_evento}: ${evento.detalle}`;
    listaEventos.prepend(div);
  }
}

// =============================================================
// 🌐 CONEXIÓN WEBSOCKET PURO
// =============================================================
function conectarWebSocket() {
  console.log("🔌 Conectando al WebSocket...");
  
  try {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log("✅ Conectado al WebSocket!");
      const connectionStatus = document.getElementById("connection-status");
      if (connectionStatus) {
        connectionStatus.innerHTML = '<i class="fas fa-signal me-1 text-success"></i> Conectado';
      }
      // Ocultar alerta demo si está visible
      const demoAlert = document.getElementById("demo-alert");
      if (demoAlert) demoAlert.classList.add("d-none");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("📡 Mensaje recibido:", data);
        actualizarEstado(data);
      } catch (err) {
        console.warn("⚠️ Mensaje no JSON:", event.data);
      }
    };

    ws.onclose = (event) => {
      console.warn("❌ Desconectado del WebSocket:", event.code, event.reason);
      const connectionStatus = document.getElementById("connection-status");
      if (connectionStatus) {
        connectionStatus.innerHTML = '<i class="fas fa-signal me-1 text-danger"></i> Desconectado';
      }
      mostrarModoDemo();
      
      // 🔁 Reconexión automática después de 3 segundos
      setTimeout(() => {
        console.log("🔄 Intentando reconectar WebSocket...");
        conectarWebSocket();
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error("⚠️ Error en WebSocket:", error);
      mostrarModoDemo();
    };
  } catch (error) {
    console.error("❌ Error al crear WebSocket:", error);
    mostrarModoDemo();
  }
}

// =============================================================
// ⚙️ UTILIDADES
// =============================================================
function mostrarModoDemo() {
  const alert = document.getElementById("demo-alert");
  if (alert) alert.classList.remove("d-none");
  const mode = document.getElementById("connection-mode");
  if (mode) {
    mode.classList.replace("bg-success", "bg-warning");
    mode.innerText = "Modo Demo";
  }
}

function cargarObstaculos() {
  // Función simulada para cargar obstáculos
  console.log("Cargando obstáculos...");
}

// =============================================================
// 🚀 AL INICIAR LA PÁGINA
// =============================================================
function inicializarElementosDOM() {
  // Inicializar todas las referencias a elementos DOM
  statusText = document.getElementById("status-text");
  statusDetail = document.getElementById("status-detail");
  progressBar = document.getElementById("progress-bar");
  lastUpdate = document.getElementById("last-update");
  eventCount = document.getElementById("event-count");
  eventCountBadge = document.getElementById("event-count-badge");
  movimientoActivo = document.getElementById("movimiento-activo");
  listaEventos = document.getElementById("listaEventos");
  
  console.log("Elementos DOM inicializados:", {
    statusText: !!statusText,
    statusDetail: !!statusDetail,
    progressBar: !!progressBar,
    movimientoActivo: !!movimientoActivo,
    listaEventos: !!listaEventos
  });
}

window.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Inicializando aplicación...");
  
  // Primero inicializar elementos DOM
  inicializarElementosDOM();
  
  // Luego conectar WebSocket y cargar datos
  conectarWebSocket();
  cargarSecuenciasGuardadas();
  actualizarSecuenciaUI();
  
  // Agregar event listeners para el efecto de botón presionado
  document.querySelectorAll('.control-btn').forEach(btn => {
    btn.addEventListener('mousedown', function() {
      this.classList.add('presionado');
    });
    
    btn.addEventListener('mouseup', function() {
      this.classList.remove('presionado');
    });
    
    btn.addEventListener('mouseleave', function() {
      this.classList.remove('presionado');
    });
    
    // Para dispositivos táctiles
    btn.addEventListener('touchstart', function() {
      this.classList.add('presionado');
    });
    
    btn.addEventListener('touchend', function() {
      this.classList.remove('presionado');
    });
  });
  
  console.log("✅ Aplicación inicializada correctamente");
});

// =============================================================
// 🎮 CONTROL CON MANDO DE XBOX
// =============================================================

class XboxController {
    constructor() {
        this.connected = false;
        this.gamepadIndex = null;
        this.buttons = {};
        this.axes = [];
        this.deadZone = 0.3; // Zona muerta para evitar drift
        this.lastStates = {};
        this.animationFrame = null;
        
        // Mapeo de botones de Xbox Controller
        this.buttonMap = {
            0: 'A',      // A button
            1: 'B',      // B button  
            2: 'X',      // X button
            3: 'Y',      // Y button
            4: 'LB',     // Left bumper
            5: 'RB',     // Right bumper
            6: 'LT',     // Left trigger
            7: 'RT',     // Right trigger
            8: 'View',   // View/Select button
            9: 'Menu',   // Menu/Start button
            10: 'LS',    // Left stick press
            11: 'RS',    // Right stick press
            12: 'Up',    // D-pad up
            13: 'Down',  // D-pad down
            14: 'Left',  // D-pad left
            15: 'Right'  // D-pad right
        };

        // Mapeo de ejes
        this.axisMap = {
            0: 'LS_Horizontal', // Left stick horizontal
            1: 'LS_Vertical',   // Left stick vertical  
            2: 'RS_Horizontal', // Right stick horizontal
            3: 'RS_Vertical'    // Right stick vertical
        };

        // Mapeo de controles a movimientos
        this.controlMap = {
            'LS_Up': 'Adelante',
            'LS_Down': 'Atrás', 
            'LS_Left': 'Izquierda',
            'LS_Right': 'Derecha',
            'DPad_Up': 'Adelante',
            'DPad_Down': 'Atrás',
            'DPad_Left': 'Izquierda', 
            'DPad_Right': 'Derecha',
            'A': 'Detenerse',
            'B': 'Demo',
            'X': 'Curva Izquierda Adelante',
            'Y': 'Curva Derecha Adelante',
            'LB': 'Curva Izquierda Atrás',
            'RB': 'Curva Derecha Atrás'
        };

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateControllerStatus();
    }

    setupEventListeners() {
        window.addEventListener("gamepadconnected", (e) => {
            console.log("🎮 Mando conectado:", e.gamepad);
            this.gamepadIndex = e.gamepad.index;
            this.connected = true;
            this.updateControllerStatus();
            this.startPolling();
        });

        window.addEventListener("gamepaddisconnected", (e) => {
            console.log("🎮 Mando desconectado:", e.gamepad);
            if (this.gamepadIndex === e.gamepad.index) {
                this.connected = false;
                this.gamepadIndex = null;
                this.updateControllerStatus();
                this.stopPolling();
            }
        });
    }

    startPolling() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        const poll = () => {
            this.update();
            this.animationFrame = requestAnimationFrame(poll);
        };
        
        poll();
    }

    stopPolling() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    update() {
        if (!this.connected || this.gamepadIndex === null) return;

        const gamepad = navigator.getGamepads()[this.gamepadIndex];
        if (!gamepad) return;

        this.updateButtons(gamepad.buttons);
        this.updateAxes(gamepad.axes);
        this.handleControls();
    }

    updateButtons(buttons) {
        buttons.forEach((button, index) => {
            const buttonName = this.buttonMap[index];
            const pressed = button.pressed;
            const value = button.value;
            
            // Solo procesar si el estado cambió
            if (this.lastStates[buttonName] !== pressed) {
                this.buttons[buttonName] = { pressed, value };
                this.lastStates[buttonName] = pressed;
                
                if (pressed) {
                    console.log(`🎮 Botón ${buttonName} presionado`);
                    this.handleButtonPress(buttonName);
                }
            }
        });
    }

    updateAxes(axes) {
        this.axes = axes.map((axis, index) => {
            const axisName = this.axisMap[index];
            // Aplicar zona muerta
            const value = Math.abs(axis) > this.deadZone ? axis : 0;
            return { name: axisName, value };
        });
    }

    handleControls() {
        // Procesar ejes (joysticks)
        this.handleStickControls();
    }

    handleStickControls() {
        const leftStick = {
            x: this.axes[0]?.value || 0,
            y: this.axes[1]?.value || 0
        };

        // Solo procesar si hay movimiento significativo
        if (Math.abs(leftStick.x) > this.deadZone || Math.abs(leftStick.y) > this.deadZone) {
            this.handleStickMovement(leftStick);
        } else {
            // Si no hay movimiento y había movimiento antes, detener
            if (this.lastStickMovement) {
                detenerMovimiento();
                this.lastStickMovement = null;
            }
        }
    }

    handleStickMovement(stick) {
        const { x, y } = stick;
        let movimiento = '';
        
        // Determinar dirección basada en ángulos
        const angle = Math.atan2(y, x);
        const degrees = angle * (180 / Math.PI);
        const normalizedDegrees = (degrees + 360) % 360;

        // Definir sectores de movimiento
        if (Math.abs(x) > Math.abs(y)) {
            // Movimiento horizontal predominante
            if (x > this.deadZone) {
                movimiento = 'Derecha';
            } else if (x < -this.deadZone) {
                movimiento = 'Izquierda';
            }
        } else {
            // Movimiento vertical predominante
            if (y > this.deadZone) {
                movimiento = 'Atrás';
            } else if (y < -this.deadZone) {
                movimiento = 'Adelante';
            }
        }

        // Movimientos diagonales (curvas)
        if (Math.abs(x) > this.deadZone && Math.abs(y) > this.deadZone) {
            if (x > this.deadZone && y < -this.deadZone) {
                movimiento = 'Curva Derecha Adelante';
            } else if (x < -this.deadZone && y < -this.deadZone) {
                movimiento = 'Curva Izquierda Adelante';
            } else if (x > this.deadZone && y > this.deadZone) {
                movimiento = 'Curva Derecha Atrás';
            } else if (x < -this.deadZone && y > this.deadZone) {
                movimiento = 'Curva Izquierda Atrás';
            }
        }

        if (movimiento && movimiento !== this.lastStickMovement) {
            iniciarMovimiento(movimiento);
            this.lastStickMovement = movimiento;
        }
    }

    handleButtonPress(buttonName) {
        const movimiento = this.controlMap[buttonName];
        if (movimiento) {
            if (movimiento === 'Detenerse') {
                detenerMovimiento();
            } else {
                iniciarMovimiento(movimiento);
                
                // Para botones que no son de movimiento continuo, detener después de un tiempo
                if (!['Adelante', 'Atrás', 'Izquierda', 'Derecha'].includes(movimiento)) {
                    setTimeout(() => {
                        detenerMovimiento();
                    }, 500);
                }
            }
        }

        // Botones para secuencias
        this.handleSequenceButtons(buttonName);
    }

    handleSequenceButtons(buttonName) {
        switch(buttonName) {
            case 'View': // Select button
                limpiarSecuencia();
                break;
            case 'Menu': // Start button  
                ejecutarSecuencia();
                break;
            case 'LS': // Left stick press
                agregarMovimientoPersonalizado();
                break;
        }
    }

    updateControllerStatus() {
        const statusElement = document.getElementById('controller-status');
        if (!statusElement) return;

        if (this.connected) {
            statusElement.innerHTML = 
                '<i class="fas fa-gamepad me-1 text-success"></i> Mando Xbox Conectado';
            statusElement.classList.remove('text-danger');
            statusElement.classList.add('text-success');
        } else {
            statusElement.innerHTML = 
                '<i class="fas fa-gamepad me-1 text-danger"></i> Mando No Conectado';
            statusElement.classList.remove('text-success');
            statusElement.classList.add('text-danger');
        }
    }

    getControllerInfo() {
        if (!this.connected || this.gamepadIndex === null) return null;
        
        const gamepad = navigator.getGamepads()[this.gamepadIndex];
        return {
            id: gamepad.id,
            index: gamepad.index,
            buttons: gamepad.buttons.length,
            axes: gamepad.axes.length,
            connected: gamepad.connected
        };
    }
}

// =============================================================
// 🎮 INICIALIZACIÓN DEL CONTROLADOR
// =============================================================

let xboxController = null;

function initXboxController() {
    xboxController = new XboxController();
    
    // Verificar si ya hay mandos conectados al cargar la página
    const gamepads = navigator.getGamepads();
    for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i] && gamepads[i].id.toLowerCase().includes('xbox')) {
            console.log("🎮 Mando Xbox ya conectado:", gamepads[i]);
            window.dispatchEvent(new GamepadEvent('gamepadconnected', {
                gamepad: gamepads[i]
            }));
            break;
        }
    }
}

// =============================================================
// 🔧 HERRAMIENTAS DE DEBUG (opcional)
// =============================================================

function showControllerDebug() {
    if (!xboxController || !xboxController.connected) {
        console.log("🎮 No hay mando conectado");
        return;
    }

    const gamepad = navigator.getGamepads()[xboxController.gamepadIndex];
    console.log("🎮 Estado del mando:", {
        id: gamepad.id,
        buttons: gamepad.buttons.map(b => b.pressed),
        axes: gamepad.axes,
        mapping: gamepad.mapping
    });
}

// Agregar al inicializador principal
window.addEventListener("DOMContentLoaded", () => {
    // ... código existente ...
    
    // Inicializar control de Xbox
    initXboxController();
    
    // Agregar elemento de estado del controlador si no existe
    if (!document.getElementById('controller-status')) {
        const statusElement = document.createElement('div');
        statusElement.id = 'controller-status';
        statusElement.className = 'navbar-text ms-3';
        statusElement.innerHTML = '<i class="fas fa-gamepad me-1 text-danger"></i> Mando No Conectado';
        
        const navbar = document.querySelector('.navbar .d-flex');
        if (navbar) {
            navbar.appendChild(statusElement);
        }
    }
});