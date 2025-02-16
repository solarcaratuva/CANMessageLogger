import sqlite3

def connect_db():
    return sqlite3.connect('can_database.sqlite')


def get_auxiliary_data():
    """
    Time: Text
    Aux Voltage: Int"""
    try:
        with connect_db() as connection:
            connection.row_factory = sqlite3.Row
            query = "SELECT * FROM AuxBatteryStatus ORDER BY Time DESC LIMIT 1"
            latest_auxiliary_data = connection.execute(query).fetchone()

            if latest_auxiliary_data:
                return dict(latest_auxiliary_data)
            return {}
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        return {}

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
    try:
        with connect_db() as connection:
            connection.row_factory = sqlite3.Row
            query = "SELECT * FROM MotorCommands ORDER BY Time DESC LIMIT 1"
            latest_motor_data = connection.execute(query).fetchone()
            if latest_motor_data:
                return dict(latest_motor_data)
            return {}
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        return {}


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
    try:
        with connect_db() as connection:
            connection.row_factory = sqlite3.Row
            query = "SELECT * FROM DashboardCommands ORDER BY Time DESC LIMIT 1"
            latest_dashboard_data = connection.execute(query).fetchone()
            if latest_dashboard_data:
                return dict(latest_dashboard_data)
            return {}
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        return {}
    
def get_test_motor_data():
    try:
        with connect_db() as connection:
            connection.row_factory = sqlite3.Row
            query = "SELECT * FROM ECUMotorCommands"
            latest_motor_data = connection.execute(query).fetchone()
            if latest_motor_data:
                return dict(latest_motor_data)
            return {}
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        return {}





