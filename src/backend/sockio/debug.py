from main import socketio, app  # the socketio app
from backend.db_connection import DbConnection as dbconnect
from flask import render_template, jsonify

message_list = []

@app.route('/get_table_names', methods=['GET'])
def get_table_names():
    print("table name check")
    try:
        logger_db = dbconnect()
        tables = logger_db.query("SELECT name FROM sqlite_master WHERE type='table';")
        table_names = [table['name'] for table in tables]
        return jsonify({"table_names": table_names})
    except Exception as e:
        app.logger.error(f"Error fetching table names: {str(e)}")
        return jsonify({"error": "Unable to fetch table names"}), 500


@app.route('/get_latest_message', methods=['GET'])
def get_latest_message_batch():
    print("latest message check")
    logger_db = dbconnect()
    message_batch = []

    tables = logger_db.query("SELECT name FROM sqlite_master WHERE type='table';")

    # add tables here to ignore when getting latest message batch
    for table in tables:
        table_name = table['name']
        if table_name == "sqlite_sequence":
            continue
        if table_name == "Alerts":
            continue
        if table_name == "TriggeredAlerts":
            continue


        columns = logger_db.query(f"PRAGMA table_info({table_name});")
        column_names = [col['name'] for col in columns if col['name'].lower() != 'count']

        if not column_names:
            continue

        column_list = ', '.join(column_names)
        row = logger_db.query(f"SELECT {column_list} FROM {table_name} ORDER BY timeStamp DESC LIMIT 1;")

        if row:
            timestamp = row[0].pop('timeStamp', -1)
            message_data = row[0]
        else:
            timestamp = -1
            message_data = {}

        message_batch.append({
            'table_name': table_name,
            'data': message_data,
            'timestamp': timestamp
        })

    if not message_batch:
        return jsonify({'message': 'No new messages'})

    # Prepare response
    messages = message_batch
    table_names = list({msg['table_name'] for msg in message_batch})
    keys = list({key for msg in message_batch for key in msg['data'].keys()})

    message_list.extend(messages)
    if len(message_list) > 1:
        message_list.pop(0)

    return jsonify({
        'messages': messages,
        'table_names': table_names,
        'timestamp': message_batch[0]["timestamp"],
        'keys': keys
    })
