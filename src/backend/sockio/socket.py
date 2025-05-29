from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO
# from backend.input.alertChecker import alertChecker
import backend.input.alertChecker as alertChecker
from ..db_connection import DbConnection as dbconnect
from ..dbcs import get_messages_from_dbc
from ..downsampling import largest_triangle_three_buckets
import os
import backend.input.consumer as consumer
import numpy as np

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

@app.route('/get_data_range', methods=['POST'])
def get_data_range():
    """
    Get data for a specific time range and zoom level.
    The zoom level determines how many points to return.
    """
    data = request.json
    start_time = data.get('start_time')
    end_time = data.get('end_time')
    zoom_level = data.get('zoom_level', 1)  # Higher zoom level = more points
    signal_id = data.get('signal_id')
    
    if not all([start_time, end_time, signal_id]):
        return jsonify({"status": "error", "message": "Missing required parameters"}), 400
    
    try:
        db = dbconnect()
        # Query the database for the time range
        query = """
        SELECT timestamp, value 
        FROM SignalData 
        WHERE signal_id = ? AND timestamp BETWEEN ? AND ?
        ORDER BY timestamp
        """
        results = db.query(query, (signal_id, start_time, end_time))
        
        if not results:
            return jsonify({"status": "success", "data": []}), 200
        
        # Convert to numpy array for downsampling
        data_points = np.array([(r['timestamp'], r['value']) for r in results])
        
        # Calculate number of points based on zoom level
        # Base number of points is 100, multiply by zoom level
        num_points = min(len(data_points), int(100 * zoom_level))
        
        # Downsample the data
        downsampled_data = largest_triangle_three_buckets(data_points, num_points)
        
        # Convert back to list of dicts
        formatted_data = [
            {"timestamp": float(x), "value": float(y)} 
            for x, y in downsampled_data
        ]
        
        return jsonify({
            "status": "success",
            "data": formatted_data
        }), 200
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@socketio.on('request_data_range')
def handle_data_range_request(data):
    """
    Handle requests for data in a specific time range with downsampling.
    
    Args:
        data: Dictionary containing:
            - signal_id: The signal ID to fetch data for
            - start_time: Start time in milliseconds
            - end_time: End time in milliseconds
            - zoom_level: Level of zoom (1-10) to determine downsampling
    """
    try:
        signal_id = data['signal_id']
        start_time = data['start_time']
        end_time = data['end_time']
        zoom_level = data['zoom_level']
        
        # Parse signal ID to get message name and signal name
        message_name, signal_name = signal_id.split('.')
        
        # Query the database for the data in the specified range
        db_conn = dbconnect()
        query = f"""
            SELECT {signal_name}, timeStamp 
            FROM {message_name} 
            WHERE timeStamp BETWEEN {start_time} AND {end_time}
            ORDER BY timeStamp
        """
        results = db_conn.query(query)
        
        if not results:
            socketio.emit('data_range_update', {
                'signal_id': signal_id,
                'data': []
            })
            return
        
        # Convert results to numpy array for downsampling
        data_points = np.array([(r['timeStamp'], r[signal_name]) for r in results])
        
        # Calculate number of points to keep based on zoom level
        # Higher zoom level = more points
        target_points = min(len(data_points), max(100, len(data_points) // (11 - zoom_level)))
        
        # Apply downsampling
        downsampled_data = largest_triangle_three_buckets(data_points, target_points)
        
        # Convert back to list of dictionaries
        formatted_data = [
            {'timestamp': float(x), 'value': float(y)} 
            for x, y in downsampled_data
        ]
        
        # Send the downsampled data back to the client
        socketio.emit('data_range_update', {
            'signal_id': signal_id,
            'data': formatted_data
        })
        
    except Exception as e:
        print(f"Error handling data range request: {str(e)}")
        socketio.emit('data_range_error', {
            'message': f"Error fetching data: {str(e)}"
        })

@socketio.on('connect')
def handle_connect():
    print("Client connected.")


@socketio.on('disconnect')
def handle_disconnect():
    print("Client disconnected.")

