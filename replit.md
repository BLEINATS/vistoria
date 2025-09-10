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
- ✅ Vite dev server configured for Replit (host 0.0.0.0, port 5000, allowedHosts: 'all')
- ✅ Environment variables configured (.env file with Supabase keys)
- ✅ Development workflow set up (npm run dev)
- ✅ Application running successfully
- ✅ Deployment configuration set up (autoscale with build/serve)
- ✅ Host blocking issue resolved

## Recent Changes (2025-09-10)
- ✅ Created comprehensive Dashboard with real-time analytics and visual charts
- ✅ Implemented automatic marker coordinates system for AI object detection
- ✅ Added Dashboard route and updated navigation structure
- ✅ Fixed navigation back button in comparative reports
- ✅ Separated Dashboard and Properties pages for better UX
- ✅ Implemented user profile management with dropdown menu in header
- ✅ Added profile configuration page with personal information editing
- ✅ Implemented secure password change functionality
- ✅ Enhanced user experience with profile dropdown and settings access
- ✅ **Extended profile system with additional fields and photo upload**
  - Added phone and company fields to database and interface
  - Implemented photo upload functionality with Supabase Storage
  - Added avatar preview, validation (5MB, image types only)
  - Enhanced profile form with new fields and photo management
  - **Fixed cache schema issues**: Resolved Supabase cache problems that prevented loading extended fields
  - Implemented robust data loading that always shows user email and name when available
  - **Fixed RLS policy issues**: Resolved Row Level Security errors that prevented profile updates

## Previous Changes (2025-09-09)
- Configured Vite server for Replit environment (host: 0.0.0.0, port: 5000)
- Installed dependencies with legacy peer deps to resolve echarts version conflict
- Set up development workflow and deployment configuration
- Added serve package for production deployment
- Fixed host blocking issue by adding allowedHosts: 'all' to Vite config

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