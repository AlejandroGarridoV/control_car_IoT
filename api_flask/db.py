# db.py
import mysql.connector
from mysql.connector import Error
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

def get_connection():
    """Establece conexión con la base de datos MySQL en AWS RDS"""
    try:
        connection = mysql.connector.connect(
            host=os.getenv("DB_HOST"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASS"),
            database=os.getenv("DB_NAME"),
            port=3306  # Puerto por defecto de MySQL
        )
        
        if connection.is_connected():
            print("✅ Conectado a la base de datos AWS RDS")
            return connection
            
    except Error as e:
        print(f"❌ Error conectando a MySQL: {e}")
        return None

def test_connection():
    """Función para probar la conexión"""
    try:
        conn = get_connection()
        if conn and conn.is_connected():
            print("✅ Conexión exitosa a AWS RDS")
            conn.close()
            return True
        else:
            print("❌ No se pudo conectar a la base de datos")
            return False
    except Exception as e:
        print(f"❌ Error en test_connection: {e}")
        return False