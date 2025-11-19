// --- CONFIGURACIÓN ---
const SERVER_URL = "http://98.91.45.27:5000"; // Solo para referencia (ya no se usa fetch)
const WS_URL = "ws://98.91.45.27:5000/ws";    // Endpoint WebSocket puro
let ws = null;

// --- ESTADO INICIAL ---
let eventoCount = 0;
let lastMovimiento = "";
let progreso = 0;
let secuencia = [];
let secuenciasGuardadas = [];

// --- ELEMENTOS DOM ---
const statusText = document.getElementById("status-text");
const statusDetail = document.getElementById("status-detail");
const progressBar = document.getElementById("progress-bar");
const lastUpdate = document.getElementById("last-update");
const eventCount = document.getElementById("event-count");
const eventCountBadge = document.getElementById("event-count-badge");
const movimientoActivo = document.getElementById("movimiento-activo");
const listaEventos = document.getElementById("listaEventos");

// =============================================================
// 🎮 FUNCIONES DE CONTROL DEL CARRO
// =============================================================
function iniciarMovimiento(tipo) {
  lastMovimiento = tipo;
  movimientoActivo.innerText = `Moviendo: ${tipo}`;
  movimientoActivo.classList.add('activo');
  enviarEventoWS(tipo);
}

function detenerMovimiento() {
  if (lastMovimiento) {
    movimientoActivo.innerText = "Detenido";
    movimientoActivo.classList.remove('activo');
    enviarEventoWS("Detenerse");
    lastMovimiento = "";
  }
}

// =============================================================
// 📡 ENVIAR EVENTOS POR WEBSOCKET
// =============================================================
function enviarEventoWS(tipo_evento) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.warn("⚠️ WebSocket no conectado, no se puede enviar evento");
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
  
  document.getElementById('secuencia-activa-info').innerHTML = `
    <strong>Ejecutando secuencia actual</strong><br>
    <small>${secuencia.length} movimientos</small>
  `;
  
  secuencia.forEach((mov, i) => {
    setTimeout(() => {
      enviarEventoWS(mov);
      
      // Actualizar progreso
      const progreso = ((i + 1) / secuencia.length) * 100;
      document.getElementById('progreso-secuencia').style.width = `${progreso}%`;
      
      if (i === secuencia.length - 1) {
        setTimeout(() => {
          document.getElementById('secuencia-activa-info').innerHTML = '';
          document.getElementById('progreso-secuencia').style.width = '0%';
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

// Cargar secuencias guardadas al iniciar
function cargarSecuenciasGuardadas() {
  const guardadas = localStorage.getItem('secuenciasCarro');
  if (guardadas) {
    secuenciasGuardadas = JSON.parse(guardadas);
    actualizarListaSecuenciasGuardadas();
  }
}

// Guardar secuencia actual
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
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-check"></i> Guardada!';
  setTimeout(() => {
    btn.innerHTML = originalText;
  }, 2000);
}

// Ejecutar secuencia guardada
function ejecutarSecuenciaGuardada(id) {
  const secuenciaEncontrada = secuenciasGuardadas.find(s => s.id === id);
  if (secuenciaEncontrada) {
    // Mostrar información de la secuencia
    document.getElementById('secuencia-activa-info').innerHTML = `
      <strong>Ejecutando:</strong> ${secuenciaEncontrada.nombre}<br>
      <small>${secuenciaEncontrada.movimientos.length} movimientos</small>
    `;
    
    // Ejecutar movimientos
    secuenciaEncontrada.movimientos.forEach((mov, i) => {
      setTimeout(() => {
        enviarEventoWS(mov);
        
        // Actualizar progreso
        const progreso = ((i + 1) / secuenciaEncontrada.movimientos.length) * 100;
        document.getElementById('progreso-secuencia').style.width = `${progreso}%`;
        
        if (i === secuenciaEncontrada.movimientos.length - 1) {
          setTimeout(() => {
            document.getElementById('secuencia-activa-info').innerHTML = '';
            document.getElementById('progreso-secuencia').style.width = '0%';
          }, 1000);
        }
      }, i * 1000);
    });
  }
}

// Eliminar secuencia guardada
function eliminarSecuenciaGuardada(id, event) {
  event.stopPropagation();
  if (confirm('¿Eliminar esta secuencia?')) {
    secuenciasGuardadas = secuenciasGuardadas.filter(s => s.id !== id);
    guardarEnLocalStorage();
    actualizarListaSecuenciasGuardadas();
  }
}

// Guardar en localStorage
function guardarEnLocalStorage() {
  localStorage.setItem('secuenciasCarro', JSON.stringify(secuenciasGuardadas));
}

// Actualizar UI de secuencias guardadas
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

// Exportar secuencias
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

// Importar secuencias
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
  statusText.innerText = evento.tipo_evento || "Sin tipo";
  statusDetail.innerText = evento.detalle || "Sin detalle";
  progreso = Math.min(progreso + 10, 100);
  progressBar.style.width = `${progreso}%`;
  lastUpdate.innerText = new Date().toLocaleTimeString();

  eventoCount++;
  eventCount.innerText = eventoCount;
  eventCountBadge.innerText = eventoCount;

  const div = document.createElement("div");
  div.classList.add("event-item");
  div.innerHTML = `<small>${new Date().toLocaleTimeString()}</small> - ${evento.tipo_evento}: ${evento.detalle}`;
  listaEventos.prepend(div);
}

// =============================================================
// 🌐 CONEXIÓN WEBSOCKET PURO
// =============================================================
function conectarWebSocket() {
  console.log("🔌 Conectando al WebSocket...");
  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    console.log("✅ Conectado al WebSocket!");
    document.getElementById("connection-status").innerHTML =
      '<i class="fas fa-signal me-1 text-success"></i> Conectado';
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

  ws.onclose = () => {
    console.warn("❌ Desconectado del WebSocket");
    document.getElementById("connection-status").innerHTML =
      '<i class="fas fa-signal me-1 text-danger"></i> Desconectado';
    mostrarModoDemo();
    setTimeout(conectarWebSocket, 5000); // 🔁 Reconexión automática
  };

  ws.onerror = (error) => {
    console.error("⚠️ Error en WebSocket:", error);
    ws.close();
  };
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
window.addEventListener("DOMContentLoaded", () => {
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
});