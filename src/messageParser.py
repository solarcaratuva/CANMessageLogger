import time
import cantools as ct
import re

DBC_FILES = ["BPS.dbc", "MotorController.dbc", "MPPT.dbc", "Rivanna2.dbc"]
DBS = [ct.db.load_file(f"./src/CAN-messages/{file}") for file in DBC_FILES]
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
    print(match)
    if match is None:
        return None, None
    canID = match.group(2)
    canData = match.group(4)

    messageDict = decode_dbc(canID, canData)
    return messageDict, time.perf_counter() - timer