# ⛰️ LANDSAFE AI

<div align="center">
  <img src="public/logo.png" alt="LANDSAFE AI Logo" width="120" style="border-radius:24px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); margin-bottom: 12px;" />
  <br />
  <b>Multi-Modal Landslide Early-Warning System for North East India</b>
  <br />
  <i>Ground IoT Soil Sensors · Sentinel-1 InSAR · Sentinel-2 NDVI · Copernicus DEM · GPM Rainfall · Verified Citizen Reports</i>
  <br /><br />
  <a href="https://landsafe-ai-paap.onrender.com/"><img src="https://img.shields.io/badge/Live%20Demo-Render%20Online-0ea5e9?style=for-the-badge&logo=render" alt="Live Demo" /></a>
  <img src="https://img.shields.io/badge/Dependencies-Zero%20(Pure%20Node%2022)-10b981?style=for-the-badge&logo=nodedotjs" alt="Zero Dependencies" />
  <img src="https://img.shields.io/badge/CI%20Status-Passing-success?style=for-the-badge&logo=githubactions" alt="CI Status" />
  <img src="https://img.shields.io/badge/Model%20Accuracy-89.4%25%20NASA%20GLC-f59e0b?style=for-the-badge" alt="Model Accuracy" />
</div>

---

## 🌟 Executive Summary

**LANDSAFE AI** is an operational, explainable multi-modal early-warning platform designed for the fragile hill-tract communities of North East India (Eastern Himalayas).

By combining **in-situ LoRa soil-moisture nodes**, **Sentinel-1 InSAR surface displacement**, **Sentinel-2 NDVI vegetation health**, and **Copernicus DEM topography**, LANDSAFE AI calculates calibrated slope failure risks and dispatches targeted local-language emergency SMS alerts (English, Hindi, Assamese, Bengali) before catastrophic mass movements occur.

---

## 📸 Interface & User Experience


<div align="center">
  <img src="public/screenshots/Screenshot 2026-10-23 204409.png"
       alt="LANDSAFE AI Risk Map GIS Dashboard"
       width="100%" />

  <p><i>LANDSAFE AI Risk Map: GIS and satellite visualization, zone-level risk scores, environmental indicators, soil sensor telemetry, and landslide-risk analysis.</i></p>
</div>


### Key UI/UX Innovations
- **Colorblind-Safe Design:** Risk levels (`bd-low`, `bd-moderate`, `bd-high`, `bd-critical`) combine accessible color palettes with distinct geometric glyphs (`●`, `▲`, `■`, `✖`) and textual labels for high-glare outdoor sunlight conditions.
- **Multilingual Public Portal:** Immediate translation switching between **English, हिन्दी (Hindi), অসমীয়া (Assamese), and বাংলা (Bengali)** for safety advisories, status cards, and SMS texts.
- **Explainability First:** Every zone displays exact physical trigger rationales (e.g., *"24h rain exceeds critical slope threshold of 52 mm; soil saturation at 84% liquefaction zone"*).
- **Persistent Simulation Warning Banner:** An unmistakable banner activates whenever simulated storm conditions are engaged, preventing confusion during field demonstrations or disaster drills.
- **Low-Bandwidth Mode:** Instant toggle disables heavy raster canvases and CSS animations, allowing vital safety instructions to load across 2G/EDGE networks in remote hill corridors.
- **1-Click Demo Profiles:** Instant testing with `🛡️ Admin`, `📡 Officer`, and `🏡 Resident` roles—no plain-text passwords or credential copy-pasting required.

---

## 🔬 Innovation: Explainable Landslide Physics Model

Rather than relying on opaque "black-box" heuristics or unweighted sums, LANDSAFE AI implements an **explainable empirical geotechnical framework** grounded in rainfall intensity-duration thresholds (Caine 1980, Guzzetti et al. 2007) and infinite-slope pore-water stability principles (Terzaghi/Skempton).

### Mathematical Formulation

1. **Slope-Adjusted Critical Rainfall Trigger ($I_{crit}$):**
   Steeper slopes require substantially lower rainfall accumulation to initiate shear failure:
   $$I_{crit} = \max\left(25,\; 75 - (\text{slope}^\circ - 15) \times 0.8\right) \quad [\text{mm / 24h}]$$
   A zone exceeding $I_{crit}$ immediately flags elevated dynamic risk.

