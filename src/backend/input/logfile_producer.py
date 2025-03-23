from backend.input.consumer import queue, start_consume_time
import time

import re

LOOP_TIME = 0.01

#                          Timestamp                        ID                              Data Bytes
pattern = re.compile(r'(\d{2}):(\d{2}):(\d{2}) DEBUG .+ ID (0x[0-9A-Fa-f]+) Length \d+ Data (0x[0-9A-Fa-f]+)')

# These global vars are required for the non-live log-file processing
msIncrementer = 0
msPrevious = None


def parse_line(log_line: str) -> tuple[int, bytes, int]:
    global msIncrementer, msPrevious

    match = pattern.search(log_line)
    if match is None:  # if the line from the file does not match the REGEX, return none
        return None

    hours, minutes, seconds = map(int, match.groups()[:3])
    id_hex = match.group(4)
    data_hex = match.group(5)

    # Convert time to milliseconds
    milliseconds = (hours * 3600 + minutes * 60 + seconds) * 1000

    # Check if the seconds have changed (First message just ignore), if it has not changed then increment
    if msPrevious is not None and milliseconds == msPrevious:
        msIncrementer += 5
    else:  # resets if it changes (or if it is the first message)
        msIncrementer = 0
        msPrevious = milliseconds

    milliseconds += msIncrementer

    # Convert the ID to an integer
    id_int = int(id_hex, 16)

    # Convert the data to a byte object
    data_bytes = bytes.fromhex(data_hex[2:])

    time_since_start = milliseconds

    cm_tuple = (id_int, data_bytes, time_since_start)
    return cm_tuple


def process_logfile(path_to_log_file: str) -> None:
    print("log_file")
    with open(path_to_log_file, 'r') as file:
        for line in file:
            cm_tup = parse_line(line)
            if cm_tup is not None:  # if the line from log file followed the format, add to queue
                queue.put(cm_tup)


# Emphasize: For this function TimeStamp is NOT taken from logfile, it is system time (see sys_cm_tuple)
def process_logfile_live(path_to_log_file: str) -> None:
    print("log_file_live")
    with open(path_to_log_file, 'r') as file:
        for line in file:
            cm_tup = parse_line(line)
            if cm_tup is not None:  # if the line from log file followed the format, add to queue
                sys_cm_tup = (cm_tup[0], cm_tup[1], time.perf_counter() - start_consume_time)  # from the System Time
                queue.put(sys_cm_tup)
            time.sleep(LOOP_TIME)

