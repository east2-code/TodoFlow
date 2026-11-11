/**
 * RESTful JSON API for the todo resource.
 * URI = resource, HTTP method = operation
 */
const mongoose = require('mongoose');
const { Todo, PRIORITIES } = require('../models/todo');
const {
  escapeRegex,
  parseDeadline,
  readTodoInput,
  todoStatsPipeline,
  normalizeStats,
} = require('../utils/helpers');

// Small helpers for consistent JSON errors
function badRequest(res, message) {
  return res.status(400).json({ error: message });
}

function notFound(res, id) {
  return res.status(404).json({ error: `Todo "${id}" was not found.` });
}

// Build a MongoDB filter from optional query parameters
function buildFilter(query) {
  const filter = {};

  if (query.userid) filter.userid = String(query.userid);
  if (query.status === 'active') filter.completed = false;
  if (query.status === 'completed') filter.completed = true;
  if (PRIORITIES.includes(query.priority)) filter.priority = query.priority;

  const keyword = String(query.q || '').trim();
  if (keyword) {
    const regex = new RegExp(escapeRegex(keyword), 'i');
    filter.$or = [{ title: regex }, { description: regex }];
  }

  return filter;
}

// GET /api/todos - read all (optional filters)
exports.list = async (req, res, next) => {
  try {
    const todos = await Todo.find(buildFilter(req.query)).sort({ createdAt: -1 });
    res.status(200).json({ count: todos.length, todos });
  } catch (err) {
    next(err);
  }
};

// GET /api/todos/stats - aggregated numbers for the dashboard
exports.stats = async (req, res, next) => {
  try {
    const match = req.query.userid ? { userid: String(req.query.userid) } : {};
    const rows = await Todo.aggregate(todoStatsPipeline(match));
    res.status(200).json(normalizeStats(rows));
  } catch (err) {
    next(err);
  }
};

// GET /api/todos/status/:status - read by completion status
exports.byStatus = async (req, res, next) => {
  try {
    const { status } = req.params;
    if (!['active', 'completed'].includes(status)) {
      return badRequest(res, 'Status must be "active" or "completed".');
    }

    const filter = { completed: status === 'completed' };
    if (req.query.userid) filter.userid = String(req.query.userid);

    const todos = await Todo.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ status, count: todos.length, todos });
  } catch (err) {
    next(err);
  }
};

// GET /api/todos/priority/:priority - read by priority
exports.byPriority = async (req, res, next) => {
  try {
    const { priority } = req.params;
    if (!PRIORITIES.includes(priority)) {
      return badRequest(res, 'Priority must be "high", "medium" or "low".');
    }

    const filter = { priority };
    if (req.query.userid) filter.userid = String(req.query.userid);

    const todos = await Todo.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ priority, count: todos.length, todos });
  } catch (err) {
    next(err);
  }
};

// GET /api/todos/search/:keyword - title or description contains the keyword
exports.search = async (req, res, next) => {
  try {
    const keyword = String(req.params.keyword || '').trim();
    if (!keyword) return badRequest(res, 'Keyword must not be empty.');

    const regex = new RegExp(escapeRegex(keyword), 'i');
    const filter = { $or: [{ title: regex }, { description: regex }] };
    if (req.query.userid) filter.userid = String(req.query.userid);

    const todos = await Todo.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ keyword, count: todos.length, todos });
  } catch (err) {
    next(err);
  }
};

// GET /api/todos/:id - read one document
exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return badRequest(res, 'Invalid todo id.');

    const todo = await Todo.findById(id);
    if (!todo) return notFound(res, id);

    res.status(200).json(todo);
  } catch (err) {
    next(err);
  }
};

// POST /api/todos - create a document
exports.create = async (req, res, next) => {
  try {
    if (req.body.priority !== undefined && !PRIORITIES.includes(req.body.priority)) {
      return badRequest(res, 'Priority must be "high", "medium" or "low".');
    }
    if (
      req.body.deadline !== undefined &&
      req.body.deadline !== '' &&
      req.body.deadline !== null &&
      !parseDeadline(req.body.deadline)
    ) {
      return badRequest(res, 'Deadline must be a valid date, e.g. 2026-12-01.');
    }

    const { data, error } = readTodoInput(req.body);
    if (error) return badRequest(res, error);

    const todo = await Todo.create({
      ...data,
      // The API has no login, so the caller may pass userid (default: api-user)
      userid: String(req.body.userid || 'api-user').trim(),
    });

    res.status(201).json(todo);
  } catch (err) {
    if (err.name === 'ValidationError') return badRequest(res, err.message);
    next(err);
  }
};

// PUT /api/todos/:id - update only the fields that were sent
exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return badRequest(res, 'Invalid todo id.');

    const updates = {};

    if (req.body.title !== undefined) {
      updates.title = String(req.body.title).trim();
      if (updates.title.length === 0) return badRequest(res, 'Title must not be empty.');
    }
    if (req.body.description !== undefined) {
      updates.description = String(req.body.description).trim();
    }
    if (req.body.priority !== undefined) {
      if (!PRIORITIES.includes(req.body.priority)) {
        return badRequest(res, 'Priority must be "high", "medium" or "low".');
      }
      updates.priority = req.body.priority;
    }
    if (req.body.completed !== undefined) {
      updates.completed =
        req.body.completed === true ||
        req.body.completed === 'true' ||
        req.body.completed === 'on';
      updates.completedAt = updates.completed ? new Date() : null;
    }
    if (req.body.deadline !== undefined) {
      if (req.body.deadline === '' || req.body.deadline === null) {
        updates.deadline = null;
      } else {
        const parsed = parseDeadline(req.body.deadline);
        if (!parsed) {
          return badRequest(res, 'Deadline must be a valid date, e.g. 2026-12-01.');
        }
        updates.deadline = parsed;
      }
    }
    if (req.body.userid !== undefined) updates.userid = String(req.body.userid).trim();

    if (Object.keys(updates).length === 0) {
      return badRequest(res, 'No updatable field was provided.');
    }

    const todo = await Todo.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });
    if (!todo) return notFound(res, id);

    res.status(200).json(todo);
  } catch (err) {
    if (err.name === 'ValidationError') return badRequest(res, err.message);
    next(err);
  }
};

// DELETE /api/todos/:id - delete one document
exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return badRequest(res, 'Invalid todo id.');

    const todo = await Todo.findByIdAndDelete(id);
    if (!todo) return notFound(res, id);

    res.status(200).json({ message: 'Todo deleted.', deleted: todo });
  } catch (err) {
    next(err);
  }
};
