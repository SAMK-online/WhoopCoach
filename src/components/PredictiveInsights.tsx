import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TrendingUp, TrendingDown, AlertTriangle, Target, Brain, Calendar, Zap, Activity, Heart } from 'lucide-react';

interface PredictiveInsightsProps {
  data: any[];
}

interface PredictionCard {
  id: string;
  type: string;
  title: string;
  currentValue: string;
  nextMonthValue: string;
  trend: 'improving' | 'declining' | 'stable';
  confidence: number;
  description: string;
  currentAnalysis: string;
  futureProjection: string;
  recommendations: string[];
  icon: React.ReactNode;
  color: string;
}

export const PredictiveInsights: React.FC<PredictiveInsightsProps> = ({ data }) => {
  const [selectedCard, setSelectedCard] = useState<PredictionCard | null>(null);

  // Static demo data with realistic predictions
  const predictionCards: PredictionCard[] = [
    {
      id: 'recovery',
      type: 'Recovery Score',
      title: 'Recovery Performance',
      currentValue: '75%',
      nextMonthValue: '82%',
      trend: 'improving',
      confidence: 85,
      description: 'Your recovery is trending upward',
      currentAnalysis: "Excellent work! Your recovery score has been consistently improving over the past month, averaging 75%. Your sleep quality has been solid at 7.2 hours per night, and your HRV trends show good adaptation to training loads.",
      futureProjection: "If you maintain your current sleep schedule and training routine, we predict your recovery score will reach 82% by next month. This improvement is based on your consistent sleep patterns and the positive response your body is showing to your current training load.",
      recommendations: [
        "Continue prioritizing 7-8 hours of sleep nightly",
        "Maintain your current training intensity",
        "Consider adding 10 minutes of meditation before bed",
        "Keep hydration levels consistent throughout the day"
      ],
      icon: <TrendingUp className="h-5 w-5" />,
      color: 'from-green-400 to-green-600'
    },
    {
      id: 'sleep_performance',
      type: 'Sleep Performance',
      title: 'Sleep Quality Trends',
      currentValue: '71%',
      nextMonthValue: '78%',
      trend: 'improving',
      confidence: 78,
      description: 'Sleep efficiency is steadily improving',
      currentAnalysis: "Your sleep performance has shown remarkable improvement this month! You're averaging 71% sleep efficiency with consistent bedtimes around 10:30 PM. Your REM and deep sleep percentages are within optimal ranges.",
      futureProjection: "Based on your improving sleep consistency, we project your sleep performance will reach 78% next month. Your body is adapting well to your sleep routine, and continued consistency will yield even better results.",
      recommendations: [
        "Keep your bedtime consistent within 30 minutes",
        "Reduce screen time 1 hour before bed",
        "Consider blackout curtains for deeper sleep",
        "Maintain room temperature between 65-68°F"
      ],
      icon: <Calendar className="h-5 w-5" />,
      color: 'from-blue-400 to-blue-600'
    },
    {
      id: 'day_strain',
      type: 'Day Strain',
      title: 'Training Load Balance',
      currentValue: '13.2',
      nextMonthValue: '14.8',
      trend: 'improving',
      confidence: 72,
      description: 'Optimal training intensity progression',
      currentAnalysis: "Your day strain averaging 13.2 indicates you're training at a moderate-high intensity that's well-suited for your current fitness level. Your body is responding positively without signs of overreaching.",
      futureProjection: "We predict you can safely increase your training load to an average of 14.8 next month. This progression aligns with your improving recovery metrics and suggests your fitness is adapting well to current demands.",
      recommendations: [
        "Gradually increase training intensity by 5-10%",
        "Include one complete rest day per week",
        "Monitor morning HRV for recovery indicators",
        "Focus on progressive overload in key workouts"
      ],
      icon: <Zap className="h-5 w-5" />,
      color: 'from-orange-400 to-orange-600'
    },
    {
      id: 'hrv',
      type: 'Heart Rate Variability',
      title: 'HRV Trends',
      currentValue: '42ms',
      nextMonthValue: '38ms',
      trend: 'declining',
      confidence: 68,
      description: 'Needs attention - stress indicators rising',
      currentAnalysis: "Your HRV has been trending downward recently at 42ms, which may indicate accumulated stress or insufficient recovery. While still within normal range, this decline warrants attention to prevent overreaching.",
      futureProjection: "If current patterns continue, your HRV may drop to 38ms next month, indicating increased stress load. However, with proper recovery interventions, we can reverse this trend and improve your autonomic balance.",
      recommendations: [
        "Prioritize stress management techniques",
        "Consider reducing training intensity by 15%",
        "Add daily breathing exercises or meditation",
        "Ensure adequate protein intake for recovery",
        "Schedule a deload week if symptoms persist"
      ],
      icon: <Heart className="h-5 w-5" />,
      color: 'from-yellow-400 to-orange-500'
    },
    {
      id: 'rhr',
      type: 'Resting Heart Rate',
      title: 'Cardiovascular Fitness',
      currentValue: '52 bpm',
      nextMonthValue: '49 bpm',
      trend: 'improving',
      confidence: 88,
      description: 'Excellent cardiovascular adaptation',
      currentAnalysis: "Outstanding progress! Your resting heart rate of 52 bpm indicates excellent cardiovascular fitness. The steady decline from 55 bpm last month shows your heart is becoming more efficient.",
      futureProjection: "Based on your consistent aerobic training, we predict your RHR will drop to 49 bpm next month. This improvement reflects enhanced cardiac efficiency and overall cardiovascular health.",
      recommendations: [
        "Continue current aerobic base training",
        "Add one long, easy aerobic session weekly",
        "Monitor for overtraining as RHR drops",
        "Maintain consistency in cardio activities"
      ],
      icon: <Activity className="h-5 w-5" />,
      color: 'from-green-400 to-green-600'
    },
    {
      id: 'injury_risk',
      type: 'Injury Risk',
      title: 'Injury Prevention Score',
      currentValue: '25%',
      nextMonthValue: '18%',
      trend: 'improving',
      confidence: 75,
      description: 'Low risk with improving trends',
      currentAnalysis: "Your injury risk is currently low at 25%, thanks to balanced training loads and good recovery metrics. Your consistent warm-up routine and adequate sleep are key protective factors.",
      futureProjection: "Continuing your current approach should reduce injury risk to 18% next month. Your improving recovery score and stable training progression indicate a sustainable routine.",
      recommendations: [
        "Maintain current warm-up and cool-down routines",
        "Continue strength training 2-3x per week",
        "Listen to your body and adjust intensity as needed",
        "Keep mobility work as part of weekly routine"
      ],
      icon: <AlertTriangle className="h-5 w-5" />,
      color: 'from-green-400 to-green-600'
    }
  ];

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-400';
    if (confidence >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 80) return 'High';
    if (confidence >= 60) return 'Medium';
    return 'Low';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-400" />;
      case 'declining': return <TrendingDown className="h-4 w-4 text-red-400" />;
      default: return <div className="h-4 w-4 bg-gray-400 rounded-full" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Predictions Grid */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <span>AI Predictions</span>
          </CardTitle>
          <CardDescription>
            Based on your recent patterns and trends
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {predictionCards.map((card) => (
              <div
                key={card.id}
                onClick={() => setSelectedCard(card)}
                className={`p-4 rounded-lg bg-gradient-to-r ${card.color} bg-opacity-20 border border-gray-600 cursor-pointer hover:bg-opacity-30 transition-all duration-200 hover:border-gray-400 hover:shadow-lg`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg bg-gradient-to-r ${card.color} shadow-lg`}>
                      {card.icon}
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-lg">
                        {card.type}
                      </h3>
                      <p className="text-gray-300 text-sm font-medium">Next 30 days</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-white mb-1">
                      {card.currentValue}
                    </div>
                    <div className="flex items-center space-x-1">
                      {getTrendIcon(card.trend)}
                      <span className={`text-sm font-semibold ${
                        card.trend === 'improving' ? 'text-green-300' : 
                        card.trend === 'declining' ? 'text-red-300' : 
                        'text-gray-300'
                      }`}>
                        → {card.nextMonthValue}
                      </span>
                    </div>
                  </div>
                </div>
                
                <p className="text-gray-100 text-sm mb-4 font-medium">
                  {card.description}
                </p>
                
                <div className="flex items-center justify-between">
                  <Badge 
                    variant="outline" 
                    className={`${getConfidenceColor(card.confidence)} border-current bg-gray-800/50 font-medium`}
                  >
                    {getConfidenceText(card.confidence)} confidence
                  </Badge>
                  <span className="text-white text-sm font-semibold hover:text-gray-200 bg-gray-800/30 px-3 py-1 rounded-full">
                    Click for details →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Trend Summary */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Trend Analysis</span>
          </CardTitle>
          <CardDescription>
            Key metric trends from your recent data
          </CardDescription>
        </CardHeader>
                 <CardContent>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <div className="text-center p-4 bg-gray-700/70 rounded-lg border border-gray-600">
               <div className="text-green-300 text-2xl font-bold mb-1">+16.9%</div>
               <div className="text-sm text-white font-medium">Recovery Score</div>
               <div className="text-xs text-green-300 font-medium">weekly change</div>
             </div>
             <div className="text-center p-4 bg-gray-700/70 rounded-lg border border-gray-600">
               <div className="text-red-300 text-2xl font-bold mb-1">-9.2%</div>
               <div className="text-sm text-white font-medium">Sleep Performance</div>
               <div className="text-xs text-red-300 font-medium">weekly change</div>
             </div>
             <div className="text-center p-4 bg-gray-700/70 rounded-lg border border-gray-600">
               <div className="text-green-300 text-2xl font-bold mb-1">-13%</div>
               <div className="text-sm text-white font-medium">Day Strain</div>
               <div className="text-xs text-green-300 font-medium">weekly change</div>
             </div>
             <div className="text-center p-4 bg-gray-700/70 rounded-lg border border-gray-600">
               <div className="text-gray-300 text-2xl font-bold mb-1">+2.5%</div>
               <div className="text-sm text-white font-medium">Resting Heart Rate</div>
               <div className="text-xs text-gray-300 font-medium">weekly change</div>
             </div>
           </div>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={!!selectedCard} onOpenChange={() => setSelectedCard(null)}>
        <DialogContent className="bg-gray-800 border-gray-700 max-w-2xl">
          {selectedCard && (
            <>
              <DialogHeader>
                <DialogTitle className="text-white flex items-center space-x-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-r ${selectedCard.color}`}>
                    {selectedCard.icon}
                  </div>
                  <span>{selectedCard.title} Analysis</span>
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6 text-gray-300">
                {/* Current vs Future */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                    <div className="text-2xl font-bold text-white">{selectedCard.currentValue}</div>
                    <div className="text-sm text-gray-400">Current Average</div>
                  </div>
                  <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-400">{selectedCard.nextMonthValue}</div>
                    <div className="text-sm text-gray-400">Predicted (30 days)</div>
                  </div>
                </div>

                {/* Current Analysis */}
                <div>
                  <h3 className="text-white font-semibold mb-2">Current State Analysis</h3>
                  <p className="text-sm leading-relaxed">{selectedCard.currentAnalysis}</p>
                </div>

                {/* Future Projection */}
                <div>
                  <h3 className="text-white font-semibold mb-2">30-Day Projection</h3>
                  <p className="text-sm leading-relaxed">{selectedCard.futureProjection}</p>
                </div>

                {/* Recommendations */}
                <div>
                  <h3 className="text-white font-semibold mb-2">Personalized Recommendations</h3>
                  <ul className="space-y-2">
                    {selectedCard.recommendations.map((rec, index) => (
                      <li key={index} className="text-sm flex items-start space-x-2">
                        <span className="text-blue-400 mt-1">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Confidence */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-600">
                  <span className="text-sm text-gray-400">Prediction Confidence</span>
                  <div className="flex items-center space-x-2">
                    <Progress value={selectedCard.confidence} className="w-24" />
                    <Badge 
                      variant="outline" 
                      className={`${getConfidenceColor(selectedCard.confidence)} border-current`}
                    >
                      {selectedCard.confidence}%
                    </Badge>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}; 