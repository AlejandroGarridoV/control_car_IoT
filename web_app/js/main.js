// --- CONFIGURACIÓN ---
const SERVER_URL = "http://98.91.45.27:5000";
const WS_URL = "ws://98.91.45.27:5000/ws";
let ws = null;

// --- ESTADO INICIAL ---
let eventoCount = 0;
let lastMovimiento = "";
let secuencia = [];
let secuenciasGuardadas = [];

// --- VARIABLES DE RECONEXIÓN ---
let reconnectDelay = 1000;
let maxReconnectDelay = 30000;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 50;

// --- VARIADOR DE VELOCIDAD ---
let velocidadActual = 250; // Velocidad por defecto (máxima)

// --- SISTEMA DE EVENTOS (SOLO CONTROL) ---
let eventosControl = [];
const MAX_EVENTOS = 50;

// --- ELEMENTOS DOM ---
let movimientoActivo;




// =============================================================
// 🎮 SISTEMA DE EVENTOS - SOLO CONTROL
// =============================================================

// Función para registrar eventos de CONTROL (no obstáculos)
function registrarEventoControl(tipo, subtipo, titulo, detalles = '', metadata = {}) {
  const evento = {
    id: Date.now(),
    tipo: tipo, // 'movimiento', 'secuencia', 'velocidad', 'sistema'
    subtipo: subtipo, // 'adelante', 'atras', 'giro', etc.
    titulo: titulo,
    detalles: detalles,
    metadata: {
      velocidad: velocidadActual,
      ...metadata
    },
    timestamp: new Date(),
    tiempo_formateado: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})
  };
  
  // Insertar al inicio del array
  eventosControl.unshift(evento);
  
  // Limitar el tamaño del array
  if (eventosControl.length > MAX_EVENTOS) {
    eventosControl.pop();
  }
  
  // Actualizar contador
  eventoCount = eventosControl.length;
  actualizarContadorEventos();
  
  // Actualizar la interfaz
  actualizarListaEventosControl();
  
  console.log(`📝 Evento de control registrado: ${tipo} - ${subtipo} - ${titulo}`);
  
  return evento;
}

// Actualizar lista de eventos (SOLO CONTROL)
function actualizarListaEventosControl() {
  const lista = document.getElementById('listaEventos');
  if (!lista) return;
  
  if (eventosControl.length === 0) {
    lista.innerHTML = `
      <div class="empty-events">
        <i class="fas fa-history fa-lg mb-2"></i>
        <p class="small">Sin eventos de control</p>
        <small class="text-muted">Usa los controles para comenzar</small>
      </div>
    `;
    return;
  }
  
  lista.innerHTML = eventosControl.map((evento, index) => `
    <div class="event-item ${getClaseEventoControl(evento.subtipo)} ${index === 0 ? 'new' : ''}">
      <div class="event-header">
        <div class="event-time">${evento.tiempo_formateado}</div>
        <div class="event-type">
          <i class="${getIconoEventoControl(evento.subtipo)}"></i>
          ${getTipoTexto(evento.tipo)}
        </div>
      </div>
      <div class="event-body">
        <div class="event-title">${evento.titulo}</div>
        <div class="event-details">${evento.detalles}</div>
        <div class="event-meta">
          ${evento.metadata.velocidad ? `<span><i class="fas fa-tachometer-alt"></i> Vel: ${evento.metadata.velocidad}</span>` : ''}
          ${evento.metadata.total_movimientos ? `<span><i class="fas fa-list-ol"></i> Movs: ${evento.metadata.total_movimientos}</span>` : ''}
          ${evento.metadata.paso ? `<span><i class="fas fa-step-forward"></i> Paso ${evento.metadata.paso}/${evento.metadata.total}</span>` : ''}
        </div>
      </div>
    </div>
  `).join('');
  
  // Remover clase "new" después de la animación
  setTimeout(() => {
    const items = lista.querySelectorAll('.event-item.new');
    items.forEach(item => item.classList.remove('new'));
  }, 500);
}

// Funciones auxiliares para estilos de eventos de CONTROL
function getClaseEventoControl(subtipo) {
  const clases = {
    // Movimientos básicos
    'adelante': 'event-adelante',
    'atras': 'event-atras',
    'izquierda': 'event-izquierda',
    'derecha': 'event-derecha',
    'detener': 'event-detener',
    
    // Curvas
    'curva_izquierda_adelante': 'event-curva',
    'curva_derecha_adelante': 'event-curva',
    'curva_izquierda_atras': 'event-curva',
    'curva_derecha_atras': 'event-curva',
    
    // Giros
    'girarizquierda90': 'event-giro',
    'girarderecha90': 'event-giro',
    'girarizquierda180': 'event-giro',
    'girarderecha180': 'event-giro',
    
    // Otros
    'velocidad': 'event-velocidad',
    'demo': 'event-demo',
    'secuencia': 'event-secuencia',
    'sistema': 'event-sistema'
  };
  
  return clases[subtipo] || 'event-sistema';
}

function getIconoEventoControl(subtipo) {
  const iconos = {
    // Movimientos básicos
    'adelante': 'fas fa-arrow-up',
    'atras': 'fas fa-arrow-down',
    'izquierda': 'fas fa-arrow-left',
    'derecha': 'fas fa-arrow-right',
    'detener': 'fas fa-stop',
    
    // Curvas
    'curva_izquierda_adelante': 'fas fa-arrow-up rotate-45-left',
    'curva_derecha_adelante': 'fas fa-arrow-up rotate-45-right',
    'curva_izquierda_atras': 'fas fa-arrow-down rotate-45-right',
    'curva_derecha_atras': 'fas fa-arrow-down rotate-45-left',
    
    // Giros
    'girarizquierda90': 'fas fa-undo',
    'girarderecha90': 'fas fa-redo',
    'girarizquierda180': 'fas fa-undo fa-rotate-270',
    'girarderecha180': 'fas fa-redo fa-rotate-90',
    
    // Otros
    'velocidad': 'fas fa-tachometer-alt',
    'demo': 'fas fa-music',
    'secuencia': 'fas fa-list-ol',
    'sistema': 'fas fa-cog'
  };
  
  return iconos[subtipo] || 'fas fa-info-circle';
}

function getTipoTexto(tipo) {
  const textos = {
    'movimiento': 'MOVIMIENTO',
    'secuencia': 'SECUENCIA',
    'velocidad': 'VELOCIDAD',
    'sistema': 'SISTEMA'
  };
  
  return textos[tipo] || 'CONTROL';
}

