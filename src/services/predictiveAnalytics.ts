interface PredictionResult {
  type: 'recovery' | 'sleep_debt' | 'performance' | 'injury_risk';
  prediction: number;
  confidence: number;
  timeframe: string;
  reasoning: string;
  recommendations: string[];
}

interface TrendAnalysis {
  metric: string;
  trend: 'improving' | 'declining' | 'stable';
  changeRate: number;
  significance: number;
}

export class PredictiveAnalytics {
  private data: any[];

  constructor(data: any[]) {
    this.data = data.slice(0, 30); // Use last 30 days for predictions
  }

  // Main prediction engine
  generatePredictions(): PredictionResult[] {
    const predictions: PredictionResult[] = [];

    predictions.push(this.predictRecoveryScore());
    predictions.push(this.predictSleepDebt());
    predictions.push(this.predictPerformanceReadiness());
    predictions.push(this.assessInjuryRisk());

    return predictions.filter(p => p.confidence > 0.6); // Only show confident predictions
  }

  // Predict tomorrow's recovery score based on recent patterns
  private predictRecoveryScore(): PredictionResult {
    const recoveryData = this.getMetricData('recovery score %');
    const strainData = this.getMetricData('day strain');
    const sleepData = this.getMetricData('sleep performance %');

    if (recoveryData.length < 7) {
      return {
        type: 'recovery',
        prediction: 0,
        confidence: 0,
        timeframe: 'tomorrow',
        reasoning: 'Insufficient data',
        recommendations: []
      };
    }

    // Calculate recent trend
    const recentRecovery = recoveryData.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    const weeklyAvg = recoveryData.slice(0, 7).reduce((a, b) => a + b, 0) / 7;
    
    // Factor in recent strain impact
    const recentStrain = strainData.length > 0 ? strainData.slice(0, 2).reduce((a, b) => a + b, 0) / 2 : 10;
    const recentSleep = sleepData.length > 0 ? sleepData.slice(0, 2).reduce((a, b) => a + b, 0) / 2 : 80;

    // Prediction algorithm
    let predicted = weeklyAvg;
    
    // Adjust for recent strain (high strain typically lowers next-day recovery)
    if (recentStrain > 15) predicted -= 10;
    else if (recentStrain > 12) predicted -= 5;
    else if (recentStrain < 8) predicted += 3;

    // Adjust for sleep quality
    if (recentSleep < 70) predicted -= 8;
    else if (recentSleep > 85) predicted += 5;

    // Apply trend momentum
    const trendMomentum = (recentRecovery - weeklyAvg) * 0.3;
    predicted += trendMomentum;

    predicted = Math.max(10, Math.min(100, predicted));

    const confidence = this.calculateConfidence(recoveryData, strainData, sleepData);

    let recommendations = [];
    if (predicted < 50) {
      recommendations = [
        'Consider a rest day or light activity',
        'Prioritize quality sleep tonight',
        'Focus on hydration and nutrition'
      ];
    } else if (predicted > 80) {
      recommendations = [
        'Good day for higher intensity training',
        'Your body is ready for challenge',
        'Maintain current recovery practices'
      ];
    } else {
      recommendations = [
        'Moderate training intensity recommended',
        'Monitor how you feel during activity',
        'Focus on recovery practices'
      ];
    }

    return {
      type: 'recovery',
      prediction: Math.round(predicted),
      confidence,
      timeframe: 'tomorrow',
      reasoning: `Based on your recent recovery trend (${recentRecovery.toFixed(1)}%), strain patterns (${recentStrain.toFixed(1)}), and sleep quality (${recentSleep.toFixed(1)}%)`,
      recommendations
    };
  }

