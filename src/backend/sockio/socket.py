from flask import Flask, render_template
from flask_socketio import SocketIO

app = Flask(__name__, template_folder='../../frontend/html', static_folder='../../frontend/static')
socketio = SocketIO(app, cors_allowed_origins="*")


@app.route('/')
def index():
    # Render the HTML with the large_data passed in
    return render_template('debug.html') # DELETED message_list


@socketio.on('connect')
def handle_connect():
    print("Client connected.")


@socketio.on('disconnect')
def handle_disconnect():
    print("Client disconnected.")

