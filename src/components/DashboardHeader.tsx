import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export const DashboardHeader = () => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <div className="bg-gradient-to-r from-green-400 to-blue-500 rounded-xl h-14 w-14 flex items-center justify-center overflow-hidden p-0">
          <img 
            src="/images/whoop.png" 
            alt="Whoop Logo" 
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to text if image fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent && !parent.querySelector('.fallback-text')) {
                const fallback = document.createElement('span');
                fallback.className = 'text-white font-bold text-2xl fallback-text';
                fallback.textContent = 'W';
                parent.appendChild(fallback);
              }
            }}
          />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Whoop Intelligence</h1>
          <p className="text-gray-400">Your AI-powered fitness companion</p>
        </div>
      </div>
      
      <div className="flex items-center space-x-6">
        <div className="text-right space-y-2">
          <p className="text-white font-bold text-xl">Welcome back, WILL</p>
          <div className="flex space-x-6 text-base">
            <span className="text-green-400 font-semibold">WHOOP AGE: 29.9</span>
            <span className="text-blue-400 font-semibold">Actual AGE: 33.6</span>
          </div>
          <p className="text-gray-400 text-base mt-2">Today • Jun 19, 2025</p>
        </div>
        <Avatar className="h-20 w-20">
          <AvatarImage 
            src="https://coin-images.coingecko.com/coins/images/34755/large/IMG_0015.png?1705957165" 
            alt="Giga Chad"
            className="object-cover"
          />
          <AvatarFallback className="bg-gray-800 text-gray-300 text-xl">
            GC
          </AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
};
