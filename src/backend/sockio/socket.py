from flask import Flask, render_template, jsonify, request
from flask_socketio import SocketIO, emit
from backend.db_connection import DbConnection
import time
import threading
import queue

app = Flask(__name__, template_folder='../../frontend/html', static_folder='../../frontend/static')
socketio = SocketIO(app, cors_allowed_origins="*")

# Flag to track if we're already processing data for motor_data_update
is_processing_motor_data = False
processing_lock = threading.Lock()

# Queue for storing message data to be emitted
message_queue = queue.Queue()


@app.route('/')
def index():
    # Render the HTML with the large_data passed in
    return render_template('debug.html') # DELETED message_list


@app.route('/graphs')
def graph_view():
    return render_template('graphs.html')


@app.route('/get_latest_message', methods=['GET'])
def get_latest_message():
    """
    API endpoint to fetch the latest message from each table
    Returns a JSON object with an array of latest messages
    """
    try:
        db_conn = DbConnection()
        
        # Get all table names
        tables_query = "SELECT name FROM sqlite_master WHERE type='table' AND name != 'sqlite_sequence';"
        tables = db_conn.query(tables_query)
        
        messages = []
        
        for table in tables:
            table_name = table['name']
            try:
                # Get the latest message from this table
                query = f"SELECT * FROM {table_name} ORDER BY timeStamp DESC LIMIT 1;"
                row = db_conn.query(query)
                
                if row and len(row) > 0:
                    timestamp = row[0]['timeStamp']
                    # Remove timeStamp and count from the data
                    data_dict = {k: v for k, v in row[0].items() if k != 'timeStamp' and k != 'count'}
                    
                    messages.append({
                        'table_name': table_name,
                        'timestamp': timestamp,
                        'data': data_dict
                    })
            except Exception as e:
                print(f"Error getting latest message from table {table_name}: {e}")
        
        return jsonify({'messages': messages})
    
    except Exception as e:
        print(f"Error in get_latest_message: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/available-tables', methods=['GET'])
def get_available_tables():
    """
    API endpoint to fetch all available tables in the database
    """
    try:
        db_conn = DbConnection()
        query = "SELECT name FROM sqlite_master WHERE type='table' AND name != 'sqlite_sequence';"
        rows = db_conn.query(query)
        tables = [row['name'] for row in rows]
        return jsonify(tables)
    except Exception as e:
        print(f"Error fetching tables: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/table-fields', methods=['GET'])
def get_table_fields():
    """
    API endpoint to fetch all fields in a specific table
    """
    table_name = request.args.get('table')
    if not table_name:
        return jsonify({'error': 'Table name is required'}), 400

    try:
        db_conn = DbConnection()
        query = f"PRAGMA table_info({table_name});"
        rows = db_conn.query(query)
        fields = [row['name'] for row in rows if row['name'] != 'timeStamp' and row['name'] != 'count']  # Exclude timeStamp and count
        return jsonify(fields)
    except Exception as e:
        print(f"Error fetching fields for table {table_name}: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/table-data', methods=['GET'])
def get_table_data():
    """
    API endpoint to fetch data for selected fields from a specific table
    """
    table_name = request.args.get('table')
    fields = request.args.get('fields')
    full = request.args.get('full', 'false').lower() == 'true'  # Get full parameter, default to false
    
    if not table_name:
        return jsonify({'error': 'Table name is required'}), 400
    if not fields:
        return jsonify({'error': 'Fields are required'}), 400

    try:
        selected_fields = fields.split(',')
        db_conn = DbConnection()

        # Add timeStamp to the select fields
        select_fields = ['timeStamp'] + selected_fields
        
        # Fetch all data with timestamps
        query = f"""
        SELECT {', '.join(select_fields)}
        FROM {table_name}
        ORDER BY timeStamp ASC
        """
        
        # Only add LIMIT if not requesting full history
        if not full:
            query += " LIMIT 1000"
        
        rows = db_conn.query(query)

        if not rows:
            return jsonify([])  # Return empty array if no data

        # Format data
        data = [
            {'timestamp': row['timeStamp'], **{field: row[field] for field in selected_fields}}
            for row in rows
        ]
        return jsonify(data)
    except Exception as e:
        print(f"Error fetching data for table {table_name}, fields {fields}: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/motorcommands-fields', methods=['GET'])
def get_motorcommands_fields():
    """
    API endpoint to fetch all fields in the MotorCommands table.
    """
    try:
        db_conn = DbConnection()
        query = "PRAGMA table_info(MotorCommands);"
        rows = db_conn.query(query)
        fields = [row['name'] for row in rows if row['name'] != 'timeStamp' and row['name'] != 'count']  # Exclude timeStamp and count
        return jsonify(fields)
    except Exception as e:
        print(f"Error fetching fields: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/motorcommands-data', methods=['GET'])
def get_motorcommands_data():
    """
    API endpoint to fetch all data for selected fields.
    """
    fields = request.args.get('fields')
    if not fields:
        return jsonify({'error': 'Fields are required'}), 400

    try:
        selected_fields = fields.split(',')
        db_conn = DbConnection()

        # Fetch all data and include timestamps
        query = f"""
        SELECT timeStamp, {', '.join(selected_fields)}
        FROM MotorCommands
        ORDER BY timeStamp ASC
        LIMIT 1000
        """
        rows = db_conn.query(query)

        if not rows:
            return jsonify([])  # Return empty array if no data

        # Format data
        data = [
            {'timestamp': row['timeStamp'], **{field: row[field] for field in selected_fields}}
            for row in rows
        ]
        return jsonify(data)
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500


@socketio.on('connect')
def handle_connect():
    print("Client connected.")


@socketio.on('subscribe_motor_data')
def handle_motor_subscription():
    """
    Handle real-time motor data subscription from the log file
    This replaces the random data generation with actual CAN message data
    """
    global is_processing_motor_data
    
    print("Client subscribed to motor data")

    # Only start the background task if we're not already processing
    with processing_lock:
        if not is_processing_motor_data:
            is_processing_motor_data = True
            # Start one task for querying the database
            socketio.start_background_task(target=collect_can_data_for_visualization)
            # Start another task for emitting data to clients
            socketio.start_background_task(target=emit_queued_data)


def collect_can_data_for_visualization():
    """
    Background task that fetches the latest CAN message data from the database
    and adds it to the queue for emission
    """
    global is_processing_motor_data
    
    try:
        print("Starting CAN data collection for visualization")
        db_conn = DbConnection()
        
        # Keep track of last processed time for each table
        last_processed = {}
        
        while is_processing_motor_data:
            # Get all table names - do this only once every few loops to reduce db access
            tables = db_conn.query("SELECT name FROM sqlite_master WHERE type='table';")
            
            for table in tables:
                table_name = table['name']
                if table_name != "sqlite_sequence":
                    try:
                        # Get the latest message from this table
                        query = f"SELECT * FROM {table_name} ORDER BY timeStamp DESC LIMIT 1;"
                        row = db_conn.query(query)
                        
                        if row:
                            timestamp = row[0]['timeStamp']
                            
                            # Only process if this is new data
                            if table_name not in last_processed or timestamp > last_processed[table_name]:
                                last_processed[table_name] = timestamp
                                data_dict = {k: v for k, v in row[0].items() if k != 'timeStamp' and k != 'count'}
                                
                                # Add table prefix to each field name to avoid collisions
                                prefixed_data = {f"{table_name}.{k}": v for k, v in data_dict.items()}
                                
                                # Add to queue instead of emitting directly
                                message_queue.put({
                                    'timestamp': timestamp,
                                    'data': prefixed_data,
                                    'table': table_name
                                })
                    except Exception as e:
                        print(f"Error processing table {table_name}: {e}")
            
            # Wait before checking for new data - longer interval to reduce db access
            socketio.sleep(0.2)  # 200ms delay
    
    except Exception as e:
        print(f"Error in collect_can_data_for_visualization: {str(e)}")
        import traceback
        print(traceback.format_exc())
    
    finally:
        with processing_lock:
            is_processing_motor_data = False
        print("Stopped CAN data collection for visualization")


def emit_queued_data():
    """
    Background task that emits queued data to clients
    """
    global is_processing_motor_data
    
    try:
        print("Starting data emission task")
        
        while is_processing_motor_data:
            try:
                # Non-blocking get with timeout
                try:
                    data = message_queue.get(block=True, timeout=0.1)
                    # Emit the data to clients
                    socketio.emit('motor_data_update', {
                        'timestamp': data['timestamp'],
                        'data': data['data'],
                        'table': data['table']
                    })
                    message_queue.task_done()
                except queue.Empty:
                    # No data in queue, just continue
                    pass
            except Exception as e:
                print(f"Error emitting data: {e}")
            
            # Small delay to control emission rate
            socketio.sleep(0.05)  # 50ms delay
    
    except Exception as e:
        print(f"Error in emit_queued_data: {str(e)}")
        import traceback
        print(traceback.format_exc())
    
    finally:
        with processing_lock:
            is_processing_motor_data = False
        print("Stopped data emission task")


@socketio.on('disconnect')
def handle_disconnect():
    print("Client disconnected.")
    # When clients disconnect, consider stopping the background task if no clients are left
    if not socketio.server.manager.rooms:  # Check if there are any connected clients
        global is_processing_motor_data
        with processing_lock:
            is_processing_motor_data = False

