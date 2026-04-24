import time
from queue import Queue, Empty
from backend.sockio.extensions import socketio
from backend.can_message import decode_message

# Event name used for all backend data stream emissions.
BACKEND_DATA_STREAM = "backend_data_stream"

# Keep a separate queue for XBee/radio events so the SQLite consumer queue is not disturbed.
xbee_queue: Queue = Queue()


def enqueue_xbee_message(id: int, data: bytes, timestamp: float) -> None:
    """Queue a parsed XBee/radio message for websocket emission."""
    xbee_queue.put((id, data, timestamp))


def format_message_payload(id: int, data: bytes, timestamp: float) -> dict:
    """Build a human-readable JSON payload for the frontend."""
    decoded = decode_message(id, data, timestamp)
    payload = {
        "source": "xbee",
        "messageId": hex(id),
        "timestamp": timestamp,
        "rawData": data.hex(),
    }
    if decoded is not None:
        payload["messageName"] = decoded.messageName
        payload["signals"] = decoded.sigDict
    else:
        payload["messageName"] = None
        payload["signals"] = None
    return payload


def xbee_emit_loop():
    """Emit queued XBee/radio messages to connected Socket.IO clients."""
    while True:
        batch = []
        while True:
            try:
                id, data, timestamp = xbee_queue.get_nowait()
            except Empty:
                break
            batch.append(format_message_payload(id, data, timestamp))

        if batch:
            socketio.emit(BACKEND_DATA_STREAM, batch)
        socketio.sleep(0.2)
