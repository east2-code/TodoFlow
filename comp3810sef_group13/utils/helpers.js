// Shared helpers used by both the web controller and the API controller

const { PRIORITIES } = require('../models/todo');

// Escape regex characters typed by the user (so "a.b" is not a wildcard)
function escapeRegex(text = '') {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Parse YYYY-MM-DD as the end of that day; also accept a full ISO date string
function parseDeadline(value) {
  if (!value) return null;

  const text = String(value).trim();
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return new Date(Number(year), Number(month) - 1, Number(day), 23, 59, 59, 999);
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// Read and normalise the todo fields from a form body or a JSON body
function readTodoInput(body = {}) {
  const title = String(body.title || '').trim();
  const description = String(body.description || '').trim();

  // Unknown priority falls back to "medium"
  const priority = PRIORITIES.includes(body.priority) ? body.priority : 'medium';

  // A checkbox may arrive as true / 'true' / 'on'
  const completed =
    body.completed === true || body.completed === 'true' || body.completed === 'on';

  const deadline = parseDeadline(body.deadline);

  const error = title.length === 0 ? 'Title is required.' : null;

  return { data: { title, description, priority, completed, deadline }, error };
}

// One aggregation call computes: total, completed, overdue and per-priority counts
function todoStatsPipeline(match = {}) {
  return [
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        completed: { $sum: { $cond: ['$completed', 1, 0] } },
        high: { $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] } },
        medium: { $sum: { $cond: [{ $eq: ['$priority', 'medium'] }, 1, 0] } },
        low: { $sum: { $cond: [{ $eq: ['$priority', 'low'] }, 1, 0] } },
        overdue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$completed', false] },
                  { $ne: ['$deadline', null] },
                  { $lt: ['$deadline', new Date()] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ];
}

// Fill in zeros when the user has no tasks, and derive active / completion rate
function normalizeStats(rows) {
  const base = { total: 0, completed: 0, high: 0, medium: 0, low: 0, overdue: 0 };
  if (!rows || rows.length === 0) {
    return { ...base, active: 0, completionRate: 0 };
  }
  const { _id, ...rest } = rows[0];
  const stats = { ...base, ...rest };
  stats.active = stats.total - stats.completed;
  stats.completionRate = stats.total
    ? Math.round((stats.completed / stats.total) * 100)
    : 0;
  return stats;
}

module.exports = {
  escapeRegex,
  parseDeadline,
  readTodoInput,
  todoStatsPipeline,
  normalizeStats,
};
