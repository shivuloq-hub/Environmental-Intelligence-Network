/**
 * Gemini AI Integration Module for Edge AI Multi-Hazard Environmental Intelligence Network
 * Powered by Google Gemini 3.8 Flash
 */

const GeminiService = (() => {
  const apiKey = process.env.GEMINI_API_KEY;
  const STORAGE_KEY = 'gemini_api_key_sih';
  const MODELS = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-flash-latest'];

  function getApiKey() {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_API_KEY;
  }

  function setApiKey(key) {
    if (key && key.trim()) {
      localStorage.setItem(STORAGE_KEY, key.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  async function callGemini(prompt, systemInstruction = '') {
    const key = getApiKey();
    if (!key) {
      throw new Error('No Gemini API Key configured.');
    }

    let lastError = null;

    for (const model of MODELS) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;

        const payload = {
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }]
            }
          ]
        };

        if (systemInstruction) {
          payload.systemInstruction = {
            parts: [{ text: systemInstruction }]
          };
        }

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const errMsg = errData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
          lastError = new Error(errMsg);
          console.warn(`Gemini model ${model} failed:`, errMsg);
          continue;
        }

        const data = await response.json();
        const candidate = data.candidates?.[0];
        if (candidate?.content?.parts?.[0]?.text) {
          return {
            success: true,
            text: candidate.content.parts[0].text,
            modelUsed: model,
            usage: data.usageMetadata
          };
        } else {
          throw new Error('Empty response received from Gemini model.');
        }
      } catch (err) {
        lastError = err;
        console.warn(`Error trying ${model}:`, err.message);
      }
    }

    throw lastError || new Error('All Gemini models failed.');
  }

  async function testConnection(customKey = null) {
    const keyToTest = customKey || getApiKey();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${encodeURIComponent(keyToTest)}`;

    const payload = {
      contents: [{ role: 'user', parts: [{ text: 'Respond with: "GEMINI_ONLINE"' }] }]
    };

    const startTime = performance.now();
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const latency = Math.round(performance.now() - startTime);

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Status ${response.status}`);
    }

    return { ok: true, latency };
  }

  async function analyzeTelemetry(scenario, aggregate, nodesState, threatLevel) {
    const criticalNodes = nodesState.filter(n => n.status === 'critical').map(n => n.name);
    const warningNodes = nodesState.filter(n => n.status === 'warning').map(n => n.name);

    const sensorBreakdown = scenario.sensors.map(s => `${s.label}: ${aggregate[s.key] || '--'} ${s.unit}`).join(', ');

    const prompt = `You are the Lead Edge-AI Disaster Risk Analyst for the Environmental Intelligence Network.
Analyze the following real-time environmental telemetry data and provide a tactical emergency assessment:

- Active Disaster Model: ${scenario.name}
- Network Threat Level: ${threatLevel.toUpperCase()}
- Current Aggregate Peak Readings: ${sensorBreakdown}
- Critical Nodes Breach: ${criticalNodes.length > 0 ? criticalNodes.join(', ') : 'None'}
- Warning Nodes: ${warningNodes.length > 0 ? warningNodes.join(', ') : 'None'}
- Total Distributed Sensor Nodes: ${nodesState.length} National Hotspots across India

Format your response concisely with markdown:
1. 🚨 **Tactical Risk Level & Imminence Summary** (1-2 sentences)
2. 📍 **High-Risk Zones & Epicenter Assessment** (Identified vulnerable sectors)
3. 🛡️ **Immediate Operator & First-Responder Directives** (3 high-priority bullet points)
4. ⏱️ **Predictive Trajectory (Next 15-30 mins)** (Projected breach probability and water/fire/landslide progression)

Keep the tone authoritative, clear, and action-oriented for municipal emergency commanders.`;

    const systemInstruction = "You are an automated Edge-AI Disaster Intelligence Decision Support System integrated with sensor mesh telemetry.";
    return await callGemini(prompt, systemInstruction);
  }

  async function generateEvacuationBroadcast(scenario, aggregate, epicenterNode) {
    const sensorDetails = scenario.sensors.map(s => `${s.label}: ${aggregate[s.key] || '--'} ${s.unit}`).join(', ');

    const prompt = `Generate a high-priority public emergency broadcast alert and SMS message for immediate mass dissemination.
Scenario: ${scenario.name}
Epicenter: ${epicenterNode ? epicenterNode.name : 'Vulnerable National Sector'}
Current Peak Sensor Readings: ${sensorDetails}

Generate 2 formats:
1. **CELL-BROADCAST / SMS ALERT (Under 160 chars)**: High-urgency, clear instructions, no panic.
2. **SIREN & PUBLIC ADDRESS SPOKEN SCRIPT (3 sentences)**: For loudspeaker broadcast across affected zones with designated high-ground / safe assembly directives.`;

    const systemInstruction = "You are an emergency public alert broadcast system generator.";
    return await callGemini(prompt, systemInstruction);
  }

  async function askCopilot(question, context = {}) {
    const { scenario, aggregate, threatLevel, nodesState } = context;
    const totalCount = nodesState ? nodesState.length : 30;
    const criticalCount = nodesState ? nodesState.filter(n => n.status === 'critical').length : 0;
    const warningCount = nodesState ? nodesState.filter(n => n.status === 'warning').length : 0;

    const sensorInfo = scenario ? scenario.sensors.map(s => `${s.label}: ${aggregate?.[s.key] || '--'} ${s.unit}`).join(', ') : 'N/A';

    const systemInstruction = `You are the Gemini Disaster Copilot for the Environmental Intelligence Network dashboard.
Current Live Context:
- Scenario: ${scenario?.name || 'Monitoring'}
- Status: ${threatLevel?.toUpperCase() || 'SAFE'}
- Peak Telemetry: ${sensorInfo}
- Critical Nodes: ${criticalCount}/${totalCount}, Warning Nodes: ${warningCount}/${totalCount}

Answer the operator's query accurately, professionally, concisely, and with actionable emergency protocol knowledge.`;

    return await callGemini(question, systemInstruction);
  }

  return {
    getApiKey,
    setApiKey,
    callGemini,
    testConnection,
    analyzeTelemetry,
    generateEvacuationBroadcast,
    askCopilot
  };
})();

if (typeof window !== 'undefined') {
  window.GeminiService = GeminiService;
}
