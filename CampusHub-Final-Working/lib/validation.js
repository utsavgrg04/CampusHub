const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const date = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const coordinate = (value, limit) => value !== null && value !== undefined && value !== '' && typeof value !== 'boolean' && Number.isFinite(Number(value)) && Math.abs(Number(value)) <= limit;
const point = value => object(value) && coordinate(value.lat, 90) && coordinate(value.lng, 180);
const active = value => !['cancelled', 'canceled'].includes(String(value.status || '').toLowerCase());
function itemError(type, body) {
  if (!object(body)) return 'Item data must be an object.';
  const required = { task: 'title', goal: 'title', ach: 'title', calendar: 'title', post: 'text', notif: 'text', history: 'a' }[type];
  if (required && (typeof body[required] !== 'string' || !body[required].trim() || body[required].length > (type === 'post' ? 5000 : 2000))) return `Enter a valid ${required}.`;
  for (const key of ['due', 'date']) if (body[key] !== undefined && body[key] !== '' && !date(body[key])) return `Enter a valid ${key}.`;
  if (['calendar', 'ach'].includes(type) && !date(body.date)) return 'Enter a valid date.';
  for (const key of ['time', 'start']) if (body[key] && (typeof body[key] !== 'string' || !/^(?:[01]?\d|2[0-3]):[0-5]\d$/.test(body[key]))) return 'Enter a valid time.';
  if (type === 'task' && body.pri !== undefined && !['High', 'Medium', 'Low'].includes(body.pri)) return 'Choose a valid priority.';
  if (type === 'task' && body.done !== undefined && ![true, false, 0, 1].includes(body.done)) return 'Invalid task completion status.';
  if (type === 'goal' && (!Number.isFinite(body.target) || body.target <= 0 || !Number.isFinite(body.cur) || body.cur < 0 || body.cur > body.target)) return 'Goal progress must be between zero and its positive target.';
  if (['reg', 'bookmark'].includes(type) && (!Number.isSafeInteger(Number(body.eid)) || Number(body.eid) <= 0)) return 'Choose an existing event.';
  if (type === 'reg' && body.status !== undefined && !['registered', 'cancelled', 'canceled'].includes(body.status)) return 'Invalid registration status.';
  return null;
}
module.exports = { object, date, coordinate, point, active, itemError };
