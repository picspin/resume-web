import { lazy, Suspense, useState, useEffect } from 'react'
import resumeEn from './data/resume-en.json'
import resumeZh from './data/resume-zh.json'
import resumeVersions from './data/resume-versions.json'
import ResumeSection from './components/ResumeSection'
import Header from './components/Header'
import ContactInfo from './components/ContactInfo'
import { isCareerConsoleEnabled, isCareerPath } from './career/careerConsoleEnabled'
import './App.css'

const CareerConsole = lazy(() => import('./career/CareerConsole'))

function App() {
  const [lang, setLang] = useState('en')
  const [selectedVersion, setSelectedVersion] = useState('default')
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? JSON.parse(saved) : window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(dark))
    if (dark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [dark])

  const pathname = window.location.pathname
  const careerEnabled = isCareerConsoleEnabled({ env: import.meta.env, pathname })

  if (careerEnabled) {
    return (
      <Suspense
        fallback={
          <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center px-4">
            <div className="max-w-md text-center">
              <h1 className="text-2xl font-semibold mb-3">Career Console</h1>
              <p className="text-gray-600">Loading local application workflow...</p>
            </div>
          </div>
        }
      >
        <CareerConsole />
      </Suspense>
    )
  }

  if (isCareerPath(pathname)) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold mb-3">Career console is local-only</h1>
          <p className="text-gray-600">Run the dev server with VITE_ENABLE_CAREER_CONSOLE=true to open this workspace.</p>
        </div>
      </div>
    )
  }

  const version = resumeVersions.find((item) => item.slug === selectedVersion)
  const data = version?.resume || (lang === 'en' ? resumeEn : resumeZh)
  const displayLang = version?.resume?.language || lang

  const handleDownload = () => {
    if (version?.pdfPath) {
      const link = document.createElement('a')
      link.href = version.pdfPath
      link.download = `${version.slug}.pdf`
      link.click()
      return
    }

    const link = document.createElement('a')
    link.href = '/resume-xiaolei-zhu.pdf'
    link.download = `Xiaolei_Zhu_Resume_${lang.toUpperCase()}.pdf`
    link.click()
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      dark ? 'dark bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'
    }`}>
      {/* Background Banner */}
      <div className="fixed top-0 left-0 w-full h-80 z-0">
        <img 
          src="/images/banner.jpeg" 
          className="w-full h-full object-cover" 
          alt="Professional background" 
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/80 to-white/40 dark:from-gray-900/80 dark:to-gray-900/40" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto pt-32 pb-8 px-4">
        {/* Header with Controls */}
        <Header 
          lang={lang} 
          setLang={setLang} 
          dark={dark} 
          setDark={setDark}
          onDownload={handleDownload}
          versions={resumeVersions}
          selectedVersion={selectedVersion}
          setSelectedVersion={setSelectedVersion}
          languageDisabled={Boolean(version)}
        />

        {/* Profile Section */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative">
            <img 
              src="/images/Avatar.jpg" 
              className="w-48 h-48 rounded-full border-4 border-white shadow-2xl -mt-24 mb-6 bg-white object-cover" 
              alt="Xiaolei Zhu" 
            />
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-white"></div>
          </div>
          <h1 className="text-4xl font-bold text-center mb-2 text-gradient">
            {data.general.name}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 text-center mb-4">
            {displayLang === 'en' ? 'Application Manager' : '应用经理'} | Guangzhou, China
          </p>
          
          {/* Contact Info Cards */}
          <ContactInfo data={data.general} />
        </div>

        {/* Resume Content */}
        <ResumeSection data={data} />
      </div>
    </div>
  )
}

export default App
