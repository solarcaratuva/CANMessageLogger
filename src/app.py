from flask import Flask, render_template
from flask_socketio import SocketIO
import backend.db_access as db_access
import backend.DbConnection as dbconnect
import os
import time
from input import consumer, logfileProd
from functools import partial

app = Flask(__name__, template_folder='frontend/html', static_folder='frontend/static')
socketio = SocketIO(app, cors_allowed_origins="*")

# List to store messages to display on the front end
message_list = []

@app.route('/')
def index():
    # Render the HTML with the large_data passed in
    return render_template('debug.html', large_data=message_list)

@socketio.on('connect')
def handle_connect():
    print("Client connected.")
    # Emit the current messages to the newly connected client
    # socketio.emit('initial_messages', message_list)
    # test_messages = [
    #     {'timestamp': '2024-10-09T13:00:00Z', 'data': {'test': 'Hello, world!'}},
    #     {'timestamp': '2024-10-09T13:01:00Z', 'data': {'test': 'Another message'}}
    # ]
    # socketio.emit('initial_messages', test_messages)
    # socketio.emit('update_large_data', test_messages)

@socketio.on('disconnect')
def handle_disconnect():
    print("Client disconnected.")

def process_messages_in_batches(file_path: str, logger_db: dbconnect, emit_func):
    message_count = 0  # Counter for the messages
    send_interval = 1  # Send messages every 5 seconds
    last_send_time = time.perf_counter()

    while True:
        message_batch = []  # Collect messages to emit later

        tables = logger_db.query("SELECT name FROM sqlite_master WHERE type='table';")
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

                    message_count += 1
                    message_batch.append({'table_name': table_name, 'data': message_dict,
                                        'timestamp': timestamp})  # Append to batch list

        # Only emit the batch based on time interval
        current_time = time.perf_counter()

        if current_time - last_send_time >= send_interval:
            if message_batch:  # Only emit if there's data in the batch
                emit_func(message_batch)  # Use emit_func to emit messages
                print(f"Sent batch of {len(message_batch)} messages")
                last_send_time = current_time

        time.sleep(1)  # Pause before next batch
'''
def process_messages_in_batches(file_path: str, logger_db: CANLoggerDatabase, emit_func):
    message_count = 0  # Counter for the messages
    send_interval = 1  # Send messages every 5 seconds
    last_send_time = time.perf_counter()

    ID_TO_TABLE = {
        513: 'ECUMotorCommands',
        769: 'ECUPowerAuxCommands',
        0x789: 'table_name_3',
        # Add more mappings as needed
    }
    with open(file_path, 'r') as f:
        while True:
            batch = [f.readline().strip() for _ in range(100)]
            batch = [msg for msg in batch if msg]  # Filter out empty lines

            if not batch:  # End of file
                break

            message_batch = []  # Collect messages to emit later

            for line in batch:
                id, message_dict, timestamp = messageParser(line)
                if message_dict:
                    table_name = ID_TO_TABLE.get(id)
                    # Log the message into the database
                    logger_db.add_message_to_db(table_name, message_dict)
                    message_count += 1
                    message_batch.append({'table_name': table_name, 'data': message_dict,
                                          'timestamp': timestamp})  # Append to batch list

            # Only emit the batch based on time interval
            current_time = time.perf_counter()
            if current_time - last_send_time >= send_interval:
                if message_batch:  # Only emit if there's data in the batch
                    emit_func(message_batch)  # Use emit_func to emit messages
                    print(f"Sent batch of {len(message_batch)} messages")
                    last_send_time = current_time

            print(f"Processed {len(batch)} messages, waiting for 1 second...")
            time.sleep(1)  # Pause before next batch
'''

def start_message_processing():
    # Ensure the file paths are correct and the app can access them
    message_file_path = os.path.abspath('message.txt')  # Absolute path to avoid path issues
    database_path = os.path.abspath('src/can_database.sqlite')  # Absolute path to the SQLite database
    # dbc_file_path = os.path.abspath('src/backend/CAN-Message-Generator/CAN-messages/Rivanna2.dbc')

    # Check if the paths exist
    if not os.path.exists(message_file_path):
        print(f"Message file path does not exist: {message_file_path}")
    if not os.path.exists(database_path):
        print(f"Database path does not exist: {database_path}") 

    dbconnect.DbConnection.setup_the_db_path(database_path)
    logger_db = dbconnect.DbConnection()
    logger_db.setup_the_tables()

    socketio.start_background_task(target=partial(logfileProd.process_logfile_live, "message.txt"))
    socketio.start_background_task(target=consumer.process_data_live)  # If it doesn't take arguments

    table_names = logger_db.get_table_names() # Brian is handling this right now

    # This function will emit messages in batches directly to clients
    def emit_messages_in_batches(messages):
        max_messages = 1  # Limit the number of messages to keep in memory
        for message in messages:
            table_name = message.get("table_name")
            message_dict = {
                "table_name": table_name,
                "data": message["data"],
                "timestamp": message["timestamp"]
            }

            # Append the new message
            message_list.append(message_dict)

            # Keep only the most recent N messages
            if len(message_list) > max_messages:
                message_list.pop(0)  # Remove the oldest message

            keys = list(message["data"].keys()) if "data" in message else []
            
            # Emit the data to the front end
            socketio.emit('update_large_data', {
                'messages': message_list,
                'table_name': table_name,
                'timestamp': message["timestamp"],
                'keys': keys
            })

    process_messages_in_batches(message_file_path, logger_db, emit_func=emit_messages_in_batches)

if __name__ == '__main__':
    socketio.start_background_task(target=start_message_processing)
    # Use socketio.run(app) to handle Flask and SocketIO
    socketio.run(app, debug=True)
