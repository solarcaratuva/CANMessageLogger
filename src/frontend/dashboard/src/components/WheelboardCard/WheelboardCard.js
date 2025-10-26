import React from "react";
import "./WheelboardCard.css";

export default function WheelboardCard({ wheelboard = []}) {
  return (
    <div className="card">
      <h3>Wheelboard Status</h3>
      <p>Hazards: <span className={wheelboard.hazards ? "on" : "off"}>{wheelboard.hazards ? "On" : "Off"}</span></p>
      <p>Turn Signal: {wheelboard.turnSignal}</p>
    </div>
  );
}