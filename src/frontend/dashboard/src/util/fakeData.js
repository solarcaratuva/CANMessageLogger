export const generateSpeedData = () => {
  const max = Math.floor(Math.random() * 50) + 30; // 30–80
  const min = Math.floor(Math.random() * 30);      // 0–30
  const average = Math.floor((max + min) / 2);                 // halfway between
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