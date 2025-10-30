# db.py
import mysql.connector
from mysql.connector import Error
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

def get_connection():
    """Establece conexión con la base de datos MySQL"""
    try:
        connection = mysql.connector.connect(
            host=os.getenv("DB_HOST"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASS"),
            database=os.getenv("DB_NAME"),
            port=int(os.getenv("DB_PORT", 3306))
        )
        if connection.is_connected():
            return connection
    except Error as e:
        print(f"❌ Error conectando a MySQL: {e}")
        return None
