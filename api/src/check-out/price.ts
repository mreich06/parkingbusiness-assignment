const HOUR_MS = 3_600_000;

// Each started hour, counted in elapsed time from check-in, goes to the local calendar day it starts in;
// each day's total is capped separately
export function price(checkedInAt: Date, checkedOutAt: Date, hourlyRate: number, dailyCap: number, timeZone: string) {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone });
  const hoursPerDay = new Map<string, number>();
  for (let t = checkedInAt.getTime(); t < checkedOutAt.getTime(); t += HOUR_MS) {
    const key = day.format(t);
    hoursPerDay.set(key, (hoursPerDay.get(key) ?? 0) + 1);
  }
  return [...hoursPerDay.values()].reduce((sum, hours) => sum + Math.min(hours * hourlyRate, dailyCap), 0);
}
