export const SERVICE_NAME = 'cast mark'
export const SERVICE_TAGLINE = '簡単操作で、自分だけの釣果マップを'
export const LEGAL_UPDATED_AT = '2026年9月4日'
export const LEGAL_CONTACT_URL = 'https://github.com/honeston/fissingplotter/issues'

export const PUBLIC_CONTENT_PATHS = ['/privacy', '/terms', '/guide'] as const

export function isPublicContentPath(pathname: string): boolean {
  return (PUBLIC_CONTENT_PATHS as readonly string[]).includes(pathname)
}
