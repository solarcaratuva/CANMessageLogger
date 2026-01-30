import { useState, useEffect, useCallback } from 'react';
import Dashboard from '../DashboardCard/Dashboard';
import type { PrimaryInfo, BPS, Motor, Heartbeat, ConnectionInfo, Fault } from '../DashboardCard/Dashboard';
import './DataProvider.css';

type SimulationMode = 'stopped' | 'cruising' | 'accelerating' | 'charging';

const DataGenerator = () => {
  // Primary info state
  const [primaryInfo, setPrimaryInfo] = useState<PrimaryInfo>({
    speed: 0,
    soc: 100,
    power_in: 0,
    net_power: 0,
    batt_curr: 0,
    batt_volt: 140,
  });

  // BPS state
  const [bps, setBps] = useState<BPS>({
    packVoltage: 140,
    packCurrent: 0,
    soc: 100,
    dischargeRelayClosed: false,
    chargeRelayClosed: false,
    chargerSafety: true,
    chargePowerSignal: false,
    balancingActive: false,
  });

  // Motor state
  const [motor, setMotor] = useState<Motor>({
    batteryVoltage: 140,
    batteryCurrent: 0,
    motorCurrent: 0,
    motorRpm: 0,
    fetTemp: 25,
    pwmDuty: 0,
    acceleratorPosition: 0,
    regenPosition: 0,
    powerMode: 'STANDBY',
    controlMode: 'TORQUE',
    regenEnabled: true,
  });

  // Diagnostics state
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

  // Simulation mode state
  const [simulationMode, setSimulationMode] = useState<SimulationMode>('stopped');

  // Generate random value within range
  const randomInRange = (min: number, max: number): number => {
    return min + Math.random() * (max - min);
  };

  // Add variance to a value
  const addVariance = (value: number, variance: number): number => {
    return value + randomInRange(-variance, variance);
  };

  // Check for fault conditions
  const checkFaults = useCallback(() => {
    const newFaults: Fault[] = [];
    let faultId = 1;

    // Check battery voltage
    if (bps.packVoltage < 110) {
      newFaults.push({
        id: faultId++,
        source: 'BPS',
        code: 'Low_Pack_Voltage_Fault',
        label: 'Low pack voltage',
        severity: 'fault',
      });
    }

    // Check cell voltage (simulated based on SOC)
    if (bps.soc < 20) {
      newFaults.push({
        id: faultId++,
        source: 'BPS',
        code: 'Low_Cell_Voltage_Fault',
        label: 'Low cell voltage',
        severity: 'warning',
      });
    }

    // Check motor temperature
    if (motor.fetTemp > 70) {
      newFaults.push({
        id: faultId++,
        source: 'Motor',
        code: 'overheat_level',
        label: 'Motor overheat',
        severity: motor.fetTemp > 80 ? 'fault' : 'warning',
      });
    }

    // Check high current
    if (Math.abs(bps.packCurrent) > 50) {
      newFaults.push({
        id: faultId++,
        source: 'BPS',
        code: 'High_Current_Warning',
        label: 'High current detected',
        severity: 'warning',
      });
    }

    setFaults(newFaults);
  }, [bps.packVoltage, bps.soc, motor.fetTemp, bps.packCurrent]);

  // Update simulation based on mode
  useEffect(() => {
    const interval = setInterval(() => {
      if (simulationMode === 'stopped') {
        // Vehicle stopped
        setPrimaryInfo(prev => ({
          ...prev,
          speed: 0,
          power_in: addVariance(0, 0.5),
          net_power: addVariance(0, 0.2),
          batt_curr: 0,
        }));

        setMotor(prev => ({
          ...prev,
          motorRpm: 0,
          motorCurrent: 0,
          batteryCurrent: 0,
          acceleratorPosition: 0,
          pwmDuty: 0,
          powerMode: 'STANDBY',
          fetTemp: Math.max(25, prev.fetTemp - 0.5),
        }));

        setBps(prev => ({
          ...prev,
          packCurrent: 0,
          dischargeRelayClosed: false,
        }));

      } else if (simulationMode === 'cruising') {
        // Steady cruising at ~35 mph
        const targetSpeed = 35;
        const targetPower = 800; // watts
        const targetCurrent = targetPower / 140; // ~5.7A

        setPrimaryInfo(prev => ({
          ...prev,
          speed: addVariance(targetSpeed, 2),
          power_in: addVariance(50, 10), // solar input
          net_power: addVariance(targetPower / 1000, 0.5),
          batt_curr: addVariance(targetCurrent, 0.3),
          batt_volt: addVariance(140 - (prev.soc / 100) * 10, 0.5),
          soc: Math.max(0, prev.soc - 0.001), // slowly draining
        }));

        setMotor(prev => ({
          ...prev,
          batteryVoltage: addVariance(140 - (primaryInfo.soc / 100) * 10, 0.5),
          batteryCurrent: addVariance(-targetCurrent, 0.3),
          motorCurrent: addVariance(targetCurrent * 2, 1),
          motorRpm: addVariance(1400, 50),
          fetTemp: Math.min(65, prev.fetTemp + 0.1),
          pwmDuty: addVariance(45, 3),
          acceleratorPosition: addVariance(20, 2),
          regenPosition: 0,
          powerMode: 'RUN',
        }));

        setBps(prev => ({
          ...prev,
          packVoltage: addVariance(140 - (primaryInfo.soc / 100) * 10, 0.5),
          packCurrent: addVariance(-targetCurrent, 0.3),
          soc: Math.max(0, prev.soc - 0.001),
          dischargeRelayClosed: true,
          balancingActive: Math.random() > 0.7,
        }));

      } else if (simulationMode === 'accelerating') {
        // Accelerating - higher power draw
        const targetSpeed = 45;
        const targetPower = 2000; // watts
        const targetCurrent = targetPower / 140; // ~14A

        setPrimaryInfo(prev => ({
          ...prev,
          speed: Math.min(55, prev.speed + 0.5),
          power_in: addVariance(50, 10),
          net_power: addVariance(targetPower / 1000, 1),
          batt_curr: addVariance(targetCurrent, 0.5),
          batt_volt: addVariance(140 - (prev.soc / 100) * 10, 0.5),
          soc: Math.max(0, prev.soc - 0.005), // faster drain
        }));

        setMotor(prev => ({
          ...prev,
          batteryVoltage: addVariance(140 - (primaryInfo.soc / 100) * 10, 0.5),
          batteryCurrent: addVariance(-targetCurrent, 0.5),
          motorCurrent: addVariance(targetCurrent * 2.5, 2),
          motorRpm: Math.min(2500, prev.motorRpm + 30),
          fetTemp: Math.min(85, prev.fetTemp + 0.3),
          pwmDuty: addVariance(70, 5),
          acceleratorPosition: addVariance(60, 5),
          regenPosition: 0,
          powerMode: 'RUN',
        }));

        setBps(prev => ({
          ...prev,
          packVoltage: addVariance(140 - (primaryInfo.soc / 100) * 10, 0.5),
          packCurrent: addVariance(-targetCurrent, 0.5),
          soc: Math.max(0, prev.soc - 0.005),
          dischargeRelayClosed: true,
        }));

      } else if (simulationMode === 'charging') {
        // Charging from solar/grid
        const chargeCurrent = 8; // 8A charge

        setPrimaryInfo(prev => ({
          ...prev,
          speed: 0,
          power_in: addVariance(1200, 100),
          net_power: addVariance(1.2, 0.1),
          batt_curr: addVariance(-chargeCurrent, 0.3),
          batt_volt: addVariance(140 + (100 - prev.soc) / 100 * 5, 0.3),
          soc: Math.min(100, prev.soc + 0.01),
        }));

        setMotor(prev => ({
          ...prev,
          batteryVoltage: addVariance(140 + (100 - primaryInfo.soc) / 100 * 5, 0.3),
          batteryCurrent: addVariance(chargeCurrent, 0.3),
          motorCurrent: 0,
          motorRpm: 0,
          fetTemp: Math.max(25, prev.fetTemp - 0.3),
          pwmDuty: 0,
          acceleratorPosition: 0,
          powerMode: 'STANDBY',
        }));

        setBps(prev => ({
          ...prev,
          packVoltage: addVariance(140 + (100 - primaryInfo.soc) / 100 * 5, 0.3),
          packCurrent: addVariance(chargeCurrent, 0.3),
          soc: Math.min(100, prev.soc + 0.01),
          dischargeRelayClosed: false,
          chargeRelayClosed: true,
          chargerSafety: true,
          chargePowerSignal: true,
          balancingActive: prev.soc > 90,
        }));
      }

      // Update diagnostics
      setHeartbeat({
        wheel: true,
        power: simulationMode !== 'stopped',
        telemetry: true,
      });

      setXbee(prev => ({
        ...prev,
        lastMs: randomInRange(50, 200),
        bytesPerSec: addVariance(45, 10),
        isOnline: true,
      }));

      setLte(prev => ({
        ...prev,
        lastMs: randomInRange(500, 1500),
        bytesPerSec: addVariance(12, 3),
        isOnline: Math.random() > 0.3, // occasionally drops
      }));

    }, 200); // Update every 200ms

    return () => clearInterval(interval);
  }, [simulationMode, primaryInfo.soc]);

  // Check for faults periodically
  useEffect(() => {
    checkFaults();
    const faultInterval = setInterval(checkFaults, 1000);
    return () => clearInterval(faultInterval);
  }, [checkFaults]);

  // Initialize with a default mode
  useEffect(() => {
    setSimulationMode('cruising');
  }, []);

  const buttonClassName = (mode: SimulationMode): string => {
    return `simulation-button ${simulationMode === mode ? 'active' : ''}`;
  };

  return (
    <div>
      {/* Control Panel */}
      <div className="simulation-control-panel">
        <h3>Simulation Control</h3>
        <div className="simulation-buttons">
          <button
            onClick={() => setSimulationMode('stopped')}
            className={buttonClassName('stopped')}
            data-mode="stopped"
          >
            Stopped
          </button>
          <button
            onClick={() => setSimulationMode('cruising')}
            className={buttonClassName('cruising')}
            data-mode="cruising"
          >
            Cruising
          </button>
          <button
            onClick={() => setSimulationMode('accelerating')}
            className={buttonClassName('accelerating')}
            data-mode="accelerating"
          >
            Accelerating
          </button>
          <button
            onClick={() => setSimulationMode('charging')}
            className={buttonClassName('charging')}
            data-mode="charging"
          >
            Charging
          </button>
        </div>
      </div>

      {/* Dashboard with generated data */}
      <Dashboard
        primaryInfo={primaryInfo}
        bps={bps}
        motor={motor}
        heartbeat={heartbeat}
        xbee={xbee}
        lte={lte}
        faults={faults}
      />
    </div>
  );
};

export default DataGenerator;