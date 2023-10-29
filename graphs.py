import threading

import pandas as pd
import matplotlib.pyplot as plt
import time
from matplotlib.animation import FuncAnimation
from datetime import datetime, timedelta
import numpy as np
import math


class Graph:
    
    startIndex = 0
    endIndex = 0
    start = -1
    end = -1
    name = ""
    logDict = {}
    df = pd.DataFrame()
    lastIndex = 0
    

    def __init__(self, inputDict, inputName="", inputStart=-1, inputEnd=-1):
        global name, logDict, start, end
        name = inputName
        logDict = inputDict
        start = math.ceil(inputStart)
        end = math.floor(inputEnd)
        self.update()

    def changeGraphRange(self, newStarting, newEnding):
        global start, end
        
        start = math.ceil(newStarting)
        end = math.floor(newEnding)
        self.update()
        

    def update(self):
        
        global start, end, startIndex, endIndex, name, logDict, df, lastIndex
        if(len(logDict) > 1):
            plt.close()

        timeStamps = list(logDict.keys())
        values = list(logDict.values())
        lastIndex = len(logDict)

        if(len(timeStamps) < 1):
            print("NO REAL DATA VALUES")
            timeStamps = [0]
            values = [0]

        if(start > -1 and end > -1):
            if(end > start):
                print("INPUT ERROR: ending index is smaller than starting index: ")

            startIndex = timeStamps.index(start)
            endIndex = timeStamps.index(end) + 1

            df = pd.DataFrame(values[startIndex:endIndex], timeStamps[startIndex:endIndex], columns=['Time (seconds)'])
        else:
            df = pd.DataFrame(values, timeStamps, columns=['Time (seconds)'])
        df.plot(color = 'red', title = self.name + ' Over Time')

        self.ani = FuncAnimation(plt.gcf(), self.update_graph, interval=40, cache_frame_data=False)
        plt.show(block=False)

            
    def update_animated():
        global df, logDict, lastIndex

        print("triggered update_animated()")
        timeStamps = list(logDict.keys())
        values = list(logDict.values())

        newDF = pd.DataFrame(values[lastIndex:], timeStamps[lastIndex:], columns=['Time (seconds)'])
        df = pd.concat(df, newDF)
        lastIndex = len(logDict)




    def delete(self):
        global df, startIndex, endIndex
        df = pd.DataFrame()
        startIndex = 0
        endIndex = 0
        plt.close()

    def update_graph(self, i):
        global data, df, logDict, lastIndex
        
        timeStamps = list(logDict.keys())
        values = list(logDict.values())

        newDF = pd.DataFrame(values[lastIndex:], timeStamps[lastIndex:], columns=['Time (seconds)'])
        #print(lastIndex, newDF, logDict)
        lastIndex+=1
        time.sleep(1)

        data = pd.concat([df, newDF], ignore_index=True)

        
        plt.cla()
        plt.xlabel("Time")
        plt.ylabel("Value")
        plt.title("Live Data Plot")
        plt.plot(timeStamps, values)

    def addNewRow(self, num):
        global logDict
        while num > 0:
            logDict[len(logDict)+1] = np.random.randint(0, 100)
            num -= 1
            time.sleep(1)
            print(logDict)

if __name__ == "__main__": #testing

    data = pd.DataFrame(columns=["Time", "Value"])
    testDict = {1: 90, 2: 87, 3: 83, 4: 45, 5: 92, 6: 86, 7: 69, 8: 88, 9: 96, 10: 90, 11: 77}
    testGraph = Graph(testDict, "value1")

    x = 12
    num = 70

    addingValuesThread = threading.Thread(target=testGraph.addNewRow, args=(20,))
    addingValuesThread.start()


    #ani = FuncAnimation(plt.gcf(), testGraph.update_graph, interval=100)  # Update every 1 second (1000 milliseconds)
    plt.show()


    testDict[12] = 90
    time.sleep(2)
    testDict[13] = 100


    

    # def update_graph(i):
    #     global data
    #     current_time = datetime.now()
    #     new_row = {"Time": current_time, "Value": np.random.randint(0, 100)}  # Simulated data, replace with your data source
    #     new_data = pd.DataFrame(new_row, index=[0])  # Create a new DataFrame for the new data

    #     data = pd.concat([data, new_data], ignore_index=True)

    #     # Filter data to show only the last N seconds
    #     time_threshold = current_time - timedelta(seconds=10000)  # Display data from the last 10 seconds
    #     data = data[data["Time"] >= time_threshold]

    #     plt.cla()
    #     plt.plot(data["Time"], data["Value"])
    #     plt.gcf().autofmt_xdate()  # Format the x-axis for datetime
    #     plt.xlabel("Time")
    #     plt.ylabel("Value")
    #     plt.title("Live Data Plot")
    
    

    #  global df
    #  testDict = {1: 90, 2: 87, 3: 83, 4: 45, 5: 92, 6: 86, 7: 69, 8: 88, 9: 96, 10: 90, 11: 77}
    #  print(testDict)

    #  testGraph = Graph(testDict, "value1")

    #  ani = FuncAnimation(plt.gcf(), testGraph.update_animated, interval=100)
    #  plt.show()
    #  testGraph = Graph(testDict, "value1")
    #  testDict[12] = 200
    #  print(testDict)

    #  testGraph.update()
    #  print("updated once, about to delete")
    #  print("test grpah before delete", df)
    #  testGraph.changeGraphRange(5, 8)
    #  time.sleep(5)
    #  testGraph.delete()
    #  print("deleted", df)
   