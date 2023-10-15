import pandas as pd
import matplotlib.pyplot as plt

class Graph:
    
    startIndex = 0
    endIndex = 0
    start = -1
    end = -1
    name = ""
    logDict = {}
    df = pd.DataFrame()

    def __init__(self, inputDict, inputName="", inputStart=-1, inputEnd=-1):
        name = inputName
        logDict = inputDict
        start = inputStart
        end = inputEnd
        self.update()
        

    def update():
        global startIndex, endIndex, logDict, name, start, end
        timeStamps = list(logDict.keys())
        values = list(logDict.values())

        if(start > -1 and end > -1):
            if(end > start):
                print("INPUT ERROR: ", )

            startIndex = timeStamps.index(start)
            endIndex = timeStamps.index(end) + 1
            df = pd.DataFrame(values[startIndex:endIndex], timeStamps[startIndex:endIndex], columns=['Time (seconds)'])
        else:
            df = pd.DataFrame(values, timeStamps, columns=['Time (seconds)'])
        df.plot(color = 'red', title = name + ' Over Time')

        plt.show(block=False)

    def delete(self, dict, name):
        df = pd.DataFrame()
        startIndex = 0
        endIndex = 0

if __name__ == "__main__": #testing
     testDict = {1: 90, 2: 87, 3: 83, 4: 45, 5: 92, 6: 86, 7: 69, 8: 88, 9: 96, 10: 90, 11: 77}

     testGraph = Graph(testDict, "value1")

     #testGraph.update(testDict, "value1")
   