// Actualizar contador de eventos
function actualizarContadorEventos() {
  const totalCount = document.getElementById('total-event-count');
  if (totalCount) {
    totalCount.textContent = eventoCount;
    
    // Cambiar color según cantidad
    if (eventoCount > 40) {
      totalCount.className = 'badge bg-danger';
    } else if (eventoCount > 20) {
      totalCount.className = 'badge bg-warning';
    } else {
      totalCount.className = 'badge bg-primary';
    }
  }
}

// =============================================================
// 🎮 FUNCIONES DE CONTROL DEL CARRO (ACTUALIZADAS)
// =============================================================
function iniciarMovimiento(tipo) {
  lastMovimiento = tipo;
  
  // Convertir tipo a subtipo para el sistema de eventos
  let subtipo = 'adelante';
  if (tipo === 'Atrás') subtipo = 'atras';
  else if (tipo === 'Izquierda') subtipo = 'izquierda';
  else if (tipo === 'Derecha') subtipo = 'derecha';
  else if (tipo === 'Detenerse') subtipo = 'detener';
  else if (tipo.includes('Curva')) subtipo = tipo.toLowerCase().replace(/ /g, '_');
  else if (tipo.includes('Girar')) subtipo = tipo.toLowerCase().replace('girar', 'girar').replace(/ /g, '');
  else if (tipo === 'Demo') subtipo = 'demo';
  
  // Registrar evento de CONTROL
  registrarEventoControl('movimiento', subtipo, tipo, `Movimiento iniciado (Vel: ${velocidadActual})`, {
    velocidad: velocidadActual
  });
  
  if (movimientoActivo) {
    movimientoActivo.innerText = `Moviendo: ${tipo} (Vel: ${velocidadActual})`;
    movimientoActivo.classList.add('activo');
  }
  
  enviarEventoWS(tipo);
}

function detenerMovimiento() {
  if (lastMovimiento) {
    // Registrar evento de CONTROL
    registrarEventoControl('movimiento', 'detener', 'Detenerse', 'Movimiento detenido');
    
    if (movimientoActivo) {
      movimientoActivo.innerText = "Detenido";
      movimientoActivo.classList.remove('activo');
    }
    enviarEventoWS("Detenerse");
    lastMovimiento = "";
  }
}

