import sqlite3
from backend.dbcs import DBCs  # need to have dbcs.py in same directory! (this is the wrapper file we made for generating DBCs)
from backend.can_message import CanMessage  # our own CanMessage Object
import threading
import time

# Before initializing any DbConnection objects, must run setup_the_db_path(path : str)

# Add a connection lock
_connection_lock = threading.RLock()

class DbConnection:
    DB_path = None  # static, i.e. shared with all DbConnection Objects

    def __init__(self):
        """
        Initialize a new database connection
        """
        self.__setup_connection()
        
    def __setup_connection(self):
        """
        Set up the database connection with proper timeout settings
        """
        # Use a lock to prevent concurrent connection creation
        with _connection_lock:
            # Close any existing connection first
            self.__close_connection()
            
            # Connect with timeout and retry logic
            max_retries = 5
            retry_count = 0
            
            while retry_count < max_retries:
                try:
                    self.conn = sqlite3.connect(DbConnection.DB_path, timeout=20.0, check_same_thread=False)
                    self.conn.row_factory = sqlite3.Row
                    self.cur = self.conn.cursor()
                    return
                except sqlite3.OperationalError as e:
                    if "database is locked" in str(e):
                        retry_count += 1
                        print(f"Database locked, retrying ({retry_count}/{max_retries})...")
                        time.sleep(0.5)  # Wait before retrying
                    else:
                        raise
            
            # If we get here, we've exceeded max retries
            raise sqlite3.OperationalError("Could not connect to database after multiple attempts - database is locked")
    
    def __close_connection(self):
        """
        Safely close the database connection
        """
        try:
            if hasattr(self, 'conn') and self.conn:
                if hasattr(self, 'cur') and self.cur:
                    self.cur.close()
                self.conn.close()
        except Exception as e:
            print(f"Error closing database connection: {e}")

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

    def add_batch_can_msg(self, list_can_msg):
        """
        Add a batch of CAN messages to the database with connection retry logic
        """
        with _connection_lock:
            try:
                for can_msg in list_can_msg:
                    self.__db_insert_message(can_msg)
                self.conn.commit()
            except sqlite3.OperationalError as e:
                if "database is locked" in str(e):
                    # Reconnect and retry
                    print("Database locked during batch add, reconnecting...")
                    self.__setup_connection()
                    # Retry the batch
                    for can_msg in list_can_msg:
                        self.__db_insert_message(can_msg)
                    self.conn.commit()
                else:
                    raise

    def query(self, sql, params=None):
        """
        Execute a query with connection retry logic
        """
        with _connection_lock:
            try:
                if params:
                    self.cur.execute(sql, params)
                else:
                    self.cur.execute(sql)
                return [dict(row) for row in self.cur.fetchall()]
            except sqlite3.OperationalError as e:
                if "database is locked" in str(e):
                    # Reconnect and retry
                    print("Database locked during query, reconnecting...")
                    self.__setup_connection()
                    # Retry the query
                    if params:
                        self.cur.execute(sql, params)
                    else:
                        self.cur.execute(sql)
                    return [dict(row) for row in self.cur.fetchall()]
                else:
                    raise

    def setup_the_tables(self) -> None:
        """
        Sets up the tables in the SQL database, this function must be called before ANY other function calls for the
        instantiated DbConnection object.

        @return: None, creates a table for each message type (i.e. there will be as many tables as there are
        message types, as defined in DBCs)
        """
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
