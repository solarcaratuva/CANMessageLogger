import sqlite3
from flask import Flask, request, render_template, jsonify
from flask_socketio import SocketIO
import backend.db_access as db_access
import backend.DbConnection as dbconnect
import backend.dbc_code as dbc_code
import input.alertChecker as alertChecker
import os
import time
import cantools
from input import consumer, logfileProd
from functools import partial

app = Flask(__name__, template_folder='frontend/html', static_folder='frontend/static')
socketio = SocketIO(app, cors_allowed_origins="*")

# List to store messages to display on the front end
message_list = []

alert_definitions = {} # {1: alert1, 2: alert2, 3: alert3, ...}
alertsCreated = 0

@app.route('/')
def index():
    # Render the HTML with the large_data passed in
    return render_template('debug.html', large_data=message_list)

@app.route('/alert_manager')
def alert_manager():
    return render_template('alert_manager.html')

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

    dbc_path = "src/backend/Rivanna3.dbc"
    
    result = dbc_code.get_messages_from_dbc(dbc_path)
    print("result: ", result)

    return jsonify({'message': result})

@app.route('/create_alert', methods=['POST'])
def create_alert():
    global alertsCreated
    global alert_definitions

    logger_db = dbconnect.DbConnection()
    data = request.json

    

    alert_id = logger_db.create_alert(data)
    print("created the alert: ", data, alert_id)

    return jsonify({
        "status": "success",
        "message": "Alert created",
        "alert_id": alert_id
    }), 200

@app.route('/get_alerts', methods=['GET'])
def get_alerts():
    print("get alert ")
    alertChecker.fetchActiveAlerts()
    print("fetched alerts")
    try:
        logger_db = dbconnect.DbConnection()
        query = "SELECT * FROM Alerts"
        alerts = logger_db.query(query)
        return jsonify({"status": "success", "alerts": alerts}), 200
    except Exception as e:
        print(f"Error fetching alerts: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/delete_alert', methods=['POST'])
def delete_alert():
    alert_id = request.json['alert_id']
    logger_db = dbconnect.DbConnection()
    logger_db.delete_alert(alert_id)
    return jsonify({"status": "success", "message": "Alert deleted"}), 200



@socketio.on('connect')
def handle_connect():
    print("Client connected.")

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
    # CHANGE THIS BACK message_file_path = os.path.abspath('message.txt')  # Absolute path to avoid path issues
    message_file_path = os.path.abspath('message_testing.txt')
    database_path = os.path.abspath('src/can_database.sqlite')  # Absolute path to the SQLite database

    # Check if the paths exist
    if not os.path.exists(message_file_path):
        print(f"Message file path does not exist: {message_file_path}")
    if not os.path.exists(database_path):
        print(f"Database path does not exist: {database_path}") 

    dbconnect.DbConnection.setup_the_db_path(database_path)
    logger_db = dbconnect.DbConnection()
    logger_db.setup_the_tables()

    socketio.start_background_task(target=partial(logfileProd.process_logfile_live, "message_testing.txt")) #CHANGE THIS BACK
    socketio.start_background_task(target=consumer.process_data_live)  # If it doesn't take arguments

    table_names = logger_db.get_table_names()  # Placeholder for your table names


if __name__ == '__main__':
    socketio.start_background_task(target=start_message_processing)
    socketio.run(app, debug=True)
