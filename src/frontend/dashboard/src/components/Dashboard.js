import React, { useState, useEffect } from "react";
import SpeedComponent from "./SpeedComponent";
import MotorComponent from "./MotorComponent";
import { generateMotorCommands, generateSpeedData } from "../util/fakeData";

const Dashboard = () => {
  const [speeds, setSpeeds] = useState(generateSpeedData());
  const [motorCommands, setMotorCommands] = useState(generateMotorCommands());

  // Hook used to regenerate component values every second
  useEffect(() => {
    const interval = setInterval(() => {
      setSpeeds(generateSpeedData());
      setMotorCommands(generateMotorCommands());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  {/* Translate motorCommand values to data to be displayed */}
    {(motorCommands.cruise) ? motorCommands.cruise = "ON" : motorCommands.cruise = "OFF"};
    {(motorCommands.breaking) ? motorCommands.breaking = "ON" : motorCommands.breaking = "OFF"};
    {(motorCommands.manual) ? motorCommands.manual = "ON" : motorCommands.manual = "OFF"};

  return (
    <div className="dashboard-container">
      {/* Dashboard Header */}
      <header className="dashboard-header">
        <h1>RACE DASHBOARD</h1>
      </header>

      <main className="dashboard-content">
        {/* Speed Section */}
        <section className="dashboard-section">
          <h2 className="section-title">Speed</h2>
          <SpeedComponent current={speeds.current} showOnlyCurrent={true} />
        </section>

        {/* Motor Commands Section */}
        <section className="dashboard-section">
          <h2 className="section-title">Motor Commands</h2>

          <MotorComponent
            breaking={motorCommands.breaking}
            cruise={motorCommands.cruise}
            manual={motorCommands.manual}
            throttlePedal={motorCommands.throttlePedal}
            brakePedal={motorCommands.brakePedal}
            throttle={motorCommands.throttle}
            motorRPM={motorCommands.motorRPM}
          />
        </section>
      </main>
    </div>
  );
};

export default Dashboard;