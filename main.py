import os
import time
import graphs
import test
import threading
import serial
import serial.tools.list_ports


running = True
startTime = None

tractedValues = {"pack_voltage":dict(), "pack_current":dict(), "pack_soc":dict(), "low_cell_voltage":dict(), "high_cell_voltage":dict(), "low_temperature":dict(), "high_temperature":dict(),
                 "battery_voltage":dict(), "battery_current":dict(), "battery_current_direction":dict(), "motor_current":dict(), "fet_temp":dict(), "motor_rpm":dict(), "pwm_duty":dict(), "lead_angle":dict(), "power_mode":dict(), "control_mode":dict(), "accelerator_vr_position":dict(), "regen_vr_position":dict(), "digital_sw_position":dict(), "output_target_value":dict(), "motor_status":dict(), "regen_status":dict(),
                 "MG0InputCurrent":dict(), "MG0InputVoltage":dict(), "MG1InputCurrent":dict(), "MG1InputVoltage":dict(), "MG0OutputVoltage":dict(), "MG0InputPower":dict(), "MG1OutputVoltage":dict(), "MG1InputPower":dict(), "MG0PCBTemperature":dict(), "MG0MOSFETTemperature":dict(), "MG1PCBTemperature":dict(), "MG1MOSFETTemperature":dict(),
                 "throttle":dict(), "regen":dict(), "cruise_control_speed":dict(), "cruise_control_en":dict(), "forward_en":dict(), "reverse_en":dict(), "motor_on":dict(), "hazards":dict(), "brake_lights":dict(), "headlights":dict(), "left_turn_signal":dict(), "right_turn_signal":dict(), "total_current":dict(), "panel1_voltage":dict(), "panel2_voltage":dict(), "panel3_voltage":dict(), "panel4_voltage":dict(), "panel1_temp":dict(), "panel2_temp":dict(), "panel3_temp":dict(), "panel4_temp":dict()}
currentGraphs = dict()

def checkForObviousErrors(key, value, message):
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
        return False
    logData = open(filePath, "r").readlines()
    for item in logData:
        messageHandler(item)
    print("Import Successful!")
    return True

def findTheSerialPort():
    ports = list(serial.tools.list_ports.comports())
    if len(ports) == 1:
        try:
            ser = serial.Serial(ports[0].device, baudrate=921600)
            return ser
        except Exception as e:
            print("Failed to open port")
            print(e)
    elif len(ports) == 0:
        print("No ports were found")
    elif len(ports) > 1:
        print("Multiple ports were found, could not determine which is the right one")
    
    time.sleep(2) # retrying
    print("Trying again...")
    return findTheSerialPort()
    
def serialInputReader(ser):
    while True:
        try:
            while True:
                line = ser.readline().decode('utf-8').strip()
                messageHandler(line)
        except KeyboardInterrupt:
            ser.close()

def graphUpdater():
    global currentGraphs
    for graph in currentGraphs.values:
        graph.update()
    time.sleep(3)





if __name__ == "__main__": #Main Method
    while True: # getting user input
        inp = input("Enter \"serial\" to read from serial in real time OR enter the path of a log file\n")
        if inp == "serial":
            ser = findTheSerialPort()
            serialInputReaderThread = threading.Thread(target=serialInputReader, args=(ser,))
            serialInputReaderThread.start()
            graphUpdaterThread = threading.Thread(target=graphUpdater)
            graphUpdaterThread.start()
            break
        else:
            if readInFileData(inp):
                break
        print("The entry is not valid, try again")

    while running == True:  # running operation commands
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
                thisGraph = currentGraphs[command[1]]
                thisGraph.change(command[2], command[3])
            case _:
                print("UNKNOWN COMMAND ENTERED")

        