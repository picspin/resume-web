# Xiaolei Zhu - Professional Resume

A modern, responsive resume website built with React, Vite, and Tailwind CSS v4.

## Features

- 🌙 Dark/Light mode toggle
- 🌍 Bilingual support (English/Chinese)
- 📱 Fully responsive design
- ⚡ Fast loading with Vite
- 🎨 Modern UI with Tailwind CSS v4
- 📄 PDF download functionality
- 🔍 SEO optimized

## Tech Stack

- **Frontend**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Language**: JavaScript (ES6+)

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## Project Structure # GitHub Actions Test

## Medical Resume-Ops

This project includes a local `career/` workspace for JD-specific medical/pharma resume adaptation and PDF generation. See `career/README.md` for commands.

## Privacy Boundary

The public resume site defaults to the resume page. The local `/career` console stays disabled unless you are running the Vite dev server and set `VITE_ENABLE_CAREER_CONSOLE=true`.

Keep JD text, truth warnings, evaluation markdown, application links, recruiter messages, and follow-up notes out of public build artifacts. Run `npm run resume:manifest` after local resume generation so `src/data/resume-versions.json` remains public-safe and `src/data/career-versions.local.json` stays local-only and git-ignored.
