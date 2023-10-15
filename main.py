import os
import time
import graphs
import test
import threading
import serial
import serial.tools.list_ports


running = True

tractedValues = {"throttle": dict()} # TODO
currentGraphs = dict()

def checkForObviousErrors(key, value, message):
    maxValues = {"volt": 130} # fix
    minValues = dict()
    if key in maxValues and value > maxValues[key]:
        print("ERRONEOUS DATA DETECTED! " + 
                "\nKey: " + str(key) + 
                "\nVALUE: "+ str(value) + 
                "\nTrigger: "+ str(maxValues[key]) +
                "\nFULL MESSAGE: " + str(message))
    if key in minValues and value < minValues[key]:
        print("ERRONEOUS DATA DETECTED! " + 
                "\nKey: " + str(key) + 
                "\nVALUE: "+ str(value) + 
                "\nTrigger: "+ str(minValues[key]) +
                "\nFULL MESSAGE: " + str(message))
    

def messageHandler(unparsedMessage):
    messageDict, timestamp = test.testing() # get from Jimmy's parser
    if messageDict == None:
        return
    for key in messageDict:
        if key in tractedValues:
            tractedValues[key][timestamp] = messageDict[key]
        checkForObviousErrors(key, messageDict[key], unparsedMessage)


def readInFileData(filePath):
    if not os.path.exists(filePath):
        print("This is not a valid file path")
        return
    logData = open(filePath, "r").readlines()
    for item in logData:
        messageHandler(item)
    print("Import Successful!")

def serialInputReader():
    deviceName = "USB\VID_0483&PID_374E&REV_0100&MI_02" # update
    serialPort = None
    # ser = None
    # ports = list(serial.tools.list_ports.comports())
    # for port in ports:
    #     if deviceName in port.description or deviceName in port.hwid:
    #         serialPort = port.device
    #         break
    # if serialPort == None:
    #     print(deviceName + " not found")
    #     return
    # ser = serial.Serial(port.device, 921600)
    # print(deviceName + " found on " +serialPort)
    # ports = [port.device for port in serial.tools.list_ports.comports()]

    # for port in ports:
    #     try:
    #         with serial.Serial(port, 921600, timeout=0.1) as ser:
    #             data = ser.readline()
    #             if data:
    #                 ports.append(port)
    #     except (serial.SerialException, OSError):
    #         pass

    # while True:
    #     try:
    #         while True:
    #             line = ser.readline().decode('utf-8').strip()
    #             #print(line)
    #             messageHandler(line)
    #     except KeyboardInterrupt:
    #         ser.close()
    #     global currentGraphs
    #     for graph in currentGraphs.values:
    #         graph.update()





if __name__ == "__main__": #Main Method
    inp = input("Enter \"serial\" to read from serial in real time OR enter the path of a log file\n")
    if inp == "serial":
        serialInputReaderThread = threading.Thread(target=serialInputReader)
        serialInputReaderThread.start()
    else:
        readInFileData(inp)

    while running == True:
        command = input("Enter a command: ")
        command = command.split()   # split by spaces; [0] = command, [1] = item name, [2...] = other arguments

        if command[0] == "quit":
            running = False
            continue
        if len(command) <= 1:
            print("COMMAND MISSING ARGUMENTS")
            continue
        if command[1] not in tractedValues:
            print(f"THE VALUE \"{command[1]}\" IS NOT A TRACKED VALUE")
            continue
        match command[0]:
            case "add":
                thisDict = tractedValues[command[1]]
                thisGraph = graphs.Graph(thisDict, command[1])
                currentGraphs[command[1]] = thisGraph
            case "rm":
                thisGraph = currentGraphs[command[1]]
                thisGraph.delete()
                del currentGraphs[command[1]]
            case "chg":
                thisGraph = currentGraphs[command[1]]
                thisGraph.change(command[2], command[3])
            case _:
                print("UNKNOWN COMMAND ENTERED")

        