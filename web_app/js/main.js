// --- CONFIGURACIÓN ---
const SERVER_URL = "http://98.91.45.27:5000";
const WS_URL = "ws://98.91.45.27:5000/ws";
let ws = null;

// --- ESTADO INICIAL ---
let eventoCount = 0;
let lastMovimiento = "";
let secuencia = [];
let secuenciasGuardadas = [];

// --- ELEMENTOS DOM ---
let movimientoActivo, listaEventos;

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
    setTimeout(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        enviarEventoWS(tipo_evento);
      }
    }, 1000);
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
  } catch (err) {
    console.error("❌ Error al enviar evento por WebSocket:", err);
  }
}

// =============================================================
// 🧩 SISTEMA DE SECUENCIAS - COMPLETO Y FUNCIONAL
// =============================================================

// Agregar movimiento a la secuencia actual
function agregarMovimiento(tipo) {
  secuencia.push(tipo);
  actualizarSecuenciaUI();
  console.log(`➕ Movimiento agregado: ${tipo}. Secuencia:`, secuencia);
}

// Agregar movimiento aleatorio
function agregarMovimientoPersonalizado() {
  const movimientos = [
    "Adelante", "Atrás", "Izquierda", "Derecha", "Demo",
    "Curva Derecha Adelante", "Curva Izquierda Adelante",
    "Curva Izquierda Atrás", "Curva Derecha Atrás"
  ];
  const random = movimientos[Math.floor(Math.random() * movimientos.length)];
  agregarMovimiento(random);
}

// Remover movimiento específico
function removerMovimiento(index) {
  if (index >= 0 && index < secuencia.length) {
    const movimientoEliminado = secuencia[index];
    secuencia.splice(index, 1);
    actualizarSecuenciaUI();
    console.log(`➖ Movimiento eliminado: ${movimientoEliminado}`);
  }
}

// Ejecutar secuencia actual
function ejecutarSecuencia() {
  if (secuencia.length === 0) {
    alert('❌ No hay movimientos en la secuencia');
    return;
  }
  
  console.log(`🎯 Ejecutando secuencia con ${secuencia.length} movimientos:`, secuencia);
  
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
  
  // Ejecutar cada movimiento con delay
  secuencia.forEach((movimiento, index) => {
    setTimeout(() => {
      console.log(`➡️ Ejecutando movimiento ${index + 1}: ${movimiento}`);
      enviarEventoWS(movimiento);
      
      // Actualizar progreso
      const progreso = ((index + 1) / secuencia.length) * 100;
      if (progresoSecuencia) {
        progresoSecuencia.style.width = `${progreso}%`;
      }
      
      // Limpiar al finalizar
      if (index === secuencia.length - 1) {
        setTimeout(() => {
          if (secuenciaActivaInfo) {
            secuenciaActivaInfo.innerHTML = '<small>Secuencia completada ✅</small>';
          }
          
          setTimeout(() => {
            if (secuenciaActivaInfo) secuenciaActivaInfo.innerHTML = '';
            if (progresoSecuencia) progresoSecuencia.style.width = '0%';
          }, 2000);
          
        }, 1000);
      }
    }, index * 1500); // 1.5 segundos entre movimientos
  });
}

// Limpiar secuencia actual
function limpiarSecuencia() {
  if (secuencia.length === 0) {
    alert('ℹ️ La secuencia ya está vacía');
    return;
  }
  
  secuencia = [];
  actualizarSecuenciaUI();
  console.log('🗑️ Secuencia limpiada');
}

// Actualizar interfaz de secuencia actual
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
// 💾 SISTEMA DE SECUENCIAS GUARDADAS - COMPLETAMENTE FUNCIONAL
// =============================================================

// Cargar secuencias al iniciar
async function cargarSecuencias() {
  console.log("🔄 Cargando secuencias...");
  await cargarSecuenciasDesdeBD();
}

