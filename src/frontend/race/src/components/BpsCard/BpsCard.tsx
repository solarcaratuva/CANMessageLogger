import "./BpsCard.css";

export default function BpsCard() {
  const bms = {
    packVoltage: 134.2,
    packCurrent: -12.3,
    soc: 56.5,
    dischargeRelayClosed: true,
    chargeRelayClosed: false,
    chargerSafety: true,
    chargePowerSignal: false,
    balancingActive: true,
  };

  return (
    <div className="secondary-block">
        <h4 className="block-label">BPS</h4>

        <div className="secondary-row">
        <span>Pack Voltage</span>
        <span className="secondary-value">
            {bms.packVoltage} V
        </span>
        </div>

        <div className="secondary-row">
        <span>Pack Current</span>
        <span className="secondary-value">
            {bms.packCurrent} A
        </span>
        </div>

        <div className="secondary-row">
        <span>Pack SoC</span>
        <span className="secondary-value">
            {bms.soc} %
        </span>
        </div>

        <div className="secondary-row">
        <span>Discharge Relay</span>
        <span className="secondary-value">
            {String(bms.dischargeRelayClosed)}
        </span>
        </div>

        <div className="secondary-row">
        <span>Charge Relay</span>
        <span className="secondary-value">
            {String(bms.chargeRelayClosed)}
        </span>
        </div>

        <div className="secondary-row">
        <span>Charger Safety</span>
        <span className="secondary-value">
            {String(bms.chargerSafety)}
        </span>
        </div>

        <div className="secondary-row">
        <span>Charge Power Signal</span>
        <span className="secondary-value">
            {String(bms.chargePowerSignal)}
        </span>
        </div>

        <div className="secondary-row">
        <span>Balancing</span>
        <span className="secondary-value">
            {String(bms.balancingActive)}
        </span>
        </div>
    </div>
  );
}
