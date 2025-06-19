interface Goal {
  id: string;
  type: 'recovery' | 'sleep' | 'strain' | 'hrv' | 'custom';
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  timeframe: 'daily' | 'weekly' | 'monthly';
  targetDate?: string;
  isActive: boolean;
  progress: number; // 0-100%
  trend: 'improving' | 'declining' | 'stable';
  recommendations: string[];
  createdDate: string;
  lastUpdated: string;
}

interface GoalProgress {
  goalId: string;
  date: string;
  value: number;
  notes?: string;
}

export class GoalSetting {
  private goals: Goal[] = [];
  private progress: GoalProgress[] = [];
  private data: any[];

  constructor(data: any[]) {
    this.data = data;
    this.loadGoalsFromStorage();
  }

  // Create a new goal
  createGoal(
    type: Goal['type'], 
    title: string, 
    description: string, 
    targetValue: number, 
    unit: string, 
    timeframe: Goal['timeframe'],
    targetDate?: string
  ): Goal {
    const goal: Goal = {
      id: this.generateId(),
      type,
      title,
      description,
      targetValue,
      currentValue: this.getCurrentValue(type),
      unit,
      timeframe,
      targetDate,
      isActive: true,
      progress: 0,
      trend: 'stable',
      recommendations: [],
      createdDate: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    this.goals.push(goal);
    this.updateGoalProgress(goal);
    this.saveGoalsToStorage();
    
    return goal;
  }

  // Get suggested goals based on user's data
  getSuggestedGoals(): Partial<Goal>[] {
    const suggestions: Partial<Goal>[] = [];
    
    // Analyze current data to suggest improvements
    const currentRecovery = this.getCurrentValue('recovery');
    const currentSleep = this.getCurrentValue('sleep');
    const currentHRV = this.getCurrentValue('hrv');

    // Recovery goal suggestions
    if (currentRecovery < 70) {
      suggestions.push({
        type: 'recovery',
        title: 'Improve Recovery Score',
        description: 'Reach green recovery zone more consistently',
        targetValue: Math.min(80, currentRecovery + 15),
        unit: '%',
        timeframe: 'weekly'
      });
    }

    // Sleep goal suggestions  
    if (currentSleep < 85) {
      suggestions.push({
        type: 'sleep',
        title: 'Optimize Sleep Performance',
        description: 'Improve sleep efficiency and quality',
        targetValue: Math.min(90, currentSleep + 10),
        unit: '%',
        timeframe: 'weekly'
      });
    }

    // HRV improvement
    suggestions.push({
      type: 'hrv',
      title: 'Increase HRV',
      description: 'Build cardiovascular resilience',
      targetValue: Math.round(currentHRV * 1.1),
      unit: 'ms',
      timeframe: 'monthly'
    });

    // Sleep consistency
    const sleepData = this.getMetricData('sleep performance %');
    if (sleepData.length >= 7) {
      const variance = this.calculateVariance(sleepData.slice(0, 7));
      if (variance > 100) { // High sleep variance
        suggestions.push({
          type: 'sleep',
          title: 'Sleep Consistency',
          description: 'Maintain more consistent sleep schedule',
          targetValue: 85,
          unit: '% consistency',
          timeframe: 'weekly'
        });
      }
    }

    // Strain management
    const strainData = this.getMetricData('day strain');
    if (strainData.length >= 7) {
      const avgStrain = strainData.slice(0, 7).reduce((a, b) => a + b, 0) / 7;
      if (avgStrain > 15) {
        suggestions.push({
          type: 'strain',
          title: 'Manage Training Load',
          description: 'Balance high strain with adequate recovery',
          targetValue: 13,
          unit: 'avg strain',
          timeframe: 'weekly'
        });
      }
    }

    return suggestions;
  }

  // Update goal progress
  updateGoalProgress(goal: Goal): Goal {
    const currentValue = this.getCurrentValue(goal.type);
    const previousValue = goal.currentValue;
    
    goal.currentValue = currentValue;
    goal.lastUpdated = new Date().toISOString();

    // Calculate progress
    if (goal.type === 'strain') {
      // For strain, lower is often better (depending on goal)
      goal.progress = Math.max(0, Math.min(100, 
        ((goal.targetValue - currentValue) / (goal.targetValue - this.getBaselineValue(goal.type))) * 100
      ));
    } else {
      // For most metrics, higher is better
      goal.progress = Math.max(0, Math.min(100, 
        (currentValue / goal.targetValue) * 100
      ));
    }

    // Determine trend
    if (Math.abs(currentValue - previousValue) < 1) {
      goal.trend = 'stable';
    } else {
      const isImproving = goal.type === 'strain' ? 
        currentValue < previousValue : 
        currentValue > previousValue;
      goal.trend = isImproving ? 'improving' : 'declining';
    }

    // Generate recommendations
    goal.recommendations = this.generateRecommendations(goal);

    this.saveGoalsToStorage();
    return goal;
  }

  // Generate AI-powered recommendations for goal achievement
  private generateRecommendations(goal: Goal): string[] {
    const recommendations: string[] = [];
    
    switch (goal.type) {
      case 'recovery':
        if (goal.progress < 50) {
          recommendations.push(
            'Focus on sleep quality - aim for 7-9 hours nightly',
            'Reduce training intensity for 2-3 days',
            'Prioritize stress management and relaxation',
            'Stay hydrated and maintain good nutrition'
          );
        } else if (goal.progress < 80) {
          recommendations.push(
            'You\'re making good progress! Stay consistent',
            'Monitor strain vs recovery balance',
            'Consider adding recovery protocols (stretching, meditation)'
          );
        } else {
          recommendations.push(
            'Excellent progress! Maintain current habits',
            'You\'re in the green zone consistently',
            'Consider setting a more ambitious target'
          );
        }
        break;

      case 'sleep':
        if (goal.progress < 50) {
          recommendations.push(
            'Establish a consistent bedtime routine',
            'Optimize sleep environment (cool, dark, quiet)',
            'Avoid screens 1 hour before bed',
            'Limit caffeine after 2 PM'
          );
        } else if (goal.progress < 80) {
          recommendations.push(
            'Good improvement in sleep patterns',
            'Focus on sleep consistency and timing',
            'Track what affects your sleep quality'
          );
        } else {
          recommendations.push(
            'Outstanding sleep performance!',
            'Your sleep hygiene is excellent',
            'Consider helping others with sleep optimization'
          );
        }
        break;

      case 'hrv':
        if (goal.progress < 50) {
          recommendations.push(
            'Incorporate stress reduction techniques',
            'Ensure adequate recovery between workouts',
            'Consider breath work or meditation',
            'Focus on sleep quality and consistency'
          );
        } else {
          recommendations.push(
            'HRV is improving - great progress!',
            'Continue current recovery practices',
            'Your autonomic nervous system is adapting well'
          );
        }
        break;

      case 'strain':
        if (goal.progress < 50) {
          recommendations.push(
            'Plan more recovery days in your training',
            'Reduce intensity rather than volume initially',
            'Listen to your body\'s recovery signals',
            'Consider periodized training approach'
          );
        } else {
          recommendations.push(
            'Good balance of strain and recovery',
            'Your training load is becoming more sustainable',
            'Continue monitoring recovery metrics'
          );
        }
        break;
    }

    return recommendations;
  }

  // Get current value for a goal type
  private getCurrentValue(type: Goal['type']): number {
    if (this.data.length === 0) return 0;

    const latest = this.data[0];
    
    switch (type) {
      case 'recovery':
        return parseFloat(latest['recovery score %']) || 0;
      case 'sleep':
        return parseFloat(latest['sleep performance %']) || 0;
      case 'strain':
        return parseFloat(latest['day strain']) || 0;
      case 'hrv':
        return parseFloat(latest['heart rate variability (ms)']) || 0;
      default:
        return 0;
    }
  }

  // Get baseline value for progress calculation
  private getBaselineValue(type: Goal['type']): number {
    switch (type) {
      case 'recovery': return 30;
      case 'sleep': return 60;
      case 'strain': return 20;
      case 'hrv': return 20;
      default: return 0;
    }
  }

  // Get metric data helper
  private getMetricData(metricName: string): number[] {
    return this.data
      .map(row => parseFloat(row[metricName]))
      .filter(val => !isNaN(val));
  }

  // Calculate variance helper
  private calculateVariance(data: number[]): number {
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    return data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
  }

  // Get all active goals
  getActiveGoals(): Goal[] {
    return this.goals.filter(goal => goal.isActive);
  }

  // Get goal by ID
  getGoal(id: string): Goal | undefined {
    return this.goals.find(goal => goal.id === id);
  }

  // Update goal
  updateGoal(id: string, updates: Partial<Goal>): Goal | null {
    const goalIndex = this.goals.findIndex(goal => goal.id === id);
    if (goalIndex === -1) return null;

    this.goals[goalIndex] = { ...this.goals[goalIndex], ...updates, lastUpdated: new Date().toISOString() };
    this.saveGoalsToStorage();
    return this.goals[goalIndex];
  }

  // Delete goal
  deleteGoal(id: string): boolean {
    const goalIndex = this.goals.findIndex(goal => goal.id === id);
    if (goalIndex === -1) return false;

    this.goals.splice(goalIndex, 1);
    this.progress = this.progress.filter(p => p.goalId !== id);
    this.saveGoalsToStorage();
    return true;
  }

  // Update all goals with latest data
  updateAllGoals(): Goal[] {
    this.goals.forEach(goal => {
      if (goal.isActive) {
        this.updateGoalProgress(goal);
      }
    });
    return this.getActiveGoals();
  }

  // Get goal insights and analytics
  getGoalInsights(): {
    totalGoals: number;
    activeGoals: number;
    completedGoals: number;
    averageProgress: number;
    topPerformingGoal: Goal | null;
    needsAttention: Goal[];
  } {
    const activeGoals = this.getActiveGoals();
    const completedGoals = activeGoals.filter(goal => goal.progress >= 100);
    const averageProgress = activeGoals.length > 0 
      ? activeGoals.reduce((sum, goal) => sum + goal.progress, 0) / activeGoals.length 
      : 0;
    
    const topPerformingGoal = activeGoals.reduce((top, goal) => 
      top === null || goal.progress > top.progress ? goal : top, null as Goal | null);
    
    const needsAttention = activeGoals.filter(goal => 
      goal.progress < 30 || goal.trend === 'declining');

    return {
      totalGoals: this.goals.length,
      activeGoals: activeGoals.length,
      completedGoals: completedGoals.length,
      averageProgress: Math.round(averageProgress),
      topPerformingGoal,
      needsAttention
    };
  }

  // Storage methods
  private saveGoalsToStorage(): void {
    try {
      localStorage.setItem('whoopai_goals', JSON.stringify(this.goals));
      localStorage.setItem('whoopai_progress', JSON.stringify(this.progress));
    } catch (error) {
      console.error('Failed to save goals to localStorage:', error);
    }
  }

  private loadGoalsFromStorage(): void {
    try {
      const savedGoals = localStorage.getItem('whoopai_goals');
      const savedProgress = localStorage.getItem('whoopai_progress');
      
      if (savedGoals) {
        this.goals = JSON.parse(savedGoals);
      }
      if (savedProgress) {
        this.progress = JSON.parse(savedProgress);
      }
    } catch (error) {
      console.error('Failed to load goals from localStorage:', error);
      this.goals = [];
      this.progress = [];
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
} 