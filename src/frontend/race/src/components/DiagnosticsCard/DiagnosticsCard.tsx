import './DiagnosticsCard.css'
import ConnectionRow from '../TransmissionStatusCard/TransmissionStatusCard';

type heartbeatProps = {
    wheel: boolean;
    power: boolean;
    telemetry: boolean;
}

type xbeeProps = {
    name: string;
    lastMs: number;
    bytesPerSec: number;
    isPrimary: boolean;
    isOnline: boolean;
}

type lteProps = {
    name: string;
    lastMs: number;
    bytesPerSec: number;
    isPrimary: boolean;
    isOnline: boolean;
}

type faultsProps = {
    id: number;
    source: string;
    code: string;
    label: string;
    severity: string;
}[]

type DiagnosticProps = {
    heartbeat: heartbeatProps,
    xbee: xbeeProps,
    lte: lteProps,
    faults: faultsProps,
}


export default function DiagnosticsCard({ heartbeat, xbee, lte, faults }: DiagnosticProps) {

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