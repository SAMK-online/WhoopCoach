interface DataPoint {
  content: string;
  metadata: {
    date?: string;
    metric: string;
    value: string;
    source: string;
    recency?: number;
  };
}

interface RAGContext {
  relevantData: DataPoint[];
  summary: string;
}

export class RAGService {
  private knowledgeBase: DataPoint[] = [];
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || import.meta.env.VITE_OPENAI_API_KEY || '';
  }

  // Build knowledge base from uploaded CSV data
  buildKnowledgeBase(csvData: any[], dynamicMetrics: any[]): void {
    console.log('🏗️ Building RAG knowledge base from CSV data...');
    this.knowledgeBase = [];

    // Process CSV data into searchable chunks (reverse order so most recent is first)
    csvData.forEach((row, index) => {
      Object.keys(row).forEach(key => {
        if (key === '_source_file') return;
        
        const value = row[key];
        if (value && value.toString().trim() !== '') {
          // Add context about recency for the first few data points
          let timeContext = '';
          if (index === 0) {
            timeContext = 'most recently';
          } else if (index === 1) {
            timeContext = 'recently';
          } else if (index < 7) {
            timeContext = 'in recent days';
          }
          
          // Format sleep duration values to hours and minutes
          let formattedValue = value.toString();
          const keyLower = key.toLowerCase();
          if ((keyLower.includes('sleep') && keyLower.includes('duration')) || 
              keyLower.includes('asleep duration') || 
              keyLower.includes('awake duration') ||
              keyLower.includes('in bed duration') ||
              keyLower.includes('light sleep') ||
              keyLower.includes('deep') ||
              keyLower.includes('rem') ||
              keyLower.includes('sleep need') ||
              keyLower.includes('sleep debt')) {
            const minutes = parseFloat(value);
            if (!isNaN(minutes)) {
              const hours = Math.floor(minutes / 60);
              const mins = Math.round(minutes % 60);
              formattedValue = `${hours}h ${mins}m`;
            }
          }
          
          const content = timeContext 
            ? `${timeContext}, your ${key} was ${formattedValue}`
            : `On ${row.date || `day ${index + 1}`}, your ${key} was ${formattedValue}`;
          
          this.knowledgeBase.push({
            content,
            metadata: {
              date: row.date || `day ${index + 1}`,
              metric: key,
              value: formattedValue,
              source: row._source_file || 'csv_data',
              recency: index // Add recency indicator
            }
          });
        }
      });
    });

    // Add dynamic metrics summary
    dynamicMetrics.forEach(metric => {
      this.knowledgeBase.push({
        content: `Your current ${metric.title} is ${metric.value} - ${metric.subtitle}`,
        metadata: {
          metric: metric.title,
          value: metric.value,
          source: 'current_metrics',
          recency: -1 // Highest priority for current metrics
        }
      });
    });

    // Add detailed sleep debt analysis for more accurate responses
    const sleepDebtEntries = csvData.filter(record => 
      record['sleep debt (min)'] !== undefined && record['sleep debt (min)'] !== null && record['sleep debt (min)'] !== ''
    ).slice(0, 7); // Last 7 days
    
    if (sleepDebtEntries.length > 0) {
      sleepDebtEntries.forEach((record, index) => {
        const debtMinutes = parseFloat(record['sleep debt (min)']) || 0;
        const debtHours = Math.abs(debtMinutes) / 60;
        const debtStatus = debtMinutes > 60 ? 'significant debt' : 
                          debtMinutes > 30 ? 'moderate debt' : 
                          debtMinutes > -30 ? 'balanced' : 
                          debtMinutes > -60 ? 'slight surplus' : 'significant surplus';
        
        const timeRef = index === 0 ? 'most recent night' : `${index} ${index === 1 ? 'day' : 'days'} ago`;
        
        this.knowledgeBase.push({
          content: `Sleep debt ${timeRef}: ${debtMinutes >= 0 ? '+' : ''}${debtHours.toFixed(1)} hours (${debtStatus})`,
          metadata: {
            metric: 'Sleep Debt Analysis',
            value: debtMinutes.toString(),
            source: 'sleep_debt_tracking',
            recency: index,
            date: record.date
          }
        });
      });
      
      // Add sleep debt trend summary
      const totalDebt = sleepDebtEntries.reduce((sum, record) => sum + (parseFloat(record['sleep debt (min)']) || 0), 0);
      const avgDailyDebt = totalDebt / sleepDebtEntries.length;
      const trendStatus = avgDailyDebt > 30 ? 'accumulating debt' : 
                         avgDailyDebt > -30 ? 'maintaining balance' : 'building surplus';
      
      this.knowledgeBase.push({
        content: `Sleep debt 7-day trend: ${(totalDebt/60).toFixed(1)} hours total, ${(avgDailyDebt/60).toFixed(1)} hours average daily (${trendStatus})`,
        metadata: {
          metric: 'Sleep Debt Trend',
          value: totalDebt.toString(),
          source: 'sleep_debt_analysis',
          recency: 0
        }
      });
    }

    // Log knowledge base statistics
    const sourceStats = this.knowledgeBase.reduce((acc, dp) => {
      acc[dp.metadata.source] = (acc[dp.metadata.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log(`📚 RAG Knowledge base built with ${this.knowledgeBase.length} data points`);
    console.log(`📊 Data sources in knowledge base:`, sourceStats);
    
    // Log sample data points from each source
    Object.keys(sourceStats).forEach(source => {
      const samplePoint = this.knowledgeBase.find(dp => dp.metadata.source === source);
      console.log(`   📝 Sample from ${source}: ${samplePoint?.content.substring(0, 100)}...`);
    });
  }

  // Simple keyword-based retrieval (can be enhanced with embeddings later)
  retrieveRelevantData(query: string, maxResults: number = 10): DataPoint[] {
    console.log(`🔍 RAG RETRIEVAL - Query: "${query}"`);
    const queryLower = query.toLowerCase();
    
    // Enhanced keyword mapping for better retrieval
    const expandQuery = (query: string): string[] => {
      const words = query.toLowerCase().split(/\s+/);
      const expandedWords = [...words];
      
      // Sleep-related expansions
      if (words.some(w => ['sleep', 'sleeping', 'slept', 'rest', 'bed'].includes(w))) {
        expandedWords.push('sleep', 'asleep', 'duration', 'efficiency', 'performance', 'rem', 'deep', 'light', 'awake', 'bed');
      }
      
      // Sleep debt specific expansions
      if (words.some(w => ['debt', 'owe', 'deficit', 'behind', 'surplus', 'excess'].includes(w))) {
        expandedWords.push('debt', 'deficit', 'surplus', 'need', 'owe', 'behind', 'excess', 'balance');
      }
      
      // Recovery-related expansions
      if (words.some(w => ['recovery', 'recover', 'readiness', 'ready'].includes(w))) {
        expandedWords.push('recovery', 'score', 'hrv', 'variability', 'resting');
      }
      
      // Strain/activity expansions
      if (words.some(w => ['strain', 'workout', 'exercise', 'activity', 'training'].includes(w))) {
        expandedWords.push('strain', 'day', 'exertion', 'calories', 'burned', 'energy');
      }
      
      // Heart rate expansions
      if (words.some(w => ['heart', 'hr', 'bpm', 'pulse'].includes(w))) {
        expandedWords.push('heart', 'rate', 'bpm', 'resting', 'average', 'max', 'hrv', 'variability');
      }
      
      return [...new Set(expandedWords)]; // Remove duplicates
    };
    
    const expandedQuery = expandQuery(queryLower);
    console.log(`🔍 Expanded query terms:`, expandedQuery);
    
    // Detect temporal references for prioritizing recent data
    const temporalReferences = ['last night', 'yesterday', 'today', 'most recent', 'latest', 'current', 'now'];
    const isTemporalQuery = temporalReferences.some(ref => queryLower.includes(ref));
    console.log(`⏰ Temporal query detected: ${isTemporalQuery}`);
    
    // Score data points based on enhanced keyword matches
    const scoredData = this.knowledgeBase.map(dataPoint => {
      let score = 0;
      const content = dataPoint.content.toLowerCase();
      const metric = dataPoint.metadata.metric.toLowerCase();
      
      // Enhanced keyword matching
      expandedQuery.forEach(word => {
        if (content.includes(word)) score += 2;
        if (metric.includes(word)) score += 3;
        
        // Exact word matches get higher scores
        const contentWords = content.split(/\s+/);
        const metricWords = metric.split(/\s+/);
        if (contentWords.includes(word)) score += 1;
        if (metricWords.includes(word)) score += 2;
      });
      
      // MASSIVE boost for sleep debt specific queries
      if (queryLower.includes('sleep debt') && dataPoint.metadata.source === 'sleep_debt_tracking') {
        score += 50; // Highest priority for sleep debt data
      }
      if (queryLower.includes('sleep debt') && dataPoint.metadata.source === 'sleep_debt_analysis') {
        score += 45; // High priority for sleep debt trends
      }
      
      // Boost recent data
      if (dataPoint.metadata.source === 'current_metrics') score += 5;
      if (dataPoint.metadata.recency !== undefined && dataPoint.metadata.recency < 3) score += 3;
      
      // MAJOR boost for most recent data when temporal query is detected
      if (isTemporalQuery && dataPoint.metadata.recency !== undefined) {
        if (dataPoint.metadata.recency === 0) {
          score += 20; // Highest priority for most recent data
          console.log(`🎯 Boosting most recent data: ${dataPoint.metadata.metric}`);
        } else if (dataPoint.metadata.recency === 1) {
          score += 10; // Second highest for yesterday
        } else if (dataPoint.metadata.recency === 2) {
          score += 5; // Third for day before
        }
      }
      
      return { dataPoint, score };
    });

    // Sort by relevance and return top results
    const relevantData = scoredData
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map(item => item.dataPoint);

    // Log detailed retrieval information
    console.log(`📊 RETRIEVED ${relevantData.length} relevant data points:`);
    relevantData.forEach((dataPoint, index) => {
      console.log(`  ${index + 1}. Source: ${dataPoint.metadata.source} | Metric: ${dataPoint.metadata.metric} | Date: ${dataPoint.metadata.date || 'N/A'}`);
      console.log(`     Content: ${dataPoint.content}`);
    });

    const sourceCounts = relevantData.reduce((acc, dp) => {
      acc[dp.metadata.source] = (acc[dp.metadata.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log(`📈 Data Sources Used:`, sourceCounts);
    
    return relevantData;
  }

  // Generate context for GPT-4o
  async generateRAGContext(query: string): Promise<RAGContext> {
    console.log(`🧠 GENERATING RAG CONTEXT for query: "${query}"`);
    const relevantData = this.retrieveRelevantData(query, 8);
    
    // Create summary of relevant data
    const dataByMetric = relevantData.reduce((acc, data) => {
      const metric = data.metadata.metric;
      if (!acc[metric]) acc[metric] = [];
      acc[metric].push(data);
      return acc;
    }, {} as Record<string, DataPoint[]>);

    let summary = "Relevant data from your health records:\n\n";
    
    Object.keys(dataByMetric).forEach(metric => {
      const dataPoints = dataByMetric[metric];
      summary += `**${metric}:**\n`;
      dataPoints.forEach(point => {
        summary += `- ${point.content} (Source: ${point.metadata.source})\n`;
      });
      summary += '\n';
    });

    console.log(`📋 RAG CONTEXT SUMMARY:\n${summary}`);
    
    return {
      relevantData,
      summary: summary.trim()
    };
  }

  // Enhanced AI response with RAG context
  async generateRAGResponse(query: string, signal?: AbortSignal, metricContext?: { id: string, title: string, value: string }): Promise<string> {
    console.log(`🤖 GENERATING AI RESPONSE for query: "${query}"`);
    
    if (!this.apiKey.trim()) {
      console.log(`❌ No OpenAI API key found`);
      return "Please set your OpenAI API key in the .env file! 🔑";
    }

    // Check if this is casual conversation that doesn't need health data analysis
    const casualGreetings = ['hey coach', 'hello coach', 'hi coach', 'hey there', 'hello there', 'hi there', 'sup', 'yo', 'what\'s up', 'good morning', 'good afternoon', 'good evening'];
    const exactGreetings = ['hey', 'hello', 'hi'];
    const gratitudeExpressions = ['thank you', 'thanks', 'thank you coach', 'thanks coach', 'appreciate it', 'much appreciated'];
    const acknowledgments = ['ok', 'okay', 'got it', 'understood', 'sounds good', 'cool', 'nice', 'awesome', 'great', 'perfect'];
    const farewells = ['bye', 'goodbye', 'see you', 'talk later', 'catch you later', 'bye coach', 'goodbye coach'];
    
    const queryLower = query.toLowerCase().trim();
    const isExactGreeting = exactGreetings.includes(queryLower);
    const isCasualGreeting = casualGreetings.some(greeting => queryLower === greeting);
    const isGratitude = gratitudeExpressions.some(expr => queryLower === expr);
    const isAcknowledgment = acknowledgments.some(ack => queryLower === ack);
    const isFarewell = farewells.some(farewell => queryLower === farewell);
    
    // Only treat as health question if it contains health-related keywords
    const healthKeywords = ['sleep', 'recovery', 'strain', 'heart', 'hrv', 'performance', 'health', 'data', 'metrics', 'score', 'last night', 'today', 'yesterday', 'week', 'month', 'how am i', 'how is my', 'what about my', 'tell me about', 'analyze', 'show me'];
    const containsHealthKeywords = healthKeywords.some(keyword => queryLower.includes(keyword));
    
    const isCasualConversation = (isExactGreeting || isCasualGreeting || isGratitude || isAcknowledgment || isFarewell) && !containsHealthKeywords;

    if (isCasualConversation) {
      let responses = [];
      
      if (isGratitude) {
        responses = [
          "You're very welcome! 😊 Our mission at WHOOP is to unlock human performance and Healthspan. Keep optimizing! 💪",
          "My pleasure! 🙌 Remember, our mission at WHOOP is to unlock human performance and Healthspan. Stay healthy!",
          "Glad I could help! 💪 Our mission at WHOOP is to unlock human performance and Healthspan - and you're living it! 🌟",
          "You're welcome! 😊 Keep working toward unlocking your human performance and Healthspan. That's what we're here for! 🚀"
        ];
      } else if (isAcknowledgment) {
        responses = [
          "Great! 👍 Anything else you'd like to explore about your health data?",
          "Perfect! 😊 Let me know if you have more questions about your metrics.",
          "Awesome! 🚀 I'm here if you need more insights.",
          "Sounds good! 💯 Feel free to ask about any other health topics.",
          "Cool! 🎯 What else would you like to know about your Whoop data?"
        ];
      } else if (isFarewell) {
        responses = [
          "Take care! 👋 Our mission at WHOOP is to unlock human performance and Healthspan - keep living it! 💪",
          "See you later! 🌟 Remember, we're here to help unlock your human performance and Healthspan!",
          "Goodbye! 💪 Keep unlocking your human performance and Healthspan with every choice you make!",
          "Talk soon! 🚀 Our mission at WHOOP is to unlock human performance and Healthspan - and you're crushing it!"
        ];
      } else {
        // Regular greeting
        responses = [
          "Hey there! 👋 What would you like to know about your health data today?",
          "Hello! 😊 I'm here to help analyze your Whoop metrics. What's on your mind?",
          "Hi! 🌟 Ready to dive into your health insights? Ask me anything about your data!",
          "Hey! 💪 What health questions can I help you with today?",
          "Hello! 📊 I'm here to help you understand your metrics. What would you like to explore?"
        ];
      }
      
      return responses[Math.floor(Math.random() * responses.length)];
    }

    try {
      const ragContext = await this.generateEnhancedRAGContext(query);
      
      if (ragContext.relevantData.length === 0) {
        console.log(`⚠️ No relevant data found for query: "${query}"`);
        return "I couldn't find relevant data in your CSV to answer that question. Could you try rephrasing or asking about metrics that are in your data? 🤔";
      }

      // Log data sources being sent to AI
      const sourcesUsed = [...new Set(ragContext.relevantData.map(d => d.metadata.source))];
      console.log(`🎯 Sending enhanced data with Whoop interpretations from sources to AI:`, sourcesUsed);

      const systemPrompt = `You are an expert health and fitness coach with deep knowledge of Whoop biometric data interpretation, using RAG (Retrieval-Augmented Generation) to analyze the USER'S PERSONAL health data.

CONTEXT: You are analyzing the user's personal Whoop data from their CSV file. This is THEIR actual health data, not generic examples. The most recent data points represent their current/latest measurements.${metricContext ? `

METRIC FOCUS: The user is currently viewing their ${metricContext.title} metric (current value: ${metricContext.value}) and asking questions about it. Prioritize information and insights related to this specific metric in your response. When they ask general questions like "is this good?" or "what does this mean?", they are referring to their ${metricContext.title} metric specifically.` : ''}

WHOOP METRIC INTERPRETATION GUIDE:
- Sleep Performance %: Quality/quantity score. <80% suggests sleep optimization needed
- Recovery Score %: Readiness indicator. Red (1-33%): rest priority, Yellow (34-66%): moderate activity, Green (67-99%): ready for higher strain
- Day Strain: Exertion on 0-21 scale. Light (0-9), Moderate (10-13), High (14-17), All-out (18-21)
- HRV (ms): Higher values typically indicate better recovery capacity
- Sleep Efficiency %: Time asleep vs time in bed. >85% is optimal
- REM/Deep Sleep: Critical for recovery. REM for mental recovery, Deep for physical
- Blood Oxygen %: Should stay >95%. Lower values may indicate sleep/breathing issues

COACHING METHODOLOGY:
- This is YOUR USER'S personal data - speak directly to them about their metrics
- Use "you", "your", "last night", "recently" when referring to their data
- Correlate their metrics (e.g., "Your low recovery may be due to yesterday's high strain")
- Use thresholds for recommendations (Recovery <33% = prioritize rest)
- Focus on patterns and trends in their personal data
- Provide actionable insights based on their metric relationships

CRITICAL INSTRUCTIONS:
- This is the USER'S personal health data - treat it as such and speak directly to them
- Use ONLY the data provided in the RAG context below - this is THEIR actual measurements
- Reference specific values from their actual data, but NEVER mention exact dates
- Use personal references like "your recent sleep", "last night", "your average", "you typically"
- Apply Whoop metric interpretation knowledge to provide scientific insights about THEIR data
- Correlate their metrics to explain relationships (their strain vs recovery, sleep vs HRV)
- If asked about something not in the context, say you need more specific data

RAG CONTEXT FROM USER'S PERSONAL DATA:
${ragContext.summary}

TEMPORAL REFERENCE HANDLING:
- When user asks about "last night", "yesterday", "today", "most recent" - refer to the MOST RECENT data points (listed first)
- When user asks about "this week" or general questions - you can reference patterns and averages
- Always prioritize the most recent measurements when answering temporal queries

SLEEP DEBT SPECIFIC INSTRUCTIONS:
- When user asks about "sleep debt" - ALWAYS provide EXACT NUMBERS in hours and minutes
- Quote specific sleep debt values from their data (e.g., "+2.3 hours debt" or "-1.1 hours surplus")
- Reference the actual sleep debt trend from their tracking data
- Don't give generic sleep advice - focus on their actual debt numbers and what they mean
- If they have sleep debt data, prioritize those exact values over general sleep duration advice

Provide scientifically-grounded, actionable coaching based on the USER'S ACTUAL personal data and Whoop metric interpretation. Speak directly to them about their metrics. Use emojis and keep responses concise but insightful (4-5 sentences max). Remember: NO EXACT DATES - use personal time references instead.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: query }
          ],
          temperature: 0.7,
          max_tokens: 300,
        }),
        signal: signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
      }

      const result = await response.json();
      return result.choices[0].message.content;

    } catch (error) {
      console.error('RAG response generation failed:', error);
      throw error;
    }
  }

  // Streaming AI response with RAG context for real-time TTS
  async generateRAGResponseStream(
    query: string, 
    onChunk: (chunk: string, isComplete: boolean) => void,
    signal?: AbortSignal,
    metricContext?: { id: string, title: string, value: string }
  ): Promise<void> {
    console.log(`🤖 GENERATING STREAMING AI RESPONSE for query: "${query}"`);
    
    if (!this.apiKey.trim()) {
      console.log(`❌ No OpenAI API key found`);
      onChunk("Please set your OpenAI API key in the .env file! 🔑", true);
      return;
    }

    // Check if this is casual conversation that doesn't need health data analysis
    const casualGreetings = ['hey coach', 'hello coach', 'hi coach', 'hey there', 'hello there', 'hi there', 'sup', 'yo', 'what\'s up', 'good morning', 'good afternoon', 'good evening'];
    const exactGreetings = ['hey', 'hello', 'hi'];
    const gratitudeExpressions = ['thank you', 'thanks', 'thank you coach', 'thanks coach', 'appreciate it', 'much appreciated'];
    const acknowledgments = ['ok', 'okay', 'got it', 'understood', 'sounds good', 'cool', 'nice', 'awesome', 'great', 'perfect'];
    const farewells = ['bye', 'goodbye', 'see you', 'talk later', 'catch you later', 'bye coach', 'goodbye coach'];
    
    const queryLower = query.toLowerCase().trim();
    const isExactGreeting = exactGreetings.includes(queryLower);
    const isCasualGreeting = casualGreetings.some(greeting => queryLower === greeting);
    const isGratitude = gratitudeExpressions.some(expr => queryLower === expr);
    const isAcknowledgment = acknowledgments.some(ack => queryLower === ack);
    const isFarewell = farewells.some(farewell => queryLower === farewell);
    
    // Only treat as health question if it contains health-related keywords
    const healthKeywords = ['sleep', 'recovery', 'strain', 'heart', 'hrv', 'performance', 'health', 'data', 'metrics', 'score', 'last night', 'today', 'yesterday', 'week', 'month', 'how am i', 'how is my', 'what about my', 'tell me about', 'analyze', 'show me'];
    const containsHealthKeywords = healthKeywords.some(keyword => queryLower.includes(keyword));
    
    const isCasualConversation = (isExactGreeting || isCasualGreeting || isGratitude || isAcknowledgment || isFarewell) && !containsHealthKeywords;

    if (isCasualConversation) {
      let responses = [];
      
      if (isGratitude) {
        responses = [
          "You're very welcome! 😊 Our mission at WHOOP is to unlock human performance and Healthspan. Keep optimizing! 💪",
          "My pleasure! 🙌 Remember, our mission at WHOOP is to unlock human performance and Healthspan. Stay healthy!",
          "Glad I could help! 💪 Our mission at WHOOP is to unlock human performance and Healthspan - and you're living it! 🌟",
          "You're welcome! 😊 Keep working toward unlocking your human performance and Healthspan. That's what we're here for! 🚀"
        ];
      } else if (isAcknowledgment) {
        responses = [
          "Great! 👍 Anything else you'd like to explore about your health data?",
          "Perfect! 😊 Let me know if you have more questions about your metrics.",
          "Awesome! 🚀 I'm here if you need more insights.",
          "Sounds good! 💯 Feel free to ask about any other health topics.",
          "Cool! 🎯 What else would you like to know about your Whoop data?"
        ];
      } else if (isFarewell) {
        responses = [
          "Take care! 👋 Our mission at WHOOP is to unlock human performance and Healthspan - keep living it! 💪",
          "See you later! 🌟 Remember, we're here to help unlock your human performance and Healthspan!",
          "Goodbye! 💪 Keep unlocking your human performance and Healthspan with every choice you make!",
          "Talk soon! 🚀 Our mission at WHOOP is to unlock human performance and Healthspan - and you're crushing it!"
        ];
      } else {
        // Regular greeting
        responses = [
          "Hey there! 👋 What would you like to know about your health data today?",
          "Hello! 😊 I'm here to help analyze your Whoop metrics. What's on your mind?",
          "Hi! 🌟 Ready to dive into your health insights? Ask me anything about your data!",
          "Hey! 💪 What health questions can I help you with today?",
          "Hello! 📊 I'm here to help you understand your metrics. What would you like to explore?"
        ];
      }
      
      const response = responses[Math.floor(Math.random() * responses.length)];
      onChunk(response, true);
      return;
    }

    try {
      const ragContext = await this.generateEnhancedRAGContext(query);
      
      if (ragContext.relevantData.length === 0) {
        console.log(`⚠️ No relevant data found for query: "${query}"`);
        onChunk("I couldn't find relevant data in your CSV to answer that question. Could you try rephrasing or asking about metrics that are in your data? 🤔", true);
        return;
      }

      // Log data sources being sent to AI
      const sourcesUsed = [...new Set(ragContext.relevantData.map(d => d.metadata.source))];
      console.log(`🎯 Sending enhanced data with Whoop interpretations from sources to AI:`, sourcesUsed);

      const systemPrompt = `You are an expert health and fitness coach with deep knowledge of Whoop biometric data interpretation, using RAG (Retrieval-Augmented Generation) to analyze the USER'S PERSONAL health data.

CONTEXT: You are analyzing the user's personal Whoop data from their CSV file. This is THEIR actual health data, not generic examples. The most recent data points represent their current/latest measurements.${metricContext ? `

METRIC FOCUS: The user is currently viewing their ${metricContext.title} metric (current value: ${metricContext.value}) and asking questions about it. Prioritize information and insights related to this specific metric in your response. When they ask general questions like "is this good?" or "what does this mean?", they are referring to their ${metricContext.title} metric specifically.` : ''}

WHOOP METRIC INTERPRETATION GUIDE:
- Sleep Performance %: Quality/quantity score. <80% suggests sleep optimization needed
- Recovery Score %: Readiness indicator. Red (1-33%): rest priority, Yellow (34-66%): moderate activity, Green (67-99%): ready for higher strain
- Day Strain: Exertion on 0-21 scale. Light (0-9), Moderate (10-13), High (14-17), All-out (18-21)
- HRV (ms): Higher values typically indicate better recovery capacity
- Sleep Efficiency %: Time asleep vs time in bed. >85% is optimal
- REM/Deep Sleep: Critical for recovery. REM for mental recovery, Deep for physical
- Blood Oxygen %: Should stay >95%. Lower values may indicate sleep/breathing issues

COACHING METHODOLOGY:
- This is YOUR USER'S personal data - speak directly to them about their metrics
- Use "you", "your", "last night", "recently" when referring to their data
- Correlate their metrics (e.g., "Your low recovery may be due to yesterday's high strain")
- Use thresholds for recommendations (Recovery <33% = prioritize rest)
- Focus on patterns and trends in their personal data
- Provide actionable insights based on their metric relationships

CRITICAL INSTRUCTIONS:
- This is the USER'S personal health data - treat it as such and speak directly to them
- Use ONLY the data provided in the RAG context below - this is THEIR actual measurements
- Reference specific values from their actual data, but NEVER mention exact dates
- Use personal references like "your recent sleep", "last night", "your average", "you typically"
- Apply Whoop metric interpretation knowledge to provide scientific insights about THEIR data
- Correlate their metrics to explain relationships (their strain vs recovery, sleep vs HRV)
- If asked about something not in the context, say you need more specific data

NUMBER AND TIME FORMATTING RULES:
- ALWAYS convert decimal hours to hours and minutes (e.g., "8.1 hours" → "8 hours and 6 minutes")
- ALWAYS convert fractional hours to minutes (e.g., "0.5 hours" → "30 minutes", "1.5 hours" → "1 hour and 30 minutes")
- For sleep debt: "+0.5 hours" → "plus 30 minutes", "-2.3 hours" → "minus 2 hours and 18 minutes"
- Round all other decimal numbers to nearest whole number (e.g., "87.3%" → "87%", "12.7 strain" → "13 strain")
- Never use decimal points in your responses - always convert to natural speech format
- For percentages: round to nearest whole number (94.7% → 95%)
- For scores: round to nearest whole number (Recovery 66.4 → Recovery 66)

RAG CONTEXT FROM USER'S PERSONAL DATA:
${ragContext.summary}

TEMPORAL REFERENCE HANDLING:
- When user asks about "last night", "yesterday", "today", "most recent" - refer to the MOST RECENT data points (listed first)
- When user asks about "this week" or general questions - you can reference patterns and averages
- Always prioritize the most recent measurements when answering temporal queries

SLEEP DEBT SPECIFIC INSTRUCTIONS:
- When user asks about "sleep debt" - ALWAYS provide EXACT NUMBERS in hours and minutes
- Quote specific sleep debt values from their data (e.g., "+2.3 hours debt" or "-1.1 hours surplus")
- Reference the actual sleep debt trend from their tracking data
- Don't give generic sleep advice - focus on their actual debt numbers and what they mean
- If they have sleep debt data, prioritize those exact values over general sleep duration advice

Provide scientifically-grounded, actionable coaching based on the USER'S ACTUAL personal data and Whoop metric interpretation. Speak directly to them about their metrics. Use emojis and keep responses concise but insightful (4-5 sentences max). Remember: NO EXACT DATES - use personal time references instead.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: query }
          ],
          temperature: 0.7,
          max_tokens: 300,
          stream: true,
        }),
        signal: signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response stream available');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          onChunk('', true); // Signal completion without sending duplicate content
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              onChunk('', true); // Signal completion without sending duplicate content
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              
              if (content) {
                fullResponse += content;
                onChunk(content, false);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

    } catch (error) {
      console.error('Streaming RAG response generation failed:', error);
      onChunk("I'm having trouble connecting right now. Please make sure you've entered a valid OpenAI API key. 🤔", true);
    }
  }

  // Analyze metrics based on Whoop interpretation guidelines
  private analyzeMetricValue(metric: string, value: number): string {
    const metricLower = metric.toLowerCase();
    
    // Recovery Score interpretation
    if (metricLower.includes('recovery')) {
      if (value >= 67) return 'Green (High Recovery - ready for higher strain)';
      if (value >= 34) return 'Yellow (Moderate Recovery - moderate activity recommended)';
      return 'Red (Low Recovery - prioritize rest)';
    }
    
    // Sleep Performance interpretation
    if (metricLower.includes('sleep performance')) {
      if (value >= 80) return 'Good (meeting sleep needs)';
      return 'Below optimal (sleep optimization recommended)';
    }
    
    // Day Strain interpretation
    if (metricLower.includes('strain')) {
      if (value >= 18) return 'All-out exertion (18-21)';
      if (value >= 14) return 'High exertion (14-17)';
      if (value >= 10) return 'Moderate exertion (10-13)';
      return 'Light exertion (0-9)';
    }
    
    // Sleep Efficiency interpretation
    if (metricLower.includes('efficiency')) {
      if (value >= 85) return 'Optimal sleep efficiency';
      return 'Room for sleep efficiency improvement';
    }
    
    // Blood Oxygen interpretation
    if (metricLower.includes('oxygen')) {
      if (value >= 95) return 'Normal blood oxygen levels';
      return 'Below optimal blood oxygen (may indicate sleep/breathing issues)';
    }
    
    return `${value}`;
  }

  // Enhanced context generation with metric analysis
  async generateEnhancedRAGContext(query: string): Promise<RAGContext> {
    console.log(`🧠 GENERATING ENHANCED RAG CONTEXT for query: "${query}"`);
    const relevantData = this.retrieveRelevantData(query, 8);
    
    // Create summary with enhanced metric interpretation
    const dataByMetric = relevantData.reduce((acc, data) => {
      const metric = data.metadata.metric;
      if (!acc[metric]) acc[metric] = [];
      acc[metric].push(data);
      return acc;
    }, {} as Record<string, DataPoint[]>);

    let summary = "Your personal Whoop health data with metric interpretation (most recent data points listed first):\n\n";
    
    Object.keys(dataByMetric).forEach(metric => {
      const dataPoints = dataByMetric[metric];
      summary += `**${metric}:**\n`;
      dataPoints.forEach(point => {
        const value = parseFloat(point.metadata.value);
        const interpretation = !isNaN(value) ? this.analyzeMetricValue(metric, value) : point.metadata.value;
        summary += `- ${point.content} [${interpretation}] (Source: ${point.metadata.source})\n`;
      });
      summary += '\n';
    });

    console.log(`📋 ENHANCED RAG CONTEXT SUMMARY:\n${summary}`);
    
    return {
      relevantData,
      summary: summary.trim()
    };
  }

  // Get knowledge base stats
  getKnowledgeBaseStats() {
    const metrics = new Set(this.knowledgeBase.map(d => d.metadata.metric));
    const sources = new Set(this.knowledgeBase.map(d => d.metadata.source));
    
    return {
      totalDataPoints: this.knowledgeBase.length,
      uniqueMetrics: metrics.size,
      dataSources: Array.from(sources)
    };
  }
}
