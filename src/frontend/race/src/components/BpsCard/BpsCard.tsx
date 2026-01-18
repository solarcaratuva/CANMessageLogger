import "./BpsCard.css";

type bps = {
    packVoltage: number;
    packCurrent: number;
    soc: number;
    dischargeRelayClosed: boolean;
    chargeRelayClosed: boolean;
    chargerSafety: boolean;
    chargePowerSignal: boolean;
    balancingActive: boolean;
}

type bpsCardProps = {
    bps: bps;
}

export default function BpsCard({ bps }: bpsCardProps) {
  return (
    <div className="secondary-block">
        <h4 className="block-label">BPS</h4>

        <div className="secondary-row">
        <span>Pack Voltage</span>
        <span className="secondary-value">
            {bps.packVoltage} V
        </span>
        </div>

        <div className="secondary-row">
        <span>Pack Current</span>
        <span className="secondary-value">
            {bps.packCurrent} A
        </span>
        </div>

        <div className="secondary-row">
        <span>Pack SoC</span>
        <span className="secondary-value">
            {bps.soc} %
        </span>
        </div>

        <div className="secondary-row">
        <span>Discharge Relay</span>
        <span className="secondary-value">
            {String(bps.dischargeRelayClosed)}
        </span>
        </div>

        <div className="secondary-row">
        <span>Charge Relay</span>
        <span className="secondary-value">
            {String(bps.chargeRelayClosed)}
        </span>
        </div>

        <div className="secondary-row">
        <span>Charger Safety</span>
        <span className="secondary-value">
            {String(bps.chargerSafety)}
        </span>
        </div>

        <div className="secondary-row">
        <span>Charge Power Signal</span>
        <span className="secondary-value">
            {String(bps.chargePowerSignal)}
        </span>
        </div>

        <div className="secondary-row">
        <span>Balancing</span>
        <span className="secondary-value">
            {String(bps.balancingActive)}
        </span>
        </div>
    </div>
  );
}
