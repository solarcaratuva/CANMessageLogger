import "./Dashboard.css";

import Header from "../Header/Header";
import PrimaryInfoCard from "../PrimaryInfoCard/PrimaryInfoCard";
import ImuCard from "../ImuCard/ImuCard";
import BpsCard from "../BpsCard/BpsCard"
import MotorCard from "../MotorCard/MotorCard"
import TransmissionStatusCard from "../TransmissionStatusCard/TransmissionStatusCard";
import DiagnosticsCard from "../DiagnosticsCard/DiagnosticsCard"

const Dashboard = () => {
  return (
    <div className="app-container">
      <Header />

      <div className="dashboard-columns">
        {/* Left column */}
        <div className="dashboard-left">
          <PrimaryInfoCard />
          <div className="secondary-info">
            <BpsCard />
            <MotorCard />
          </div>
          
        </div>

        {/* Right column */}
        <div className="dashboard-right">
          <DiagnosticsCard />

          <ImuCard />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