  // Predict sleep debt accumulation
  private predictSleepDebt(): PredictionResult {
    const sleepNeedData = this.getMetricData('sleep need (min)');
    const sleepDurationData = this.getMetricData('asleep duration (min)');
    const sleepDebtData = this.getMetricData('sleep debt (min)');

    if (sleepNeedData.length < 5 || sleepDurationData.length < 5) {
      return {
        type: 'sleep_debt',
        prediction: 0,
        confidence: 0,
        timeframe: 'current',
        reasoning: 'Insufficient sleep data',
        recommendations: []
      };
    }

    // Get most recent actual sleep debt if available
    const currentDebt = sleepDebtData.length > 0 ? sleepDebtData[0] : 0;
    
    // Calculate daily deficits for the last 7 days
    let weeklyDeficits = [];
    const maxDays = Math.min(7, sleepNeedData.length, sleepDurationData.length);
    
    for (let i = 0; i < maxDays; i++) {
      const dailyDeficit = sleepNeedData[i] - sleepDurationData[i];
      weeklyDeficits.push(dailyDeficit);
    }
    
    // If we have actual debt data, use it; otherwise calculate from deficits
    let actualCurrentDebt = currentDebt;
    if (currentDebt === 0 && weeklyDeficits.length > 0) {
      // Calculate cumulative debt from daily deficits
      actualCurrentDebt = weeklyDeficits.reduce((total, deficit) => total + deficit, 0);
    }
    
    // Calculate recent trend (last 3 days vs previous 4 days)
    const recentDeficit = weeklyDeficits.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    const avgDeficit = weeklyDeficits.reduce((a, b) => a + b, 0) / weeklyDeficits.length;
    
    // Project debt in 1 week based on recent pattern
    const projectedDebtInWeek = actualCurrentDebt + (recentDeficit * 7);

    const confidence = this.calculateConfidence(sleepNeedData, sleepDurationData);

    // More accurate current debt assessment
    let recommendations = [];
    const currentDebtHours = actualCurrentDebt / 60;
    const projectedDebtHours = projectedDebtInWeek / 60;
    
    if (Math.abs(actualCurrentDebt) < 30) { // Less than 30 minutes debt/surplus
      recommendations = [
        'Excellent sleep balance! 🎯',
        'You\'re meeting your sleep needs consistently',
        'Maintain your current sleep schedule',
        'Continue prioritizing sleep quality'
      ];
    } else if (actualCurrentDebt > 120) { // 2+ hours debt
      recommendations = [
        'Significant sleep debt accumulated ⚠️',
        'Prioritize earlier bedtime this week',
        'Consider catching up with longer weekend sleep',
        'Focus on sleep quality optimization'
      ];
    } else if (actualCurrentDebt > 60) { // 1+ hour debt
      recommendations = [
        'Moderate sleep debt building up 📈',
        'Aim for 30-60 minutes earlier bedtime',
        'Maintain consistent sleep schedule',
        'Monitor sleep efficiency'
      ];
    } else if (actualCurrentDebt < -60) { // Sleep surplus
      recommendations = [
        'Great sleep surplus! 💪',
        'You\'re banking extra recovery time',
        'Maintain current excellent habits',
        'Consider how this affects your energy levels'
      ];
    } else {
      recommendations = [
        'Minor sleep debt - manageable 👍',
        'Small adjustments to bedtime can help',
        'Focus on sleep consistency',
        'Monitor for quality over quantity'
      ];
    }

    return {
      type: 'sleep_debt',
      prediction: Math.round(projectedDebtInWeek),
      confidence,
      timeframe: 'current & 1 week projection',
      reasoning: `Current debt: ${currentDebtHours >= 0 ? '+' : ''}${currentDebtHours.toFixed(1)}h. Recent avg deficit: ${(recentDeficit/60).toFixed(1)}h/day. Projected: ${projectedDebtHours >= 0 ? '+' : ''}${projectedDebtHours.toFixed(1)}h`,
      recommendations
    };
  }

