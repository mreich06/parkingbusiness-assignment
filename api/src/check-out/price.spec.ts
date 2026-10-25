import { price } from './price.js';

const car = [500, 3000] as const;
const motor = [300, 1800] as const;
const resident = [0, 0] as const;

// Times are UTC; Amsterdam is UTC+2 until 2026-10-25 01:00 UTC, then UTC+1
it.each([
  ['AC1: car 09:00 to 10:40', '2026-10-21T07:00Z', '2026-10-21T08:40Z', car, 1000],
  ['AC1: motorcycle 09:00 to 10:40', '2026-10-21T07:00Z', '2026-10-21T08:40Z', motor, 600],
  ['AC1: resident is free', '2026-10-21T07:00Z', '2026-10-21T08:40Z', resident, 0],
  ['AC2: car 24 hours, each day capped', '2026-10-21T08:00Z', '2026-10-22T08:00Z', car, 6000],
  ['R6: motorcycle 18:00 to 06:00, split at Amsterdam midnight', '2026-10-21T16:00Z', '2026-10-22T04:00Z', motor, 3600],
  ['A2: car 01:00 to 04:00 on the DST day is 4 elapsed hours', '2026-10-24T23:00Z', '2026-10-25T03:00Z', car, 2000],
  ['R6: car 20:00 to 00:30 over the 25-hour DST day, each day capped', '2026-10-24T18:00Z', '2026-10-25T23:30Z', car, 5500],
] as const)('%s', (_name, from, to, [rate, cap], expected) => {
  expect(price(new Date(from), new Date(to), rate, cap, 'Europe/Amsterdam')).toBe(expected);
});
