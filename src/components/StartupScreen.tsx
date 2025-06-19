import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface StartupScreenProps {
  onSetupComplete: (apiKey: string, dashboardData?: any) => void;
}

export const StartupScreen: React.FC<StartupScreenProps> = ({ onSetupComplete }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  // Skip setup and proceed directly
  const handleSkipSetup = () => {
    setIsLoading(true);
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (apiKey) {
      onSetupComplete(apiKey);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-gray-800 rounded-2xl p-8 shadow-xl">
        <h1 className="text-3xl font-bold text-white mb-6 text-center">
          Welcome to Whoop AI Coach
        </h1>
        
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-gray-300 mb-4">
              Ready to start? Click below to begin using the AI Coach with your data.
            </p>
            <button
              onClick={handleSkipSetup}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 disabled:opacity-50"
            >
              {isLoading ? 'Starting...' : 'Start Using AI Coach'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