  // Predict performance readiness
  private predictPerformanceReadiness(): PredictionResult {
    const recoveryData = this.getMetricData('recovery score %');
    const hrvData = this.getMetricData('heart rate variability (ms)');
    const strainData = this.getMetricData('day strain');

    if (recoveryData.length < 5) {
      return {
        type: 'performance',
        prediction: 0,
        confidence: 0,
        timeframe: 'next 3 days',
        reasoning: 'Insufficient performance data',
        recommendations: []
      };
    }

    const avgRecovery = recoveryData.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
    const hrvTrend = hrvData.length >= 5 ? this.calculateTrend(hrvData.slice(0, 5)) : 0;
    const recentStrain = strainData.slice(0, 3).reduce((a, b) => a + b, 0) / 3;

    // Performance readiness score (0-100)
    let readiness = avgRecovery;
    
    // Adjust for HRV trend
    if (hrvTrend > 0.1) readiness += 5; // HRV improving
    else if (hrvTrend < -0.1) readiness -= 5; // HRV declining

    // Adjust for strain load
    if (recentStrain > 16) readiness -= 10; // High recent strain
    else if (recentStrain < 9) readiness += 5; // Low recent strain

    readiness = Math.max(0, Math.min(100, readiness));

    const confidence = this.calculateConfidence(recoveryData, hrvData, strainData);

    let recommendations = [];
    if (readiness > 80) {
      recommendations = [
        'Excellent performance window',
        'Consider peak intensity training',
        'Your body is primed for performance'
      ];
    } else if (readiness > 60) {
      recommendations = [
        'Good for moderate-high intensity',
        'Listen to your body during training',
        'Maintain current recovery practices'
      ];
    } else {
      recommendations = [
        'Focus on active recovery',
        'Avoid high intensity training',
        'Prioritize sleep and nutrition'
      ];
    }

    return {
      type: 'performance',
      prediction: Math.round(readiness),
      confidence,
      timeframe: 'next 3 days',
      reasoning: `Recovery trend: ${avgRecovery.toFixed(1)}%, HRV trend: ${hrvTrend > 0 ? 'improving' : 'stable'}, Recent strain: ${recentStrain.toFixed(1)}`,
      recommendations
    };
  }

  // Assess injury risk based on strain/recovery imbalance
  private assessInjuryRisk(): PredictionResult {
    const recoveryData = this.getMetricData('recovery score %');
    const strainData = this.getMetricData('day strain');
    const hrvData = this.getMetricData('heart rate variability (ms)');

    if (recoveryData.length < 7 || strainData.length < 7) {
      return {
        type: 'injury_risk',
        prediction: 0,
        confidence: 0,
        timeframe: 'next 2 weeks',
        reasoning: 'Insufficient data for injury risk assessment',
        recommendations: []
      };
    }

    // Calculate strain-recovery imbalance
    let riskScore = 0;
    
    // Check for consecutive days of high strain with low recovery
    let consecutiveRiskDays = 0;
    for (let i = 0; i < Math.min(7, recoveryData.length, strainData.length); i++) {
      if (strainData[i] > 14 && recoveryData[i] < 50) {
        consecutiveRiskDays++;
        riskScore += 15;
      } else {
        consecutiveRiskDays = 0;
      }
    }

    // Bonus risk for consecutive days
    if (consecutiveRiskDays >= 3) riskScore += 25;

    // Check HRV trend (declining HRV = higher risk)
    const hrvTrend = hrvData.length >= 7 ? this.calculateTrend(hrvData.slice(0, 7)) : 0;
    if (hrvTrend < -0.15) riskScore += 20;

    // Check for sudden strain spikes
    const recentStrainAvg = strainData.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    const weeklyStrainAvg = strainData.slice(0, 7).reduce((a, b) => a + b, 0) / 7;
    if (recentStrainAvg > weeklyStrainAvg * 1.3) riskScore += 15;

    riskScore = Math.min(100, riskScore);

    const confidence = this.calculateConfidence(recoveryData, strainData, hrvData);

    let recommendations = [];
    if (riskScore > 70) {
      recommendations = [
        'HIGH INJURY RISK - Consider rest days',
        'Focus heavily on recovery protocols',
        'Avoid high-intensity training',
        'Consider consulting a healthcare provider'
      ];
    } else if (riskScore > 40) {
      recommendations = [
        'Moderate injury risk detected',
        'Increase recovery focus',
        'Reduce training intensity temporarily',
        'Monitor for pain or unusual fatigue'
      ];
    } else {
      recommendations = [
        'Low injury risk',
        'Current training load appears sustainable',
        'Continue monitoring strain-recovery balance'
      ];
    }

    return {
      type: 'injury_risk',
      prediction: Math.round(riskScore),
      confidence,
      timeframe: 'next 2 weeks',
      reasoning: `${consecutiveRiskDays} consecutive high-risk days, HRV trend: ${hrvTrend < 0 ? 'declining' : 'stable'}, strain pattern analysis`,
      recommendations
    };
  }

