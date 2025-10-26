import { useState, useEffect } from 'react';

function App() {
  const [data, setData] = useState({});

  useEffect(() => {
    const interval = setInterval(() => {
      fetch('http://localhost:5000/data')
        .then(res => res.json())
        .then(d => setData(d));
    }, 1000); // fetch every second
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Dashcam Data</h1>
      <p>Speed: {data.speed} km/h</p>
      <p>RPM: {data.rpm}</p>
      <p>Fuel: {data.fuel} %</p>
      <p>Temperature: {data.temperature} °C</p>
    </div>
  );
}

export default App;

