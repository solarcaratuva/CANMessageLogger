from serial import Serial
import serial.tools.list_ports
import re
import time
from cobs import cobs
import backend.input.consumer as consumer


def get_correct_port() -> str:
    """ Finds the radio's port"""

    ports = serial.tools.list_ports.comports()
    for port in ports:
        if "FT232R".lower() in port.description.lower():
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
                cobs_bytes = ser.read_until(b'\x00')[:-1]
                decoded_bytes = cobs.decode(cobs_bytes)
                id = int.from_bytes(decoded_bytes[0:2], byteorder='big')
                data = decoded_bytes[2:]
                consumer.add_to_queue(id, data, time.perf_counter() - consumer.start_consume_time)

            except Exception as e:
                print(f"Serial Read Exception: {e}")
    except KeyboardInterrupt:
        ser.close()
        print("Serial connection to radio closed.")
