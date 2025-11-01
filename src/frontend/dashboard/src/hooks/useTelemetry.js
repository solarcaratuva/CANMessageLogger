import { useState, useEffect } from "react";

export default function useTelemetry() {
  const [speed, setSpeed] = useState(0);
  const [canValues, setCanValues] = useState({ motorTemp: 80, current: 50 });
  const [errors, setErrors] = useState([]);
  const [heartbeat, setHeartbeat] = useState({ board1: true, board2: true });
  const [lteStatus, setLteStatus] = useState({ lastMessageSec: 5 });
  const [wheelboard, setWheelboard] = useState({ hazards: false, turnSignal: "Off" });

  useEffect(() => {
    const interval = setInterval(() => {
      setSpeed((s) => Math.min(s + Math.random() * 5, 120));
      setCanValues({
        motorTemp: 80 + Math.floor(Math.random() * 10),
        current: 50 + Math.floor(Math.random() * 20),
      });
      setErrors(Math.random() > 0.9 ? ["Motor Overheat"] : []);
      setHeartbeat({ board1: Math.random() > 0.1, board2: Math.random() > 0.1 });
      setLteStatus({ lastMessageSec: Math.floor(Math.random() * 10) });
      setWheelboard({
        hazards: Math.random() > 0.8,
        turnSignal: Math.random() > 0.5 ? "Left" : "Off",
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return { speed, canValues, errors, heartbeat, lteStatus, wheelboard };
}