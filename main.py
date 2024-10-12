import re
import sys
import matplotlib.pyplot as plt

PATTERN = re.compile(r'(\d+):(\d+):(\d+) DEBUG /root/Rivanna2/Common/src/MainCANInterface.cpp:40: (\d+)')

xAxis = list()
yAxis = list()

def process(line: str) -> None:
    match = PATTERN.match(line)
    if match is None:
        return
    
    hours, minutes, seconds, value = match.groups()
    timestamp = int(hours) * 3600 + int(minutes) * 60 + int(seconds)

    xAxis.append(timestamp)
    yAxis.append(float(value))


def subset() -> None:
    global xAxis
    global yAxis

    start = int(sys.argv[2])
    end = int(sys.argv[3])

    xAxisSubset = list()
    yAxisSubset = list()

    for i in range(len(xAxis)):
        if xAxis[i] >= start and xAxis[i] <= end:
            xAxisSubset.append(xAxis[i])
            yAxisSubset.append(yAxis[i])

    xAxis = xAxisSubset
    yAxis = yAxisSubset


def main() -> None:
    with open(sys.argv[1]) as log:
        for line in log:
            process(line)

    if len(sys.argv) == 4:
        subset()

    print(f'{len(xAxis)} datapoints')
    plt.scatter(xAxis, yAxis)
    plt.xlabel('Time (s)')
    plt.ylabel('Value')
    plt.show()

if __name__ == '__main__':
    main()