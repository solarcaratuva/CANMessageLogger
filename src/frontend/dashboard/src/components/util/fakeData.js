//fake data generation for all dashbaord components

export const generateSpeedData = () => {
  const max = Math.floor(Math.random() * 50) + 30; // 30–80 mph
  const min = Math.floor(Math.random() * 30);      // 0–30 mph
  const average = Math.floor((max + min) / 2);     // halfway between
  const current = average + Math.floor(Math.random() * 5); // small variation

  return { max, min, average, current };
};

export const generateMotorCommands = () => {
  // Generate random boolean values
  const breaking = Math.random() > 0.7; // 30% chance of breaking
  const cruise = Math.random() > 0.5;   // 50% chance of cruise
  const manual = !cruise;

  // brakePedal values between 0 - 100
  const brakePedal = breaking 
    ? Math.floor(Math.random() * 60) + 40  // 40-100 if breaking
    : Math.floor(Math.random() * 40);      // 0-40 if not breaking

  // throttlePedal values
  const throttlePedal = breaking
    ? 0                                     // 0 if breaking
    : Math.floor(Math.random() * 80) + 20; // 20-100 if not breaking

  // Motor RPM (typically 0-8000 for most vehicles)
  const motorRPM = breaking
    ? Math.floor(Math.random() * 2000) + 1000  // 1000-3000 when braking
    : Math.floor(Math.random() * 4000) + 2000; // 2000-6000 when not braking
  
  // Throttle percentage (0-100%)
  const throttle = breaking
    ? 0                                        // 0 when braking
    : Math.floor(Math.random() * 70) + 30;    // 30-100% when not braking

  return { breaking, cruise, manual, throttlePedal, brakePedal, throttle, motorRPM };
};

export const generateCanValues = () => {
  return {
    motorTemp: 80 + Math.floor(Math.random() * 10),
    current: 50 + Math.floor(Math.random() * 20),
  };
};

export const generateErrors = () => {
  const POSSIBLE_ERRORS = [
    "Motor Overheat",
    "Battery Low",
    "Connection Lost",
    "Sensor Fault",
    "System Error",
  ];

  if (Math.random() > 0.9) {
    const randomError = POSSIBLE_ERRORS[Math.floor(Math.random() * POSSIBLE_ERRORS.length)];
    return [randomError];
  }
  return [];
};

export const generateHeartbeat = () => {
  return {
    board1: Math.random() > 0.1,
    board2: Math.random() > 0.1,
  };
};

export const generateLteStatus = () => {
  return {
    lastMessageSec: Math.floor(Math.random() * 10),
  };
};

export const generateXbeeSatus = () => {
  return{
    lastMessageSec: Math.floor(Math.random() * 10),
  };
};

export const generateWheelboard = () => {
  const TURN_SIGNALS = ["Left", "Right", "Off"];
  
  return {
    hazards: Math.random() > 0.8,
    turnSignal: TURN_SIGNALS[Math.floor(Math.random() * TURN_SIGNALS.length)],
  };
};

export const generateGpsData = () => {
  // Simulate movement around a track/route (UVA location)
  const latitude = 38.0293 + (Math.random() - 0.5) * 0.01;
  const longitude = -78.4767 + (Math.random() - 0.5) * 0.01;
  const altitude = 200 + Math.floor(Math.random() * 50);
  const accuracy = Math.floor(Math.random() * 5) + 1; // 1-6 meters
  const speed = Math.floor(Math.random() * 120); // Speed from GPS

  return { latitude, longitude, altitude, accuracy, speed };
};

export const generateImuData = () => {
  // Acceleration in G (9.8 m/s²)
  const accelX = (Math.random() - 0.5) * 2; // -1 to 1 G
  const accelY = (Math.random() - 0.5) * 2; // -1 to 1 G
  const accelZ = (Math.random() - 0.5) * 0.5 + 0.98; // ~1 G (gravity)

  // Gyroscope data (degrees per second)
  const gyroX = (Math.random() - 0.5) * 10;
  const gyroY = (Math.random() - 0.5) * 10;
  const gyroZ = (Math.random() - 0.5) * 10;

  // Orientation (degrees)
  const roll = (Math.random() - 0.5) * 45;
  const pitch = (Math.random() - 0.5) * 45;
  const yaw = Math.random() * 360;

  return { accelX, accelY, accelZ, gyroX, gyroY, gyroZ, roll, pitch, yaw };
};

export const generateGraphData = (points = 30) => {
  const data = [];
  let speed = 30;

  for (let i = 0; i < points; i++) {
    speed = Math.max(0, Math.min(120, speed + (Math.random() - 0.5) * 10));
    data.push({
      timestamp: i,
      speed: Math.round(speed),
      motorTemp: 80 + Math.floor(Math.random() * 10),
      current: 50 + Math.floor(Math.random() * 20),
    });
  }

  return data;
};

export const generateAllTelemetry = () => {
  return {
    speed: generateSpeedData(),
    motorCommands: generateMotorCommands(),
    canValues: generateCanValues(),
    errors: generateErrors(),
    heartbeat: generateHeartbeat(),
    lteStatus: generateLteStatus(),
    wheelboard: generateWheelboard(),
    gps: generateGpsData(),
    imu: generateImuData(),
    graphData: generateGraphData(),
  };
};

export default generateAllTelemetry;