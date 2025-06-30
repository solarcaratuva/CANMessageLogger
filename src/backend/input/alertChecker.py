# from src.backend.DbConnection import DbConnection as dbconnect

# from CANMessageLogger.src.backend import CanMessage as CanMessage
from backend.db_connection import DbConnection as dbconnect
from backend.can_message import decode_message
import json
import time
from datetime import datetime


socketio_instance = None  

def set_socketio(socketio):
    """Set the global socketio_instance so we can emit from here."""
    global socketio_instance
    socketio_instance = socketio


def fetchActiveAlerts():
    """
    Fetches all active alerts from the database
    """
    logger_db = dbconnect()
    query = "SELECT * FROM Alerts"
    alerts = logger_db.query(query)
    return alerts

def checkAlertsAgainstCanMsg(can_message): #can_message is the cm_tup from logfileProd.py
    """
    Checks the given CAN message against all active alerts
    """
    
    logger_db = dbconnect()
    can_message_id = can_message[0]
    can_message_data = can_message[1]
    can_message_timestamp = can_message[2]
    decodedMessage = decode_message(can_message_id, can_message_data, can_message_timestamp)
    

    if decodedMessage is None:
        return
    
    automatic_faults_json = "faultMessages.json" 
    with open(automatic_faults_json, "r") as f:
        data = json.load(f)

    all_faults = [fault for faults in data["automatic_faults"].values() for fault in faults]

    for fault in all_faults:
        if (fault in decodedMessage.sigDict and decodedMessage.sigDict[fault] == 1):
            logger_db.add_triggered_alert(-1, "", datetime.now().strftime('%Y-%m-%d %H:%M:%S'), can_message_id, can_message_data, can_message_timestamp, fault, "AUTO FAULT")

            if socketio_instance:
                socketio_instance.emit('big_popup_event', {
                    'message': f"Auto Fault Triggered: {fault}"
                })
            else:
                print("SocketIO instance not set. Unable to emit for AUTO FAULT.")



    activeAlerts = fetchActiveAlerts()
    for alert in activeAlerts:
        signal = alert['field']
        alertType = alert['type']
        category = alert['category']

        

        if alertType == 'bool':
            bool_value = json.loads(alert['bool_value'])
            if signal in decodedMessage.sigDict and decodedMessage.sigDict[signal] == bool_value:
               
                fail_cause = f"BOOL Alert {alert['name']} triggered: {decodedMessage.sigDict[signal]} == {bool_value}"
                logger_db.add_triggered_alert(alert['id'], category, datetime.now().strftime('%Y-%m-%d %H:%M:%S'), can_message_id, can_message_data, can_message_timestamp, signal, fail_cause)

                if socketio_instance:
                    socketio_instance.emit('big_popup_event', {
                        'message': f"Boolean Alert Triggered: {alert['name']}!"
                    })
                else:
                    print("SocketIO instance not set. Unable to emit.")
        
        elif alertType == 'int':
            comparisons = json.loads(alert['comparisons_json'])
            for comparison in comparisons:
                if (signal in decodedMessage.sigDict):
                    decoded_val = int(decodedMessage.sigDict[signal])
                    comp_val = int(comparison['value'])
                    operator = comparison['operator']

                    # the alert condition was not met, so no alert should be triggered
                    if not eval(f"{decoded_val} {operator} {comp_val}"):
                        continue                        

                    # the alert condition was met, so trigger the alert
                    fail_cause = f"{decoded_val} {comparison['operator']} {comp_val}"
                    logger_db.add_triggered_alert(alert['id'], category, datetime.now().strftime('%Y-%m-%d %H:%M:%S'), can_message_id, can_message_data, can_message_timestamp, signal, fail_cause)
                    if socketio_instance:
                        socketio_instance.emit('big_popup_event', {
                            'message': f"INT Alert {alert['name']} triggered: {decoded_val} != {comp_val}"
                        })
                    