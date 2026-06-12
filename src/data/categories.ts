import type { Category } from '../types';

export const CATS: Category[] = [
  { id: 'assistive-tech', label: 'Assistive Tech', full: 'Assistive Technology', color: '#1f3f46', mid: '#4d9ca8', tag: '#bfe9ee', tagText: '#102f35' },
  { id: 'neurodiversity', label: 'Neurodiversity', full: 'Neurodiversity & IDD', color: '#4a2b5f', mid: '#a06cc2', tag: '#e3c9f2', tagText: '#28113a' },
  { id: 'mental-health', label: 'Mental Health', full: 'Mental Health', color: '#5a3824', mid: '#c28355', tag: '#f0d0b5', tagText: '#341808' },
  { id: 'older-adults', label: 'Older Adults', full: 'Older Adults', color: '#304b28', mid: '#78a85d', tag: '#d7ebc9', tagText: '#172910' },
  { id: 'community', label: 'Community', full: 'Community Participation', color: '#244267', mid: '#6e9bd1', tag: '#c9dcf3', tagText: '#102a4a' },
  { id: 'paediatrics', label: 'Paediatrics', full: 'Paediatric OT', color: '#665025', mid: '#c7a352', tag: '#efdfb3', tagText: '#382a08' },
];

export function getCat(id: string): Category {
  return CATS.find(c => c.id === id) ?? CATS[0];
}
