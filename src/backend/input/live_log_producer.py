import time
from serial import Serial
import serial.tools.list_ports
from backend.input.logfile_producer import parse_line
import backend.input.consumer as consumer


def get_correct_port() -> str:
    """ Finds the ST-Link's port"""

    ports = serial.tools.list_ports.comports()
    for port in ports:
        if "stlink" in port.description.lower() or "st-link" in port.description.lower():
            return port.device
    return None


def listen_to_serial():
    """ Listens to the ST-Link for CAN messages in log statements and adds them to the queue. Runs forever"""

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
                    if text_tuple is None:
                        continue
                    id, data, timestamp = text_tuple # timestamp is derived from the log statement itself and therefore not used

                    sys_cm_tup = (id, data, time.perf_counter() - consumer.start_consume_time)
                    consumer.add_to_queue(sys_cm_tup)

            except Exception as e:
                print(f"Serial Read Exception: {e}")
    except KeyboardInterrupt:
        ser.close()
        print("Serial connection closed.")
