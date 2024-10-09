from flask import Flask, render_template
from flask_socketio import SocketIO
import backend.db_access as db_access
import backend.messageParser as messageParser
from backend.CANLoggerDatabase import CANLoggerDatabase
import os

app = Flask(__name__, template_folder='html')
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
    socketio.emit('initial_messages', message_list)
    # test_messages = [
    #     {'timestamp': '2024-10-09T13:00:00Z', 'data': {'test': 'Hello, world!'}},
    #     {'timestamp': '2024-10-09T13:01:00Z', 'data': {'test': 'Another message'}}
    # ]
    # socketio.emit('initial_messages', test_messages)
    # socketio.emit('update_large_data', test_messages)

@socketio.on('disconnect')
def handle_disconnect():
    print("Client disconnected.")

@socketio.on('can_message')
def handle_can_message(data):
    print(f"Received CAN message: {data}")  # Debug log
    # Append the incoming message to the message_list
    message_list.append(data)
    print(f"Current message list: {message_list}")  # Debug log
    # Emit the updated list to all connected clients
    socketio.emit('update_large_data', message_list)

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
    messageParser.process_messages_in_batches(message_file_path, logger_db, "ECUMotorCommands", socketio)

if __name__ == '__main__':
    socketio.start_background_task(target=start_message_processing)
    # Use socketio.run(app) to handle Flask and SocketIO
    socketio.run(app, debug=True)
