import React, { useState, useCallback, useEffect } from 'react';
import { Upload, FileText, X, Database, Brain, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DataUploadProps {
  onDataUpload: (data: any) => void;
}

export const DataUpload: React.FC<DataUploadProps> = ({ onDataUpload }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [processingProgress, setProcessingProgress] = useState<string>('');

  // Load API key from localStorage on component mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem('openai_api_key');
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
  }, []);

  // Save API key to localStorage whenever it changes
  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    if (value.trim()) {
      localStorage.setItem('openai_api_key', value);
    } else {
      localStorage.removeItem('openai_api_key');
    }
  };

  // Add API key validation function
  const validateApiKey = async (key: string) => {
    if (!key || !key.startsWith('sk-')) {
      return { valid: false, error: 'API key must start with "sk-"' };
    }

    try {
      console.log('Testing API key validity...');
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        console.log('API key is valid');
        return { valid: true, error: null };
      } else {
        const errorData = await response.json();
        console.log('API key validation failed:', errorData);
        return { valid: false, error: errorData.error?.message || 'Invalid API key' };
      }
    } catch (error) {
      console.error('Error validating API key:', error);
      return { valid: false, error: 'Network error while validating API key' };
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleMultipleFiles(files);
  }, [apiKey]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleMultipleFiles(Array.from(files));
    }
  };

  const handleMultipleFiles = async (files: File[]) => {
    console.log('API key at start of processing:', apiKey ? `${apiKey.substring(0, 8)}...` : 'empty');
    
    setUploadedFiles(files);
    setIsProcessing(true);
    setProcessingProgress('');

    // Validate API key first
    const validation = await validateApiKey(apiKey);
    if (!validation.valid) {
      setIsProcessing(false);
      return;
    }

    try {
      await processFilesSequentially(files);
    } catch (error) {
      console.error('Error processing files:', error);
    } finally {
      setIsProcessing(false);
      setProcessingProgress('');
    }
  };

  const processFilesSequentially = async (files: File[]) => {
    const combinedData: any[] = [];
    const allHeaders = new Set<string>();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProcessingProgress(`Processing file ${i + 1}/${files.length}: ${file.name}`);
      
      try {
        const text = await file.text();
        console.log(`Processing file: ${file.name}`);
        
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
          console.warn(`File ${file.name} is empty, skipping...`);
          continue;
        }

        const parseCSVLine = (line: string) => {
          const result = [];
          let current = '';
          let inQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim().replace(/^"|"$/g, ''));
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.trim().replace(/^"|"$/g, ''));
          return result;
        };

        const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
        console.log(`Headers for ${file.name}:`, headers);

        // Add headers to the global set
        headers.forEach(header => allHeaders.add(header));

        const rows = lines.slice(1).map(line => {
          const values = parseCSVLine(line);
          const obj: any = { _source_file: file.name };
          headers.forEach((header, index) => {
            obj[header] = values[index] || '';
          });
          return obj;
        }).filter(row => {
          const values = Object.keys(row).filter(key => key !== '_source_file').map(key => row[key]);
          return values.some(val => val !== '' && val !== undefined && val !== null);
        });

        console.log(`Parsed ${rows.length} rows from ${file.name}`);
        
        // Normalize and add to combined data
        const allHeadersArray = Array.from(allHeaders);
        const normalizedRows = rows.map(row => {
          const normalizedRow: any = {};
          allHeadersArray.forEach(header => {
            normalizedRow[header] = row[header] || '';
          });
          normalizedRow._source_file = file.name;
          return normalizedRow;
        });
        
        combinedData.push(...normalizedRows);

        // Process this file's data with AI and update dashboard
        if (normalizedRows.length > 0) {
          setProcessingProgress(`Analyzing ${file.name} with AI...`);
          const dashboardData = await createAIDashboard(combinedData, file.name, i + 1, files.length);
          
          if (dashboardData) {
            console.log('Sending updated data to dashboard:', dashboardData);
            onDataUpload(dashboardData);
          }
        }
        
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
      }
    }
  };

  const createAIDashboard = async (data: any[], currentFileName: string, fileIndex: number, totalFiles: number) => {
    if (data.length === 0) {
      console.log('No data to process');
      return null;
    }

    console.log('API key in createAIDashboard:', apiKey ? `${apiKey.substring(0, 8)}...` : 'empty');

    if (!apiKey.trim()) {
      throw new Error('OpenAI API key is required for data analysis');
    }

    console.log(`Creating AI-powered dashboard from ${data.length} records (file ${fileIndex}/${totalFiles})`);
    
    // Prepare data sample for AI analysis
    const sampleData = data.slice(0, 20);
    const headers = Object.keys(sampleData[0]).filter(h => h !== '_source_file');
    
    const prompt = `You are analyzing health/fitness CSV data to create an intelligent dashboard. This is file ${fileIndex} of ${totalFiles} (current file: ${currentFileName}).

IMPORTANT INSTRUCTIONS:
1. Identify 4-6 key health/fitness metrics from this data
2. Create meaningful visualizations and charts wherever appropriate
3. Suggest specific graph types for trends and comparisons
4. Focus on actionable insights for health monitoring

Headers available: ${headers.join(', ')}

Sample data (first 5 rows):
${JSON.stringify(sampleData.slice(0, 5), null, 2)}

Data summary:
- Total records: ${data.length}
- Current file: ${currentFileName}
- Progress: ${fileIndex}/${totalFiles} files processed

RESPONSE FORMAT - Return ONLY valid JSON:
{
  "metrics": [
    {
      "field": "actual_field_name_from_csv",
      "title": "User Friendly Display Name",
      "icon": "Heart|Moon|Zap|TrendingUp|Flame|BarChart3|Thermometer|Footprints",
      "gradient": "from-color-400 to-color-500",
      "unit": "bpm|h|%|cal|min|steps|kg|°F|",
      "description": "Brief meaningful description"
    }
  ],
  "charts": [
    {
      "type": "line|area|bar|pie",
      "title": "Chart Title",
      "dataKey": "field_name",
      "description": "What this chart shows"
    }
  ],
  "insights": [
    "Key insight about the health data",
    "Trend or pattern discovered",
    "Actionable recommendation"
  ]
}

CRITICAL REQUIREMENTS:
- Use actual field names from the CSV headers
- ONLY use these exact icon names: Heart, Moon, Zap, TrendingUp, Flame, BarChart3, Thermometer, Footprints
- Choose appropriate chart types: line (for trends), area (for cumulative), bar (for comparisons), pie (for distributions)
- Provide meaningful health insights
- Keep units appropriate: bpm, h, %, cal, min, steps, kg, °F or empty string
- Suggest charts that make sense for the data type (time series = line/area, categories = bar/pie)`;

    try {
      console.log('Making OpenAI API request for file analysis...');
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are an expert health data analyst. Return only valid JSON responses for dashboard creation. Focus on meaningful health metrics and suggest appropriate visualizations. ONLY use these exact icon names: Heart, Moon, Zap, TrendingUp, Flame, BarChart3, Thermometer, Footprints.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.2,
          max_tokens: 3000,
        }),
      });

      console.log('OpenAI API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('OpenAI API error details:', errorData);
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const apiResult = await response.json();
      let aiResponseContent = apiResult.choices[0].message.content;
      
      // Clean up the response
      if (aiResponseContent.includes('```json')) {
        aiResponseContent = aiResponseContent.replace(/```json\n?/g, '').replace(/\n?```/g, '');
      } else if (aiResponseContent.includes('```')) {
        aiResponseContent = aiResponseContent.replace(/```\n?/g, '').replace(/\n?```/g, '');
      }
      
      console.log('Cleaned AI response:', aiResponseContent);
      const aiAnalysis = JSON.parse(aiResponseContent);
      
      console.log('AI Analysis result:', aiAnalysis);

      // Validate and fix icons in the response
      const validIcons = ['Heart', 'Moon', 'Zap', 'TrendingUp', 'Flame', 'BarChart3', 'Thermometer', 'Footprints'];
      
      // Process the AI recommendations into dashboard format
      const dynamicMetrics = aiAnalysis.metrics.map((metric: any) => {
        const fieldData = data.map(row => row[metric.field]).filter(v => v && v.toString().trim() !== '');
        
        // Validate and fix the icon
        let validIcon = metric.icon;
        if (!validIcons.includes(validIcon)) {
          console.warn(`Invalid icon "${validIcon}" replaced with BarChart3`);
          validIcon = 'BarChart3';
        }
        
        // Calculate average for numeric values
        const numericValues = fieldData.map(v => {
          if (typeof v === 'number') return v;
          const str = v.toString().toLowerCase().trim();
          if (str.includes('%')) {
            const num = parseFloat(str.replace('%', ''));
            return isNaN(num) ? null : num;
          }
          const cleanStr = str.replace(/[,$]/g, '');
          const num = parseFloat(cleanStr);
          return isNaN(num) ? null : num;
        }).filter(v => v !== null && isFinite(v));

        const average = numericValues.length > 0 
          ? numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length 
          : 0;

        // Format value based on unit
        let displayValue = '';
        if (metric.unit === 'h') {
          displayValue = `${average.toFixed(1)}h`;
        } else if (metric.unit === '%') {
          displayValue = `${Math.round(average)}%`;
        } else if (metric.unit === 'min') {
          // Convert minutes to hours and minutes for sleep duration
          displayValue = `${Math.floor(average / 60)}h ${Math.round(average % 60)}m`;
        } else if (metric.unit === 'bpm' || metric.unit === 'cal' || metric.unit === 'steps') {
          displayValue = `${Math.round(average)}`;
        } else {
          displayValue = average.toFixed(1);
        }

        return {
          id: metric.field.toLowerCase().replace(/[^a-z0-9]/g, '_'),
          title: metric.title,
          value: displayValue,
          subtitle: metric.description || `Avg: ${average.toFixed(1)}`,
          icon: validIcon,
          gradient: metric.gradient,
          unit: metric.unit
        };
      });

      // Create weekly trend data using recent records with correct field mappings
      const recentData = data.slice(-7);
      const weekly = recentData.map((record, index) => {
        const dayData: any = {
          day: `Day ${index + 1}`
        };
        
        // Add data for all AI-identified chart metrics
        aiAnalysis.charts.forEach((chart: any) => {
          const value = parseFloat(record[chart.dataKey]) || 0;
          dayData[chart.dataKey] = value;
        });
        
        return dayData;
      });

      console.log('Generated weekly data for charts:', weekly);

      const dashboardResult = {
        dynamicMetrics,
        weekly,
        rawData: data,
        aiAnalysis,
        charts: aiAnalysis.charts || [],
        insights: aiAnalysis.insights || [],
        fileProgress: `${fileIndex}/${totalFiles}`,
        currentFile: currentFileName
      };

      console.log('AI Dashboard data created successfully:', dashboardResult);
      return dashboardResult;

    } catch (error) {
      console.error('AI Analysis failed:', error);
      throw new Error(`AI analysis failed: ${error.message}`);
    }
  };

  const removeFile = (indexToRemove: number) => {
    setUploadedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const clearAll = () => {
    setUploadedFiles([]);
    setProcessingProgress('');
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Brain className="h-5 w-5 text-blue-400" />
          <h3 className="text-white font-semibold">AI-Powered CSV Analysis</h3>
        </div>
        {uploadedFiles.length > 0 && (
          <Button
            onClick={clearAll}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white"
          >
            Clear All
          </Button>
        )}
      </div>

      {/* API Key Input */}
      <div className="mb-4">
        <label className="block text-gray-300 text-sm font-medium mb-2">
          OpenAI API Key {apiKey && <span className="text-green-400">(saved)</span>}
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => handleApiKeyChange(e.target.value)}
          placeholder="sk-..."
          className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-gray-500 text-xs mt-1">
          Your API key is saved locally and only used for analyzing your CSV data
        </p>
      </div>

      {uploadedFiles.length === 0 ? (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragOver
              ? 'border-blue-400 bg-blue-400/10'
              : 'border-gray-600 hover:border-gray-500'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-300 mb-2">
            Drop multiple CSV files here
          </p>
          <p className="text-gray-500 text-sm mb-4">
            GPT-4o will analyze each file sequentially and update your dashboard with charts and insights
          </p>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
            multiple
          />
          <label htmlFor="file-upload">
            <Button
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700 cursor-pointer"
              asChild
              disabled={!apiKey.trim()}
            >
              <span>Choose CSV Files</span>
            </Button>
          </label>
          {!apiKey.trim() && (
            <p className="text-yellow-500 text-xs mt-2">
              Please enter your OpenAI API key first
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center space-x-2 mb-3">
            <Database className="h-5 w-5 text-green-400" />
            <span className="text-green-400 font-medium">
              {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} uploaded
            </span>
          </div>
          
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="flex items-center space-x-3 p-2 bg-gray-700/50 rounded-lg">
                <FileText className="h-4 w-4 text-blue-400" />
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{file.name}</p>
                  <p className="text-gray-400 text-xs">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  onClick={() => removeFile(index)}
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white p-1"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>

          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center justify-center space-x-2 text-blue-400 text-sm py-2">
                <Brain className="h-4 w-4 animate-pulse" />
                <span>Processing files sequentially with AI analysis...</span>
              </div>
              {processingProgress && (
                <div className="flex items-center justify-center space-x-2 text-green-400 text-xs">
                  <BarChart3 className="h-3 w-3" />
                  <span>{processingProgress}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
