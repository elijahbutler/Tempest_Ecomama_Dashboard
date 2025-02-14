import { NextResponse } from 'next/server';
import axios, { AxiosError } from 'axios';

interface WeatherObservation {
  timestamp: number;
  temperature: number;
  humidity: number;
  rain: number;
}

interface RawObservation {
  [index: number]: number;
}

// Helper function to calculate rain accumulation
function calculateRainAccumulation(observations: RawObservation[]): Map<string, number> {
  const dailyRain = new Map<string, number>();
  
  observations.forEach(obs => {
    if (obs[0] && !isNaN(obs[0])) {
      const date = new Date(obs[0] * 1000).toISOString().split('T')[0];
      // Index 11 is daily_rain in inches
      const dailyRainTotal = obs[11] || 0;
      
      // Update the daily rain total if it's higher than what we have
      if (!dailyRain.has(date) || dailyRainTotal > dailyRain.get(date)!) {
        dailyRain.set(date, dailyRainTotal);
      }
    }
  });
  
  return dailyRain;
}

export async function GET() {
  const deviceId = process.env.TEMPEST_DEVICE_ID;
  const token = process.env.TEMPEST_TOKEN;

  if (!deviceId || !token) {
    console.error('Missing required environment variables:', {
      hasDeviceId: !!deviceId,
      hasToken: !!token
    });
    return NextResponse.json(
      { 
        error: 'Missing configuration',
        details: 'Required environment variables TEMPEST_DEVICE_ID and TEMPEST_TOKEN are not set'
      },
      { status: 500 }
    );
  }

  try {
    // Get observations for the last 5 days using day_offset
    const observations: RawObservation[] = [];
    const errors: string[] = [];
    
    // Fetch each day's data separately (0 = today, 1 = yesterday, etc.)
    for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
      try {
        console.log(`Fetching data for day offset ${dayOffset}...`);
        const response = await axios.get(
          `https://swd.weatherflow.com/swd/rest/observations/device/${deviceId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            params: {
              time_start: Math.floor(Date.now() / 1000) - (dayOffset + 1) * 86400, // Start of day
              time_end: Math.floor(Date.now() / 1000) - dayOffset * 86400,         // End of day
              units_temp: 'f',
              units_wind: 'mph',
              units_pressure: 'inhg',
              units_precip: 'in',
              units_distance: 'mi'
            },
            timeout: 10000
          }
        );

        if (response.data?.obs && Array.isArray(response.data.obs)) {
          observations.push(...response.data.obs);
          console.log(`Successfully fetched ${response.data.obs.length} observations for day ${dayOffset}`);
        } else {
          console.warn(`No observations found for day offset ${dayOffset}:`, response.data);
          errors.push(`No observations found for day offset ${dayOffset}`);
        }
      } catch (fetchError) {
        const error = fetchError as AxiosError;
        console.error(`Error fetching data for day offset ${dayOffset}:`, {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
        errors.push(`Failed to fetch day ${dayOffset}: ${error.message}`);
        continue;
      }
    }

    if (observations.length === 0) {
      console.error('No observations found', { errors });
      return NextResponse.json(
        { 
          error: 'No weather data available',
          details: errors.join('. ')
        },
        { status: 404 }
      );
    }

    // Process the observations to get one reading per day
    const processedObs: WeatherObservation[] = [];
    const dayGroups = new Map<string, RawObservation[]>();
    
    observations.forEach((obs) => {
      if (obs[0] && !isNaN(obs[0])) {
        const date = new Date(obs[0] * 1000).toISOString().split('T')[0];
        if (!dayGroups.has(date)) {
          dayGroups.set(date, []);
        }
        dayGroups.get(date)?.push(obs);
      }
    });

    // Calculate daily rain accumulation
    const dailyRain = calculateRainAccumulation(observations);

    // Get one reading per day (around noon)
    dayGroups.forEach((dayObs, date) => {
      if (dayObs.length === 0) return;

      const noonTimestamp = new Date(dayObs[0][0] * 1000).setHours(12, 0, 0, 0) / 1000;
      const closest = dayObs.reduce((prev, curr) => {
        return Math.abs(curr[0] - noonTimestamp) < Math.abs(prev[0] - noonTimestamp) ? curr : prev;
      });

      if (closest && !isNaN(closest[7]) && !isNaN(closest[8])) {
        processedObs.push({
          timestamp: closest[0] * 1000,
          temperature: closest[7],
          humidity: closest[8],
          rain: dailyRain.get(date) || 0  // Use accumulated rain for the day
        });
      }
    });

    const sortedObs = processedObs.sort((a, b) => a.timestamp - b.timestamp);

    if (sortedObs.length === 0) {
      return NextResponse.json(
        { 
          error: 'No valid weather data available',
          details: 'Could not process any observations from the available data'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      obs: sortedObs,
      summary: {
        start_time: sortedObs[0].timestamp,
        end_time: sortedObs[sortedObs.length - 1].timestamp,
        total_observations: sortedObs.length
      }
    });

  } catch (error) {
    console.error('Historical data fetch error:', error instanceof AxiosError ? {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    } : error);
    
    if (error instanceof AxiosError) {
      const status = error.response?.status || 500;
      return NextResponse.json(
        { 
          error: 'Failed to fetch historical data',
          details: error.response?.data?.message || error.message
        },
        { status }
      );
    }

    return NextResponse.json(
      { 
        error: 'An unexpected error occurred',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 