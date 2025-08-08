import backend.input.consumer as consumer
import time
import re


# Time in seconds between reading lines of a log file and adding them to the queue
LOOP_TIME = 0.01

# Logfile format:               Timestamp                 ID                              Data Bytes
pattern = re.compile(r'(\d{2}):(\d{2}):(\d{2}) .+ ID (0x[0-9A-Fa-f]+) Length \d+ Data (0x[0-9A-Fa-f]+)')

# These global vars are required for the non-live log-file processing
msIncrementer = 0
secondsPrevious = None


def parse_line(log_line: str) -> tuple[int, bytes, float]:
    global msIncrementer, secondsPrevious

    match = pattern.search(log_line)
    if match is None:  # if the line from the file does not match the REGEX, return none
        return None

    hours, minutes, seconds = map(int, match.groups()[:3])
    id_hex = match.group(4)
    data_hex = match.group(5)

    # Convert time to seconds
    seconds = hours * 3600 + minutes * 60 + seconds

    # Check if the seconds have changed (First message just ignore), if it has not changed then increment
    if secondsPrevious is not None and seconds == secondsPrevious:
        msIncrementer += 5 # assume the current message is 5ms after the previous one
    else:  # resets if it changes (or if it is the first message)
        msIncrementer = 0
        secondsPrevious = seconds

    seconds += msIncrementer / 1000

    # Convert the ID to an integer
    id_int = int(id_hex, 16)

    # Convert the data to a byte object
    data_bytes = bytes.fromhex(data_hex[2:])

    time_since_start = seconds

    cm_tuple = (id_int, data_bytes, time_since_start)
    return cm_tuple


def process_logfile(path_to_log_file: str) -> None:
    """ Processes a log file and adds all CAN messages to the queue"""

    with open(path_to_log_file, 'r') as file:
        for line in file:
            cm_tup = parse_line(line)
            if cm_tup is not None:  # if the line from log file followed the format, add to queue
                consumer.add_to_queue(cm_tup)


# Emphasize: For this function TimeStamp is NOT taken from logfile, it is system time (see sys_cm_tuple)
def process_logfile_live(path_to_log_file: str) -> None:
    """ Mocks a live data source by incrementally processing a log file and adding CAN messages to the queue"""

    with open(path_to_log_file, 'r') as file:
        for line in file:
            cm_tup = parse_line(line)
            if cm_tup is None: # line did not match the format
                continue
            id, data, timestamp = cm_tup # timestamp is derived from the log statement itself and therefore not used

            sys_cm_tup = (id, data, time.perf_counter() - consumer.start_consume_time)
            consumer.add_to_queue(sys_cm_tup)
            time.sleep(LOOP_TIME)

