from flask import Flask, render_template
from flask_socketio import SocketIO

app = Flask(__name__, template_folder='frontend/html', static_folder='frontend/static')
socketio = SocketIO(app, cors_allowed_origins="*")


@app.route('/')
def index():
    # Render the HTML with the large_data passed in
    return render_template('debug.html') # DELETED message_list


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

