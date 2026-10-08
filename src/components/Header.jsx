import { Sun, Moon, Download, Globe } from 'lucide-react'

export default function Header({
  lang,
  setLang,
  dark,
  setDark,
  onDownload,
  versions = [],
  selectedVersion,
  setSelectedVersion,
  languageDisabled = false,
  showDownload = true,
  showLanguage = true,
}) {
  return (
    <div className="no-print flex flex-wrap gap-3 justify-between items-center mb-8">
      <div className="flex items-center space-x-2">
      {showLanguage && <>
        <button
          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
            lang === 'en'
              ? 'bg-blue-500 text-white shadow-lg'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
          } ${languageDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={() => setLang('en')}
          disabled={languageDisabled}
        >
          <Globe className="w-4 h-4 inline mr-1" />
          EN
        </button>
        <button
          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
            lang === 'zh'
              ? 'bg-blue-500 text-white shadow-lg'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
          } ${languageDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={() => setLang('zh')}
          disabled={languageDisabled}
        >
          <Globe className="w-4 h-4 inline mr-1" />
          中文
        </button>
      </>}
      </div>

      <div className="flex items-center space-x-2">
        {versions.length > 0 && (
          <select
            className="btn-secondary max-w-48"
            value={selectedVersion}
            onChange={(event) => setSelectedVersion(event.target.value)}
            title={lang === 'en' ? 'Resume version' : '简历版本'}
            aria-label="Published resume version"
          >
            <option value="default">{lang === 'en' ? 'Default' : '默认'}</option>
            {versions.map((version) => (
              <option key={version.slug} value={version.slug}>
                {version.label}
              </option>
            ))}
          </select>
        )}
        {showDownload && (
          <button
            className="btn-secondary"
            onClick={onDownload}
            title={lang === 'en' ? 'Download PDF' : '下载PDF'}
          >
            <Download className="w-4 h-4 inline mr-1" />
            {lang === 'en' ? 'PDF' : 'PDF'}
          </button>
        )}
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
