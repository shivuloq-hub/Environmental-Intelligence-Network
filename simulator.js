/**
 * Edge AI Multi-Hazard Disaster Simulation Engine
 * Adheres to theme.md specification and simulation threshold rules.
 */

const SCENARIOS = {
  flood: {
    id: 'flood',
    name: 'Flood Detection',
    accentColor: '#2196F3',
    sensors: [
      { key: 'waterLevel', label: 'Water Level', unit: 'cm', min: 100, max: 450 },
      { key: 'rainfall', label: 'Rainfall', unit: 'mm/hr', min: 0, max: 80 }
    ],
    thresholds: {
      waterLevel: { warning: 200, critical: 350 },
      rainfall: { warning: 20, critical: 50 }
    },
    baseline: {
      waterLevel: 130,
      rainfall: 8
    },
    incrementRates: {
      waterLevel: { base: 14, jitter: 6 },
      rainfall: { base: 3.2, jitter: 1.8 }
    }
  },
  forest_fire: {
    id: 'forest_fire',
    name: 'Forest Fire',
    accentColor: '#FF5722',
    sensors: [
      { key: 'temperature', label: 'Temperature', unit: '°C', min: 20, max: 60 },
      { key: 'smoke', label: 'Smoke / PM2.5', unit: 'µg/m³', min: 10, max: 220 }
    ],
    thresholds: {
      temperature: { warning: 35, critical: 45 },
      smoke: { warning: 50, critical: 150 }
    },
    baseline: {
      temperature: 28,
      smoke: 25
    },
    incrementRates: {
      temperature: { base: 1.4, jitter: 0.6 },
      smoke: { base: 11, jitter: 4.5 }
    }
  },
  landslide: {
    id: 'landslide',
    name: 'Landslide',
    accentColor: '#795548',
    sensors: [
      { key: 'soilMoisture', label: 'Soil Moisture', unit: '%', min: 30, max: 100 },
      { key: 'vibration', label: 'Ground Vibration', unit: 'mm', min: 0, max: 8 }
    ],
    thresholds: {
      soilMoisture: { warning: 60, critical: 80 },
      vibration: { warning: 2, critical: 5 }
    },
    baseline: {
      soilMoisture: 42,
      vibration: 0.5
    },
    incrementRates: {
      soilMoisture: { base: 2.8, jitter: 1.2 },
      vibration: { base: 0.38, jitter: 0.18 }
    }
  }
};
// Generate appropriate telemetry based on the node's designated hazard
function generateNodeTelemetry(node) {
  const hazard = node.hazard || node.hazardType || 'flood';
  let payload = {
    node_id: node.name,
    threat_status: 'NORMAL'
  };

  if (hazard === 'forest_fire') {
    payload.temperature = Number((Math.random() * 10 + 25).toFixed(1)); // 25°C - 35°C
    payload.flame_detected = false;
    payload.humidity = Number((Math.random() * 20 + 30).toFixed(1));
  }
  else if (hazard === 'landslide') {
    payload.vibration_alert = Number((0.05 + (Math.random() * 0.1)).toFixed(2)); // baseline ground noise
    payload.rainfall = Number((Math.random() * 5).toFixed(1));
    payload.soil_moisture = 40;
  }
  else {
    // Flood
    payload.water_level = Number((Math.random() * 20 + 100).toFixed(1));
    payload.rainfall = Number((Math.random() * 5).toFixed(1));
  }

  return payload;
}
// 30 Most Critical National Disaster Hotspots in India (ISRO, NDMA, FSI Data)
const SENSOR_NODES = [
  // 🔴 HIGH-RISK LANDSLIDE ZONES (Himalayas & Western Ghats)
  { id: 1, name: 'Rudraprayag, Uttarakhand', lat: 30.2844, lng: 78.9811, hazardType: 'landslide', vulnerabilityFactor: 1.45, battery: 96, rssi: -62, latency: 12.4, fw: 'v2.4.1' },
  { id: 2, name: 'Tehri Garhwal, Uttarakhand', lat: 30.3833, lng: 78.6167, hazardType: 'landslide', vulnerabilityFactor: 1.40, battery: 88, rssi: -68, latency: 14.1, fw: 'v2.4.1' },
  { id: 3, name: 'Chamoli, Uttarakhand', lat: 30.2738, lng: 79.3258, hazardType: 'landslide', vulnerabilityFactor: 1.35, battery: 92, rssi: -71, latency: 15.8, fw: 'v2.4.0' },
  { id: 4, name: 'Wayanad, Kerala', lat: 11.6854, lng: 76.1320, hazardType: 'landslide', vulnerabilityFactor: 1.40, battery: 79, rssi: -74, latency: 13.9, fw: 'v2.4.1' },
  { id: 5, name: 'Idukki, Kerala', lat: 9.8500, lng: 76.9667, hazardType: 'landslide', vulnerabilityFactor: 1.30, battery: 85, rssi: -65, latency: 16.2, fw: 'v2.4.1' },
  { id: 6, name: 'Darjeeling, West Bengal', lat: 27.0410, lng: 88.2663, hazardType: 'landslide', vulnerabilityFactor: 1.25, battery: 91, rssi: -69, latency: 14.5, fw: 'v2.4.1' },
  { id: 7, name: 'South District, Sikkim', lat: 27.2333, lng: 88.3500, hazardType: 'landslide', vulnerabilityFactor: 1.30, battery: 87, rssi: -70, latency: 15.1, fw: 'v2.4.1' },
  { id: 8, name: 'Nilgiris, Tamil Nadu', lat: 11.4064, lng: 76.6932, hazardType: 'landslide', vulnerabilityFactor: 1.20, battery: 94, rssi: -64, latency: 11.8, fw: 'v2.4.1' },
  { id: 9, name: 'Rajouri, Jammu & Kashmir', lat: 33.3810, lng: 74.3015, hazardType: 'landslide', vulnerabilityFactor: 1.35, battery: 82, rssi: -73, latency: 16.8, fw: 'v2.4.0' },
  { id: 10, name: 'Shimla, Himachal Pradesh', lat: 31.1048, lng: 77.1734, hazardType: 'landslide', vulnerabilityFactor: 1.25, battery: 89, rssi: -67, latency: 13.2, fw: 'v2.4.1' },

  // 🔵 HIGH-RISK FLOOD ZONES (Brahmaputra, Ganges, and Coastal Belts)
  { id: 11, name: 'Lakhimpur, Assam', lat: 27.2333, lng: 94.1000, hazardType: 'flood', vulnerabilityFactor: 1.45, battery: 90, rssi: -68, latency: 14.0, fw: 'v2.4.1' },
  { id: 12, name: 'Dhemaji, Assam', lat: 27.4833, lng: 94.5833, hazardType: 'flood', vulnerabilityFactor: 1.40, battery: 86, rssi: -72, latency: 15.5, fw: 'v2.4.1' },
  { id: 13, name: 'Sitamarhi, Bihar', lat: 26.6000, lng: 85.4833, hazardType: 'flood', vulnerabilityFactor: 1.35, battery: 93, rssi: -63, latency: 12.7, fw: 'v2.4.1' },
  { id: 14, name: 'Supaul, Bihar', lat: 26.1167, lng: 86.6000, hazardType: 'flood', vulnerabilityFactor: 1.35, battery: 81, rssi: -75, latency: 17.1, fw: 'v2.4.0' },
  { id: 15, name: 'Puri, Odisha', lat: 19.8133, lng: 85.8314, hazardType: 'flood', vulnerabilityFactor: 1.30, battery: 95, rssi: -61, latency: 11.5, fw: 'v2.4.1' },
  { id: 16, name: 'Jagatsinghpur, Odisha', lat: 20.2700, lng: 86.1600, hazardType: 'flood', vulnerabilityFactor: 1.30, battery: 88, rssi: -69, latency: 14.3, fw: 'v2.4.1' },
  { id: 17, name: 'Gorakhpur, Uttar Pradesh', lat: 26.7606, lng: 83.3732, hazardType: 'flood', vulnerabilityFactor: 1.25, battery: 92, rssi: -66, latency: 13.8, fw: 'v2.4.1' },
  { id: 18, name: 'East Godavari, Andhra Pradesh', lat: 17.0005, lng: 81.8040, hazardType: 'flood', vulnerabilityFactor: 1.25, battery: 84, rssi: -70, latency: 15.2, fw: 'v2.4.1' },
  { id: 19, name: 'South 24 Parganas, West Bengal', lat: 22.1466, lng: 88.4066, hazardType: 'flood', vulnerabilityFactor: 1.35, battery: 89, rssi: -67, latency: 13.9, fw: 'v2.4.1' },
  { id: 20, name: 'Chennai, Tamil Nadu', lat: 13.0827, lng: 80.2707, hazardType: 'flood', vulnerabilityFactor: 1.30, battery: 97, rssi: -60, latency: 10.9, fw: 'v2.4.1' },

  // 🔥 HIGH-RISK FOREST FIRE ZONES (Dry Deciduous & Eastern Ghats)
  { id: 21, name: 'Simlipal Forest, Odisha', lat: 21.9056, lng: 86.2625, hazardType: 'forest_fire', vulnerabilityFactor: 1.40, battery: 85, rssi: -71, latency: 16.0, fw: 'v2.4.1' },
  { id: 22, name: 'Bastar, Chhattisgarh', lat: 19.2078, lng: 81.9327, hazardType: 'forest_fire', vulnerabilityFactor: 1.35, battery: 80, rssi: -76, latency: 17.5, fw: 'v2.4.0' },
  { id: 23, name: 'Gadchiroli, Maharashtra', lat: 20.1802, lng: 80.0028, hazardType: 'forest_fire', vulnerabilityFactor: 1.30, battery: 91, rssi: -65, latency: 13.4, fw: 'v2.4.1' },
  { id: 24, name: 'Nallamala Hills, Andhra Pradesh', lat: 16.0333, lng: 78.8667, hazardType: 'forest_fire', vulnerabilityFactor: 1.35, battery: 87, rssi: -68, latency: 14.8, fw: 'v2.4.1' },
  { id: 25, name: 'Pauri Garhwal, Uttarakhand', lat: 30.1450, lng: 78.7766, hazardType: 'forest_fire', vulnerabilityFactor: 1.25, battery: 93, rssi: -64, latency: 12.6, fw: 'v2.4.1' },
  { id: 26, name: 'Betul, Madhya Pradesh', lat: 21.9000, lng: 77.9000, hazardType: 'forest_fire', vulnerabilityFactor: 1.20, battery: 88, rssi: -69, latency: 14.1, fw: 'v2.4.1' },
  { id: 27, name: 'Chandel, Manipur', lat: 24.3167, lng: 94.0000, hazardType: 'forest_fire', vulnerabilityFactor: 1.30, battery: 78, rssi: -78, latency: 18.2, fw: 'v2.4.0' },
  { id: 28, name: 'Lunglei, Mizoram', lat: 22.8833, lng: 92.7333, hazardType: 'forest_fire', vulnerabilityFactor: 1.25, battery: 83, rssi: -74, latency: 16.5, fw: 'v2.4.1' },
  { id: 29, name: 'Karbi Anglong, Assam', lat: 26.0000, lng: 93.5000, hazardType: 'forest_fire', vulnerabilityFactor: 1.30, battery: 89, rssi: -67, latency: 13.7, fw: 'v2.4.1' },
  { id: 30, name: 'Bandipur Reserve, Karnataka', lat: 11.6667, lng: 76.6333, hazardType: 'forest_fire', vulnerabilityFactor: 1.35, battery: 96, rssi: -61, latency: 11.2, fw: 'v2.4.1' }
];

