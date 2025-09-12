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
- ✅ **COMPLETE MONETIZATION SYSTEM IMPLEMENTED**: Full subscription and pay-per-use model with security

## Recent Changes (2025-09-12)
- ✅ **🚀 COMPLETE MONETIZATION SYSTEM**: Implemented comprehensive subscription and pay-per-use model
  - **Subscription Plans**: Gratuito (free), Básico (R$97/mês - 5 imóveis), Profissional (R$147/mês - 10 imóveis), Empresarial (R$250/mês - ilimitado)
  - **Pay-per-use Credits**: R$49.90 per property with credit packages (1, 3, 5 credits with discounts)
  - **Plan Limits**: Enforced server-side limits for properties, environments, and photos per plan
  - **Security System**: Implemented PlanSecurityGuard component to prevent unauthorized access
  - **Server-side Validation**: All subscription verification moved from localStorage to secure database RPCs
  - **Credit Management**: Complete credit system with purchase, usage tracking, and balance management
  - **Asaas Integration**: Ready for payment processing with existing infrastructure
  - **Database Infrastructure**: Created user_credits, credit_transactions tables with proper RLS policies

## Recent Changes (2025-09-11)
- ✅ **Fixed deployment health check issues**: Applied all suggested fixes for deployment failures
  - Added production serve script to package.json with proper port configuration (port 5000)
  - Built project to create dist folder with proper index.html health check endpoint
  - Configured serve command with -s flag for proper SPA static file serving
  - Set up Production Server workflow using npm run serve for deployment
  - Verified health check endpoint responds correctly at / route
- ✅ **Fixed critical deployment binding issue**: Resolved "Application is not responding to health checks" error
  - Updated serve command to explicitly bind to 0.0.0.0:5000 instead of localhost
  - Changed serve script from `-p 5000` to `-l tcp://0.0.0.0:5000` for proper external access
  - Confirmed health check endpoint now responds correctly for deployment system
  - Production Server workflow running successfully with proper network binding
- ✅ **Switched to Vite native preview for better deployment compatibility**: Resolved deployment system compatibility issues
  - Replaced custom serve command with official `vite preview --host 0.0.0.0 --port 5000`
  - Added `npm run start` script using Vite's native production preview server
  - Vite preview provides standard HTTP headers and better Replit deployment system compatibility
  - Health check endpoint confirmed working with proper HTTP/1.1 200 OK responses
