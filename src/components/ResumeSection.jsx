import { GraduationCap, Briefcase, Code, Trophy, FileText, Award, BadgeCheck, Image as ImageIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FALLBACK_PROJECT_IMAGE, buildProjectImageCandidates, safeLink } from './projectImages.js'

const sectionIcons = {
  education: GraduationCap,
  work: Briefcase,
  skills: Code,
  certificates: BadgeCheck,
  projects: Trophy,
  publications: FileText,
  patents: Award,
  posters: ImageIcon
}

function ProjectImage({ project, index, alt, className, style }) {
  const candidates = buildProjectImageCandidates(project, index)
  const candidateKey = candidates.join('|')
  const [candidateIndex, setCandidateIndex] = useState(0)
  const src = candidates[Math.min(candidateIndex, candidates.length - 1)] || FALLBACK_PROJECT_IMAGE

  useEffect(() => {
    setCandidateIndex(0)
  }, [candidateKey])

  const handleImageError = () => {
    setCandidateIndex((current) => Math.min(current + 1, candidates.length - 1))
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      onError={handleImageError}
    />
  )
}

export default function ResumeSection({ data, renderSectionChrome, sectionOrder, hiddenSections = [], editing = false, onSelect = () => {} }) {
  const [hoveredProject, setHoveredProject] = useState(null);
  const [openedProject, setOpenedProject] = useState(null);

  const handleProjectMouseEnter = (e, i) => setHoveredProject(i);
  const handleProjectMouseLeave = () => setHoveredProject(null);
  const handleProjectClick = (i) => {
    setOpenedProject(i === openedProject ? null : i);
  };
  const handleClosePreview = () => setOpenedProject(null);
  const field = (section, index, key, value) => editing
    ? <button type="button" className="resume-field" aria-label={`Edit ${section} ${index + 1} ${key}`} onClick={event => { event.stopPropagation(); onSelect(section, index, key) }}>{value || <span className="no-print">Add {key}</span>}</button>
    : value

  const sections = [
    { key: 'summary', title: 'Summary', icon: FileText, content: <p className="whitespace-pre-wrap">{field('summary', 0, 'summary', data.summary)}</p> },
    {
      key: 'education',
      title: 'Education',
      icon: sectionIcons.education,
      content: (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="pr-4 py-2 font-semibold">Degree</th>
                <th className="pr-4 py-2 font-semibold">Major</th>
                <th className="pr-4 py-2 font-semibold">Institution</th>
                <th className="pr-4 py-2 font-semibold">Date</th>
                <th className="py-2 font-semibold">Year</th>
              </tr>
            </thead>
            <tbody>
              {(data.education || []).map((edu, i) => (
                <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="pr-4 py-3 font-medium">{field('education', i, 'degree', edu.degree)}</td>
                  <td className="pr-4 py-3">{field('education', i, 'major', edu.major)}</td>
                  <td className="pr-4 py-3">{field('education', i, 'institution', edu.institution)}</td>
                  <td className="pr-4 py-3">{field('education', i, 'date', edu.date)}</td>
                  <td className="py-3">{field('education', i, 'year', edu.year)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    },
    {
      key: 'work',
      title: 'Work Experience',
      icon: sectionIcons.work,
      content: (
        <div className="space-y-6 max-h-96 overflow-y-auto scrollbar-thin pr-2">
          {data.work && data.work.map((job, i) => (
            <div key={i} className="border-l-4 border-blue-500 pl-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-lg text-blue-700 dark:text-blue-300">
                  {field('work', i, 'title', job.title)}
                </h4>
                <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                  {field('work', i, 'date', job.date)}
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-2">
                {field('work', i, 'company', job.company)} | {field('work', i, 'location', job.location)}
              </p>
              <ul className="list-disc ml-6 space-y-1">
                {job.details && job.details.map((detail, j) => (
                  <li key={j} className="text-gray-700 dark:text-gray-200">{field('work', i, 'details', detail)}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )
    },
    {
      key: 'skills',
      title: 'Skills',
      icon: sectionIcons.skills,
      content: (
        <div className="grid gap-4">
          {(data.skills || []).map((skill, i) => (
            <div key={i} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-l-4 border-green-500">
              <p className="text-gray-700 dark:text-gray-200 leading-relaxed">
                {field('skills', i, 'value', skill)}
              </p>
            </div>
          ))}
        </div>
      )
    },
    {
      key: 'certificates',
      title: 'Certificate & Reputation',
      icon: sectionIcons.certificates,
      content: (
        <ul className="list-disc ml-6 text-gray-700 dark:text-gray-200">
          {data.certificates && data.certificates.map((c, i) => (
            <li key={i}><span className="font-semibold">{field('certificates', i, 'title', c.title)}</span> - {field('certificates', i, 'organization', c.organization)} <span className="text-xs text-gray-500">({field('certificates', i, 'date', c.date)})</span></li>
          ))}
        </ul>
      )
    },
    {
      key: 'projects',
      title: 'Projects & Achievements',
      icon: sectionIcons.projects,
      content: (
        <div className="max-h-96 overflow-y-auto scrollbar-thin pr-2 grid gap-4">
          {Array.isArray(data.projects) && data.projects.map((p, i) => (
              <motion.div
                key={i}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex flex-col md:flex-row items-start gap-4 border border-gray-100 dark:border-gray-700 cursor-pointer"
                whileHover={{ boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                onMouseEnter={e => handleProjectMouseEnter(e, i)}
                onMouseLeave={handleProjectMouseLeave}
                onClick={() => editing ? onSelect('projects', i, 'title') : handleProjectClick(i)}
                style={{ zIndex: hoveredProject === i ? 2 : 1 }}
              >
                {field('projects', i, 'image', <ProjectImage
                  project={p}
                  index={i}
                  alt={p.title || 'project'}
                  className="w-[120px] h-[90px] object-cover rounded mb-2 md:mb-0 md:mr-4 border border-gray-200 dark:border-gray-700"
                />)}
                <div className="flex-1">
                  <div className="font-semibold text-lg mb-1">{field('projects', i, 'title', p.title)}</div>
                  <div className="text-gray-700 dark:text-gray-200 text-sm whitespace-pre-wrap">{field('projects', i, 'description', p.description)}</div>
                  {editing ? field('projects', i, 'link', p.link) : safeLink(p.link) && <a href={safeLink(p.link)} onClick={event => event.stopPropagation()} target="_blank" rel="noopener noreferrer">Project link</a>}
                </div>
              </motion.div>
          ))}
          <AnimatePresence>
            {openedProject !== null && data.projects && data.projects[openedProject] && (
              <motion.div
                className="no-print fixed top-0 left-0 w-full h-full flex items-center justify-center z-50 bg-black/40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleClosePreview}
              >
                <motion.div
                  className="relative bg-white dark:bg-gray-900 rounded-lg shadow-2xl p-8 flex flex-col items-center"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                  style={{ width: 'min(90vw, 680px)', maxHeight: '90vh', overflow: 'auto' }}
                  onClick={e => e.stopPropagation()}
                >
                  <ProjectImage
                    project={data.projects[openedProject]}
                    index={openedProject}
                    alt={data.projects[openedProject].title || 'project'}
                    className="w-full max-w-[600px] max-h-[400px] object-contain rounded mb-4 border border-gray-200 dark:border-gray-700"
                    style={{ aspectRatio: '3 / 2' }}
                  />
                  <div className="font-semibold text-xl mb-2 text-center">{data.projects[openedProject].title || ''}</div>
                  <div className="text-gray-700 dark:text-gray-200 text-base mb-4 text-center">{data.projects[openedProject].description || ''}</div>
                  <button
                    className="absolute top-2 right-2 text-gray-500 hover:text-red-500 text-2xl font-bold bg-white dark:bg-gray-900 rounded-full px-2 py-1 shadow"
                    onClick={handleClosePreview}
                  >
                    ×
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )
    },
    {
      key: 'publications',
      title: 'Publications',
      icon: sectionIcons.publications,
      content: (
        <div className="max-h-96 overflow-y-auto scrollbar-thin pr-2">
          <ol className="list-decimal ml-6 space-y-4">
            {data.publications && data.publications.map((pub, i) => (
              <li key={i} className="text-gray-700 dark:text-gray-200">
                <div className="font-semibold mb-1">{field('publications', i, 'title', pub.title)}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{field('publications', i, 'type', pub.type)} {field('publications', i, 'authors', pub.authors)}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {field('publications', i, 'journal', pub.journal)}
                  {editing ? field('publications', i, 'link', pub.link) : safeLink(pub.link) && (
                    <a
                      href={safeLink(pub.link)}
                      className="ml-2 text-blue-500 hover:text-blue-600 underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      [Link]
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )
    },
    {
      key: 'posters',
      title: 'Poster & Presentation',
      icon: sectionIcons.posters,
      content: (
        <div className="max-h-64 overflow-y-auto scrollbar-thin pr-2">
          {data.posters && data.posters.map((p, i) => (
            <div key={i} className="mb-4 text-gray-700 dark:text-gray-200 leading-relaxed">
              <div className="font-semibold">{field('posters', i, 'title', p.title)}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{field('posters', i, 'authors', p.authors)}</div>
              <div className="text-xs text-gray-400">{field('posters', i, 'event', p.event)} {field('posters', i, 'conference', p.conference)} {field('posters', i, 'date', p.date)}</div>
              {editing ? field('posters', i, 'link', p.link) : safeLink(p.link) && <a href={safeLink(p.link)} target="_blank" rel="noopener noreferrer">Poster link</a>}
            </div>
          ))}
        </div>
      )
    },
    {
      key: 'patents',
      title: 'Patents',
      icon: sectionIcons.patents,
      content: (
        <div className="space-y-3">
          {(data.patents || []).map((patent, i) => (
            <div key={i} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="font-semibold mb-1">{field('patents', i, 'title', patent.title)}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                {field('patents', i, 'authors', patent.authors)}
              </div>
              {editing ? field('patents', i, 'link', patent.link) : safeLink(patent.link) && (
                <a
                  href={safeLink(patent.link)}
                  className="text-blue-500 hover:text-blue-600 underline text-sm"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Patent
                </a>
              )}
            </div>
          ))}
        </div>
      )
    }
  ]

  const orderedSections = Array.isArray(sectionOrder)
    ? [
        ...sectionOrder.map((sectionKey) => sections.find((section) => section.key === sectionKey)).filter(Boolean),
        ...sections.filter((section) => !sectionOrder.includes(section.key)),
      ]
    : sections

  return (
    <div className="space-y-8">
      {orderedSections.filter(section => !hiddenSections.includes(section.key) && (editing || (section.key === 'summary' ? data.summary : data[section.key]?.length))).map((section) => {
        section = { ...section, title: data.sectionTitles?.[section.key] ?? section.title }
        const Icon = section.icon
        const renderedSection = (
          <div key={section.key} className={`card p-6 relative ${section.key === 'summary' ? !data.summary ? 'no-print' : '' : !data[section.key]?.length ? 'no-print' : ''}`}>
            <div className="absolute -top-6 left-6 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 px-5 py-2 rounded-full shadow-lg text-lg font-semibold flex items-center space-x-2">
              <Icon className="w-5 h-5" />
              <span>{field(section.key, 0, 'sectionTitle', section.title)}</span>
            </div>
            <div className="mt-6">
              {section.content}
            </div>
          </div>
        )
        return renderSectionChrome ? renderSectionChrome(section, renderedSection) : renderedSection
      })}
    </div>
  )
}