// =============================================================
// 🌐 CONEXIÓN WEBSOCKET - ACTUALIZADA (SIN REGISTRAR EVENTOS DE CONEXIÓN EN LA LISTA)
// =============================================================
function conectarWebSocket() {
  if (ws) {
    if (ws.readyState === WebSocket.CONNECTING) {
      console.log("⚠️ Ya se está conectando al WebSocket...");
      return;
    }
    if (ws.readyState === WebSocket.OPEN) {
      console.log("✅ Ya conectado al WebSocket");
      return;
    }
  }
  
  console.log(`🔌 Conectando al WebSocket... (Intento ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);
  
  try {
    if (ws) {
      ws.close();
      ws = null;
    }

    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log("✅ Conectado al WebSocket!");
      reconnectDelay = 1000;
      reconnectAttempts = 0;
      
      const connectionStatus = document.getElementById("connection-status");
      if (connectionStatus) {
        connectionStatus.innerHTML = '<i class="fas fa-signal me-1 text-success"></i> Conectado';
      }
      
      // NO registrar evento de conexión en la lista de eventos de control
      // Solo mostrar notificación
      mostrarNotificacion("✅ Conectado al servidor", "success");
      
      // Enviar identificación
      enviarIdentificacion();
      
      // Enviar velocidad actual
      setTimeout(() => {
        enviarVelocidadAlCarro();
      }, 500);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("📥 Mensaje WebSocket recibido:", data);
        
        // Solo procesar datos, NO registrar en eventos de control
        // (Los obstáculos tienen su propia sección)
        if (data.tipo_evento && data.tipo_evento.includes('Obstáculo')) {
          // Los obstáculos se manejan en su propia sección
          console.log("Obstáculo detectado:", data);
        }
      } catch (err) {
        console.warn("⚠️ Mensaje no JSON:", event.data);
      }
    };

    ws.onclose = (event) => {
      console.warn(`❌ Desconectado del WebSocket. Código: ${event.code}, Razón: ${event.reason || 'Sin razón'}`);
      
      // NO registrar evento de desconexión en la lista de eventos de control
      // Solo actualizar estado y mostrar notificación
      const connectionStatus = document.getElementById("connection-status");
      if (connectionStatus) {
        connectionStatus.innerHTML = '<i class="fas fa-signal me-1 text-danger"></i> Desconectado';
      }
      
      mostrarNotificacion("❌ Desconectado del servidor", "danger");
      
      if (event.code !== 1000 && event.code !== 1001 && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        reconnectDelay = Math.min(maxReconnectDelay, reconnectDelay * 1.5 + Math.random() * 1000);
        
        console.log(`⏳ Reconectando en ${Math.round(reconnectDelay/1000)}s (intento ${reconnectAttempts})`);
        
        setTimeout(() => {
          conectarWebSocket();
        }, reconnectDelay);
      } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error("❌ Máximo de intentos de reconexión alcanzado");
        alert("⚠️ No se pudo conectar con el servidor. Por favor, recarga la página.");
      }
    };

    ws.onerror = (error) => {
      console.error("⚠️ Error en WebSocket:", error);
    };
  } catch (error) {
    console.error("❌ Error al crear WebSocket:", error);
    
    setTimeout(() => {
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        conectarWebSocket();
      }
    }, 5000);
  }
}

function enviarIdentificacion() {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  
  const identificacion = {
    tipo: "identificacion",
    dispositivo: "carro_iot_frontend",
    version: "1.0",
    timestamp: new Date().toISOString()
  };
  
  try {
    ws.send(JSON.stringify(identificacion));
    console.log("📤 Identificación enviada:", identificacion);
  } catch (err) {
    console.error("❌ Error enviando identificación:", err);
  }
}

// Función para enviar eventos por WebSocket (ACTUALIZADA)
function enviarEventoWS(tipo_evento) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.warn("⚠️ WebSocket no conectado, evento no enviado");
    
    // Solo mostrar notificación, NO registrar en eventos de control
    mostrarNotificacionError("No hay conexión con el servidor");
    return;
  }

  const data = {
    id_dispositivo: 1,
    tipo_evento: tipo_evento,
    detalle: `Movimiento: ${tipo_evento} | Velocidad: ${velocidadActual}`,
    velocidad: velocidadActual,
    fecha_hora: new Date().toISOString(),
  };

  try {
    ws.send(JSON.stringify(data));
    console.log(`📤 Evento enviado: ${tipo_evento} (Vel: ${velocidadActual})`);
  } catch (err) {
    console.error("❌ Error al enviar evento por WebSocket:", err);
    mostrarNotificacionError("Error al enviar comando");
  }
}

// =============================================================
// 🧩 SISTEMA DE SECUENCIAS (ACTUALIZADAS)
// =============================================================
function agregarMovimiento(tipo) {
  secuencia.push(tipo);
  actualizarSecuenciaUI();
  console.log(`➕ Movimiento agregado: ${tipo}. Secuencia:`, secuencia);
  
  // Registrar evento de CONTROL
  registrarEventoControl('secuencia', 'secuencia', 'Secuencia Actualizada', 
    `Movimiento agregado: ${tipo}`, {
      total_movimientos: secuencia.length
    }
  );
  
  mostrarNotificacion(`Movimiento agregado: ${tipo}`, "success");
}

function agregarMovimientoPersonalizado() {
  const movimientos = [
    "Adelante", "Atrás", "Izquierda", "Derecha", "Demo",
    "Curva Derecha Adelante", "Curva Izquierda Adelante",
    "Curva Izquierda Atrás", "Curva Derecha Atrás",
    "GirarIzquierda90", "GirarDerecha90", "GirarIzquierda180", "GirarDerecha180"
  ];
  const random = movimientos[Math.floor(Math.random() * movimientos.length)];
  agregarMovimiento(random);
}

function removerMovimiento(index) {
  if (index >= 0 && index < secuencia.length) {
    const movimientoEliminado = secuencia[index];
    secuencia.splice(index, 1);
    actualizarSecuenciaUI();
    console.log(`➖ Movimiento eliminado: ${movimientoEliminado}`);
    
    // Registrar evento de CONTROL
    registrarEventoControl('secuencia', 'secuencia', 'Secuencia Actualizada', 
      `Movimiento eliminado: ${movimientoEliminado}`, {
        total_movimientos: secuencia.length
      }
    );
    
    mostrarNotificacion(`Movimiento eliminado`, "warning");
  }
}

function ejecutarSecuencia() {
  if (secuencia.length === 0) {
    mostrarNotificacion('No hay movimientos en la secuencia', "warning");
    return;
  }
  
  console.log(`🎯 Ejecutando secuencia con ${secuencia.length} movimientos:`, secuencia);
  
  // Registrar evento de CONTROL
  registrarEventoControl('secuencia', 'secuencia', 'Ejecución de Secuencia', 
    `Iniciando secuencia con ${secuencia.length} movimientos`, {
      total_movimientos: secuencia.length,
      duracion_estimada: (secuencia.length * 1.5) + 's'
    }
  );
  
  const secuenciaActivaInfo = document.getElementById('secuencia-activa-info');
  const progresoSecuencia = document.getElementById('progreso-secuencia');
  
  if (secuenciaActivaInfo) {
    secuenciaActivaInfo.innerHTML = `
      <strong>Ejecutando secuencia actual</strong><br>
      <small>${secuencia.length} movimientos</small>
    `;
  }
  
  if (progresoSecuencia) {
    progresoSecuencia.style.width = '0%';
  }
  
  secuencia.forEach((movimiento, index) => {
    setTimeout(() => {
      console.log(`➡️ Ejecutando movimiento ${index + 1}: ${movimiento}`);
      enviarEventoWS(movimiento);
      
      // Registrar cada movimiento individual
      registrarEventoControl('secuencia', 'secuencia', 'Paso de Secuencia', 
        `Paso ${index + 1}/${secuencia.length}: ${movimiento}`, {
          paso: index + 1,
          total: secuencia.length
        }
      );
      
      const progreso = ((index + 1) / secuencia.length) * 100;
      if (progresoSecuencia) {
        progresoSecuencia.style.width = `${progreso}%`;
      }
      
      if (index === secuencia.length - 1) {
        setTimeout(() => {
          if (secuenciaActivaInfo) {
            secuenciaActivaInfo.innerHTML = '<small>Secuencia completada ✅</small>';
          }
          
          // Registrar evento de completado
          registrarEventoControl('secuencia', 'secuencia', 'Secuencia Completada', 
            'Secuencia ejecutada correctamente', {
              total_movimientos: secuencia.length
            }
          );
          
          mostrarNotificacion('Secuencia completada correctamente', "success");
          
          setTimeout(() => {
            if (secuenciaActivaInfo) secuenciaActivaInfo.innerHTML = '';
            if (progresoSecuencia) progresoSecuencia.style.width = '0%';
          }, 2000);
          
        }, 1000);
      }
    }, index * 1500);
  });
}

function limpiarSecuencia() {
  if (secuencia.length === 0) {
    mostrarNotificacion('La secuencia ya está vacía', "info");
    return;
  }
  
  secuencia = [];
  actualizarSecuenciaUI();
  console.log('🗑️ Secuencia limpiada');
  
  // Registrar evento de CONTROL
  registrarEventoControl('secuencia', 'secuencia', 'Secuencia Limpiada', 'Todos los movimientos eliminados');
  
  mostrarNotificacion('Secuencia limpiada', "success");
}

function actualizarSecuenciaUI() {
  const listaSecuencia = document.getElementById("listaSecuencia");
  if (!listaSecuencia) return;
  
  if (secuencia.length === 0) {
    listaSecuencia.innerHTML = `
      <div class="empty-sequence">
        <i class="fas fa-list-ul fa-lg mb-2"></i>
        <p class="small">No hay movimientos</p>
        <small class="text-muted">Agrega movimientos usando los botones</small>
      </div>
    `;
  } else {
    listaSecuencia.innerHTML = secuencia.map((mov, i) => `
      <div class="sequence-item">
        <span class="movement-number">${i + 1}.</span>
        <span class="movement-name">${mov}</span>
        <button class="btn-remove-movement" onclick="removerMovimiento(${i})" title="Eliminar movimiento">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `).join('');
  }
}

// =============================================================
// 💾 SISTEMA DE SECUENCIAS GUARDADAS (ACTUALIZADAS)
// =============================================================
async function cargarSecuencias() {
  console.log("🔄 Cargando secuencias...");
  await cargarSecuenciasDesdeBD();
}

async function cargarSecuenciasDesdeBD() {
  try {
    console.log("🌐 Intentando cargar secuencias desde BD...");
    const response = await fetch(`${SERVER_URL}/api/secuencias`, {
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }
    
    const result = await response.json();
    console.log("📦 Respuesta de BD:", result);

    if (result.status === 'ok' && result.secuencias && Array.isArray(result.secuencias)) {
      const secuenciasBD = result.secuencias.map(sec => {
        let movimientos = [];
        if (typeof sec.movimientos === 'string') {
          try {
            movimientos = JSON.parse(sec.movimientos);
          } catch (e) {
            console.warn('⚠️ Error parseando movimientos:', e);
            movimientos = [];
          }
        } else if (Array.isArray(sec.movimientos)) {
          movimientos = sec.movimientos;
        }
        
        return {
          id: sec.id,
          nombre: sec.nombre || 'Sin nombre',
          descripcion: sec.descripcion || '',
          movimientos: movimientos,
          fecha: sec.fecha_creacion ? new Date(sec.fecha_creacion).toLocaleString() : new Date().toLocaleString(),
          duracion: movimientos.length,
          source: 'bd'
        };
      });

      console.log(`✅ ${secuenciasBD.length} secuencias cargadas desde BD`);
      
      secuenciasGuardadas = secuenciasBD;
      actualizarListaSecuenciasGuardadas();
      
      mostrarNotificacion(`${secuenciasBD.length} secuencias cargadas`, "success");
      
    } else {
      console.warn('⚠️ Respuesta inesperada de BD:', result);
      cargarSecuenciasLocales();
    }
    
  } catch (error) {
    console.warn('⚠️ No se pudieron cargar secuencias desde BD:', error.message);
    cargarSecuenciasLocales();
  }
}

function cargarSecuenciasLocales() {
  try {
    const guardadas = localStorage.getItem('secuenciasCarro');
    if (guardadas) {
      const secuencias = JSON.parse(guardadas);
      secuenciasGuardadas = secuencias.map(sec => ({ ...sec, source: 'local' }));
      console.log(`📁 ${secuenciasGuardadas.length} secuencias cargadas desde localStorage`);
      actualizarListaSecuenciasGuardadas();
    }
  } catch (error) {
    console.error('❌ Error cargando secuencias locales:', error);
  }
}

async function guardarSecuencia() {
  if (secuencia.length === 0) {
    mostrarNotificacion('No hay movimientos en la secuencia para guardar', "warning");
    return;
  }

  const nombre = prompt('📝 Nombre para esta secuencia:');
  if (!nombre || nombre.trim() === '') {
    mostrarNotificacion('El nombre no puede estar vacío', "warning");
    return;
  }

  const descripcion = prompt('📋 Descripción de la secuencia (opcional):') || '';

  const btnGuardar = document.getElementById('btn-guardar-secuencia');
  const originalText = btnGuardar ? btnGuardar.innerHTML : '';
  
  try {
    if (btnGuardar) {
      btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
      btnGuardar.disabled = true;
    }

    console.log("💾 Intentando guardar en BD...", { 
      nombre: nombre.trim(), 
      descripcion: descripcion.trim(),
      movimientos: secuencia 
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${SERVER_URL}/api/secuencias`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        movimientos: secuencia
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = `Error HTTP ${response.status}`;
      try {
        const errorResult = await response.json();
        errorMessage = errorResult.mensaje || errorMessage;
      } catch (e) {
        errorMessage = await response.text();
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log("📡 Respuesta del servidor:", result);

    if (result.status === 'ok') {
      const nuevoId = result.secuencia_id;
      
      const nuevaSecuencia = {
        id: nuevoId,
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        movimientos: [...secuencia],
        fecha: new Date().toLocaleString(),
        duracion: secuencia.length,
        source: 'bd'
      };

      console.log("✅ Secuencia creada:", nuevaSecuencia);

      secuenciasGuardadas.unshift(nuevaSecuencia);
      actualizarListaSecuenciasGuardadas();
      
      // Registrar evento de CONTROL
      registrarEventoControl('secuencia', 'secuencia', 'Secuencia Guardada', 
        `Secuencia "${nombre}" guardada en la base de datos`, {
          nombre: nombre,
          movimientos: secuencia.length
        }
      );
      
      if (btnGuardar) {
        btnGuardar.innerHTML = '<i class="fas fa-check"></i> ¡Guardada!';
        btnGuardar.classList.add('saved');
      }
      
      setTimeout(() => {
        if (btnGuardar) {
          btnGuardar.innerHTML = originalText;
          btnGuardar.disabled = false;
          btnGuardar.classList.remove('saved');
        }
      }, 2000);
      
      mostrarNotificacion(`Secuencia "${nombre}" guardada correctamente`, "success");
      
    } else {
      throw new Error(result.mensaje || 'Error del servidor al guardar');
    }
    
  } catch (error) {
    console.error('❌ Error al guardar en BD:', error);
    
    let errorMessage = 'Error desconocido';
    if (error.name === 'AbortError') {
      errorMessage = 'Timeout: El servidor no respondió a tiempo';
    } else if (error.message.includes('Failed to fetch')) {
      errorMessage = 'No se pudo conectar al servidor';
    } else {
      errorMessage = error.message;
    }
    
    guardarSecuenciaLocalmente(nombre, descripcion, btnGuardar, originalText);
  }
}

function guardarSecuenciaLocalmente(nombre, descripcion, btnGuardar, originalText) {
  try {
    const nuevaSecuencia = {
      id: Date.now(),
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      movimientos: [...secuencia],
      fecha: new Date().toLocaleString(),
      duracion: secuencia.length,
      source: 'local'
    };

    secuenciasGuardadas.unshift(nuevaSecuencia);
    guardarEnLocalStorage();
    actualizarListaSecuenciasGuardadas();
    
    // Registrar evento de CONTROL
    registrarEventoControl('secuencia', 'secuencia', 'Secuencia Guardada', 
      `Secuencia "${nombre}" guardada localmente`, {
        nombre: nombre,
        movimientos: secuencia.length
      }
    );
    
    if (btnGuardar) {
      btnGuardar.innerHTML = '<i class="fas fa-check"></i> Guardada (Local)';
      btnGuardar.classList.add('saved');
    }
    
    setTimeout(() => {
      if (btnGuardar) {
        btnGuardar.innerHTML = originalText;
        btnGuardar.disabled = false;
        btnGuardar.classList.remove('saved');
      }
    }, 2000);
    
    mostrarNotificacion('Secuencia guardada localmente (servidor no disponible)', "info");
    
  } catch (localError) {
    console.error('❌ Error guardando localmente:', localError);
    mostrarNotificacion('Error grave: No se pudo guardar la secuencia', "danger");
    
    if (btnGuardar) {
      btnGuardar.innerHTML = originalText;
      btnGuardar.disabled = false;
    }
  }
}

function guardarEnLocalStorage() {
  try {
    const datosParaGuardar = secuenciasGuardadas
      .filter(sec => sec.source === 'local')
      .map(sec => ({
        id: sec.id,
        nombre: sec.nombre,
        descripcion: sec.descripcion,
        movimientos: sec.movimientos,
        fecha: sec.fecha,
        duracion: sec.duracion,
        source: sec.source
      }));
    
    localStorage.setItem('secuenciasCarro', JSON.stringify(datosParaGuardar));
    console.log('💾 Secuencias locales guardadas en localStorage');
  } catch (error) {
    console.error('❌ Error guardando en localStorage:', error);
  }
}

async function eliminarSecuenciaGuardada(id, event) {
  if (event) event.stopPropagation();
  
  const secuenciaEncontrada = secuenciasGuardadas.find(s => s.id === id);
  if (!secuenciaEncontrada) {
    mostrarNotificacion('Secuencia no encontrada', "warning");
    return;
  }
  
  if (!confirm(`¿Eliminar permanentemente la secuencia "${secuenciaEncontrada.nombre}"?`)) {
    return;
  }
  
  try {
    if (secuenciaEncontrada.source === 'bd') {
      console.log(`🗑️ Eliminando secuencia ${id} del servidor...`);
      
      const response = await fetch(`${SERVER_URL}/api/secuencias/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      console.log("📡 Respuesta de eliminación:", result);
      
      if (result.status !== 'ok') {
        throw new Error(result.mensaje || 'Error del servidor al eliminar');
      }
      
      console.log(`✅ Secuencia ${id} eliminada del servidor`);
    }
    
    secuenciasGuardadas = secuenciasGuardadas.filter(s => s.id !== id);
    
    if (secuenciaEncontrada.source === 'local') {
      guardarEnLocalStorage();
    }
    
    actualizarListaSecuenciasGuardadas();
    
    // Registrar evento de CONTROL
    registrarEventoControl('secuencia', 'secuencia', 'Secuencia Eliminada', 
      `Secuencia "${secuenciaEncontrada.nombre}" eliminada`, {
        nombre: secuenciaEncontrada.nombre
      }
    );
    
    console.log(`🗑️ Secuencia eliminada: ${secuenciaEncontrada.nombre}`);
    mostrarNotificacion('Secuencia eliminada correctamente', "success");
    
  } catch (error) {
    console.error('❌ Error eliminando secuencia:', error);
    mostrarNotificacion(`Error al eliminar: ${error.message}`, "danger");
  }
}

function ejecutarSecuenciaGuardada(id) {
  const secuenciaEncontrada = secuenciasGuardadas.find(s => s.id === id);
  
  if (!secuenciaEncontrada) {
    mostrarNotificacion('Secuencia no encontrada', "warning");
    return;
  }
  
  if (secuenciaEncontrada.movimientos.length === 0) {
    mostrarNotificacion('Esta secuencia no tiene movimientos', "warning");
    return;
  }
  
  console.log(`🎯 Ejecutando secuencia guardada: ${secuenciaEncontrada.nombre}`, secuenciaEncontrada.movimientos);
  
  // Registrar evento de CONTROL
  registrarEventoControl('secuencia', 'secuencia', 'Secuencia Guardada Ejecutada', 
    `Iniciando secuencia guardada: ${secuenciaEncontrada.nombre}`, {
      nombre: secuenciaEncontrada.nombre,
      movimientos: secuenciaEncontrada.movimientos.length
    }
  );
  
  const secuenciaActivaInfo = document.getElementById('secuencia-activa-info');
  const progresoSecuencia = document.getElementById('progreso-secuencia');
  
  if (secuenciaActivaInfo) {
    secuenciaActivaInfo.innerHTML = `
      <strong>Ejecutando:</strong> ${secuenciaEncontrada.nombre}<br>
      <small>${secuenciaEncontrada.movimientos.length} movimientos</small>
    `;
  }
  
  if (progresoSecuencia) {
    progresoSecuencia.style.width = '0%';
  }
  
  secuenciaEncontrada.movimientos.forEach((movimiento, index) => {
    setTimeout(() => {
      console.log(`➡️ Movimiento ${index + 1}: ${movimiento}`);
      enviarEventoWS(movimiento);
      
      const progreso = ((index + 1) / secuenciaEncontrada.movimientos.length) * 100;
      if (progresoSecuencia) {
        progresoSecuencia.style.width = `${progreso}%`;
      }
      
      if (index === secuenciaEncontrada.movimientos.length - 1) {
        setTimeout(() => {
          if (secuenciaActivaInfo) {
            secuenciaActivaInfo.innerHTML = '<small>Secuencia completada ✅</small>';
          }
          
          // Registrar evento de completado
          registrarEventoControl('secuencia', 'secuencia', 'Secuencia Guardada Completada', 
            `Secuencia "${secuenciaEncontrada.nombre}" completada`, {
              nombre: secuenciaEncontrada.nombre,
              movimientos: secuenciaEncontrada.movimientos.length
            }
          );
          
          mostrarNotificacion(`Secuencia "${secuenciaEncontrada.nombre}" completada`, "success");
          
          setTimeout(() => {
            if (secuenciaActivaInfo) secuenciaActivaInfo.innerHTML = '';
            if (progresoSecuencia) progresoSecuencia.style.width = '0%';
          }, 2000);
          
        }, 1000);
      }
    }, index * 1500);
  });
}

function actualizarListaSecuenciasGuardadas() {
  const lista = document.getElementById('lista-secuencias-guardadas');
  if (!lista) {
    console.error('❌ No se encontró el elemento lista-secuencias-guardadas');
    return;
  }

  console.log(`🔄 Actualizando lista con ${secuenciasGuardadas.length} secuencias`);

  if (secuenciasGuardadas.length === 0) {
    lista.innerHTML = `
      <div class="empty-sequence">
        <i class="fas fa-inbox fa-lg mb-2"></i>
        <p class="small">No hay secuencias guardadas</p>
        <small class="text-muted">Guarda secuencias para verlas aquí</small>
      </div>
    `;
    return;
  }

  lista.innerHTML = secuenciasGuardadas.map(sec => `
    <div class="saved-sequence-item ${sec.source === 'bd' ? 'from-bd' : 'from-local'}" 
         onclick="ejecutarSecuenciaGuardada(${sec.id})"
         title="Haz clic para ejecutar">
      <div class="sequence-info">
        <strong class="sequence-name">${sec.nombre}</strong>
        ${sec.descripcion ? `<div class="sequence-desc">${sec.descripcion}</div>` : ''}
        <div class="sequence-meta">
          <small>
            <i class="fas fa-list-ol"></i> ${sec.movimientos.length} movimientos • 
            <i class="fas fa-clock"></i> ${sec.fecha}
          </small>
        </div>
        <div class="sequence-preview">
          ${sec.movimientos.slice(0, 4).map(mov => 
            `<span class="movement-tag">${mov}</span>`
          ).join('')}
          ${sec.movimientos.length > 4 ? 
            `<span class="movement-tag">+${sec.movimientos.length - 4}</span>` : ''}
        </div>
      </div>
      <div class="sequence-actions">
        <span class="sequence-source ${sec.source === 'local' ? 'local' : ''}">
          ${sec.source === 'bd' ? '🌐' : '💾'}
        </span>
        <button class="btn-delete-sequence" 
                onclick="eliminarSecuenciaGuardada(${sec.id}, event)"
                title="Eliminar secuencia">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `).join('');

  console.log('✅ Lista de secuencias actualizada');
}

function exportarSecuencias() {
  if (secuenciasGuardadas.length === 0) {
    mostrarNotificacion('No hay secuencias para exportar', "warning");
    return;
  }

  const dataStr = JSON.stringify(secuenciasGuardadas, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(dataBlob);
  link.download = `secuencias-carro-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  
  // Registrar evento de CONTROL
  registrarEventoControl('secuencia', 'secuencia', 'Secuencias Exportadas', 
    `${secuenciasGuardadas.length} secuencias exportadas`, {
      cantidad: secuenciasGuardadas.length
    }
  );
  
  console.log('📤 Secuencias exportadas:', secuenciasGuardadas.length);
  mostrarNotificacion(`${secuenciasGuardadas.length} secuencias exportadas`, "success");
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
          const importedWithNewIds = imported.map(sec => ({
            ...sec,
            id: Date.now() + Math.floor(Math.random() * 1000),
            source: 'local'
          }));
          
          secuenciasGuardadas = [...secuenciasGuardadas, ...importedWithNewIds];
          guardarEnLocalStorage();
          actualizarListaSecuenciasGuardadas();
          
          // Registrar evento de CONTROL
          registrarEventoControl('secuencia', 'secuencia', 'Secuencias Importadas', 
            `${imported.length} secuencias importadas`, {
              cantidad: imported.length
            }
          );
          
          mostrarNotificacion(`${imported.length} secuencias importadas correctamente`, "success");
        } else {
          mostrarNotificacion('Formato de archivo inválido', "danger");
        }
      } catch (err) {
        mostrarNotificacion(`Error al importar: ${err.message}`, "danger");
      }
    };
    reader.readAsText(file);
  };
  
  input.click();
}