- ✅ **Fixed deployment configuration for autoscale**: Resolved final deployment issues
  - Changed deployment target from "vm" to "autoscale" for proper health check system
  - Updated deployment commands to use correct npm scripts (build: npm run build, run: npm run start)
  - Maintained correct port mapping configuration (localPort: 5000, externalPort: 80)
  - Application now properly configured for Replit's autoscale deployment system

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
  - **Fixed RLS policy issues**: Resolved Row Level Security and schema cache errors by simplifying database operations
  - **Fixed profile fields mismatch**: Corrected code to use only existing table fields (full_name, avatar_url) instead of non-existent fields (phone, company)
  - **Fixed comparison summary logic**: Corrected bug where items with condition "not_found" were incorrectly paired instead of being counted as missing items
  - **Fixed Dashboard critical issues calculation**: Enhanced logic to properly detect critical issues from not_found and damaged items
  - **Removed Dashboard charts**: Removed inspection trends and issues distribution charts as requested
  - **Changed dashboard card**: Changed "Problemas Críticos" to "Itens Faltando da Última Vistoria" and updated logic to count only items with condition "not_found" from the most recent completed inspection
  - **Fixed dashboard data accuracy**: Modified logic to fetch data specifically from the latest inspection instead of all inspections
  - **Verified action links functionality**: Confirmed that "Nova Vistoria" and "Relatórios" quick action links are working correctly
  - **Removed visual markers**: Removed red object detection markers from photos in all components (AnalysisResult, Reports, ComparisonItem) for cleaner interface
  - **Fixed comparative report image display**: Fixed bug where missing items showed entry photo for both entry and exit - now correctly shows entry photo and actual exit photo for proper comparison
  - **Fixed new items photo display**: Enhanced "Itens Novos na Saída" to show entry photo for context instead of "Sem foto" - now shows before/after comparison
  - **Removed visual markers from comparative reports**: Removed red pins due to positioning issues - interface now focuses on clear text-based comparison without visual markers
  - **Fixed dashboard missing items count**: Corrected logic to count items from latest EXIT inspection only (not entry) to match comparative report numbers
  - **Fixed field naming**: Corrected Dashboard to use 'inspection_type' instead of 'type' field to match database schema
  - **Synchronized counting logic**: Updated Dashboard to use identical logic as comparative report for counting missing items, ensuring exact number matching between dashboard and reports
  - **Fixed mobile scrolling issue**: Corrected GlowCard animation component to allow normal page scrolling on mobile devices while preserving desktop hover effects
  - **Enhanced quick actions intelligence**: Updated Dashboard quick actions to redirect smartly - "Nova Vistoria" goes to latest property/inspection, "Relatórios" goes to latest comparative report
  - **Renamed quick action**: Changed "Nova Vistoria" to "Última Vistoria" and updated to redirect to Property Management page of latest property
  - **Renamed quick action**: Changed "Relatórios" to "Último Relatórios" - continues directing to latest comparative report
  - **Fixed "Último Relatórios" redirection**: Corrected Dashboard query to include inspections data and fixed logic to properly detect properties with completed entry and exit inspections, ensuring the quick action redirects to the correct comparative report
  - **🤖 MAJOR AI CONSISTENCY IMPROVEMENTS**: Implemented comprehensive solution for AI analysis inconsistencies
    - **Duplicate image detection**: Added smart detection for when same image is used in entry/exit
    - **Conservative analysis mode**: For duplicate images, system now copies entry analysis instead of re-analyzing
    - **Enhanced prompts**: Added specific instructions for consistent AI analysis with conservative comparison mode
    - **Image seed generation**: Implemented deterministic seed based on image URL for reproducible results
    - **Intelligent fallbacks**: System prioritizes consistency over fresh analysis when images are identical
  - **🎯 ENHANCED OBJECT DETECTION ACCURACY**: Dramatically improved AI object detection for property inspections
    - **Room-specific object lists**: Added detailed lists of priority objects for each environment type (living room, kitchen, bathroom, bedroom, etc.)
    - **Assertive detection instructions**: Enhanced prompts to focus on 70% inspection core: "what's there and what's missing"
    - **Inventory-focused analysis**: Prioritized tangible, countable objects over construction finishes
    - **Detailed object specifications**: Enhanced detection to include material, color, and condition details
    - **Priority hierarchies**: Structured object detection by importance (furniture > appliances > accessories > installations)
    - **🔄 STANDARDIZED ANALYSIS CRITERIA**: Fixed inconsistencies between entry and exit inspections
      - **Unified nomenclature**: Both entry and exit now use identical object naming conventions
      - **Consistent materials**: Standardized material detection (tecido, madeira, metal, vidro, cerâmica, couro, plástico)
      - **Consistent colors**: Standardized color palette (branco, preto, cinza, marrom, bege, azul, verde, vermelho, amarelo)
      - **Same detection logic**: Both analyses use identical criteria to prevent false differences
      - **Reference-based comparison**: Exit analysis now references entry inventory for consistency
- ✅ **🖥️ IMPROVED DESKTOP RESPONSIVENESS**: Enhanced desktop design while maintaining mobile compatibility
  - **Full-screen layout**: Added structured full-screen background with proper container widths
  - **Better spacing**: Improved margins, padding, and gaps for desktop screens (lg: breakpoints)
  - **Enhanced cards**: Added hover effects, better shadows, and rounded corners for premium feel
  - **Improved typography**: Better text sizing hierarchy for desktop vs mobile screens
  - **Better visual hierarchy**: Added section titles, improved card organization and spacing
  - **Enhanced icons**: Added background circles with colors for better visual appeal in usage indicators
  - **Grid improvements**: Better responsive grids that scale from mobile to ultra-wide screens
  - **Professional layout**: Properties now displayed in structured card containers with proper headers

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
