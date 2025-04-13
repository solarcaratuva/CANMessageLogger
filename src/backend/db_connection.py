import sqlite3
from backend.dbcs import DBCs  # need to have dbcs.py in same directory! (this is the wrapper file we made for generating DBCs)
from backend.can_message import CanMessage  # our own CanMessage Object
import json

# Before initializing any DbConnection objects, must run setup_the_db_path(path : str)


class DbConnection:
    DB_path = "./CANDatabases"  # static, i.e. shared with all DbConnection Objects

    def __init__(self):
        #print("The database path is: ", DbConnection.DB_path)
        self.conn = sqlite3.connect(DbConnection.DB_path)
        self.conn.row_factory = sqlite3.Row
        self.cur = self.conn.cursor()

    def __del__(self):
        if hasattr(self,'cur') and self.cur:
            self.cur.close()
        if  hasattr(self,'conn') and self.conn:
            self.conn.close()

    def __db_insert_message(self, can_msg: CanMessage) -> None:
        """
        Takes in a CanMessage object, then its signals dictionary are deconstructed and placed into connection's database
        Does not commit, need to call commit after calling this function

        @param can_msg: A CanMessage object
        @return: None, adds signals from CanMessage object to database. Does not commit. Needs to call commit after.
        """
        signal_dict = can_msg.sigDict

        # Generate the SQL query
        columns = ', '.join(signal_dict.keys())  # joins the keys as names of the columns that values will be inserted
        placeholders = ', '.join(['?' for _ in signal_dict])  # adds a placeholder ? for every key-val pair in sig_dict
        sql = f'INSERT INTO {can_msg.messageName} ({columns}, timeStamp) VALUES ({placeholders}, {can_msg.timeStamp})'
        # can_msg.messageName is assumed to be the name of the table in database
        self.cur.execute(sql, tuple(signal_dict.values()))

    @staticmethod
    def __parse_can_message_signals(dbcs: list) -> dict:
        """
        Given the DBCs objects in list generated in dbcs.py, functions creates and returns a dictionary containing message
        type as the keys, and the value being another sub-dictionary that has the signal type as keys and signal data
        type as values (for now it is always set to datatype of INTEGER).

        @param dbcs: list of DBCs objects to be used to generate dictionary of message types
        @return: a dictionary containing message type as the keys, and the value being another sub-dictionary that has the signal type as keys and signal data type as values (for now it is always set to datatype of INTEGER).
        """
        can_message_signal_types = {}
        # {'message_name': {signal_name: signal_type, ..., ... }, ..., ...}

        for dbc in dbcs:
            for message in dbc.messages:
                # Extracting the message name and its signals (assumes the type is an UNSIGNED INTEGER!)
                can_message_signal_types[message.name] = {signal.name: "INTEGER" for signal in message.signals}

        return can_message_signal_types

    def add_can_msg(self, can_msg: CanMessage) -> None:
        """
        Add a single Can Message to the connection's database

        @param can_msg: The CanMessage object to be added to database
        @return: None, just adds single CAN message to connection's database
        """
        self.__db_insert_message(can_msg)  # helper function defined above

        self.conn.commit()

    def add_batch_can_msg(self, can_msg_list: list[CanMessage]) -> None:
        """
        Add a batch (list) of CanMessage objects to the connection's database

        @param can_msg_list: The list of CanMessage objects to be added to database
        @return: None, adds all CanMessage objects to connection's database
        """
        for can_msg in can_msg_list:
            self.__db_insert_message(can_msg)  # helper function defined above

        self.conn.commit()

    def query(self, query: str) -> list[dict]:
        """
        Execute a single SQL query and returns what the SQL query returns as a list of dictionaries

        @param query: The query to execute as a String
        @return: list of dictionaries, each dictionary represents a single CANmessage and signals/values as key/values
        """
        self.cur.execute(query)
        rows = self.cur.fetchall()
        return [dict(row) for row in rows]  # list[ 'can_msg_1' is dict{signal: val,signal: val,signal: val}, ...]

    def setup_the_tables(self) -> None:
        """
        Sets up the tables in the SQL database, this function must be called before ANY other function calls for the
        instantiated DbConnection object.

        @return: None, creates a table for each message type (i.e. there will be as many tables as there are
        message types, as defined in DBCs)
        """

        
        sql_alerts = '''
            CREATE TABLE IF NOT EXISTS Alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                field TEXT NOT NULL,
                type TEXT NOT NULL,
                category TEXT,           -- NEW COLUMN for alert category
                bool_value TEXT,
                comparisons_json TEXT
            );
        '''
        self.cur.execute(sql_alerts)

        sql_triggered_alerts = '''
            CREATE TABLE IF NOT EXISTS TriggeredAlerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                alert_id INTEGER NOT NULL,
                category TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                can_message_id INT NOT NULL,
                can_message_data BYTEA NOT NULL,
                can_message_timestamp INTEGER NOT NULL,
                signal TEXT NOT NULL,
                fail_cause TEXT NOT NULL
            );
        '''
        self.cur.execute(sql_triggered_alerts)


        # Should only be called once!
        can_msg_signals = self.__parse_can_message_signals(DBCs)

        # create table for each can_message_name
        for can_msg_type, signal_types_dict in can_msg_signals.items():
            columns = ', '.join([f'{signal_name} INTEGER' for signal_name in signal_types_dict.keys()])

            sql = f'CREATE TABLE IF NOT EXISTS {can_msg_type} (count INTEGER PRIMARY KEY AUTOINCREMENT, {columns}, timeStamp INTEGER)'  # add timestamp column

            self.cur.execute(sql)

        self.conn.commit()

    def get_table_names(self) -> list[str]:
        self.cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = self.cur.fetchall()

        # Convert the result to a list of table names
        return [table[0] for table in tables]

    @staticmethod
    def setup_the_db_path(path: str) -> None:
        """
        This function must be called even before any DbConnection object is instantiated, make sure database file exists and does not have any pre-existing tables.

        @return: Nothing, just sets the SQL database connection path for all DbConnection objects (it is static)
        """
        DbConnection.DB_path = path
        print("Just set DB_path to: ", DbConnection.DB_path)
    
    def add_triggered_alert(self, alert_id, category, timestamp, can_message_id, can_message_data, can_message_timestamp, signal, fail_cause):
        try:
            print("ADDING AN ALERT TO PREV TRIGGERED ALERTS")
            # print(traceback.print_stack())
            connection = self.conn
            cursor = connection.cursor()

            cursor.execute('''
                INSERT INTO TriggeredAlerts (alert_id, category, timestamp, can_message_id, can_message_data, can_message_timestamp, signal, fail_cause)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (alert_id, category, timestamp, can_message_id, can_message_data, can_message_timestamp, signal, fail_cause))

            connection.commit()
            new_id = cursor.lastrowid
            print(f"Created triggered alert with ID {new_id}")
            return new_id
        
        except sqlite3.Error as e:
            print(f"Database error inserting triggered alert: {e}")
            print(alert_id, category, timestamp, can_message_id, can_message_data, can_message_timestamp, signal, fail_cause)
            return None
    
    def fetch_triggered_alerts(self):
        try:
            connection = self.conn
            cursor = connection.cursor()

            cursor.execute('''
                SELECT * FROM TriggeredAlerts
            ''')

            rows = cursor.fetchall()
            return [dict(row) for row in rows]
        
        except sqlite3.Error as e:
            print(f"Database error fetching triggered alerts: {e}")
            return None


    def create_alert(self, alert_data):
        """
        Example alert_data:
        {
        "name": "My Alert",
        "field": "batteryVoltage",
        "type": "double",
        "category": "Battery",   # <-- We’ll be sending this now
        "value": "false"         # if bool
        "comparisons": [ { "operator": "<", "value": 3.0 } ]
        }
        """
        try:
            connection = self.conn
            cursor = connection.cursor()

            name = alert_data.get('name')
            field = alert_data.get('field')
            type_ = alert_data.get('type')
            category = alert_data.get('category')  # <-- new

            bool_value = None
            comparisons_json = None

            if type_ == 'bool':
                bool_value = alert_data.get('value')  # "true"/"false"
            elif type_ in ['int', 'double']:
                comps = alert_data.get('comparisons', [])
                comparisons_json = json.dumps(comps)

            cursor.execute('''
                INSERT INTO Alerts (name, field, type, category, bool_value, comparisons_json)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (name, field, type_, category, bool_value, comparisons_json))

            connection.commit()
            new_id = cursor.lastrowid
            print(f"Created alert with ID {new_id}")
            return new_id

        except sqlite3.Error as e:
            print(f"Database error inserting alert: {e}")
            return None

    
    def delete_alert(self, alert_id):
        try:
            connection = self.conn
            cursor = connection.cursor()

            cursor.execute('''
                DELETE FROM Alerts WHERE id = ?
            ''', (alert_id,))

            connection.commit()
            print(f"Deleted alert with ID {alert_id}")
        
        except sqlite3.Error as e:
            print(f"Database error deleting alert: {e}")

