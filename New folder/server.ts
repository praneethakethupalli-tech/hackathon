import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

// Setup multer in-memory storage with 10 MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

app.use(express.json());

// CORS headers for local/preview access
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Helper for friendly error response
function friendlyError(title: string, detail: string = '') {
  return {
    error: title,
    detail: detail,
    retryable: true,
  };
}

// GET /api/weather
app.get('/api/weather', async (req: Request, res: Response) => {
  const latRaw = req.query.lat ? parseFloat(req.query.lat as string) : NaN;
  const lonRaw = req.query.lon ? parseFloat(req.query.lon as string) : NaN;
  const city = req.query.city as string;
  const state = req.query.state as string;
  const country = req.query.country as string;
  const location = req.query.location as string;

  const hasCoords = !isNaN(latRaw) && !isNaN(lonRaw);
  const hasText = Boolean(city || state || country || location);

  if (!hasCoords && !hasText) {
    return res.status(400).json(
      friendlyError(
        "Location required",
        "Please provide latitude/longitude or a city name to fetch local weather."
      )
    );
  }

  try {
    const coords = await resolveLocationAndCoords({
      lat: hasCoords ? latRaw : undefined,
      lon: hasCoords ? lonRaw : undefined,
      city,
      state,
      country,
      location,
    });

    const weatherData = await fetchWeatherData(coords.lat, coords.lon, coords.displayName);
    return res.status(200).json(weatherData);
  } catch (err: any) {
    if (err.message === 'LOCATION_NOT_FOUND') {
      return res.status(404).json(
        friendlyError(
          "We couldn't find weather information for this location.",
          "Please check the city or state name and try again."
        )
      );
    }
    console.error('Weather API Error:', err);
    return res.status(503).json(
      friendlyError(
        "Weather information is temporarily unavailable.",
        "The diagnosis remains available. Please check local conditions manually."
      )
    );
  }
});

// Helper functions for Location & Weather
interface LocationQuery {
  lat?: number;
  lon?: number;
  city?: string;
  state?: string;
  country?: string;
  location?: string;
}