class DisasterSimulator {
  constructor() {
    this.currentScenarioKey = 'flood';
    this.intervalId = null;
    this.intervalMs = 2000; // 2-second telemetry cycle
    this.listeners = [];
    this.tickCount = 0;
    this.nodesState = [];
    this.isRunning = false;
    this.nodePreviousStatus = {};
    this.telemetryHistory = [];

    this.resetState();
  }

  getScenario() {
    return SCENARIOS[this.currentScenarioKey];
  }

  getNodes() {
    return SENSOR_NODES;
  }

  resetState() {
    const scenario = this.getScenario();
    this.tickCount = 0;
    this.nodePreviousStatus = {};
    this.telemetryHistory = [];

    this.nodesState = SENSOR_NODES.map(node => {
      const initialMetrics = {};
      scenario.sensors.forEach(sensor => {
        const baseVal = scenario.baseline[sensor.key];
        const noise = (Math.random() - 0.5) * (baseVal * 0.08);
        initialMetrics[sensor.key] = Number((baseVal + noise).toFixed(1));
      });

      this.nodePreviousStatus[node.id] = 'safe';

      return {
        id: node.id,
        name: node.name,
        lat: node.lat,
        lng: node.lng,
        vulnerabilityFactor: node.vulnerabilityFactor,
        battery: node.battery,
        rssi: node.rssi,
        latency: node.latency,
        fw: node.fw,
        metrics: initialMetrics,
        status: 'safe', // 'safe' | 'warning' | 'critical'
        worstMetric: null,
        lastUpdated: new Date().toLocaleTimeString()
      };
    });
  }

