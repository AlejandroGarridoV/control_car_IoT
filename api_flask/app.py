from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from flask_sock import Sock
from datetime import datetime
from db import get_connection
from mysql.connector import Error
import json

# --- CONFIGURACIÓN BÁSICA ---
app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')
sock = Sock(app)  # WebSocket puro
CORS(app, resources={r"/*": {"origins": "*"}})

# --- CLIENTES WEBSOCKET PUROS ---
ws_clients = []

# ------------------- ENDPOINTS -------------------

# 📦 Registrar evento o consultar último evento
@app.route('/api/evento', methods=['POST', 'GET'])
def evento():
    conn = get_connection()
    if conn is None:
        return jsonify({"status": "error", "message": "Error de conexión a la BD"}), 500

    cursor = conn.cursor(dictionary=True)

    # --- Registrar evento (POST) ---
    if request.method == 'POST':
        data = request.get_json(force=True)
        try:
            cursor.execute("""
                INSERT INTO eventos (id_dispositivo, tipo_evento, detalle, fecha_hora)
                VALUES (%s, %s, %s, NOW())
            """, (data.get("id_dispositivo"), data.get("tipo_evento"), data.get("detalle")))
            conn.commit()

            evento_info = {
                "id_dispositivo": data.get("id_dispositivo"),
                "tipo_evento": data.get("tipo_evento"),
                "detalle": data.get("detalle"),
                "fecha_hora": datetime.now().isoformat()
            }

            # Emitir por SocketIO
            socketio.emit('nuevo_evento', evento_info)
            # Emitir también por WebSocket puro
            enviar_a_ws_clientes({"evento": evento_info})

            return jsonify({"status": "ok", "mensaje": "Evento registrado", "evento": evento_info})
        except Error as e:
            return jsonify({"status": "error", "mensaje": str(e)}), 500
        finally:
            cursor.close()
            conn.close()

    # --- Consultar último evento (GET) ---
    elif request.method == 'GET':
        try:
            cursor.execute("SELECT * FROM eventos ORDER BY id_evento DESC LIMIT 1")
            evento = cursor.fetchone()
            if evento:
                return jsonify({"status": "ok", "evento": evento})
            else:
                return jsonify({"status": "vacio", "mensaje": "No hay eventos registrados"})
        except Error as e:
            return jsonify({"status": "error", "mensaje": str(e)}), 500
        finally:
            cursor.close()
            conn.close()


# 🚧 Registrar obstáculo o consultar último obstáculo
@app.route('/api/obstaculo', methods=['POST', 'GET'])
def obstaculo():
    conn = get_connection()
    if conn is None:
        return jsonify({"status": "error", "message": "Error de conexión a la BD"}), 500

    cursor = conn.cursor(dictionary=True)

    if request.method == 'POST':
        data = request.get_json(force=True)
        try:
            cursor.execute("""
                INSERT INTO obstaculos (id_dispositivo, descripcion, fecha_hora)
                VALUES (%s, %s, NOW())
            """, (data.get("id_dispositivo"), data.get("descripcion")))
            conn.commit()

            obstaculo_info = {
                "id_dispositivo": data.get("id_dispositivo"),
                "descripcion": data.get("descripcion"),
                "fecha_hora": datetime.now().isoformat()
            }

            socketio.emit('nuevo_obstaculo', obstaculo_info)
            enviar_a_ws_clientes({"obstaculo": obstaculo_info})

            return jsonify({"status": "ok", "mensaje": "Obstáculo registrado", "obstaculo": obstaculo_info})
        except Error as e:
            return jsonify({"status": "error", "mensaje": str(e)}), 500
        finally:
            cursor.close()
            conn.close()

    elif request.method == 'GET':
        try:
            cursor.execute("SELECT * FROM obstaculos ORDER BY id_obstaculo DESC LIMIT 1")
            obstaculo = cursor.fetchone()
            if obstaculo:
                return jsonify({"status": "ok", "obstaculo": obstaculo})
            else:
                return jsonify({"status": "vacio", "mensaje": "No hay obstáculos registrados"})
        except Error as e:
            return jsonify({"status": "error", "mensaje": str(e)}), 500
        finally:
            cursor.close()
            conn.close()


