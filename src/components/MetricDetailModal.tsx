import React, { useState } from 'react';
import { X, MessageCircle, TrendingUp, Heart, Moon, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface MetricDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  metric: {
    id: string;
    title: string;
    value: string;
    subtitle: string;
    icon: string;
    gradient: string;
  } | null;
  dashboardData: any;
  onAskCoach: (question: string) => Promise<string>;
}

export const MetricDetailModal: React.FC<MetricDetailModalProps> = ({
  isOpen,
  onClose,
  metric,
  dashboardData,
  onAskCoach
}) => {
  const [question, setQuestion] = useState('');
  const [coachResponse, setCoachResponse] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);

  if (!metric) return null;

  const getIcon = (iconName: string) => {
    const icons: { [key: string]: any } = {
      Heart,
      Moon,
      Zap,
      TrendingUp,
    };
    return icons[iconName] || TrendingUp;
  };

  const formatSleepDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getPersonalizedInsights = (metricId: string) => {
    const today = dashboardData.today || {};
    const weekly = dashboardData.weekly || [];
    const dynamicMetrics = dashboardData.dynamicMetrics || [];

    switch (metricId) {
      case 'recovery': {
        const recovery = today['recovery score %'] || 0;
        const weeklyRecovery = weekly.map((day: any) => day['recovery score %'] || 0);
        const avgRecovery = weeklyRecovery.reduce((a: number, b: number) => a + b, 0) / weeklyRecovery.length;
        
        let status = 'Good';
        let color = 'text-green-400';
        let recommendations = [
          'Maintain your current routine',
          'Stay hydrated',
          'Get adequate sleep'
        ];

        if (recovery < 40) {
          status = 'Poor';
          color = 'text-red-400';
          recommendations = [
            'Prioritize rest and recovery',
            'Reduce training intensity',
            'Focus on sleep quality'
          ];
        } else if (recovery < 70) {
          status = 'Moderate';
          color = 'text-yellow-400';
          recommendations = [
            'Consider light training',
            'Monitor your energy levels',
            'Stay consistent with sleep schedule'
          ];
        }

        const detailedAnalysis = `Your current recovery score is ${recovery}%, which is ${status.toLowerCase()}. 
        Your 7-day average recovery is ${avgRecovery.toFixed(1)}%. 
        ${recovery < avgRecovery ? 'This is below your average - consider taking it easy today.' : 
        'This is above your average - you\'re in good shape for training.'}`;

        return {
          meaning: "Recovery score is a comprehensive measure of your body's readiness for strain. It considers factors like HRV, sleep quality, and recent strain to determine if you're ready for intense training or need more rest.",
          personalizedInsight: detailedAnalysis,
          status,
          color,
          recommendations
        };
      }

      case 'hrv': {
        const hrv = today['heart rate variability (ms)'] || 0;
        const weeklyHrv = weekly.map((day: any) => day['heart rate variability (ms)'] || 0);
        const avgHrv = weeklyHrv.reduce((a: number, b: number) => a + b, 0) / weeklyHrv.length;
        
        let status = 'Good';
        let color = 'text-green-400';
        let recommendations = [
          'Maintain your current routine',
          'Stay consistent with sleep schedule',
          'Manage stress levels'
        ];

        if (hrv < 30) {
          status = 'Low';
          color = 'text-red-400';
          recommendations = [
            'Prioritize rest',
            'Practice stress management',
            'Avoid intense training'
          ];
        } else if (hrv < 50) {
          status = 'Moderate';
          color = 'text-yellow-400';
          recommendations = [
            'Consider light training',
            'Focus on recovery',
            'Monitor stress levels'
          ];
        }

        const detailedAnalysis = `Your current HRV is ${hrv}ms, which is ${status.toLowerCase()}. 
        Your 7-day average HRV is ${avgHrv.toFixed(1)}ms. 
        ${hrv < avgHrv ? 'This is below your average - your body may need more recovery.' : 
        'This is above your average - your autonomic nervous system is well-balanced.'}`;

        return {
          meaning: "Heart Rate Variability (HRV) measures the variation in time between heartbeats. Higher HRV generally indicates better cardiovascular fitness and stress resilience. It's a key indicator of your body's ability to adapt to stress and recover.",
          personalizedInsight: detailedAnalysis,
          status,
          color,
          recommendations
        };
      }

      case 'strain': {
        const strain = today['day strain'] || 0;
        const weeklyStrain = weekly.map((day: any) => day['day strain'] || 0);
        const avgStrain = weeklyStrain.reduce((a: number, b: number) => a + b, 0) / weeklyStrain.length;
        
        let status = 'Moderate';
        let color = 'text-yellow-400';
        let recommendations = [
          'Monitor your energy levels',
          'Stay hydrated',
          'Consider recovery needs'
        ];

        if (strain >= 15) {
          status = 'High';
          color = 'text-red-400';
          recommendations = [
            'Prioritize recovery',
            'Reduce training intensity',
            'Focus on sleep quality'
          ];
        } else if (strain < 10) {
          status = 'Low';
          color = 'text-green-400';
          recommendations = [
            'Consider increasing activity',
            'Maintain current routine',
            'Stay consistent with training'
          ];
        }

        const detailedAnalysis = `Your current strain is ${strain.toFixed(1)}, which is ${status.toLowerCase()}. 
        Your 7-day average strain is ${avgStrain.toFixed(1)}. 
        ${strain > avgStrain ? 'This is above your average - make sure to prioritize recovery.' : 
        'This is below your average - you have room for more activity if desired.'}`;

        return {
          meaning: "Strain measures the cardiovascular load on your body. It's calculated based on your heart rate data and represents the total impact of your activities. Higher strain means more cardiovascular stress and need for recovery.",
          personalizedInsight: detailedAnalysis,
          status,
          color,
          recommendations
        };
      }

      case 'sleep': {
        const sleep = today['asleep duration (min)'] || 0;
        const weeklySleep = weekly.map((day: any) => day['asleep duration (min)'] || 0);
        const avgSleep = weeklySleep.reduce((a: number, b: number) => a + b, 0) / weeklySleep.length;
        
        let status = 'Good';
        let color = 'text-green-400';
        let recommendations = [
          'Maintain your sleep schedule',
          'Keep your sleep environment optimal',
          'Stay consistent with bedtime'
        ];

        if (sleep < 360) { // Less than 6 hours
          status = 'Poor';
          color = 'text-red-400';
          recommendations = [
            'Prioritize sleep duration',
            'Create a consistent sleep schedule',
            'Optimize your sleep environment'
          ];
        } else if (sleep < 420) { // Less than 7 hours
          status = 'Moderate';
          color = 'text-yellow-400';
          recommendations = [
            'Aim for more sleep',
            'Maintain consistent sleep schedule',
            'Consider sleep quality improvements'
          ];
        }

        const detailedAnalysis = `You slept ${formatSleepDuration(sleep)} last night, which is ${status.toLowerCase()}. 
        Your 7-day average sleep is ${formatSleepDuration(avgSleep)}. 
        ${sleep < avgSleep ? 'This is below your average - try to get more sleep tonight.' : 
        'This is above your average - you\'re well-rested.'}`;

        return {
          meaning: "Sleep duration tracks the total time you spent asleep, not just in bed. Quality sleep is when your body repairs muscles, consolidates memories, regulates hormones, and prepares for the next day. Adults need 7-9 hours for optimal health, recovery, and performance. Sleep is often called the most important recovery tool.",
          personalizedInsight: detailedAnalysis,
          status,
          color,
          recommendations
        };
      }

      default: {
        // Handle dynamic metrics
        const dynamicMetric = dynamicMetrics.find((m: any) => m.id === metricId);
        if (dynamicMetric) {
          const value = today[dynamicMetric.id] || 0;
          const weeklyValues = weekly.map((day: any) => day[dynamicMetric.id] || 0);
          const avgValue = weeklyValues.reduce((a: number, b: number) => a + b, 0) / weeklyValues.length;

          // Format sleep duration metrics properly
          let formattedValue = `${value}${dynamicMetric.unit}`;
          let formattedAvg = `${avgValue.toFixed(1)}${dynamicMetric.unit}`;
          
          if (dynamicMetric.unit === 'min' && (
            dynamicMetric.id.toLowerCase().includes('sleep') || 
            dynamicMetric.id.toLowerCase().includes('asleep') || 
            dynamicMetric.id.toLowerCase().includes('awake') ||
            dynamicMetric.id.toLowerCase().includes('rem') ||
            dynamicMetric.id.toLowerCase().includes('deep') ||
            dynamicMetric.id.toLowerCase().includes('light')
          )) {
            formattedValue = formatSleepDuration(value);
            formattedAvg = formatSleepDuration(avgValue);
          }

          return {
            meaning: dynamicMetric.subtitle,
            personalizedInsight: `Your current ${dynamicMetric.title} is ${formattedValue}. 
            Your 7-day average is ${formattedAvg}.`,
            status: 'Active',
            color: 'text-blue-400',
            recommendations: [
              'Monitor this metric regularly',
              'Track changes over time',
              'Consider how it relates to other metrics'
            ]
          };
        }

        return {
          meaning: "This metric tracks an important aspect of your health and performance.",
          personalizedInsight: "Keep monitoring this metric to understand your trends and patterns.",
          status: 'Active',
          color: 'text-blue-400',
          recommendations: [
            'Track this metric regularly',
            'Look for patterns and trends',
            'Consider how it relates to other metrics'
          ]
        };
      }
    }
  };

  const insights = getPersonalizedInsights(metric.id);
  const Icon = getIcon(metric.icon);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-gray-900 border-gray-800">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3 text-white">
            <div className={`bg-gradient-to-r ${metric.gradient} p-2 rounded-lg`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <span>{metric.title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-6">
          {/* Current Value */}
          <div className="bg-gray-800/50 rounded-xl p-4">
            <h3 className="text-gray-400 text-sm mb-2">Current Value</h3>
            <p className="text-3xl font-bold text-white">{metric.value}</p>
          </div>

          {/* Meaning */}
          <div>
            <h3 className="text-gray-400 text-sm mb-2">What This Means</h3>
            <p className="text-gray-300">{insights.meaning}</p>
          </div>

          {/* Personalized Insight */}
          <div className="bg-gray-800/50 rounded-xl p-4">
            <h3 className="text-gray-400 text-sm mb-2">Your Insight</h3>
            <p className="text-gray-300">{insights.personalizedInsight}</p>
          </div>

          {/* Recommendations */}
          <div>
            <h3 className="text-gray-400 text-sm mb-2">Recommendations</h3>
            <ul className="space-y-2">
              {insights.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start space-x-2 text-gray-300">
                  <span className="text-blue-400">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* AI Coach Question */}
          <div className="mt-6">
            <h3 className="text-gray-400 text-sm mb-2">Ask AI Coach</h3>
            <div className="flex space-x-2">
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask about this metric..."
                disabled={isAsking}
              />
              <Button
                disabled={!question.trim() || isAsking}
                onClick={async () => {
                  if (!question.trim()) return;
                  setIsAsking(true);
                  setAskError(null);
                  try {
                    const resp = await onAskCoach(question.trim());
                    setCoachResponse(resp);
                  } catch (err: any) {
                    setAskError(err?.message || 'Failed to get response');
                  } finally {
                    setIsAsking(false);
                  }
                }}
              >
                {isAsking ? '...' : 'Ask'}
              </Button>
            </div>
            {askError && <p className="text-red-500 text-xs mt-2">{askError}</p>}
            {coachResponse && (
              <div className="mt-4 p-3 bg-gray-800 rounded border border-gray-700 text-gray-300 text-sm whitespace-pre-wrap">
                {coachResponse}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
