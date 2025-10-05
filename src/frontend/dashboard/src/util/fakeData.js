export const generateSpeedData = () => {
  const max = Math.floor(Math.random() * 50) + 30; // 30–80
  const min = Math.floor(Math.random() * 30);      // 0–30
  const average = Math.floor((max + min) / 2);                 // halfway between
  const current = average + Math.floor(Math.random() * 5); // small variation

  return { max, min, average, current };
};
