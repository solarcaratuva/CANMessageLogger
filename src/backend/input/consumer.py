import queue
import time
from src.backend.can_message import CanMessage, decode_message
from src.backend.db_connection import DbConnection

queue = queue.Queue()

LOOP_TIME = 0.001


def process_data() -> None:
    """
    Pops all stored tuples on CAN messages queue (each tuple representing a single CAN message) and adds them into the database

    @return: Nothing, it will just add all CAN messages from the queue into the database
    """
    print(f"DB_path in process_data: {db.DB_path}")
    db_conn = DbConnection()
    list_can_messages = []
    while True:
        if queue.empty():
            break
        cm_tuple = queue.get()
        can_msg = CanMessage.decode_message(*cm_tuple)
        if can_msg is not None:
            list_can_messages.append(can_msg)

    db_conn.add_batch_can_msg(list_can_messages)


def process_data_live() -> None:
    """
    Pops all stored tuples on CAN messages queue (each tuple representing a single CAN message) and adds them into the database

    @return: Nothing, it will just add all CAN messages from the queue into the database
    """
    i = 0
    while i < 3001:
        db_conn = DbConnection()
        list_can_messages = []
        while True:
            if queue.empty():
                break
            cm_tuple = queue.get()
            can_msg = decode_message(*cm_tuple)
            if can_msg is not None:
                list_can_messages.append(can_msg)
                #print("Just added: ", str(can_msg))

        db_conn.add_batch_can_msg(list_can_messages)
        time.sleep(LOOP_TIME)
        i+=1

