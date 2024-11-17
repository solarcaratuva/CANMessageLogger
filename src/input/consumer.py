import queue
from src.backend import CanMessage
from src.backend.DbConnection import DbConnection

DbConnection.setup_the_db_path("C:.\\src\\database")
queue = queue.Queue()


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
        list_can_messages.append(can_msg)

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
            list_can_messages.append(can_msg)

        db_conn.add_batch_can_msg(list_can_messages)
