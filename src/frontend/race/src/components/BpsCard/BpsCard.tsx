import "./BpsCard.css";

type Bps = {
    packVoltage: number;
    packCurrent: number;
    soc: number;
    dischargeRelayClosed: boolean;
    chargeRelayClosed: boolean;
    chargerSafety: boolean;
    chargePowerSignal: boolean;
    balancingActive: boolean;
}

type BpsCardProps = {
    bps: Bps;
}

export default function BpsCard({ bps }: BpsCardProps) {
  return (
    <div className="secondary-block">
        <h4 className="block-label">BPS</h4>

        <div className="secondary-row">
          <span>Pack Voltage</span>
          <span className="secondary-value">
              {bps?.packVoltage ?? 0} V
          </span>
        </div>

        <div className="secondary-row">
          <span>Pack Current</span>
          <span className="secondary-value">
              {bps?.packCurrent ?? 0} A
          </span>
        </div>

        <div className="secondary-row">
          <span>Pack SoC</span>
          <span className="secondary-value">
              {bps?.soc ?? 0} %
          </span>
        </div>

        <div className="secondary-row">
          <span>Discharge Relay</span>
          <span className="secondary-value">
              {String(bps?.dischargeRelayClosed ?? false)}
          </span>
        </div>

        <div className="secondary-row">
          <span>Charge Relay</span>
          <span className="secondary-value">
              {String(bps?.chargeRelayClosed ?? false)}
          </span>
        </div>

        <div className="secondary-row">
          <span>Charger Safety</span>
          <span className="secondary-value">
              {String(bps?.chargerSafety ?? false)}
          </span>
        </div>

        <div className="secondary-row">
          <span>Charge Power Signal</span>
          <span className="secondary-value">
              {String(bps?.chargePowerSignal ?? false)}
          </span>
        </div>

        <div className="secondary-row">
          <span>Balancing</span>
          <span className="secondary-value">
              {String(bps?.balancingActive ?? false)}
          </span>
        </div>
    </div>
  );
}
