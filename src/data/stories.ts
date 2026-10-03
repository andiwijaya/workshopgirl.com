import { diaryEntries } from './diary.ts';
import { projects } from './projects.ts';
import { sportActivities } from './sport.ts';
import { newestFirst } from './content-order.ts';

export const storySections = [
  { label: 'Diary', href: '/diary/', items: diaryEntries },
  { label: 'Projects', href: '/projects/', items: projects },
  { label: 'Sport', href: '/sport/', items: sportActivities },
];
export const stories = newestFirst(storySections.flatMap(section => section.items.map(item => ({ ...item, kind: section.label }))));
