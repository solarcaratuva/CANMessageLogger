import "./PrimaryInfoCard.css";

type PrimaryInfo = {
    speed: number;
    soc: number;
    power_in: number;
    net_power: number;
    batt_curr: number;
    batt_volt: number;
}


type PrimaryInfoCardProps = {
  primaryInfo: PrimaryInfo;
}; 

export default function PrimaryInfoCard({ primaryInfo }: PrimaryInfoCardProps) {
  return (
    <section className="card card-primary">
          <div className="primary-grid">
            <div className="stat">Speed
                <h1 className="value">{ primaryInfo.speed } mph</h1>
            </div>
            <div className="stat">Pack SoC
                <h1 className="value">{ primaryInfo.soc }%</h1>
            </div>
            <div className="stat">Solar Power In
                <h1 className="value">{primaryInfo.power_in} W</h1>
            </div>
            <div className="stat">Net Pack Power
                <h1 className="value">{primaryInfo.net_power} W</h1>
            </div>
            <div className="stat">Batt Curr
                <h1 className="value">{primaryInfo.batt_curr} A</h1>
            </div>
            <div className="stat">Batt Volt
                <h1 className="value">{primaryInfo.batt_volt} V</h1>
            </div>
          </div>
        </section>
  );
}