// =============================================================
// 🚨 SISTEMA DE OBSTÁCULOS (SOLO EN SU PROPIA SECCIÓN)
// =============================================================
async function cargarObstaculos() {
  try {
    console.log("📥 Cargando obstáculos...");
    
    const btnRefresh = document.querySelector('.btn-refresh-obstacles');
    const listaObstaculos = document.getElementById('listaObstaculos');
    
    if (btnRefresh) btnRefresh.classList.add('loading');
    if (listaObstaculos) listaObstaculos.classList.add('loading-obstacles');

    const response = await fetch(`${SERVER_URL}/api/obstaculos?dispositivo_id=1&limit=10`);
    const result = await response.json();

    const obstacleCount = document.getElementById('obstacle-count');

    if (result.status === 'ok' && result.obstaculos) {
      const obstaculos = result.obstaculos;
      
      console.log(`✅ ${obstaculos.length} obstáculos cargados`);
      
      if (obstacleCount) {
        obstacleCount.textContent = `${obstaculos.length} detectados`;
        obstacleCount.className = obstaculos.length > 5 ? 'badge bg-danger me-2' : 
                                 obstaculos.length > 2 ? 'badge bg-warning me-2' : 
                                 'badge bg-success me-2';
      }

      if (obstaculos.length === 0) {
        listaObstaculos.innerHTML = `
          <div class="text-center text-muted py-4">
            <i class="fas fa-shield-alt fa-2x mb-2"></i>
            <p>No se han detectado obstáculos</p>
            <small class="text-muted">El carro se está moviendo libremente</small>
          </div>
        `;
        return;
      }

      listaObstaculos.innerHTML = obstaculos.map((obs, index) => `
        <div class="obstacle-item ${getObstaclePriority(obs.distancia_cm)} ${index === 0 ? 'new' : ''}">
          <div class="obstacle-header">
            <div class="obstacle-location">
              <i class="fas ${getObstacleIcon(obs.ubicacion)} me-2"></i>
              <strong>${formatUbicacion(obs.ubicacion)}</strong>
            </div>
            <div class="obstacle-distance ${getDistanceColor(obs.distancia_cm)}">
              <i class="fas fa-ruler"></i>
              ${obs.distancia_cm} cm
            </div>
          </div>
          <div class="obstacle-action">
            <small><i class="fas fa-bolt me-1"></i> ${obs.accion_tomada || 'Acción automática'}</small>
          </div>
          <div class="obstacle-time">
            <small class="text-muted">
              <i class="fas fa-clock me-1"></i>
              ${new Date(obs.fecha_deteccion).toLocaleString()}
            </small>
          </div>
        </div>
      `).join('');
      
    } else {
      throw new Error(result.mensaje || 'Error en la respuesta');
    }
  } catch (error) {
    console.error('❌ Error al cargar obstáculos:', error);
    
    const listaObstaculos = document.getElementById('listaObstaculos');
    listaObstaculos.innerHTML = `
      <div class="text-center text-danger py-4">
        <i class="fas fa-exclamation-triangle fa-2x mb-2"></i>
        <p>Error al cargar obstáculos</p>
        <small class="text-muted">${error.message}</small>
      </div>
    `;
  } finally {
    const btnRefresh = document.querySelector('.btn-refresh-obstacles');
    const listaObstaculos = document.getElementById('listaObstaculos');
    
    if (btnRefresh) btnRefresh.classList.remove('loading');
    if (listaObstaculos) listaObstaculos.classList.remove('loading-obstacles');
  }
}

