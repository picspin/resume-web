import { User, ImagePlus } from 'lucide-react'
import ContactInfo from './ContactInfo'
import { safeImageUrl } from './projectImages.js'

export default function ResumeProfile({ resume, editing = false, onSelect = () => {} }) {
  const general = resume.general || {}
  const field = (key, content) => editing
    ? <button type="button" className="resume-field" aria-label={`Edit ${key}`} onClick={() => onSelect(key)}>{content || <span className="no-print">Add {key}</span>}</button>
    : content
  return <section className="resume-profile flex flex-col items-center mb-12">
    <div className="relative mb-6">
      {field('photo', safeImageUrl(general.photo)
        ? <img src={safeImageUrl(general.photo)} className="w-48 h-48 rounded-full border-4 border-white shadow-2xl bg-white object-cover" alt={general.name || 'Profile'} />
        : editing ? <User className="no-print h-24 w-24 text-gray-400" /> : null)}
    </div>
    <h1 className="text-4xl font-bold text-center mb-2 text-gradient">{field('name', general.name)}</h1>
    <p className="text-xl text-gray-600 dark:text-gray-300 text-center mb-4">{field('headline', general.headline)}{general.headline && general.location ? ' | ' : ' '}{field('location', general.location)}</p>
    {editing && <button type="button" className="resume-command no-print mb-4" onClick={() => onSelect('banner')}><ImagePlus size={16} />Banner</button>}
    <ContactInfo data={general} editing={editing} onSelect={onSelect} />
  </section>
}
