import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { format } from 'date-fns';
import { Card } from '@/components/Card';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface WeatherObservation {
  timestamp: number;
  temperature: number;
  humidity: number;
  rain: number;
}

interface WeatherChartsProps {
  data: any;
  showOnly?: string[];
}

export function WeatherCharts({ data, showOnly = ['temperature'] }: WeatherChartsProps) {
  if (!data) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-400 border-t-transparent" />
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <p className="text-xl mb-2 text-red-500">⚠️</p>
          <p className="text-red-400 mb-2">{data.error}</p>
          {data.details && (
            <p className="text-sm text-gray-400 mb-4">{data.details}</p>
          )}
          <div className="flex gap-3 justify-center">
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-400/20 hover:bg-blue-400/30 rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const chartData = data.obs;

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 2.5,
    scales: {
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.8)',
          font: {
            size: 9
          }
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.8)',
          maxTicksLimit: 6,
          font: {
            size: 9
          }
        }
      }
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'rgba(255, 255, 255, 0.8)',
          font: {
            size: 10
          }
        }
      }
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {(!showOnly || showOnly.includes('temperature')) && (
        <Card className="p-4">
          <div className="space-y-2">
            <h3 className="text-sm font-light">Temperature History</h3>
            <div className="h-[200px]">
              <Line 
                options={options} 
                data={{
                  labels: chartData.map(d => format(d.timestamp, 'MMM d')),
                  datasets: [{
                    label: 'Temperature (°F)',
                    data: chartData.map(d => d.temperature),
                    borderColor: 'rgb(239, 68, 68)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2,
                  }]
                }} 
              />
            </div>
          </div>
        </Card>
      )}

      {(!showOnly || showOnly.includes('humidity')) && (
        <Card className="p-4">
          <div className="space-y-2">
            <h3 className="text-sm font-light">Humidity History</h3>
            <div className="h-[200px]">
              <Line 
                options={options} 
                data={{
                  labels: chartData.map(d => format(d.timestamp, 'MMM d')),
                  datasets: [{
                    label: 'Humidity (%)',
                    data: chartData.map(d => d.humidity),
                    borderColor: 'rgb(52, 211, 153)',
                    backgroundColor: 'rgba(52, 211, 153, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2,
                  }]
                }} 
              />
            </div>
          </div>
        </Card>
      )}

      {(!showOnly || showOnly.includes('rain')) && (
        <Card className="p-4">
          <div className="space-y-2">
            <h3 className="text-sm font-light">Rain History</h3>
            <div className="h-[200px]">
              <Line 
                options={options} 
                data={{
                  labels: chartData.map(d => format(d.timestamp, 'MMM d')),
                  datasets: [{
                    label: 'Rain Accumulation (in)',
                    data: chartData.map(d => d.rain),
                    borderColor: 'rgb(129, 140, 248)',
                    backgroundColor: 'rgba(129, 140, 248, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2,
                  }]
                }} 
              />
            </div>
          </div>
        </Card>
      )}
    </div>
  );
} 