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

@app.route('/get_visible_range', methods=['POST'])
def get_visible_range():
    """
    REST endpoint for bulk request of multiple signals over a visible time window.
    Replaces the socketio-based approach with HTTP polling.
    
    Expects JSON: {
      signal_ids: ["Message.signal", ...],
      start_time: number (seconds),
      end_time: number (seconds),
      zoom_level: 1..10,
      viewport_width: number
    }
    
    Returns JSON with x/y arrays per signal.
    """
    try:
        data = request.json
        signal_ids = data.get('signal_ids', [])
        start_time = data.get('start_time')
        end_time = data.get('end_time')
        zoom_level = data.get('zoom_level', 1)
        viewport_width = data.get('viewport_width', 1200)

        if not signal_ids or start_time is None or end_time is None:
            return jsonify({"status": "error", "message": "Missing required parameters"}), 400

        db_conn = dbconnect()

        # Determine target points per signal using same cap logic as socketio handlers
        safe_div = max(1, (11 - int(zoom_level)))
        pixel_cap = max(500, int(3 * int(viewport_width)))
        absolute_cap = 2500

        results_by_signal = {}
        total_raw_points = 0
        total_processed_points = 0
        
        for sid in signal_ids:
            try:
                message_name, signal_name = sid.split('.')
                query = f"""
                    SELECT {signal_name}, timeStamp
                    FROM {message_name}
                    WHERE timeStamp BETWEEN {start_time} AND {end_time}
                    ORDER BY timeStamp
                """
                rows = db_conn.query(query)
                if not rows:
                    results_by_signal[sid] = { 'x': [], 'y': [] }
                    continue
                
                # Convert to numpy array for downsampling and drop NaN/None
                dp = np.array([(r['timeStamp'], r[signal_name]) for r in rows], dtype=float)
                raw_points = len(dp)
                total_raw_points += raw_points
                
                if dp.size:
                    finite_mask = np.isfinite(dp[:, 0]) & np.isfinite(dp[:, 1])
                    dp = dp[finite_mask]
                
                # Calculate target points
                base_points = max(100, len(dp) // safe_div)
                target_points = min(len(dp), base_points, pixel_cap, absolute_cap)
                
                # Pre-sample if extremely large dataset
                if len(dp) > target_points * 50:
                    step = max(1, len(dp) // (target_points * 20))
                    dp = dp[::step]
                
                # Apply downsampling
                ds = largest_triangle_three_buckets(dp, target_points)
                processed_points = len(ds)
                total_processed_points += processed_points
                
                print(f"🔍 Signal {sid}: {raw_points} raw → {processed_points} processed points")
                
                results_by_signal[sid] = {
                    'x': [float(pt[0]) for pt in ds],
                    'y': [float(pt[1]) for pt in ds]
                }
            except Exception as inner_e:
                print(f"Error processing signal {sid}: {str(inner_e)}")
                results_by_signal[sid] = { 'x': [], 'y': [] }

        # Log overall processing summary
        print(f"📈 Range Query Processing Summary:")
        print(f"   Time range: {start_time:.2f}s - {end_time:.2f}s ({end_time - start_time:.2f}s duration)")
        print(f"   Signals processed: {len(signal_ids)}")
        print(f"   Total raw data points: {total_raw_points:,}")
        print(f"   Total processed points: {total_processed_points:,}")
        if total_raw_points > 0:
            compression_ratio = (1 - total_processed_points / total_raw_points) * 100
            print(f"   Compression: {compression_ratio:.1f}% reduction")
        print(f"   Zoom level: {zoom_level}, Viewport: {viewport_width}px")

        return jsonify({
            "status": "success",
            "signals": results_by_signal
        }), 200
        
    except Exception as e:
        print(f"Error in get_visible_range: {str(e)}")
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
        zoom_level = data.get('zoom_level', 1)
        viewport_width = data.get('viewport_width', 1200)
        request_id = data.get('request_id')
        
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
        
        # Convert results to numpy array for downsampling and drop NaN/None
        data_points = np.array([(r['timeStamp'], r[signal_name]) for r in results], dtype=float)
        if data_points.size:
            finite_mask = np.isfinite(data_points[:, 0]) & np.isfinite(data_points[:, 1])
            data_points = data_points[finite_mask]
        
        # Calculate number of points to keep based on zoom level and viewport width
        safe_div = max(1, (11 - int(zoom_level)))
        base_points = max(100, len(data_points) // safe_div)
        pixel_cap = max(500, int(3 * int(viewport_width)))
        absolute_cap = 2500
        target_points = min(len(data_points), base_points, pixel_cap, absolute_cap)

        # If rows are extremely large relative to target, pre-sample indices before LTTB to reduce memory/CPU
        if len(data_points) > target_points * 50:
            step = max(1, len(data_points) // (target_points * 20))
            data_points = data_points[::step]
        
        # Apply downsampling
        downsampled_data = largest_triangle_three_buckets(data_points, target_points)
        
        # Send the downsampled data back to the client (compact arrays)
        x = [float(pt[0]) for pt in downsampled_data]
        y = [float(pt[1]) for pt in downsampled_data]
        socketio.emit('data_range_update', {
            'signal_id': signal_id,
            'x': x,
            'y': y,
            'request_id': request_id
        })
        
    except Exception as e:
        print(f"Error handling data range request: {str(e)}")
        socketio.emit('data_range_error', {
            'message': f"Error fetching data: {str(e)}"
        })

@socketio.on('request_visible_range')
def handle_visible_range_request(data):
    """
    Bulk request for multiple signals over a visible time window.
    Expects: {
      signal_ids: ["Message.signal", ...],
      start_time: number (seconds),
      end_time: number (seconds),
      zoom_level: 1..10,
      viewport_width: number,
      request_id: number
    }
    Returns one payload with x/y arrays per signal.
    """
    try:
        signal_ids = data.get('signal_ids', [])
        start_time = data.get('start_time')
        end_time = data.get('end_time')
        zoom_level = data.get('zoom_level', 1)
        viewport_width = data.get('viewport_width', 1200)
        request_id = data.get('request_id')

        if not signal_ids or start_time is None or end_time is None:
            socketio.emit('data_range_error', { 'message': 'Missing required parameters' })
            return

        db_conn = dbconnect()

        # Determine target points per signal using same cap logic
        safe_div = max(1, (11 - int(zoom_level)))
        pixel_cap = max(500, int(3 * int(viewport_width)))
        absolute_cap = 2500

        results_by_signal = {}
        for sid in signal_ids:
            try:
                message_name, signal_name = sid.split('.')
                query = f"""
                    SELECT {signal_name}, timeStamp
                    FROM {message_name}
                    WHERE timeStamp BETWEEN {start_time} AND {end_time}
                    ORDER BY timeStamp
                """
                rows = db_conn.query(query)
                if not rows:
                    results_by_signal[sid] = { 'x': [], 'y': [] }
                    continue
                dp = np.array([(r['timeStamp'], r[signal_name]) for r in rows], dtype=float)
                if dp.size:
                    finite_mask = np.isfinite(dp[:, 0]) & np.isfinite(dp[:, 1])
                    dp = dp[finite_mask]
                base_points = max(100, len(dp) // safe_div)
                target_points = min(len(dp), base_points, pixel_cap, absolute_cap)
                if len(dp) > target_points * 50:
                    step = max(1, len(dp) // (target_points * 20))
                    dp = dp[::step]
                ds = largest_triangle_three_buckets(dp, target_points)
                results_by_signal[sid] = {
                    'x': [float(pt[0]) for pt in ds],
                    'y': [float(pt[1]) for pt in ds]
                }
            except Exception as inner_e:
                results_by_signal[sid] = { 'x': [], 'y': [] }

        socketio.emit('visible_range_update', {
            'signals': results_by_signal,
            'request_id': request_id
        })
    except Exception as e:
        print(f"Error handling visible range request: {str(e)}")
        socketio.emit('data_range_error', { 'message': f"Error fetching visible range: {str(e)}" })

@socketio.on('connect')
def handle_connect():
    print("Client connected.")


@socketio.on('disconnect')
def handle_disconnect():
    print("Client disconnected.")

