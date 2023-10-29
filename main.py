import os
import time
import graphs
import threading
from serial import Serial
import serial.tools.list_ports
from messageParser import messageParser


running = True
tractedValues = {"pack_voltage":dict(), "pack_current":dict(), "pack_soc":dict(), "low_cell_voltage":dict(), "high_cell_voltage":dict(), "low_temperature":dict(), "high_temperature":dict(),
                 "battery_voltage":dict(), "battery_current":dict(), "battery_current_direction":dict(), "motor_current":dict(), "fet_temp":dict(), "motor_rpm":dict(), "pwm_duty":dict(), "lead_angle":dict(), "power_mode":dict(), "control_mode":dict(), "accelerator_vr_position":dict(), "regen_vr_position":dict(), "digital_sw_position":dict(), "output_target_value":dict(), "motor_status":dict(), "regen_status":dict(),
                 "throttle":dict(), "regen":dict(), "cruise_control_speed":dict(), "cruise_control_en":dict(), "forward_en":dict(), "reverse_en":dict(), "motor_on":dict(), "hazards":dict(), "brake_lights":dict(), "headlights":dict(), "left_turn_signal":dict(), "right_turn_signal":dict(), "total_current":dict(), "panel1_voltage":dict(), "panel2_voltage":dict(), "panel3_voltage":dict(), "panel4_voltage":dict(), "panel1_temp":dict(), "panel2_temp":dict(), "panel3_temp":dict(), "panel4_temp":dict()}
currentGraphs = dict()

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
        print("ERROR THROWN!\n" + unparsedMessage)
    for key in messageDict:
        if key in tractedValues:
            tractedValues[key][timestamp] = messageDict[key]
        checkForObviousErrors(key, messageDict[key], unparsedMessage)


def readInFileData(filePath: str) -> bool:
    if not os.path.exists(filePath):
        return False
    logData = open(filePath, "r").readlines()
    for item in logData:
        messageHandler(item)
    print("Import Successful!")
    return True

def findTheSerialPort() -> Serial:
    ports = list(serial.tools.list_ports.comports())
    if len(ports) == 1:
        try:
            ser = Serial(ports[0].device, baudrate=921600)
            return ser
        except Exception as e:
            print("Failed to open port")
            print(e)
    elif len(ports) == 0:
        print("No ports were found")
    elif len(ports) > 1:
        print("Multiple ports were found, could not determine which is the right one")
    return None
    
def serialInputReader(ser: Serial) -> None:
        try:
            while running:
                line = ser.readline().decode('utf-8').strip()
                messageHandler(line)
            ser.close()
        except KeyboardInterrupt:
            ser.close()





if __name__ == "__main__": #Main Method
    while True: # getting user input
        inp = input("Enter \"serial\" to read from serial in real time OR enter the path of a log file\n")
        if inp == "serial":
            ser = findTheSerialPort()
            if ser == None:
                continue
            serialInputReaderThread = threading.Thread(target=serialInputReader, args=(ser,))
            serialInputReaderThread.start()
            break
        else:
            if readInFileData(inp):
                break
        print("The entry is not valid, try again")

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
                thisDict = tractedValues[command[1]]
                thisGraph = graphs.Graph(thisDict, command[1])
                currentGraphs[command[1]] = thisGraph
            case "rm":
                thisGraph = currentGraphs[command[1]]
                thisGraph.delete()
                del currentGraphs[command[1]]
            case "chg":
                if len(command) < 4:
                    print("There must be 2 arguments")
                    continue
                thisGraph = currentGraphs[command[1]]
                thisGraph.changeGraphRange(int(command[2]), int(command[3]))
            case _:
                print("UNKNOWN COMMAND ENTERED")