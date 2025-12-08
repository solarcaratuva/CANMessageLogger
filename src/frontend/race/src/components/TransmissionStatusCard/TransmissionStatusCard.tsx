// TransmissionStatusCard.tsx
import "./TransmissionStatusCard.css";

type LinkStatus = {
  name: string;
  lastMs: number | null;
  bytesPerSec: number | null;
  isPrimary: boolean;
  isOnline: boolean;
};

type Props = {
  xbee: LinkStatus;
  lte: LinkStatus;
};

function TransmissionStatusCard({ xbee, lte }: Props) {
  return (
    <div className="card tx-card">
      <h3 className="tx-title">Transmission Status</h3>

      <div className="tx-row">
        <ConnectionRow label="XBee" status={xbee} />
      </div>
      <div className="tx-row">
        <ConnectionRow label="LTE" status={lte} />
      </div>
    </div>
  );
}

export default function ConnectionRow({ label, status }: { label: string; status: LinkStatus }) {
  return (
    <div className="tx-connection-row">
      <div className="tx-connection-left">
        <span
          className={
            "status-dot " +
            (status.isOnline ? "status-online" : "status-offline")
          }
        />
        <span className="tx-label">
          {label} {status.isPrimary && <span className="tx-primary-pill">PRIMARY</span>}
        </span>
      </div>

      <div className="tx-connection-metrics">
        <span className="tx-metric">
          Last:{" "}
          {status.lastMs != null ? `${status.lastMs.toFixed(0)} ms` : "—"}
        </span>
        <span className="tx-metric">
          Rate:{" "}
          {status.bytesPerSec != null ? `${status.bytesPerSec.toFixed(1)} B/s` : "—"}
        </span>
      </div>
    </div>
  );
}
