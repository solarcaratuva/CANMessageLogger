import DBCs


class CanMessage:
    def __init__(self, name: str, id: int, signals: dict, timestamp: float):
        self.messageName = name
        self.messageId = id
        self.sigDict = signals
        self.timeStamp = timestamp


def decode_message(int_id: int, data: bytes, timestamp: float) -> CanMessage:
    """
    Decodes the message using the DBC files.

    @param int_id: The ID as an int of the message name/type in hexadecimal.
    @param data: The data as a python byte object of the message in hexadecimal.
    @param timestamp: timestamp of the message stored as float time from start time.

    @return: A CANmessage object (defined above). Signals are the keys and decoded values are the values. Returns None if the message type is not found in the DBC files.
    """
    name = None
    # id = int(id_hex, 16)
    # data = bytes.fromhex(data_hex.replace("0x", ""))
    data += b'\x00' * 8  # adding padding

    decoded_message = None  # dictionary of signals to return

    ''' Colby's old code that did not grab Name
    for db in DBCs:
        message_ids = [msg.frame_id for msg in db.messages] # problem here is that this just stores .frame_id
        if id in message_ids: # we need to store the msg object, to get msg.name
            decoded_message = db.decode_message(id, data)
    '''

    for db in DBCs.DBCs:
        for msg in db.messages:
            if msg.frame_id == int_id:
                name = msg.name
                decoded_message = db.decode_message(int_id, data)
                break
        if decoded_message is not None:
            break

    # decoded message was not associated with a definition from DBCs
    if decoded_message is None:
        return None

    return CanMessage(name, int_id, decoded_message, timestamp)
