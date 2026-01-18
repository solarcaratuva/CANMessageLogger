import "./Dashboard.css";

import PrimaryInfoCard from "../PrimaryInfoCard/PrimaryInfoCard";
import BpsCard from "../BpsCard/BpsCard"
import MotorCard from "../MotorCard/MotorCard"
import DiagnosticsCard from "../DiagnosticsCard/DiagnosticsCard"
import BpsSocGraphCard from "../BpsSocGraphCard/BpsSocGraphCard";

const heartbeat = {
  wheel: true,
  power: false,
  telemetry: true,
};

const xbee = {
  name: "XBee",
  lastMs: 120,
  bytesPerSec: 45.3,
  isPrimary: true,
  isOnline: true,
};

const lte = {
  name: "LTE",
  lastMs: 840,
  bytesPerSec: 12.1,
  isPrimary: false,
  isOnline: false,
};

const faults = [
  {
    id: 1,
    source: "BPS",
    code: "Low_Cell_Voltage_Fault",
    label: "Low cell voltage",
    severity: "fault",
  },
  {
    id: 2,
    source: "Motor",
    code: "overheat_level",
    label: "Motor overheat",
    severity: "warning",
  },
];

const Dashboard = () => {
  return (
    <div className="app-container">
      <header className="header">
        <h1>UVA Solar Car Dashboard</h1>
      </header>

      <div className="dashboard-columns">
        {/* Left column */}
        <div className="dashboard-left">
          <PrimaryInfoCard primaryInfo={{
            speed: 34.2,
            soc: 56.53,
            power_in: 13.4,
            net_power: 13.1,
            batt_curr: 0.14,
            batt_volt: 14.4,
          }}/>
          <div className="secondary-info">
            <BpsCard bps={{
              packVoltage: 134.2,
              packCurrent: -12.3,
              soc: 56.5,
              dischargeRelayClosed: true,
              chargeRelayClosed: false,
              chargerSafety: true,
              chargePowerSignal: false,
              balancingActive: true,
            }}/>
            <MotorCard motor={{
              batteryVoltage: 133.8,
              batteryCurrent: -11.9,
              motorCurrent: 32.0,
              motorRpm: 1451,
              fetTemp: 42.3,
              pwmDuty: 47.5,
              acceleratorPosition: 23.0,
              regenPosition: 0.0,
              powerMode: "RUN",
              controlMode: "TORQUE",
              regenEnabled: false,
            }}/>
          </div>

          <div className="secondary-info">
            {/* <ImuCard />
            <GpsCard /> */}
          </div>
          
        </div>

        {/* Right column */}
        <div className="dashboard-right">
          <DiagnosticsCard
            heartbeat={heartbeat}
            xbee={xbee}
            lte={lte}
            faults={faults}
          />

          <BpsSocGraphCard />

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
