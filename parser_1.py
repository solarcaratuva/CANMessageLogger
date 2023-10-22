import time
'''
Cannot find: MG0InputCurrent, MG0InputVoltage, MG1InputCurrent, MG1InputVoltage, MG0OutputVoltage, MG0InputPower
MG1OutputVoltage, MG1InputPower, MG0PCBTemperature, MG0MOSFETTemperature, MG1PCBTemperature, MG1MOSFETTemperature
'''
def messageParser(message, timer):
    messageDict = {}
    messageToFind = ['ECUMotorCommands: ', 'ECUPowerAuxCommands: ', 'BPSPackInformation: ', 'BPSError: ', 'BPSCellVoltage: ', 
                     'BPSCellTemperature: ', 'MotorControllerFrameRequest: ', 'MotorControllerPowerStatus: ', 
                     'MotorControllerDriveStatus: ', 'MotorControllerError: ', 'PowerAuxError: ', 'SolarCurrent: ', 
                     'SolarVoltage: ', 'SolarTemp: ']
    split_list = []
    for msg in messageToFind:
        index = message.find(msg)
        if msg in message:
            length = len(msg)
            break
    if index == -1:
        return None, time.perf_counter() - timer
    msgSubstring = message[(index+length):]
    pair = msgSubstring.split(", ")
    for string in pair:
        split_result = string.split()
        split_list.extend(split_result)
    for i in range(0, len(split_list), 2):
        messageDict[split_list[i]] = int(split_list[i+1])
    return messageDict, time.perf_counter() - timer