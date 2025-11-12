// --- CONFIGURACIÓN ---
const SERVER_URL = "http://98.91.45.27:5000"; // Dirección base del servidor Flask
const WS_URL = "ws://98.91.45.27:5000/ws";    // Endpoint WebSocket puro
let ws = null;

// --- ESTADO INICIAL ---
let eventoCount = 0;
let lastMovimiento = "";
let progreso = 0;

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
// 📡 API REQUESTS (POST / GET)
// =============================================================

async function enviarEvento(tipo_evento) {
  const data = {
    id_dispositivo: 1,
    tipo_evento: tipo_evento,
    detalle: `Movimiento: ${tipo_evento}`
  };

  try {
    const res = await fetch(`${SERVER_URL}/api/evento`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const json = await res.json();
    console.log("📤 Evento enviado:", json);

    if (json.status === "ok") {
      actualizarEstado(json.evento);
    } else {
      console.warn("⚠️ No se pudo registrar el evento:", json.mensaje);
    }

  } catch (error) {
    console.error("❌ Error al enviar evento:", error);
    mostrarModoDemo();
  }
}

async function obtenerUltimoEvento() {
  try {
    const res = await fetch(`${SERVER_URL}/api/evento`);
    const json = await res.json();

    if (json.status === "ok" && json.evento) {
      console.log("📥 Último evento:", json.evento);
      actualizarEstado(json.evento);
    } else {
      console.log("ℹ️ Sin eventos registrados.");
    }
  } catch (error) {
    console.error("❌ Error al consultar el último evento:", error);
    mostrarModoDemo();
  }
}

// =============================================================
// 🎮 FUNCIONES DE CONTROL DEL CARRO
// =============================================================
function iniciarMovimiento(tipo) {
  lastMovimiento = tipo;
  movimientoActivo.innerText = `Moviendo: ${tipo}`;
  enviarEvento(tipo);
}

function detenerMovimiento() {
  if (lastMovimiento) {
    movimientoActivo.innerText = "Detenido";
    enviarEvento("Detenerse");
    lastMovimiento = "";
  }
}

// =============================================================
// 🧩 SECUENCIAS
// =============================================================
let secuencia = [];

function agregarMovimiento(tipo) {
  secuencia.push(tipo);
  actualizarSecuenciaUI();
}

function agregarMovimientoPersonalizado() {
  const movimientos = ["Adelante", "Atrás", "Izquierda", "Derecha", "Bailar"];
  const random = movimientos[Math.floor(Math.random() * movimientos.length)];
  agregarMovimiento(random);
}

function ejecutarSecuencia() {
  if (secuencia.length === 0) return;
  secuencia.forEach((mov, i) => {
    setTimeout(() => {
      enviarEvento(mov);
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
      div.innerText = `${i + 1}. ${mov}`;
      listaSecuencia.appendChild(div);
    });
  }
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

  // Mostrar en lista lateral
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
    // Reconexión automática
    setTimeout(conectarWebSocket, 5000);
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

// =============================================================
// 🚀 AL INICIAR LA PÁGINA
// =============================================================
window.addEventListener("DOMContentLoaded", () => {
  obtenerUltimoEvento();
  conectarWebSocket();
});
