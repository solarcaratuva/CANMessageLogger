#intializes socketIO instance to avoid ciruclar imports
#btwn socket.py and streamRaceData.py

from flask_socketio import SocketIO

socketio = SocketIO()
