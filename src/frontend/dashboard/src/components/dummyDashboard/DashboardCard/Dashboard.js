import React, { useState, useEffect } from "react";
import {generateAllTelemetry} from "../../util/fakeData"
import "./Dashboard.css";
import Header from "../Header/Header"
import SpeedCard from "../SpeedCard/SpeedCard";
import CanValuesCard from "../CanValuesCard/CanValuesCard";
import HeartbeatCard from "../HeartbeatCard/HeartbeatCard";
import { LteStatusCard } from "../LteStatusCard/networkStatus";
import { xbeeRadioSatus } from "../LteStatusCard/networkStatus";
import GpsCard from "../GpsCard/GpsCard";
import ImuCard from "../ImuCard/ImuCard";
import GraphsCard from "../GraphsCard/GraphsCard";
import ErrorsCard from "../ErrorsCard/ErrorsCard";
import WheelboardCard from "../WheelboardCard/WheelboardCard";
import { BACKEND_URL } from "../../../services/flask";

import {io} from "socket.io-client";

//socket io connection handler
const socket = io(BACKEND_URL);

const onDisconnect = () => {
  if (socket && socket.connected) socket.disconnect();
};


// DEBUG: Log what each component is
console.log("Header:", Header);
console.log("SpeedCard:", SpeedCard);
console.log("CanValuesCard:", CanValuesCard);
console.log("HeartbeatCard:", HeartbeatCard);
console.log("LteStatusCard:", LteStatusCard);
console.log("GpsCard:", GpsCard);
console.log("ImuCard:", ImuCard);
console.log("GraphsCard:", GraphsCard);
console.log("ErrorsCard:", ErrorsCard);
console.log("WheelboardCard:", WheelboardCard); 

const Dashboard = () => {
  const [telemetry, setTelemetry] = useState(generateAllTelemetry());

  //state manager for socketIO connection
  const [isConnected, setIsConnected] = useState(socket.connected);
  //state manager based on CAN file uploads
  const [canFileData, setCanFileData] = useState(null);

  //managing react's connection states with SocketIO
  useEffect(() => {
    //auto connect on mount
    socket.connect();

    function onConnect(){
      setIsConnected(true);
    }

    function onDisconnet(){
      setIsConnected(false);
    }

    //event state listeners and associated function calls
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    //cleanup function (disconnet from socketIO server)
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.disconnect();
    };
  }, []);

  // Update telemetry every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetry(generateAllTelemetry());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app-container">
      <Header />

      {/* Row 1: Speed & CAN */}
      <div className="grid-row">
        <SpeedCard
          current={telemetry.speed.current}
          max={telemetry.speed.max}
          min={telemetry.speed.min}
          average={telemetry.speed.average}
          showOnlyCurrent={true}
        />
        <CanValuesCard
          canValues={telemetry.canValues}
          motorData={telemetry.motorCommands}
        />
      </div>

      {/* Row 2: Errors & Heartbeat */}
      <div className="grid-row">
        <ErrorsCard errors={telemetry.errors} />
        <HeartbeatCard heartbeat={telemetry.heartbeat} />
      </div>


      {/* Row 3: LTE, XBEE, & Wheelboard */}
      <div className="grid-row">
        <LteStatusCard lteStatus={telemetry.lteStatus} />
        <xbeeRadioSatus xbeeStatus={telemetry.xbeeRadioSatus}/>
        <WheelboardCard wheelboard={telemetry.wheelboard} />
      </div>

      {/* Row 4: GPS & IMU */}
      <div className="grid-row">
        <GpsCard gpsData={telemetry.gps} />
        <ImuCard imuData={telemetry.imu} />
      </div>

      {/* Row 5: Graphs */}
      <div className="grid-full">
        <GraphsCard graphData={telemetry.graphData} />
      </div>

    </div>
  );
};

export default Dashboard;