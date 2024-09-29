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
            # Query to select all data from the table
            sql_select = f"SELECT * FROM {table_name}"
            cursor = self.conn.execute(sql_select)

            # Fetch all rows
            rows = cursor.fetchall()

            column_names = [description[0] for description in cursor.description]
            return column_names, rows

            # if rows:
            #     # Fetch the column names to display with the data
            #     column_names = [description[0] for description in cursor.description]
            #
            #     # Print column headers
            #     print(f"Data from table '{table_name}':")
            #     print(" | ".join(column_names))
            #     print("-" * 50)
            #
            #     # Print each row of data
            #     for row in rows:
            #         print(" | ".join(map(str, row)))
            # else:
            #     print(f"No data found in table '{table_name}'.")

        except sqlite3.Error as e:
            print(f"Error retrieving data: {e}")
            exit(1)


if __name__ == "__main__":
    sql_file_name = os.path.join(os.path.dirname(__file__), "can_database.sqlite")
    dbc_file_name = os.path.join(os.path.dirname(__file__), "Rivanna3.dbc")
    logger_db = CANLoggerDatabase(sql_file_name, dbc_file_name)
    # logger_db.show_all_table_structures()

    message = {
        "aux_voltage": 12
    }

    logger_db.add_message_to_db("AuxBatteryStatus", message)
    aux_table = logger_db.get_all_from_table("AuxBatteryStatus")
    print(aux_table)
