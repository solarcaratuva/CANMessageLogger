// src/App.jsx
import { useEffect, useState } from "react";

const BACKEND_URL = "http://localhost:5500"; // change if needed

function App() {
  const [latestMsg, setLatestMsg] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchLatest = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/get_latest_message`);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();

        if (!data.messages || !Array.isArray(data.messages) || data.messages.length === 0) {
          if (isMounted) setLatestMsg(null);
          return;
        }

        // pick the message with the largest timestamp
        const mostRecent = data.messages.reduce((best, msg) => {
          if (!best) return msg;
          return msg.timestamp > best.timestamp ? msg : best;
        }, null);

        if (isMounted) {
          setLatestMsg(mostRecent);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Error fetching latest message:", err);
          setError(err.message);
        }
      }
    };

    // initial fetch + poll every 1s
    fetchLatest();
    const intervalId = setInterval(fetchLatest, 1000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  return (
    <div style={{ padding: "1.5rem", fontFamily: "system-ui" }}>
      <h1>Latest CAN Message (HTTP)</h1>

      {error && (
        <p style={{ color: "red" }}>
          Error: {error}
        </p>
      )}

      {!latestMsg && !error && <p>Waiting for messages...</p>}

      {latestMsg && (
        <>
          <h3>Most Recent (by timestamp)</h3>
          <pre
            style={{
              background: "#111",
              color: "#0f0",
              padding: "1rem",
              borderRadius: "8px",
              maxHeight: "60vh",
              overflow: "auto",
              fontFamily: "monospace",
              fontSize: "0.9rem",
            }}
          >
            {JSON.stringify(latestMsg, null, 2)}
          </pre>
        </>
      )}
    </div>
  );
}

export default App;
