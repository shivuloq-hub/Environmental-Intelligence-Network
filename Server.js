require('dotenv').config();
require('dotenv').config({ path: 'gemini.env' });
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// Serve static frontend assets directly from project directory
app.use(express.static(__dirname));

// In-memory fallback cache for telemetry
let memoryTelemetry = [];

let pool = null;
if (process.env.DATABASE_URL) {
    try {
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });

        // Initialize table if it does not exist
        pool.query(`
            CREATE TABLE IF NOT EXISTS sensor_telemetry (
                id SERIAL PRIMARY KEY,
                node_id VARCHAR(100),
                water_level NUMERIC,
                rainfall NUMERIC,
                vibration_alert BOOLEAN,
                flame_detected BOOLEAN,
                threat_status VARCHAR(50),
                recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `).then(() => {
            console.log('PostgreSQL database connected and sensor_telemetry table verified.');
        }).catch(err => {
            console.warn('PostgreSQL table init warning (using in-memory cache as fallback):', err.message);
        });
    } catch (err) {
        console.warn('Could not initialize PostgreSQL pool, falling back to in-memory store:', err.message);
    }
} else {
    console.log('DATABASE_URL not set in .env. Running with in-memory telemetry buffer.');
}

// Helper: Call Gemini API from backend
async function callGeminiBackend(prompt) {
    const apiKey = process.env.FAST2SMS_API_KEY;
    const models = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-flash-latest'];

    for (const model of models) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
            const payload = {
                contents: [{ role: 'user', parts: [{ text: prompt }] }]
            };
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                const data = await response.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) return text;
            }
        } catch (e) {
            console.warn(`Gemini model ${model} error:`, e.message);
        }
    }
    return null;
}

// ESP32 / Hardware posts telemetry here
app.post('/api/telemetry', async (req, res) => {
    const { node_id, water_level, rainfall, vibration_alert, flame_detected, threat_status } = req.body;
    const record = {
        node_id: node_id || 'Node_01',
        water_level: Number(water_level) || 0,
        rainfall: Number(rainfall) || 0,
        vibration_alert: Boolean(vibration_alert),
        flame_detected: Boolean(flame_detected),
        threat_status: (threat_status || 'NORMAL').toUpperCase(),
        recorded_at: new Date().toISOString()
    };

    // Always update in-memory cache
    const existingIdx = memoryTelemetry.findIndex(r => r.node_id === record.node_id);
    if (existingIdx >= 0) {
        memoryTelemetry[existingIdx] = record;
    } else {
        memoryTelemetry.push(record);
    }

    if (pool) {
        try {
            const query = `
                INSERT INTO sensor_telemetry (node_id, water_level, rainfall, vibration_alert, flame_detected, threat_status)
                VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;
            `;
            const result = await pool.query(query, [
                record.node_id,
                record.water_level,
                record.rainfall,
                record.vibration_alert,
                record.flame_detected,
                record.threat_status
            ]);
            return res.status(201).json(result.rows[0]);
        } catch (err) {
            console.error('Database write error, returning cached record:', err.message);
            return res.status(201).json(record);
        }
    }

    res.status(201).json(record);
});

// Dashboard reads live data here
app.get('/api/telemetry/latest', async (req, res) => {
    if (pool) {
        try {
            const result = await pool.query(`
                SELECT DISTINCT ON (node_id) *
                FROM sensor_telemetry
                ORDER BY node_id, recorded_at DESC;
            `);
            if (result.rows && result.rows.length > 0) {
                return res.json(result.rows);
            }
        } catch (err) {
            console.error('Database read error, falling back to memory store:', err.message);
        }
    }

    // Return in-memory cached telemetry
    res.json(memoryTelemetry);
});

