from src.main import socketio # the socketio app
from src.backend.db_connection import DbConnection
import time

logger_db = DbConnection()


# Grabs the latest row from each table
@socketio.on('get_latest_row_from_tables')
def handle_data_request():
    # Need to Add: Logiv for keeping track of last send time
    tables = logger_db.get_table_names()
    for table in tables:
        table_name = table['name']
        if table_name != "sqlite_sequence":
            result = logger_db.query(f"Select COUNT(*) as len FROM {table_name};")
            print(result[0]['len'], table_name)
            row = 0
            if result[0]['len']:
                row = logger_db.query(f"SELECT * FROM {table_name} ORDER BY timeStamp DESC LIMIT 1;")
            else:
                print(f"Table for {table_name} is empty.")
            if row:
                timestamp = row[0]['timeStamp']
                del row[0]['timeStamp']
                message_dict = row[0]

                socketio.emit('update_large_data', {
                    'table_name': table_name,
                    'timestamp': timestamp,
                    'keys': row  # signal to signal value dictionary
                })
