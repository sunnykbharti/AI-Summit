# PostureTrek - AI Movement & Ergonomics Coach

## 🌐 Running on Local Network / Wi-Fi

The application has been configured so that any device (laptop, smartphone, tablet) connected to the same Wi-Fi network can access and use PostureTrek.

---

### 1. Find Your Local IP Address
On your Mac, check your local IP address at any time using:
```bash
ipconfig getifaddr en0
```
*(Currently: `192.168.48.231`)*

---

### 2. Start the Backend (Flask API)
The backend is configured to bind to `0.0.0.0:5000` with full CORS support.

```bash
cd backend
source env/bin/activate
python app.py
```
- **Local:** `http://127.0.0.1:5000`
- **Wi-Fi / LAN:** `http://192.168.48.231:5000` (or `http://<your-ip>:5000`)

---

### 3. Start the Frontend (React + Vite)
The Vite server is configured to bind to `0.0.0.0:5173` with `--host` and a reverse proxy for `/api` requests:

```bash
cd frontend
npm run dev
```
- **Local:** `http://localhost:5173`
- **Wi-Fi / LAN (Mobile / Other devices):** `http://192.168.48.231:5173` (or `http://<your-ip>:5173`)

> **Note on Mobile Browsers & Camera Access:**  
> Modern mobile browsers (iOS Safari, Android Chrome) enforce security policies that require **HTTPS** or `localhost` to allow camera (`getUserMedia`) access.  
> If testing on a mobile device over HTTP Wi-Fi:
> - In **Chrome on Android**: Navigate to `chrome://flags/#unsafely-treat-insecure-origin-as-secure`, add `http://192.168.48.231:5173`, enable the flag, and relaunch Chrome.
> - Or access from another laptop/desktop browser where camera permissions over LAN are permitted.
