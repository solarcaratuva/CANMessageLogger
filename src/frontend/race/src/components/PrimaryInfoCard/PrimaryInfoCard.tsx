import React from "react";
import "./PrimaryInfoCard.css";

export default function PrimaryInfoCard({  }) {
  return (
    <section className="card card-primary">
          <div className="primary-grid">
            <div className="stat">Speed
                <h1 className="value">34.4 mph</h1>
            </div>
            <div className="stat">Pack SoC
                <h1 className="value">56.53%</h1>
            </div>
            <div className="stat">Solar Power In
                <h1 className="value">13.4 W</h1>
            </div>
            <div className="stat">Net Pack Power
                <h1 className="value">13.1 W</h1>
            </div>
            <div className="stat">Batt Curr
                <h1 className="value">0.14 A</h1>
            </div>
            <div className="stat">Batt Volt
                <h1 className="value">14.4 V</h1>
            </div>
          </div>
        </section>
  );
}