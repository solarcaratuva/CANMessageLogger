import random

count = 0

def testing():
    global count
    count += 1
    dict = {"throttle": random.random() * 10}
    return dict, count