import React from "react";
import "./LteStatusCard.css";

export default function LteStatusCard({  }) {
  return (
    <div className="card">
      <h3>Radio / LTE Status</h3>
      <p>Time since last message: {2}s</p>
      {/* TODO: Replace with real-time message data */}
    </div>
  );
}