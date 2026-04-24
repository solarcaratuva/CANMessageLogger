import { useState, useEffect } from 'react';
import { socket } from './util/socket';
import Dashboard from './components/DashboardCard/Dashboard';
import RawDataPanel from './components/RawDataPanel/RawDataPanel';
import type { PrimaryInfo, BPS, Motor, Heartbeat, ConnectionInfo, Fault } from './components/DashboardCard/Dashboard';

export type BackendSource = 'cloud' | 'xbee' | 'legacy' | 'unknown';

type RawStreamEntry = {
  id: string;
  source: BackendSource;
  timestamp: number;
  rawData: string;
  messageName: string | null;
  signals: Record<string, any> | null;
  original: any;
};

const DashboardWrapper = () => {
  // App-level shared dashboard state for realtime backend streams.
  // The socket listener below updates this state for both legacy and new stream sources.
  const [primaryInfo, setPrimaryInfo] = useState<PrimaryInfo>({
    speed: 0,
    soc: 0,
    power_in: 0,
    net_power: 0,
    batt_curr: 0,
    batt_volt: 0,
  });

  const [bps, setBps] = useState<BPS>({
    packVoltage: 0,
    packCurrent: 0,
    soc: 0,
    dischargeRelayClosed: false,
    chargeRelayClosed: false,
    chargerSafety: false,
    chargePowerSignal: false,
    balancingActive: false,
  });

  const [motor, setMotor] = useState<Motor>({
    batteryVoltage: 0,
    batteryCurrent: 0,
    motorCurrent: 0,
    motorRpm: 0,
    fetTemp: 0,
    pwmDuty: 0,
    acceleratorPosition: 0,
    regenPosition: 0,
    powerMode: 'STANDBY',
    controlMode: 'TORQUE',
    regenEnabled: false,
  });

  const [heartbeat] = useState<Heartbeat>({
    wheel: false,
    power: false,
    telemetry: false,
  });

  const [xbee] = useState<ConnectionInfo>({
    name: 'XBee',
    lastMs: 0,
    bytesPerSec: 0,
    isPrimary: true,
    isOnline: false,
  });

  const [lte] = useState<ConnectionInfo>({
    name: 'LTE',
    lastMs: 0,
    bytesPerSec: 0,
    isPrimary: false,
    isOnline: false,
  });

  const [faults] = useState<Fault[]>([]);
  const [backendSource, setBackendSource] = useState<BackendSource>('unknown');
  const [streamHistory, setStreamHistory] = useState<RawStreamEntry[]>([]);

  useEffect(() => {
    // Listen for the unified backend stream event and preserve compatibility
    // with the old `pull_db` event name until the backend is fully migrated.
    const handleStream = (data: any) => {
      if (!Array.isArray(data)) {
        return;
      }

      if (data.length === 0) {
        return;
      }

      const firstItem = data[0];
      const source: BackendSource = firstItem?.source === 'xbee'
        ? 'xbee'
        : firstItem?.source === 'cloud'
        ? 'cloud'
        : firstItem?.payload
        ? 'legacy'
        : 'unknown';
      setBackendSource(source);

      if (source === 'xbee') {
        const entries = data.map((item: any) => ({
          id: item.messageId ?? '',
          source: 'xbee' as BackendSource,
          timestamp: item.timestamp ?? Date.now(),
          rawData: item.rawData ?? '',
          messageName: item.messageName ?? null,
          signals: item.signals ?? null,
          original: item,
        }));
        setStreamHistory((prev) => [...entries, ...prev].slice(0, 20));
        return;
      }

      if (source === 'legacy') {
        // Legacy `pull_db` payloads are expected to include `struct_name`, so
        // map those records into the same dashboard updates used by the new stream.
        const entries: RawStreamEntry[] = [];
        data.forEach((item: any) => {
          const raw = item.payload;
          if (!raw) {
            return;
          }

          const structName = raw.struct_name;
          if (structName === 'motor') {
            setMotor({
              batteryVoltage: raw.battery_voltage_mc ?? 0,
              batteryCurrent: raw.battery_current_mc ?? 0,
              motorCurrent: raw.motor_current ?? 0,
              motorRpm: raw.motor_rpm ?? 0,
              fetTemp: raw.fet_temp ?? 0,
              pwmDuty: raw.pwm_duty ?? 0,
              acceleratorPosition: raw.accel_position ?? 0,
              regenPosition: raw.regen_position ?? 0,
              powerMode: raw.power_mode ?? 'STANDBY',
              controlMode: raw.control_mode ?? 'TORQUE',
              regenEnabled: raw.regen ?? false,
            });
          }

          if (structName === 'battery') {
            const parsedBps: BPS = {
              packVoltage: raw.pack_voltage ?? 0,
              packCurrent: raw.pack_current ?? 0,
              soc: raw.pack_soc ?? 0,
              dischargeRelayClosed: raw.discharge_relay ?? false,
              chargeRelayClosed: raw.charge_relay ?? false,
              chargerSafety: raw.charger_safety ?? false,
              chargePowerSignal: raw.charge_power_signal ?? false,
              balancingActive: raw.balancing ?? false,
            };
            setBps(parsedBps);
            setPrimaryInfo({
              speed: raw.speed ?? 0,
              soc: raw.pack_soc ?? 0,
              power_in: raw.solar_power_in ?? 0,
              net_power: raw.net_pack_power ?? 0,
              batt_curr: raw.batt_current ?? 0,
              batt_volt: raw.batt_voltage ?? 0,
            });
          }

          entries.push({
            id: raw?.id ?? raw?.message_id ?? '',
            source: 'legacy',
            timestamp: Date.now(),
            rawData: JSON.stringify(raw, null, 2),
            messageName: structName ?? null,
            signals: raw,
            original: raw,
          });
        });
        setStreamHistory((prev) => [...entries, ...prev].slice(0, 20));
        return;
      }

      if (source === 'cloud') {
        const entries = data.map((item: any) => ({
          id: item.id ?? item.message_id ?? '',
          source: 'cloud' as BackendSource,
          timestamp: Date.now(),
          rawData: JSON.stringify(item, null, 2),
          messageName: item.struct_name ?? null,
          signals: item,
          original: item,
        }));
        setStreamHistory((prev) => [...entries, ...prev].slice(0, 20));
      }
    };

    socket.on('backend_data_stream', handleStream);
    socket.on('pull_db', handleStream); // Keep compatibility with legacy backend naming.

    return () => {
      socket.off('backend_data_stream', handleStream);
      socket.off('pull_db', handleStream);
    };
  }, []);

  return (
    <>
      <Dashboard
        primaryInfo={primaryInfo}
        bps={bps}
        motor={motor}
        heartbeat={heartbeat}
        xbee={xbee}
        lte={lte}
        faults={faults}
        streamPanel={<RawDataPanel backendSource={backendSource} entries={streamHistory} />}
      />
    </>
  );
};

export default DashboardWrapper;
