export const siteNavigation = [
  { id: 'home', label: 'Home', href: '/' },
  { id: 'learn', label: 'Learn', href: '/tutorials/' },
  { id: 'tools', label: 'Tools', href: '/tools/' },
  { id: 'workshop', label: 'Workshop', href: '/workshop/' },
  { id: 'stories', label: 'Stories', href: '/stories/' },
  { id: 'about', label: 'About', href: '/about/' },
] as const;

export type SiteSection = typeof siteNavigation[number]['id'];
export type LegacySection = SiteSection | 'tutorials' | 'diary' | 'projects' | 'sport';

export function siteSection(path: string): SiteSection | undefined {
  const pathname = path.split(/[?#]/)[0].replace(/\/$/, '') || '/';
  if (pathname === '/') return 'home';
  if (pathname === '/workshop' || pathname.startsWith('/workshop/') || pathname.startsWith('/tools/workshop/')) return 'workshop';
  if (pathname === '/tutorials' || pathname.startsWith('/tutorials/')) return 'learn';
  if (['stories', 'diary', 'projects', 'sport'].some(section => pathname === '/' + section || pathname.startsWith('/' + section + '/'))) return 'stories';
  if (pathname === '/tools' || pathname.startsWith('/tools/')) return 'tools';
  if (pathname === '/about') return 'about';
}

export function normalizeSection(section?: LegacySection): SiteSection | undefined {
  if (section === 'tutorials') return 'learn';
  if (section === 'diary' || section === 'projects' || section === 'sport') return 'stories';
  return section;
}
