from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO
# from backend.input.alertChecker import alertChecker
import backend.input.alertChecker as alertChecker
from ..db_connection import DbConnection as dbconnect
from ..dbcs import get_messages_from_dbc
import os
import backend.input.consumer as consumer

import logging
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

app = Flask(__name__, template_folder='../../frontend/html', static_folder='../../frontend/static')
socketio = SocketIO(app, cors_allowed_origins="*", logger=False, engineio_logger=False)

alertChecker.set_socketio(socketio)
consumer.set_socketio(socketio)
# List to store messages to display on the front end
message_list = list()
alert_definitions = dict() # {1: alert1, 2: alert2, 3: alert3, ...}
alertsCreated = 0


@app.route('/')
def index():
    # Render the HTML with the large_data passed in
    return render_template('debug.html') # DELETED message_list

@app.route('/alert_manager')
def alert_manager():
    return render_template('alert_manager.html')

@app.route('/graph_view')
def graph_view():
    return render_template('graph_view.html')

@app.route('/link2')
def link2():
    return render_template('link2.html')

@app.route('/parse_dbc_fields', methods=['POST'])
def parse_dbc_fields():
    """
    Use this to populate the alerts form with available fields from the DBC files

    Currently linked to the Rivanna3.dbc file from src/backend but commented out code can
    switch to using the dbc file from resources/CAN-messages
    """
    
    # BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    # dbc_path = os.path.join(BASE_DIR, '../resources/CAN-messages/Rivanna3.dbc')
    # dbc_path = os.path.normpath(dbc_path)

    dbc_path = "resources/CAN-messages/Rivanna3.dbc"
    
    result = get_messages_from_dbc(dbc_path)

    return jsonify({'message': result})

@app.route('/get_can_message_types', methods=['GET'])
def get_can_message_types():
    """
    Get all available CAN message types and their signals from all DBC files
    """
    message_types = {}
    
    # Loop through all DBC files in the resources/CAN-messages directory
    dbc_files_dir = "resources/CAN-messages"
    for filename in os.listdir(dbc_files_dir):
        if filename.endswith('.dbc'):
            dbc_path = os.path.join(dbc_files_dir, filename)
            try:
                result = get_messages_from_dbc(dbc_path)
                # Merge into our message_types dictionary
                for msg_name, signals in result.items():
                    if msg_name not in message_types:
                        message_types[msg_name] = signals
                    else:
                        # If message exists, merge signals
                        message_types[msg_name].update(signals)
                print(f"Loaded CAN message types from {filename}")
            except Exception as e:
                print(f"Error parsing DBC file {filename}: {str(e)}")
    
    # Log what we found
    print(f"Total CAN message types found: {len(message_types)}")
    for msg_name, signals in message_types.items():
        print(f"  {msg_name}: {len(signals)} signals")
    
    return jsonify({
        "status": "success",
        "message_types": message_types
    })

@app.route('/create_alert', methods=['POST'])
def create_alert():
    global alertsCreated
    global alert_definitions

    logger_db = dbconnect()
    data = request.json 
    socketio.emit('big_popup_event', {
    'message': 'Something triggered! Take action!'
})

    alert_id = logger_db.create_alert(data)

    return jsonify({
        "status": "success",
        "message": "Alert created",
        "alert_id": alert_id
    }), 200

@app.route('/get_alerts', methods=['GET'])
def get_alerts():
    alertChecker.fetchActiveAlerts()
    try:
        logger_db = dbconnect()
        query = "SELECT * FROM Alerts"
        alerts = logger_db.query(query)
        return jsonify({"status": "success", "alerts": alerts}), 200
    except Exception as e:
        print(f"Error fetching alerts: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/delete_alert', methods=['POST'])
def delete_alert():
    alert_id = request.json['alert_id']
    logger_db = dbconnect()
    logger_db.delete_alert(alert_id)
    return jsonify({"status": "success", "message": "Alert deleted"}), 200

@app.route('/get_triggered_alerts', methods=['GET'])
def get_triggered_alerts():
    logger_db = dbconnect()
    query = "SELECT * FROM TriggeredAlerts"
    triggered_alerts = logger_db.query(query)
    
    # Convert any bytes in can_message_data to a hex string
    for alert in triggered_alerts:
        if 'can_message_data' in alert and isinstance(alert['can_message_data'], bytes):
            alert['can_message_data'] = alert['can_message_data'].hex()
    
    return jsonify({"status": "success", "triggered_alerts": triggered_alerts}), 200


@socketio.on('connect')
def handle_connect():
    print("Client connected.")


@socketio.on('disconnect')
def handle_disconnect():
    print("Client disconnected.")

