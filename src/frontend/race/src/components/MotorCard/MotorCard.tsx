import { useEffect, useState } from "react";
import "./MotorCard.css";
import { socket } from "../../util/socket"; // Import the actual socket instance

type Motor = {
    batteryVoltage: number;
    batteryCurrent: number;
    motorCurrent: number;
    motorRpm: number;
    fetTemp: number;
    pwmDuty: number;
    acceleratorPosition: number;
    regenPosition: number;
    powerMode: string;
    controlMode: string;
    regenEnabled: boolean;
}

export default function MotorCard() {
  // 1. Initialize local state to hold the live data
  const [motorData, setMotorData] = useState<Motor | null>(null);

  useEffect(() => {
    // 2. Listen for the update
    socket.on('motor_update', (motorJSON: { payload: { M: any; }; }) => {
      const raw = motorJSON.payload.M;
      
      const formattedMotor: Motor = {
        batteryVoltage: parseFloat(raw.batteryVoltage.N),
        batteryCurrent: parseFloat(raw.batteryCurrent.N),
        motorCurrent: parseFloat(raw.motorCurrent.N),
        motorRpm: parseInt(raw.motorRpm.N),
        fetTemp: parseInt(raw.fetTemp.N),
        pwmDuty: parseInt(raw.pwmDuty.N),
        acceleratorPosition: parseInt(raw.acceleratorPosition.N),
        regenPosition: parseInt(raw.regenPosition.N),
        powerMode: raw.powerMode.S,
        controlMode: raw.controlMode.S,
        regenEnabled: raw.regenEnabled.BOOL
      };

      setMotorData(formattedMotor);
    });

    // 3. Cleanup on unmount
    return () => {
      socket.off('motor_update');
    };
  }, []);

  return (
    <div className="secondary-block">
        <h4 className="block-label">Motor</h4>

        <div className="secondary-row">
          <span>Motor RPM</span>
          <span className="secondary-value">
              {motorData?.motorRpm ?? 0} rpm
          </span>
        </div>

        <div className="secondary-row">
          <span>Motor Current</span>
          <span className="secondary-value">
              {motorData?.motorCurrent ?? 0} A
          </span>
        </div>

        <div className="secondary-row">
          <span>Battery V (MC)</span>
          <span className="secondary-value">
              {motorData?.batteryVoltage ?? 0} V
          </span>
        </div>

        <div className="secondary-row">
          <span>Battery I (MC)</span>
          <span className="secondary-value">
              {motorData?.batteryCurrent ?? 0} A
          </span>
        </div>

        <div className="secondary-row">
          <span>FET Temp</span>
          <span className="secondary-value">
              {motorData?.fetTemp ?? 0} °C
          </span>
        </div>

        <div className="secondary-row">
          <span>PWM Duty</span>
          <span className="secondary-value">
              {motorData?.pwmDuty ?? 0} %
          </span>
        </div>

        <div className="secondary-row">
          <span>Accel Position</span>
          <span className="secondary-value">
              {motorData?.acceleratorPosition ?? 0} %
          </span>
        </div>

        <div className="secondary-row">
          <span>Regen Position</span>
          <span className="secondary-value">
              {motorData?.regenPosition ?? 0} %
          </span>
        </div>

        <div className="secondary-row">
          <span>Power Mode</span>
          <span className="secondary-value">
              {motorData?.powerMode ?? 'STANDBY'}
          </span>
        </div>

        <div className="secondary-row">
          <span>Control Mode</span>
          <span className="secondary-value">
              {motorData?.controlMode ?? 'TORQUE'}
          </span>
        </div>

        <div className="secondary-row">
          <span>Regen</span>
          <span className="secondary-value">
              {String(motorData?.regenEnabled ?? false)}
          </span>
        </div>
    </div>
  );
}