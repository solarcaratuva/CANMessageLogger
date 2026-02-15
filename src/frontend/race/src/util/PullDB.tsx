import { socket } from "./socket"
import { useState, useEffect } from 'react';
import Dashboard from '../components/DashboardCard/Dashboard';
import type { PrimaryInfo, BPS, Motor, Heartbeat, ConnectionInfo, Fault } from '../components/DashboardCard/Dashboard';

const PullDB = () => {
  // Initialize state with some defaults
  const [primaryInfo, setPrimaryInfo] = useState<PrimaryInfo>({
    speed: 0,
    soc: 0,
    power_in: 0,
    net_power: 0,
    batt_curr: 0,
    batt_volt: 0,
  });

  const [bps, setBps] = useState<BPS>({
    packVoltage: 0,
    packCurrent: 0,
    soc: 0,
    dischargeRelayClosed: false,
    chargeRelayClosed: false,
    chargerSafety: false,
    chargePowerSignal: false,
    balancingActive: false,
  });

  const [motor, setMotor] = useState<Motor>({
    batteryVoltage: 0,
    batteryCurrent: 0,
    motorCurrent: 0,
    motorRpm: 0,
    fetTemp: 0,
    pwmDuty: 0,
    acceleratorPosition: 0,
    regenPosition: 0,
    powerMode: 'STANDBY',
    controlMode: 'TORQUE',
    regenEnabled: false,
  });

  const [heartbeat, setHeartbeat] = useState<Heartbeat>({
    wheel: false,
    power: false,
    telemetry: false,
  });

  const [xbee, setXbee] = useState<ConnectionInfo>({
    name: 'XBee',
    lastMs: 0,
    bytesPerSec: 0,
    isPrimary: true,
    isOnline: false,
  });

  const [lte, setLte] = useState<ConnectionInfo>({
    name: 'LTE',
    lastMs: 0,
    bytesPerSec: 0,
    isPrimary: false,
    isOnline: false,
  });

  const [faults, setFaults] = useState<Fault[]>([]);


// Update all state every 0.1 second (set in socketIO pull_db event emission frequency in backend)
useEffect(() => { 
  socket.on('pull_db', (data: { payload: { M: any } }) => {
    const raw = data.payload.M;
    const structName = raw.struct_name?.S;

    if (structName === 'motor') {
      const parsedMotor: Motor = {
        batteryVoltage: parseFloat(raw.battery_voltage_mc?.N || '0'),
        batteryCurrent: parseFloat(raw.battery_current_mc?.N || '0'),
        motorCurrent: parseFloat(raw.motor_current?.N || '0'),
        motorRpm: parseFloat(raw.motor_rpm?.N || '0'),
        fetTemp: parseFloat(raw.fet_temp?.N || '0'),
        pwmDuty: parseFloat(raw.pwm_duty?.N || '0'),
        acceleratorPosition: parseFloat(raw.accel_position?.N || '0'),
        regenPosition: parseFloat(raw.regen_position?.N || '0'),
        powerMode: raw.power_mode?.S || 'STANDBY',
        controlMode: raw.control_mode?.S || 'TORQUE',
        regenEnabled: raw.regen?.BOOL || false,
      };
      setMotor(parsedMotor);
    }

    if (structName === 'battery') {
      const parsedBps: BPS = {
        packVoltage: parseFloat(raw.pack_voltage?.N || '0'),
        packCurrent: parseFloat(raw.pack_current?.N || '0'),
        soc: parseFloat(raw.pack_soc?.N || '0'),
        dischargeRelayClosed: raw.discharge_relay?.BOOL || false,
        chargeRelayClosed: raw.charge_relay?.BOOL || false,
        chargerSafety: raw.charger_safety?.BOOL || false,
        chargePowerSignal: raw.charge_power_signal?.BOOL || false,
        balancingActive: raw.balancing?.BOOL || false,
      };
      setBps(parsedBps);

      const parsedPrimaryInfo: PrimaryInfo = {
        speed: parseFloat(raw.speed?.N || '0'),
        soc: parseFloat(raw.pack_soc?.N || '0'),
        power_in: parseFloat(raw.solar_power_in?.N || '0'),
        net_power: parseFloat(raw.net_pack_power?.N || '0'),
        batt_curr: parseFloat(raw.batt_current?.N || '0'),
        batt_volt: parseFloat(raw.batt_voltage?.N || '0'),
      };
      setPrimaryInfo(parsedPrimaryInfo);
    }
  });

  return () => {
    socket.off('pull_db');
  };
}, []);

  return (
    <Dashboard
      primaryInfo={primaryInfo}
      bps={bps}
      motor={motor}
      heartbeat={heartbeat}
      xbee={xbee}
      lte={lte}
      faults={faults}
    />
  );
};

export default PullDB;
