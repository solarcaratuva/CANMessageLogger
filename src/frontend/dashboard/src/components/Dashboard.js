import React from "react";
import SpeedComponent from "./SpeedComponent";
import {useState, useEffect} from "react";
import { generateSpeedData } from "../util/fakeData";

const Dashboard = () =>{
    const[speeds, setSpeeds] = useState(generateSpeedData())

    useEffect(() => {
        const interval = setInterval(() => {
                setSpeeds(generateSpeedData());
            }, 1000);
    
    return () => clearInterval(interval);

    },[]);
    
    return(    
    <div className='dashboard-container'>
        <header className='dasboard-header'>
            <h1>Speed Dashboard</h1>
        </header>

        <main className='dashboard-content'>
            <SpeedComponent current={speeds.current} max={speeds.max} min={speeds.min} average={speeds.average}/>
        </main>
    </div>)
}

export default Dashboard;