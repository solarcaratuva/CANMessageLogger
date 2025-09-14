import backend.dbcs as dbcs
from backend.sockio.socket import socketio, app 
from backend.db_connection import DbConnection
from flask import jsonify


message_list = list()

@app.route('/get_table_names', methods=['GET'])
def get_table_names():
    """ Returns the names of all tables in the database. """

    try:
        logger_db = DbConnection()
        tables = logger_db.query("SELECT name FROM sqlite_master WHERE type='table';")
        table_names = [table['name'] for table in tables]
        return jsonify({"table_names": table_names})
    except Exception as e:
        app.logger.error(f"Error fetching table names: {str(e)}")
        return jsonify({"error": "Unable to fetch table names"}), 500


@app.route('/get_latest_message', methods=['GET'])
def get_latest_message_batch():
    """ Returns the latest message for each message (table) in the database. """

    logger_db = DbConnection()
    message_batch = list()

    tables = logger_db.query("SELECT name FROM sqlite_master WHERE type='table';")

    # add tables here to ignore when getting latest message batch
    IGNORED_TABLES = ["sqlite_sequence", "Alerts", "TriggeredAlerts"]
    for table in tables:
        table_name = table['name']
        if table_name in IGNORED_TABLES:
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
            message_data = dict()

        message_data_with_units = {}
        dbc_msg = None
        for dbc in dbcs.DBCs:
            for msg in dbc.messages:
                if msg.name == table_name:
                    dbc_msg = msg
                    break
            if dbc_msg:
                break
        if dbc_msg:
            for signal in dbc_msg.signals:
                val = message_data.get(signal.name)
                message_data_with_units[signal.name] = {"value": val, "unit": signal.unit}
        else:
            for k, v in message_data.items():
                message_data_with_units[k] = {"value": v, "unit": None}

        message_batch.append({
            'table_name': table_name,
            'data': message_data_with_units,
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
