import os
import time
import graphs
import test
import threading
import serial
import serial.tools.list_ports


running = True
startTime = None

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
    global startTime
    if startTime == None:
        startTime = time.perf_counter()
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

def findTheSerialPort():
    ports = list(serial.tools.list_ports.comports())
    if len(ports) == 0:
        print("No ports were found")
        return None
    if len(ports) > 1:
        print("Multiple ports were found, could not determine which is the right one")
    try:
        ser = serial.Serial(ports[0].device, baudrate=921600)
        return ser
    except Exception as e:
        print("Failed to open port")
        print(e)
        return None
    
def serialInputReader(ser):
    if ser == None:
        return
    while True:
        try:
            while True:
                line = ser.readline().decode('utf-8').strip()
                print(line)
                messageHandler(line)
        except KeyboardInterrupt:
            ser.close()
        global currentGraphs
        for graph in currentGraphs.values:
            graph.update()
        print(line)





if __name__ == "__main__": #Main Method
    inp = input("Enter \"serial\" to read from serial in real time OR enter the path of a log file\n")
    if inp == "serial":
        ser = findTheSerialPort()
        serialInputReaderThread = threading.Thread(target=serialInputReader, args=(ser,))
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

        