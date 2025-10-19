import React from "react";
import "./MotorComponent.css";

const MotorComponent = ({breaking, cruise, manual, throttlePedal, brakePedal, throttle, motorRPM}) => {
  const breakingStatus = breaking ? "ON" : "OFF";
  const cruiseStatus = cruise ? "ON" : "OFF";
  const manualStatus = manual ? "ON" : "OFF";

  return (
    <div className="motor-component">
      <div className="motor-card braking">
        <h2>Breaking: {breakingStatus}</h2>
      </div>
      <div className="motor-card manual-versus-cruise">
        <h2>Manual: {manualStatus} <br /> Cruise: {cruiseStatus}</h2>
      </div>
      <div className="motor-card peddals">
        <h2>Throttle Pedal: {throttlePedal} <br /> Brake Pedal: {brakePedal}</h2>
      </div>
      <div className="motor-card rpm_throttle">
        <h2>Motor RPM: {motorRPM} <br /> Throttle: {throttle}</h2>
      </div>
    </div>
  );
};

export default MotorComponent;