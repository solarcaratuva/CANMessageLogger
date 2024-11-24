from src.main import socketio # the socketio app
from src.backend.db_connection import DbConnection
from src.backend.input import consumer
import time

logger_db = DbConnection()


# Grabs the latest row from each table
@socketio.on('get_latest_row_from_tables')
def handle_data_request():
    # Need to Add: Logic for keeping track of last send time
    table_names = logger_db.get_table_names()  # Each table in the Database stores 1 type of Can Message
    for table_name in table_names:  # Database has a table for each type of Can Message
        if table_name != "sqlite_sequence":
            num_messages = logger_db.query(f"Select COUNT(*) as len FROM {table_name};")  # returns a list of dicts
            print(f"There are {num_messages[0]['len']} messages in table for Can Message Type: {table_name}")
            if num_messages[0]['len']:
                row = logger_db.query(f"SELECT * FROM {table_name} ORDER BY timeStamp DESC LIMIT 1;")
                timestamp = row[0]['timeStamp']
                del row[0]['timeStamp']
                message_dict = row[0]

                # logic for handling time
                time_diff = consumer.last_consume_time - (consumer.start_consume_time + timestamp / 1000)

                socketio.emit('update_large_data', {
                    'table_name': table_name,
                    'timestamp': timestamp,
                    'keys': message_dict,  # signal to signal value dictionary
                    'time_diff': time_diff
                })
            else:
                print(f"Table for {table_name} is empty.")

