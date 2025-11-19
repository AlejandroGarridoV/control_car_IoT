from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sock import Sock
from datetime import datetime
from mysql.connector import Error
import json
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# --- CONFIGURACIÓN BÁSICA ---
app = Flask(__name__)
CORS(app)
sock = Sock(app)

# Lista de clientes conectados vía WebSocket
clientes_ws = set()

# Mapeo de comandos a códigos de control
COMANDOS_A_CODIGOS = {
    'Adelante': 10,
    'Atrás': 20,
    'Izquierda': 30,
    'Derecha': 40,
    'Detenerse': 45,
    'Curva Derecha Adelante': 50,
    'Curva Izquierda Adelante': 51,
    'Curva Izquierda Atrás': 52,
    'Curva Derecha Atrás': 53,
    'Demo': 80,
    'Evadir Obstáculo': 81,
    'Secuencia Personalizada': 82
}

# --- CONEXIÓN A BASE DE DATOS ---
def get_connection():
    """Establece conexión con la base de datos MySQL"""
    try:
        connection = mysql.connector.connect(
            host=os.getenv("DB_HOST", "localhost"),
            user=os.getenv("DB_USER", "root"),
            password=os.getenv("DB_PASS", ""),
            database=os.getenv("DB_NAME", "carro_iot"),
            port=int(os.getenv("DB_PORT", 3306))
        )
        if connection.is_connected():
            return connection
    except Error as e:
        print(f"❌ Error conectando a MySQL: {e}")
        return None

# ==============================================================
# 📡 ENDPOINTS HTTP: Usan Stored Procedures REALES
# ==============================================================

@app.route("/api/evento", methods=["POST", "GET"])
def evento():
    conn = get_connection()
    if conn is None:
        return jsonify({"status": "error", "message": "Error de conexión a la BD"}), 500

    cursor = conn.cursor(dictionary=True)

    # --- Registrar evento usando SP REAL ---
    if request.method == "POST":
        data = request.get_json(force=True)
        try:
            # Convertir comando a código de control
            comando = data.get("tipo_evento", "")
            codigo_control = COMANDOS_A_CODIGOS.get(comando, 45)
            
            # Llamar al stored procedure REAL
            cursor.callproc('sp_registrar_evento', [
                data.get("id_dispositivo", 1),
                codigo_control,
                data.get("tipo_evento", "movimiento"),
                data.get("detalle", ""),
                json.dumps(data.get("datos_adicionales", {}))
            ])
            
            # Obtener resultado del SP
            for result in cursor.stored_results():
                sp_result = result.fetchone()
                evento_id = sp_result['evento_id'] if sp_result else None
            
            conn.commit()

            evento_info = {
                "id_dispositivo": data.get("id_dispositivo", 1),
                "tipo_evento": data.get("tipo_evento", ""),
                "codigo_control": codigo_control,
                "detalle": data.get("detalle", ""),
                "fecha_hora": datetime.now().isoformat(),
                "evento_id": evento_id
            }

            # Enviar evento a todos los clientes WebSocket conectados
            for ws in list(clientes_ws):
                try:
                    ws.send(json.dumps(evento_info))
                except Exception:
                    clientes_ws.discard(ws)

            return jsonify({"status": "ok", "mensaje": "Evento registrado", "evento": evento_info})

        except Error as e:
            return jsonify({"status": "error", "mensaje": str(e)}), 500
        finally:
            cursor.close()
            conn.close()

    # --- Obtener eventos recientes usando SP REAL ---
    elif request.method == "GET":
        try:
            dispositivo_id = request.args.get('dispositivo_id', 1, type=int)
            limit = request.args.get('limit', 10, type=int)
            
            # Llamar al stored procedure REAL
            cursor.callproc('sp_obtener_eventos_recientes', [dispositivo_id, limit])
            
            eventos = []
            for result in cursor.stored_results():
                eventos = result.fetchall()
            
            return jsonify({"status": "ok", "eventos": eventos})
            
        except Error as e:
            return jsonify({"status": "error", "mensaje": str(e)}), 500
        finally:
            cursor.close()
            conn.close()

@app.route("/api/secuencias", methods=["POST", "GET"])
def secuencias():
    conn = get_connection()
    if conn is None:
        return jsonify({"status": "error", "message": "Error de conexión a la BD"}), 500

    cursor = conn.cursor(dictionary=True)

    # --- Guardar secuencia usando SP REAL ---
    if request.method == "POST":
        data = request.get_json(force=True)
        try:
            # Llamar al stored procedure REAL
            cursor.callproc('sp_guardar_secuencia', [
                data.get("nombre", ""),
                data.get("descripcion", ""),
                data.get("dispositivo_id", 1),
                json.dumps(data.get("movimientos", []))
            ])
            
            # Obtener resultado del SP
            for result in cursor.stored_results():
                sp_result = result.fetchone()
                secuencia_id = sp_result['secuencia_id'] if sp_result else None
            
            conn.commit()
            return jsonify({"status": "ok", "mensaje": "Secuencia guardada", "secuencia_id": secuencia_id})

        except Error as e:
            return jsonify({"status": "error", "mensaje": str(e)}), 500
        finally:
            cursor.close()
            conn.close()

    # --- Listar secuencias usando SP REAL ---
    elif request.method == "GET":
        try:
            dispositivo_id = request.args.get('dispositivo_id', 1, type=int)
            
            # Llamar al stored procedure REAL
            cursor.callproc('sp_listar_secuencias', [dispositivo_id])
            
            secuencias = []
            for result in cursor.stored_results():
                secuencias = result.fetchall()
            
            return jsonify({"status": "ok", "secuencias": secuencias})
            
        except Error as e:
            return jsonify({"status": "error", "mensaje": str(e)}), 500
        finally:
            cursor.close()
            conn.close()

