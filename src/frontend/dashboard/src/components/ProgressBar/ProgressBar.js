import React from "react";
import "./ProgressBar.css";

export default function ProgressBar({ percent, color = "#4caf50" }) {
  return (
    <div className="progress-container">
      <div className="progress-bar" style={{ width: `${percent}%`, backgroundColor: color }}></div>
    </div>
  );
}