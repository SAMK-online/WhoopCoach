import React, { useState, useEffect } from 'react';
import { DashboardHeader } from '@/components/DashboardHeader';
import { MetricsGrid } from '@/components/MetricsGrid';
import { DynamicMetricsGrid } from '@/components/DynamicMetricsGrid';
import { AICoach } from '@/components/AICoach';
import { ChartSection } from '@/components/ChartSection';
import { StartupScreen } from '@/components/StartupScreen';
import { MetricDetailModal } from '@/components/MetricDetailModal';
import { DurationToggle, DashboardDuration } from '@/components/DurationToggle';
import { PredictiveInsights } from '@/components/PredictiveInsights';
import { Goals } from '@/components/Goals';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataLoader } from '@/services/dataLoader';
import { RAGService } from '@/services/ragService';

const Index = () => {
  // Fallback UI in case nothing renders
  if (typeof window !== 'undefined') {
    const root = document.getElementById('root');
    if (root && root.innerHTML.trim() === '') {
      root.innerHTML = '<div style="color:red;text-align:center;margin-top:2em;">Nothing rendered. Check console for errors.</div>';
    }
  }

  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rawData, setRawData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [ragService, setRagService] = useState<RAGService | null>(null);
  const [hasCompletedSetup, setHasCompletedSetup] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMetricForModal, setSelectedMetricForModal] = useState<any>(null);
  const [coachRef, setCoachRef] = useState<any>(null);
  const [dashboardDuration, setDashboardDuration] = useState<DashboardDuration>('week');

  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('Starting data load...');
        const dataLoader = DataLoader.getInstance();
        const result = await dataLoader.loadData();
        console.log('Data loaded successfully:', result);
        
        if (!result || !result.rawData || result.rawData.length === 0) {
          throw new Error('No data received from DataLoader');
        }
        
        setRawData(result.rawData);
        setRagService(result.ragService);
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Filter data based on selected duration and add day labels for charts
  useEffect(() => {
    if (!rawData || rawData.length === 0) return;
    let daysToShow = 7; // default to week
    switch (dashboardDuration) {
      case 'day':
        daysToShow = 1;
        break;
      case 'week':
        daysToShow = 7;
        break;
      case 'month':
        daysToShow = 30;
        break;
      case '6months':
        daysToShow = 180;
        break;
    }
    const filtered = rawData.slice(0, daysToShow).map((row, index) => ({
      ...row,
      day: `Day ${index + 1}`, // Add day identifier for charts
      dayIndex: index
    }));
    console.log(`Filtered data for ${dashboardDuration}:`, filtered.length, 'records', filtered);
    setFilteredData(filtered);
  }, [rawData, dashboardDuration]);

  // Curated selection of most important Whoop metrics
  function getCuratedWhoopMetrics(data: any[], limit = 6) {
    if (!data || data.length === 0) return [];
    const firstRow = data[0];
    
    // Priority list of most important Whoop metrics
    const priorityMetrics = [
      'recovery score %',           // Most important - overall readiness
      'day strain',                 // Daily exertion level
      'sleep performance %',        // Sleep quality (keep one sleep metric)
      'heart rate variability (ms)', // HRV - recovery indicator
      'resting heart rate (bpm)',   // RHR - fitness/recovery indicator
      'blood oxygen %',             // Important health indicator
      'energy burned (cal)',        // Activity/metabolism
      'sleep efficiency %',         // Sleep optimization
      'deep (sws) duration (min)',  // Deep sleep for recovery
      'average hr (bpm)',           // General heart rate
      'max hr (bpm)',              // Peak exertion
      'respiratory rate (rpm)',     // Breathing patterns
      'skin temp (celsius)'         // Temperature regulation
    ];
    
    // Find available metrics from priority list
    const availableMetrics = priorityMetrics.filter(metric => {
      const key = Object.keys(firstRow).find(k => k.toLowerCase() === metric.toLowerCase());
      return key && data.some(row => typeof row[key] === 'number' && !isNaN(row[key]));
    });
    
    // Map to actual column names
    const selectedMetrics = availableMetrics.slice(0, limit).map(priorityMetric => {
      return Object.keys(firstRow).find(k => k.toLowerCase() === priorityMetric.toLowerCase());
    }).filter(Boolean);
    
    console.log('Selected curated Whoop metrics:', selectedMetrics);
    return selectedMetrics;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg">Loading your data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8 bg-red-50 rounded-lg max-w-2xl">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Data</h2>
          <p className="text-red-700 mb-4">{error}</p>
          <div className="text-left bg-white p-4 rounded border border-red-200">
            <h3 className="font-semibold mb-2">Troubleshooting Steps:</h3>
            <ol className="list-decimal list-inside space-y-2">
              <li>Make sure the CSV file exists at <code className="bg-gray-100 px-2 py-1 rounded">src/data/csv/COmbined.csv</code></li>
              <li>Check that the CSV file is properly formatted with headers</li>
              <li>Verify file permissions</li>
              <li>Try refreshing the page</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  if (!filteredData || filteredData.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-yellow-400 text-xl mb-4">No data available. Please check your CSV file.</div>
        <pre className="text-xs text-gray-400 bg-gray-800 p-4 rounded max-w-2xl overflow-x-auto mt-4">Raw Data: {JSON.stringify(rawData, null, 2)}</pre>
      </div>
    );
  }

  let metrics: any[] = [];
  let metricsError: string | null = null;
  try {
    // Get curated Whoop metrics
    const topMetrics = getCuratedWhoopMetrics(filteredData, 6);
    console.log('Top metrics:', topMetrics);
    // Build metrics array dynamically, using average over filteredData
    metrics = topMetrics.map((col, idx) => {
      // Calculate average value for this metric over filteredData
      const values = filteredData.map(row => row[col]).filter(v => typeof v === 'number' && !isNaN(v));
      const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
      // Enhanced unit and icon detection for Whoop metrics
      let unit = '';
      let icon = 'BarChart3';
      let gradient = 'from-blue-400 to-indigo-600';
      const lower = col.toLowerCase();
      
      if (lower.includes('recovery')) {
        unit = '%';
        gradient = 'from-green-400 to-green-600';
        icon = 'TrendingUp';
      } else if (lower.includes('strain')) {
        unit = '';
        gradient = 'from-yellow-400 to-orange-500';
        icon = 'Zap';
      } else if (lower.includes('hrv') || lower.includes('variability')) {
        unit = 'ms';
        gradient = 'from-purple-400 to-pink-500';
        icon = 'Heart';
      } else if (lower.includes('resting heart rate') || lower.includes('rhr')) {
        unit = 'bpm';
        gradient = 'from-red-400 to-pink-500';
        icon = 'Heart';
      } else if (lower.includes('blood oxygen')) {
        unit = '%';
        gradient = 'from-cyan-400 to-blue-500';
        icon = 'Droplets';
      } else if (lower.includes('sleep performance') || lower.includes('sleep efficiency')) {
        unit = '%';
        gradient = 'from-blue-400 to-indigo-600';
        icon = 'Moon';
      } else if (lower.includes('sleep') && lower.includes('duration') || 
                 lower.includes('asleep duration') || 
                 lower.includes('awake duration') ||
                 lower.includes('in bed duration') ||
                 lower.includes('light sleep') ||
                 lower.includes('deep') ||
                 lower.includes('rem') ||
                 lower.includes('sleep need') ||
                 lower.includes('sleep debt')) {
        unit = 'min';
        gradient = 'from-blue-400 to-indigo-600';
        icon = 'Moon';
      } else if (lower.includes('energy') || lower.includes('cal')) {
        unit = 'cal';
        gradient = 'from-orange-400 to-yellow-500';
        icon = 'Flame';
      } else if (lower.includes('temp') || lower.includes('thermo')) {
        unit = '°C';
        gradient = 'from-red-400 to-yellow-400';
        icon = 'Thermometer';
      } else if (lower.includes('respiratory') || lower.includes('breathing')) {
        unit = 'rpm';
        gradient = 'from-teal-400 to-cyan-500';
        icon = 'Wind';
      } else if (lower.includes('heart rate') || lower.includes('hr')) {
        unit = 'bpm';
        gradient = 'from-red-400 to-pink-500';
        icon = 'Heart';
      } else if (lower.includes('percent') || lower.includes('%')) {
        unit = '%';
        gradient = 'from-green-400 to-green-600';
        icon = 'TrendingUp';
      }
      // Format value
      let displayValue: string = '';
      if (avg !== null) {
        if (unit === '%') {
          displayValue = `${Math.round(avg)}%`;
        } else if (unit === 'ms') {
          displayValue = `${Math.round(avg)}ms`;
        } else if (unit === 'min') {
          displayValue = `${Math.floor(avg / 60)}h ${Math.round(avg % 60)}m`;
        } else {
          displayValue = `${Math.round(avg)}`;
        }
      } else {
        displayValue = 'N/A';
      }
      return {
        id: col,
        title: col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value: displayValue,
        subtitle: '',
        icon,
        gradient,
        unit,
        _updated: Date.now()
      };
    });
    console.log('Generated metrics:', metrics);
  } catch (err) {
    metricsError = (err instanceof Error ? err.message : 'Failed to generate metrics');
    console.error('Metrics generation error:', err);
  }

  if (metricsError) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-red-400 text-xl">Error generating metrics: {metricsError}</div>
      </div>
    );
  }

  if (!metrics || metrics.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-red-400 text-xl mb-4">No metrics could be generated from your data.</div>
        <pre className="text-xs text-gray-400 bg-gray-800 p-4 rounded max-w-2xl overflow-x-auto mt-4">Filtered Data: {JSON.stringify(filteredData, null, 2)}</pre>
      </div>
    );
  }

  // Transform data for MetricDetailModal
  const dashboardData = {
    today: filteredData[0] || {},
    weekly: filteredData.slice(0, 7),
    dynamicMetrics: metrics
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <DashboardHeader />
      
      <div className="mt-6">
        <DurationToggle
          value={dashboardDuration}
          onValueChange={setDashboardDuration}
        />
        
        <Tabs defaultValue="dashboard" className="mt-6">
          <TabsList className="grid w-full grid-cols-3 bg-gray-800 border-gray-700">
            <TabsTrigger value="dashboard" className="text-white data-[state=active]:bg-blue-600">
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="predictions" className="text-white data-[state=active]:bg-blue-600">
              AI Predictions
            </TabsTrigger>
            <TabsTrigger value="goals" className="text-white data-[state=active]:bg-blue-600">
              Goals
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <DynamicMetricsGrid
                  metrics={metrics}
                  onMetricClick={(metricId) => {
                    setSelectedMetric(metricId);
                    setIsModalOpen(true);
                  }}
                />
                
                <ChartSection
                  data={filteredData}
                  charts={[
                    {
                      type: 'area',
                      title: 'Recovery Trend',
                      dataKey: 'recovery score %',
                      description: 'Recovery percentage over time',
                      color: '#10B981'
                    },
                    {
                      type: 'line',
                      title: 'Strain vs Sleep',
                      dataKey: ['day strain', 'sleep performance %'],
                      description: 'Daily strain vs sleep performance comparison',
                      colors: ['#F59E0B', '#3B82F6']
                    }
                  ]}
                />
              </div>
              
              <div className="space-y-6">
                <AICoach
                  ref={setCoachRef}
                  data={filteredData[0]}
                  selectedMetric={selectedMetric}
                  dynamicMetrics={metrics}
                  chartData={filteredData}
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="predictions" className="mt-6">
            <PredictiveInsights data={filteredData} />
          </TabsContent>
          
          <TabsContent value="goals" className="mt-6">
            <Goals data={filteredData} />
          </TabsContent>
        </Tabs>
      </div>

      <MetricDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        metric={metrics.find(m => m.id === selectedMetric) || null}
        dashboardData={dashboardData}
        onAskCoach={async (question: string) => {
          if (ragService) {
            try {
              const selectedMetricData = metrics.find(m => m.id === selectedMetric);
              const metricContext = selectedMetricData ? {
                id: selectedMetricData.id,
                title: selectedMetricData.title,
                value: selectedMetricData.value
              } : undefined;
              
              const response = await ragService.generateRAGResponse(question, undefined, metricContext);
              console.log('AI Coach response:', response);
              return response;
            } catch (err) {
              console.error('Error getting AI Coach response:', err);
              throw err;
            }
          }
          return 'AI Coach is not available.';
        }}
      />
    </div>
  );
};

export default Index;
