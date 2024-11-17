import sqlite3
from DBCs import DBCs  # need to have DBCs.py in same directory! (this is the wrapper file we made for generating DBCs)
import CanMessage  # our own CanMessage Object

# Before initializing any DbConnection objects, must run setup_the_db_path(path : str)
DB_path = None  # static, i.e. shared with all DbConnection Objects



class DbConnection:
    def __init__(self):
        self.conn = sqlite3.connect(DB_path)
        self.conn.row_factory = sqlite3.Row
        self.cur = self.conn.cursor()

    def __del__(self):
        if self.cur and hasattr(self,'cur'):
            self.cur.close()
        if self.conn and hasattr(self,'conn'):
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
        Given the DBCs objects in list generated in DBCs.py, functions creates and returns a dictionary containing message
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
        # Should only be called once!
        can_msg_signals = self.__parse_can_message_signals(DBCs)

        # create table for each can_message_name
        for can_msg_type, signal_types_dict in can_msg_signals.items():
            columns = ', '.join([f'{signal_name} INTEGER' for signal_name in signal_types_dict.keys()])

            sql = f'CREATE TABLE {can_msg_type} (count INTEGER PRIMARY KEY AUTOINCREMENT, {columns}, timeStamp INTEGER)'  # add timestamp column

            self.cur.execute(sql)

        self.conn.commit()

    @staticmethod
    def setup_the_db_path(path: str) -> None:
        """
        This function must be called even before any DbConnection object is instantiated, make sure database file exists and does not have any pre-existing tables.

        @return: Nothing, just sets the SQL database connection path for all DbConnection objects (it is static)
        """
        global DB_path
        DB_path = path

    def process_messages_in_batches(self, file_path: str, emit_func):
        
        '''message_count = 0  # Counter for the messages
        send_interval = 1  # Send messages every 5 seconds
        last_send_time = time.perf_counter()

        ID_TO_TABLE = {
            513: 'ECUMotorCommands',
            769: 'ECUPowerAuxCommands',
            0x789: 'table_name_3',
            # Add more mappings as needed
        }
        with open(file_path, 'r') as f:
            while True:
                batch = [f.readline().strip() for _ in range(100)]
                batch = [msg for msg in batch if msg]  # Filter out empty lines

                if not batch:  # End of file
                    break

                message_batch = []  # Collect messages to emit later

                for line in batch:
                    id, message_dict, timestamp = messageParser(line)
                    if message_dict:
                        table_name = ID_TO_TABLE.get(id)
                        # Log the message into the database
                        logger_db.add_message_to_db(table_name, message_dict)
                        message_count += 1
                        message_batch.append({'table_name': table_name, 'data': message_dict,
                                              'timestamp': timestamp})  # Append to batch list

                # Only emit the batch based on time interval
                current_time = time.perf_counter()
                if current_time - last_send_time >= send_interval:
                    if message_batch:  # Only emit if there's data in the batch
                        emit_func(message_batch)  # Use emit_func to emit messages
                        print(f"Sent batch of {len(message_batch)} messages")
                        last_send_time = current_time

                print(f"Processed {len(batch)} messages, waiting for 1 second...")
                time.sleep(1)  # Pause before next batch'''
