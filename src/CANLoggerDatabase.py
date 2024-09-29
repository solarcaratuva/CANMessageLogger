import os.path
import sqlite3
from datetime import datetime
from sqlite3 import Error
import dbc_code


class CANLoggerDatabase:

    def __init__(self, db_filename: str, dbc_filename: str):
        self.conn = None
        try:
            self.conn = sqlite3.connect(db_filename)
            print(f"Connected to database: {db_filename}")
        except Error as e:
            print(e)
            exit(1)

        self.dbc_messages = dbc_code.get_messages_from_dbc(dbc_filename)
        # print(self.dbc_messages)

        try:
            for can_msg_name, can_msg_types in self.dbc_messages.items():
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
                self.conn.execute(sql_create_table)
                # print(f"Table '{can_msg_name}' created or already exists.")
        except Error as e:
            print(e)
            exit(1)

    def show_all_table_structures(self):
        """Print the structure of all tables in the SQLite database."""
        try:
            # Query to retrieve all table names from the database
            cursor = self.conn.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = cursor.fetchall()

            if tables:
                for table in tables:
                    table_name = table[0]
                    print(f"\nStructure of table '{table_name}':")

                    # Query the structure of the current table
                    cursor = self.conn.execute(f"PRAGMA table_info({table_name});")
                    columns = cursor.fetchall()

                    # Print the structure of the table
                    for column in columns:
                        print(f"Column {column[1]}: Type {column[2]}, Primary Key {bool(column[5])}")
            else:
                print("No tables found in the database.")

        except sqlite3.Error as e:
            print(e)
            exit(1)

    def add_message_to_db(self, table_name: str, message):
        try:
            # Get the current timestamp and add it to the dictionary
            message['time'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            # Prepare the SQL command to insert the data
            columns = ", ".join(message.keys())  # Column names as a string
            placeholders = ", ".join(["?"] * len(message))  # Placeholders for each value
            sql_insert = f"INSERT INTO {table_name} ({columns}) VALUES ({placeholders})"

            # Execute the insert command
            self.conn.execute(sql_insert, list(message.values()))
            self.conn.commit()
            # print(f"Data inserted into '{table_name}' successfully.")

        except sqlite3.Error as e:
            print(f"Error inserting data: {e}")
            exit(1)

    def get_all_from_table(self, table_name: str):
        try:
            sql_select = f"SELECT * FROM {table_name}"
            cursor = self.conn.execute(sql_select)

            rows = cursor.fetchall()

            column_names = [description[0] for description in cursor.description]
            return column_names, rows

        except sqlite3.Error as e:
            print(f"Error retrieving data: {e}")
            exit(1)

    def get_all_from_table_keys(self, table_name: str, val_to_sel: list[str]):
        try:
            sql_select = f"SELECT {', '.join(val_to_sel)} FROM {table_name}"
            cursor = self.conn.execute(sql_select)

            rows = cursor.fetchall()

            column_names = [description[0] for description in cursor.description]
            return column_names, rows

        except sqlite3.Error as e:
            print(f"Error retrieving data: {e}")
            exit(1)

    def get_latest_from_table(self, table_name: str, order_column: str = "id"):
        """
        Retrieve the latest message (row) from the specified table, ordered by a given column (default: 'id').

        Args:
        - table_name: The name of the table to query.
        - order_column: The column to order by (e.g., 'id' or 'time').

        Returns:
        - column_names: List of column names.
        - latest_row: The latest row in the table based on the order column.
        """
        try:
            # Query to get the latest row based on the order_column
            sql_select = f"SELECT * FROM {table_name} ORDER BY {order_column} DESC LIMIT 1"
            cursor = self.conn.execute(sql_select)

            # Fetch the latest row
            latest_row = cursor.fetchone()

            # Get column names
            column_names = [description[0] for description in cursor.description]

            return column_names, latest_row

        except sqlite3.Error as e:
            print(f"Error retrieving latest message: {e}")
            exit(1)

    def get_latest_from_table_keys(self, table_name: str, val_to_sel: list[str], order_column: str = "id"):
        """
                Retrieve the latest message (row) from the specified table, ordered by a given column (default: 'id').

                Args:
                - table_name: The name of the table to query.
                - order_column: The column to order by (e.g., 'id' or 'time').

                Returns:
                - column_names: List of column names.
                - latest_row: The latest row in the table based on the order column.
                """
        try:
            # Query to get the latest row based on the order_column
            sql_select = f"SELECT {', '.join(val_to_sel)} FROM {table_name} ORDER BY {order_column} DESC LIMIT 1"
            cursor = self.conn.execute(sql_select)

            # Fetch the latest row
            latest_row = cursor.fetchone()

            # Get column names
            column_names = [description[0] for description in cursor.description]

            return column_names, latest_row

        except sqlite3.Error as e:
            print(f"Error retrieving latest message: {e}")
            exit(1)

    def clear_table(self, table_name: str):
        try:
            # Step 1: Delete all rows from the table
            sql_delete_data = f"DELETE FROM {table_name}"
            self.conn.execute(sql_delete_data)
            self.conn.commit()
            print(f"All data from table '{table_name}' has been deleted.")

            # Step 2: Reset the autoincrement counter by removing the entry from sqlite_sequence
            sql_reset_autoincrement = f"DELETE FROM sqlite_sequence WHERE name='{table_name}'"
            self.conn.execute(sql_reset_autoincrement)
            self.conn.commit()
            print(f"Autoincrement counter for table '{table_name}' has been reset.")

        except sqlite3.Error as e:
            print(f"Error clearing data or resetting autoincrement: {e}")
            exit(1)


if __name__ == "__main__":
    sql_file_name = os.path.join(os.path.dirname(__file__), "can_database.sqlite")
    dbc_file_name = os.path.join(os.path.dirname(__file__), "Rivanna3.dbc")
    logger_db = CANLoggerDatabase(sql_file_name, dbc_file_name)
    # logger_db.clear_table("AuxBatteryStatus")
    # logger_db.show_all_table_structures()

    message = {
        "aux_voltage": 12
    }

    logger_db.add_message_to_db("AuxBatteryStatus", message)
    # aux_table = logger_db.get_latest_from_table("AuxBatteryStatus")
    # aux_table = logger_db.get_latest_from_table_keys("AuxBatteryStatus", ["time", "aux_voltage"])
    aux_table = logger_db.get_all_from_table_keys("AuxBatteryStatus", ["time", "aux_voltage"])
    print(aux_table)
