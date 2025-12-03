# 🚢 Shipper

**Shipping opportunities for Product People**

The job tracker built for Product People who believe in quality over quantity.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ecf8e.svg)](https://supabase.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6.svg)](https://typescriptlang.org)

## 🎯 What is Shipper?

Shipper is a curated job hunting tool designed for Product Managers tired of the "spray and pray" approach. Instead of mass-applying to hundreds of jobs, Shipper helps you focus on opportunities that truly match your profile.

### The Problem

- 📊 **Chaos everywhere** — Spreadsheets, notes, and emails scattered around
- 🎯 **Mass-applying fails** — 100 applications, 0 responses
- 🤖 **AI spam gets filtered** — Fully AI-written applications are detected and ignored

### The Solution

- 🏢 **Curated company database** — 60 pre-selected companies across 6 countries
- 📋 **Visual pipeline** — Kanban board to track from research to offer
- ⭐ **Fit tracking** — Rate your fit for each role to prioritize effectively
- 🏷️ **Smart tagging** — Mark high priority, referrals, and dream jobs
- 📊 **Analytics** — Track conversion rates, pipeline health, and trends
- 🤖 **AI Coach** — Personalized tips (suggestions, not ghostwriting)

## ✨ Features

### 📋 Pipeline Tracking

Track opportunities through 6 stages:

| Stage | Description |
|-------|-------------|
| **Researching** | Analyzing the opportunity |
| **Applied** | Application submitted |
| **Interviewing** | In conversation with company |
| **Assessment** | Technical tests, case studies |
| **Offer** | Received an offer 🎉 |
| **Archived** | Rejected, ghosted, or withdrawn |

### 🏢 Target Companies

- 60 pre-populated companies across Portugal, Brazil, Germany, Spain, Ireland, and Netherlands
- Add custom target companies
- Track when you last checked each company's careers page

### 📊 Analytics Dashboard

- **By Role** — See which roles you're applying to most
- **By Country** — Geographic distribution of your applications
- **By Status** — Pipeline health and conversion visualization

### 🤖 AI Coach (Powered by Groq)

Get personalized tips for each application:
- Cover letter suggestions
- CV highlights to emphasize  
- Company research angles

*Suggestions, not substitutions. You stay authentic.*

### 🔐 Security

- **Two-Factor Authentication (2FA)** — Secure your account
- **Row Level Security** — Your data is isolated and protected

### 🌙 Dark Mode

Full dark theme support for late-night job hunting sessions.

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18 + TypeScript |
| **Styling** | Tailwind CSS + shadcn/ui |
| **Backend** | Supabase (Auth, Database, Edge Functions) |
| **AI** | Groq API (Llama 3.3 70B) |
| **Deployment** | Vercel |

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Groq API key (free tier available)

### Installation

```bash
# Clone the repository
git clone https://github.com/ehgzao/shipper.git
cd shipper

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Run development server
npm run dev
```

### Environment Variables

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

For AI Coach functionality, add `GROQ_API_KEY` to Supabase Edge Function secrets.

## 📁 Project Structure

```
shipper/
├── src/
│   ├── components/       # React components
│   │   ├── ui/           # shadcn/ui components
│   │   ├── pipeline/     # Pipeline-specific components
│   │   └── landing/      # Landing page components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utilities and Supabase client
│   ├── pages/            # Page components
│   └── types/            # TypeScript types
├── supabase/
│   ├── functions/        # Edge Functions (AI Coach)
│   └── migrations/       # Database migrations
└── public/               # Static assets
```

## 🗄️ Database Schema

| Table | Description |
|-------|-------------|
| `profiles` | User profile and preferences |
| `target_companies` | Companies the user is tracking |
| `opportunities` | Job opportunities in the pipeline |
| `preset_companies` | Pre-populated company database |

## 🌍 Supported Countries

| Country | Companies |
|---------|-----------|
| 🇵🇹 Portugal | 10 |
| 🇧🇷 Brazil | 10 |
| 🇩🇪 Germany | 10 |
| 🇪🇸 Spain | 10 |
| 🇮🇪 Ireland | 10 |
| 🇳🇱 Netherlands | 10 |

## 🤝 Contributing

Contributions are welcome! 

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Lovable](https://lovable.dev)
- AI powered by [Groq](https://groq.com)
- Backend by [Supabase](https://supabase.com)
- UI components by [shadcn/ui](https://ui.shadcn.com)

---

**Made with ☕ in Porto by [Gabriel Lima](https://github.com/ehgzao)**
