import queue
import time
from backend.can_message import CanMessage, decode_message
from backend.db_connection import DbConnection

queue = queue.Queue()

LOOP_TIME = 0.0001

# Logic for live data processing
last_consume_time = None  # the last time the consumer consumed data
start_consume_time = time.perf_counter()  # the very first time when consumer started consuming


def process_data() -> None:
    print("process_data")
    """
    Pops all stored tuples on CAN messages queue (each tuple representing a single CAN message) and adds them into the database

    @return: Nothing, it will just add all CAN messages from the queue into the database
    """
    #print(f"DB_path in process_data: {DbConnection.DB_path}")
    print("process_data")
    db_conn = DbConnection()
    list_can_messages = []
    while True:
        if queue.empty():
            break
        cm_tuple = queue.get()
        can_msg = decode_message(*cm_tuple)
        if can_msg is not None:
            list_can_messages.append(can_msg)

    db_conn.add_batch_can_msg(list_can_messages)


def process_data_live() -> None:
    print("process_data_live")
    """
    Pops all stored tuples on CAN messages queue (each tuple representing a single CAN message) and adds them into the database

    @return: Nothing, it will just add all CAN messages from the queue into the database
    """
    global start_consume_time, last_consume_time
    start_consume_time = time.perf_counter()
    while True:
        last_consume_time = time.perf_counter()
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

