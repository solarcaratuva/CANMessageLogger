import pandas as pd
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation
from datetime import datetime, timedelta
import numpy as np


class Graph:
    
    def __init__(self, inputDict, name):
        self.name = name
        self.dict = inputDict
        self.figure, self.ax = plt.subplots()
        self.update()
        self.ani = FuncAnimation(self.figure, self.update, blit=False, interval=3000, cache_frame_data=False)
        plt.show(block=False)
        
    
    def delete(self):
        self.ani.event_source.stop()
        plt.close(self.figure)


    def update(self, *args):
        timestamps = list(self.dict.keys())
        values = list(self.dict.values())
        self.ax.clear()  # Clear the current axes
        self.df = pd.DataFrame({'Values': values}, index=timestamps)
        self.df.index.name = 'Time (seconds)'
        self.plot, = self.ax.plot(self.df.index, self.df['Values'])
        self.ax.set_title(self.name + " vs Time")
        self.ax.set_xlabel('Time (seconds)')
        self.ax.set_ylabel('Values')