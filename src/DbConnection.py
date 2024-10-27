import sqlite3
import DBCs
import CanMessage

DB_path = None

class DbConnection:
    def __init__(self):
        self.conn = sqlite3.connect(DB_path)
        self.conn.row_factory = sqlite3.Row
        self.cur = self.conn.cursor()

    def add_can_msg(self, can_msg: CanMessage) -> None:
        count_of_signals = len(can_msg.sigDict)

        signal_dict = can_msg.sigDict

        # Generate the SQL query
        columns = ', '.join(signal_dict.keys())
        placeholders = ', '.join(['?' for _ in signal_dict])
        sql = f'INSERT INTO {DB_path} ({columns}) VALUES ({placeholders})'

        # sig_dict: {signameX: value} ?Ask Colby, is this the format he wants from the Database?
        # signame1 signame2 signame3 time_stamp
        # val      val      val      time_val

        self.cur.execute(sql, tuple(signal_dict.values()))

        self.conn.commit()

    def add_batch_cmsg(self, cmsgs: list[CanMessage]) -> None:
    def query(self, query: str) -> list[dict]:



