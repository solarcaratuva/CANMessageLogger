# src/backend/sockio/socket.py
from flask import Flask, render_template, redirect, jsonify
from src.backend.sockio.extensions import socketio
from src.tests.testData import create_json, telemetry
from src.tests.motorData import stream_motor_data
SOCKETIO_PORT = 5500
import logging

# disable excessive logging
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

# create Flask app
app = Flask(
    __name__,
    template_folder='../../frontend/logger/html',
    static_folder='../../frontend/logger/static'
)

# bind socketio to app
socketio.init_app(app)

@app.route('/')
def index():
    return redirect('/logger')

@app.route('/logger')
def logger_index():
    return render_template('debug_dashboard.html')

@app.route('/api/test')
def test_api():
    return render_template('api_status.html')

@app.route('/api/json')
def test_json():
    create_json(telemetry, "telemetry.json")
    return jsonify(telemetry)

@socketio.on('connect')
def handle_connect():
    print("Client connected.")
    socketio.start_background_task(stream_motor_data)

@socketio.on('disconnect')
def handle_disconnect():
    print("Client disconnected.")

if __name__ == "__main__":
    # ensures app listens on port 5000
    socketio.run(app, host="127.0.0.1", port=SOCKETIO_PORT, debug=True)
