import os
import sys
import copy
import graphs
import threading
from serial import Serial
import serial.tools.list_ports
from messageParser import messageParser
from tqdm import tqdm
import datetime


running = True
logFilePath = None
tractedValues = {"pack_voltage":dict(), "pack_current":dict(), "pack_soc":dict(), "low_cell_voltage":dict(), "high_cell_voltage":dict(), "low_temperature":dict(), "high_temperature":dict(),
                 "battery_voltage":dict(), "battery_current":dict(), "battery_current_direction":dict(), "motor_current":dict(), "fet_temp":dict(), "motor_rpm":dict(), "pwm_duty":dict(), "lead_angle":dict(), "power_mode":dict(), "control_mode":dict(), "accelerator_vr_position":dict(), "regen_vr_position":dict(), "digital_sw_position":dict(), "output_target_value":dict(), "motor_status":dict(), "regen_status":dict(),
                 "throttle":dict(), "regen":dict(), "cruise_control_speed":dict(), "cruise_control_en":dict(), "forward_en":dict(), "reverse_en":dict(), "motor_on":dict(), "hazards":dict(), "brake_lights":dict(), "headlights":dict(), "left_turn_signal":dict(), "right_turn_signal":dict(), "total_current":dict(), "panel1_voltage":dict(), "panel2_voltage":dict(), "panel3_voltage":dict(), "panel4_voltage":dict(), "panel1_temp":dict(), "panel2_temp":dict(), "panel3_temp":dict(), "panel4_temp":dict()}

def checkForObviousErrors(key: str, value: int, message: str) -> None:
    maxValues = {"pack_voltage": 150, "pack_current": 110, "low_temperature": 200, "high_temperature": 200}
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
    

def messageHandler(unparsedMessage: str) -> None:
    messageDict, timestamp = messageParser(unparsedMessage)
    if messageDict == None:
        return
    if messageDict == {"ERROR": "ERROR"}:
        #print("ERROR THROWN!\n" + unparsedMessage)
        return
    for key in messageDict:
        if key in tractedValues:
            tractedValues[key][timestamp] = messageDict[key]
        #checkForObviousErrors(key, messageDict[key], unparsedMessage)


def readInFileData(filePath: str) -> bool:
    if not os.path.exists(filePath):
        return False
    logData = open(filePath, "r").readlines()
    progressBar = tqdm(total=len(logData), desc="Importing")
    for item in logData:
        messageHandler(item)
        progressBar.update(1)
    progressBar.close()
    print("Import Successful!")
    return True

def findTheSerialPort() -> Serial:
    ports = list(serial.tools.list_ports.comports())
    if len(ports) == 1:
        try:
            ser = Serial(ports[0].device, baudrate=921600)
            print("Opened serial port")
            return ser
        except Exception as e:
            print("Failed to open serial port")
            print(e)
    elif len(ports) == 0:
        print("No serial ports were found")
    elif len(ports) > 1:
        print("Multiple serial ports were found, could not determine which is the right one")
    return None
    
def serialInputReader(ser: Serial) -> None:
        try:
            while running:
                line = ser.readline().decode('utf-8').strip()
                with open(logFilePath, "a") as logFile:
                    logFile.write(line + "\n")
                messageHandler(line)
            ser.close()
        except KeyboardInterrupt:
            ser.close()

def getStaticDict(trackedValue: str, start: float, end: float) -> dict:
    copiedDict = copy.deepcopy(tractedValues[trackedValue])
    timestampList = list(copiedDict.keys())
    for timestamp in timestampList:
        if not (timestamp > start and timestamp < end):
            del copiedDict[timestamp]
    return copiedDict
    






if __name__ == "__main__": #Main Method
    if len(sys.argv) == 1: # Serial Input
        ser = findTheSerialPort()
        if ser == None:
            exit()
        timestamp = datetime.datetime.now().strftime("%S%M%H")
        logFilePath = f"log_{timestamp}.txt"
        serialInputReaderThread = threading.Thread(target=serialInputReader, args=(ser,))
        serialInputReaderThread.start()
    else: # File Input
        validFile = readInFileData(sys.argv[1])
        if not validFile:
            print("File not found")
            exit()


    currentGraphs = dict()
    while True:  # running operation commands
        command = input("Enter a command: ")
        command = command.split()   # split by spaces; [0] = command, [1] = item name, [2...] = other arguments
        if len(command) == 0:
            continue
        if command[0] == "quit":
            running = False
            break
        if len(command) <= 1:
            print("COMMAND MISSING ARGUMENTS")
            continue
        if command[1] not in tractedValues:
            print(f"THE VALUE \"{command[1]}\" IS NOT A TRACKED VALUE")
            continue
        
        match command[0]:   # normal cases
            case "add":
                if command[1] in currentGraphs:
                    thisGraph = currentGraphs[command[1]]
                    thisGraph.delete()
                    del currentGraphs[command[1]]
                if len(command) == 2:
                    thisDict = tractedValues[command[1]]
                    thisGraph = graphs.Graph(thisDict, command[1])
                    currentGraphs[command[1]] = thisGraph
                else:
                    thisDict = getStaticDict(command[1], float(command[2]), float(command[3]))
                    thisGraph = graphs.Graph(thisDict, command[1]+"-static")
                    currentGraphs[command[1]] = thisGraph
            case "rm":
                if command[1] not in currentGraphs:
                    print(f"\"{command[1]}\" is not an open graph")
                    continue
                thisGraph = currentGraphs[command[1]]
                thisGraph.delete()
                del currentGraphs[command[1]]
            case _:
                print("UNKNOWN COMMAND ENTERED")