// js/main.js

// --- Conexión SocketIO ---
const socket = io("http://98.91.45.27:5000"); // Cambia si tu servidor está en otra IP

// --- Estado inicial ---
let eventoCount = 0;
let lastMovimiento = "";
let progreso = 0;

// --- Elementos DOM ---
const statusText = document.getElementById("status-text");
const statusDetail = document.getElementById("status-detail");
const progressBar = document.getElementById("progress-bar");
const lastUpdate = document.getElementById("last-update");
const eventCount = document.getElementById("event-count");
const eventCountBadge = document.getElementById("event-count-badge");
const movimientoActivo = document.getElementById("movimiento-activo");
const listaEventos = document.getElementById("listaEventos");

// --- Funciones para controlar el carro ---
function enviarEvento(tipo) {
  const data = {
    id_dispositivo: 1,
    tipo: tipo,
    detalle: `Movimiento: ${tipo}`
  };
  socket.emit("nuevo_evento", data);
}

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

// --- Manejo de secuencias ---
let secuencia = [];
function agregarMovimiento(tipo) {
  secuencia.push(tipo);
  actualizarSecuenciaUI();
}

function agregarMovimientoPersonalizado() {
  const movimientos = ["Adelante","Atrás","Izquierda","Derecha","Bailar"];
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
      div.innerText = `${i+1}. ${mov}`;
      listaSecuencia.appendChild(div);
    });
  }
}

// --- Función para actualizar Estado Actual ---
function actualizarEstado(evento) {
  statusText.innerText = evento.tipo;
  statusDetail.innerText = evento.detalle;
  progreso = Math.min(progreso + 10, 100);
  progressBar.style.width = `${progreso}%`;
  lastUpdate.innerText = new Date().toLocaleTimeString();
  eventoCount++;
  eventCount.innerText = eventoCount;
  eventCountBadge.innerText = eventoCount;
}

// --- SocketIO listeners ---
socket.on("connect", () => {
  console.log("✅ Conectado al servidor SocketIO");
});

socket.on("conexion_exitosa", (data) => {
  console.log(data.mensaje);
});

socket.on("nuevo_evento", (data) => {
  console.log("Evento recibido:", data);
  actualizarEstado(data);

  // Agregar a lista de eventos recientes
  const div = document.createElement("div");
  div.classList.add("event-item");
  div.innerHTML = `<small>${new Date().toLocaleTimeString()}</small> - ${data.tipo}: ${data.detalle}`;
  listaEventos.prepend(div);
});

socket.on("nuevo_obstaculo", (data) => {
  console.log("Obstáculo recibido:", data);
  // Aquí puedes actualizar tu lista de obstáculos o contador
});
