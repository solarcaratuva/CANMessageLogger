import sqlite3
import DBCs
import CANmessage

DB_path = None

class DBconnection:
    def __init__(self):
        self.conn = sqlite3.connect(DB_path)
        self.conn.row_factory = sqlite3.Row
        self.cur = self.conn.cursor()

    def add_cmsg(self, cmsg: CANmessage) -> None:
        count_of_signals = len(cmsg.sigDict)

        signal_dict = cmsg.sigDict

        # Generate the SQL query
        columns = ', '.join(signal_dict.keys())
        placeholders = ', '.join(['?' for _ in signal_dict])
        sql = f'INSERT INTO {DB_path} ({columns}) VALUES ({placeholders})'

        # sig_dict: {signal_name: value}
        # signame1 signame2 signame3 time_stamp
        # val      val      val      time_val

        self.cur.execute(sql, tuple(signal_dict.values()))

        self.conn.commit()

    def add_batch_cmsg(self, cmsgs: list[CANmessage]) -> None:
    def query(self, query: str) -> list[dict]:



