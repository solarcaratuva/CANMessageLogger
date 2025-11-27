import "./Dashboard.css";

import Header from "../Header/Header";
import PrimaryInfoCard from "../PrimaryInfoCard/PrimaryInfoCard";
import SecondaryInfoCard from "../SecondaryInfoCard/SecondaryInfoCard";
import ImuCard from "../ImuCard/ImuCard";
import LteStatusCard from "../LteStatusCard/LteStatusCard"
import BpsCard from "../BpsCard/BpsCard"
import MotorCard from "../MotorCard/MotorCard"

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
          
          <LteStatusCard />
        </div>

        {/* Right column */}
        <div className="dashboard-right">
          <SecondaryInfoCard />
          <ImuCard />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