  setScenario(scenarioKey) {
    if (!SCENARIOS[scenarioKey]) return;
    this.currentScenarioKey = scenarioKey;
    this.resetState();
    this.notifyListeners({
      type: 'SCENARIO_RESET',
      scenario: this.getScenario(),
      nodesState: this.nodesState,
      aggregate: this.getAggregateMetrics(),
      overallStatus: 'safe'
    });
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.intervalId = setInterval(() => {
      this.step();
    }, this.intervalMs);
  }

  pause() {
    if (!this.isRunning) return;
    this.isRunning = false;
    clearInterval(this.intervalId);
    this.intervalId = null;
    this.notifyListeners({
      type: 'SIMULATION_PAUSED'
    });
  }

  togglePlayPause() {
    if (this.isRunning) {
      this.pause();
    } else {
      this.start();
    }
    return this.isRunning;
  }

  evaluateNodeStatus(metrics, scenario) {
    let highestSeverity = 'safe';
    let triggeredKey = null;

    for (const sensor of scenario.sensors) {
      const val = metrics[sensor.key];
      const th = scenario.thresholds[sensor.key];

      if (val >= th.critical) {
        highestSeverity = 'critical';
        triggeredKey = sensor.key;
        break;
      } else if (val >= th.warning) {
        if (highestSeverity !== 'critical') {
          highestSeverity = 'warning';
          triggeredKey = sensor.key;
        }
      }
    }

    return { status: highestSeverity, triggeredKey };
  }

