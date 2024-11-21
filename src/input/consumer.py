import queue
import time
from backend import CanMessage
from backend.DbConnection import DbConnection

DbConnection.setup_the_db_path("C:.\\src\\database")
queue = queue.Queue()

LOOP_TIME = 0.5

def process_data() -> None:
    """
    Pops all stored tuples on CAN messages queue (each tuple representing a single CAN message) and adds them into the database

    @return: Nothing, it will just add all CAN messages from the queue into the database
    """
    db_conn = DbConnection()
    list_can_messages = []
    while True:
        if queue.empty():
            break
        cm_tuple = queue.get()
        can_msg = CanMessage.decode_message(*cm_tuple)
        if can_msg is not None:
            list_can_messages.append(can_msg)
        else:
            print(cm_tuple)

    db_conn.add_batch_can_msg(list_can_messages)

def process_data_live() -> None:
    """
    Pops all stored tuples on CAN messages queue (each tuple representing a single CAN message) and adds them into the database

    @return: Nothing, it will just add all CAN messages from the queue into the database
    """
    while True:
        db_conn = DbConnection()
        list_can_messages = []
        while True:
            if queue.empty():
                break
            cm_tuple = queue.get()
            can_msg = CanMessage.decode_message(*cm_tuple)
            if can_msg is not None:
                list_can_messages.append(can_msg)
            else:
                print("there was a none can message")

        db_conn.add_batch_can_msg(list_can_messages)
        time.sleep(LOOP_TIME)   
