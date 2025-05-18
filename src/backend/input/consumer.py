import queue
import time
from backend.can_message import CanMessage, decode_message
from backend.db_connection import DbConnection
from flask_socketio import SocketIO

queue = queue.Queue()

LOOP_TIME = 0.5

# Logic for live data processing
last_consume_time = None  # the last time the consumer consumed data
start_consume_time = time.perf_counter()  # the very first time when consumer started consuming

# Reference to socketio for emitting events
socketio = None

def set_socketio(socket_instance):
    """
    Set the socketio instance for emitting events
    """
    global socketio
    socketio = socket_instance


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
        can_msg = decode_message(*cm_tuple)
        if can_msg is not None:
            list_can_messages.append(can_msg)

    db_conn.add_batch_can_msg(list_can_messages)


def process_data_live() -> None:
    """
    Pops all stored tuples on CAN messages queue (each tuple representing a single CAN message) and adds them into the database

    @return: Nothing, it will just add all CAN messages from the queue into the database
    """

    global start_consume_time, last_consume_time
    start_consume_time = time.perf_counter()
    print(f"Starting live data processing at time: {start_consume_time}")
    
    # For tracking emitted messages
    message_count = 0
    last_status_time = time.perf_counter()
    
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
                # Emit the CAN message for real-time graphing if socketio is set
                if socketio is not None:
                    # Convert timestamp to seconds for the graph
                    timestamp = float(can_msg.timeStamp)  # Convert ms to s
                    
                    # Create a dictionary with just numeric signals
                    numeric_signals = {}
                    for key, value in can_msg.sigDict.items():
                        # Only include numeric values
                        if isinstance(value, (int, float)) and not isinstance(value, bool):
                            numeric_signals[key] = value
                    
                    socketio.emit('can_message', {
                        'message_name': can_msg.messageName,
                        'signals': numeric_signals,
                        'timestamp': timestamp
                    })
                    
                    # Track emitted messages
                    message_count += 1
                    
                    # Log status every 100 messages or 5 seconds
                    current_time = time.perf_counter()
                    if message_count % 100 == 0 or (current_time - last_status_time) > 5:
                        print(f"Emitted {message_count} messages. Last timestamp: {timestamp:.3f}s")
                        last_status_time = current_time

        db_conn.add_batch_can_msg(list_can_messages)
        time.sleep(LOOP_TIME)

