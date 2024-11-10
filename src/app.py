from flask import Flask, render_template
from flask_socketio import SocketIO
import backend.db_access as db_access
import backend.messageParser as messageParser
from backend.CANLoggerDatabase import CANLoggerDatabase
import os

app = Flask(__name__, template_folder='frontend/html')
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

def start_message_processing():
    # Ensure the file paths are correct and the app can access them
    message_file_path = os.path.abspath('src/backend/CAN-Message-Generator/out.txt')  # Absolute path to avoid path issues
    database_path = os.path.abspath('src/can_database.sqlite')  # Absolute path to the SQLite database
    dbc_file_path = os.path.abspath('src/backend/CAN-Message-Generator/CAN-messages/Rivanna2.dbc')

    # Check if the paths exist
    if not os.path.exists(message_file_path):
        print(f"Message file path does not exist: {message_file_path}")
    if not os.path.exists(database_path):
        print(f"Database path does not exist: {database_path}")
    if not os.path.exists(dbc_file_path):
        print(f"DBC file path does not exist: {dbc_file_path}")

    logger_db = CANLoggerDatabase(database_path, dbc_file_path)

    table_names = logger_db.get_table_names()


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

    messageParser.process_messages_in_batches(message_file_path, logger_db, emit_func=emit_messages_in_batches)

if __name__ == '__main__':
    socketio.start_background_task(target=start_message_processing)
    # Use socketio.run(app) to handle Flask and SocketIO
    socketio.run(app, debug=True)
