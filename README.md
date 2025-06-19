# WhoopAI

An AI-powered health analytics and coaching platform that transforms your Whoop data into actionable insights and personalized recommendations.

![WhoopAI Dashboard](public/images/whoop.png)

## 🚀 Features

### 🏥 Health Analytics Dashboard
- **Real-time Metrics**: Display key health metrics from your Whoop data
- **Interactive Charts**: Visualize trends and patterns in your health data
- **Dynamic Grid**: Customizable metric cards with trend analysis
- **Duration Filters**: View data across day/week/month/6-month periods

### 🤖 AI Coach
- **RAG-Powered Insights**: Retrieval-Augmented Generation using your personal data
- **Streaming Responses**: Real-time text generation with live TTS
- **Voice Interaction**: Speech recognition for hands-free conversations
- **Personalized Coaching**: Contextual advice based on your specific metrics

### 🎯 Smart Goal Setting
- **AI-Suggested Targets**: Data-driven goal recommendations based on your trends
- **Timeline-Specific Plans**: Detailed week-by-week breakdowns with specific actions
- **Progress Tracking**: Visual progress indicators with baseline comparisons
- **Context-Aware Planning**: Considers your activities, constraints, and preferences

### 📊 Predictive Analytics
- **Recovery Forecasting**: Predict tomorrow's recovery score
- **Sleep Performance Projections**: AI-powered sleep optimization insights
- **Training Load Balance**: Optimal strain recommendations
- **Trend Analysis**: HRV and cardiovascular health monitoring

## 🛠 Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Components**: shadcn/ui + Radix UI primitives
- **Styling**: Tailwind CSS with custom theming
- **Charts**: Recharts for data visualization
- **AI Integration**: OpenAI GPT-4o-mini
- **Text-to-Speech**: ElevenLabs API
- **State Management**: React Query for async state
- **Data Processing**: CSV parsing with intelligent metric analysis

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (version 16 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

You'll also need API keys for:
- [OpenAI](https://platform.openai.com/api-keys) - For AI coaching features
- [ElevenLabs](https://elevenlabs.io/) - For text-to-speech functionality

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/SAMK-online/WhoopAI.git
cd WhoopAI
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Environment Setup

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` and add your API keys:
```env
VITE_OPENAI_API_KEY=your_openai_api_key_here
VITE_ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
VITE_ELEVENLABS_VOICE_ID=your_preferred_voice_id_here
```

### 4. Add Your Whoop Data

1. Export your data from Whoop as CSV
2. Place the CSV file in `public/data/csv/COmbined.csv`
3. The app will automatically detect and load your data

### 5. Start Development Server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## 📊 Data Requirements

WhoopAI works with Whoop CSV exports containing metrics like:
- Recovery Score
- Sleep Performance
- Day Strain
- Heart Rate Variability (HRV)
- Resting Heart Rate
- Sleep Efficiency
- Sleep stages (REM, Deep, Light)
- Blood Oxygen levels
- And more...

## 🎮 Usage

### Dashboard Navigation
1. **Dashboard Tab**: View your metrics, trends, and chat with AI coach
2. **AI Predictions Tab**: See forecasted health trends and insights
3. **Goals Tab**: Set targets and generate personalized action plans

### AI Coach Interaction
- **Text Chat**: Type questions about your health data
- **Voice Chat**: Click the microphone button for hands-free interaction
- **Contextual Insights**: Ask about specific metrics or trends

### Goal Setting
1. **Smart Suggestions**: Review AI-recommended goals based on your data
2. **Customize Targets**: Adjust goals and timelines using sliders
3. **Generate Plans**: Create detailed weekly action plans
4. **Track Progress**: Monitor your advancement toward targets

## 🔧 Build for Production

```bash
npm run build
# or
yarn build
```

The built files will be in the `dist` directory.

## 🎯 Key Features Deep Dive

### RAG-Powered AI Coach
The AI coach uses Retrieval-Augmented Generation to provide personalized insights:
- Builds a knowledge base from your CSV data
- Prioritizes recent data for relevance
- Provides context-aware responses based on your specific metrics

### Smart Goal Setting
Unlike generic fitness apps, WhoopAI creates intelligent goals by:
- Analyzing your 7-day vs 30-day averages to identify trends
- Calculating realistic weekly improvement targets
- Generating timeline-specific action plans with measurable milestones

### Predictive Analytics
AI-powered forecasting helps you:
- Anticipate recovery patterns
- Optimize training loads
- Prevent overtraining and injury risk

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- [WHOOP](https://www.whoop.com/) for the amazing health tracking platform
- [OpenAI](https://openai.com/) for powerful AI capabilities
- [ElevenLabs](https://elevenlabs.io/) for natural text-to-speech
- [shadcn/ui](https://ui.shadcn.com/) for beautiful UI components

## 📧 Contact

Abdul Shaik - [GitHub](https://github.com/SAMK-online)

Project Link: [https://github.com/SAMK-online/WhoopAI](https://github.com/SAMK-online/WhoopAI)

---

⭐ If you found this project helpful, please give it a star on GitHub!