  step() {
    this.tickCount++;
    const scenario = this.getScenario();
    const newAlerts = [];

    this.nodesState = this.nodesState.map(node => {
      const updatedMetrics = { ...node.metrics };

      scenario.sensors.forEach(sensor => {
        const rateInfo = scenario.incrementRates[sensor.key];
        const stepNoise = (Math.random() - 0.4) * rateInfo.jitter;
        const delta = (rateInfo.base + stepNoise) * (node.vulnerabilityFactor || 1.0);
        const currentVal = updatedMetrics[sensor.key];
        const nextVal = Math.min(sensor.max, Math.max(sensor.min, currentVal + delta));

        updatedMetrics[sensor.key] = Number(nextVal.toFixed(1));
      });

      const { status, triggeredKey } = this.evaluateNodeStatus(updatedMetrics, scenario);
      const prevStatus = this.nodePreviousStatus[node.id];

      if (status !== prevStatus) {
        this.nodePreviousStatus[node.id] = status;
        const triggerSensor = scenario.sensors.find(s => s.key === triggeredKey);
        const triggerLabel = triggerSensor ? triggerSensor.label : 'Telemetry';
        const triggerVal = triggerSensor ? `${updatedMetrics[triggeredKey]} ${triggerSensor.unit}` : '';

        if (status === 'critical') {
          newAlerts.push({
            id: `${node.id}-${this.tickCount}-crit`,
            nodeId: node.id,
            nodeName: node.name,
            severity: 'critical',
            message: `${node.name}: ${triggerLabel} reached CRITICAL threshold (${triggerVal})!`,
            timestamp: new Date().toLocaleTimeString()
          });
        } else if (status === 'warning' && prevStatus === 'safe') {
          newAlerts.push({
            id: `${node.id}-${this.tickCount}-warn`,
            nodeId: node.id,
            nodeName: node.name,
            severity: 'warning',
            message: `${node.name}: ${triggerLabel} entered WARNING zone (${triggerVal}).`,
            timestamp: new Date().toLocaleTimeString()
          });
        }
      }

      return {
        ...node,
        metrics: updatedMetrics,
        status,
        worstMetric: triggeredKey,
        lastUpdated: new Date().toLocaleTimeString()
      };
    });

    const aggregate = this.getAggregateMetrics();
    const overallStatus = this.getOverallNetworkStatus();

    this.telemetryHistory.push({
      timestamp: new Date().toLocaleTimeString(),
      scenario: scenario.name,
      tick: this.tickCount,
      metrics: { ...aggregate },
      overallStatus
    });

    if (this.telemetryHistory.length > 50) {
      this.telemetryHistory.shift();
    }

    this.notifyListeners({
      type: 'TELEMETRY_TICK',
      tick: this.tickCount,
      scenario,
      nodesState: this.nodesState,
      aggregate,
      overallStatus,
      alerts: newAlerts,
      timestamp: new Date().toLocaleTimeString()
    });
  }

  getAggregateMetrics() {
    const scenario = this.getScenario();
    const aggregate = {};

    scenario.sensors.forEach(sensor => {
      let maxVal = -Infinity;
      this.nodesState.forEach(node => {
        const val = node.metrics[sensor.key];
        if (val > maxVal) maxVal = val;
      });
      aggregate[sensor.key] = Number(maxVal.toFixed(1));
    });

    return aggregate;
  }

  getOverallNetworkStatus() {
    const statuses = this.nodesState.map(n => n.status);
    if (statuses.includes('critical')) return 'critical';
    if (statuses.includes('warning')) return 'warning';
    return 'safe';
  }

  getHistory() {
    return this.telemetryHistory;
  }

  subscribe(listener) {
    if (typeof listener === 'function') {
      this.listeners.push(listener);
    }
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notifyListeners(data) {
    this.listeners.forEach(listener => {
      try {
        listener(data);
      } catch (err) {
        console.error('Error in simulator listener:', err);
      }
    });
  }
}

if (typeof window !== 'undefined') {
  window.DisasterSimulator = DisasterSimulator;
  window.SCENARIOS = SCENARIOS;
  window.SENSOR_NODES = SENSOR_NODES;
}
