# Vistoria - Property Inspection App

## Overview
A React/TypeScript application for property inspections with Supabase backend integration. The app allows users to manage properties, conduct entry/exit inspections, upload photos, and generate reports.

## Project Architecture
- **Frontend**: React 19.1.0 + TypeScript + Vite 6.3.5
- **Styling**: Tailwind CSS + Framer Motion
- **Backend**: Supabase (PostgreSQL database, authentication, storage)
- **Charts**: ECharts for data visualization
- **PDF Generation**: jsPDF + html2canvas
- **Icons**: Lucide React

## Current State
- ✅ Dependencies installed with npm (using --legacy-peer-deps for echarts compatibility)
- ✅ Vite dev server configured for Replit (host 0.0.0.0, port 5000)
- ✅ Environment variables configured (.env file with Supabase keys)
- ✅ Development workflow set up (npm run dev)
- ✅ Application running successfully
- ✅ Deployment configuration set up (autoscale with build/serve)

## Recent Changes (2025-09-09)
- Configured Vite server for Replit environment (host: 0.0.0.0, port: 5000)
- Installed dependencies with legacy peer deps to resolve echarts version conflict
- Set up development workflow and deployment configuration
- Added serve package for production deployment

## Key Features
- Property management with photos
- Entry and exit inspections
- Photo upload with AI analysis integration
- Comparison between inspections
- Report generation and export
- Authentication via Supabase
- Responsive design with dark/light themes

## Environment Variables
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key
- `VITE_OPENAI_API_KEY`: OpenAI API key for AI features (placeholder)

## Dependencies Notes
- Using echarts@6.0.0 with echarts-for-react@3.0.2 (requires legacy peer deps)
- All packages installed and working correctly
- Serve package added for production deployment