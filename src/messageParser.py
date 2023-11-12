import time
import os
import cantools
from pathlib import Path
import binascii
import codecs

'''
Cannot find: MG0InputCurrent, MG0InputVoltage, MG1InputCurrent, MG1InputVoltage, MG0OutputVoltage, MG0InputPower
MG1OutputVoltage, MG1InputPower, MG0PCBTemperature, MG0MOSFETTemperature, MG1PCBTemperature, MG1MOSFETTemperature
'''
timer = None

def decode_dbc(message_id, message_data): #message_id -> frame_id, message_data -> binary representation of the message data
    # Switch comment below and uncomment line 2 below for testing, vice versa for prod
    message = make_hex_great_again(message_data)
    # message = message_data

    # message_id = make_hex_great_again(message_id)
    print("Message Data: " + str(message_data))
    print("Message: " + str(message) + "Message ID: " + str(message_id))
    curr_path = os.path.dirname(os.path.abspath(__file__))
    can_dir = os.path.join(curr_path, "CAN-messages")

    bpsDB = cantools.database.load_file(os.path.join(can_dir, "BPS.dbc"))
    motorControllerDB = cantools.database.load_file(os.path.join(can_dir, "MotorController.dbc"))
    mpptDB = cantools.database.load_file(os.path.join(can_dir, "MPPT.dbc"))
    rivanna2DB = cantools.database.load_file(os.path.join(can_dir, "Rivanna2.dbc"))

    #Testing
    # data = bpsDB.messages
    #
    # message_frame_id = 1062
    # encoded_message = bpsDB.encode_message(message_frame_id, {'low_temperature': 25, 'low_thermistor_id': 1, "high_temperature": 55, "high_thermistor_id": 2})
    #
    # message_id = message_frame_id
    # message_data = encoded_message

    if message_id in bpsDB._frame_id_to_message: # First Returned Value is the Name of the Message, Second Returned Value is a Dictionary with the names and associated values
        return bpsDB._frame_id_to_message[message_id].name, bpsDB.decode_message(message_id, message)
    elif message_id in motorControllerDB._frame_id_to_message:
        return motorControllerDB._frame_id_to_message[message_id].name, motorControllerDB.decode_message(message_id, message)
    elif message_id in mpptDB._frame_id_to_message:
        return mpptDB._frame_id_to_message[message_id].name, mpptDB.decode_message(message_id, message)
    elif message_id in rivanna2DB._frame_id_to_message:
        return rivanna2DB._frame_id_to_message[message_id].name, rivanna2DB.decode_message(message_id, message)
    else:
        print(message_id)
        return "ID does not exist", "Error"
        
def make_hex_great_again(message_data):
    ints = []
    for x in message_data:
        ints.append(x)
    new_message = ""
    for x in ints: #manually convert int to hex
        if x>=48 and x <= 57:
            new_message += hex(x-48)[2:]
        elif x>=65 and x <= 70:
            new_message += hex(x-55)[2:]
        else:
            new_message += hex(0)[2:]

    return codecs.decode(new_message, 'hex_codec')
#only parses msg in the format "messageToFind: key value, ___ _, ___ _, ..."
def messageParser(message):
    global timer
    #sets timer to get timestamps
    if timer == None:
        timer = time.perf_counter()
    messageDict = {}
    #keywords to look for in the printed log statement
    messageToFind = ['ECUMotorCommands: ', 'ECUPowerAuxCommands: ', 'BPSPackInformation: ', 'BPSError: ', 'BPSCellVoltage: ', 
                     'BPSCellTemperature: ', 'MotorControllerFrameRequest: ', 'MotorControllerPowerStatus: ', 
                     'MotorControllerDriveStatus: ', 'MotorControllerError: ', 'PowerAuxError: ', 'SolarCurrent: ', 
                     'SolarVoltage: ', 'SolarTemp: ']
    errorsList = ['BPSError', 'MotorControllerError', 'PowerAuxError']
    hexMessageToFind = ['ID ', 'Data ']
    for msg in errorsList:
        if msg in message:
            return {"ERROR": "ERROR"}, None
    split_list = []
    if hexMessageToFind[0] in message and hexMessageToFind[1] in message:
        messageIDIndex = message.find(hexMessageToFind[0])
        messageDataIndex = message.find(hexMessageToFind[1])
        id_start = messageIDIndex + len(hexMessageToFind[0])
        id_end = message.find(" ", id_start)
        can_id = message[id_start:id_end]
        data_start = messageDataIndex + len(hexMessageToFind[1])
        can_data = message[data_start:]
        binaryID = bin(int(can_id, 16))
        binaryData = bin(int(can_data, 16))
        messageName, dataDict = decode_dbc(binaryID, binaryData)
        return dataDict, time.perf_counter() - timer
    else:
        for msg in messageToFind:
            index = message.find(msg)
            if msg in message:
                DataLength = len(msg)
                break
        #the key word we are trying to track is not found, returns none
        if index == -1:
            return None, time.perf_counter() - timer
        msgSubstring = message[(index+DataLength):]
        pair = msgSubstring.split(", ")
        for string in pair:
            split_result = string.split()
            split_list.extend(split_result)
        for i in range(0, len(split_list), 2):
            messageDict[split_list[i]] = int(split_list[i+1])
        return messageDict, time.perf_counter() - timer