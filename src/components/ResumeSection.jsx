import { GraduationCap, Briefcase, Code, Trophy, FileText, Award, BadgeCheck, Image as ImageIcon } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

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

function boldMasterName(text) {
  if (!text) return '';
  return text.replace(/(Xiaolei Zhu|Zhu X|Zhu XL)/g, '<span class="font-bold">$1</span>');
}

// Helper to find the first available image for a project
function getProjectImage(p, i) {
  // Use projectNumber if present, else fallback to index
  const num = p.projectNumber || (i + 1);
  if (p.image && p.image.trim() !== '') return p.image;
  const exts = ['jpg', 'png', 'gif', 'jpeg', 'webp'];
  for (const ext of exts) {
    const path = `/images/projects/project-${num}.${ext}`;
    if (window.__projectImages && window.__projectImages[path]) return path;
  }
  return '/images/projects/fallback.jpg';
}

// Preload all possible images on first render
if (typeof window !== 'undefined' && !window.__projectImages) {
  window.__projectImages = {};
  const exts = ['jpg', 'png', 'gif', 'jpeg', 'webp'];
  for (let i = 1; i <= 30; i++) {
    for (const ext of exts) {
      const path = `/images/projects/project-${i}.${ext}`;
      const img = new window.Image();
      img.onload = () => { window.__projectImages[path] = true; };
      img.onerror = () => { window.__projectImages[path] = false; };
      img.src = path;
    }
  }
}

export default function ResumeSection({ data }) {
  const [hoveredProject, setHoveredProject] = useState(null);
  const [openedProject, setOpenedProject] = useState(null);
  const [lineStyle, setLineStyle] = useState({});
  const [previewPos, setPreviewPos] = useState({});
  const projectRefs = useRef([]);

  useEffect(() => {
    if (openedProject !== null && projectRefs.current[openedProject]) {
      const rect = projectRefs.current[openedProject].getBoundingClientRect();
      setLineStyle({
        top: rect.top + window.scrollY + rect.height / 2 - 1,
        left: rect.right + window.scrollX,
        width: 0
      });
      setPreviewPos({
        top: rect.top + window.scrollY - 20,
        left: rect.right + window.scrollX + 60
      });
      setTimeout(() => setLineStyle(style => ({ ...style, width: 60 })), 10);
    }
  }, [openedProject]);

  const handleProjectMouseEnter = (e, i) => setHoveredProject(i);
  const handleProjectMouseLeave = () => setHoveredProject(null);
  const handleProjectClick = (i) => {
    setOpenedProject(i === openedProject ? null : i);
  };
  const handleClosePreview = () => setOpenedProject(null);

  const sections = [
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
              {data.education.map((edu, i) => (
                <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="pr-4 py-3 font-medium">{edu.degree}</td>
                  <td className="pr-4 py-3">{edu.major}</td>
                  <td className="pr-4 py-3">{edu.institution}</td>
                  <td className="pr-4 py-3">{edu.date}</td>
                  <td className="py-3">{edu.year}</td>
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
                  {job.title}
                </h4>
                <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                  {job.date}
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-2">
                {job.company} | {job.location}
              </p>
              <ul className="list-disc ml-6 space-y-1">
                {job.details && job.details.map((detail, j) => (
                  <li key={j} className="text-gray-700 dark:text-gray-200" dangerouslySetInnerHTML={{ __html: detail }} />
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
          {data.skills.map((skill, i) => (
            <div key={i} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-l-4 border-green-500">
              <p className="text-gray-700 dark:text-gray-200 leading-relaxed">
                {skill}
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
            <li key={i}><span className="font-semibold">{c.title}</span> - {c.organization} <span className="text-xs text-gray-500">({c.date})</span></li>
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
          {Array.isArray(data.projects) && data.projects.map((p, i) => {
            const imgSrc = getProjectImage(p, i);
            return (
              <motion.div
                key={i}
                ref={el => projectRefs.current[i] = el}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex flex-col md:flex-row items-start gap-4 border border-gray-100 dark:border-gray-700 cursor-pointer"
                whileHover={{ scale: 1.04, boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                onMouseEnter={e => handleProjectMouseEnter(e, i)}
                onMouseLeave={handleProjectMouseLeave}
                onClick={() => handleProjectClick(i)}
                style={{ zIndex: hoveredProject === i ? 2 : 1 }}
              >
                <img
                  src={imgSrc}
                  alt={p.title || 'project'}
                  className="w-[120px] h-[90px] object-cover rounded mb-2 md:mb-0 md:mr-4 border border-gray-200 dark:border-gray-700"
                  onError={e => { e.target.onerror = null; e.target.src = '/images/projects/fallback.jpg'; }}
                />
                <div className="flex-1">
                  <div className="font-semibold text-lg mb-1">{p.title || ''}</div>
                  <div className="text-gray-700 dark:text-gray-200 text-sm" dangerouslySetInnerHTML={{ __html: p.description || '' }} />
                </div>
              </motion.div>
            );
          })}
          <AnimatePresence>
            {openedProject !== null && data.projects && data.projects[openedProject] && (
              <motion.div
                className="fixed top-0 left-0 w-full h-full flex items-center justify-center z-50 bg-black/40"
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
                  style={{ minWidth: 480, minHeight: 360, maxWidth: '90vw', maxHeight: '90vh' }}
                  onClick={e => e.stopPropagation()}
                >
                  <img
                    src={getProjectImage(data.projects[openedProject], openedProject)}
                    alt={data.projects[openedProject].title || 'project'}
                    className="w-full max-w-[600px] max-h-[400px] object-contain rounded mb-4 border border-gray-200 dark:border-gray-700"
                    style={{ minWidth: 480, minHeight: 360 }}
                    onError={e => { e.target.onerror = null; e.target.src = '/images/projects/fallback.jpg'; }}
                  />
                  <div className="font-semibold text-xl mb-2 text-center">{data.projects[openedProject].title || ''}</div>
                  <div className="text-gray-700 dark:text-gray-200 text-base mb-4 text-center" dangerouslySetInnerHTML={{ __html: data.projects[openedProject].description || '' }} />
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
                <div className="font-semibold mb-1" dangerouslySetInnerHTML={{ __html: pub.html || pub.title }} />
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1" dangerouslySetInnerHTML={{ __html: pub.html || '' }} />
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {pub.journal}
                  {pub.link && (
                    <a 
                      href={pub.link} 
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
              <div className="font-semibold">{p.title}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{p.authors}</div>
              <div className="text-xs text-gray-400">{p.event}</div>
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
          {data.patents.map((patent, i) => (
            <div key={i} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="font-semibold mb-1">{patent.title}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                {patent.authors}
              </div>
              {patent.link && (
                <a 
                  href={patent.link} 
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

  return (
    <div className="space-y-8">
      {sections.map((section) => {
        const Icon = section.icon
        return (
          <div key={section.key} className="card p-6 relative">
            <div className="absolute -top-6 left-6 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 px-5 py-2 rounded-full shadow-lg text-lg font-semibold flex items-center space-x-2">
              <Icon className="w-5 h-5" />
              <span>{section.title}</span>
            </div>
            <div className="mt-6">
              {section.content}
            </div>
          </div>
        )
      })}
    </div>
  )
} 