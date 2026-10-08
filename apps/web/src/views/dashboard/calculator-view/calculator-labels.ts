import { m } from '@/paraglide/messages';

/** Fixed palette for intensity zones, easy → hard. */
export const ZONE_COLORS = [
  'bg-sky-500',
  'bg-emerald-500',
  'bg-lime-500',
  'bg-amber-500',
  'bg-orange-500',
  'bg-red-500',
  'bg-fuchsia-600',
];

export function presetLabel(key: string): string {
  switch (key) {
    case 'half':
      return m.calc_distance_half();
    case 'marathon':
      return m.calc_distance_marathon();
    case 'mile':
      return m.calc_distance_mile();
    default:
      return key.replace('k', ' km').replace(/(\d)m$/, '$1 m');
  }
}
