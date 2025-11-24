from flask import Flask, render_template
from flask_socketio import SocketIO, emit

# disables excessive debug logging from SocketIO
import logging
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

# `app` and `socketio` represent the REST API connection, and are used in other files in sockio/
app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*", logger=False, engineio_logger=False)

@app.route("/")
def index():
    return "Socket.IO test backend is running"

@socketio.on('connect')
def handle_connect():
    print("Client connected.")


@socketio.on('disconnect')
def handle_disconnect():
    print("Client disconnected.")

@socketio.on("ping_from_client")
def handle_ping(data):
    print("got ping:", data)
    emit("pong_from_server", {"ok": True})

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000)
