import './DiagnosticsCard.css'
import ConnectionRow from '../TransmissionStatusCard/TransmissionStatusCard';

export default function DiagnosticsCard() {
    const heartbeat = {
        wheel: true,
        power: false,
        telemetry: true,
      };

    const xbee = {
        name: "XBee",
        lastMs: 120,
        bytesPerSec: 45.3,
        isPrimary: true,
        isOnline: true,
    }
    const lte = {
        name: "LTE",
        lastMs: 840,
        bytesPerSec: 12.1,
        isPrimary: false,
        isOnline: false,
    }

    const faults = [
    {
        id: 1,
        source: "BPS",
        code: "Low_Cell_Voltage_Fault",
        label: "Low cell voltage",
        severity: "fault",   // "fault" | "warning"
    },
    {
        id: 2,
        source: "Motor",
        code: "overheat_level",
        label: "Motor overheat",
        severity: "warning",
    },
    ];


    return (
        <div className="card">
            <h3 className='card-title'>Car Diagnostics</h3>

            <h4 className="sub-label">Transmission Status</h4>

                <div className="tx-row">
                    <ConnectionRow label="XBee" status={xbee} />
                </div>
                <div className="tx-row">
                    <ConnectionRow label="LTE" status={lte} />
                </div>

            <hr className="card-separator" />
            <h4 className="sub-label">Heartbeat Status</h4>
            <div className="heartbeat-section">
                <div className="heartbeat-row">
                <span className="tx-label">Wheel Board</span>
                <span className={`hb-status ${heartbeat.wheel ? "hb-ok" : "hb-bad"}`}>
                    <span className="hb-dot" />
                    {heartbeat.wheel ? "Alive" : "No heartbeat"}
                </span>
                </div>

                <div className="heartbeat-row">
                <span className="tx-label">Power Board</span>
                <span className={`hb-status ${heartbeat.power ? "hb-ok" : "hb-bad"}`}>
                    <span className="hb-dot" />
                    {heartbeat.power ? "Alive" : "No heartbeat"}
                </span>
                </div>

                <div className="heartbeat-row">
                <span className="tx-label">Telemetry Board</span>
                <span
                    className={`hb-status ${
                    heartbeat.telemetry ? "hb-ok" : "hb-bad"
                    }`}
                >
                    <span className="hb-dot" />
                    {heartbeat.telemetry ? "Alive" : "No heartbeat"}
                </span>
                </div>
            </div>

            <hr className="card-separator" />
            
            <h4 className="sub-label">
            Faults & Errors{" "}
            <span className={`fault-count-badge ${faults.length ? "has-faults" : ""}`}>
                {faults.length} active
            </span>
            </h4>

            <div className="fault-list">
            {faults.length === 0 ? (
                <div className="fault-row fault-row-empty">No active faults</div>
            ) : (
                faults.map(f => (
                <div key={f.id} className="fault-row">
                    <span className={`fault-pill fault-pill-${f.source.toLowerCase()}`}>
                    {f.source}
                    </span>
                    <span className="fault-label">{f.label}</span>
                    <span
                    className={
                        "fault-severity " +
                        (f.severity === "fault" ? "fault-severity-critical" : "fault-severity-warning")
                    }
                    >
                    {f.severity === "fault" ? "FAULT" : "WARN"}
                    </span>
                </div>
                ))
            )}
            </div>

        </div>
    )
}