import React from "react";
import "./HeartbeatCard.css";

export default function HeartbeatCard({ heartbeat }) {
  return (
    <div className="card">
      <h3>Heartbeat System</h3>
      <p>Board 1: <span className={heartbeat.board1 ? "alive" : "dead"}>{heartbeat.board1 ? "Alive" : "Dead"}</span></p>
      <p>Board 2: <span className={heartbeat.board2 ? "alive" : "dead"}>{heartbeat.board2 ? "Alive" : "Dead"}</span></p>
    </div>
  );
}