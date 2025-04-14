import { ExampleConfig } from '../types/Example';
// Import necessary types from nuwa-script (re-exported via services)
import type { 
  ToolSchema, 
  ToolFunction, 
  NuwaValue, 
  EvaluatedToolArguments 
} from '../services/nuwaInterpreter';

// --- Tool Definitions ---

// getWeather Tool
const getWeatherSchema: ToolSchema = {
  name: 'getWeather',
  description: 'Get weather information for a specified city',
  parameters: [
    { name: 'city', type: 'string', description: 'City name', required: true }
  ],
  returns: 'object'
};

const getWeatherFunc: ToolFunction = async (args: EvaluatedToolArguments): Promise<NuwaValue> => {
  const cityArg = args['city'];
  if (cityArg && cityArg.type === 'string') {
    const city = cityArg.value as string;
    // Mock weather data
    const weatherData: Record<string, Record<string, unknown>> = {
      'Beijing': { temperature: 28, condition: 'Sunny', humidity: 40, windSpeed: 10 },
      'Shanghai': { temperature: 26, condition: 'Overcast', humidity: 65, windSpeed: 8 },
      'Tokyo': { temperature: 24, condition: 'Light Rain', humidity: 75, windSpeed: 12 },
      'New York': { temperature: 22, condition: 'Cloudy', humidity: 55, windSpeed: 15 },
      'London': { temperature: 18, condition: 'Moderate Rain', humidity: 80, windSpeed: 14 }
    };
    const result = weatherData[city] || weatherData['Beijing']; // Default to Beijing
    return { type: 'object', value: result };
  }
  return { type: 'null', value: null }; // Invalid arguments
};

// getForecast Tool
const getForecastSchema: ToolSchema = {
  name: 'getForecast',
  description: 'Get weather forecast for the next few days',
  parameters: [
    { name: 'city', type: 'string', description: 'City name', required: true },
    { name: 'days', type: 'number', description: 'Number of days to forecast (1-7)', required: true }
  ],
  returns: 'list' // Return type is a list (array)
};

const getForecastFunc: ToolFunction = async (args: EvaluatedToolArguments): Promise<NuwaValue> => {
  const cityArg = args['city'];
  const daysArg = args['days'];

  if (cityArg && cityArg.type === 'string' && daysArg && daysArg.type === 'number') {
    const days = daysArg.value as number;
    
    const forecastDays = Math.min(Math.max(1, days), 7);
    const conditions = ['Sunny', 'Cloudy', 'Overcast', 'Light Rain', 'Moderate Rain', 'Heavy Rain', 'Thunderstorms'];
    const forecast = [];
    let seed = 12345; // Use a fixed seed for consistent mock data

    for (let i = 0; i < forecastDays; i++) {
      const dayOffset = i + 1;
      const dateObj = new Date();
      dateObj.setDate(dateObj.getDate() + dayOffset);
      
      seed = (seed * 9301 + 49297) % 233280;
      const rnd = seed / 233280;
      
      forecast.push({
        date: dateObj.toISOString().split('T')[0],
        temperature: Math.floor(20 + rnd * 20), // Mock temperature
        condition: conditions[Math.floor(rnd * conditions.length)],
        humidity: Math.floor(40 + rnd * 50),
        windSpeed: Math.floor(5 + rnd * 15)
      });
    }
    
    // Return the forecast as a list
    return { type: 'list', value: forecast };
  }
  return { type: 'null', value: null }; // Invalid arguments
};

// getAirQuality Tool
const getAirQualitySchema: ToolSchema = {
  name: 'getAirQuality',
  description: 'Get air quality index',
  parameters: [
    { name: 'city', type: 'string', description: 'City name', required: true }
  ],
  returns: 'object'
};

const getAirQualityFunc: ToolFunction = async (args: EvaluatedToolArguments): Promise<NuwaValue> => {
  const cityArg = args['city'];
  if (cityArg && cityArg.type === 'string') {
    const city = cityArg.value as string;
    // Mock air quality data
    const aqiData: Record<string, Record<string, unknown>> = {
      'Beijing': { aqi: 120, quality: 'Moderately Polluted', pm25: 75, pm10: 120 },
      'Shanghai': { aqi: 65, quality: 'Good', pm25: 38, pm10: 60 },
      'Tokyo': { aqi: 50, quality: 'Excellent', pm25: 25, pm10: 45 },
      'New York': { aqi: 45, quality: 'Excellent', pm25: 20, pm10: 40 },
      'London': { aqi: 80, quality: 'Good', pm25: 45, pm10: 75 }
    };
    const result = aqiData[city] || aqiData['Beijing']; // Default to Beijing
    return { type: 'object', value: result };
  }
  return { type: 'null', value: null }; // Invalid arguments
};

// getClothingRecommendation Tool
const getClothingRecommendationSchema: ToolSchema = {
  name: 'getClothingRecommendation',
  description: 'Get clothing recommendations based on weather',
  parameters: [
    { name: 'temperature', type: 'number', description: 'Current temperature (Celsius)', required: true },
    { name: 'condition', type: 'string', description: 'Weather condition', required: true }
  ],
  returns: 'object'
};