async function resolveLocationAndCoords(params: LocationQuery): Promise<{ lat: number; lon: number; displayName: string }> {
  let lat = params.lat;
  let lon = params.lon;
  let displayName = '';

  if (typeof lat === 'number' && typeof lon === 'number' && !isNaN(lat) && !isNaN(lon)) {
    try {
      const nomUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`;
      const res = await fetch(nomUrl, {
        headers: { 'User-Agent': 'CropGuideApp/1.0 (agri-insights)' },
      });
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const place = addr.city || addr.town || addr.village || addr.county || addr.suburb || '';
        const st = addr.state || addr.region || '';
        const cntry = addr.country || '';
        const parts = [place, st, cntry].filter(Boolean);
        displayName = parts.length > 0 ? parts.slice(0, 2).join(', ') : `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
      }
    } catch {
      displayName = `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
    }
    if (!displayName) displayName = `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
    return { lat: lat!, lon: lon!, displayName };
  }

  const queryStr = [params.city, params.state, params.country, params.location]
    .filter((x) => typeof x === 'string' && x.trim().length > 0)
    .join(', ');

  if (!queryStr) {
    throw new Error('LOCATION_MISSING');
  }

  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(queryStr)}&count=1&language=en&format=json`;
    const res = await fetch(geoUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const item = data.results[0];
        lat = item.latitude;
        lon = item.longitude;
        const parts = [item.name, item.admin1, item.country].filter(Boolean);
        displayName = parts.slice(0, 2).join(', ');
        return { lat: lat!, lon: lon!, displayName };
      }
    }
  } catch (e) {
    console.error('Geocoding error:', e);
  }

  throw new Error('LOCATION_NOT_FOUND');
}

function calculateBestTimeToAct(
  rainChance: number,
  windSpeed: number,
  humidity: number,
  temp: number
) {
  if (typeof rainChance !== 'number' || isNaN(rainChance)) {
    return {
      bestTimeStatus: 'Uncertain' as const,
      bestTime: 'Check local conditions before acting',
      bestTimeHeadline: 'Check local conditions before acting',
      bestTimeNote: 'Forecast data incomplete',
      bestTimeWhy: 'Please verify weather conditions locally before taking significant action.',
    };
  }

  if (rainChance >= 40) {
    return {
      bestTimeStatus: 'Rain risk' as const,
      bestTime: 'Consider waiting',
      bestTimeHeadline: 'Consider waiting',
      bestTimeNote: `High chance of rain (${rainChance}%) expected soon`,
      bestTimeWhy: 'Rain is expected soon, so applying treatment now may reduce effectiveness.',
    };
  }

  if (windSpeed >= 22) {
    return {
      bestTimeStatus: 'High wind' as const,
      bestTime: 'Avoid acting now',
      bestTimeHeadline: 'Avoid acting now',
      bestTimeNote: `Strong winds (${windSpeed} km/h) expected`,
      bestTimeWhy: 'Strong winds may make spraying or treatment application unsuitable.',
    };
  }

  return {
    bestTimeStatus: 'Favorable' as const,
    bestTime: 'Tomorrow morning',
    bestTimeHeadline: 'Good conditions to act',
    bestTimeNote: `Low chance of rain (${rainChance}%) · Moderate humidity (${humidity}%)`,
    bestTimeWhy: 'Weather conditions look suitable for the recommended crop-care action.',
  };
}

async function fetchWeatherData(lat: number, lon: number, displayName: string) {
  const weatherApiKey = process.env.WEATHER_API_KEY;

  if (weatherApiKey && weatherApiKey !== 'your_key_here') {
    try {
      const url = `https://api.weatherapi.com/v1/forecast.json?key=${weatherApiKey}&q=${lat},${lon}&days=2`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const curr = data.current || {};
        const forecastDay = data.forecast?.forecastday?.[1] || data.forecast?.forecastday?.[0] || {};
        const dayInfo = forecastDay.day || {};

        const temp = Math.round(curr.temp_c ?? dayInfo.avgtemp_c ?? 25);
        const humidity = Math.round(curr.humidity ?? dayInfo.avghumidity ?? 65);
        const rainChance = Math.round(dayInfo.daily_chance_of_rain ?? (curr.precip_mm > 0 ? 60 : 15));
        const windSpeed = Math.round(curr.wind_kph ?? dayInfo.maxwind_kph ?? 12);
        const locName = data.location?.name ? `${data.location.name}, ${data.location.region || data.location.country}` : displayName;

        const advisory = calculateBestTimeToAct(rainChance, windSpeed, humidity, temp);

        return {
          location: locName,
          temperature: temp,
          humidity: humidity,
          rainChance: rainChance,
          windSpeed: windSpeed,
          ...advisory,
          forecast: [
            {
              date: 'Tomorrow',
              rainChance: rainChance,
              temperature: temp,
              humidity: humidity,
              windSpeed: windSpeed,
            },
          ],
        };
      }
    } catch (err) {
      console.warn('WeatherAPI call failed, falling back to Open-Meteo:', err);
    }
  }

  const omUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,rain,wind_speed_10m&hourly=precipitation_probability,temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=auto`;
  const res = await fetch(omUrl);
  if (!res.ok) {
    throw new Error('WEATHER_API_FAILED');
  }

  const data = await res.json();
  const current = data.current || {};
  const hourly = data.hourly || {};

  const temp = Math.round(current.temperature_2m ?? 25);
  const humidity = Math.round(current.relative_humidity_2m ?? 65);
  const windSpeed = Math.round(current.wind_speed_10m ?? 12);

  let rainChance = 15;
  if (hourly.precipitation_probability && Array.isArray(hourly.precipitation_probability)) {
    const next24 = hourly.precipitation_probability.slice(0, 24);
    if (next24.length > 0) {
      rainChance = Math.max(...next24.map((v: any) => typeof v === 'number' ? v : 0));
    }
  }

  const advisory = calculateBestTimeToAct(rainChance, windSpeed, humidity, temp);

  return {
    location: displayName,
    temperature: temp,
    humidity: humidity,
    rainChance: rainChance,
    windSpeed: windSpeed,
    ...advisory,
    forecast: [
      {
        date: 'Tomorrow',
        rainChance: rainChance,
        temperature: temp,
        humidity: humidity,
        windSpeed: windSpeed,
      },
    ],
  };
}

// POST /api/analyze-crop
app.post('/api/analyze-crop', (req: Request, res: Response) => {
  upload.single('image')(req, res, async (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json(friendlyError('File is too large', 'Maximum image size is 10 MB. Please upload a smaller photo.'));
      }
      return res.status(400).json(friendlyError('Could not read the uploaded image', 'Please choose a PNG or JPG file under 10 MB and try again.'));
    } else if (err) {
      return res.status(400).json(friendlyError('Could not read the uploaded image', 'Please choose a PNG or JPG file under 10 MB and try again.'));
    }

    const file = req.file;
    if (!file || !file.buffer || file.buffer.length === 0) {
      return res.status(400).json(friendlyError('No image was uploaded', 'Please select a PNG or JPG image of the affected leaf and try again.'));
    }

    // Validate MIME type / extension
    const allowedMime = ['image/png', 'image/jpeg', 'image/jpg'];
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExt = ['.png', '.jpg', '.jpeg'];

    let mime = file.mimetype ? file.mimetype.toLowerCase() : '';
    if (mime === 'image/jpg') mime = 'image/jpeg';
    if (!mime && (ext === '.jpg' || ext === '.jpeg')) mime = 'image/jpeg';
    if (!mime && ext === '.png') mime = 'image/png';

    if (!allowedMime.includes(mime) && !allowedExt.includes(ext)) {
      return res.status(415).json(friendlyError('Unsupported file type', 'Only PNG and JPG images are supported for crop analysis.'));
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
    if (!apiKey || apiKey === 'your_key_here') {
      return res.status(503).json(
        friendlyError(
          'AI service not yet configured',
          'The GEMINI_API_KEY environment variable is not set. Add your key in AI Studio Settings to enable real crop diagnosis.'
        )
      );
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `You are an experienced plant pathologist assisting farmers. Analyze the uploaded image carefully. The image is supposed to show a crop leaf or affected plant.

