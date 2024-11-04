import queue
from src import CanMessage
from src.DbConnection import DbConnection

DbConnection.setup_the_db_path("C:.\\src\\database")
queue = queue.Queue()


def process_data() -> None:
    """
    Pops all stored tuples on CAN messages queue (each tuple representing a single CAN message) and returns a list of
    CanMessage objects from the stored tuples

    @return: a list of CanMessage objects from the stored tuples that were on queue
    """
    db_conn = DbConnection()
    list_can_messages = []
    while True:
        cm_tuple = queue.get()
        if cm_tuple is None:
            break
        can_msg = CanMessage.decode_message(*cm_tuple)
        list_can_messages.append(can_msg)

    db_conn.add_batch_can_msg(list_can_messages)