@app.route("/api/obstaculos", methods=["POST", "GET"])
def obstaculos():
    conn = get_connection()
    if conn is None:
        return jsonify({"status": "error", "message": "Error de conexión a la BD"}), 500

    cursor = conn.cursor(dictionary=True)

    # --- Registrar obstáculo usando SP REAL ---
    if request.method == "POST":
        data = request.get_json(force=True)
        try:
            # Llamar al stored procedure REAL
            cursor.callproc('sp_registrar_obstaculo', [
                data.get("dispositivo_id", 1),
                data.get("codigo_obstaculo", 1),
                data.get("distancia_cm", 0),
                data.get("ubicacion", ""),
                data.get("accion_tomada", "")
            ])
            
            # Obtener resultado del SP
            for result in cursor.stored_results():
                sp_result = result.fetchone()
                obstaculo_id = sp_result['obstaculo_id'] if sp_result else None
            
            conn.commit()
            return jsonify({"status": "ok", "mensaje": "Obstáculo registrado", "obstaculo_id": obstaculo_id})

        except Error as e:
            return jsonify({"status": "error", "mensaje": str(e)}), 500
        finally:
            cursor.close()
            conn.close()

    # --- Obtener obstáculos recientes usando SP REAL ---
    elif request.method == "GET":
        try:
            dispositivo_id = request.args.get('dispositivo_id', 1, type=int)
            limit = request.args.get('limit', 10, type=int)
            
            # Llamar al stored procedure REAL
            cursor.callproc('sp_obtener_obstaculos_recientes', [dispositivo_id, limit])
            
            obstaculos = []
            for result in cursor.stored_results():
                obstaculos = result.fetchall()
            
            return jsonify({"status": "ok", "obstaculos": obstaculos})
            
        except Error as e:
            return jsonify({"status": "error", "mensaje": str(e)}), 500
        finally:
            cursor.close()
            conn.close()

@app.route("/api/estatus", methods=["GET"])
def estatus():
    conn = get_connection()
    if conn is None:
        return jsonify({"status": "error", "message": "Error de conexión a la BD"}), 500

    cursor = conn.cursor(dictionary=True)

    try:
        dispositivo_id = request.args.get('dispositivo_id', 1, type=int)
        
        # Llamar al stored procedure REAL
        cursor.callproc('sp_obtener_estatus_actual', [dispositivo_id])
        
        estatus_data = None
        for result in cursor.stored_results():
            estatus_data = result.fetchone()
        
        if estatus_data:
            return jsonify({"status": "ok", "estatus": estatus_data})
        else:
            return jsonify({"status": "vacio", "mensaje": "No hay estatus disponible"})
            
    except Error as e:
        return jsonify({"status": "error", "mensaje": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route("/api/controles", methods=["GET"])
def controles():
    conn = get_connection()
    if conn is None:
        return jsonify({"status": "error", "message": "Error de conexión a la BD"}), 500

    cursor = conn.cursor(dictionary=True)

    try:
        # Llamar al stored procedure REAL
        cursor.callproc('sp_obtener_controles_activos')
        
        controles = []
        for result in cursor.stored_results():
            controles = result.fetchall()
        
        return jsonify({"status": "ok", "controles": controles})
            
    except Error as e:
        return jsonify({"status": "error", "mensaje": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route("/api/health", methods=["GET"])
def health():
    """Endpoint de salud del servidor"""
    return jsonify({
        "status": "ok", 
        "message": "Servidor funcionando correctamente",
        "timestamp": datetime.now().isoformat(),
        "websocket_clients": len(clientes_ws)
    })

# ==============================================================
# 🌐 ENDPOINT WEBSOCKET PURO
# ==============================================================

@sock.route('/ws')
def websocket(ws):
    print("🔌 Cliente conectado al WebSocket")
    clientes_ws.add(ws)
    try:
        while True:
            data = ws.receive()
            if data is None:
                break
            print("📨 Mensaje recibido desde un cliente:", data)
    except Exception as e:
        print("⚠️ Error WebSocket:", e)
    finally:
        clientes_ws.discard(ws)
        print("❌ Cliente desconectado del WebSocket")

# ==============================================================
# 🚀 INICIALIZACIÓN Y EJECUCIÓN
# ==============================================================

if __name__ == '__main__':
    print("🚀 Servidor Flask-WebSocket corriendo en http://0.0.0.0:5000")
    print("📊 Endpoints disponibles:")
    print("   GET  /api/health     - Estado del servidor")
    print("   POST /api/evento     - Registrar evento")
    print("   GET  /api/evento     - Obtener eventos recientes")
    print("   POST /api/secuencias - Guardar secuencia")
    print("   GET  /api/secuencias - Listar secuencias")
    print("   POST /api/obstaculos - Registrar obstáculo")
    print("   GET  /api/obstaculos - Obtener obstáculos")
    print("   GET  /api/estatus    - Obtener estatus actual")
    print("   GET  /api/controles  - Obtener controles activos")
    print("   WS   /ws             - WebSocket para tiempo real")
    
    app.run(host="0.0.0.0", port=5000, debug=True)