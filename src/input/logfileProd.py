from src.input.consumer import queue

import re

#                          Timestamp                        ID                              Data Bytes
pattern = re.compile(r'(\d{2}):(\d{2}):(\d{2}) DEBUG .+ ID (0x[0-9A-Fa-f]+) Length \d+ Data (0x[0-9A-Fa-f]+)')

start_time_mseconds = None
millisecond_incrementer = 0
previous_mseconds = None


def parse_line(log_line: str) -> tuple[int, bytes, float]:
    global start_time_mseconds, millisecond_incrementer, previous_mseconds

    match = pattern.search(log_line)
    if match is None:  # if the line from the file does not match the REGEX, return none
        return None

    hours, minutes, seconds = map(int, match.groups()[:3])
    id_hex = match.group(4)
    data_hex = match.group(5)

    # Convert time to milliseconds
    milliseconds = (hours * 3600 + minutes * 60 + seconds) * 1000

    # Check if the seconds have changed (First message just ignore), if it has not changed then increment
    if previous_mseconds is not None and milliseconds == previous_mseconds:
        millisecond_incrementer += 5
    else:  # resets if it changes (or if it is the first message)
        millisecond_incrementer = 0
        previous_mseconds = milliseconds

    milliseconds += millisecond_incrementer

    # Convert the ID to an integer
    id_int = int(id_hex, 16)

    # Convert the data to a byte object
    data_bytes = bytes.fromhex(data_hex[2:])

    if start_time_mseconds is None:
        start_time_mseconds = milliseconds

    time_since_start = milliseconds - start_time_mseconds

    cm_tuple = (id_int, data_bytes, time_since_start)
    return cm_tuple


def process_logfile(path_to_log_file: str) -> None:
    with open(path_to_log_file, 'r') as file:
        for line in file:
            cm_tup = parse_line(line)
            if cm_tup is not None:  # if the line from log file followed the format, add to queue
                queue.put(cm_tup)


'''
    global timer
    if timer == None:
        timer = time.perf_counter()

    for msg in ERRORS_LIST:
        if msg in message:
            return {"ERROR": "ERROR"}, None

    match = re.match(PATTERN, message)
    print(match)
    if match is None:
        return None, None
    canID = match.group(2)
    canData = match.group(4)

    messageDict = decode_dbc(canID, canData)
    return messageDict, time.perf_counter() - timer
'''
