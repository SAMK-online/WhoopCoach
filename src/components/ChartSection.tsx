import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

interface ChartConfig {
  type: 'line' | 'area' | 'bar' | 'pie';
  title: string;
  dataKey: string | string[];
  description: string;
  color?: string;
  colors?: string[];
}

interface ChartSectionProps {
  data: any[];
  charts?: ChartConfig[];
  isDynamic?: boolean;
}

export const ChartSection: React.FC<ChartSectionProps> = ({ data, charts = [], isDynamic = false }) => {
  // Fallback to default charts if no dynamic charts are provided
  const defaultCharts = [
    {
      type: 'area' as const,
      title: 'Recovery Trend',
      dataKey: 'recovery',
      description: 'Recovery percentage over time',
      color: '#10B981'
    },
    {
      type: 'line' as const,
      title: 'Strain vs Sleep',
      dataKey: 'strain',
      description: 'Strain and sleep comparison',
      color: '#F59E0B'
    }
  ];

  const chartsToRender = charts.length > 0 ? charts : defaultCharts;

  const renderChart = (chart: ChartConfig, index: number) => {
    // Handle multiple data keys for comparison charts
    const dataKeys = Array.isArray(chart.dataKey) ? chart.dataKey : [chart.dataKey];
    const colors = chart.colors || [chart.color || `hsl(${index * 60}, 70%, 50%)`];
    
    // Build chart config for multiple lines
    const chartConfig: any = {};
    dataKeys.forEach((key, idx) => {
      chartConfig[key] = {
        label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        color: colors[idx] || `hsl(${(index + idx) * 60}, 70%, 50%)`
      };
    });

    const commonProps = {
      data: data,
      margin: { top: 5, right: 5, left: 5, bottom: 5 }
    };

    switch (chart.type) {
      case 'area':
        const primaryKey = dataKeys[0];
        return (
          <ChartContainer config={chartConfig} className="h-full w-full">
            <AreaChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="day" 
                stroke="#9CA3AF"
                fontSize={10}
                tick={{ fontSize: 9 }}
              />
              <YAxis 
                stroke="#9CA3AF"
                fontSize={10}
                tick={{ fontSize: 9 }}
                width={35}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey={primaryKey}
                stroke={colors[0] || '#10B981'}
                fill={`url(#gradient-${index})`}
                strokeWidth={2}
              />
              <defs>
                <linearGradient id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors[0] || '#10B981'} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={colors[0] || '#10B981'} stopOpacity={0}/>
                </linearGradient>
              </defs>
            </AreaChart>
          </ChartContainer>
        );

      case 'line':
        return (
          <ChartContainer config={chartConfig} className="h-full w-full">
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="day" 
                stroke="#9CA3AF"
                fontSize={10}
                tick={{ fontSize: 9 }}
              />
              <YAxis 
                stroke="#9CA3AF"
                fontSize={10}
                tick={{ fontSize: 9 }}
                width={35}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              {dataKeys.map((key, idx) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={colors[idx] || `hsl(${(index + idx) * 60}, 70%, 50%)`}
                  strokeWidth={2}
                  dot={{ fill: colors[idx] || `hsl(${(index + idx) * 60}, 70%, 50%)`, strokeWidth: 2, r: 3 }}
                />
              ))}
            </LineChart>
          </ChartContainer>
        );

      case 'bar':
        const primaryBarKey = dataKeys[0];
        return (
          <ChartContainer config={chartConfig} className="h-full w-full">
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="day" 
                stroke="#9CA3AF"
                fontSize={10}
                tick={{ fontSize: 9 }}
              />
              <YAxis 
                stroke="#9CA3AF"
                fontSize={10}
                tick={{ fontSize: 9 }}
                width={35}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey={primaryBarKey}
                fill={colors[0] || '#3B82F6'}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        );

      case 'pie':
        const primaryPieKey = dataKeys[0];
        const pieData = data.map((item, idx) => ({
          name: item.day || `Item ${idx + 1}`,
          value: item[primaryPieKey] || 0,
          fill: `hsl(${idx * 45}, 70%, 50%)`
        }));
        
        return (
          <ChartContainer config={chartConfig} className="h-full w-full flex items-center justify-center">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={50}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ChartContainer>
        );

      default:
        return null;
    }
  };

  if (!data || data.length === 0) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6">
          <h3 className="text-white text-lg font-semibold mb-4">No Chart Data</h3>
          <p className="text-gray-400">Upload CSV files to see dynamic charts</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`grid gap-6 ${chartsToRender.length === 1 ? 'grid-cols-1' : chartsToRender.length === 2 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'}`}>
      {chartsToRender.map((chart, index) => (
        <div key={index} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 overflow-hidden">
          <h3 className="text-white text-lg font-semibold mb-2">{chart.title}</h3>
          {chart.description && (
            <p className="text-gray-400 text-sm mb-4">{chart.description}</p>
          )}
          <div className="h-48 w-full overflow-hidden">
            {renderChart(chart, index)}
          </div>
        </div>
      ))}
    </div>
  );
};
