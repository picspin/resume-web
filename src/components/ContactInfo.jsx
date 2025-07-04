import { Mail, Phone, MapPin } from 'lucide-react'

export default function ContactInfo({ data }) {
  const contactItems = [
    { icon: MapPin, text: data.address, href: null },
    { icon: Mail, text: data.email_work, href: `mailto:${data.email_work}` },
    { icon: Phone, text: data.tel, href: `tel:${data.tel.split(' ')[0]}` }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl">
      {contactItems.map((item, index) => {
        const Icon = item.icon
        const content = (
          <div className="flex items-center space-x-2 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-100 dark:border-gray-700">
            <Icon className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <span className="text-sm text-gray-700 dark:text-gray-200 truncate">
              {item.text}
            </span>
          </div>
        )

        return item.href ? (
          <a key={index} href={item.href} className="hover:scale-105 transition-transform duration-200">
            {content}
          </a>
        ) : (
          <div key={index} className="hover:scale-105 transition-transform duration-200">
            {content}
          </div>
        )
      })}
    </div>
  )
} 