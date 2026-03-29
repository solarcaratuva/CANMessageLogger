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


# New Pattern for: 687,0x400,8,01 00 00 00 00 00 00 00
# Groups: (Timestamp), (Hex ID), (Length), (Hex Data)
pattern = re.compile(r'(\d+),(0x[0-9A-Fa-f]+),(\d+),([0-9A-Fa-f\s]+)')

def parse_line(log_line: str) -> tuple[int, bytes, float]:
    match = pattern.search(log_line)
    if match is None:
        return None

    raw_timestamp = match.group(1)
    id_hex = match.group(2)
    # Group 4 is the data bytes with spaces; we remove spaces for fromhex()
    data_hex = match.group(4).replace(" ", "")

    # Convert to standard units
    id_int = int(id_hex, 16)
    data_bytes = bytes.fromhex(data_hex)
    
    # Convert ms timestamp to seconds
    time_since_start = int(raw_timestamp) / 1000.0

    return (id_int, data_bytes, time_since_start)

def process_logfile(path_to_log_file: str) -> None:
    """ Processes a log file and adds all CAN messages to the queue"""

    with open(path_to_log_file, 'r') as file:
        for line in file:
            cm_tup = parse_line(line)
            if cm_tup is not None:  # if the line from log file followed the format, add to queue
                consumer.add_to_queue(*cm_tup)


# Emphasize: For this function TimeStamp is NOT taken from logfile, it is system time
def process_logfile_live(path_to_log_file: str) -> None:
    """ Mocks a live data source by incrementally processing a log file and adding CAN messages to the queue"""

    with open(path_to_log_file, 'r') as file:
        for line in file:
            cm_tup = parse_line(line)
            if cm_tup is None: # line did not match the format
                continue
            id, data, timestamp = cm_tup # timestamp is derived from the log statement itself and therefore not used

            consumer.add_to_queue(id, data, time.perf_counter() - consumer.start_consume_time)
            time.sleep(LOOP_TIME)

