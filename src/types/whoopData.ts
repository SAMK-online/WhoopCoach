
export interface WhoopDayData {
  recovery: number;
  hrv: number;
  strain: number;
  sleep: number; // in minutes
  restingHeartRate: number;
}

export interface WhoopWeekData {
  day: string;
  fullDate: string;
  recovery: number;
  strain: number;
  sleepHours: number;
  hrv: number;
}

export interface WhoopData {
  today: WhoopDayData;
  weekly: WhoopWeekData[];
  allData?: WhoopWeekData[]; // Optional field for storing all historical data
}