// 30 National Disaster Hotspots Coordinate Lookup for Real-time Satellite Weather
const realNodes = [
    // ⛰️ 10 CRITICAL LANDSLIDE HOTSPOTS (Tracks: Vibration & Rainfall)
    { id: 1, name: 'Rudraprayag, Uttarakhand', lat: 30.2844, lng: 78.9811, hazard: 'landslide' },
    { id: 2, name: 'Tehri Garhwal, Uttarakhand', lat: 30.3833, lng: 78.6167, hazard: 'landslide' },
    { id: 3, name: 'Chamoli, Uttarakhand', lat: 30.2738, lng: 79.3258, hazard: 'landslide' },
    { id: 4, name: 'Wayanad, Kerala', lat: 11.6854, lng: 76.1320, hazard: 'landslide' },
    { id: 5, name: 'Idukki, Kerala', lat: 9.8500, lng: 76.9667, hazard: 'landslide' },
    { id: 6, name: 'Darjeeling, West Bengal', lat: 27.0410, lng: 88.2663, hazard: 'landslide' },
    { id: 7, name: 'South Sikkim, Sikkim', lat: 27.1667, lng: 88.3500, hazard: 'landslide' },
    { id: 8, name: 'Nilgiris, Tamil Nadu', lat: 11.4064, lng: 76.6932, hazard: 'landslide' },
    { id: 9, name: 'Rajouri, Jammu & Kashmir', lat: 33.3810, lng: 74.3015, hazard: 'landslide' },
    { id: 10, name: 'Shimla, Himachal Pradesh', lat: 31.1048, lng: 77.1734, hazard: 'landslide' },

    // 🌊 10 CRITICAL FLOOD HOTSPOTS (Tracks: Water Level & Rainfall)
    { id: 11, name: 'Dhemaji, Assam', lat: 27.4833, lng: 94.5833, hazard: 'flood' },
    { id: 12, name: 'Lakhimpur, Assam', lat: 27.2333, lng: 94.1000, hazard: 'flood' },
    { id: 13, name: 'Supaul, Bihar', lat: 26.1167, lng: 86.6000, hazard: 'flood' },
    { id: 14, name: 'Sitamarhi, Bihar', lat: 26.6000, lng: 85.4833, hazard: 'flood' },
    { id: 15, name: 'Gorakhpur, Uttar Pradesh', lat: 26.7606, lng: 83.3732, hazard: 'flood' },
    { id: 16, name: 'South 24 Parganas, West Bengal', lat: 22.1466, lng: 88.4066, hazard: 'flood' },
    { id: 17, name: 'Puri, Odisha', lat: 19.8133, lng: 85.8314, hazard: 'flood' },
    { id: 18, name: 'Jagatsinghpur, Odisha', lat: 20.2700, lng: 86.1600, hazard: 'flood' },
    { id: 19, name: 'East Godavari, Andhra Pradesh', lat: 17.0005, lng: 81.8040, hazard: 'flood' },
    { id: 20, name: 'Chennai, Tamil Nadu', lat: 13.0827, lng: 80.2707, hazard: 'flood' },

    // 🔥 10 CRITICAL FOREST FIRE HOTSPOTS (Tracks: Temperature & Flame/Smoke)
    { id: 21, name: 'Simlipal Forest, Odisha', lat: 21.9056, lng: 86.2625, hazard: 'forest_fire' },
    { id: 22, name: 'Bastar, Chhattisgarh', lat: 19.2078, lng: 81.9327, hazard: 'forest_fire' },
    { id: 23, name: 'Gadchiroli, Maharashtra', lat: 20.1802, lng: 80.0028, hazard: 'forest_fire' },
    { id: 24, name: 'Nallamala Hills, Andhra Pradesh', lat: 16.0333, lng: 78.8667, hazard: 'forest_fire' },
    { id: 25, name: 'Pauri Garhwal, Uttarakhand', lat: 30.1450, lng: 78.7766, hazard: 'forest_fire' },
    { id: 26, name: 'Betul, Madhya Pradesh', lat: 21.9000, lng: 77.9000, hazard: 'forest_fire' },
    { id: 27, name: 'Bandipur Reserve, Karnataka', lat: 11.6667, lng: 76.6333, hazard: 'forest_fire' },
    { id: 28, name: 'Karbi Anglong, Assam', lat: 26.0000, lng: 93.5000, hazard: 'forest_fire' },
    { id: 29, name: 'Lunglei, Mizoram', lat: 22.8833, lng: 92.7333, hazard: 'forest_fire' },
    { id: 30, name: 'Chandel, Manipur', lat: 24.3167, lng: 94.0000, hazard: 'forest_fire' }
];
// Advanced Predictive Disaster AI: Combines Local Hardware Telemetry + Live Open-Meteo Satellite Weather + Gemini 3.8 Flash
app.get('/api/predict/:nodeId', async (req, res) => {
    const { nodeId } = req.params;

    // Resolve geographic coordinates for nodeId from realNodes
    const nodeMeta = realNodes.find(n => String(n.id) === String(nodeId) || n.name.toLowerCase().includes(String(nodeId).toLowerCase())) ||
        { lat: 20.5937, lng: 78.9629, name: `Node ${nodeId}` };

    try {
        let rows = [];
        if (pool) {
            try {
                const result = await pool.query(`
                    SELECT water_level, rainfall, vibration_alert, flame_detected, recorded_at
                    FROM sensor_telemetry 
                    WHERE node_id = $1 
                    ORDER BY recorded_at DESC 
                    LIMIT 10;
                `, [nodeId]);
                rows = result.rows || [];
            } catch (dbErr) {
                console.warn('DB query in predict fallback:', dbErr.message);
            }
        }

        // If DB rows are insufficient, check in-memory cache or fallback
        if (rows.length === 0) {
            const memoryRows = memoryTelemetry.filter(r => r.node_id === nodeId);
            if (memoryRows.length > 0) {
                rows = memoryRows;
            } else {
                rows = [
                    { water_level: 210, rainfall: 25, recorded_at: new Date().toISOString() },
                    { water_level: 235, rainfall: 30, recorded_at: new Date().toISOString() },
                    { water_level: 255, rainfall: 38, recorded_at: new Date().toISOString() }
                ];
            }
        }

        const trendData = rows.slice().reverse().map(r => `Water: ${r.water_level}cm, Rain: ${r.rainfall}mm/hr`).join(" | ");

        // Fetch Live Location Weather from Open-Meteo for node location
        let regionalWeather = "Unavailable";
        try {
            const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${nodeMeta.lat}&longitude=${nodeMeta.lng}&current=temperature_2m,precipitation,soil_moisture_0_to_7cm`;
            const weatherRes = await fetch(weatherUrl);
            if (weatherRes.ok) {
                const weatherData = await weatherRes.json();
                if (weatherData.current) {
                    regionalWeather = `Temp: ${weatherData.current.temperature_2m}°C, Soil Moisture: ${weatherData.current.soil_moisture_0_to_7cm} m³/m³, Regional Precipitation: ${weatherData.current.precipitation}mm`;
                }
            }
        } catch (weatherErr) {
            console.warn("Could not fetch live weather:", weatherErr.message);
        }

        // Inject both Local Hardware Data AND Global Location Data into Gemini
        const predictionPrompt = `
You are a predictive disaster-response AI analyzing sensor node "${nodeMeta.name}" located at Lat ${nodeMeta.lat}, Lng ${nodeMeta.lng}.
Synthesize these two real-time data streams:
1. INTERNAL HARDWARE TELEMETRY HISTORY (Last readings): ${trendData}
2. EXTERNAL SATELLITE & WEATHER TELEMETRY: ${regionalWeather}

Consider how the external soil moisture and regional precipitation will impact the internal hardware water level trend.
Output STRICTLY a JSON object with no markdown fences, no formatting backticks, and no extra text:
{
  "projected_water_15m": 275,
  "trend_direction": "RISING",
  "environmental_risk_factor": "HIGH",
  "ai_forecast_summary": "Increasing regional precipitation combined with elevated soil moisture indicates water levels will rise by 15-25cm over the next 15 minutes."
}
`;

        const geminiResponseText = await callGeminiBackend(predictionPrompt);
        if (geminiResponseText) {
            const cleaned = geminiResponseText.trim().replace(/```json/gi, '').replace(/```/g, '').trim();
            try {
                const parsed = JSON.parse(cleaned);
                return res.json(parsed);
            } catch (pErr) {
                console.warn('Could not parse Gemini JSON, falling back:', pErr.message);
            }
        }

        // Algorithmic Fallback
        const lastWater = Number(rows[0]?.water_level) || 220;
        const lastRain = Number(rows[0]?.rainfall) || 20;
        const projected = Number((lastWater + lastRain * 0.75).toFixed(1));

        res.json({
            projected_water_15m: projected,
            trend_direction: lastRain > 20 ? "RISING" : "STABLE",
            environmental_risk_factor: projected > 300 ? "HIGH" : projected > 200 ? "MEDIUM" : "LOW",
            ai_forecast_summary: `Hardware water level at ${lastWater}cm and rain rate of ${lastRain}mm/hr indicate a ${lastRain > 20 ? 'rapidly rising' : 'steady'} water curve for ${nodeMeta.name}.`
        });

    } catch (err) {
        console.error("Advanced Prediction Error:", err);
        res.status(500).json({ error: "Failed to generate context-aware prediction" });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        databaseConnected: Boolean(pool),
        cachedNodes: memoryTelemetry.length,
        timestamp: new Date().toISOString()
    });
});

// 1. Hazard Lookup Directory for the Backend
const NODE_HAZARD_DIRECTORY = {
    'Rudraprayag, Uttarakhand': 'landslide', 'Tehri Garhwal, Uttarakhand': 'landslide', 'Chamoli, Uttarakhand': 'landslide', 'Wayanad, Kerala': 'landslide', 'Idukki, Kerala': 'landslide', 'Darjeeling, West Bengal': 'landslide', 'South Sikkim, Sikkim': 'landslide', 'Nilgiris, Tamil Nadu': 'landslide', 'Rajouri, Jammu & Kashmir': 'landslide', 'Shimla, Himachal Pradesh': 'landslide',
    'Dhemaji, Assam': 'flood', 'Lakhimpur, Assam': 'flood', 'Supaul, Bihar': 'flood', 'Sitamarhi, Bihar': 'flood', 'Gorakhpur, Uttar Pradesh': 'flood', 'South 24 Parganas, West Bengal': 'flood', 'Puri, Odisha': 'flood', 'Jagatsinghpur, Odisha': 'flood', 'East Godavari, Andhra Pradesh': 'flood', 'Chennai, Tamil Nadu': 'flood',
    'Simlipal Forest, Odisha': 'forest_fire', 'Bastar, Chhattisgarh': 'forest_fire', 'Gadchiroli, Maharashtra': 'forest_fire', 'Nallamala Hills, Andhra Pradesh': 'forest_fire', 'Pauri Garhwal, Uttarakhand': 'forest_fire', 'Betul, Madhya Pradesh': 'forest_fire', 'Bandipur Reserve, Karnataka': 'forest_fire', 'Karbi Anglong, Assam': 'forest_fire', 'Lunglei, Mizoram': 'forest_fire', 'Chandel, Manipur': 'forest_fire'
};

// 2. Hardware-Specific SMS Formatter
function generateBankStyleSms(type, areaName, telemetry = {}) {
    const timeString = new Date().toLocaleString('en-IN', { hour12: false }) + ' IST';
    const refCode = 'DR-' + Math.floor(100000 + Math.random() * 900000);
    const hazardType = NODE_HAZARD_DIRECTORY[areaName] || 'flood';

    if (hazardType === 'forest_fire') {
        const temp = telemetry.temperature || 'N/A';
        const flame = telemetry.flame_detected ? 'DETECTED' : 'CLEAR';

        if (type === 'EVACUATION') return `EMERGENCY ALERT: Wildfire evacuation ordered for sector ${areaName.toUpperCase()} as of ${timeString}. Thermal anomaly: ${temp}°C. Flame front: ${flame}. Evacuate immediately. Ref: ${refCode}. Helpline: 112 - Govt of India`;
        if (type === 'WARNING') return `HAZARD ADVISORY: Wildfire risk monitored at ${areaName}. Temp: ${temp}°C. Standby for perimeter orders. Ref: ${refCode}. - State Forest Cell`;
        return `SITUATION REPORT: Fire perimeter at ${areaName} is STABLE. Temp: ${temp}°C. Ref: ${refCode}. - DrishtiEdge`;
    }

    else if (hazardType === 'landslide') {
        const vib = telemetry.vibration || 'N/A';
        const rain = telemetry.rainfall || 'N/A';

        if (type === 'EVACUATION') return `EMERGENCY ALERT: Landslide evacuation ordered for sector ${areaName.toUpperCase()} as of ${timeString}. Ground vibration: ${vib}g. Rain: ${rain}mm/hr. Move away from steep slopes. Ref: ${refCode}. Helpline: 112 - Govt of India`;
        if (type === 'WARNING') return `HAZARD ADVISORY: Landslide risk at ${areaName}. High soil saturation (Rain: ${rain}mm/hr). Avoid hill cuts. Ref: ${refCode}. - SDMA`;
        return `SITUATION REPORT: Slope telemetry at ${areaName} is STABLE. Vibration: ${vib}g. Ref: ${refCode}. - DrishtiEdge`;
    }

    else {
        // Default Flood
        const water = telemetry.water_level || 'N/A';
        const rain = telemetry.rainfall || 'N/A';

        if (type === 'EVACUATION') return `EMERGENCY ALERT: Flood evacuation ordered for sector ${areaName.toUpperCase()} as of ${timeString}. Water level: ${water}cm. Rain: ${rain}mm/hr. Move to high ground immediately. Ref: ${refCode}. Helpline: 112 - Govt of India`;
        if (type === 'WARNING') return `HAZARD ADVISORY: Elevated flood risk at ${areaName}. Water: ${water}cm, Rain: ${rain}mm/hr. Avoid low-lying areas. Ref: ${refCode}. - State Emergency Cell`;
        return `SITUATION REPORT: River telemetry at ${areaName} is STABLE. Water: ${water}cm. Ref: ${refCode}. - DrishtiEdge`;
    }
}

// 3. Real Cloud SMS Dispatcher (via Fast2SMS)
async function sendRealCarrierSms(phoneNumbers, messageText) {
    const apiKey = process.env.FAST2SMS_API_KEY || 'wlSu5vLop71OQHiqN4tBIR6JTxj8dn3P9DyhzfCWbeakFU2KgXcSOLluV0az4e1WZ3FyYfBE76MT8P';

    const rawList = Array.isArray(phoneNumbers) ? phoneNumbers : typeof phoneNumbers === 'string' ? phoneNumbers.split(',') : [];

    // Fast2SMS expects 10-digit Indian numbers without country code
    const validNumbers = rawList
        .map(n => String(n).replace(/\D/g, '').slice(-10))
        .filter(n => n.length === 10);

    if (validNumbers.length === 0) {
        return { return: false, message: "No valid 10-digit Indian mobile numbers found." };
    }

    const numbersList = validNumbers.join(',');

    try {
        const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
            method: 'POST',
            headers: {
                'authorization': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                route: 'q', // Quick SMS route
                message: messageText,
                language: 'english',
                flash: 0,
                numbers: numbersList
            })
        });

        const data = await response.json();
        if (data.return) {
            console.log(`✅ Real SMS dispatched via Telecom Network to: ${numbersList}`);
        } else {
            console.error(`❌ Telecom Delivery Failed:`, data.message);
        }
        return data;
    } catch (error) {
        console.error(`❌ Network Error:`, error.message);
        return { return: false, message: error.message };
    }
}

// 4. API Route for Fast2SMS Broadcast
app.post('/api/demo/sendsms', async (req, res) => {
    const { phoneNumbers, type, areaName, water_level, rainfall, temperature, flame_detected, vibration } = req.body;

    const rawList = Array.isArray(phoneNumbers) ? phoneNumbers : typeof phoneNumbers === 'string' ? phoneNumbers.split(',') : [];
    if (rawList.length === 0) {
        return res.status(400).json({ error: "Provide an array or comma-separated list of phone numbers." });
    }

    const targetArea = areaName || 'Rudraprayag, Uttarakhand';

    // Pass all possible hardware metrics to the formatter; it will pick the correct ones based on hazard type
    const smsText = generateBankStyleSms(type || 'EVACUATION', targetArea, { water_level, rainfall, temperature, flame_detected, vibration });

    console.log(`\n📢 DISPATCHING ${type || 'EVACUATION'} ALERT TO ${targetArea}...`);
    console.log(smsText);

    // Call Fast2SMS dispatcher
    const dispatchResult = await sendRealCarrierSms(rawList, smsText);

    res.json({
        success: Boolean(dispatchResult?.return),
        message: dispatchResult?.return ? `Dispatched to ${rawList.length} recipients.` : (dispatchResult?.message || "Delivery failed"),
        smsText,
        delivery: dispatchResult
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Environmental Intelligence Network Server running on http://localhost:${PORT}`);
});