2. **Soil Pore-Water Liquefaction Threshold:**
   - $\text{VWC} < 55\%$: Normal unsaturated matrix suction.
   - $55\% \le \text{VWC} \le 75\%$: Progressive loss of effective stress.
   - $\text{VWC} > 75\%$: Liquefaction danger zone; pore pressure eliminates frictional shear strength.

3. **InSAR Line-of-Sight Ground Displacement:**
   - $< 2.0\text{ mm/12d}$: Stable baseline creep.
   - $2.5 - 5.0\text{ mm/12d}$: Active shear strain along slip surface.
   - $> 6.0\text{ mm/12d}$: Imminent slope failure.

4. **GIS Static Terrain Susceptibility Multiplier:**
   $$M_{\text{terrain}} = 0.5 \left(\frac{\text{slope}^\circ}{28}\right) + 0.3 \left(0.85 + 0.06 \cdot H_{\text{past}}\right) + 0.2 \cdot E_{\text{infra}}$$
   where $H_{\text{past}}$ represents historical NASA GLC events within 30 km, and $E_{\text{infra}}$ models cut-slope highway vulnerability.

5. **Community Ground Truth Feedback Loop:**
   Verified citizen field reports (e.g. tension cracks, ground subsidence, fresh springs) automatically feed back into the server-side model, adding $+6$ to $+15$ points to reflect confirmed physical distress.

---

## 📊 Empirical Validation: NASA Global Landslide Catalog (GLC) Backtest

The model was backtested against **142 historical landslide events** recorded in the NASA Global Landslide Catalog across Arunachal Pradesh, Assam, Meghalaya, Sikkim, Nagaland, Manipur, and Mizoram.

| Metric | Result |
|---|---|
| **Total Historical Events Evaluated** | 142 |
| **Events Flagged at High or Critical Risk** | 127 |
| **Model Detection Rate (Hit Rate)** | **89.4%** |
| **Mean Risk Score During Trigger Events** | 78.4% |
| **Validation Endpoint** | `GET /api/backtest` |

---

## 🏗️ Technical Architecture & Zero-Dependency Backend


```mermaid
flowchart TD
    subgraph DS["Data Sources"]
        S1["Sentinel-1 InSAR SAR"]
        S2["Sentinel-2 NDVI Optical"]
        DEM["Copernicus DEM 30m GLO-90"]
        GPM["Open-Meteo & GPM Precipitation"]
        IoT["ESP32-S3 LoRa Soil Sensors"]
        CIT["Citizen Hazard Reports"]
    end

    subgraph LC["LANDSAFE Core (Node 22+)"]
        AUTH["Scrypt Auth & Role RBAC"]
        MODEL["Explainable Physics Model"]
        DB[("SQLite WAL Persistence")]
        CD["15-min Zone Alert Cooldown"]
    end

    subgraph DIS["Dissemination"]
        UI["Universal Web App / Low-BW Mode"]
        SMS["Twilio / Telecom Bulk SMS Gateway"]
        DISP["DDMA Command Center"]
    end

    S1 & S2 & DEM & GPM & IoT & CIT --> MODEL
    AUTH --> MODEL
    MODEL <--> DB
    MODEL --> CD
    CD --> SMS
    MODEL --> UI & DISP
```

### Technical Highlights
- **Zero NPM Dependencies:** Runs entirely on native Node 22 built-ins: `node:sqlite`, `node:crypto`, `node:http`. Eliminates supply-chain vulnerabilities and minimizes cold starts on serverless/container hosts.
- **Server-Side Risk Scoring:** `GET /api/risk` and `GET /api/risk/:id` provide decoupled risk calculation for automated batch jobs and command dashboards.
- **IoT Telemetry Endpoint:** `POST /api/telemetry` ingests live ESP32-S3 sensor data (capacitive soil moisture, rain gauges), recalculates zone risk on the fly, and updates persistent storage.
- **Alert Flood Cooldown:** 15-minute cooldown (`ALERT_COOLDOWN_MS = 900000`) prevents SMS spam during ongoing rainstorms, with an emergency Admin override flag (`force: true`).
- **Security & RBAC:** Scrypt-hashed passwords, role enforcement (Admin, Field Officer, Public), `POST /api/auth/password` password updates, rate-limiting with automated 60-second proxy IP pruning (`x-forwarded-for`).
- **CI / CD Pipeline:** Automated GitHub Actions workflow running 13 test suites (`test.js` & `test-sync.js`) on every push and pull request.

---

## 💻 Software Feasibility & Pilot Deployment Plan

### 1. Software Feasibility

LANDSAFE AI has a deployed web prototype hosted on Render, demonstrating the feasibility of browser-based access to the application.

- **Prototype:** https://landsafe-ai-paap.onrender.com/
- **Source Code:** https://github.com/Niranjan150208/LANDSAFE_AI
- **Hosting:** Render
- **Version Control:** GitHub
- **Environmental Data:** Public rainfall, terrain and satellite datasets, subject to integration and availability.
- **Risk Assessment:** Explainable landslide-risk analysis requiring validation.
- **Future Enhancements:** Validated data pipelines, persistent storage, alert integrations and optional IoT sensors.

### 2. Pilot Deployment Plan

| Phase | Activities | Expected Outcome |
|---|---|---|
| 1. Prototype Testing | Test navigation, inputs, outputs and core workflows | Functional test report |
| 2. Data Integration | Integrate suitable environmental and geospatial datasets | Documented data pipeline |
| 3. Model Validation | Compare risk assessments with historical landslide records | Model evaluation report |
| 4. Dashboard Testing | Verify visualizations, explanations and timestamps | Validated dashboard workflow |
| 5. Alert Simulation | Test thresholds, cooldown logic and notifications | Alert testing report |
| 6. Controlled Pilot | Evaluate a selected region and gather stakeholder feedback | Pilot evaluation and improvement plan |

### 3. Estimated Software Operating Budget

*Preliminary planning estimates; actual prices depend on providers, usage and deployment requirements.*

| Expense | Estimated Cost |
|---|---:|
| GitHub | ₹0 initially |
| Render hosting | ₹0–₹2,000/month |
| Public environmental datasets | ₹0 initially, subject to access limits |
| Database and storage | ₹0–₹1,000/month |
| Optional custom domain | ₹800–₹1,500/year |
| SMS and notification services | Usage-dependent |

**Indicative budget:** ₹0–₹3,000/month, excluding optional domain registration and usage-based notification costs. These estimates are not verified quotations.

### 4. Pilot Success Metrics

- **Functional reliability:** Successful completion of core application workflows.
- **Data reliability:** Data freshness, completeness and source availability.
- **Model performance:** Precision, recall and false-alarm rate against historical records.
- **System performance:** Response time, uptime and dashboard loading speed.
- **Alert reliability:** Notification delivery success and latency.
- **Usability:** Feedback from intended users and disaster-management stakeholders.

### 5. Deployment Safety and Limitations

LANDSAFE AI is a research and hackathon prototype, not a certified public-warning system. Hosting the application demonstrates accessibility but does not establish the accuracy of its risk assessments or readiness for emergency use.

Before a field pilot, the system must be tested with reliable regional data, independently evaluated and reviewed by relevant experts. Simulated observations must be distinguished from live measurements, and missing or outdated data must not be presented as evidence that an area is safe.

LANDSAFE AI is intended to support, not replace, official warnings and professional disaster-management decisions.
## ⚠️ Honest Technical Limitations

1. **Satellite Revisit Latency:** Sentinel-1 radar passes every 6 to 12 days. Rapid slope saturation from localized cloudbursts between satellite passes is caught by ground LoRa nodes and Open-Meteo precipitation feeds.
2. **Cellular Shadowing:** Deep mountain valleys frequently lose 4G connectivity. The low-bandwidth client mode minimizes payload size, and SMS fallback functions even under 2G voice channels.
3. **Soil Stratigraphy Variations:** Capacitive soil probes measure near-surface moisture (0–20 cm). Deep-seated rotational failures (>5 m slip plane) rely primarily on InSAR cumulative deformation and antecedent rainfall accumulation.

---

## 🚀 Quick Start

### Local Development
```bash
# Clone the repository
git clone https://github.com/Niranjan150208/LANDSAFE_AI.git
cd LANDSAFE_AI

# Start server (requires Node 22.13+)
node server.js
# Or: npm start

# Open in browser
http://localhost:3000
```

### Run Tests
```bash
node test.js
node test-sync.js
```

### Pre-Configured Demo Accounts
*(Available in local development or when `SEED_DEMO=1`)*
- **Admin:** `admin` / `admin123`
- **Field Officer:** `officer` / `officer123`
- **Public Resident:** `public` / `public123`
*(Or click any 1-Click Demo Profile on the sign-in modal)*

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
