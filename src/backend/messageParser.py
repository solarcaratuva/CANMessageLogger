import time
import cantools as ct
import re
import sys
import os
from app import socketio

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.CANLoggerDatabase import CANLoggerDatabase

DBC_FILES = ["Rivanna2.dbc"]
DBS = [ct.db.load_file(f"src/backend/CAN-Message-Generator/CAN-messages/{file}") for file in DBC_FILES]
PATTERN = re.compile(r"^(.*?)\sID\s0x([0-9a-fA-F]+)\sLength\s(\d+)\sData\s0x([0-9a-fA-F]+)")
ERRORS_LIST = ['BPSError', 'MotorControllerError', 'PowerAuxError']

timer = None

def decode_dbc(id_hex: str, data_hex: str) -> dict:
    """
    Decodes the message using the DBC files.

    @param id_hex: The ID of the message in hexadecimal.
    @param data_hex: The data of the message in hexadecimal.
    @return: A dictionary of the decoded message. Signals are the keys and decoded values are the values. Returns None if the message type is not found in the DBC files.
    """
    id = int(id_hex, 16)
    data = bytes.fromhex(data_hex.replace("0x", ""))
    data += b'\x00' * 8 # adding padding

    for db in DBS:
        message_ids = [msg.frame_id for msg in db.messages]
        if id in message_ids:
            decoded_message = db.decode_message(id, data)
            return decoded_message
    return None
        

def messageParser(message: str) -> tuple[dict, float]:
    """
    Parses the CAN message

    @param message: The message to be parsed.
    @return: The parsed message dictionary.
    @return: The timestamp of the message in seconds.
    """
    #sets timer to get timestamps
    global timer
    if timer == None:
        timer = time.perf_counter()
    
    for msg in ERRORS_LIST:
        if msg in message:
            return {"ERROR": "ERROR"}, None

    match = re.match(PATTERN, message)
    if match is None:
        return None, None
    canID = match.group(2)
    canData = match.group(4)

    messageDict = decode_dbc(canID, canData)
    return messageDict, time.perf_counter() - timer

def process_messages_in_batches_backend(file_path: str, logger_db: CANLoggerDatabase, table_name: str):
    with open(file_path, 'r') as f:
        while True:
            batch = [f.readline().strip() for _ in range(100)]
            batch = [msg for msg in batch if msg]  # Filter out empty lines

            if not batch:  # End of file
                break

            for line in batch:
                message_dict, timestamp = messageParser(line)
                if message_dict:
                    messagetoadd = message_dict
                    logger_db.add_message_to_db(table_name, message_dict)
            message = messagetoadd
            print(f"Processed {len(batch)} messages, waiting for 1 second...")
            time.sleep(0.5)  # Pause before next batch

def process_messages_in_batches(file_path: str, logger_db: CANLoggerDatabase, table_name: str, emit_func):
    message_count = 0  # Counter for the messages
    send_interval = 5  # Send messages every 5 seconds
    last_send_time = time.perf_counter()

    with open(file_path, 'r') as f:
        while True:
            batch = [f.readline().strip() for _ in range(100)]
            batch = [msg for msg in batch if msg]  # Filter out empty lines

            if not batch:  # End of file
                break

            message_batch = []  # Collect messages to emit later

            for line in batch:
                message_dict, timestamp = messageParser(line)
                if message_dict:
                    # Log the message into the database
                    logger_db.add_message_to_db(table_name, message_dict)
                    message_count += 1
                    message_batch.append({'data': message_dict, 'timestamp': timestamp})  # Append to batch list

            # Only emit the batch based on time interval
            current_time = time.perf_counter()
            if current_time - last_send_time >= send_interval:
                if message_batch:  # Only emit if there's data in the batch
                    emit_func(message_batch)  # Use emit_func to emit messages
                    print(f"Sent batch of {len(message_batch)} messages")
                    last_send_time = current_time

            print(f"Processed {len(batch)} messages, waiting for 1 second...")
            time.sleep(1)  # Pause before next batch

