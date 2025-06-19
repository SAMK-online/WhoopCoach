import React from 'react';
import { Heart, Moon, Zap, TrendingUp } from 'lucide-react';
import { WhoopDayData } from '@/types/whoopData';

interface MetricsGridProps {
  data: WhoopDayData;
  onMetricClick: (metric: string) => void;
}

export const MetricsGrid: React.FC<MetricsGridProps> = ({ data, onMetricClick }) => {
  const getRecoveryColor = (score: number) => {
    if (score >= 70) return 'from-green-400 to-green-600';
    if (score >= 40) return 'from-yellow-400 to-orange-500';
    return 'from-red-400 to-red-600';
  };

  const getStrainColor = (strain: number) => {
    if (strain >= 15) return 'from-red-400 to-red-600';
    if (strain >= 10) return 'from-orange-400 to-red-500';
    return 'from-yellow-400 to-orange-500';
  };

  // Get the latest data point
  const latestData = data[0] || {};

  const metrics = [
    {
      id: 'recovery',
      title: 'Recovery',
      value: `${latestData['recovery score %'] || 0}%`,
      subtitle: 'Your body is ready',
      icon: TrendingUp,
      gradient: getRecoveryColor(latestData['recovery score %'] || 0),
      onClick: () => onMetricClick('recovery')
    },
    {
      id: 'hrv',
      title: 'HRV',
      value: `${latestData['heart rate variability (ms)'] || 0}ms`,
      subtitle: 'Heart Rate Variability',
      icon: Heart,
      gradient: 'from-purple-400 to-pink-500',
      onClick: () => onMetricClick('hrv')
    },
    {
      id: 'strain',
      title: 'Strain',
      value: (latestData['day strain'] || 0).toFixed(1),
      subtitle: 'Today\'s exertion',
      icon: Zap,
      gradient: getStrainColor(latestData['day strain'] || 0),
      onClick: () => onMetricClick('strain')
    },
    {
      id: 'sleep',
      title: 'Sleep',
      value: `${Math.floor((latestData['asleep duration (min)'] || 0) / 60)}h ${(latestData['asleep duration (min)'] || 0) % 60}m`,
      subtitle: 'Last night',
      icon: Moon,
      gradient: 'from-blue-400 to-indigo-600',
      onClick: () => onMetricClick('sleep')
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <div
            key={metric.id}
            onClick={metric.onClick}
            className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 cursor-pointer transform hover:scale-105 transition-all duration-200 hover:bg-gray-800/70"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`bg-gradient-to-r ${metric.gradient} p-3 rounded-xl`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
            </div>
            
            <div>
              <h3 className="text-gray-400 text-sm font-medium mb-1">{metric.title}</h3>
              <p className="text-white text-2xl font-bold mb-1">{metric.value}</p>
              <p className="text-gray-500 text-xs">{metric.subtitle}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
