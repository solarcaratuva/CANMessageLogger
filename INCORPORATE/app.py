from flask import Flask, render_template, jsonify, request
from flask_socketio import SocketIO, emit
import backend.db_access as db_access
import backend.DbConnection as dbconnect
import os
import time
from input import consumer, logfileProd
from functools import partial
import random

app = Flask(__name__, template_folder='frontend/html', static_folder='frontend/static')
socketio = SocketIO(app, cors_allowed_origins="*")

# List to store messages to display on the front end
message_list = []

@app.route('/')
def index():
    # Render the HTML with the large_data passed in
    return render_template('debug.html', large_data=message_list)

@app.route('/graphs')
def graph_view():
    return render_template('graphs.html', large_data=message_list)


@app.route('/api/motorcommands-fields', methods=['GET'])
def get_motorcommands_fields():
    """
    API endpoint to fetch all fields in the MotorCommands table.
    """
    try:
        logger_db = dbconnect.DbConnection()
        query = "PRAGMA table_info(MotorCommands);"
        rows = logger_db.query(query)
        fields = [row['name'] for row in rows if row['name'] != 'timeStamp']  # Exclude timeStamp
        return jsonify(fields)
    except Exception as e:
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
        logger_db = dbconnect.DbConnection()

        # Fetch all data and include timestamps
        query = f"""
        SELECT timeStamp, {', '.join(selected_fields)}
        FROM MotorCommands
        ORDER BY timeStamp ASC
        """
        rows = logger_db.query(query)

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
    """Handle real-time motor data subscription with random values"""
    print("Client subscribed to motor data")
    
    try:
        while True:
            # Generate random throttle value between 0 and 256
            throttle = random.randint(0, 256)
            timestamp = time.time()
            
            data = {
                'timestamp': timestamp,
                'data': {
                    'throttle_pedal': throttle
                }
            }
            print(f"Emitting data: {data}")  # Debug log
            emit('motor_data_update', data)
            
            socketio.sleep(0.1)  # Update every 2 seconds
            
    except Exception as e:
        print(f"Error in motor data subscription: {str(e)}")
        import traceback
        print(traceback.format_exc())

@socketio.on('disconnect')
def handle_disconnect():
    print("Client disconnected.")

@app.route('/get_latest_message', methods=['GET'])
def get_latest_message_batch():
    logger_db = dbconnect.DbConnection()
    message_batch = []  # Collect messages to return later

    tables = logger_db.query("SELECT name FROM sqlite_master WHERE type='table';")
    
    for table in tables:
        table_name = table['name']
        if table_name != "sqlite_sequence":
            result = logger_db.query(f"SELECT COUNT(*) as len FROM {table_name};")
            print(result[0]['len'], table_name)
            row = 0
            if result[0]['len']:
                row = logger_db.query(f"SELECT * FROM {table_name} ORDER BY timeStamp DESC LIMIT 1;")
            else:
                print(f"Table for {table_name} is empty.")
            if row:
                timestamp = row[0]['timeStamp']
                del row[0]['timeStamp']
                message_dict = row[0]

                message_batch.append({'table_name': table_name, 'data': message_dict,
                                      'timestamp': timestamp})  # Append to batch list

    # Prepare the response structure
    if message_batch:
        # Collect messages, table names (keys), and timestamps
        messages = []
        table_names = []
        keys = []
        for message in message_batch:
            # Add message data to message list
            messages.append({
                "table_name": message["table_name"],
                "data": message["data"],
                "timestamp": message["timestamp"]
            })
            # Add the table name to the table names list
            table_names.append(message["table_name"])
            # Collect keys from the data
            if "data" in message:
                keys.extend(list(message["data"].keys()))

        # Ensure that we only keep unique table names and keys
        table_names = list(set(table_names))
        keys = list(set(keys))

        # Append the new messages to the global message list
        message_list.extend(messages)

        # Limit to the most recent 1 message in memory
        if len(message_list) > 1:
            message_list.pop(0)

        return jsonify({
            'messages': messages,
            'table_names': table_names,
            'timestamp': message_batch[0]["timestamp"] if message_batch else '',
            'keys': keys
        })
    else:
        return jsonify({'message': 'No new messages'})


def start_message_processing():
    # Ensure the file paths are correct and the app can access them
    message_file_path = os.path.abspath('message.txt')  # Absolute path to avoid path issues
    database_path = os.path.abspath('src/can_database.sqlite')  # Absolute path to the SQLite database

    # Check if the paths exist
    if not os.path.exists(message_file_path):
        print(f"Message file path does not exist: {message_file_path}")
    if not os.path.exists(database_path):
        print(f"Database path does not exist: {database_path}") 

    dbconnect.DbConnection.setup_the_db_path(database_path)
    logger_db = dbconnect.DbConnection()
    logger_db.setup_the_tables()

    socketio.start_background_task(target=partial(logfileProd.process_logfile_live, "message.txt"))
    socketio.start_background_task(target=consumer.process_data_live)  # If it doesn't take arguments

    table_names = logger_db.get_table_names()  # Placeholder for your table names


if __name__ == '__main__':
    socketio.start_background_task(target=start_message_processing)
    socketio.run(app, debug=True, port=5050)
