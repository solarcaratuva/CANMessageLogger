import sys
from serial import Serial
import serial.tools.list_ports
import time
from backend.input.consumer import queue
from backend.input.logfile_producer import parse_line

def get_correct_port() -> str:
    ports = serial.tools.list_ports.comports()
    for port in ports:
        if "stlink" in port.description.lower() or "st-link" in port.description.lower():
            return port.device
    return None

def listen_to_serial():
    port = get_correct_port()
    if port is None:
        print("ERROR: ST-Link not found.")
        return

    try:
        ser = Serial(port, baudrate=921600)
        print(f"Serial connection to {port} established. Listening...")
        while True:
            try:
                text = ser.readline().decode("utf-8").strip()
                if text:
                    text_tuple = parse_line(text)
                    queue.put(text_tuple)

            except Exception as e:
                print(f"Serial Read Exception: {e}")
    except KeyboardInterrupt:
        ser.close()
        print("Serial connection closed.")
