
import React from 'react';
import { Heart, Moon, Zap, TrendingUp, Thermometer, Flame, Footprints, BarChart3 } from 'lucide-react';

interface DynamicMetric {
  id: string;
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  gradient: string;
  unit: string;
  _updated?: number;
  _forceUpdate?: string;
}

interface DynamicMetricsGridProps {
  metrics: DynamicMetric[];
  onMetricClick: (metric: string) => void;
}

export const DynamicMetricsGrid: React.FC<DynamicMetricsGridProps> = ({ metrics, onMetricClick }) => {
  const getIcon = (iconName: string) => {
    const icons: { [key: string]: any } = {
      Heart,
      Moon,
      Zap,
      TrendingUp,
      Thermometer,
      Flame,
      Footprints,
      BarChart3
    };
    return icons[iconName] || BarChart3;
  };

  // Determine grid layout based on number of metrics
  const getGridCols = (count: number) => {
    if (count <= 2) return 'grid-cols-1 md:grid-cols-2';
    if (count <= 4) return 'grid-cols-2';
    if (count <= 6) return 'grid-cols-2 lg:grid-cols-3';
    return 'grid-cols-2 lg:grid-cols-4';
  };

  return (
    <div className={`grid gap-4 ${getGridCols(metrics.length)}`}>
      {metrics.map((metric) => {
        const Icon = getIcon(metric.icon);
        // Use a combination of id and update timestamp as key to force re-render
        const metricKey = `${metric.id}-${metric._updated || 0}-${metric._forceUpdate || ''}`;
        
        return (
          <div
            key={metricKey}
            onClick={() => onMetricClick(metric.id)}
            className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-4 lg:p-6 cursor-pointer transform hover:scale-105 transition-all duration-200 hover:bg-gray-800/70"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`bg-gradient-to-r ${metric.gradient} p-2 lg:p-3 rounded-xl`}>
                <Icon className="h-4 w-4 lg:h-6 lg:w-6 text-white" />
              </div>
            </div>
            
            <div>
              <h3 className="text-gray-400 text-xs lg:text-sm font-medium mb-1">{metric.title}</h3>
              <p className="text-white text-lg lg:text-2xl font-bold mb-1">{metric.value}</p>
              <p className="text-gray-500 text-xs">{metric.subtitle}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