// Cargar secuencias desde base de datos
async function cargarSecuenciasDesdeBD() {
  try {
    console.log("🌐 Intentando cargar secuencias desde BD...");
    const response = await fetch(`${SERVER_URL}/api/secuencias`);
    
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }
    
    const result = await response.json();
    console.log("📦 Respuesta de BD:", result);

    if (result.status === 'ok' && result.secuencias && Array.isArray(result.secuencias)) {
      const secuenciasBD = result.secuencias.map(sec => {
        // Parsear movimientos (pueden venir como string JSON)
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
      
    } else {
      console.warn('⚠️ Respuesta inesperada de BD:', result);
      // Cargar desde localStorage como fallback
      cargarSecuenciasLocales();
    }
    
  } catch (error) {
    console.warn('⚠️ No se pudieron cargar secuencias desde BD:', error.message);
    // Cargar desde localStorage como fallback
    cargarSecuenciasLocales();
  }
}

// Cargar secuencias desde localStorage (fallback)
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

// Guardar secuencia actual - VERSIÓN CORREGIDA
async function guardarSecuencia() {
  if (secuencia.length === 0) {
    alert('❌ No hay movimientos en la secuencia para guardar');
    return;
  }

  const nombre = prompt('📝 Nombre para esta secuencia:');
  if (!nombre || nombre.trim() === '') {
    alert('❌ El nombre no puede estar vacío');
    return;
  }

  const descripcion = prompt('📋 Descripción de la secuencia (opcional):') || '';

  const btnGuardar = document.getElementById('btn-guardar-secuencia');
  const originalText = btnGuardar ? btnGuardar.innerHTML : '';
  
  try {
    // Mostrar estado de guardado
    if (btnGuardar) {
      btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
      btnGuardar.disabled = true;
    }

    console.log("💾 Intentando guardar en BD...", { 
      nombre: nombre.trim(), 
      descripcion: descripcion.trim(),
      movimientos: secuencia 
    });

    // Guardar en la base de datos con timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout

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
        // Si no se puede parsear la respuesta de error
        errorMessage = await response.text();
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log("📡 Respuesta del servidor:", result);

    if (result.status === 'ok') {
      // Éxito - proceder como antes
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
      
      alert(`✅ Secuencia "${nombre}" guardada correctamente`);
      
    } else {
      throw new Error(result.mensaje || 'Error del servidor al guardar');
    }
    
  } catch (error) {
    console.error('❌ Error al guardar en BD:', error);
    
    // Mejor mensaje de error
    let errorMessage = 'Error desconocido';
    if (error.name === 'AbortError') {
      errorMessage = 'Timeout: El servidor no respondió a tiempo';
    } else if (error.message.includes('Failed to fetch')) {
      errorMessage = 'No se pudo conectar al servidor';
    } else {
      errorMessage = error.message;
    }
    
    alert(`❌ Error al guardar: ${errorMessage}`);
    
    // Restaurar botón
    if (btnGuardar) {
      btnGuardar.innerHTML = originalText;
      btnGuardar.disabled = false;
    }
  }
}

// Guardar secuencia localmente (fallback)
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
    
    alert('✅ Secuencia guardada localmente (servidor no disponible)');
    
  } catch (localError) {
    console.error('❌ Error guardando localmente:', localError);
    alert('❌ Error grave: No se pudo guardar la secuencia');
    
    if (btnGuardar) {
      btnGuardar.innerHTML = originalText;
      btnGuardar.disabled = false;
    }
  }
}

// Guardar en localStorage
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

// Eliminar secuencia guardada - VERSIÓN CORREGIDA
async function eliminarSecuenciaGuardada(id, event) {
  if (event) event.stopPropagation();
  
  const secuenciaEncontrada = secuenciasGuardadas.find(s => s.id === id);
  if (!secuenciaEncontrada) {
    alert('❌ Secuencia no encontrada');
    return;
  }
  
  if (!confirm(`¿Eliminar permanentemente la secuencia "${secuenciaEncontrada.nombre}"?`)) {
    return;
  }
  
  try {
    // Si es de BD, eliminar del servidor
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
    
    // Eliminar de la lista local
    secuenciasGuardadas = secuenciasGuardadas.filter(s => s.id !== id);
    
    // Si era local, actualizar localStorage
    if (secuenciaEncontrada.source === 'local') {
      guardarEnLocalStorage();
    }
    
    actualizarListaSecuenciasGuardadas();
    
    console.log(`🗑️ Secuencia eliminada: ${secuenciaEncontrada.nombre}`);
    alert('✅ Secuencia eliminada correctamente');
    
  } catch (error) {
    console.error('❌ Error eliminando secuencia:', error);
    alert(`❌ Error al eliminar: ${error.message}`);
  }
}

// Ejecutar secuencia guardada
function ejecutarSecuenciaGuardada(id) {
  const secuenciaEncontrada = secuenciasGuardadas.find(s => s.id === id);
  
  if (!secuenciaEncontrada) {
    alert('❌ Secuencia no encontrada');
    return;
  }
  
  if (secuenciaEncontrada.movimientos.length === 0) {
    alert('❌ Esta secuencia no tiene movimientos');
    return;
  }
  
  console.log(`🎯 Ejecutando secuencia guardada: ${secuenciaEncontrada.nombre}`, secuenciaEncontrada.movimientos);
  
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
  
  // Ejecutar cada movimiento
  secuenciaEncontrada.movimientos.forEach((movimiento, index) => {
    setTimeout(() => {
      console.log(`➡️ Movimiento ${index + 1}: ${movimiento}`);
      enviarEventoWS(movimiento);
      
      // Actualizar progreso
      const progreso = ((index + 1) / secuenciaEncontrada.movimientos.length) * 100;
      if (progresoSecuencia) {
        progresoSecuencia.style.width = `${progreso}%`;
      }
      
      // Limpiar al finalizar
      if (index === secuenciaEncontrada.movimientos.length - 1) {
        setTimeout(() => {
          if (secuenciaActivaInfo) {
            secuenciaActivaInfo.innerHTML = '<small>Secuencia completada ✅</small>';
          }
          
          setTimeout(() => {
            if (secuenciaActivaInfo) secuenciaActivaInfo.innerHTML = '';
            if (progresoSecuencia) progresoSecuencia.style.width = '0%';
          }, 2000);
          
        }, 1000);
      }
    }, index * 1500);
  });
}