// Funciones auxiliares para obstáculos
function getObstacleIcon(ubicacion) {
  const icons = {
    'frontal': 'fa-arrow-up',
    'lateral_izquierdo': 'fa-arrow-left',
    'lateral_derecho': 'fa-arrow-right',
    'frontal_cercano': 'fa-exclamation-circle',
    'frontal_lejano': 'fa-arrow-up',
    'trasero': 'fa-arrow-down'
  };
  return icons[ubicacion] || 'fa-map-marker-alt';
}

function formatUbicacion(ubicacion) {
  const nombres = {
    'frontal': 'Frontal',
    'lateral_izquierdo': 'Lateral Izquierdo',
    'lateral_derecho': 'Lateral Derecho',
    'frontal_cercano': 'Frontal (Cercano)',
    'frontal_lejano': 'Frontal (Lejano)',
    'trasero': 'Trasero'
  };
  return nombres[ubicacion] || ubicacion;
}

function getDistanceColor(distancia) {
  if (distancia <= 15) return 'text-danger';
  if (distancia <= 25) return 'text-warning';
  return 'text-success';
}

function getObstaclePriority(distancia) {
  if (distancia <= 15) return 'high-priority';
  if (distancia <= 25) return 'medium-priority';
  return 'low-priority';
}

// =============================================================
// 🎚️ VARIADOR DE VELOCIDAD - ACTUALIZADO
// =============================================================
let velocidadTimeout = null;

