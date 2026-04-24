from serial import Serial
import serial.tools.list_ports
# import re
import time
from backend.input.logfile_producer import parse_line
from backend.sockio.stream_xbee import enqueue_xbee_message
import backend.input.consumer as consumer

# Radio message pattern
# pattern = r'.+ ID (0x[0-9A-Fa-f]+) Length \d+ Data (0x[0-9A-Fa-f]+)'

def parse_radio_line(line: str) -> tuple[int, bytes]:
    """ Parses a line from the radio's serial output and returns the ID and data.

    This preserves the existing helper while delegating actual parsing
    to logfile_producer.parse_line so the same three formats are recognized.
    """

    parsed = parse_line(line)
    if parsed is None:
        return None

    id_int, data_bytes, _timestamp = parsed
    return (id_int, data_bytes)


def get_correct_port() -> str:
    """ Finds the radio's port"""

    ports = serial.tools.list_ports.comports()
    for port in ports:
        if "usb serial port" in port.description.lower():
            return port.device
    return None


def listen_to_radio():
    """ Listens to the radio for CAN messages and adds them to the queue. Runs forever"""

    port = get_correct_port()
    if port is None:
        print("ERROR: radio not found.")
        return

    try:
        ser = Serial(port, baudrate=9600)
        print(f"Serial connection to {port} established. Listening...")

        while True:
            try:
                text = ser.readline().decode("utf-8").strip()
                if text is None:
                    continue
                text_tuple = parse_radio_line(text)
                if text_tuple is None:
                    continue
                id, data = text_tuple
                timestamp = time.perf_counter() - consumer.start_consume_time
                # Emit XBee stream payloads to the frontend while still
                # sending the same decoded frames into the SQLite queue.
                enqueue_xbee_message(id, data, timestamp)
                consumer.add_to_queue(id, data, timestamp)

            except Exception as e:
                print(f"Serial Read Exception: {e}")
    except KeyboardInterrupt:
        ser.close()
        print("Serial connection to radio closed.")
