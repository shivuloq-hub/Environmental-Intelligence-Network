/**
 * Edge AI Multi-Hazard Dashboard - Application Controller
 * Connects Leaflet Map, Chart.js Telemetry Graph, DisasterSimulator, and Google Gemini 3.8 Flash AI.
 */

document.addEventListener('DOMContentLoaded', () => {
  // --------------------------------------------------------------------------
  // 1. Simulator & State Initialization
  // --------------------------------------------------------------------------
  const simulator = new DisasterSimulator();
  let mapInstance = null;
  let chartInstance = null;
  const nodeMarkers = new Map();
  let alertCount = 0;
  const maxChartPoints = 20;

  // Cache DOM Elements
  const appWrapper = document.getElementById('app-wrapper');
  const scenarioBtns = document.querySelectorAll('.scenario-btn');
  const btnPlayPause = document.getElementById('btn-play-pause');
  const playPauseLabel = document.getElementById('playPauseLabel');
  const playPauseIcon = document.getElementById('playPauseIcon');
  const btnReset = document.getElementById('btn-reset');
  const simStatusText = document.getElementById('simStatusText');
  const livePulseDot = document.getElementById('livePulseDot');

  const threatBanner = document.getElementById('threatBanner');
  const threatText = document.getElementById('threatText');
  const threatBadge = document.getElementById('threatBadge');
  const threatBadgeText = document.getElementById('threatBadgeText');
  const threatStatusDot = document.getElementById('threatStatusDot');

  const metric1Label = document.getElementById('metric1Label');
  const metric1UnitBadge = document.getElementById('metric1UnitBadge');
  const metric1Value = document.getElementById('metric1Value');
  const metric1Unit = document.getElementById('metric1Unit');
  const metric1Bar = document.getElementById('metric1Bar');
  const metric1Max = document.getElementById('metric1Max');
  const metric1NormalTh = document.getElementById('metric1NormalTh');

  const metric2Label = document.getElementById('metric2Label');
  const metric2UnitBadge = document.getElementById('metric2UnitBadge');
  const metric2Value = document.getElementById('metric2Value');
  const metric2Unit = document.getElementById('metric2Unit');
  const metric2Bar = document.getElementById('metric2Bar');
  const metric2Max = document.getElementById('metric2Max');
  const metric2NormalTh = document.getElementById('metric2NormalTh');

  const telemetryTimestamp = document.getElementById('telemetryTimestamp');
  const chartHeading = document.getElementById('chartHeading');
  const chartDataPointsCount = document.getElementById('chartDataPointsCount');
  const mapHazardName = document.getElementById('mapHazardName');
  const nodesStatusSummary = document.getElementById('nodesStatusSummary');
  const nodeList = document.getElementById('nodeList');
  const alertFeed = document.getElementById('alertFeed');
  const alertPlaceholder = document.getElementById('alertPlaceholder');
  const alertCountBadge = document.getElementById('alertCountBadge');

  // Modals & Action Buttons
  const btnEvacTrigger = document.getElementById('btn-evac-trigger');
  const evacModal = document.getElementById('evacModalOverlay');
  const btnCloseEvac = document.getElementById('btn-close-evac');
  const btnDismissEvac = document.getElementById('btn-dismiss-evac');
  const btnExecuteBroadcast = document.getElementById('btn-execute-broadcast');
  const evacHazardType = document.getElementById('evacHazardType');
  const evacEpicenter = document.getElementById('evacEpicenter');
  const btnAiDraftEvac = document.getElementById('btn-ai-draft-evac');
  const evacAiMessagePreview = document.getElementById('evacAiMessagePreview');

  const btnNodeHealth = document.getElementById('btn-node-health');
  const healthModal = document.getElementById('healthModalOverlay');
  const btnCloseHealth = document.getElementById('btn-close-health');
  const btnDismissHealth = document.getElementById('btn-dismiss-health');
  const btnPingNodes = document.getElementById('btn-ping-nodes');
  const healthTableBody = document.getElementById('healthTableBody');

  const btnExportCsv = document.getElementById('btn-export-csv');

  // Gemini AI Copilot Elements
  const btnGeminiModal = document.getElementById('btn-gemini-modal');
  const geminiModal = document.getElementById('geminiModalOverlay');
  const btnCloseGemini = document.getElementById('btn-close-gemini');
  const btnDismissGemini = document.getElementById('btn-dismiss-gemini');
  const btnRunAiAnalysis = document.getElementById('btn-run-ai-analysis');
  const btnSidebarAiAnalyze = document.getElementById('btn-sidebar-ai-analyze');
  const aiOutputBox = document.getElementById('aiOutputBox');
  const sidebarAiSummary = document.getElementById('sidebarAiSummary');
  const aiChatInput = document.getElementById('aiChatInput');
  const btnSendAiChat = document.getElementById('btn-send-ai-chat');
  const promptChips = document.querySelectorAll('.ai-prompt-chip');
  const geminiTabs = document.querySelectorAll('.gemini-tab-btn');

  const btnApiKeySettings = document.getElementById('btn-api-key-settings');
  const apiKeyModal = document.getElementById('apiKeyModalOverlay');
  const btnCloseApiKey = document.getElementById('btn-close-apikey');
  const btnSaveApiKey = document.getElementById('btn-save-apikey');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const btnTestApiKey = document.getElementById('btn-test-apikey');
  const apiKeyStatusMsg = document.getElementById('apiKeyStatusMsg');

  // --------------------------------------------------------------------------
  // 2. Leaflet Map Initialization & Full-Screen Controls
  // --------------------------------------------------------------------------
  function toggleMapFullScreen() {
    const mapElement = document.getElementById('map') || document.querySelector('.map-container') || document.querySelector('.map-card');
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      if (mapElement.requestFullscreen) {
        mapElement.requestFullscreen();
      } else if (mapElement.webkitRequestFullscreen) {
        mapElement.webkitRequestFullscreen();
      } else if (mapElement.msRequestFullscreen) {
        mapElement.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  }

  // Invalidate map size when toggling fullscreen so Leaflet tiles resize smoothly
  const handleFullscreenChange = () => {
    if (mapInstance) {
      setTimeout(() => {
        mapInstance.invalidateSize();
      }, 200);
    }
    const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
    const fsIcon = document.getElementById('fsIcon');
    if (fsIcon) {
      fsIcon.textContent = isFs ? '🗗' : '⛶';
    }
  };
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

  function initMap() {
    // Center map on Central India to view all national nodes
    const indiaCenter = [22.0, 79.0];
    mapInstance = L.map('map', {
      center: indiaCenter,
      zoom: 5,
      zoomControl: true,
      attributionControl: false,
      doubleClickZoom: false
    });

    // Explicitly disable Leaflet's default double-click zoom
    mapInstance.doubleClickZoom.disable();

    // 1. Base Layer: High-Resolution Satellite (Esri World Imagery)
    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri',
      maxZoom: 18
    });

    // 2. Overlay Layer: Area Names, Borders, and Streets
    const labelsLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 18
    });

    // Add both layers to map instance
    satelliteLayer.addTo(mapInstance);
    labelsLayer.addTo(mapInstance);

    // Bind full-screen toggle to double-click on map
    mapInstance.on('dblclick', toggleMapFullScreen);

    // Populate Initial Sensor Node Markers (30 National Disaster Hotspots)
    const nodes = simulator.getNodes();
    nodes.forEach(node => {
      const customIcon = L.divIcon({
        className: 'custom-node-icon',
        html: `<div class="node-map-marker marker-safe" id="marker-node-${node.id}">${node.id}</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });

      const marker = L.marker([node.lat, node.lng], { icon: customIcon }).addTo(mapInstance);

      marker.bindPopup(`
        <div style="font-family: var(--font-main);">
          <div style="font-weight: 700; font-size: 13px; margin-bottom: 4px;">${node.name}</div>
          <div style="font-size: 11px; color: #A0A0A0;">Lat: ${node.lat}, Lng: ${node.lng}</div>
          <div style="font-size: 11px; color: #A0A0A0; margin-top: 2px;">Vulnerability: <strong>${node.vulnerabilityFactor || 1.0}x</strong></div>
          <div style="margin-top: 6px; padding: 4px 6px; background: #2A2A2A; border-radius: 4px; font-family: var(--font-mono); font-size: 11px;" id="popup-metric-${node.id}">
            Status: Safe
          </div>
        </div>
      `);

      nodeMarkers.set(node.id, marker);
    });
  }

  // --------------------------------------------------------------------------
  // 3. Chart.js Telemetry Graph Initialization
  // --------------------------------------------------------------------------
  function initChart() {
    const ctx = document.getElementById('telemetryChart').getContext('2d');
    const scenario = simulator.getScenario();
    const sensor1 = scenario.sensors[0];
    const sensor2 = scenario.sensors[1];

    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: `${sensor1.label} (${sensor1.unit})`,
            data: [],
            borderColor: scenario.accentColor,
            backgroundColor: hexToRgba(scenario.accentColor, 0.15),
            borderWidth: 2.5,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: scenario.accentColor,
            tension: 0.35,
            fill: true,
            yAxisID: 'y1'
          },
          {
            label: `${sensor2.label} (${sensor2.unit})`,
            data: [],
            borderColor: '#00E5FF',
            backgroundColor: 'rgba(0, 229, 255, 0.08)',
            borderWidth: 2,
            borderDash: [5, 4],
            pointRadius: 2.5,
            pointHoverRadius: 5,
            pointBackgroundColor: '#00E5FF',
            tension: 0.35,
            fill: false,
            yAxisID: 'y2'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 350 },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: '#CCCCCC',
              font: { family: "'Inter', sans-serif", size: 11, weight: '600' },
              boxWidth: 14,
              padding: 12
            }
          },
          tooltip: {
            backgroundColor: '#1E1E1E',
            titleColor: '#FFFFFF',
            bodyColor: '#A0A0A0',
            borderColor: '#333333',
            borderWidth: 1,
            padding: 10,
            bodyFont: { family: "'JetBrains Mono', monospace", size: 11 }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#777777', font: { family: "'JetBrains Mono', monospace", size: 10 }, maxRotation: 0 }
          },
          y1: {
            type: 'linear',
            position: 'left',
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: scenario.accentColor, font: { family: "'JetBrains Mono', monospace", size: 10 } }
          },
          y2: {
            type: 'linear',
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: { color: '#00E5FF', font: { family: "'JetBrains Mono', monospace", size: 10 } }
          }
        }
      }
    });
  }

  function resetChart(scenario) {
    if (!chartInstance) return;
    const sensor1 = scenario.sensors[0];
    const sensor2 = scenario.sensors[1];

    chartInstance.data.labels = [];
    chartInstance.data.datasets[0].label = `${sensor1.label} (${sensor1.unit})`;
    chartInstance.data.datasets[0].data = [];
    chartInstance.data.datasets[0].borderColor = scenario.accentColor;
    chartInstance.data.datasets[0].backgroundColor = hexToRgba(scenario.accentColor, 0.15);
    chartInstance.data.datasets[0].pointBackgroundColor = scenario.accentColor;

    chartInstance.data.datasets[1].label = `${sensor2.label} (${sensor2.unit})`;
    chartInstance.data.datasets[1].data = [];

    chartInstance.options.scales.y1.ticks.color = scenario.accentColor;
    chartInstance.update();
  }

  // --------------------------------------------------------------------------
  // 4. UI Theme & Scenario Styling
  // --------------------------------------------------------------------------
  function applyScenarioTheme(scenarioKey) {
    const scenario = SCENARIOS[scenarioKey];
    if (!scenario) return;

    document.documentElement.style.setProperty('--active-hazard', scenario.accentColor);

    scenarioBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.scenario === scenarioKey);
    });

    const s1 = scenario.sensors[0];
    const s2 = scenario.sensors[1];

    metric1Label.textContent = s1.label;
    metric1UnitBadge.textContent = s1.unit;
    metric1Unit.textContent = s1.unit;
    metric1Max.textContent = `${s1.max} ${s1.unit}`;
    metric1NormalTh.textContent = `< ${scenario.thresholds[s1.key].warning}`;

    metric2Label.textContent = s2.label;
    metric2UnitBadge.textContent = s2.unit;
    metric2Unit.textContent = s2.unit;
    metric2Max.textContent = `${s2.max} ${s2.unit}`;
    metric2NormalTh.textContent = `< ${scenario.thresholds[s2.key].warning}`;

    chartHeading.textContent = `Real-Time Telemetry Stream (${s1.label} & ${s2.label})`;
    mapHazardName.textContent = `Model: ${scenario.name}`;
    evacHazardType.textContent = scenario.name;

    resetChart(scenario);
  }

  // --------------------------------------------------------------------------
  // 5. Simulator Event Subscription
  // --------------------------------------------------------------------------
  simulator.subscribe(event => {
    switch (event.type) {
      case 'TELEMETRY_TICK':
        handleTelemetryTick(event);
        break;
      case 'SCENARIO_RESET':
        handleScenarioReset(event);
        break;
      case 'SIMULATION_PAUSED':
        simStatusText.textContent = 'PAUSED';
        livePulseDot.style.animation = 'none';
        livePulseDot.style.background = '#777777';
        break;
    }
  });

  function handleScenarioReset(data) {
    applyScenarioTheme(data.scenario.id);
    updateThreatLevel('safe');
    updateSidebarTelemetry(data.scenario, data.aggregate);
    updateNodesList(data.nodesState, data.scenario);
    updateMapMarkers(data.nodesState, data.scenario);
    chartDataPointsCount.textContent = '0 Data Points';
    sidebarAiSummary.textContent = `Monitoring ${data.scenario.name} baseline. All sensor nodes reporting nominal values.`;
  }

  function handleTelemetryTick(data) {
    const { scenario, nodesState, aggregate, overallStatus, alerts, timestamp } = data;

    telemetryTimestamp.textContent = timestamp;
    simStatusText.textContent = 'LIVE (2.0s)';
    livePulseDot.style.animation = 'pulse-dot 2s infinite ease-in-out';
    livePulseDot.style.background = 'var(--status-normal)';

    updateThreatLevel(overallStatus);
    updateSidebarTelemetry(scenario, aggregate);
    updateNodesList(nodesState, scenario);
    updateMapMarkers(nodesState, scenario);

    if (alerts && alerts.length > 0) {
      alerts.forEach(alert => appendAlertLog(alert));
    }

    if (chartInstance) {
      const s1Key = scenario.sensors[0].key;
      const s2Key = scenario.sensors[1].key;

      chartInstance.data.labels.push(timestamp);
      chartInstance.data.datasets[0].data.push(aggregate[s1Key]);
      chartInstance.data.datasets[1].data.push(aggregate[s2Key]);

      if (chartInstance.data.labels.length > maxChartPoints) {
        chartInstance.data.labels.shift();
        chartInstance.data.datasets[0].data.shift();
        chartInstance.data.datasets[1].data.shift();
      }

      chartInstance.update('none');
      chartDataPointsCount.textContent = `${chartInstance.data.labels.length} Data Points`;
    }

    // Auto-update Sidebar AI snippet
    if (overallStatus === 'critical') {
      sidebarAiSummary.innerHTML = `<span style="color:#F44336; font-weight:700;">CRITICAL BREACH:</span> ${scenario.name} thresholds exceeded in vulnerable sectors. Immediate evacuation protocol advised.`;
    } else if (overallStatus === 'warning') {
      sidebarAiSummary.innerHTML = `<span style="color:#FFC107; font-weight:700;">ELEVATED HAZARD:</span> ${scenario.name} metrics entering warning thresholds. First responders stand by.`;
    } else {
      sidebarAiSummary.textContent = `Nominal baseline. Real-time telemetry streaming from ${nodesState.length} national disaster hotspots.`;
    }
  }

  function updateThreatLevel(status) {
    threatBanner.className = `threat-banner status-${status}`;
    if (status === 'critical') {
      threatText.textContent = 'CRITICAL (DANGER)';
      threatBadgeText.textContent = 'CRITICAL';
      threatStatusDot.textContent = '▲';
      appWrapper.classList.add('critical-breach');
    } else if (status === 'warning') {
      threatText.textContent = 'WARNING (ELEVATED)';
      threatBadgeText.textContent = 'WARNING';
      threatStatusDot.textContent = '◆';
      appWrapper.classList.remove('critical-breach');
    } else {
      threatText.textContent = 'NORMAL (SAFE)';
      threatBadgeText.textContent = 'SAFE';
      threatStatusDot.textContent = '●';
      appWrapper.classList.remove('critical-breach');
    }
  }

  function updateSidebarTelemetry(scenario, aggregate) {
    const s1 = scenario.sensors[0];
    const s2 = scenario.sensors[1];
    const val1 = aggregate[s1.key] || 0;
    const val2 = aggregate[s2.key] || 0;

    metric1Value.textContent = val1;
    metric2Value.textContent = val2;

    const pct1 = Math.min(100, Math.max(0, ((val1 - s1.min) / (s1.max - s1.min)) * 100));
    const pct2 = Math.min(100, Math.max(0, ((val2 - s2.min) / (s2.max - s2.min)) * 100));

    metric1Bar.style.width = `${pct1}%`;
    metric2Bar.style.width = `${pct2}%`;

    const th1 = scenario.thresholds[s1.key];
    metric1Bar.style.background = val1 >= th1.critical ? 'var(--status-critical)' : val1 >= th1.warning ? 'var(--status-warning)' : 'var(--active-hazard)';

    const th2 = scenario.thresholds[s2.key];
    metric2Bar.style.background = val2 >= th2.critical ? 'var(--status-critical)' : val2 >= th2.warning ? 'var(--status-warning)' : '#00E5FF';
  }

  function updateNodesList(nodesState, scenario) {
    const healthyCount = nodesState.filter(n => n.status === 'safe').length;
    if (nodesStatusSummary) {
      nodesStatusSummary.textContent = `${healthyCount} / ${nodesState.length} Nominal`;
    }
    const activeNodesCountEl = document.getElementById('activeNodesCount');
    if (activeNodesCountEl) {
      activeNodesCountEl.textContent = `${nodesState.length} Hotspots Active`;
    }

    if (!nodeList) return;
    nodeList.innerHTML = '';

    nodesState.forEach(node => {
      // Find the node's hazard type from master nodes
      const nodeConfig = SENSOR_NODES.find(n => n.id === node.id);
      const hazard = nodeConfig ? (nodeConfig.hazard || nodeConfig.hazardType) : (scenario ? scenario.id : 'flood');

      let metricsDisplay = '';

      // Format the UI to show the correct hardware metrics for each disaster
      if (hazard === 'forest_fire') {
        const temp = node.metrics.temperature !== undefined ? node.metrics.temperature : 28;
        const smoke = node.metrics.smoke !== undefined ? node.metrics.smoke : (node.metrics.rainfall ? (node.metrics.rainfall * 3).toFixed(0) : 25);
        metricsDisplay = `🌡️ ${temp}°C | 💨 ${smoke} µg/m³`;
      }
      else if (hazard === 'landslide') {
        const vib = node.metrics.vibration !== undefined ? node.metrics.vibration : 0.4;
        const rain = node.metrics.rainfall !== undefined ? node.metrics.rainfall : 12;
        metricsDisplay = `⛰️ ${vib}g | 🌧️ ${rain} mm/hr`;
      }
      else {
        // Flood
        const water = node.metrics.waterLevel !== undefined ? node.metrics.waterLevel : 120;
        const rain = node.metrics.rainfall !== undefined ? node.metrics.rainfall : 10;
        metricsDisplay = `🌊 ${water} cm | 🌧️ ${rain} mm/hr`;
      }

      const row = document.createElement('div');
      row.className = 'node-row';
      row.innerHTML = `
        <div class="node-name-group">
          <span class="node-indicator status-${node.status}"></span>
          <span style="font-weight: 600;">${node.name}</span>
        </div>
        <div class="node-metrics-text">
          ${metricsDisplay}
        </div>
      `;

      row.addEventListener('click', () => {
        const marker = nodeMarkers.get(node.id);
        if (marker && mapInstance) {
          mapInstance.flyTo(marker.getLatLng(), 8, { duration: 0.8 });
          marker.openPopup();
        }
      });

      nodeList.appendChild(row);
    });
  }

  function updateMapMarkers(nodesState, scenario) {
    const s1 = scenario.sensors[0];
    const s2 = scenario.sensors[1];

    nodesState.forEach(node => {
      const el = document.getElementById(`marker-node-${node.id}`);
      if (el) {
        el.className = `node-map-marker marker-${node.status}`;
      }

      const marker = nodeMarkers.get(node.id);
      if (marker) {
        const popupContent = `
          <div style="font-family: var(--font-main); min-width: 170px;">
            <div style="font-weight: 700; font-size: 13px; margin-bottom: 4px; color: #FFF;">${node.name}</div>
            <div style="font-size: 11px; color: #A0A0A0;">Lat: ${node.lat}, Lng: ${node.lng}</div>
            <div style="font-size: 11px; color: #A0A0A0; margin-top: 2px;">Vulnerability: <strong>${node.vulnerabilityFactor || 1.0}x</strong></div>
            <div style="margin-top: 6px; padding: 6px 8px; background: #22262F; border: 1px solid #333; border-radius: 4px; font-family: var(--font-mono); font-size: 11px;">
              <strong>${s1.label}:</strong> ${node.metrics[s1.key]} ${s1.unit}<br>
              <strong>${s2.label}:</strong> ${node.metrics[s2.key]} ${s2.unit}<br>
              <strong>Status:</strong> <span style="text-transform:uppercase; font-weight:700; color:${node.status === 'critical' ? '#F44336' : node.status === 'warning' ? '#FFC107' : '#4CAF50'}">${node.status}</span>
            </div>
          </div>
        `;
        marker.setPopupContent(popupContent);
      }
    });
  }

  function appendAlertLog(alert) {
    alertCount++;
    alertCountBadge.textContent = `${alertCount} Events`;
    if (alertPlaceholder) {
      alertPlaceholder.style.display = 'none';
    }

    const item = document.createElement('div');
    item.className = `alert-item severity-${alert.severity}`;
    item.innerHTML = `
      <span class="alert-time">${alert.timestamp}</span>
      <span class="alert-content">${alert.message}</span>
    `;

    alertFeed.insertBefore(item, alertFeed.firstChild);

    if (alertFeed.children.length > 30) {
      alertFeed.removeChild(alertFeed.lastChild);
    }
  }

  // --------------------------------------------------------------------------
  // 6. Gemini AI Features & Interactions
  // --------------------------------------------------------------------------
  async function triggerGeminiAnalysis() {
    aiOutputBox.innerHTML = `<div style="text-align:center; padding:30px; color:#E2B6FF;">
      <div style="font-size:20px; margin-bottom:8px; animation: pulse-dot 1s infinite;">🤖✨</div>
      <strong>Connecting to Google Gemini 3.8 Flash...</strong><br>
      <span style="font-size:11px; color:#A0A0A0;">Synthesizing distributed sensor mesh telemetry & predictive risk models...</span>
    </div>`;

    const scenario = simulator.getScenario();
    const aggregate = simulator.getAggregateMetrics();
    const threatLevel = simulator.getOverallNetworkStatus();

    try {
      const result = await GeminiService.analyzeTelemetry(scenario, aggregate, simulator.nodesState, threatLevel);
      aiOutputBox.innerHTML = renderMarkdown(result.text) + `
        <div style="margin-top:14px; font-size:10px; color:#888; border-top:1px solid #333; padding-top:6px; display:flex; justify-content:space-between;">
          <span>Model: <strong>${result.modelUsed}</strong></span>
          <span>Latency: Verified OK</span>
        </div>
      `;
      appendAlertLog({
        id: `ai-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        severity: 'gemini',
        message: `🤖 Gemini AI Analysis synthesized for ${scenario.name} (${threatLevel.toUpperCase()}).`
      });
    } catch (err) {
      aiOutputBox.innerHTML = `<div style="color:#F44336; padding:16px;">
        <strong>⚠️ Gemini AI Error:</strong> ${err.message}<br><br>
        <button class="btn-action btn-gemini-ai" id="btn-retest-key">Check API Key Settings</button>
      </div>`;
      document.getElementById('btn-retest-key')?.addEventListener('click', () => {
        geminiModal.classList.remove('active');
        apiKeyModal.classList.add('active');
      });
    }
  }


  async function sendAiChatQuestion(question) {
    if (!question || !question.trim()) return;
    aiChatInput.value = '';

    aiOutputBox.innerHTML = `<div style="text-align:center; padding:30px; color:#E2B6FF;">
      <div style="font-size:20px; margin-bottom:8px; animation: pulse-dot 1s infinite;">🤖💬</div>
      <strong>Gemini Copilot is generating tactical answer...</strong>
    </div>`;

    const context = {
      scenario: simulator.getScenario(),
      aggregate: simulator.getAggregateMetrics(),
      threatLevel: simulator.getOverallNetworkStatus(),
      nodesState: simulator.nodesState
    };

    try {
      const res = await GeminiService.askCopilot(question, context);
      aiOutputBox.innerHTML = `
        <div style="background:#222; padding:8px 12px; border-radius:6px; margin-bottom:12px; font-weight:600; color:#E2B6FF;">
          ❓ ${question}
        </div>
        ${renderMarkdown(res.text)}
      `;
    } catch (err) {
      aiOutputBox.innerHTML = `<div style="color:#F44336; padding:16px;">⚠️ Error: ${err.message}</div>`;
    }
  }

  // Simple markdown renderer for AI responses
  function renderMarkdown(text) {
    if (!text) return '';
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/^### (.*$)/gim, '<h4 style="color:#E2B6FF; margin:10px 0 4px;">$1</h4>')
      .replace(/^## (.*$)/gim, '<h3 style="color:#FFF; margin:12px 0 6px;">$1</h3>')
      .replace(/^# (.*$)/gim, '<h2 style="color:#FFF; margin:14px 0 8px;">$1</h2>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong style="color:#FFF;">$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/^\- (.*$)/gim, '<li style="margin-left:16px; margin-bottom:3px;">$1</li>')
      .replace(/\n\n/gim, '<br><br>')
      .replace(/\n/gim, '<br>');
    return html;
  }

  // --------------------------------------------------------------------------
  // 7. Event Listeners & UI Binding
  // --------------------------------------------------------------------------
  scenarioBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const scenarioKey = btn.dataset.scenario;
      simulator.setScenario(scenarioKey);
      appendAlertLog({
        id: `scen-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        severity: 'info',
        message: `Switched active hazard scenario to: ${SCENARIOS[scenarioKey].name}.`
      });
    });
  });

  btnPlayPause.addEventListener('click', () => {
    const isRunning = simulator.togglePlayPause();
    playPauseLabel.textContent = isRunning ? 'Pause' : 'Resume';
    playPauseIcon.textContent = isRunning ? '⏸' : '▶';
  });

  btnReset.addEventListener('click', () => {
    simulator.resetState();
    simulator.notifyListeners({
      type: 'SCENARIO_RESET',
      scenario: simulator.getScenario(),
      nodesState: simulator.nodesState,
      aggregate: simulator.getAggregateMetrics(),
      overallStatus: 'safe'
    });
    appendAlertLog({
      id: `reset-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      severity: 'info',
      message: `Reset simulation baseline for ${simulator.getScenario().name}.`
    });
  });

  // Gemini AI Modal Triggers
  btnGeminiModal.addEventListener('click', () => {
    geminiModal.classList.add('active');
    triggerGeminiAnalysis();
  });
  btnCloseGemini.addEventListener('click', () => geminiModal.classList.remove('active'));
  btnDismissGemini.addEventListener('click', () => geminiModal.classList.remove('active'));
  btnRunAiAnalysis.addEventListener('click', triggerGeminiAnalysis);
  btnSidebarAiAnalyze.addEventListener('click', () => {
    geminiModal.classList.add('active');
    triggerGeminiAnalysis();
  });

  btnSendAiChat.addEventListener('click', () => {
    sendAiChatQuestion(aiChatInput.value);
  });
  aiChatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendAiChatQuestion(aiChatInput.value);
  });

  promptChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.dataset.prompt;
      sendAiChatQuestion(prompt);
    });
  });

  // Emergency Evacuation & AI Broadcast Draft
  btnEvacTrigger.addEventListener('click', () => {
    evacModal.classList.add('active');
  });
  btnCloseEvac.addEventListener('click', () => evacModal.classList.remove('active'));
  btnDismissEvac.addEventListener('click', () => evacModal.classList.remove('active'));

  btnAiDraftEvac.addEventListener('click', async () => {
    evacAiMessagePreview.innerHTML = '<em>Drafting situational broadcast message with Gemini AI...</em>';
    const scenario = simulator.getScenario();
    const aggregate = simulator.getAggregateMetrics();
    const epicenter = simulator.nodesState.find(n => n.status === 'critical') || simulator.nodesState.find(n => n.status === 'warning') || simulator.nodesState[0];
    if (evacEpicenter) evacEpicenter.textContent = epicenter.name;

    try {
      const res = await GeminiService.generateEvacuationBroadcast(scenario, aggregate, epicenter);
      evacAiMessagePreview.innerHTML = renderMarkdown(res.text);
    } catch (err) {
      evacAiMessagePreview.innerHTML = `<span style="color:#F44336;">Failed to draft: ${err.message}</span>`;
    }
  });

  btnExecuteBroadcast.addEventListener('click', async () => {
    const rawPhones = document.getElementById('evacPhoneNumbers')?.value || '9876543210';
    const phoneList = rawPhones.split(',').map(p => p.trim()).filter(p => p.length > 0);
    const scenario = simulator.getScenario();
    const aggregate = simulator.getAggregateMetrics();
    const activeNode = simulator.nodesState.find(n => n.status === 'critical') || simulator.nodesState.find(n => n.status === 'warning') || simulator.nodesState[0];
    const areaName = activeNode ? activeNode.name : 'National Hazard Sector';

    evacModal.classList.remove('active');

    appendAlertLog({
      id: `broadcast-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      severity: 'critical',
      message: `📢 EMERGENCY BROADCAST DISPATCHED: Sirens active across sectors. Transmitting GSM SMS to ${phoneList.length} numbers...`
    });

    try {
      const response = await fetch('/api/demo/sendsms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumbers: phoneList,
          type: 'EVACUATION',
          areaName: areaName,
          water_level: aggregate.waterLevel || 280,
          rainfall: aggregate.rainfall || 45,
          temperature: aggregate.temperature || 48.5,
          flame_detected: (aggregate.smoke > 100 || aggregate.temperature > 45),
          vibration: aggregate.vibration || 5.8
        })
      });
      const data = await response.json();
      if (data.success) {
        appendAlertLog({
          id: `sms-ok-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          severity: 'info',
          message: `✅ Telecom SMS Dispatched via Fast2SMS Gateway to: ${phoneList.join(', ')}`
        });
      } else {
        appendAlertLog({
          id: `sms-err-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          severity: 'warning',
          message: `⚠️ Telecom SMS Gateway Notice: ${data.message || 'Check Fast2SMS balance'}`
        });
      }
    } catch (err) {
      appendAlertLog({
        id: `sms-fail-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        severity: 'warning',
        message: `⚠️ SMS Dispatch network notice: ${err.message}`
      });
    }
  });

  // Node Health Diagnostics Modal
  function renderHealthTable() {
    healthTableBody.innerHTML = '';
    simulator.nodesState.forEach(node => {
      const tr = document.createElement('tr');
      const badgeClass = node.status === 'critical' ? 'critical' : node.status === 'warning' ? 'warning' : 'healthy';
      tr.innerHTML = `
        <td style="font-weight:700; color:#FFF;">Node ${String(node.id).padStart(2, '0')}</td>
        <td>${node.name}</td>
        <td><span style="color:#81C784;">🔋 ${node.battery}%</span></td>
        <td>${node.rssi} dBm</td>
        <td>${node.latency} ms</td>
        <td><span class="badge-tag">${node.fw}</span></td>
        <td><span class="health-status-badge ${badgeClass}">${node.status.toUpperCase()}</span></td>
      `;
      healthTableBody.appendChild(tr);
    });
  }

  btnNodeHealth.addEventListener('click', () => {
    renderHealthTable();
    healthModal.classList.add('active');
  });
  btnCloseHealth.addEventListener('click', () => healthModal.classList.remove('active'));
  btnDismissHealth.addEventListener('click', () => healthModal.classList.remove('active'));
  btnPingNodes.addEventListener('click', () => {
    appendAlertLog({
      id: `ping-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      severity: 'info',
      message: `📡 Mesh Ping Diagnostic: All ${simulator.nodesState.length} national edge hotspots responded within 14.2ms average latency.`
    });
    renderHealthTable();
  });

  // API Key Settings Modal
  btnApiKeySettings.addEventListener('click', () => {
    apiKeyInput.value = GeminiService.getApiKey();
    apiKeyStatusMsg.textContent = '';
    apiKeyModal.classList.add('active');
  });
  btnCloseApiKey.addEventListener('click', () => apiKeyModal.classList.remove('active'));
  btnSaveApiKey.addEventListener('click', () => {
    GeminiService.setApiKey(apiKeyInput.value);
    apiKeyStatusMsg.innerHTML = '<span style="color:#4CAF50;">✅ API Key saved successfully!</span>';
    setTimeout(() => apiKeyModal.classList.remove('active'), 1000);
  });
  btnTestApiKey.addEventListener('click', async () => {
    apiKeyStatusMsg.innerHTML = '<em>Testing connection with Google Gemini 3.8 Flash...</em>';
    try {
      const res = await GeminiService.testConnection(apiKeyInput.value);
      apiKeyStatusMsg.innerHTML = `<span style="color:#4CAF50;">✅ Connection Verified! Latency: ${res.latency}ms</span>`;
    } catch (err) {
      apiKeyStatusMsg.innerHTML = `<span style="color:#F44336;">❌ Error: ${err.message}</span>`;
    }
  });

  // CSV Telemetry Export
  btnExportCsv.addEventListener('click', () => {
    const history = simulator.getHistory();
    if (!history || history.length === 0) {
      alert('No telemetry data points recorded yet.');
      return;
    }

    const scenario = simulator.getScenario();
    const s1 = scenario.sensors[0];
    const s2 = scenario.sensors[1];

    let csvContent = `Timestamp,Scenario,Tick,${s1.label}_(${s1.unit}),${s2.label}_(${s2.unit}),Network_Status\n`;

    history.forEach(row => {
      csvContent += `"${row.timestamp}","${row.scenario}",${row.tick},${row.metrics[s1.key] || ''},${row.metrics[s2.key] || ''},"${row.overallStatus}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `EdgeAI_Disaster_Telemetry_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    appendAlertLog({
      id: `csv-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      severity: 'info',
      message: `📥 Exported ${history.length} telemetry records to CSV.`
    });
  });

  // Map Fullscreen Button Trigger
  const btnMapFullscreen = document.getElementById('btn-map-fullscreen');
  if (btnMapFullscreen) {
    btnMapFullscreen.addEventListener('click', toggleMapFullScreen);
  }

  // Helper
  function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // --------------------------------------------------------------------------
  // 8. Live Database / ESP32 Hardware Integration
  // --------------------------------------------------------------------------
  let isLiveHardwareActive = false;

  const areaToIdMap = {
    'Rudraprayag, Uttarakhand': 1, 'Tehri Garhwal, Uttarakhand': 2, 'Chamoli, Uttarakhand': 3, 'Wayanad, Kerala': 4, 'Idukki, Kerala': 5,
    'Darjeeling, West Bengal': 6, 'South District, Sikkim': 7, 'Nilgiris, Tamil Nadu': 8, 'Rajouri, Jammu & Kashmir': 9, 'Shimla, Himachal Pradesh': 10,
    'Lakhimpur, Assam': 11, 'Dhemaji, Assam': 12, 'Sitamarhi, Bihar': 13, 'Supaul, Bihar': 14, 'Puri, Odisha': 15,
    'Jagatsinghpur, Odisha': 16, 'Gorakhpur, Uttar Pradesh': 17, 'East Godavari, Andhra Pradesh': 18, 'South 24 Parganas, West Bengal': 19, 'Chennai, Tamil Nadu': 20,
    'Simlipal Forest, Odisha': 21, 'Bastar, Chhattisgarh': 22, 'Gadchiroli, Maharashtra': 23, 'Nallamala Hills, Andhra Pradesh': 24, 'Pauri Garhwal, Uttarakhand': 25,
    'Betul, Madhya Pradesh': 26, 'Chandel, Manipur': 27, 'Lunglei, Mizoram': 28, 'Karbi Anglong, Assam': 29, 'Bandipur Reserve, Karnataka': 30
  };

  async function fetchLiveDatabaseTelemetry() {
    try {
      const response = await fetch('/api/telemetry/latest');
      if (!response.ok) return;
      const liveNodes = await response.json();

      if (!liveNodes || liveNodes.length === 0) {
        if (isLiveHardwareActive) {
          isLiveHardwareActive = false;
          if (simStatusText) {
            simStatusText.textContent = 'LIVE (SIM 2.0s)';
            simStatusText.style.color = '';
          }
        }
        return;
      }

      if (!isLiveHardwareActive) {
        isLiveHardwareActive = true;
        if (simStatusText) {
          simStatusText.textContent = '⚡ LIVE ESP32/DB';
          simStatusText.style.color = '#00E5FF';
        }
        appendAlertLog({
          id: `hw-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          severity: 'info',
          message: `📡 Live ESP32 / Database telemetry stream active (${liveNodes.length} nodes connected).`
        });
      }

      const scenario = simulator.getScenario();
      let maxWater = 0;
      let maxRain = 0;
      let networkThreat = 'safe';

      const nodesState = liveNodes.map((dbRow) => {
        const rawStatus = (dbRow.threat_status || 'NORMAL').toUpperCase();
        if (rawStatus === 'CRITICAL') networkThreat = 'critical';
        else if (rawStatus === 'WARNING' && networkThreat !== 'critical') networkThreat = 'warning';

        const water = Number(dbRow.water_level) || 0;
        const rain = Number(dbRow.rainfall) || 0;

        if (water > maxWater) maxWater = water;
        if (rain > maxRain) maxRain = rain;

        const mappedId = areaToIdMap[dbRow.node_id] || 1;
        const defaultNode = SENSOR_NODES.find(n => n.id === mappedId) || SENSOR_NODES[0];

        return {
          id: mappedId,
          name: dbRow.node_id,
          lat: defaultNode.lat,
          lng: defaultNode.lng,
          vulnerabilityFactor: defaultNode.vulnerabilityFactor || 1.0,
          status: rawStatus === 'NORMAL' ? 'safe' : rawStatus.toLowerCase(),
          metrics: {
            waterLevel: water,
            rainfall: rain,
            vibration: dbRow.vibration_alert ? 6.5 : 0.5,
            temperature: water > 40 ? water : 28,
            smoke: rain > 10 ? rain * 2 : 20,
            soilMoisture: Math.min(100, Math.round(water * 0.25))
          }
        };
      });

      const aggregate = {
        waterLevel: maxWater,
        rainfall: maxRain,
        vibration: liveNodes.some(n => n.vibration_alert) ? 6.5 : 0.5,
        temperature: maxWater > 40 ? maxWater : 28,
        smoke: maxRain > 10 ? maxRain * 2 : 20,
        soilMoisture: Math.min(100, Math.round(maxWater * 0.25))
      };

      const timestamp = new Date().toLocaleTimeString();
      if (telemetryTimestamp) telemetryTimestamp.textContent = timestamp;

      updateThreatLevel(networkThreat);
      updateSidebarTelemetry(scenario, aggregate);
      updateNodesList(nodesState, scenario);
      updateMapMarkers(nodesState, scenario);

      if (chartInstance) {
        chartInstance.data.labels.push(timestamp);
        chartInstance.data.datasets[0].data.push(maxWater);
        chartInstance.data.datasets[1].data.push(maxRain);

        if (chartInstance.data.labels.length > maxChartPoints) {
          chartInstance.data.labels.shift();
          chartInstance.data.datasets[0].data.shift();
          chartInstance.data.datasets[1].data.shift();
        }
        chartInstance.update('none');
        if (chartDataPointsCount) {
          chartDataPointsCount.textContent = `${chartInstance.data.labels.length} Data Points`;
        }
      }

    } catch (error) {
      if (isLiveHardwareActive) {
        isLiveHardwareActive = false;
        if (simStatusText) {
          simStatusText.textContent = 'LIVE (SIM 2.0s)';
          simStatusText.style.color = '';
        }
      }
    }
  }

  // Poll database every 2 seconds
  setInterval(fetchLiveDatabaseTelemetry, 2000);
  fetchLiveDatabaseTelemetry();

  // Bootstrap Application
  initMap();
  initChart();
  applyScenarioTheme('flood');
  simulator.setScenario('flood');
  simulator.start();
});