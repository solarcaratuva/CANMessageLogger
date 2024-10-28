import sqlite3
import DBCs  # need to have DBCs.py in same directory!! (this is the wrapper file we made for generating DBCs)
import CanMessage  # our own CanMessage Object

# !!!!!!Before initializing any DbConnection, must run setup_the_db_path(path : str)!!!!!!
DB_path = None  # shared with all DbConnections


class DbConnection:
    def __init__(self):
        self.conn = sqlite3.connect(DB_path)
        self.conn.row_factory = sqlite3.Row
        self.cur = self.conn.cursor()

    # helper function that adds a single can_message
    def __db_execute(self, can_msg: CanMessage) -> None:
        signal_dict = can_msg.sigDict

        # Generate the SQL query
        columns = ', '.join(signal_dict.keys())  # joins the keys as names of the columns that values will be inserted
        placeholders = ', '.join(['?' for _ in signal_dict])  # adds a placeholder ? for every key-val pair in sig_dict
        sql = f'INSERT INTO {can_msg.messageName} ({columns}, timeStamp) VALUES ({placeholders}, {can_msg.timeStamp})'
        # can_msg.messageName is assumed to be the name of the table in database
        self.cur.execute(sql, tuple(signal_dict.values()))

    @staticmethod
    def __parse_can_message_signals(dbcs: list) -> dict:
        can_message_signal_types = {}
        # {'message_name': {signal_name: signal_type, ..., ... }, ..., ...}

        for dbc in dbcs:
            for message in dbc.messages:
                # Extracting the message name and its signals (assumes the type is an UNSIGNED INTEGER!)
                can_message_signal_types[message.name] = {signal.name: "INTEGER" for signal in message.signals}

        return can_message_signal_types

    def add_can_msg(self, can_msg: CanMessage) -> None:
        # need to add code that finds correct table

        self.__db_execute(can_msg)  # helper function defined above

        self.conn.commit()

    def add_batch_can_msg(self, can_msg_list: list[CanMessage]) -> None:
        # need to add code that finds correct table

        for can_msg in can_msg_list:
            self.__db_execute(can_msg)  # helper function defined above

        self.conn.commit()

    def query(self, query: str) -> list[dict]:
        self.cur.execute(query)
        rows = self.cur.fetchall()
        return [dict(row) for row in rows]  # list[ 'can_msg_1' is dict{signal: val,signal: val,signal: val}, ...]

    def setup_the_tables(self) -> None:
        # Should only be called once!
        can_msg_signals = self.__parse_can_message_signals(DBCs.DBCs)

        # create table for each can_message_name
        for can_msg_type, signal_types_dict in can_msg_signals.items():
            columns = ', '.join([f'{signal_name} INTEGER' for signal_name in signal_types_dict.keys()])

            sql = f'CREATE TABLE {can_msg_type} ({columns}, timeStamp INTEGER)'  # add timestamp column

            self.cur.execute(sql)

        self.conn.commit()

    @staticmethod
    def setup_the_db_path(path: str) -> None:
        global DB_path
        DB_path = path
