// Import the socket client
import { socket } from './socket';

// Function to start emitting mock data
export function startMockData() {
  // Emit mock data every second
  setInterval(() => {
    const mockData = {
      speed: Math.floor(Math.random() * 120),       // speed in km/h
      batteryTemp: Math.floor(Math.random() * 50),  // battery temperature in °C
      motorRPM: Math.floor(Math.random() * 8000),   // motor RPM
    };

    // Emit a custom event named 'mock-data'
    socket.emit('mock-data', mockData);
  }, 1000); // 1000ms = 1 second
}
