# app.py
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from datetime import datetime
from db import get_connection
from mysql.connector import Error

# --- CONFIGURACIÓN BÁSICA ---
app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')


# ------------------- ENDPOINTS -------------------

# Registrar evento o consultar último evento
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
            cursor.callproc("sp_registrar_evento", [
                data.get("id_dispositivo"),
                data.get("tipo_evento"),
                data.get("detalle")
            ])
            conn.commit()

            id_evento = None
            for result in cursor.stored_results():
                id_evento = result.fetchone()[0]

            evento_info = {
                "id_evento": id_evento,
                "id_dispositivo": data.get("id_dispositivo"),
                "tipo_evento": data.get("tipo_evento"),
                "detalle": data.get("detalle"),
                "timestamp": datetime.now().isoformat()
            }

            socketio.emit('nuevo_evento', evento_info)
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


# Registrar obstáculo o consultar último obstáculo
@app.route('/api/obstaculo', methods=['POST', 'GET'])
def obstaculo():
    conn = get_connection()
    if conn is None:
        return jsonify({"status": "error", "message": "Error de conexión a la BD"}), 500

    cursor = conn.cursor(dictionary=True)

    if request.method == 'POST':
        data = request.get_json(force=True)
        try:
            cursor.callproc("sp_registrar_obstaculo", [
                data.get("id_dispositivo"),
                data.get("descripcion")
            ])
            conn.commit()

            id_obstaculo = None
            for result in cursor.stored_results():
                id_obstaculo = result.fetchone()[0]

            obstaculo_info = {
                "id_obstaculo": id_obstaculo,
                "id_dispositivo": data.get("id_dispositivo"),
                "descripcion": data.get("descripcion"),
                "timestamp": datetime.now().isoformat()
            }

            socketio.emit('nuevo_obstaculo', obstaculo_info)
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


# Registrar secuencia o consultar última secuencia
@app.route('/api/secuencia', methods=['POST', 'GET'])
def secuencia():
    conn = get_connection()
    if conn is None:
        return jsonify({"status": "error", "message": "Error de conexión a la BD"}), 500

    cursor = conn.cursor(dictionary=True)

    if request.method == 'POST':
        data = request.get_json(force=True)
        try:
            cursor.callproc("sp_registrar_secuencia", [
                data.get("id_dispositivo"),
                data.get("accion")
            ])
            conn.commit()

            id_secuencia = None
            for result in cursor.stored_results():
                id_secuencia = result.fetchone()[0]

            secuencia_info = {
                "id_secuencia": id_secuencia,
                "id_dispositivo": data.get("id_dispositivo"),
                "accion": data.get("accion"),
                "timestamp": datetime.now().isoformat()
            }

            socketio.emit('nueva_secuencia', secuencia_info)
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
    emit("ack", {"status": "ok", "mensaje": "Evento recibido por el servidor"})


@socketio.on('nuevo_obstaculo')
def manejar_obstaculo_socket(data):
    print(f"📨 Obstáculo recibido desde cliente: {data}")
    socketio.emit('nuevo_obstaculo', data)


@socketio.on('nueva_secuencia')
def manejar_secuencia_socket(data):
    print(f"📨 Secuencia recibida desde cliente: {data}")
    socketio.emit('nueva_secuencia', data)


# ------------------- RUN SERVER -------------------
if __name__ == '__main__':
    print("🚀 Servidor Flask-SocketIO corriendo en http://0.0.0.0:5000")
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)

