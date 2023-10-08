import pandas as pd
import matplotlib.pyplot as plt

class Graph:
    def __init__(self, dict, name="", start=-1, end=-1):

        timeStamps = list(dict.keys())
        values = list(dict.values())

        if(start > -1 and end > -1):
            if(end > start):
                print("INPUT ERROR: ", )

            startIndex = timeStamps.index(start)
            endIndex = timeStamps.index(end) + 1
            df = pd.DataFrame(values[startIndex:endIndex], timeStamps[startIndex:endIndex], columns=['Time (seconds)'])
        else:
            df = pd.DataFrame(values, timeStamps, columns=['Time (seconds)'])
        df.plot(color = 'red', title = name + ' Over Time')

        plt.show()


    def update(this, dict, name, start=-1, end=-1):
        print()
        # CONSIDER USING DF.APPEND() from pandas

        # timeStamps = dict.keys()
        # values = dict.values()

        # df = pd.DataFrame(values, timeStamps, columns=['Time (seconds)'])
        # df.plot(color = 'red', title = name + ' Over Time')

        # plt.show()

    def delete(self, dict, name, start=-1, end=-1):
        print()

if __name__ == "__main__": #testing
     testDict = {1: 90, 2: 87, 3: 83, 4: 45, 5: 92, 6: 86, 7: 69, 8: 88, 9: 96, 10: 90, 11: 77}

     testGraph = Graph(testDict, "value1")

     #testGraph.update(testDict, "value1")
   