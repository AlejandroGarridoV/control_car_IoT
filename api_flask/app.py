from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
from db import get_connection
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Permitir acceso desde la app web

# =========================
# ENDPOINTS DE LA API
# =========================

@app.route('/')
def home():
    """Endpoint de bienvenida"""
    return jsonify({
        "message": "🚀 API del Carro IoT STM32 - Conectado a AWS RDS",
        "status": "active",
        "database": "AWS RDS MySQL",
        "timestamp": datetime.now().isoformat(),
        "endpoints": {
            "home": "GET /",
            "health": "GET /api/health",
            "registrar_dispositivo": "POST /api/dispositivo",
            "registrar_evento": "POST /api/evento", 
            "registrar_obstaculo": "POST /api/obstaculo",
            "obtener_estado": "GET /api/estado/<id_dispositivo>",
            "obtener_eventos": "GET /api/eventos/<id_dispositivo>",
            "obtener_obstaculos": "GET /api/obstaculos/<id_dispositivo>",
            "ejecutar_secuencia": "POST /api/secuencia"
        }
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    """Verificar estado de la API y conexión a BD"""
    try:
        conn = get_connection()
        db_status = conn.is_connected() if conn else False
        if conn:
            conn.close()
        return jsonify({
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "database": "connected" if db_status else "disconnected",
            "api": "running"
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "database": "disconnected",
            "error": str(e)
        }), 500

@app.route('/api/dispositivo', methods=['POST'])
def registrar_dispositivo():
    data = request.json
    try:
        conn = get_connection()
        if conn is None:
            return jsonify({"status": "error", "message": "Error de conexión a la base de datos"}), 500
            
        cursor = conn.cursor()
        cursor.callproc("sp_registrar_dispositivo", [
            data.get("nombre", "Carro IoT STM32"),
            data.get("ip", "192.168.1.100"),
            data.get("pais", "Ecuador"),
            data.get("ciudad", "Quito"),
            data.get("latitud", -0.180653),
            data.get("longitud", -78.467834)
        ])
        conn.commit()
        return jsonify({"status": "ok", "message": "Dispositivo registrado"})
    except Error as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals() and conn.is_connected():
            conn.close()

@app.route('/api/evento', methods=['POST'])
def registrar_evento():
    data = request.json
    try:
        conn = get_connection()
        if conn is None:
            return jsonify({"status": "error", "message": "Error de conexión a la base de datos"}), 500
            
        cursor = conn.cursor()
        cursor.callproc("sp_registrar_evento", [
            data.get("id_dispositivo", 1),
            data.get("tipo", "Comando"),
            data.get("detalle", "Evento registrado desde API")
        ])
        conn.commit()
        
        print(f"✅ Evento registrado: {data.get('tipo', 'Desconocido')}")
        
        return jsonify({"status": "ok", "message": "Evento registrado"})
    except Error as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals() and conn.is_connected():
            conn.close()

@app.route('/api/obstaculo', methods=['POST'])
def registrar_obstaculo():
    data = request.json
    try:
        conn = get_connection()
        if conn is None:
            return jsonify({"status": "error", "message": "Error de conexión a la base de datos"}), 500
            
        cursor = conn.cursor()
        cursor.callproc("sp_registrar_obstaculo", [
            data.get("id_dispositivo", 1),
            data.get("descripcion", "Obstáculo detectado")
        ])
        conn.commit()
        
        print(f"⚠️  Obstáculo registrado: {data.get('descripcion', 'Desconocido')}")
        
        return jsonify({"status": "ok", "message": "Obstáculo registrado"})
    except Error as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals() and conn.is_connected():
            conn.close()

@app.route('/api/estado/<int:id_dispositivo>', methods=['GET'])
def obtener_estado_actual(id_dispositivo):
    try:
        conn = get_connection()
        if conn is None:
            return jsonify({"status": "error", "message": "Error de conexión a la base de datos"}), 500
            
        cursor = conn.cursor(dictionary=True)
        cursor.callproc("sp_obtener_estado_actual", [id_dispositivo])
        
        estado = []
        for result in cursor.stored_results():
            estado = result.fetchall()
            
        return jsonify(estado)
    except Error as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals() and conn.is_connected():
            conn.close()

@app.route('/api/eventos/<int:id_dispositivo>', methods=['GET'])
def obtener_eventos(id_dispositivo):
    try:
        conn = get_connection()
        if conn is None:
            return jsonify({"status": "error", "message": "Error de conexión a la base de datos"}), 500
            
        cursor = conn.cursor(dictionary=True)
        cursor.callproc("sp_obtener_eventos", [id_dispositivo, 10])
        
        eventos = []
        for result in cursor.stored_results():
            eventos = result.fetchall()
            
        return jsonify(eventos)
    except Error as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals() and conn.is_connected():
            conn.close()

@app.route('/api/obstaculos/<int:id_dispositivo>', methods=['GET'])
def obtener_obstaculos(id_dispositivo):
    try:
        conn = get_connection()
        if conn is None:
            return jsonify({"status": "error", "message": "Error de conexión a la base de datos"}), 500
            
        cursor = conn.cursor(dictionary=True)
        
        # Intentar obtener de la tabla obstaculos directamente
        try:
            cursor.execute("""
                SELECT id_obstaculo, id_dispositivo, descripcion, fecha,
                       'Obstáculo evitado exitosamente' as accion,
                       'evitado' as estado
                FROM obstaculos 
                WHERE id_dispositivo = %s 
                ORDER BY fecha DESC 
                LIMIT 10
            """, (id_dispositivo,))
            obstaculos = cursor.fetchall()
            
            if obstaculos:
                return jsonify(obstaculos)
        except Exception as table_error:
            print(f"Tabla obstaculos no disponible, usando eventos: {table_error}")
            # Si falla, continuar con el método de eventos
        
        # Obtener eventos relacionados con obstáculos
        cursor.callproc("sp_obtener_eventos", [id_dispositivo, 20])
        eventos = []
        for result in cursor.stored_results():
            eventos = result.fetchall()
        
        # Filtrar eventos de obstáculos
        obstaculos_eventos = []
        for evento in eventos:
            detalle = evento.get('detalle', '').lower()
            tipo_evento = evento.get('tipo_evento', '').lower()
            
            if any(keyword in detalle or keyword in tipo_evento 
                   for keyword in ['obstáculo', 'obstaculo', 'obstacle', 'detección', 'deteccion']):
                obstaculos_eventos.append({
                    'id_obstaculo': evento.get('id_evento'),
                    'descripcion': evento.get('detalle', 'Obstáculo detectado'),
                    'fecha': evento.get('fecha_hora'),
                    'accion': 'Obstáculo procesado por el sistema',
                    'estado': 'evitado'
                })
        
        return jsonify(obstaculos_eventos[:10])
        
    except Error as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals() and conn.is_connected():
            conn.close()

@app.route('/api/secuencia', methods=['POST'])
def ejecutar_secuencia():
    data = request.json
    try:
        conn = get_connection()
        if conn is None:
            return jsonify({"status": "error", "message": "Error de conexión a la base de datos"}), 500
            
        movimientos = data.get('movimientos', [])
        id_dispositivo = data.get('id_dispositivo', 1)
        
        if not movimientos:
            return jsonify({"status": "error", "message": "No hay movimientos en la secuencia"}), 400
        
        cursor = conn.cursor()
        
        # Registrar evento de inicio de secuencia
        cursor.callproc("sp_registrar_evento", [
            id_dispositivo,
            "Secuencia Iniciada",
            f"Iniciando secuencia con {len(movimientos)} movimientos: {', '.join(movimientos)}"
        ])
        
        # Ejecutar cada movimiento individualmente
        for i, movimiento in enumerate(movimientos):
            cursor.callproc("sp_registrar_evento", [
                id_dispositivo,
                f"Secuencia-Paso-{i+1}",
                f"Ejecutando: {movimiento}"
            ])
            
            # Pequeña pausa simulada entre movimientos
            import time
            time.sleep(0.1)
        
        # Registrar evento de finalización
        cursor.callproc("sp_registrar_evento", [
            id_dispositivo,
            "Secuencia Completada",
            f"Secuencia ejecutada exitosamente: {' → '.join(movimientos)}"
        ])
        
        conn.commit()
        
        print(f"🎯 Secuencia ejecutada: {len(movimientos)} movimientos")
        
        return jsonify({
            "status": "ok", 
            "message": f"Secuencia ejecutada con {len(movimientos)} movimientos",
            "movimientos": movimientos,
            "timestamp": datetime.now().isoformat()
        })
        
    except Error as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals() and conn.is_connected():
            conn.close()

# Manejo de errores
@app.errorhandler(404)
def not_found(error):
    return jsonify({"status": "error", "message": "Endpoint no encontrado"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"status": "error", "message": "Error interno del servidor"}), 500

@app.errorhandler(400)
def bad_request(error):
    return jsonify({"status": "error", "message": "Solicitud incorrecta"}), 400

if __name__ == '__main__':
    print("🚀 Iniciando API del Carro IoT STM32...")
    print("📡 Conectando a AWS RDS...")
    
    # Probar conexión a la base de datos
    try:
        conn = get_connection()
        if conn and conn.is_connected():
            print("✅ Conectado exitosamente a AWS RDS")
            conn.close()
        else:
            print("❌ No se pudo conectar a AWS RDS")
            print("💡 Verifica:")
            print("   - Las credenciales en el archivo .env")
            print("   - Que la instancia RDS esté ejecutándose")
            print("   - Las reglas de seguridad del grupo de seguridad")
    except Exception as e:
        print(f"❌ Error de conexión: {e}")
    
    print("\n🔗 Endpoints disponibles:")
    print("   GET  /")
    print("   GET  /api/health")
    print("   POST /api/dispositivo")
    print("   POST /api/evento")
    print("   POST /api/obstaculo")
    print("   GET  /api/estado/<id>")
    print("   GET  /api/eventos/<id>")
    print("   GET  /api/obstaculos/<id>")
    print("   POST /api/secuencia")
    print(f"\n🌐 Servidor ejecutándose en: http://127.0.0.1:5000")
    
    app.run(host='127.0.0.1', port=5000, debug=True)