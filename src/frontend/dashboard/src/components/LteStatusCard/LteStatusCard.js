import React from "react";
import "./LteStatusCard.css";

export default function LteStatusCard({ lteStatus }) {
  return (
    <div className="card">
      <h3>Radio / LTE Status</h3>
      <p>Time since last message: {lteStatus.lastMessageSec}s</p>
      {/* TODO: Replace with real-time message data */}
    </div>
  );
}