# 🔁 Registrar secuencia o consultar última secuencia
@app.route('/api/secuencia', methods=['POST', 'GET'])
def secuencia():
    conn = get_connection()
    if conn is None:
        return jsonify({"status": "error", "message": "Error de conexión a la BD"}), 500

    cursor = conn.cursor(dictionary=True)

    if request.method == 'POST':
        data = request.get_json(force=True)
        try:
            cursor.execute("""
                INSERT INTO secuencias (id_dispositivo, accion, fecha_hora)
                VALUES (%s, %s, NOW())
            """, (data.get("id_dispositivo"), data.get("accion")))
            conn.commit()

            secuencia_info = {
                "id_dispositivo": data.get("id_dispositivo"),
                "accion": data.get("accion"),
                "fecha_hora": datetime.now().isoformat()
            }

            socketio.emit('nueva_secuencia', secuencia_info)
            enviar_a_ws_clientes({"secuencia": secuencia_info})

            return jsonify({"status": "ok", "mensaje": "Secuencia registrada", "secuencia": secuencia_info})
        except Error as e:
            return jsonify({"status": "error", "mensaje": str(e)}), 500
        finally:
            cursor.close()
            conn.close()

    elif request.method == 'GET':
        try:
            cursor.execute("SELECT * FROM secuencias ORDER BY id_secuencia DESC LIMIT 1")
            secuencia = cursor.fetchone()
            if secuencia:
                return jsonify({"status": "ok", "secuencia": secuencia})
            else:
                return jsonify({"status": "vacio", "mensaje": "No hay secuencias registradas"})
        except Error as e:
            return jsonify({"status": "error", "mensaje": str(e)}), 500
        finally:
            cursor.close()
            conn.close()


# ------------------- SOCKETIO -------------------

@socketio.on('connect')
def handle_connect():
    print("🔌 Cliente conectado vía SocketIO")
    emit('conexion_exitosa', {'mensaje': 'Conectado al servidor Flask'})


@socketio.on('disconnect')
def handle_disconnect():
    print("❌ Cliente desconectado de SocketIO")


@socketio.on('nuevo_evento')
def manejar_evento_socket(data):
    print(f"📨 Evento recibido desde cliente: {data}")
    socketio.emit('nuevo_evento', data)
    enviar_a_ws_clientes({"evento": data})


@socketio.on('nuevo_obstaculo')
def manejar_obstaculo_socket(data):
    print(f"📨 Obstáculo recibido desde cliente: {data}")
    socketio.emit('nuevo_obstaculo', data)
    enviar_a_ws_clientes({"obstaculo": data})


@socketio.on('nueva_secuencia')
def manejar_secuencia_socket(data):
    print(f"📨 Secuencia recibida desde cliente: {data}")
    socketio.emit('nueva_secuencia', data)
    enviar_a_ws_clientes({"secuencia": data})


# ------------------- WEBSOCKET PURO -------------------

@sock.route('/ws')
def ws_endpoint(ws):
    """Canal WebSocket estándar compatible con ESP8266."""
    print("🌐 Cliente WebSocket conectado")
    ws_clients.append(ws)
    try:
        while True:
            msg = ws.receive()
            if msg:
                print(f"📩 Mensaje desde ESP8266: {msg}")
    except Exception as e:
        print("❌ Cliente WebSocket desconectado", e)
    finally:
        ws_clients.remove(ws)


def enviar_a_ws_clientes(data):
    """Envia datos en JSON a todos los clientes WebSocket conectados."""
    json_data = json.dumps(data)
    for client in list(ws_clients):
        try:
            client.send(json_data)
        except Exception:
            ws_clients.remove(client)

# ------------------- RUN SERVER -------------------
if __name__ == '__main__':
    print("🚀 Servidor Flask con SocketIO + WS en http://0.0.0.0:5000")
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
