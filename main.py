import time


logFilePath = "Logging_Data.txt"
linesReadCount = 0

tractedValues = dict()

def checkForObviousErrors(key): #TODO
    return False

def messageHandler(unparsedMessage):
    messageDict, timestamp = dict() # get from Jimmy's parser
    for key in messageDict:
        if key in tractedValues:
            tractedValues[key][timestamp] = messageDict[key]
        if checkForObviousErrors(key):
            print("ERRONEOUS DATA DETECTED! " + 
                  "\nKey: " + str(key) + 
                  "\nVALUE: "+ str(messageDict[key]) + 
                  "\nFULL MESSAGE: " + str(unparsedMessage))
            

def dataUpdater():
    global linesReadCount
    logData = open(logFilePath, "r").readlines()
    newLogData = logData[linesReadCount:]
    linesReadCount = len(logData)

    for item in newLogData:
        print(item)
        #messageHandler(item)

if __name__ == "__main__": #testing
    while True:
        dataUpdater()
        print("UPDATED")
        time.sleep(5)
        