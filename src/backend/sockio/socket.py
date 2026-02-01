from flask import Flask, render_template, jsonify, redirect
from flask_socketio import SocketIO
import boto3
from botocore.exceptions import ClientError
from src.tests.testData.py import create_json, telemetry

# disables excessive debug logging from SocketIO
import logging
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

# `app` and `socketio` represent the REST API connection, and are used in other files in sockio/
app = Flask(__name__, template_folder='../../frontend/logger/html', static_folder='../../frontend/logger/static')
socketio = SocketIO(app, cors_allowed_origins="*", logger=False, engineio_logger=False)

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


@socketio.on('disconnect')
def handle_disconnect():
    print("Client disconnected.")