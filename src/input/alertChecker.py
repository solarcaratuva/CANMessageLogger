# from src.backend.DbConnection import DbConnection as dbconnect

# from CANMessageLogger.src.backend import CanMessage as CanMessage
from backend import DbConnection as dbconnect
from backend import CanMessage as CanMessage
import json


def fetchActiveAlerts():
    """
    Fetches all active alerts from the database
    """
    logger_db = dbconnect.DbConnection()
    query = "SELECT * FROM Alerts"
    alerts = logger_db.query(query)
    print("ALERTS THAT GOT FETCHED: ", alerts)
    return alerts

def checkAlertsAgainstCanMsg(can_message): #can_message is the cm_tup from logfileProd.py
    """
    Checks the given CAN message against all active alerts
    """
    decodedMessage = CanMessage.decode_message(can_message[0], can_message[1], can_message[2])

    if decodedMessage is None:
        return

    print("decoded can message: ", decodedMessage.sigDict)
    activeAlerts = fetchActiveAlerts()
    for alert in activeAlerts:
        print(f"Alert viewing: {alert}")
        signal = alert['field']
        alertType = alert['type']

        

        if alertType == 'bool':
            bool_value = json.loads(alert['bool_value'])
            print(bool_value, str(type(bool_value)))
            if signal in decodedMessage.sigDict and decodedMessage.sigDict[signal] == bool_value:
               
                print("value from the alert", bool_value, type(bool_value))
                print("value from the decoded can", decodedMessage.sigDict[signal], type(decodedMessage.sigDict[signal]))
                print(f"ALERT TRIGGERED: {alert}")
            
            else:
                print("Alert passed")
        
        elif alertType == 'int':
            comparisons = json.loads(alert['comparisons_json'])

            for comparison in comparisons:
                print("THIS comparison: ", comparison)
                if comparison['operator'] == '<':
                    if signal in decodedMessage.sigDict and int(decodedMessage.sigDict[signal]) < int(comparison['value']):
                        print(f"ALERT TRIGGERED: {alert}")
                elif comparison['operator'] == '>':
                    if signal in decodedMessage.sigDict and int(decodedMessage.sigDict[signal]) > int(comparison['value']):
                        print(f"ALERT TRIGGERED: {alert}")
                else:
                    print(f"Alert passed:  {alert}")
           