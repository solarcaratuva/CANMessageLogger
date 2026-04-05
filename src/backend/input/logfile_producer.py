import backend.input.consumer as consumer
import time
import re

# Time in seconds between reading lines of a log file and adding them to the queue
LOOP_TIME = 0.01

# Solar log format
# Example: 00:00:01 DEBUG /root/Rivanna2/Common/src/MainCANInterface.cpp:40: Sent CAN message with ID 0x406 Length 6 Data 0xa41f770200c0
#
# Group 1: (\d{2})              - Hours   (e.g. "00")
# Group 2: (\d{2})              - Minutes (e.g. "00")
# Group 3: (\d{2})              - Seconds (e.g. "01")
#          .+                   - Matches the middle text (DEBUG, file path, "Sent CAN message with")
# Group 4: (0x[0-9A-Fa-f]+)    - CAN message hex ID after "ID " (e.g. "0x406")
#          Length \d+            - Matches "Length" and its digit(s), not captured (e.g. "Length 6")
# Group 5: (0x[0-9A-Fa-f]+)    - Raw hex data bytes after "Data " (e.g. "0xa41f770200c0")
solarPattern = re.compile(r'(\d{2}):(\d{2}):(\d{2}) .+ ID (0x[0-9A-Fa-f]+) Length \d+ Data (0x[0-9A-Fa-f]+)')

# These global vars are required for the non-live log-file processing
msIncrementer = 0
secondsPrevious = None


# Custom Coon Format: 687,0x400,8,01 00 00 00 00 00 00 00
# Groups: (Timestamp), (Hex ID), (Length), (Hex Data)
coonPattern = re.compile(r'(\d+),(0x[0-9A-Fa-f]+),(\d+),([0-9A-Fa-f\s]+)')

def parse_line(log_line: str) -> tuple[int, bytes, float]:
    global msIncrementer, secondsPrevious

    if '/' in log_line:
        match = solarPattern.search(log_line)
        if match is None:
            return None

        hours = int(match.group(1))
        minutes = int(match.group(2))
        seconds = int(match.group(3))
        id_hex = match.group(4)
        data_hex = match.group(5).replace("0x", "")

        id_int = int(id_hex, 16)
        data_bytes = bytes.fromhex(data_hex)

        total_seconds = hours * 3600 + minutes * 60 + seconds
        if secondsPrevious == total_seconds:
            msIncrementer += 1
        else:
            msIncrementer = 0
            secondsPrevious = total_seconds

        time_since_start = total_seconds + msIncrementer * 0.001

        return (id_int, data_bytes, time_since_start)
    else:
        match = coonPattern.search(log_line)
        if match is None:
            return None

        raw_timestamp = match.group(1)
        id_hex = match.group(2)
        data_hex = match.group(4).replace(" ", "")

        id_int = int(id_hex, 16)
        data_bytes = bytes.fromhex(data_hex)

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

