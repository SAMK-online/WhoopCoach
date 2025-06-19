import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Target, TrendingUp, TrendingDown, Clock, CheckCircle, AlertCircle, Zap, Heart, Moon, Brain, Lightbulb } from 'lucide-react';

interface GoalsProps {
  data: any[];
}

interface SmartGoal {
  id: string;
  name: string;
  current: number;
  baseline: number; // 30-day average for comparison
  target: number;
  unit: string;
  timeline: number; // days
  enabled: boolean;
  color: string;
  icon: React.ReactNode;
  improvementType: 'higher' | 'lower'; // higher is better vs lower is better
  suggestion: string;
  confidence: 'high' | 'medium' | 'low';
}

interface AIGoalPlan {
  summary: string;
  keyActions: string[];
  weeklyMilestones: string[]; // Now contains detailed week-by-week breakdown
  tips: string[];
}

export const Goals: React.FC<GoalsProps> = ({ data }) => {
  const [smartGoals, setSmartGoals] = useState<SmartGoal[]>([]);
  const [aiPlan, setAiPlan] = useState<AIGoalPlan | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [userNotes, setUserNotes] = useState('');

  // Calculate meaningful averages from data
  const calculateAverage = (metricKey: string, dayRange: number): number => {
    if (!data || data.length === 0) return 0;
    
    const relevantData = data.slice(0, Math.min(dayRange, data.length));
    const values = relevantData
      .map(row => parseFloat(row[metricKey]) || 0)
      .filter(val => val > 0);
    
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  };

  // Calculate trend direction
  const calculateTrend = (metricKey: string): 'improving' | 'declining' | 'stable' => {
    if (!data || data.length < 7) return 'stable';
    
    const recent = calculateAverage(metricKey, 7);
    const older = calculateAverage(metricKey.slice(7, 14) || metricKey, 7);
    
    const difference = Math.abs(recent - older);
    if (difference < 2) return 'stable';
    
    // Determine if change is improvement based on metric type
    const isHigherBetter = !metricKey.toLowerCase().includes('strain') && 
                          !metricKey.toLowerCase().includes('resting heart rate');
    
    if (isHigherBetter) {
      return recent > older ? 'improving' : 'declining';
    } else {
      return recent < older ? 'improving' : 'declining';
    }
  };

  // Generate smart goal suggestions based on actual data
  useEffect(() => {
    if (!data || data.length === 0) return;

    const goals: SmartGoal[] = [];

    // Recovery Score Goal
    const currentRecovery = calculateAverage('recovery score %', 7);
    const baselineRecovery = calculateAverage('recovery score %', 30);
    if (currentRecovery > 0) {
      const recoveryTrend = calculateTrend('recovery score %');
      const suggestedTarget = Math.min(95, Math.max(currentRecovery + 5, baselineRecovery + 10));
      
      goals.push({
        id: 'recovery',
        name: 'Recovery Score',
        current: Math.round(currentRecovery),
        baseline: Math.round(baselineRecovery),
        target: Math.round(suggestedTarget),
        unit: '%',
        timeline: 28,
        enabled: false,
        color: 'from-green-400 to-green-600',
        icon: <TrendingUp className="h-4 w-4" />,
        improvementType: 'higher',
        suggestion: recoveryTrend === 'improving' 
          ? `Great progress! Continue building on your ${currentRecovery.toFixed(0)}% average.`
          : `Focus on sleep and stress management to improve from ${currentRecovery.toFixed(0)}%.`,
        confidence: recoveryTrend === 'improving' ? 'high' : 'medium'
      });
    }

    // Sleep Performance Goal
    const currentSleep = calculateAverage('sleep performance %', 7);
    const baselineSleep = calculateAverage('sleep performance %', 30);
    if (currentSleep > 0) {
      const sleepTrend = calculateTrend('sleep performance %');
      const suggestedTarget = Math.min(95, Math.max(currentSleep + 5, baselineSleep + 8));
      
      goals.push({
        id: 'sleep',
        name: 'Sleep Performance',
        current: Math.round(currentSleep),
        baseline: Math.round(baselineSleep),
        target: Math.round(suggestedTarget),
        unit: '%',
        timeline: 21,
        enabled: false,
        color: 'from-blue-400 to-indigo-600',
        icon: <Moon className="h-4 w-4" />,
        improvementType: 'higher',
        suggestion: sleepTrend === 'improving'
          ? `Sleep quality trending up! Push toward ${suggestedTarget}% consistency.`
          : `Establish better sleep routine to improve from ${currentSleep.toFixed(0)}%.`,
        confidence: Math.abs(currentSleep - baselineSleep) > 3 ? 'high' : 'medium'
      });
    }

    // HRV Goal
    const currentHRV = calculateAverage('heart rate variability (ms)', 7);
    const baselineHRV = calculateAverage('heart rate variability (ms)', 30);
    if (currentHRV > 0) {
      const hrvTrend = calculateTrend('heart rate variability (ms)');
      const suggestedTarget = Math.round(Math.max(currentHRV + 3, baselineHRV + 5));
      
      goals.push({
        id: 'hrv',
        name: 'Heart Rate Variability',
        current: Math.round(currentHRV),
        baseline: Math.round(baselineHRV),
        target: suggestedTarget,
        unit: 'ms',
        timeline: 42,
        enabled: false,
        color: 'from-purple-400 to-pink-600',
        icon: <Heart className="h-4 w-4" />,
        improvementType: 'higher',
        suggestion: hrvTrend === 'improving'
          ? `HRV recovery improving! Target ${suggestedTarget}ms with consistent habits.`
          : `Focus on stress management and recovery to boost HRV from ${currentHRV.toFixed(0)}ms.`,
        confidence: currentHRV > 20 ? 'high' : 'medium'
      });
    }

    setSmartGoals(goals);
  }, [data]);

  // Calculate proper progress percentage
  const calculateProgress = (goal: SmartGoal): number => {
    if (goal.improvementType === 'higher') {
      // For metrics where higher is better
      if (goal.target <= goal.baseline) return 100; // Already at or above target
      return Math.max(0, Math.min(100, ((goal.current - goal.baseline) / (goal.target - goal.baseline)) * 100));
    } else {
      // For metrics where lower is better
      if (goal.target >= goal.baseline) return 100; // Already at or below target
      return Math.max(0, Math.min(100, ((goal.baseline - goal.current) / (goal.baseline - goal.target)) * 100));
    }
  };

  const updateGoal = (id: string, field: keyof SmartGoal, value: any) => {
    setSmartGoals(prev => prev.map(goal => 
      goal.id === id ? { ...goal, [field]: value } : goal
    ));
  };

  const getActiveGoals = () => smartGoals.filter(g => g.enabled);

  // Generate AI plan using actual OpenAI API with timeline-specific planning
  const generateAIPlan = async () => {
    const activeGoals = getActiveGoals();
    if (activeGoals.length === 0) {
      alert('Please select at least one goal to create a plan.');
      return;
    }

    setIsGeneratingPlan(true);
    
    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API key not configured');
      }

      // Calculate plan duration and phases
      const maxTimeline = Math.max(...activeGoals.map(g => g.timeline));
      const weeksInPlan = Math.ceil(maxTimeline / 7);
      
      // Prepare detailed context for AI
      const goalDetails = activeGoals.map(goal => {
        const weeksForGoal = Math.ceil(goal.timeline / 7);
        const weeklyProgress = ((goal.target - goal.current) / weeksForGoal).toFixed(1);
        const progressDirection = goal.improvementType === 'higher' ? 'increase' : 'decrease';
        
        return `${goal.name}: ${progressDirection} from ${goal.current}${goal.unit} to ${goal.target}${goal.unit} over ${weeksForGoal} weeks (need ~${weeklyProgress}${goal.unit} improvement per week, baseline was ${goal.baseline}${goal.unit})`;
      }).join('\n');

      // Parse user notes for specific activities or constraints
      const userActivities = userNotes.toLowerCase().includes('workout') || 
                           userNotes.toLowerCase().includes('training') || 
                           userNotes.toLowerCase().includes('exercise') ||
                           userNotes.toLowerCase().includes('run') ||
                           userNotes.toLowerCase().includes('gym');

      const userConstraints = userNotes.toLowerCase().includes('time') || 
                            userNotes.toLowerCase().includes('busy') || 
                            userNotes.toLowerCase().includes('work') ||
                            userNotes.toLowerCase().includes('limited');

      const userHealthIssues = userNotes.toLowerCase().includes('pain') || 
                             userNotes.toLowerCase().includes('injury') || 
                             userNotes.toLowerCase().includes('condition');

      // Create comprehensive prompt with timeline structure
      const prompt = `Create a detailed ${weeksInPlan}-week plan to achieve these health goals:

GOALS TO ACHIEVE:
${goalDetails}

USER CONTEXT: ${userNotes || 'No specific preferences mentioned.'}

PLAN REQUIREMENTS:
- Create exactly ${weeksInPlan} weekly phases with specific targets for each week
- Each week should build toward the final goals with measurable progress
- Consider that ${userActivities ? 'user has specific training/activity preferences' : 'user needs general activity recommendations'}
- Account for ${userConstraints ? 'time/schedule constraints mentioned' : 'normal schedule flexibility'}
- ${userHealthIssues ? 'Address mentioned health limitations carefully' : 'Assume no major health limitations'}

Please structure your response as:

SUMMARY: (2-3 sentences about the plan approach)

DAILY ACTIONS: (4-5 specific daily habits)

WEEKLY BREAKDOWN:
${Array.from({length: weeksInPlan}, (_, i) => {
  const weekNum = i + 1;
  const weekProgress = Math.round((weekNum / weeksInPlan) * 100);
  return `Week ${weekNum}: [Specific metric targets for this week, key focus areas, and 2-3 concrete actions to take. Include exact numbers where possible - aim for ${weekProgress}% overall progress]`;
}).join('\n')}

PRO TIPS: (3-4 practical insights)

IMPORTANT: For each week, provide specific metric targets (e.g., "Target 75% recovery score", "Aim for 7.5 hours sleep"), specific focus areas (e.g., "Focus on sleep consistency", "Emphasize recovery protocols"), and 2-3 concrete weekly actions (e.g., "Track bedtime within 30 minutes", "Add 15-min meditation before bed").`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert health coach specializing in Whoop data optimization and progressive goal achievement. Create structured, timeline-specific plans with measurable weekly targets.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 800,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate plan');
      }

      const result = await response.json();
      const planText = result.choices[0].message.content;

      // Enhanced parsing for timeline-specific structure
      const lines = planText.split('\n').filter(line => line.trim());
      
      let summary = '';
      const keyActions: string[] = [];
      const weeklyMilestones: string[] = [];
      const tips: string[] = [];
      
      let currentSection = '';
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        // Section detection
        if (trimmed.toLowerCase().includes('summary:')) {
          currentSection = 'summary';
          const summaryStart = trimmed.indexOf(':') + 1;
          if (summaryStart < trimmed.length) {
            summary += trimmed.substring(summaryStart).trim() + ' ';
          }
        } else if (trimmed.toLowerCase().includes('daily actions:') || trimmed.toLowerCase().includes('daily habits:')) {
          currentSection = 'actions';
        } else if (trimmed.toLowerCase().includes('weekly breakdown:') || trimmed.toLowerCase().includes('week ')) {
          currentSection = 'milestones';
          // If this line contains "Week X:", add it directly
          if (trimmed.toLowerCase().startsWith('week ') && trimmed.includes(':')) {
            weeklyMilestones.push(trimmed);
          }
        } else if (trimmed.toLowerCase().includes('pro tips:') || trimmed.toLowerCase().includes('tips:')) {
          currentSection = 'tips';
        } else {
          // Content for current section
          const cleanLine = trimmed.replace(/^\d+\.\s*/, '').replace(/^-\s*/, '').replace(/^\*\s*/, '');
          
          if (currentSection === 'summary' && summary.length < 300) {
            summary += cleanLine + ' ';
          } else if (currentSection === 'actions' && keyActions.length < 6) {
            if (cleanLine.length > 10) { // Filter out section headers
              keyActions.push(cleanLine);
            }
          } else if (currentSection === 'milestones') {
            // For weekly breakdown, capture Week X: lines and following content
            if (trimmed.toLowerCase().startsWith('week ') && trimmed.includes(':')) {
              weeklyMilestones.push(trimmed);
            } else if (weeklyMilestones.length > 0 && cleanLine.length > 10) {
              // Append details to the last week
              const lastIndex = weeklyMilestones.length - 1;
              weeklyMilestones[lastIndex] += ` ${cleanLine}`;
            }
          } else if (currentSection === 'tips' && tips.length < 5) {
            if (cleanLine.length > 10) {
              tips.push(cleanLine);
            }
          }
        }
      }

      // Enhanced fallback with timeline awareness
      if (!summary && !keyActions.length) {
        const sentences = planText.split('.').filter(s => s.trim());
        summary = sentences.slice(0, 2).join('.') + '.';
        
        // Extract actions and week-specific content
        for (let i = 2; i < sentences.length; i++) {
          const sentence = sentences[i].trim();
          if (sentence.toLowerCase().includes('week ')) {
            weeklyMilestones.push(sentence);
          } else if (keyActions.length < 5) {
            keyActions.push(sentence);
          }
        }
      }

      // Create detailed weekly milestones if parsing failed or insufficient content
      if (weeklyMilestones.length < weeksInPlan) {
        weeklyMilestones.length = 0; // Clear any partial results
        
        for (let week = 1; week <= weeksInPlan; week++) {
          const progressPercent = Math.round((week / weeksInPlan) * 100);
          const weeklyTargets: string[] = [];
          
          // Generate specific weekly targets for each active goal
          activeGoals.forEach(goal => {
            const weeklyProgress = (goal.target - goal.current) * (week / weeksInPlan);
            const weekTarget = Math.round(goal.current + weeklyProgress);
            weeklyTargets.push(`${goal.name}: ${weekTarget}${goal.unit}`);
          });
          
          // Create focus areas based on week progression
          let focusAreas: string[] = [];
          if (week === 1) {
            focusAreas = ['Establish baseline habits', 'Begin consistent tracking', 'Set up daily routines'];
          } else if (week <= Math.ceil(weeksInPlan / 2)) {
            focusAreas = ['Build momentum', 'Fine-tune daily habits', 'Address early challenges'];
          } else if (week < weeksInPlan) {
            focusAreas = ['Optimize strategies', 'Push toward targets', 'Maintain consistency'];
          } else {
            focusAreas = ['Achieve final targets', 'Solidify long-term habits', 'Plan for maintenance'];
          }
          
          // Create specific actions based on goals and user context
          let weeklyActions: string[] = [];
          if (activeGoals.some(g => g.id === 'sleep')) {
            if (week === 1) {
              weeklyActions.push('Track bedtime and wake time daily');
            } else if (week <= Math.ceil(weeksInPlan / 2)) {
              weeklyActions.push('Optimize sleep environment (temperature, darkness, quiet)');
            } else {
              weeklyActions.push('Fine-tune sleep routine for maximum quality');
            }
          }
          
          if (activeGoals.some(g => g.id === 'recovery')) {
            if (week === 1) {
              weeklyActions.push('Check recovery score every morning before activities');
            } else if (week <= Math.ceil(weeksInPlan / 2)) {
              weeklyActions.push('Adjust training intensity based on recovery trends');
            } else {
              weeklyActions.push('Maintain high recovery through optimized habits');
            }
          }
          
          if (activeGoals.some(g => g.id === 'hrv')) {
            if (week === 1) {
              weeklyActions.push('Practice 5-10 minutes daily breathing exercises');
            } else if (week <= Math.ceil(weeksInPlan / 2)) {
              weeklyActions.push('Add meditation or stress management techniques');
            } else {
              weeklyActions.push('Optimize stress response and recovery protocols');
            }
          }
          
          // Add user context-specific actions
          if (userNotes.toLowerCase().includes('time') || userNotes.toLowerCase().includes('busy')) {
            weeklyActions.push('Focus on high-impact, time-efficient strategies');
          }
          
          if (userNotes.toLowerCase().includes('workout') || userNotes.toLowerCase().includes('training')) {
            weeklyActions.push(`Week ${week} training: Balance intensity with recovery needs`);
          }
          
          // Ensure we have at least 2 actions per week
          while (weeklyActions.length < 2) {
            weeklyActions.push('Monitor daily progress and adjust as needed');
          }
          
          // Combine everything into a detailed weekly breakdown
          const weeklyDetail = `Week ${week}: Targets: [${weeklyTargets.join(', ')}] | Focus: ${focusAreas.slice(0, 2).join(', ')} | Actions: ${weeklyActions.slice(0, 2).join('; ')}`;
          weeklyMilestones.push(weeklyDetail);
        }
      }

      setAiPlan({
        summary: summary.trim() || `Structured ${weeksInPlan}-week plan to systematically achieve your selected health goals through progressive weekly targets.`,
        keyActions: keyActions.length ? keyActions : [
          'Track all metrics daily with consistent timing',
          'Follow progressive weekly targets as outlined', 
          'Adjust training intensity based on recovery scores',
          'Maintain consistent sleep schedule throughout plan',
          'Review weekly progress and adapt as needed'
        ],
        weeklyMilestones: weeklyMilestones.length ? weeklyMilestones : [
          'Week 1: Establish baseline habits and tracking consistency',
          'Week 2: Begin seeing initial improvements in target metrics',
          'Week 3+: Achieve and maintain target values'
        ],
        tips: tips.length ? tips : [
          'Focus on consistency over perfection in early weeks',
          'Adjust targets if progress is faster or slower than expected',
          'Use recovery scores to guide training intensity',
          'Celebrate weekly milestones to maintain motivation'
        ]
      });

    } catch (error) {
      console.error('Error generating AI plan:', error);
      alert('Failed to generate AI plan. Please check your OpenAI API key and try again.');
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const saveGoals = () => {
    const activeGoals = getActiveGoals();
    // Save to localStorage for now
    localStorage.setItem('whoopai_goals', JSON.stringify({
      goals: activeGoals,
      plan: aiPlan,
      createdAt: new Date().toISOString()
    }));
    alert(`Successfully saved ${activeGoals.length} goals!`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 border-blue-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Smart Goal Setting</span>
          </CardTitle>
          <CardDescription className="text-blue-200">
            AI-suggested goals based on your recent trends and data patterns
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Smart Goal Suggestions */}
      <div className="space-y-4">
        {smartGoals.map((goal) => (
          <Card key={goal.id} className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <input
                    type="checkbox"
                    checked={goal.enabled}
                    onChange={(e) => updateGoal(goal.id, 'enabled', e.target.checked)}
                    className="w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <div className={`p-3 rounded-lg bg-gradient-to-r ${goal.color}`}>
                    {goal.icon}
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg">{goal.name}</h3>
                    <p className="text-gray-300 text-sm">{goal.suggestion}</p>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className="text-gray-400 text-sm">
                        Baseline: <strong>{goal.baseline}{goal.unit}</strong>
                      </span>
                      <span className="text-white text-sm">
                        Current: <strong>{goal.current}{goal.unit}</strong>
                      </span>
                      <Badge variant={goal.confidence === 'high' ? 'default' : 'secondary'} className="text-xs">
                        {goal.confidence} confidence
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {goal.enabled && (
                <div className="space-y-4 pl-14">
                  {/* Target Slider */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-300 text-sm">
                        Target: <strong>{goal.target}{goal.unit}</strong>
                      </span>
                      <span className="text-gray-400 text-sm">
                        Timeline: {goal.timeline} days
                      </span>
                    </div>
                    <Slider
                      value={[goal.target]}
                      onValueChange={(value) => updateGoal(goal.id, 'target', value[0])}
                      min={Math.min(goal.baseline, goal.current)}
                      max={goal.improvementType === 'higher' ? 
                        Math.max(goal.current * 1.3, goal.baseline * 1.2) : 
                        Math.max(goal.baseline, goal.current)
                      }
                      step={goal.unit === '%' ? 1 : 0.5}
                      className="w-full"
                    />
                  </div>

                  {/* Timeline Slider */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-300 text-sm">Timeline: {goal.timeline} days</span>
                      <span className="text-gray-400 text-sm">2-12 weeks</span>
                    </div>
                    <Slider
                      value={[goal.timeline]}
                      onValueChange={(value) => updateGoal(goal.id, 'timeline', value[0])}
                      min={14}
                      max={84}
                      step={7}
                      className="w-full"
                    />
                  </div>

                  {/* Progress Display */}
                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-300 text-sm">Progress to Target</span>
                      <span className="text-white font-semibold">
                        {Math.round(calculateProgress(goal))}%
                      </span>
                    </div>
                    <Progress 
                      value={calculateProgress(goal)}
                      className="h-2"
                    />
                    <p className="text-xs text-gray-400 mt-2">
                      {calculateProgress(goal) < 25 
                        ? "Early stages - focus on building consistent habits"
                        : calculateProgress(goal) < 75
                        ? "Good progress - keep up the momentum!"
                        : "Excellent progress - you're nearly there!"
                      }
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Plan Generation */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <span>AI Action Plan</span>
          </CardTitle>
          <CardDescription>
            Generate a personalized plan to achieve your selected goals
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Any specific preferences or constraints? (e.g., limited time, specific activities, health conditions)"
            value={userNotes}
            onChange={(e) => setUserNotes(e.target.value)}
            className="bg-gray-700 border-gray-600 text-white"
            rows={2}
          />
          
          <div className="flex space-x-3">
            <Button
              onClick={generateAIPlan}
              disabled={isGeneratingPlan || getActiveGoals().length === 0}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600"
            >
              {isGeneratingPlan ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Generate AI Plan
                </>
              )}
            </Button>
            
            {aiPlan && getActiveGoals().length > 0 && (
              <Button
                onClick={saveGoals}
                variant="outline"
                className="border-green-600 text-green-400 hover:bg-green-900/20"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Save Goals
              </Button>
            )}
          </div>

          {getActiveGoals().length === 0 && (
            <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3">
              <p className="text-yellow-300 text-sm flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                Select at least one goal above to generate a personalized plan
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Generated Plan */}
      {aiPlan && (
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Your Personalized Action Plan</CardTitle>
            <CardDescription className="text-gray-300">
              {aiPlan.summary}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Key Actions */}
            <div>
              <h3 className="text-white font-semibold mb-3 flex items-center">
                <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
                Daily Actions
              </h3>
              <div className="grid gap-2">
                {aiPlan.keyActions.map((action, index) => (
                  <div key={index} className="flex items-start space-x-2 p-2 bg-gray-700/30 rounded">
                    <span className="text-green-400 mt-1">•</span>
                    <span className="text-gray-300 text-sm">{action}</span>
                  </div>
                ))}
              </div>
            </div>

                         {/* Weekly Breakdown */}
             <div>
               <h3 className="text-white font-semibold mb-3 flex items-center">
                 <Clock className="h-4 w-4 mr-2 text-blue-400" />
                 Weekly Timeline Breakdown
               </h3>
               <div className="grid gap-4">
                 {aiPlan.weeklyMilestones.map((milestone, index) => {
                   // Parse detailed weekly breakdown
                   const weekMatch = milestone.match(/Week (\d+):/);
                   const weekNum = weekMatch ? weekMatch[1] : (index + 1).toString();
                   
                   // Extract different sections if structured format is used
                   const targetsMatch = milestone.match(/Targets:\s*\[(.*?)\]/);
                   const focusMatch = milestone.match(/Focus:\s*(.*?)\s*\|/);
                   const actionsMatch = milestone.match(/Actions:\s*(.*?)$/);
                   
                   const targets = targetsMatch ? targetsMatch[1] : null;
                   const focus = focusMatch ? focusMatch[1] : null;
                   const actions = actionsMatch ? actionsMatch[1] : null;
                   
                   // If structured format found, display it nicely
                   if (targets || focus || actions) {
                     return (
                       <div key={index} className="bg-gray-700/40 rounded-lg p-4 border-l-4 border-blue-400">
                         <div className="mb-3">
                           <h4 className="text-blue-400 font-semibold text-base mb-1">Week {weekNum}</h4>
                         </div>
                         
                         {targets && (
                           <div className="mb-3">
                             <span className="text-green-400 font-medium text-sm">🎯 Targets: </span>
                             <span className="text-gray-300 text-sm">{targets}</span>
                           </div>
                         )}
                         
                         {focus && (
                           <div className="mb-3">
                             <span className="text-yellow-400 font-medium text-sm">🔍 Focus: </span>
                             <span className="text-gray-300 text-sm">{focus}</span>
                           </div>
                         )}
                         
                         {actions && (
                           <div>
                             <span className="text-purple-400 font-medium text-sm">⚡ Actions: </span>
                             <span className="text-gray-300 text-sm">{actions}</span>
                           </div>
                         )}
                       </div>
                     );
                   } else {
                     // Fallback to simple display for unstructured content
                     return (
                       <div key={index} className="bg-gray-700/40 rounded-lg p-4 border-l-4 border-blue-400">
                         <div className="flex items-start space-x-2">
                           <span className="text-blue-400 font-medium text-sm min-w-fit">
                             Week {weekNum}:
                           </span>
                           <span className="text-gray-300 text-sm">
                             {milestone.includes(':') ? milestone.split(':').slice(1).join(':').trim() : milestone}
                           </span>
                         </div>
                       </div>
                     );
                   }
                 })}
               </div>
             </div>

            {/* Tips */}
            <div>
              <h3 className="text-white font-semibold mb-3 flex items-center">
                <Lightbulb className="h-4 w-4 mr-2 text-yellow-400" />
                Pro Tips
              </h3>
              <div className="grid gap-2">
                {aiPlan.tips.map((tip, index) => (
                  <div key={index} className="flex items-start space-x-2 p-2 bg-gray-700/30 rounded">
                    <span className="text-yellow-400 mt-1">💡</span>
                    <span className="text-gray-300 text-sm">{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 