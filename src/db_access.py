import sqlite3

#all
def get_auxiliary_data(): # returns auxiliary voltage (INTEGER)
    latest_auxiliary_data_dict = {}
    connection = sqlite3.connect('') 
    connection.row_factory = sqlite3.Row
    query = "SELECT * FROM MotorCommands ORDER BY Time DESC LIMIT 1"
    latest_auxiliary_data = connection.execute(query).fetchone()
    if latest_auxiliary_data:
        latest_auxiliary_data_dict = dict(latest_auxiliary_data)
    return latest_auxiliary_data_dict

def get_latest_motor_data():
    """
    Time : Text
    Braking: Bool
    Regen Drive: Bool
    Manual Drive: Bool
    Cruise Drive: Bool
    Brake Pedal: Bool
    Throttle: Int
    Cruise Speed: Int
    Regen Braking: Int
    Throttle Pedal: Int
    """
    latest_motor_data_dict = {}
    connection = sqlite3.connect('') 
    connection.row_factory = sqlite3.Row
    query = "SELECT * FROM MotorCommands ORDER BY Time DESC LIMIT 1"
    latest_motor_data = connection.execute(query).fetchone()
    if latest_motor_data:
        latest_motor_data_dict = dict(latest_motor_data)
    return latest_motor_data_dict


def get_latest_dashboard_data():
    """
    Time : Text
    Hazards: Bool
    Left Turn Signal: Bool
    Right Turn Signal: Bool
    Regen En: Bool
    Cruise Inc: Bool
    Cruise En: Bool
    Cruise Dec: Bool
    """
    latest_dashboard_data_dict = {}
    connection = sqlite3.connect('') 
    connection.row_factory = sqlite3.Row
    query = "SELECT * FROM DashboardCommands ORDER BY Time DESC LIMIT 1"
    latest_dashboard_data = connection.execute(query).fetchone()
    if latest_dashboard_data:
        latest_dashboard_data_dict = dict(latest_dashboard_data)
    return latest_dashboard_data_dict


