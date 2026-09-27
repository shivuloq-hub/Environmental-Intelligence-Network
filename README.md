# DrishtiEdge: Environmental Intelligence & Disaster Monitoring Network

> IoT-based Edge AI disaster monitoring platform tracking 30 high-risk zones across India for floods, landslides, and forest fires. Features live Esri satellite mapping, hazard-specific hardware telemetry, and automated bank-grade emergency SMS broadcasts via Fast2SMS.

---

## 🚀 Key Features

* **Nationwide 30-Node Vulnerability Matrix:** Scientifically tracks 30 critical disaster-prone hotspots across India, divided into three specialized categories:
  * **⛰️ Landslide Hotspots (10 Nodes):** Monitors slope vibration and precipitation levels (e.g., Rudraprayag, Wayanad).
  * **🌊 Flood Hotspots (10 Nodes):** Monitors river water levels and hourly rainfall (e.g., Dhemaji, Chennai).
  * **🔥 Forest Fire Hotspots (10 Nodes):** Monitors ambient thermal indexes and flame detection (e.g., Simlipal, Bandipur).
* **Live Satellite Mapping:** Powered by **Leaflet.js** and high-resolution **Esri World Imagery** base layers with precise geographic overlays.
* **Bank-Grade Emergency SMS Dispatcher:** Integrated with the **Fast2SMS** gateway to broadcast TRAI-compliant regulatory alerts featuring automated timestamps, hazard-specific metrics, and unique audit reference codes (`Ref No: DR-XXXXXX`).
* **Decoupled Telemetry Pipeline:** Automatically adapts UI metrics and backend processing based on whether a node is monitoring water, earth vibration, or thermal anomalies.

---

## 💻 Tech Stack
* **Backend:** Node.js, Express.js, RESTful API
* **Frontend:** HTML5, CSS3, Vanilla JavaScript, Leaflet.js
* **Messaging Gateway:** Fast2SMS Bulk API (Quick SMS Route)
* **Intelligence:** Gemini AI Integration for edge telemetry analysis

---

## 🛠️ Quick Start & Setup

1. **Clone the Repository:**
   ```bash
   git clone [https://github.com/shivuloq-hub/Environmental-Intelligence-Network.git](https://github.com/shivuloq-hub/Environmental-Intelligence-Network.git)
   cd Environmental-Intelligence-Network