// Actualizar lista de secuencias guardadas
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
  
  console.log('📤 Secuencias exportadas:', secuenciasGuardadas.length);
  alert(`✅ ${secuenciasGuardadas.length} secuencias exportadas`);
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
          // Asignar nuevos IDs para evitar conflictos
          const importedWithNewIds = imported.map(sec => ({
            ...sec,
            id: Date.now() + Math.floor(Math.random() * 1000),
            source: 'local'
          }));
          
          secuenciasGuardadas = [...secuenciasGuardadas, ...importedWithNewIds];
          guardarEnLocalStorage();
          actualizarListaSecuenciasGuardadas();
          alert(`✅ ${imported.length} secuencias importadas correctamente`);
        } else {
          alert('❌ Formato de archivo inválido');
        }
      } catch (err) {
        alert('❌ Error al importar el archivo: ' + err.message);
      }
    };
    reader.readAsText(file);
  };
  
  input.click();
}

// =============================================================
// 🚨 SISTEMA DE OBSTÁCULOS
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
      
      // Actualizar contador
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

      // Mostrar obstáculos
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
// 🧠 ACTUALIZAR INTERFAZ - CORREGIDO PARA EVITAR DUPLICADOS
// =============================================================
function actualizarEstado(evento) {
  // Verificar si ya existe un evento idéntico reciente para evitar duplicados
  const eventosExistentes = document.querySelectorAll('.event-item');
  const eventoReciente = Array.from(eventosExistentes).find(item => 
    item.textContent.includes(evento.tipo_evento) && 
    item.textContent.includes(evento.detalle)
  );
  
  if (eventoReciente) {
    console.log('⚠️ Evento duplicado detectado, ignorando...');
    return;
  }

  eventoCount++;
  
  const eventCountBadge = document.getElementById('event-count-badge');
  if (eventCountBadge) eventCountBadge.innerText = eventoCount;

  if (listaEventos) {
    const div = document.createElement("div");
    div.classList.add("event-item");
    div.innerHTML = `
      <div class="event-time">${new Date().toLocaleTimeString()}</div>
      <strong>${evento.tipo_evento}</strong>: ${evento.detalle}
    `;
    
    // Mantener máximo 50 eventos
    if (listaEventos.children.length > 50) {
      listaEventos.removeChild(listaEventos.lastChild);
    }
    
    listaEventos.prepend(div);
  }
}

// =============================================================
// 🌐 CONEXIÓN WEBSOCKET - CORREGIDA
// =============================================================
function conectarWebSocket() {
  console.log("🔌 Conectando al WebSocket...");
  
  try {
    // Cerrar conexión existente si hay una
    if (ws) {
      ws.close();
    }

    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log("✅ Conectado al WebSocket!");
      const connectionStatus = document.getElementById("connection-status");
      if (connectionStatus) {
        connectionStatus.innerHTML = '<i class="fas fa-signal me-1 text-success"></i> Conectado';
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("📥 Mensaje WebSocket recibido:", data);
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
      
      // Reconectar después de 3 segundos
      setTimeout(conectarWebSocket, 3000);
    };

    ws.onerror = (error) => {
      console.error("⚠️ Error en WebSocket:", error);
    };
  } catch (error) {
    console.error("❌ Error al crear WebSocket:", error);
  }
}

// =============================================================
// 🚀 INICIALIZACIÓN
// =============================================================
function inicializarElementosDOM() {
  movimientoActivo = document.getElementById("movimiento-activo");
  listaEventos = document.getElementById("listaEventos");
  
  console.log("✅ Elementos DOM inicializados");
}

window.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Inicializando aplicación...");
  
  inicializarElementosDOM();
  conectarWebSocket();
  cargarSecuencias();
  cargarObstaculos();
  actualizarSecuenciaUI();
  
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
  
  console.log("✅ Aplicación inicializada correctamente");
});

// =============================================================
// 🎮 CONTROL XBOX (simplificado)
// =============================================================
class XboxController {
    constructor() {
        this.connected = false;
        this.gamepadIndex = null;
        this.deadZone = 0.3;
        this.animationFrame = null;
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

            if (movimiento) {
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

// Inicializar control Xbox
let xboxController = new XboxController();

// Función de diagnóstico
function debugSecuencias() {
  console.log("=== DEBUG SECUENCIAS ===");
  console.log("Secuencia actual:", secuencia);
  console.log("Secuencias guardadas:", secuenciasGuardadas);
  console.log("URL del servidor:", SERVER_URL);
}