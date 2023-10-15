import time
def messageParser(message):
    messageDict = {}
    validMessage: False
    messageToFind = ['ECUMotorCommands: ', 'ECUPowerAuxCommands: ']
    split_list = []
    for msg in messageToFind:
        index = message.find(msg)
        if msg in message:
            length = len(msg)
            break
    if index == -1:
        return None, time.time()
    msgSubstring = message[(index+length):]
    pair = msgSubstring.split(", ")
    for string in pair:
        split_result = string.split()
        split_list.extend(split_result)
    for i in range(0, len(split_list), 2):
        messageDict[split_list[i]] = split_list[i+1]
    return messageDict, time.time()
