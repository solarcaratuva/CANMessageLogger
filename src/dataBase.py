import os.path
import sqlite3
from sqlite3 import Error


# Function to create a database connection
def create_connection(db_file):
    """Create a database connection to an SQLite database."""
    conn = None
    try:
        conn = sqlite3.connect(db_file)
        print(f"Connected to database: {db_file}")
    except Error as e:
        print(e)
    return conn


# Function to create a table (if it doesn't exist)
def create_table(conn):
    """Create a table if it doesn't exist."""
    try:
        sql_create_table = """
        CREATE TABLE IF NOT EXISTS records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            value REAL
        );
        """
        conn.execute(sql_create_table)
        print("Table created or verified.")
    except Error as e:
        print(e)


if __name__ == "__main__":
    sql_file = os.path.join(os.path.dirname(__file__), "can_database.sqlite")
    conn = create_connection(sql_file)
    create_table(conn)