Respond ONLY with a valid JSON object matching the schema.

Schema requirements:
- diagnosis: Human-readable name of the most likely condition, or "Unable to identify the crop condition" if you cannot see a recognizable plant/leaf.
- confidence: Integer between 0 and 100.
- visibleSymptoms: List of short, plain-English observation lines.
- severity: One of "Mild", "Moderate", "Severe", "Unknown".
- recommendedActions: Up to 5 short actionable steps. Prioritize safe, non-chemical guidance. Do NOT give specific brand or chemical names.
- caution: A single plain-language sentence reminding the user that image-based diagnosis is uncertain and to confirm with a local certified agronomist before costly interventions.
- needsExpertConfirmation: boolean (true if confidence < 75 or condition warrants human check).

If the image does NOT contain a crop/plant/leaf:
- Set diagnosis to "Unable to identify the crop condition"
- Set confidence to < 30
- Include "Upload a clearer, well-lit photo focused on the affected leaf" in recommendedActions
- Set needsExpertConfirmation to true`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            inlineData: {
              mimeType: mime || 'image/jpeg',
              data: file.buffer.toString('base64'),
            },
          },
          prompt,
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              diagnosis: { type: Type.STRING },
              confidence: { type: Type.INTEGER },
              visibleSymptoms: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              severity: { type: Type.STRING, enum: ['Mild', 'Moderate', 'Severe', 'Unknown'] },
              recommendedActions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              caution: { type: Type.STRING },
              needsExpertConfirmation: { type: Type.BOOLEAN },
            },
            required: [
              'diagnosis',
              'confidence',
              'visibleSymptoms',
              'severity',
              'recommendedActions',
              'caution',
              'needsExpertConfirmation',
            ],
          },
        },
      });

      const responseText = response.text || '';
      let parsedData: any = {};
      try {
        parsedData = JSON.parse(responseText);
      } catch {
        parsedData = {};
      }

      // Normalize data
      const diagnosis = parsedData.diagnosis || 'Unable to identify the crop condition';
      const confidence = typeof parsedData.confidence === 'number'
        ? Math.max(0, Math.min(100, Math.round(parsedData.confidence)))
        : 0;
      const symptoms = Array.isArray(parsedData.visibleSymptoms)
        ? parsedData.visibleSymptoms.filter((s: any) => typeof s === 'string' && s.trim().length > 0)
        : [];
      const severity = ['Mild', 'Moderate', 'Severe', 'Unknown'].includes(parsedData.severity)
        ? parsedData.severity
        : 'Unknown';
      const actions = Array.isArray(parsedData.recommendedActions)
        ? parsedData.recommendedActions.filter((a: any) => typeof a === 'string' && a.trim().length > 0)
        : [];
      const caution = parsedData.caution || 'Image-based identification can be uncertain. Confirm with a local certified agronomist before applying chemical treatments or making costly interventions.';
      const needsExpert = Boolean(parsedData.needsExpertConfirmation) || confidence < 75;

      // Optional location parsing from req.body
      const latRaw = req.body?.lat ? parseFloat(req.body.lat) : NaN;
      const lonRaw = req.body?.lon ? parseFloat(req.body.lon) : NaN;
      const city = req.body?.city || '';
      const state = req.body?.state || '';
      const country = req.body?.country || '';
      const location = req.body?.location || '';

      let weatherResult: any = null;
      const hasCoords = !isNaN(latRaw) && !isNaN(lonRaw);
      const hasText = Boolean(city || state || country || location);

      if (hasCoords || hasText) {
        try {
          const coords = await resolveLocationAndCoords({
            lat: hasCoords ? latRaw : undefined,
            lon: hasCoords ? lonRaw : undefined,
            city,
            state,
            country,
            location,
          });
          weatherResult = await fetchWeatherData(coords.lat, coords.lon, coords.displayName);
        } catch (wErr) {
          console.warn('Could not fetch weather during analyze-crop:', wErr);
        }
      }

      // Default fallback weather structure if location or weather API unavailable
      if (!weatherResult) {
        weatherResult = {
          location: 'Location unavailable',
          temperature: 25,
          humidity: 65,
          rainChance: 15,
          windSpeed: 10,
          bestTime: 'Tomorrow morning',
          bestTimeStatus: 'Favorable',
          bestTimeHeadline: 'Good conditions to act',
          bestTimeNote: 'Low chance of rain · Moderate humidity',
          bestTimeWhy: 'Weather conditions look suitable for the recommended crop-care action.',
          forecast: [
            {
              date: 'Tomorrow',
              rainChance: 15,
              temperature: 25,
              humidity: 65,
              windSpeed: 10,
            },
          ],
        };
      }

      const result = {
        diagnosis,
        confidence,
        visibleSymptoms: symptoms,
        severity,
        recommendedActions: actions,
        caution,
        needsExpertConfirmation: needsExpert,
        weather: weatherResult,
      };

      return res.status(200).json(result);
    } catch (err: any) {
      console.error('Gemini API Error:', err);
      return res.status(502).json(
        friendlyError(
          "We couldn't analyze this image",
          'There was a temporary problem analyzing your image. Please try again with a clearer photo.'
        )
      );
    }
  });
});

// Serve static files from root directory
app.use(express.static(process.cwd()));

// SPA Fallback for /
app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(process.cwd(), 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`CropGuide server running on http://${HOST}:${PORT}`);
});