function inicializarVariadorVelocidad() {
  const speedSlider = document.getElementById('speed-slider');
  const speedValue = document.getElementById('speed-value');
  
  if (speedSlider && speedValue) {
    velocidadActual = 250;
    speedSlider.value = velocidadActual;
    speedValue.textContent = velocidadActual;
    actualizarColorVelocidad(velocidadActual);
    
    speedSlider.addEventListener('input', function() {
      velocidadActual = parseInt(this.value);
      speedValue.textContent = velocidadActual;
      actualizarColorVelocidad(velocidadActual);
      
      clearTimeout(velocidadTimeout);
      velocidadTimeout = setTimeout(() => {
        enviarVelocidadAlCarro();
      }, 100);
    });
    
    console.log("✅ Variador de velocidad inicializado a: " + velocidadActual);
  }
}

function enviarVelocidadAlCarro() {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.warn("⚠️ WebSocket no conectado, velocidad no enviada");
    mostrarNotificacionError("No hay conexión con el servidor");
    return;
  }
  
  const data = {
    comando_velocidad: "ajustar",
    valor: velocidadActual,
    dispositivo_id: 1,
    timestamp: Date.now()
  };
  
  try {
    ws.send(JSON.stringify(data));
    console.log(`📤 Velocidad enviada al carro: ${velocidadActual}`);
    
    // Registrar evento de CONTROL
    registrarEventoControl('velocidad', 'velocidad', 'Ajuste de Velocidad', 
      `Velocidad ajustada a: ${velocidadActual}`, {
        velocidad: velocidadActual
      }
    );
    
    mostrarNotificacionVelocidad(velocidadActual);
  } catch (err) {
    console.error("❌ Error al enviar velocidad:", err);
    mostrarNotificacionError("Error al enviar velocidad");
  }
}

