'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function NavLinks({
  links,
  mobile = false,
}: {
  links: { href: string; label: string; badge?: number }[]
  mobile?: boolean
}) {
  const pathname = usePathname()

  return (
    <>
      {links.map((link) => {
        const isActive =
          link.href === pathname ||
          (link.href !== '/admin' && link.href !== '/client' && pathname.startsWith(link.href))

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`relative rounded-lg px-3 ${mobile ? 'py-1.5' : 'py-2'} text-sm font-medium transition-colors ${
              mobile ? 'whitespace-nowrap' : ''
            } ${
              isActive
                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {link.label}
            {link.badge != null && link.badge > 0 && (
              <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
                {link.badge > 9 ? '9+' : link.badge}
              </span>
            )}
          </Link>
        )
      })}
    </>
  )
}
