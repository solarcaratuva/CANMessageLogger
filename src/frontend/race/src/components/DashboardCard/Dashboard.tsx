import "./Dashboard.css";

import PrimaryInfoCard from "../PrimaryInfoCard/PrimaryInfoCard";
import ImuCard from "../ImuCard/ImuCard";
import BpsCard from "../BpsCard/BpsCard"
import MotorCard from "../MotorCard/MotorCard"
import DiagnosticsCard from "../DiagnosticsCard/DiagnosticsCard"
import GpsCard from "../GpsCard/GpsCard";
import BpsSocGraphCard from "../BpsSocGraphCard/BpsSocGraphCard";

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
            <BpsCard />
            <MotorCard />
          </div>

          <div className="secondary-info">
            {/* <ImuCard />
            <GpsCard /> */}
          </div>
          
        </div>

        {/* Right column */}
        <div className="dashboard-right">
          <DiagnosticsCard />

          <BpsSocGraphCard />

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
