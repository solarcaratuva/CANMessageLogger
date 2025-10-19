import React, { useState, useEffect } from "react";

export default function App() {
  // ----------------------------
  // State: telemetry data
  // ----------------------------
  const [speed, setSpeed] = useState(0); // km/h
  const [canValues, setCanValues] = useState({ motorTemp: 80, current: 50 }); // example CAN values
  const [errors, setErrors] = useState([]);
  const [heartbeat, setHeartbeat] = useState({ board1: true, board2: true });
  const [lteStatus, setLteStatus] = useState({ lastMessageSec: 5 });
  const [wheelboard, setWheelboard] = useState({ hazards: false, turnSignal: "Off" });

  // ----------------------------
  // Simulate telemetry updates
  // ----------------------------
  useEffect(() => {
    const interval = setInterval(() => {
      // Replace the following simulated data with your real telemetry
      setSpeed((s) => Math.min(s + Math.random() * 5, 120)); // smooth speed, max 120
      setCanValues({
        motorTemp: 80 + Math.floor(Math.random() * 10),
        current: 50 + Math.floor(Math.random() * 20),
      });
      setErrors(Math.random() > 0.9 ? ["Motor Overheat"] : []);
      setHeartbeat({ board1: Math.random() > 0.1, board2: Math.random() > 0.1 });
      setLteStatus({ lastMessageSec: Math.floor(Math.random() * 10) });
      setWheelboard({
        hazards: Math.random() > 0.8,
        turnSignal: Math.random() > 0.5 ? "Left" : "Off",
      });
    }, 1000);

    return () => clearInterval(interval); // cleanup
  }, []);

  // ----------------------------
  // Styles (reusable for cards and bars)
  // ----------------------------
  const cardStyle = {
    background: "#222",
    padding: "1rem",
    borderRadius: "8px",
    marginBottom: "1rem",
  };

  const barContainer = {
    background: "#333",
    borderRadius: "8px",
    height: "20px",
    overflow: "hidden",
    marginTop: "5px",
  };

  const barStyle = (percent, color) => ({
    width: `${percent}%`,
    height: "100%",
    background: color,
    transition: "width 0.5s ease",
  });

  return (
    <div style={{ fontFamily: "Arial, sans-serif", background: "#111", color: "#eee", minHeight: "100vh", padding: "1rem" }}>
      <h1 style={{ textAlign: "center" }}>UVA Solar Car Dashcam</h1>

      {/* ------------------ Row 1: Speed & CAN ------------------ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem" }}>
        <div style={cardStyle}>
          <h3>Speed</h3>
          <p style={{ fontSize: "2rem", fontWeight: "bold" }}>{speed.toFixed(1)} km/h</p>
          <div style={barContainer}>
            <div style={barStyle((speed / 120) * 100, "#4caf50")}></div>
          </div>
        </div>

        <div style={cardStyle}>
          <h3>Important CAN Values</h3>
          <p>Motor Temp: {canValues.motorTemp} °C</p>
          <p>Current: {canValues.current} A</p>
          {/* TODO: Insert more CAN values here */}
        </div>
      </div>

      {/* ------------------ Row 2: Errors & Heartbeat ------------------ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div style={cardStyle}>
          <h3>Errors</h3>
          {errors.length === 0 ? <p>No errors</p> : <ul>{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>}
        </div>

        <div style={cardStyle}>
          <h3>Heartbeat System</h3>
          <p>Board 1: {heartbeat.board1 ? "Alive" : "Dead"}</p>
          <p>Board 2: {heartbeat.board2 ? "Alive" : "Dead"}</p>
        </div>
      </div>

      {/* ------------------ Row 3: LTE & Wheelboard ------------------ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div style={cardStyle}>
          <h3>Radio / LTE Status</h3>
          <p>Time since last message: {lteStatus.lastMessageSec}s</p>
          {/* TODO: Replace with real-time message data */}
        </div>

        <div style={cardStyle}>
          <h3>Wheelboard Status</h3>
          <p>Hazards: {wheelboard.hazards ? "On" : "Off"}</p>
          <p>Turn Signal: {wheelboard.turnSignal}</p>
        </div>
      </div>

      {/* ------------------ Row 4: GPS & IMU Placeholders ------------------ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem" }}>
        <div style={cardStyle}>
          <h3>GPS Map (Placeholder)</h3>
          <p>Coming soon...</p>
          {/* TODO: Integrate GPS map here */}
        </div>

        <div style={cardStyle}>
          <h3>IMU Data (Placeholder)</h3>
          <p>Coming soon...</p>
          {/* TODO: Add IMU readings: acceleration, orientation, etc. */}
        </div>
      </div>

      {/* ------------------ Row 5: Graph Placeholder ------------------ */}
      <div style={cardStyle}>
        <h3>Interactive Graphs</h3>
        <p>Coming soon...</p>
        {/* TODO: Add charts for telemetry data */}
      </div>
    </div>
  );
}
