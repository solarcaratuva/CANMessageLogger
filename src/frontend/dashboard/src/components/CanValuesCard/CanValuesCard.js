import React from "react";
import "./CanValuesCard.css";
import MotorComponent from "./MotorComponent";

const CanValuesCard = ({ canValues, motorData }) => {
  return (
    <div className="card">
      <h3>CAN Bus Values</h3>
      <p>Motor Temp: {canValues.motorTemp} °C</p>
      <p>Current: {canValues.current} A</p>
      <MotorComponent {...motorData} />
    </div>
  );
};

export default CanValuesCard;