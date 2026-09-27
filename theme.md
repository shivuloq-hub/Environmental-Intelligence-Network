# Edge AI Multi-Hazard Disaster Dashboard - Project Specification

## 1. Project Overview
This project is a frontend-only interactive simulation of a distributed Edge AI environmental monitoring network. It visualizes simulated telemetry data for three specific disaster models: Flood Detection, Forest Fire, and Landslide.

**Tech Stack:** 
- HTML5, CSS3 (Vanilla)
- JavaScript (Vanilla ES6)
- Leaflet.js (Map rendering via CDN)
- Chart.js (Telemetry rendering via CDN)
- NO external backend, NO build tools (Webpack/Vite).

---

## 2. Global Design System (Dark Mode Admin Theme)

### Typography
- **Primary Font:** 'Inter', 'Segoe UI', or system sans-serif.
- **Base Size:** 14px for data, 16px for body, 24px for headers.

### Color Palette
- **Backgrounds:** 
  - Main App Background: `#121212` (Deep Charcoal)
  - Card/Panel Background: `#1E1E1E` (Dark Grey)
- **Text:**
  - Primary Text: `#FFFFFF`
  - Secondary Text: `#A0A0A0`
- **Status Indicators (Nodes & Alerts):**
  - **Normal (Safe):** `#4CAF50` (Green)
  - **Warning (Elevated):** `#FFC107` (Amber)
  - **Critical (Danger):** `#F44336` (Red)
- **Hazard Accents (For charts and buttons):**
  - Flood: `#2196F3` (Blue)
  - Forest Fire: `#FF5722` (Deep Orange)
  - Landslide: `#795548` (Brown)

### CSS Animations
- **Critical Alert Pulse:** A CSS `@keyframes` animation that applies a 2px solid `#F44336` glowing border to the main wrapper or specific data cards, pulsing every 1.5 seconds when a critical threshold is breached.

---

## 3. UI Layout & Grid Structure

The dashboard should use CSS Grid or Flexbox for a responsive, full-screen layout.

1. **Top Navigation Bar:** 
   - Project Title ("Environmental Intelligence Network").
   - **Scenario Controller:** 3 stylized buttons to switch between "Flood", "Forest Fire", and "Landslide" modes.
2. **Main Content Area (Left/Center - 70% width):**
   - **Top Half:** Leaflet.js Interactive Map showing 5 sensor nodes.
   - **Bottom Half:** Chart.js canvas showing a real-time line graph of the selected scenario's metrics.
3. **Sidebar Panel (Right - 30% width):**
   - **Live Telemetry Readout:** Digital text displays of current simulated values.
   - **Alert Log:** A scrolling list of text-based alerts (e.g., "Timestamp - Node 2: Soil Moisture critical").

---

## 4. Simulation & Model Thresholds

The `simulator.js` file must generate fake data on a 2-second interval (`setInterval`). The data must trend upward to simulate an impending disaster, crossing these specific thresholds to trigger UI state changes (Map marker color change + CSS Alert Pulse + Log entry).

### Model 1: Flood Detection
*   **Sensors:** Water Level (cm), Rainfall (mm/hr)
*   **Normal:** Water < 200cm, Rain < 20mm
*   **Warning:** Water 200-350cm, Rain 20-50mm
*   **Critical:** Water > 350cm, Rain > 50mm

### Model 2: Forest Fire
*   **Sensors:** Temperature (°C), Smoke/PM2.5 (µg/m³)
*   **Normal:** Temp < 35°C, PM2.5 < 50
*   **Warning:** Temp 35-45°C, PM2.5 50-150
*   **Critical:** Temp > 45°C, PM2.5 > 150

### Model 3: Landslide
*   **Sensors:** Soil Moisture (%), Ground Vibration (mm)
*   **Normal:** Moisture < 60%, Vibration < 2mm
*   **Warning:** Moisture 60-80%, Vibration 2-5mm
*   **Critical:** Moisture > 80%, Vibration > 5mm

---

## 5. Execution Rules for the Agent
1. Read this entire document.
2. Generate `index.html`, `style.css`, `app.js`, and `simulator.js` adhering strictly to this theme and logic.
3. Ensure switching a scenario instantly clears the chart, resets the map markers to green, and starts simulating the new data curve from the "Normal" baseline.