function setSpeed(valor) {
  const speedSlider = document.getElementById('speed-slider');
  const speedValue = document.getElementById('speed-value');
  
  if (speedSlider && speedValue) {
    velocidadActual = Math.max(0, Math.min(250, valor));
    speedSlider.value = velocidadActual;
    speedValue.textContent = velocidadActual;
    actualizarColorVelocidad(velocidadActual);
    enviarVelocidadAlCarro();
    
    console.log(`⚡ Velocidad establecida a: ${velocidadActual}`);
  }
}

function actualizarColorVelocidad(velocidad) {
  const speedValue = document.getElementById('speed-value');
  if (!speedValue) return;
  
  speedValue.classList.remove('bg-success', 'bg-info', 'bg-warning', 'bg-danger', 'bg-secondary');
  
  if (velocidad === 0) {
    speedValue.className = 'badge bg-secondary fs-6';
  } else if (velocidad <= 50) {
    speedValue.className = 'badge bg-success fs-6';
  } else if (velocidad <= 150) {
    speedValue.className = 'badge bg-info fs-6';
  } else if (velocidad <= 200) {
    speedValue.className = 'badge bg-warning fs-6';
  } else {
    speedValue.className = 'badge bg-danger fs-6';
  }
}

function mostrarNotificacionVelocidad(velocidad) {
  let notif = document.getElementById('speed-notification');
  if (!notif) {
    notif = document.createElement('div');
    notif.id = 'speed-notification';
    notif.className = 'speed-notification';
    document.querySelector('.control-panel').appendChild(notif);
  }
  
  let texto = '';
  let icono = 'fas fa-bolt';
  
  if (velocidad === 0) {
    texto = 'Velocidad: 0 (Detenido)';
    icono = 'fas fa-stop';
    notif.className = 'speed-notification speed-stop';
  } else if (velocidad <= 50) {
    texto = 'Velocidad: Lenta';
    icono = 'fas fa-tachometer-alt-slow';
    notif.className = 'speed-notification speed-slow';
  } else if (velocidad <= 150) {
    texto = 'Velocidad: Normal';
    icono = 'fas fa-tachometer-alt';
    notif.className = 'speed-notification speed-normal';
  } else if (velocidad <= 200) {
    texto = 'Velocidad: Rápida';
    icono = 'fas fa-tachometer-alt-fast';
    notif.className = 'speed-notification speed-fast';
  } else {
    texto = 'Velocidad: Máxima';
    icono = 'fas fa-tachometer-alt-max';
    notif.className = 'speed-notification speed-max';
  }
  
  notif.innerHTML = `<i class="${icono} me-2"></i>${texto} (${velocidad})`;
  notif.style.display = 'block';
  notif.style.opacity = '1';
  
  setTimeout(() => {
    if (notif) {
      notif.style.opacity = '0';
      setTimeout(() => {
        if (notif) notif.style.display = 'none';
      }, 500);
    }
  }, 1500);
}

// =============================================================
// 🎮 CONTROL XBOX (SIN CAMBIOS)
// =============================================================
class XboxController {
    constructor() {
        this.connected = false;
        this.gamepadIndex = null;
        this.deadZone = 0.3;
        this.animationFrame = null;
        this.lastStickMovement = null;
        this.init();
    }

