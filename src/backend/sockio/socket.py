from flask import Flask, render_template, jsonify, redirect
from flask_socketio import SocketIO
from src.backend.sockio.extensions import socketio
import boto3
from botocore.exceptions import ClientError
from src.tests.testData import create_json, telemetry
from src.tests.motorData import stream_motor_data

# disables excessive debug logging from SocketIO
import logging
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

# `app` and `socketio` represent the REST API connection, and are used in other files in sockio/
app = Flask(__name__, template_folder='../../frontend/logger/html', static_folder='../../frontend/logger/static')
socketio = SocketIO(app, cors_allowed_origins="*", logger=True, engineio_logger=True)

@app.route('/')
def index():
    return redirect('/logger')


@app.route('/logger')
def logger_index():
    return render_template('debug_dashboard.html')

#api test endpoint: html page
@app.route('/api/test')
def test_api():
    return render_template('api_status.html')

#app test endpoint: json data
@app.route ('/api/json')
def test_json():
    #saves the telmetry python dict into json file for future reference
    create_json(telemetry, "telemetry.json"); 
    return jsonify(telemetry);

@socketio.on('connect')
def handle_connect():
    print("Client connected.")
    #built in method that wraps stream_motor_data() and handles python threads
    socketio.start_background_task(stream_motor_data)


@socketio.on('disconnect')
def handle_disconnect():
    print("Client disconnected.")