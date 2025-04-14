import { ExampleConfig } from '../types/Example';
import { Tool } from '../services/interpreter';

// Tool implementations for weather example
export const tools: Tool[] = [
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
    handler: async (args) => {
      const { city } = args;
      
      // Mock weather data
      const weatherData: Record<string, any> = {
        'Beijing': {
          temperature: 25,
          condition: 'Sunny',
          humidity: 40,
          windSpeed: 12
        },
        'Shanghai': {
          temperature: 28,
          condition: 'Cloudy',
          humidity: 65,
          windSpeed: 8
        },
        'Guangzhou': {
          temperature: 32,
          condition: 'Light Rain',
          humidity: 80,
          windSpeed: 5
        },
        'Shenzhen': {
          temperature: 30,
          condition: 'Showers',
          humidity: 75,
          windSpeed: 10
        },
        'Hangzhou': {
          temperature: 26,
          condition: 'Cloudy',
          humidity: 60,
          windSpeed: 7
        }
      };
      
      // Default to Beijing weather if city not found
      return weatherData[city] || weatherData['Beijing'];
    }
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
    handler: async (args) => {
      const { city, days } = args;
      
      // Limit the range of days
      const forecastDays = Math.min(Math.max(1, days), 7);
      
      // Mock forecast data
      const conditions = ['Sunny', 'Cloudy', 'Overcast', 'Light Rain', 'Moderate Rain', 'Heavy Rain', 'Thunderstorms'];
      const forecast = [];
      
      // Generate consistent random data based on city input
      const cityHash = Array.from(city).reduce((acc, char) => acc + char.charCodeAt(0), 0);
      
      for (let i = 0; i < forecastDays; i++) {
        const dayOffset = i + 1;
        const dateObj = new Date();
        dateObj.setDate(dateObj.getDate() + dayOffset);
        
        // Calculate a pseudo-random value based on city name and date
        const daySeed = cityHash + dateObj.getDate() + dateObj.getMonth();
        
        forecast.push({
          date: dateObj.toISOString().split('T')[0],
          temperature: 20 + (daySeed % 20), // 20-39 degrees
          condition: conditions[daySeed % conditions.length],
          humidity: 40 + (daySeed % 50), // 40-89%
          windSpeed: 5 + (daySeed % 15) // 5-19 km/h
        });
      }
      
      return forecast;
    }
  },
  {
    name: 'getAirQuality',
    description: 'Get air quality index',
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
    handler: async (args) => {
      const { city } = args;
      
      // Mock air quality data
      const aqiData: Record<string, any> = {
        'Beijing': { aqi: 120, quality: 'Moderately Polluted', pm25: 75, pm10: 120 },
        'Shanghai': { aqi: 65, quality: 'Good', pm25: 38, pm10: 60 },
        'Guangzhou': { aqi: 50, quality: 'Excellent', pm25: 25, pm10: 45 },
        'Shenzhen': { aqi: 45, quality: 'Excellent', pm25: 20, pm10: 40 },
        'Hangzhou': { aqi: 80, quality: 'Good', pm25: 45, pm10: 75 }
      };
      
      // Default to Beijing air quality if city not found
      return aqiData[city] || aqiData['Beijing'];
    }
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
    handler: async (args) => {
      const { temperature, condition } = args;
      
      let clothing = '';
      
      // Recommendations based on temperature
      if (temperature >= 30) {
        clothing = 'T-shirt, shorts, sun protection';
      } else if (temperature >= 20) {
        clothing = 'T-shirt, pants or skirt';
      } else if (temperature >= 15) {
        clothing = 'Long-sleeve shirt, pants';
      } else if (temperature >= 10) {
        clothing = 'Light jacket, long-sleeve shirt, pants';
      } else if (temperature >= 5) {
        clothing = 'Heavy jacket, sweater, pants';
      } else {
        clothing = 'Winter coat, thermal layers, warm pants';
      }
      
      // Additional recommendations based on weather condition
      if (condition.includes('Rain')) {
        clothing += ', umbrella or raincoat';
      }
      
      if (condition.includes('Snow')) {
        clothing += ', warm boots, gloves, scarf';
      }
      
      if (condition === 'Sunny' && temperature >= 28) {
        clothing += ', sun hat, sunscreen, sunglasses';
      }
      
      return {
        recommendation: clothing,
        temperature: temperature,
        condition: condition
      };
    }
  }
];

// Weather example configuration
const weatherExample: ExampleConfig = {
  id: 'weather',
  name: 'Weather Assistant',
  description: 'Create a smart weather assistant that provides weather info and clothing advice',
  category: 'Daily Applications',
  script: `// Smart Weather Assistant
// User's location
LET city = "Beijing"

// Get current weather
LET weather = CALL getWeather(city=city)
LET temperature = weather.temperature
LET condition = weather.condition
LET humidity = weather.humidity

// Get clothing advice
LET clothingAdvice = CALL getClothingRecommendation(
  temperature=temperature,
  condition=condition
)

// Get air quality
LET airQuality = CALL getAirQuality(city=city)

// Get 3-day forecast
LET forecast = CALL getForecast(city=city, days=3)

// Generate weather report
LET report = "Today's weather in " + city + ": " + temperature + "°C, " + condition
LET report = report + "\\nHumidity: " + humidity + "%"
LET report = report + "\\nAir Quality: " + airQuality.quality + " (AQI: " + airQuality.aqi + ")"
LET report = report + "\\nClothing Recommendation: " + clothingAdvice.recommendation

// Output results
LET report = report + "\\n\\nForecast for upcoming days:"
`,
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
      returnType: 'array'
    },
    {
      name: 'getAirQuality',
      description: 'Get air quality index',
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
  aiPrompt: 'Please create a NuwaScript script that gets weather information for a specified city and provides clothing recommendations.'
};

export default weatherExample;