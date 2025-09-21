from flask import Flask
from flask_socketio import SocketIO

# disables excessive debug logging from SocketIO
import logging
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

# `app` and `socketio` represent the REST API connection, and are used in other files in sockio/
app = Flask(__name__, template_folder='../../frontend/html', static_folder='../../frontend/static')
socketio = SocketIO(app, cors_allowed_origins="*", logger=False, engineio_logger=False)


@socketio.on('connect')
def handle_connect():
    print("Client connected.")


@socketio.on('disconnect')
def handle_disconnect():
    print("Client disconnected.")