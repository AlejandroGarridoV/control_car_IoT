from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sock import Sock
from datetime import datetime
from db import get_connection
from mysql.connector import Error
import json

# --- CONFIGURACIÓN BÁSICA ---
app = Flask(__name__)
CORS(app)
sock = Sock(app)

# Lista de clientes conectados vía WebSocket
clientes_ws = set()

# ==============================================================
# 📡 ENDPOINTS HTTP: Guardan datos y notifican a clientes WebSocket
# ==============================================================

@app.route("/api/evento", methods=["POST", "GET"])
def evento():
    conn = get_connection()
    if conn is None:
        return jsonify({"status": "error", "message": "Error de conexión a la BD"}), 500

    cursor = conn.cursor(dictionary=True)

    # --- Registrar evento ---
    if request.method == "POST":
        data = request.get_json(force=True)
        try:
            cursor.execute("""
                INSERT INTO eventos (id_dispositivo, tipo_evento, detalle, fecha_hora)
                VALUES (%s, %s, %s, NOW())
            """, (data["id_dispositivo"], data["tipo_evento"], data["detalle"]))
            conn.commit()

            evento_info = {
                "id_dispositivo": data["id_dispositivo"],
                "tipo_evento": data["tipo_evento"],
                "detalle": data["detalle"],
                "fecha_hora": datetime.now().isoformat()
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

    # --- Obtener último evento ---
    elif request.method == "GET":
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
# 🚀 INICIO DEL SERVIDOR
# ==============================================================

if __name__ == '__main__':
    print("🚀 Servidor Flask-WebSocket corriendo en http://0.0.0.0:5000")
    app.run(host="0.0.0.0", port=5000, debug=True)
