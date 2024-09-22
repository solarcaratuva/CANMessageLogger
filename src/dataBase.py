import os.path
import sqlite3
from sqlite3 import Error
import dbc_code


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
def create_table(conn, dbc_messages):
    """
    Create a table based on a given column structure dictionary, with an
    autoincrementing primary key and a time column.

    Args:
    - conn: The database connection object.
    - table_name: The name of the table to create.
    - column_dict: Dictionary where keys are column names and values are the data types.

    Example of column_dict: {"key1": "int", "key2": "bool", "key3": "float"}
    """
    try:
        for can_msg_name, can_msg_types in dbc_messages.items():
            # Start with the primary key definition
            columns = ["id INTEGER PRIMARY KEY AUTOINCREMENT", "time TEXT"]

            # Add columns from the dictionary
            for col_name, col_type in can_msg_types.items():
                columns.append(f"{col_name} {col_type.upper()}")

            # Join all column definitions into a single string
            columns_str = ", ".join(columns)

            # Create the SQL command to create the table
            sql_create_table = f"CREATE TABLE IF NOT EXISTS {can_msg_name} ({columns_str});"

            # Execute the table creation command
            conn.execute(sql_create_table)
            print(f"Table '{can_msg_name}' created or already exists.")
    except Error as e:
        print(e)


def show_all_table_structures(conn):
    """Print the structure of all tables in the SQLite database."""
    try:
        # Query to retrieve all table names from the database
        cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()

        if tables:
            for table in tables:
                table_name = table[0]
                print(f"\nStructure of table '{table_name}':")

                # Query the structure of the current table
                cursor = conn.execute(f"PRAGMA table_info({table_name});")
                columns = cursor.fetchall()

                # Print the structure of the table
                for column in columns:
                    print(f"Column {column[1]}: Type {column[2]}, Primary Key {bool(column[5])}")
        else:
            print("No tables found in the database.")

    except sqlite3.Error as e:
        print(e)

if __name__ == "__main__":
    sql_file = os.path.join(os.path.dirname(__file__), "can_database.sqlite")
    conn = create_connection(sql_file)
    messages = dbc_code.get_messages_from_dbc(os.path.join(os.path.dirname(__file__), "Rivanna3.dbc"))
    create_table(conn, messages)
    show_all_table_structures(conn)
