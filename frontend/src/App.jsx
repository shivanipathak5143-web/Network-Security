import { useMemo, useRef, useState } from "react";

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
  return firstLine.split(",").map((col) => col.trim().replace(/^"|"$/g, ""));
}

function predictionIsPhishing(value) {
  const normalized = String(value).trim().toLowerCase();
  return (
    normalized === "phishing" ||
    normalized === "1" ||
    normalized === "true" ||
    normalized === "yes"
  );
}

function escapeCsv(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadResults(rows) {
  if (!rows?.length) return;

  const columns = Object.keys(rows[0]);
  const csv = [
    columns.map(escapeCsv).join(","),
    ...rows.map((row) => columns.map((col) => escapeCsv(row[col])).join(",")),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "phishing_prediction_results.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [trainStatus, setTrainStatus] = useState("idle");
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
      appendLog(
        `failed — ${err.message || "training failed; check the FastAPI server"}`
      );
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
          `CSV is missing ${missing.length} required column${
            missing.length > 1 ? "s" : ""
          }: ${missing.join(", ")}`
        );
        return;
      }
    } catch {
      setPredictError("Could not read that file — make sure it is a valid CSV.");
      return;
    }

    setPredictStatus("running");

    const body = new FormData();
    body.append("file", file);

    try {
      const res = await fetch(`${API_BASE_URL}/predict`, {
        method: "POST",
        body,
      });

      if (!res.ok) {
        let detail = await res.text();
        try {
          const parsed = JSON.parse(detail);
          detail = parsed.detail || parsed.message || detail;
        } catch {}
        throw new Error(detail || "Prediction failed");
      }

      const data = await res.json();
      setPredictData(data);
      setPredictStatus("done");
    } catch (err) {
      setPredictStatus("error");
      setPredictError(
        err.message || "Prediction failed — check the FastAPI server."
      );
    }
  };

  const chosenFileName = file ? file.name : "No file chosen";

  const stats = useMemo(() => {
    const rows = predictData?.rows || [];
    const phishing =
      typeof predictData?.phishing_count === "number"
        ? predictData.phishing_count
        : rows.filter((r) => predictionIsPhishing(r.predicted_column)).length;
    const legitimate =
      typeof predictData?.legitimate_count === "number"
        ? predictData.legitimate_count
        : rows.length - phishing;

    return {
      total:
        typeof predictData?.row_count === "number"
          ? predictData.row_count
          : rows.length,
      phishing,
      legitimate,
    };
  }, [predictData]);

  const phishingPercent = stats.total
    ? Math.round((stats.phishing / stats.total) * 100)
    : 0;

  return (
    <div className="page">
      <header className="masthead">
        <div className="topbar">
          <div>
            <div className="wordmark-row">
              <div className="logo-mark">P</div>
              <h1 className="wordmark">Phishwatch</h1>
              <span
                className={`status-dot status-${trainStatus === "running" ? "active" : "idle"}`}
              />
            </div>
            <p className="standfirst">
              Machine-learning phishing detection using 30 structural website
              signals.
            </p>
          </div>

          <div className="model-pill">
            <span className="model-pill-dot" />
            ML detector
          </div>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">PHISHING WEBSITE CLASSIFIER</p>
            <h2>
              Turn website signals
              <br />
              into a security verdict.
            </h2>
            <p>
              Retrain your model on the existing dataset, then upload new
              website feature data to classify each row as phishing or
              legitimate.
            </p>
          </div>

          <div className="signal-card">
            <div className="signal-icon">⌁</div>
            <div className="signal-number">30</div>
            <div className="signal-title">structural signals</div>
            <div className="signal-copy">
              URL, SSL, domain, redirect, iframe and other website indicators.
            </div>
          </div>
        </section>

        <section className="workflow-grid">
          <article className="action-card">
            <div className="card-top">
              <span className="step">01</span>
              <span className="card-kicker">MODEL TRAINING</span>
            </div>
            <h3>Retrain the model</h3>
            <p>
              Runs your existing ingestion, validation, transformation, model
              comparison and model-saving pipeline end to end.
            </p>

            <button
              className="btn btn-primary"
              onClick={runTraining}
              disabled={trainStatus === "running"}
            >
              {trainStatus === "running"
                ? "Training in progress…"
                : "Run training"}
            </button>

            {trainLog.length > 0 && (
              <div className="console">
                {trainLog.map((line, i) => (
                  <div key={i} className="console-line">
                    <span>›</span> {line}
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="action-card">
            <div className="card-top">
              <span className="step">02</span>
              <span className="card-kicker">NEW DATA</span>
            </div>
            <h3>Check websites</h3>
            <p>
              Upload a CSV containing the same 30 feature columns used during
              training, one website record per row.
            </p>

            <div className="file-row">
              <button
                className="btn btn-outline"
                onClick={() => fileInputRef.current?.click()}
              >
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
                  setPredictStatus("idle");
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
          </article>
        </section>

        <section className="info-strip">
          <div>
            <strong>How it works</strong>
            <span>CSV → validation → preprocessing → saved ML model → verdict</span>
          </div>
          <div>
            <strong>Input</strong>
            <span>30 pre-extracted website features</span>
          </div>
          <div>
            <strong>Output</strong>
            <span>Phishing or legitimate</span>
          </div>
        </section>

        <details className="manifest">
          <summary>
            <span>View the 30 required feature columns</span>
            <span className="summary-arrow">+</span>
          </summary>
          <div className="manifest-grid">
            {EXPECTED_COLUMNS.map((col, index) => (
              <div className="manifest-item" key={col}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{COLUMN_LABELS[col]}</strong>
                  <small>{col}</small>
                </div>
              </div>
            ))}
          </div>
        </details>

        {predictData && (
          <section className="verdict-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">ANALYSIS COMPLETE</p>
                <h2>Verdict</h2>
              </div>
              <button
                className="btn btn-outline"
                onClick={() => downloadResults(predictData.rows)}
              >
                Download results
              </button>
            </div>

            <div className="summary-grid">
              <div className="summary-card">
                <span className="summary-label">Rows checked</span>
                <strong>{stats.total}</strong>
                <span className="summary-note">records analyzed</span>
              </div>

              <div className="summary-card bad">
                <span className="summary-label">Flagged phishing</span>
                <strong>{stats.phishing}</strong>
                <span className="summary-note">{phishingPercent}% of records</span>
              </div>

              <div className="summary-card good">
                <span className="summary-label">Legitimate</span>
                <strong>{stats.legitimate}</strong>
                <span className="summary-note">
                  {stats.total ? 100 - phishingPercent : 0}% of records
                </span>
              </div>

              <div className="distribution-card">
                <div
                  className="donut"
                  style={{
                    background: `conic-gradient(#e6533c 0 ${phishingPercent}%, #4fa67a ${phishingPercent}% 100%)`,
                  }}
                >
                  <div className="donut-hole">
                    <strong>{phishingPercent}%</strong>
                    <span>phishing</span>
                  </div>
                </div>
                <div className="legend">
                  <div>
                    <span className="legend-dot phishing-dot" />
                    Phishing
                  </div>
                  <div>
                    <span className="legend-dot legitimate-dot" />
                    Legitimate
                  </div>
                </div>
              </div>
            </div>

            <div className="results-header">
              <div>
                <h3>Website verdicts</h3>
                <p>
                  The model prediction is shown below. Expand a row to inspect
                  its 30 input features.
                </p>
              </div>
            </div>

            <div className="results-list">
              {(predictData.rows || []).map((row, index) => {
                const phishing = predictionIsPhishing(row.predicted_column);

                return (
                  <details className="result-row" key={index}>
                    <summary>
                      <span className="row-number">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className={`verdict-badge ${phishing ? "bad" : "good"}`}>
                        <span>{phishing ? "!" : "✓"}</span>
                        {phishing ? "Phishing" : "Legitimate"}
                      </span>
                      <span className="row-caption">
                        Website record {index + 1}
                      </span>
                      <span className="expand">View features +</span>
                    </summary>

                    <div className="feature-grid">
                      {EXPECTED_COLUMNS.map((col) => (
                        <div className="feature-cell" key={col}>
                          <span>{COLUMN_LABELS[col]}</span>
                          <strong>{String(row[col] ?? "—")}</strong>
                        </div>
                      ))}
                    </div>
                  </details>
                );
              })}
            </div>
          </section>
        )}
      </main>

      <footer>
        <span>Phishwatch</span>
        <span>Machine-learning phishing website detection</span>
        <span>30 features • FastAPI • ML model</span>
      </footer>
    </div>
  );
}
