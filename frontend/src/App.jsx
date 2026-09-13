import { useState, useRef } from "react";

const API_BASE_URL = "/api";

const EXPECTED_COLUMNS = [
  "having_IP_Address", "URL_Length", "Shortining_Service", "having_At_Symbol",
  "double_slash_redirecting", "Prefix_Suffix", "having_Sub_Domain", "SSLfinal_State",
  "Domain_registeration_length", "Favicon", "port", "HTTPS_token", "Request_URL",
  "URL_of_Anchor", "Links_in_tags", "SFH", "Submitting_to_email", "Abnormal_URL",
  "Redirect", "on_mouseover", "RightClick", "popUpWidnow", "Iframe", "age_of_domain",
  "DNSRecord", "web_traffic", "Page_Rank", "Google_Index", "Links_pointing_to_page",
  "Statistical_report",
];

const COLUMN_LABELS = {
  having_IP_Address: "Having IP address",
  URL_Length: "URL length",
  Shortining_Service: "URL shortening service",
  having_At_Symbol: "Having @ symbol",
  double_slash_redirecting: "Double slash redirecting",
  Prefix_Suffix: "Prefix / suffix in domain",
  having_Sub_Domain: "Having sub domain",
  SSLfinal_State: "SSL final state",
  Domain_registeration_length: "Domain registration length",
  Favicon: "Favicon source",
  port: "Port",
  HTTPS_token: "HTTPS token in domain name",
  Request_URL: "Request URL",
  URL_of_Anchor: "URL of anchor",
  Links_in_tags: "Links in meta / script / link tags",
  SFH: "Server form handler",
  Submitting_to_email: "Submitting info to email",
  Abnormal_URL: "Abnormal URL",
  Redirect: "Redirect count",
  on_mouseover: "OnMouseOver behavior",
  RightClick: "Right click disabled",
  popUpWidnow: "Pop-up window usage",
  Iframe: "Iframe usage",
  age_of_domain: "Age of domain",
  DNSRecord: "DNS record exists",
  web_traffic: "Web traffic rank",
  Page_Rank: "Page rank",
  Google_Index: "Indexed by Google",
  Links_pointing_to_page: "Links pointing to page",
  Statistical_report: "Statistical report flag",
};

function timestamp() {
  return new Date().toLocaleTimeString("en-US", { hour12: false });
}

function parseCsvHeader(text) {
  const firstLine = text.split(/\r?\n/)[0] || "";
  return firstLine.split(",").map((col) => col.trim());
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
      appendLog(`failed — ${err.message || "training can take several minutes; check the server if this persists"}`);
    }
  };

  const runPrediction = async () => {
    if (!file) {
      setPredictError("Choose a CSV before predicting.");
      return;
    }

    setPredictError(null);
    setPredictData(null);

    try {
      const text = await file.text();
      const header = parseCsvHeader(text);
      const missing = EXPECTED_COLUMNS.filter((col) => !header.includes(col));
      if (missing.length > 0) {
        setPredictError(
          `CSV is missing ${missing.length} required column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`
        );
        return;
      }
    } catch {
      setPredictError("Could not read that file — make sure it's a valid CSV.");
      return;
    }

    setPredictStatus("running");

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
      setPredictError(err.message || "Prediction failed — check the server logs.");
    }
  };

  const chosenFileName = file ? file.name : "No file chosen";

  return (
    <div className="page">
      <header className="masthead">
        <div className="wordmark-row">
          <h1 className="wordmark">Phishwatch</h1>
          <span className={`status-dot status-${trainStatus === "running" ? "active" : "idle"}`} />
        </div>
        <p className="standfirst">
          Reads 30 structural signals off a site — IP-based URLs, SSL state, domain age,
          iframe use — and calls it phishing or legitimate.
        </p>
      </header>

      <section className="block">
        <div className="block-head">
          <h2>Retrain the model</h2>
        </div>
        <p className="block-copy">
          Re-runs ingestion, validation, transformation, and model selection end to end.
          This can take several minutes.
        </p>
        <button
          className="btn btn-primary"
          onClick={runTraining}
          disabled={trainStatus === "running"}
        >
          {trainStatus === "running" ? "Training in progress…" : "Run training"}
        </button>

        {trainLog.length > 0 && (
          <div className="console">
            {trainLog.map((line, i) => (
              <div key={i} className="console-line">
                {line}
              </div>
            ))}
          </div>
        )}
      </section>

      <hr className="rule" />

      <section className="block">
        <div className="block-head">
          <h2>Check a site</h2>
        </div>
        <p className="block-copy">
          Upload a CSV holding the 30 feature columns the model was trained on, one row per site.
        </p>

        <div className="file-row">
          <button className="btn btn-outline" onClick={() => fileInputRef.current.click()}>
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
          {predictStatus === "running" ? "Checking…" : "Run prediction"}
        </button>

        {predictError && <p className="error-text">{predictError}</p>}

        <details className="manifest">
          <summary>What the 30 columns mean</summary>
          <table className="manifest-table">
            <tbody>
              {EXPECTED_COLUMNS.map((col) => (
                <tr key={col}>
                  <td className="manifest-label">{COLUMN_LABELS[col]}</td>
                  <td className="manifest-key">{col}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>

      {predictData && (
        <>
          <hr className="rule" />
          <section className="block verdict">
            <div className="block-head">
              <h2>Verdict</h2>
            </div>

            <div className="tally">
              <div className="tally-item">
                <span className="tally-num">{predictData.row_count}</span>
                <span className="tally-label">rows checked</span>
              </div>
              <div className="tally-item tally-bad">
                <span className="tally-num">{predictData.phishing_count}</span>
                <span className="tally-label">flagged phishing</span>
              </div>
              <div className="tally-item tally-good">
                <span className="tally-num">{predictData.legitimate_count}</span>
                <span className="tally-label">legitimate</span>
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
        </>
      )}
    </div>
  );
}