const getClothingRecommendationFunc: ToolFunction = async (args: EvaluatedToolArguments): Promise<NuwaValue> => {
  const tempArg = args['temperature'];
  const conditionArg = args['condition'];

  if (tempArg && tempArg.type === 'number' && conditionArg && conditionArg.type === 'string') {
    const temperature = tempArg.value as number;
    const condition = conditionArg.value as string;
    
    let clothing = '';
    if (temperature >= 30) clothing = 'T-shirt, shorts, sun protection';
    else if (temperature >= 20) clothing = 'T-shirt, pants or skirt';
    else if (temperature >= 15) clothing = 'Long-sleeve shirt, pants';
    else if (temperature >= 10) clothing = 'Light jacket, long-sleeve shirt, pants';
    else if (temperature >= 5) clothing = 'Heavy jacket, sweater, pants';
    else clothing = 'Winter coat, thermal layers, warm pants';
    
    if (condition.includes('Rain')) clothing += ', umbrella or raincoat';
    if (condition.includes('Snow')) clothing += ', warm boots, gloves, scarf';
    if (condition === 'Sunny' && temperature >= 28) clothing += ', sun hat, sunscreen, sunglasses';
    
    const result = {
      recommendation: clothing,
      temperature: temperature,
      condition: condition
    };
    return { type: 'object', value: result };
  }
  return { type: 'null', value: null }; // Invalid arguments
};

// Export tools in the required structure
export const weatherTools: { schema: ToolSchema, execute: ToolFunction }[] = [
  { schema: getWeatherSchema, execute: getWeatherFunc },
  { schema: getForecastSchema, execute: getForecastFunc },
  { schema: getAirQualitySchema, execute: getAirQualityFunc },
  { schema: getClothingRecommendationSchema, execute: getClothingRecommendationFunc }
];


// --- Weather Example Configuration (Keep for now) ---
const weatherExample: ExampleConfig = {
  id: 'weather',
  name: 'Weather Assistant',
  description: 'Create a smart weather assistant that provides weather info and clothing advice',
  category: 'Daily Applications',
  script: `// Smart Weather Assistant

// User's location
LET city = "Beijing"

// Get current weather using tool call expression
LET weather = getWeather {city: city}
LET temperature = weather.temperature // Access object property
LET condition = weather.condition
LET humidity = weather.humidity
PRINT("Current weather fetched.")

// Get clothing advice
LET clothingAdvice = getClothingRecommendation {
  temperature: temperature,
  condition: condition
}
PRINT("Clothing advice generated.")

// Get air quality
LET airQuality = getAirQuality {city: city}
PRINT("Air quality fetched.")

// Get 3-day forecast
LET forecast = getForecast {city: city, days: 3}
PRINT("Forecast fetched (list).")

// Generate weather report string
LET report = "Today's weather in " + city + ": " + temperature + "°C, " + condition
LET report = report + "\nHumidity: " + humidity + "%"
LET report = report + "\nAir Quality: " + airQuality.quality + " (AQI: " + airQuality.aqi + ")"
LET report = report + "\nClothing Recommendation: " + clothingAdvice.recommendation

// Output the main report
PRINT("--- Weather Report for " + city + " ---")
PRINT(report)

// Output forecast (Loop through forecast list)
PRINT("\n--- 3-Day Forecast ---")
FOR dayForecast IN forecast DO
  LET forecastText = dayForecast.date + ": " + dayForecast.temperature + "°C, " + dayForecast.condition + ", Humidity: " + dayForecast.humidity + "%"
  PRINT(forecastText)
END
`,
  // Keep the old tools structure for ExampleConfig compatibility if UI needs it
  tools: [
    {
      name: 'getWeather',
      description: 'Get weather information for a specified city',
      parameters: {
        type: 'object',
        properties: {
          city: {
            type: 'string',
            description: 'City name'
          }
        },
        required: ['city']
      },
      returnType: 'object'
    },
    {
      name: 'getForecast',
      description: 'Get weather forecast for the next few days',
      parameters: {
        type: 'object',
        properties: {
          city: {
            type: 'string',
            description: 'City name'
          },
          days: {
            type: 'number',
            description: 'Number of days to forecast (1-7)'
          }
        },
        required: ['city', 'days']
      },
      returnType: 'list' // Changed from array to list
    },
    {
      name: 'getAirQuality',
      description: 'Get air quality index for a specified city',
      parameters: {
        type: 'object',
        properties: {
          city: {
            type: 'string',
            description: 'City name'
          }
        },
        required: ['city']
      },
      returnType: 'object'
    },
    {
      name: 'getClothingRecommendation',
      description: 'Get clothing recommendations based on weather',
      parameters: {
        type: 'object',
        properties: {
          temperature: {
            type: 'number',
            description: 'Current temperature (Celsius)'
          },
          condition: {
            type: 'string',
            description: 'Weather condition'
          }
        },
        required: ['temperature', 'condition']
      },
      returnType: 'object'
    }
  ],
  aiPrompt: 'Generate a weather report for Beijing, including current conditions, air quality, clothing advice, and a 3-day forecast.'
};

export default weatherExample;