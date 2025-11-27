import React from "react";
import "./SecondaryInfoCard.css";

export default function SecondaryInfoCard() {
  const bms = {
    packVoltage: 134.2,
    packCurrent: -12.3,
    soc: 56.5,
    dischargeRelayClosed: true,
    chargeRelayClosed: false,
    chargerSafety: true,
    chargePowerSignal: false,
    balancingActive: true,
  };

  const motor = {
    batteryVoltage: 133.8,
    batteryCurrent: -11.9,
    motorCurrent: 32.0,
    motorRpm: 1450,
    fetTemp: 42.3,
    pwmDuty: 47.5,
    acceleratorPosition: 23.0,
    regenPosition: 0.0,
    powerMode: "RUN",
    controlMode: "TORQUE",
    regenEnabled: false,
  };

  return (
    <section className="card card-secondary">
      <h3 className="secondary-title">BPS &amp; Motor Details</h3>

      <div className="secondary-grid">
        {/* BMS side */}
        <div className="secondary-block">
          <h4 className="block-label">BMS</h4>

          <div className="secondary-row">
            <span>Pack Voltage</span>
            <span className="secondary-value">
              {bms.packVoltage} V
            </span>
          </div>

          <div className="secondary-row">
            <span>Pack Current</span>
            <span className="secondary-value">
              {bms.packCurrent} A
            </span>
          </div>

          <div className="secondary-row">
            <span>Pack SoC</span>
            <span className="secondary-value">
              {bms.soc} %
            </span>
          </div>

          <div className="secondary-row">
            <span>Discharge Relay</span>
            <span className="secondary-value">
              {String(bms.dischargeRelayClosed)}
            </span>
          </div>

          <div className="secondary-row">
            <span>Charge Relay</span>
            <span className="secondary-value">
              {String(bms.chargeRelayClosed)}
            </span>
          </div>

          <div className="secondary-row">
            <span>Charger Safety</span>
            <span className="secondary-value">
              {String(bms.chargerSafety)}
            </span>
          </div>

          <div className="secondary-row">
            <span>Charge Power Signal</span>
            <span className="secondary-value">
              {String(bms.chargePowerSignal)}
            </span>
          </div>

          <div className="secondary-row">
            <span>Balancing</span>
            <span className="secondary-value">
              {String(bms.balancingActive)}
            </span>
          </div>
        </div>

        {/* Motor side */}
        <div className="secondary-block">
          <h4 className="block-label">Motor</h4>

          <div className="secondary-row">
            <span>Motor RPM</span>
            <span className="secondary-value">
              {motor.motorRpm} rpm
            </span>
          </div>

          <div className="secondary-row">
            <span>Motor Current</span>
            <span className="secondary-value">
              {motor.motorCurrent} A
            </span>
          </div>

          <div className="secondary-row">
            <span>Battery V (MC)</span>
            <span className="secondary-value">
              {motor.batteryVoltage} V
            </span>
          </div>

          <div className="secondary-row">
            <span>Battery I (MC)</span>
            <span className="secondary-value">
              {motor.batteryCurrent} A
            </span>
          </div>

          <div className="secondary-row">
            <span>FET Temp</span>
            <span className="secondary-value">
              {motor.fetTemp} °C
            </span>
          </div>

          <div className="secondary-row">
            <span>PWM Duty</span>
            <span className="secondary-value">
              {motor.pwmDuty} %
            </span>
          </div>

          <div className="secondary-row">
            <span>Accel Position</span>
            <span className="secondary-value">
              {motor.acceleratorPosition} %
            </span>
          </div>

          <div className="secondary-row">
            <span>Regen Position</span>
            <span className="secondary-value">
              {motor.regenPosition} %
            </span>
          </div>

          <div className="secondary-row">
            <span>Power Mode</span>
            <span className="secondary-value">
              {motor.powerMode}
            </span>
          </div>

          <div className="secondary-row">
            <span>Control Mode</span>
            <span className="secondary-value">
              {motor.controlMode}
            </span>
          </div>

          <div className="secondary-row">
            <span>Regen</span>
            <span className="secondary-value">
              {String(motor.regenEnabled)}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
