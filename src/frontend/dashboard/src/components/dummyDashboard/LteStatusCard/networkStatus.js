import React from "react";
import "./LteStatusCard.css";

export function LteStatusCard({ lteStatus }) {
  return (
    <div className="card">
      <h3>LTE Status</h3>
      <p>Time since last message: {lteStatus.lastMessageSec}s</p>
      {/* TODO: Replace with real-time message data */}
    </div>
  );
}

export function xbeeRadioStatus({ xbeeStatus }){
  return(
    <div>
      <h3>
        <p>Time since last message: {xbeeStatus.lastMessageSec}</p>
        {/* TODO: Replace with actual message data */}
      </h3>
    </div>
  );
}