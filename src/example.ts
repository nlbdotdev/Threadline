import { parseDocument } from './lib/schema';
export const example = parseDocument({
  version: 1,
  id: 'studio',
  title: 'A studio over time',
  description:
    'Fictional example showing partial dates, intervals, nested rails and unknown dates.',
  dimensions: [
    {
      id: 'discipline',
      label: 'Discipline',
      values: [
        { id: 'work', label: 'Work', color: '#476e5e' },
        { id: 'design', label: 'Design', color: '#b97345', parent: 'work' },
        { id: 'engineering', label: 'Engineering', color: '#6486a5', parent: 'work' },
        { id: 'learning', label: 'Learning', color: '#9a6e89' },
      ],
    },
  ],
  views: [
    { id: 'thread', label: 'One thread', mode: 'unified', dimension: 'discipline' },
    { id: 'tracks', label: 'Tracks', mode: 'split', dimension: 'discipline', depth: 'parent' },
    { id: 'branches', label: 'Branches', mode: 'split', dimension: 'discipline' },
  ],
  events: [
    {
      id: 'first',
      title: 'A first sketch',
      summary: 'A year is enough when the exact day is unknown.',
      date: { start: '2021', approximate: true },
      attributes: { discipline: 'design' },
      tags: ['Year precision'],
    },
    {
      id: 'learning',
      title: 'Learning by making',
      summary: 'The start and end dates use month precision.',
      date: { start: '2022-03', end: '2023-09' },
      attributes: { discipline: 'learning' },
      tags: ['Interval'],
    },
    {
      id: 'building',
      title: 'Build the first prototype',
      summary: 'A shared Work rail unfolds into Design and Engineering.',
      date: { start: '2023-04-12' },
      attributes: { discipline: 'engineering' },
      tags: ['Day precision'],
    },
    {
      id: 'now',
      title: 'Ongoing design work',
      summary: 'The end date is unspecified because work is ongoing.',
      date: { start: '2024-06', ongoing: true },
      attributes: { discipline: 'design' },
      tags: ['Ongoing'],
    },
    {
      id: 'unknown',
      title: 'A loose note',
      summary: 'Unknown dates remain unknown and sort last.',
      date: { start: null },
      attributes: { discipline: 'engineering' },
      tags: ['Undated'],
    },
  ],
});
