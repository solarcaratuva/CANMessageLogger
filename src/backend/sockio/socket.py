from flask import Flask, jsonify
from flask_socketio import SocketIO
from flask_cors import CORS

# disables excessive debug logging from SocketIO
import logging
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

#flask functions as API only now
app = Flask(__name__)

#enable CORS for React frontend
CORS(app)

# `app` and `socketio` represent the REST API connection, and are used in other files in sockio/
socketio = SocketIO(app, cors_allowed_origins="http://localhost:3000", logger=False, engineio_logger=False)

@app.route('/')
def index():
    return render_template(debug_dashboard.html);
                   
@app.route('/api/test')
def test_api():
    return jsonify({"message": "Flask backend is working",
                   "status": "ok"})

@socketio.on('connect')
def handle_connect():
    print("Client connected.")


@socketio.on('disconnect')
def handle_disconnect():
    print("Client disconnected.")