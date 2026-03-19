'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function NavLinks({
  links,
  mobile = false,
}: {
  links: { href: string; label: string }[]
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
            className={`rounded-lg px-3 ${mobile ? 'py-1.5' : 'py-2'} text-sm font-medium transition-colors ${
              mobile ? 'whitespace-nowrap' : ''
            } ${
              isActive
                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {link.label}
          </Link>
        )
      })}
    </>
  )
}
