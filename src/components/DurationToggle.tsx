
import React from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export type DashboardDuration = 'day' | 'week' | 'month' | '6months';

interface DurationToggleProps {
  value: DashboardDuration;
  onValueChange: (value: DashboardDuration) => void;
}

export const DurationToggle: React.FC<DurationToggleProps> = ({ value, onValueChange }) => {
  return (
    <div className="flex items-center space-x-2">
      <span className="text-gray-400 text-sm font-medium">Duration:</span>
      <ToggleGroup 
        type="single" 
        value={value} 
        onValueChange={(newValue) => newValue && onValueChange(newValue as DashboardDuration)}
        className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-1"
      >
        <ToggleGroupItem 
          value="day" 
          className="text-xs px-3 py-1.5 data-[state=on]:bg-blue-600 data-[state=on]:text-white"
        >
          Day
        </ToggleGroupItem>
        <ToggleGroupItem 
          value="week" 
          className="text-xs px-3 py-1.5 data-[state=on]:bg-blue-600 data-[state=on]:text-white"
        >
          Week
        </ToggleGroupItem>
        <ToggleGroupItem 
          value="month" 
          className="text-xs px-3 py-1.5 data-[state=on]:bg-blue-600 data-[state=on]:text-white"
        >
          Month
        </ToggleGroupItem>
        <ToggleGroupItem 
          value="6months" 
          className="text-xs px-3 py-1.5 data-[state=on]:bg-blue-600 data-[state=on]:text-white"
        >
          6 Months
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
};
