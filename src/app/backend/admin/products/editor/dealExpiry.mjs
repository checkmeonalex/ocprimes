const pad = (value) => String(value).padStart(2, '0');

export const isoToDateTimeLocalInput = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) return '';
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-') + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const dateTimeLocalInputToIso = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toISOString();
};