    init() {
        window.addEventListener("gamepadconnected", (e) => {
            console.log("🎮 Mando conectado:", e.gamepad);
            this.gamepadIndex = e.gamepad.index;
            this.connected = true;
            this.updateControllerStatus();
            this.startPolling();
        });

        window.addEventListener("gamepaddisconnected", (e) => {
            console.log("🎮 Mando desconectado");
            if (this.gamepadIndex === e.gamepad.index) {
                this.connected = false;
                this.gamepadIndex = null;
                this.updateControllerStatus();
                this.stopPolling();
            }
        });
    }

    startPolling() {
        if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
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
        this.handleStickControls(gamepad.axes);
    }

    handleStickControls(axes) {
        const leftStick = { x: axes[0] || 0, y: axes[1] || 0 };
        
        if (Math.abs(leftStick.x) > this.deadZone || Math.abs(leftStick.y) > this.deadZone) {
            let movimiento = '';
            
            if (Math.abs(leftStick.x) > Math.abs(leftStick.y)) {
                if (leftStick.x > this.deadZone) movimiento = 'Derecha';
                else if (leftStick.x < -this.deadZone) movimiento = 'Izquierda';
            } else {
                if (leftStick.y > this.deadZone) movimiento = 'Atrás';
                else if (leftStick.y < -this.deadZone) movimiento = 'Adelante';
            }

            if (movimiento && movimiento !== this.lastStickMovement) {
                iniciarMovimiento(movimiento);
                this.lastStickMovement = movimiento;
            }
        } else {
            if (this.lastStickMovement) {
                detenerMovimiento();
                this.lastStickMovement = null;
            }
        }
    }

    updateControllerStatus() {
        const statusElement = document.getElementById('controller-status');
        if (!statusElement) return;

        if (this.connected) {
            statusElement.innerHTML = '<i class="fas fa-gamepad me-1 text-success"></i> Mando Conectado';
            statusElement.className = 'navbar-text ms-3 text-success';
        } else {
            statusElement.innerHTML = '<i class="fas fa-gamepad me-1 text-danger"></i> Mando No Conectado';
            statusElement.className = 'navbar-text ms-3 text-danger';
        }
    }
}

// =============================================================
// 🔔 SISTEMA DE NOTIFICACIONES (SIN CAMBIOS)
// =============================================================
function mostrarNotificacion(mensaje, tipo = "info") {
  const tiposClases = {
    "success": "alert-success",
    "info": "alert-info",
    "warning": "alert-warning",
    "danger": "alert-danger"
  };
  
  const alertClass = tiposClases[tipo] || "alert-info";
  
  const notificacion = document.createElement('div');
  notificacion.className = `alert ${alertClass} alert-dismissible fade show position-fixed`;
  notificacion.style.cssText = `
    top: 20px;
    right: 20px;
    z-index: 9999;
    min-width: 300px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  `;
  
  notificacion.innerHTML = `
    <strong>${mensaje}</strong>
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  
  document.body.appendChild(notificacion);
  
  setTimeout(() => {
    if (notificacion.parentNode) {
      notificacion.remove();
    }
  }, 5000);
}

function mostrarNotificacionError(mensaje) {
  mostrarNotificacion(mensaje, "danger");
}

// =============================================================
// 🚀 INICIALIZACIÓN (ACTUALIZADA)
// =============================================================
function inicializarElementosDOM() {
  movimientoActivo = document.getElementById("movimiento-activo");
  
  console.log("✅ Elementos DOM inicializados");
}

window.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Inicializando aplicación...");
  
  inicializarElementosDOM();
  
  // Registrar evento de inicio del SISTEMA (solo una vez)
  registrarEventoControl('sistema', 'sistema', 'Sistema Iniciado', 'Aplicación cargada correctamente');
  
  // Solo conectar WebSocket una vez
  conectarWebSocket();
  
  // Inicializar control Xbox
  const xboxController = new XboxController();
  
  // Cargar datos después de un breve retraso
  setTimeout(() => {
    cargarSecuencias();
    cargarObstaculos();
    actualizarSecuenciaUI();
    inicializarVariadorVelocidad();
  }, 2000);
  
  // Event listeners para botones
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
    
    btn.addEventListener('touchstart', function() {
      this.classList.add('presionado');
    });
    
    btn.addEventListener('touchend', function() {
      this.classList.remove('presionado');
    });
  });
  
  // Atajos de teclado para velocidad
  document.addEventListener('keydown', function(event) {
    const speedSlider = document.getElementById('speed-slider');
    if (!speedSlider) return;
    
    let nuevaVelocidad = velocidadActual;
    
    switch(event.key) {
      case 'ArrowUp':
      case '+':
        nuevaVelocidad = Math.min(250, velocidadActual + 10);
        event.preventDefault();
        break;
        
      case 'ArrowDown':
      case '-':
        nuevaVelocidad = Math.max(0, velocidadActual - 10);
        event.preventDefault();
        break;
        
      case '0':
        nuevaVelocidad = 0;
        break;
        
      case 'm':
      case 'M':
        nuevaVelocidad = 125;
        break;
        
      case ' ':
        nuevaVelocidad = 128;
        event.preventDefault();
        break;
        
      default:
        return;
    }
    
    if (nuevaVelocidad !== velocidadActual) {
      setSpeed(nuevaVelocidad);
    }
  });
  
  console.log("✅ Aplicación inicializada correctamente");
});

// Función de diagnóstico
function debugWebSocket() {
  console.log("=== DEBUG WEBSOCKET ===");
  console.log("Estado:", ws ? ws.readyState : "No inicializado");
  console.log("Estado WebSocket:");
  console.log("  - CONNECTING: 0");
  console.log("  - OPEN: 1");
  console.log("  - CLOSING: 2");
  console.log("  - CLOSED: 3");
  console.log("Estado actual:", ws ? ws.readyState : "No existe");
  console.log("URL:", WS_URL);
  console.log("Reconexión intentos:", reconnectAttempts);
  console.log("Último movimiento:", lastMovimiento);
  console.log("Velocidad actual:", velocidadActual);
  console.log("Total eventos control:", eventoCount);
  
  // Probar conexión HTTP
  fetch(`${SERVER_URL}/api/health`)
    .then(res => console.log("Health check:", res.status))
    .catch(err => console.log("Health check error:", err));
}