  // Helper methods
  private getMetricData(metricName: string): number[] {
    return this.data
      .map(row => parseFloat(row[metricName]))
      .filter(val => !isNaN(val));
  }

  private calculateTrend(data: number[]): number {
    if (data.length < 3) return 0;
    
    const n = data.length;
    const sumX = data.reduce((sum, _, i) => sum + i, 0);
    const sumY = data.reduce((sum, val) => sum + val, 0);
    const sumXY = data.reduce((sum, val, i) => sum + (i * val), 0);
    const sumXX = data.reduce((sum, _, i) => sum + (i * i), 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }

  private calculateConfidence(
    ...datasets: number[][]
  ): number {
    const totalDataPoints = datasets.reduce((sum, data) => sum + data.length, 0);
    const avgDataPoints = totalDataPoints / datasets.length;
    
    // Base confidence on data availability and consistency
    let confidence = Math.min(0.9, avgDataPoints / 14); // Max confidence with 14+ days of data
    
    // Reduce confidence for high variance
    datasets.forEach(data => {
      if (data.length > 3) {
        const variance = this.calculateVariance(data.slice(0, 7));
        const mean = data.slice(0, 7).reduce((a, b) => a + b, 0) / data.slice(0, 7).length;
        const cv = variance / mean; // Coefficient of variation
        if (cv > 0.3) confidence *= 0.8; // High variance reduces confidence
      }
    });

    return Math.max(0.5, Math.min(0.95, confidence));
  }

  private calculateVariance(data: number[]): number {
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    return variance;
  }

  // Get trend analysis for key metrics
  getTrendAnalysis(): TrendAnalysis[] {
    const metrics = [
      'recovery score %',
      'sleep performance %',
      'heart rate variability (ms)',
      'day strain',
      'resting heart rate (bpm)'
    ];

    return metrics.map(metric => {
             const data = this.getMetricData(metric);
       if (data.length < 7) {
         return {
           metric,
           trend: 'stable' as const,
           changeRate: 0,
           significance: 0
         };
       }

             const trend = this.calculateTrend(data.slice(0, 14));
       const recentAvg = data.slice(0, 7).reduce((a, b) => a + b, 0) / 7;
       const changeRate = (trend * 7) / recentAvg * 100; // Weekly change percentage

       let trendDirection: 'improving' | 'declining' | 'stable' = 'stable';
       const significance = Math.abs(changeRate);

       if (significance > 5) {
         // For metrics where higher is better
         if (['recovery score %', 'sleep performance %', 'heart rate variability (ms)'].includes(metric)) {
           trendDirection = changeRate > 0 ? 'improving' : 'declining';
         }
         // For metrics where lower is better  
         else if (['day strain', 'resting heart rate (bpm)'].includes(metric)) {
           trendDirection = changeRate < 0 ? 'improving' : 'declining';
         }
       }

       return {
         metric,
         trend: trendDirection as 'improving' | 'declining' | 'stable',
         changeRate: Math.round(changeRate * 10) / 10,
         significance: Math.round(significance * 10) / 10
       };
    }).filter(analysis => analysis.significance > 2); // Only show significant trends
  }
} 