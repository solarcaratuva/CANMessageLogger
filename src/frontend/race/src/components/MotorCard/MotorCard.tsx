import "./MotorCard.css";

type motor = {
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

type motorProps = {
    motor: motor;
}

export default function MotorCard({motor}: motorProps) {
  return (
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
  );
}
