from backend.db_connection import DbConnection
from backend.can_message import CanMessage
import json
from datetime import datetime

def fetchActiveAlerts():
    """
    Fetches all active alerts from the database
    """

    logger_db = DbConnection()
    query = "SELECT * FROM Alerts"
    alerts = logger_db.query(query)
    return alerts


def checkAlertsAgainstCanMsg(can_message: CanMessage, raw_data: bytes): 
    """
    Checks the given CAN message against all active alerts
    """
    
    logger_db = DbConnection()
    
    automatic_faults_json = "faultMessages.json" 
    with open(automatic_faults_json, "r") as f:
        data = json.load(f)
    all_faults = [fault for faults in data["automatic_faults"].values() for fault in faults]

    for fault in all_faults:
        if (fault in can_message.sigDict and can_message.sigDict[fault] == 1):
            logger_db.add_triggered_alert(-1, "", datetime.now().strftime('%Y-%m-%d %H:%M:%S'), can_message.messageId, raw_data, can_message.timeStamp, fault, "AUTO FAULT")

    activeAlerts = fetchActiveAlerts()
    for alert in activeAlerts:
        signal = alert['field']
        alertType = alert['type']
        category = alert['category']

        if alertType == 'bool':
            bool_value = json.loads(alert['bool_value'])
            if signal in can_message.sigDict and can_message.sigDict[signal] == bool_value:
               
                fail_cause = f"BOOL Alert {alert['name']} triggered: {can_message.sigDict[signal]} == {bool_value}"
                logger_db.add_triggered_alert(alert['id'], category, datetime.now().strftime('%Y-%m-%d %H:%M:%S'), can_message.messageId, raw_data, can_message.timeStamp, signal, fail_cause)
        
        elif alertType == 'int':
            comparisons = json.loads(alert['comparisons_json'])
            for comparison in comparisons:
                if (signal in can_message.sigDict):
                    decoded_val = int(can_message.sigDict[signal])
                    comp_val = int(comparison['value'])
                    operator = comparison['operator']

                    # the alert condition was not met, so no alert should be triggered
                    if not eval(f"{decoded_val} {operator} {comp_val}"):
                        continue                        

                    # the alert condition was met, so trigger the alert
                    fail_cause = f"{decoded_val} {comparison['operator']} {comp_val}"
                    logger_db.add_triggered_alert(alert['id'], category, datetime.now().strftime('%Y-%m-%d %H:%M:%S'), can_message.messageId, raw_data, can_message.timeStamp, signal, fail_cause)
