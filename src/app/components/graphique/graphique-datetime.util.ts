export function strToDate(dtStr: string | null): Date | null {
  if (!dtStr) return null;

  const dateParts = dtStr.split('/');
  const timeParts = dateParts[2].split(' ')[1].split(':');
  dateParts[2] = dateParts[2].split(' ')[0];

  return new Date(+dateParts[2], +dateParts[1] - 1, +dateParts[0], +timeParts[0], +timeParts[1]);
}

export function formatDate(date: string, time: string): Date {
  // Guard against empty or malformed inputs
  if (!date || !time) {
    return new Date(NaN);
  }

  const [day, month, yearRaw] = date.split('/');
  const [hour, minute] = time.split(':');

  let year = yearRaw;
  if (year && year.length === 2) {
    year = '20' + year;
  }

  const pad = (s?: string) => (s || '0').padStart(2, '0');

  return new Date(`${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00`);
}

export function calculateDuration(startDate: string, endDate: string): string {
  const start = strToDate(startDate);
  const end = strToDate(endDate);
  if (!start || !end) return '';

  const durationInMs = end.valueOf() - start.valueOf();
  const durationInSecs = Math.floor(durationInMs / 1000);
  const durationInMins = Math.floor(durationInSecs / 60);
  const durationInHours = Math.floor(durationInMins / 60);
  const durationInDays = Math.floor(durationInHours / 24);
  const remainingHours = durationInHours % 24;
  const remainingMins = durationInMins % 60;

  return `${durationInDays} Jr, ${remainingHours} Hr et ${remainingMins} Mn`;
}
