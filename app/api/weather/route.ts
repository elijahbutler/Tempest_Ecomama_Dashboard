import { NextResponse } from 'next/server';
import axios, { AxiosError } from 'axios';

// Add cache configuration
export const revalidate = 3600; // Cache for 1 hour (3600 seconds)

export async function GET() {
  const stationId = process.env.TEMPEST_STATION_ID;
  const token = process.env.TEMPEST_TOKEN;

  if (!stationId || !token) {
    return NextResponse.json({ error: 'Missing configuration' }, { status: 500 });
  }

  try {
    const response = await axios.get(
      'https://swd.weatherflow.com/swd/rest/better_forecast',
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          station_id: stationId,
          units_temp: 'f',
          units_wind: 'mph',
          units_pressure: 'inhg',
          units_precip: 'in',
          units_distance: 'mi'
        }
      }
    );

    console.log('Current Temperature (F):', response.data.current_conditions.air_temperature);
    console.log('Weather API Response:', {
      timestamp: response.data.current_conditions?.timestamp,
      temp: response.data.current_conditions?.air_temperature
    });

    return NextResponse.json(response.data);
  } catch (err) {
    if (err instanceof AxiosError) {
      console.error('Error fetching weather data:', err.message, err.response?.data);
      return NextResponse.json({ 
        error: 'Failed to fetch weather data', 
        details: err.response?.data || err.message 
      }, { status: 500 });
    }
    return NextResponse.json({ error: 'Failed to fetch weather data' }, { status: 500 });
  }
} 