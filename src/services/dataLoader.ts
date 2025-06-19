import { RAGService } from './ragService';

export class DataLoader {
  private static instance: DataLoader;
  private ragService: RAGService | null = null;

  private constructor() {}

  static getInstance(): DataLoader {
    if (!DataLoader.instance) {
      DataLoader.instance = new DataLoader();
    }
    return DataLoader.instance;
  }

  async loadData(): Promise<any> {
    try {
      // Load the CSV file from the public directory
      const response = await fetch('/data/csv/COmbined.csv');
      if (!response.ok) {
        throw new Error(`Failed to load CSV file: ${response.statusText}`);
      }
      const csvText = await response.text();
      
      // Parse CSV
      const rows = this.parseCSV(csvText);
      if (rows.length === 0) {
        throw new Error('No data found in CSV file');
      }
      
      console.log('📄 CSV loaded successfully:', {
        rowCount: rows.length,
        headers: Object.keys(rows[0]),
        firstRow: rows[0]
      });

      // Log data source information
      const sourcesFound = new Set(rows.map(row => row._source_file || 'unknown').filter(s => s !== 'unknown'));
      console.log('🗂️ Data sources found in CSV:', Array.from(sourcesFound));
      console.log('📊 Sample row with metadata:', rows[0]);
      
      // Initialize RAG service
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      this.ragService = new RAGService(apiKey);
      
      // Build knowledge base
      this.ragService.buildKnowledgeBase(rows, []);
      
      // Return the processed data
      return {
        rawData: rows,
        ragService: this.ragService
      };
    } catch (error) {
      console.error('Error loading data:', error);
      throw error;
    }
  }

  private parseCSV(csvText: string): any[] {
    const lines = csvText.split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('2025-02-25')); // Filter out empty lines and old data
    
    if (lines.length === 0) return [];

    const headers = this.parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
    console.log('CSV Headers:', headers);
    
    return lines.slice(1).map(line => {
      const values = this.parseCSVLine(line);
      const obj: any = {};
      headers.forEach((header, index) => {
        let value: string | number | null = values[index] || '';
        // Convert numeric values
        if (value && !isNaN(Number(value))) {
          value = Number(value);
        }
        // Handle empty values
        if (value === '') {
          value = null;
        }
        obj[header] = value;
      });
      return obj;
    }).filter(row => {
      // Filter out rows where all values are null or empty
      const values = Object.values(row);
      return values.some(val => val !== null && val !== '');
    });
  }

  private parseCSVLine(line: string): string[] {
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
  }

  getRAGService(): RAGService | null {
    return this.ragService;
  }
} 