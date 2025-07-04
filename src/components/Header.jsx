import { Sun, Moon, Download, Globe } from 'lucide-react'

export default function Header({ lang, setLang, dark, setDark, onDownload }) {
  return (
    <div className="flex justify-between items-center mb-8">
      <div className="flex items-center space-x-2">
        <button 
          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
            lang === 'en' 
              ? 'bg-blue-500 text-white shadow-lg' 
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`} 
          onClick={() => setLang('en')}
        >
          <Globe className="w-4 h-4 inline mr-1" />
          EN
        </button>
        <button 
          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
            lang === 'zh' 
              ? 'bg-blue-500 text-white shadow-lg' 
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`} 
          onClick={() => setLang('zh')}
        >
          <Globe className="w-4 h-4 inline mr-1" />
          中文
        </button>
      </div>
      
      <div className="flex items-center space-x-2">
        <button 
          className="btn-secondary"
          onClick={onDownload}
          title={lang === 'en' ? 'Download PDF' : '下载PDF'}
        >
          <Download className="w-4 h-4 inline mr-1" />
          {lang === 'en' ? 'PDF' : 'PDF'}
        </button>
        <button 
          className="btn-secondary"
          onClick={() => setDark(!dark)}
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
} 