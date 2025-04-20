from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO
# from backend.input.alertChecker import alertChecker
import backend.input.alertChecker as alertChecker
from ..db_connection import DbConnection as dbconnect
from ..dbcs import get_messages_from_dbc

app = Flask(__name__, template_folder='../../frontend/html', static_folder='../../frontend/static')
socketio = SocketIO(app, cors_allowed_origins="*")

alertChecker.set_socketio(socketio)
# List to store messages to display on the front end
message_list = []
alert_definitions = {} # {1: alert1, 2: alert2, 3: alert3, ...}
alertsCreated = 0


@app.route('/')
def index():
    # Render the HTML with the large_data passed in
    return render_template('debug.html') # DELETED message_list

@app.route('/alert_manager')
def alert_manager():
    return render_template('alert_manager.html')

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
    print("result: ", result)

    return jsonify({'message': result})

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
        logger_db = dbconnect()
        query = "SELECT * FROM Alerts"
        alerts = logger_db.query(query)
        print("fetching alerts from within python app.py: ", alerts, "\n\n\n", type(alerts))
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
        # print("ALERT THAT GOT FETCHED: ", alert)
        if 'can_message_data' in alert and isinstance(alert['can_message_data'], bytes):
            alert['can_message_data'] = alert['can_message_data'].hex()
    
    print("fetching triggered alerts from within python app.py: ")
    return jsonify({"status": "success", "triggered_alerts": triggered_alerts}), 200


@socketio.on('connect')
def handle_connect():
    print("Client connected.")


@socketio.on('disconnect')
def handle_disconnect():
    print("Client disconnected.")

