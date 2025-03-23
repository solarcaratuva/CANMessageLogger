from main import socketio, app # the socketio app
from backend.db_connection import DbConnection as dbconnect
from backend.input import consumer
import time
from flask import Flask, render_template, jsonify
from .socket import message_queue  # Import the message queue

logger_db = dbconnect
message_list = []

# Grabs the latest row from each table
@socketio.on('get_latest_row_from_tables')
def handle_data_request():
    try:
        # Need to Add: Logic for keeping track of last send time
        table_names = logger_db.get_table_names()  # Each table in the Database stores 1 type of Can Message
        for table_name in table_names:  # Database has a table for each type of Can Message
            if table_name != "sqlite_sequence":
                try:
                    num_messages = logger_db.query(f"Select COUNT(*) as len FROM {table_name};")  # returns a list of dicts
                    print(f"There are {num_messages[0]['len']} messages in table for Can Message Type: {table_name}")
                    if num_messages[0]['len']:
                        row = logger_db.query(f"SELECT * FROM {table_name} ORDER BY timeStamp DESC LIMIT 1;")
                        timestamp = row[0]['timeStamp']
                        del row[0]['timeStamp']
                        message_dict = row[0]

                        # logic for handling time
                        time_diff = consumer.last_consume_time - (consumer.start_consume_time + timestamp / 1000)

                        socketio.emit('update_large_data', {
                            'table_name': table_name,
                            'timestamp': timestamp,
                            'keys': message_dict,  # signal to signal value dictionary
                            'time_diff': time_diff
                        })

                        # Add to queue instead of emitting directly
                        message_queue.put({
                            'timestamp': timestamp,
                            'data': message_dict,
                            'table': table_name
                        })
                    else:
                        print(f"Table for {table_name} is empty.")
                except Exception as e:
                    print(f"Error processing table {table_name} in handle_data_request: {e}")
    except Exception as e:
        print(f"Error in handle_data_request: {e}")

# Function to emit CAN message data for visualization
def emit_can_message_data(table_name, timestamp, data_dict):
    """
    Add CAN message data to the queue for emission
    
    Args:
        table_name: The name of the table (CAN message type)
        timestamp: The timestamp of the message
        data_dict: Dictionary containing the CAN message data
    """
    try:
        message_queue.put({
            'timestamp': timestamp,
            'data': data_dict,
            'table': table_name
        })
    except Exception as e:
        print(f"Error in emit_can_message_data: {e}")

@app.route('/get_table_names', methods=['GET'])
def get_table_names():
    print("table name check")
    logger_db = dbconnect()
    
    try:
        # Query to get all table names from the SQLite database
        tables = logger_db.query("SELECT name FROM sqlite_master WHERE type='table';")
        
        # Extract table names from the query result
        table_names = [table['name'] for table in tables]
        
        # Return the table names as a JSON response
        return jsonify({"table_names": table_names})
    
    except Exception as e:
        # Log the error and return an error response
        app.logger.error(f"Error fetching table names: {str(e)}")
        return jsonify({"error": "Unable to fetch table names"}), 500


@app.route('/get_latest_message', methods=['GET'])
def get_latest_message_batch():
    print("latest message check")
    logger_db = dbconnect()
    message_batch = []  # Collect messages to return later

    try:
        tables = logger_db.query("SELECT name FROM sqlite_master WHERE type='table';")

        for table in tables:
            table_name = table['name']
            if table_name != "sqlite_sequence":
                try:
                    # Get column names excluding 'count'
                    columns = logger_db.query(f"PRAGMA table_info({table_name});")
                    column_names = [col['name'] for col in columns if col['name'].lower() != 'count']

                    if column_names:  # Ensure we have columns to select
                        column_list = ', '.join(column_names)
                        row = logger_db.query(f"SELECT {column_list} FROM {table_name} ORDER BY timeStamp DESC LIMIT 1;")

                if row:
                    timestamp = row[0]['timeStamp']
                    del row[0]['timeStamp']
                    # print("Time diff:", time_diff)
                    # print("last consume time", consumer.last_consume_time)
                    # print("data timestamp", timestamp)
                    # print("start consume time", consumer.start_consume_time)

                    message_dict = row[0]

                    message_batch.append({'table_name': table_name, 'data': message_dict,
                                          'timestamp': timestamp})  # Append to batch list
                else:
                    timestamp = -1
                    message_dict = {}

                            message_batch.append({'table_name': table_name, 'data': message_dict,
                                                'timestamp': timestamp})  # Append to batch list
                except Exception as e:
                    print(f"Error processing table {table_name} in get_latest_message_batch: {e}")
                

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
    except Exception as e:
        print(f"Error in get_latest_message_batch: {e}")
        return jsonify({'error': str(e)}), 500