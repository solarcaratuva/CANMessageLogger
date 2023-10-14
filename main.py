import os
import time
import graphs
import test
import threading


logFilePath = "Logging_Data.txt"
logFilePath = "test.txt"
linesReadCount = 0
running = True

tractedValues = {"throttle": dict()}
currentGraphs = dict()

def checkForObviousErrors(key): #TODO
    return False

def messageHandler(unparsedMessage):
    messageDict, timestamp = test.testing() # get from Jimmy's parser
    for key in messageDict:
        if key in tractedValues:
            tractedValues[key][timestamp] = messageDict[key]
        if checkForObviousErrors(key):
            print("ERRONEOUS DATA DETECTED! " + 
                  "\nKey: " + str(key) + 
                  "\nVALUE: "+ str(messageDict[key]) + 
                  "\nFULL MESSAGE: " + str(unparsedMessage))
            

def dataUpdater():
    global linesReadCount, currentGraphs
    while running == True:
        logData = open(logFilePath, "r").readlines()
        newLogData = logData[linesReadCount:]
        linesReadCount = len(logData)

        for item in newLogData:
            messageHandler(item)
        #print("UPDATED")

        #for graph in currentGraphs:
            #graph.update()
        time.sleep(1)

def readInFileData(filePath):
    logData = open(logFilePath, "r").readlines()
    for item in logData:
        messageHandler(item)
    print("Import Successful!")

def serialInputReader():
    print()





if __name__ == "__main__": #Main Method
    input = input("Enter \"serial\" to read from serial in real time OR enter the path of a log file")
    if input == "serial":
        serialInputReaderThread = threading.Thread(target=serialInputReader)
        serialInputReaderThread.start()
    elif not os.path.exists(input):
        print("The path is invalid!")
    else:
        readInFileData(input)

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
            case _:
                print("UNKNOWN COMMAND ENTERED")

        