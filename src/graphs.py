import threading

import pandas as pd
import matplotlib.pyplot as plt
import time
from matplotlib.animation import FuncAnimation
from datetime import datetime, timedelta
import numpy as np
import math


class Graph:
    
    def __init__(self, inputDict, name):
        self.name = name
        self.dict = inputDict
        self.figure, self.ax = plt.subplots()
        self.update()
        self.ani = FuncAnimation(self.figure, self.update(), blit=False, interval=3000, cache_frame_data=False)
        plt.show(block=False)
        
    
    def delete(self):
        plt.close(self.figure)


    def update(self):
        timestamps = list(self.dict.keys())
        values = list(self.dict.values())
        self.ax.clear()  # Clear the current axes
        self.df = pd.DataFrame({'Values': values}, index=timestamps)
        self.df.index.name = 'Time (seconds)'
        self.plot, = self.ax.plot(self.df.index, self.df['Values'])
        plt.title(self.name + " vs Time")
        plt.xlabel('Time (seconds)')
        plt.ylabel('Values')
        plt.draw()
        plt.pause(0.01)  # Give the event loop a chance to handle events
        print("Updated "+self.name)


    # def changeGraphRange(self, newStarting, newEnding):
    #     self.start = math.ceil(newStarting)
    #     self.startIndex = start
    #     self.end = math.floor(newEnding)
    #     self.endIndex = end
    #     self.update()
        

    # def update(self):

    #     timeStamps = list(self.logDict.keys())
    #     values = list(self.logDict.values())
    #     self.lastIndex = len(self.logDict)
    #     if(len(timeStamps) < 1):
    #         print("NO REAL DATA VALUES")
    #         timeStamps = [0]
    #         values = [0]

    #     if(self.start > -1 and self.end > -1):
    #         if(self.end > self.start):
    #             print("INPUT ERROR: ending index is smaller than starting index: ")

    #         print(self.startIndex, self.endIndex)
    #         self.startIndex = timeStamps[self.start]
    #         self.endIndex = timeStamps[self.end + 1]

    #         self.df = pd.DataFrame(values[self.startIndex:self.endIndex], timeStamps[self.startIndex:self.endIndex], columns=['Time (seconds)'])
    #     else:
    #         self.df = pd.DataFrame(values, timeStamps, columns=['Time (seconds)'])
    #     self.df.plot(color = 'red', title = self.name + ' Over Time')

    #     self.ani = FuncAnimation(plt.gcf(), self.update_graph, interval=3000, cache_frame_data=False)
    #     plt.show(block=False)

            
    # def update_animated(self):

    #     print("triggered update_animated()")
    #     timeStamps = list(self.logDict.keys())
    #     values = list(self.logDict.values())

    #     newDF = pd.DataFrame(values[self.lastIndex:], timeStamps[self.lastIndex:], columns=['Time (seconds)'])
    #     self.df = pd.concat(self.df, newDF)
    #     self.lastIndex = len(self.logDict)

    # def delete(self):
    #     self.df = pd.DataFrame()
    #     self.startIndex = 0
    #     self.endIndex = 0
    #     plt.close()

    

    def addNewRow(self, num):
        while num > 0:
            self.logDict[len(self.logDict)+1] = np.random.randint(0, 100)
            num -= 1
            time.sleep(1)
            print(self.logDict)

# if __name__ == "__main__": #testing

#     data = pd.DataFrame(columns=["Time", "Value"])
#     testDict = {1: 90, 2: 87, 3: 83, 4: 45, 5: 92, 6: 86, 7: 69, 8: 88, 9: 96, 10: 90, 11: 77}
#     testGraph = Graph(testDict, "value1")

#     x = 12
#     num = 70

#     # addingValuesThread = threading.Thread(target=testGraph.addNewRow, args=(20,))
#     # addingValuesThread.start()



#     #ani = FuncAnimation(plt.gcf(), testGraph.update_graph, interval=100)  # Update every 1 second (1000 milliseconds)
#     plt.show()

#     testGraph.changeGraphRange(4, 9)
#     plt.show()


#     testDict[12] = 90
#     time.sleep(2)
#     testDict[13] = 100


    

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
   




if __name__ == "__main__":
    data1 = {1:1, 2:2, 3:3, 4:4}
    graph = Graph(data1, "name")
    graph2 = Graph(data1, "name2")
    inp = input()
    #time.sleep(5)
    print("NEXT")
    data1[5] = 6
    data1[7] = 7
    #graph.update()
    inp = input()
    #graph2.update()
    inp = input()
    graph.delete()
    time.sleep(3)
    graph2.delete()
    print("DONE")

