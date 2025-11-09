import React from 'react';
import "./SpeedCard.css";

/**
 * SpeedCard Component
 * Displays vehicle speed data in two modes:
 * - Compact mode (showOnlyCurrent=true): Shows only current speed
 * - Full mode (showOnlyCurrent=false): Shows current, min, avg, and max speeds
 * 
 * @param {number} current - Current speed in mph
 * @param {number} max - Maximum speed recorded in mph
 * @param {number} min - Minimum speed recorded in mph
 * @param {number} average - Average speed in mph
 * @param {boolean} showOnlyCurrent - If true, displays only current speed (compact mode)
 */
const SpeedCard = ({ current, max, min, average, showOnlyCurrent }) => {
  // Compact view for landing page
  if (showOnlyCurrent) {
    return (
      <div className="speed-component">
        <div className="speed-card">
          <h2>Speed</h2>
          <div className="speed-card speed-current">
            <p>Current</p>
            <h3>{current} mph</h3>
          </div>
        </div>
      </div>
    );
  }

  // Full view with all metrics
  return (
    <div className="speed-component">
      <div className="speed-card">
        <h2>Speed</h2>
        <div className="speed-card speed-current">
          <p>Current</p>
          <h3>{current} mph</h3>
        </div>

        <div className="speedDisplay">
          <div className="speed-card speed-min">
            <p>Min Speed</p>
            <h3>{min} mph</h3>
          </div>

          <div className="speed-card speed-avg">
            <p>Average Speed</p>
            <h3>{average} mph</h3>
          </div>

          <div className="speed-card speed-max">
            <p>Max Speed</p>
            <h3>{max} mph</h3>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpeedCard;