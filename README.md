# LANDSAFE AI (full stack)

Landslide early-warning console for North East India. Ground sensors, satellite and GIS terrain are fused into one risk score per zone, with citizen reports and SMS alerts.

**Stack:** plain HTML/CSS/JS frontend (`public/index.html`) + Node.js backend (`server.js`) + SQLite database. **Zero npm dependencies.** Needs Node 22.13 or newer.

## Run

```bash
node server.js          # or: npm start
# open http://localhost:3000
```

Optional: copy `.env.example` to `.env` and set `JWT_SECRET` (and Twilio keys for real SMS).
Run the tests with `npm test`. Set `NO_SYNC=1` to skip the live data fetch.

Demo logins: `admin / admin123`, `officer / officer123`, `public / public123`. **Change or delete these before any real deployment.**

## What the backend adds

| Feature | Endpoint |
|---|---|
| Sign up / log in (scrypt-hashed passwords, signed 12 h tokens, login rate limit) | `POST /api/auth/signup`, `/api/auth/login` |
| Citizen hazard reports; officers verify or dismiss | `GET/POST /api/reports`, `PATCH /api/reports/:id` |
| "I'm safe" / "I need help" check-ins | `GET/POST /api/checkins`, `PATCH /api/checkins/:id/handled` |
| Alerts, texted to registered residents of the zone (High and Critical) | `GET/POST /api/alerts` |
| SMS endpoint used by the console's "SMS backend URL" box | `POST /send` |
| Admin: list users, promote to Field Officer, remove | `GET /api/users`, `PATCH /api/users/:u/role`, `DELETE /api/users/:u` |
| Zone data feed (auto-filled from free APIs, admin can add rows) | `PUT /api/zone_metrics`, `GET /zone_metrics.json` |
| Data source status / manual refresh | `GET /api/datasources`, `POST /api/sync` |
| SMS history (admin) | `GET /api/sms` |

Roles: **Public** (own reports, check-ins), **Field Officer** (all reports, verify, send alerts), **Admin** (everything plus users and feed).

## SMS

With no Twilio keys the server runs in **dry-run**: messages are logged and stored in `sms_log`, nothing is sent. Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` and `TWILIO_FROM` to send real texts.

## Live data (free, no API keys)

When the server starts (and every 30 minutes for weather) it fetches real data in the background and stores it in the `zone_metrics` table. The console loads it automatically after login.

| Data | Source | Notes |
|---|---|---|
| Rainfall, last 24 h | Open-Meteo forecast API | Model/satellite-blended rainfall, a stand-in for GPM IMERG |
| Soil moisture | Open-Meteo (`soil_moisture_3_to_9cm`, falls back to `0_to_1cm`) | **Modelled**, not from ground sensors. Shown as % of 0.5 m3/m3 |
| Elevation and slope | Open-Meteo elevation API (Copernicus DEM) | Slope computed from 5 points around each zone |
| Past landslides | NASA Global Landslide Catalog CSV (data.nasa.gov) | Events within 30 km of each zone. The public export is current to 2016. Please cite Kirschbaum et al. |

Check what worked: `GET /api/datasources`. Admins can force a refresh with `POST /api/sync`. If a source is offline the old value is kept and the status shows the error. The first run needs internet access.

Because the console now runs on real values, the storm slider starts at 0 and risk shows what the data says. Use **Simulate storm** to demonstrate an event.

### Still demo / not connected
- **NDVI (Sentinel-2)** and **ground movement (Sentinel-1 InSAR)** stay at demo values. Real versions need Google Earth Engine or NASA/ASF accounts.
- **Ground soil-moisture sensors** are simulated. A real ESP32 + probe could post readings to the server.
- GPM IMERG, SMAP and CHIRPS are not connected.

To add your own rows (for example NDVI), upload them as an admin:

```bash
curl -X PUT http://localhost:3000/api/zone_metrics \
  -H "Authorization: Bearer <admin token>" -H "Content-Type: application/json" \
  -d '[{"zone":"Gangtok NH10","ndvi":0.41,"insar_mm":3.8}]'
```
Only the fields you send are changed. The risk score is calculated in the browser, so each open officer console can trigger alerts; in production move the scoring into the server.

## Deploy

LANDSAFE AI is ready for cloud deployment with zero external npm dependencies (requires Node 22.13+):

### 1. Push to GitHub
```bash
git remote add origin https://github.com/<YOUR_USERNAME>/landsafe-ai.git
git branch -M main
git push -u origin main
```

### 2. Deploy on Render (Recommended)
1. Go to [dashboard.render.com](https://dashboard.render.com) and click **New +** > **Web Service** (or **Blueprint** using [`render.yaml`](./render.yaml)).
2. Connect your GitHub repository.
3. Configure settings:
   - **Environment:** `Node`
   - **Build Command:** `node --version`
   - **Start Command:** `node server.js`
   - **Environment Variables:**
     - `NODE_VERSION`: `22.13.0`
     - `JWT_SECRET`: *(Generate or set a random 32+ char key)*
4. Click **Deploy Web Service**.

### 3. Deploy on Railway
1. Go to [railway.app](https://railway.app) and select **New Project** > **Deploy from GitHub repo**.
2. Railway will automatically detect the [`Procfile`](./Procfile) and [`Dockerfile`](./Dockerfile).
3. Optional: Add a Persistent Volume mounted to `/data` and set `DB_PATH=/data/landsafe.db`.

### 4. Deploy on Fly.io
Using the bundled [`fly.toml`](./fly.toml):
```bash
fly launch
fly volumes create landsafe_data --size 1
fly deploy
```

