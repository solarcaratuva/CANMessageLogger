from serial import Serial
import serial.tools.list_ports
import re
from backend.input.consumer import queue
from backend.input.consumer import start_consume_time
import time

pattern = r'.+ ID (0x[0-9A-Fa-f]+) Length \d+ Data (0x[0-9A-Fa-f]+)'

def parse_radio_line(line: str) -> tuple[int, bytes, int]:
    match = re.match(pattern, line)
    if match is None:
        return None
    
    time_since_start = time.perf_counter() - start_consume_time
    time_since_start = int(time_since_start * 1000)  # Convert to milliseconds
    id_hex = match.group(1)
    id_int = int(id_hex, 16)
    data_hex = match.group(2)
    data_bytes = bytes.fromhex(data_hex[2:])

    return (id_int, data_bytes, time_since_start)



def get_correct_port() -> str:
    ports = serial.tools.list_ports.comports()
    for port in ports:
        if "usb serial port" in port.description.lower():
            return port.device
    return None

def listen_to_radio():
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
                if text:
                    text_tuple = parse_radio_line(text)
                    if text_tuple is None:
                        continue
                    queue.put(text_tuple)

            except Exception as e:
                print(f"Serial Read Exception: {e}")
    except KeyboardInterrupt:
        ser.close()
        print("Serial connection to radio closed.")
