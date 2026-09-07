import { useState, useRef } from "react";

const API_BASE_URL = "http://localhost:8000";

function timestamp() {
  return new Date().toLocaleTimeString("en-US", { hour12: false });
}

export default function App() {
  const [trainStatus, setTrainStatus] = useState("idle"); // idle | running | done | error
  const [trainLog, setTrainLog] = useState([]);

  const [file, setFile] = useState(null);
  const [predictStatus, setPredictStatus] = useState("idle");
  const [predictError, setPredictError] = useState(null);
  const [predictData, setPredictData] = useState(null);
  const fileInputRef = useRef(null);

  const appendLog = (line) =>
    setTrainLog((prev) => [...prev, `${timestamp()}  ${line}`]);

  const runTraining = async () => {
    setTrainStatus("running");
    appendLog("pipeline started — ingestion, validation, transformation, model selection");
    try {
      const res = await fetch(`${API_BASE_URL}/train`, { method: "GET" });
      if (!res.ok) throw new Error(await res.text());
      setTrainStatus("done");
      appendLog("training complete — best model saved to final_model/");
    } catch (err) {
      setTrainStatus("error");
      appendLog(`failed — ${err.message || "check backend terminal"}`);
    }
  };

  const runPrediction = async () => {
    if (!file) {
      setPredictError("Choose a CSV before predicting.");
      return;
    }
    setPredictStatus("running");
    setPredictError(null);
    setPredictData(null);

    const body = new FormData();
    body.append("file", file);

    try {
      const res = await fetch(`${API_BASE_URL}/predict`, { method: "POST", body });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setPredictData(data);
      setPredictStatus("done");
    } catch (err) {
      setPredictStatus("error");
      setPredictError(err.message || "Prediction failed — check backend terminal.");
    }
  };

  const chosenFileName = file ? file.name : "no file chosen";

  return (
    <div className="page">
      <header className="masthead">
        <div className="masthead-row">
          <h1>
            Phish<span className="accent-italic">watch</span>
          </h1>
          <span className={`pulse pulse-${trainStatus === "running" ? "amber" : "idle"}`} />
        </div>
        <p className="masthead-sub">
          A classifier reading 30 structural signals off a site — IP-based URLs, SSL state,
          domain age, iframe use — to call it phishing or legitimate.
        </p>
      </header>

      <section className="deck">
        <div className="panel">
          <div className="panel-head">
            <h2>Train</h2>
            <span className="tag">GET /train</span>
          </div>
          <p>Re-runs ingestion, validation, transformation, and model selection end to end.</p>
          <button
            className="btn btn-primary"
            onClick={runTraining}
            disabled={trainStatus === "running"}
          >
            {trainStatus === "running" ? "Training in progress" : "Run training"}
          </button>

          {trainLog.length > 0 && (
            <div className="log">
              {trainLog.map((line, i) => (
                <div key={i} className="log-line">
                  {line}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>Predict</h2>
            <span className="tag">POST /predict</span>
          </div>
          <p>Upload a CSV holding the same 30 feature columns the model was trained on.</p>

          <div className="file-row">
            <button className="btn btn-ghost" onClick={() => fileInputRef.current.click()}>
              Choose CSV
            </button>
            <span className="file-name">{chosenFileName}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              hidden
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setPredictData(null);
                setPredictError(null);
              }}
            />
          </div>

          <button
            className="btn btn-primary"
            onClick={runPrediction}
            disabled={predictStatus === "running"}
          >
            {predictStatus === "running" ? "Predicting" : "Run prediction"}
          </button>

          {predictError && <p className="error-text">{predictError}</p>}
        </div>
      </section>

      {predictData && (
        <section className="findings">
          <div className="ledger">
            <div className="ledger-item">
              <span className="ledger-num">{predictData.row_count}</span>
              <span className="ledger-label">rows scanned</span>
            </div>
            <div className="ledger-item ledger-bad">
              <span className="ledger-num">{predictData.phishing_count}</span>
              <span className="ledger-label">flagged phishing</span>
            </div>
            <div className="ledger-item ledger-good">
              <span className="ledger-num">{predictData.legitimate_count}</span>
              <span className="ledger-label">legitimate</span>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {Object.keys(predictData.rows[0] || {}).map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {predictData.rows.map((row, i) => (
                  <tr key={i}>
                    {Object.entries(row).map(([key, value]) => (
                      <td
                        key={key}
                        className={
                          key === "predicted_column"
                            ? value === 1
                              ? "cell-bad"
                              : "cell-good"
                            : undefined
                        }
                      >
                        {key === "predicted_column"
                          ? value === 1
                            ? "phishing"
                            : "legitimate"
                          : String(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
