const mongoose = require('mongoose');
const { Todo } = require('../models/todo');
const {
  escapeRegex,
  readTodoInput,
  todoStatsPipeline,
  normalizeStats,
} = require('../utils/helpers');

// Sort order used by the "By priority" option
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

// Shared 404 page
function renderNotFound(res, message) {
  return res.status(404).render('error', {
    title: 'Not Found',
    status: 404,
    message,
  });
}

// Turn the query string into a MongoDB filter (always limited to the current user)
function buildFilter(userid, query) {
  const filter = { userid };

  if (query.status === 'active') filter.completed = false;
  if (query.status === 'completed') filter.completed = true;

  if (['high', 'medium', 'low'].includes(query.priority)) {
    filter.priority = query.priority;
  }

  const keyword = String(query.q || '').trim();
  if (keyword) {
    const regex = new RegExp(escapeRegex(keyword), 'i');
    filter.$or = [{ title: regex }, { description: regex }];
  }

  return filter;
}

// Sort in memory: each user only has a small number of tasks
function sortTodos(todos, sortBy) {
  const list = [...todos];

  if (sortBy === 'priority') {
    list.sort(
      (a, b) =>
        PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
        b.createdAt - a.createdAt
    );
  } else if (sortBy === 'deadline') {
    list.sort((a, b) => {
      const da = a.deadline ? a.deadline.getTime() : Number.POSITIVE_INFINITY;
      const db = b.deadline ? b.deadline.getTime() : Number.POSITIVE_INFINITY;
      return da - db;
    });
  } else {
    list.sort((a, b) => b.createdAt - a.createdAt);
  }

  return list;
}

// GET / - dashboard: statistics + filters + task list
exports.list = async (req, res, next) => {
  try {
    const userid = req.session.user.username;

    const query = {
      status: ['all', 'active', 'completed'].includes(req.query.status)
        ? req.query.status
        : 'all',
      priority: ['high', 'medium', 'low'].includes(req.query.priority)
        ? req.query.priority
        : 'all',
      q: String(req.query.q || '').trim(),
      sort: ['created', 'deadline', 'priority'].includes(req.query.sort)
        ? req.query.sort
        : 'created',
    };

    const filter = buildFilter(userid, query);
    const todos = await Todo.find(filter).limit(200);

    // Statistics always cover all tasks of the user, not only the filtered list
    const stats = normalizeStats(await Todo.aggregate(todoStatsPipeline({ userid })));

    res.render('list', {
      title: 'My Tasks',
      activeNav: 'list',
      todos: sortTodos(todos, query.sort),
      stats,
      query,
      msg: req.query.msg ? String(req.query.msg) : '',
    });
  } catch (err) {
    next(err);
  }
};

// GET /todos/new - empty create form
exports.showCreate = (req, res) => {
  res.render('create', {
    title: 'New Task',
    activeNav: 'new',
    todo: {},
    error: null,
  });
};

// POST /todos - insert a new task for the current user
exports.create = async (req, res, next) => {
  try {
    const { data, error } = readTodoInput(req.body);

    if (error) {
      return res.status(400).render('create', {
        title: 'New Task',
        activeNav: 'new',
        todo: req.body,
        error,
      });
    }

    await Todo.create({ ...data, userid: req.session.user.username });
    res.redirect(`/?msg=${encodeURIComponent('Task created.')}`);
  } catch (err) {
    next(err);
  }
};

// GET /todos/:id - read one task
exports.details = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return renderNotFound(res, 'Invalid task id.');

    const todo = await Todo.findOne({ _id: id, userid: req.session.user.username });
    if (!todo) return renderNotFound(res, 'Task not found.');

    res.render('details', { title: todo.title, todo });
  } catch (err) {
    next(err);
  }
};

// GET /todos/:id/edit - form filled with the current values
exports.showEdit = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return renderNotFound(res, 'Invalid task id.');

    const todo = await Todo.findOne({ _id: id, userid: req.session.user.username });
    if (!todo) return renderNotFound(res, 'Task not found.');

    res.render('edit', { title: 'Edit Task', todo, error: null });
  } catch (err) {
    next(err);
  }
};

// POST /todos/:id - update the task
exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return renderNotFound(res, 'Invalid task id.');

    const todo = await Todo.findOne({ _id: id, userid: req.session.user.username });
    if (!todo) return renderNotFound(res, 'Task not found.');

    const { data, error } = readTodoInput(req.body);
    if (error) {
      return res.status(400).render('edit', {
        title: 'Edit Task',
        todo: { ...todo.toObject(), ...req.body },
        error,
      });
    }

    todo.set(data);
    todo.completedAt = data.completed ? todo.completedAt || new Date() : null;
    await todo.save();

    res.redirect(`/?msg=${encodeURIComponent('Task updated.')}`);
  } catch (err) {
    next(err);
  }
};

// POST /todos/:id/toggle - switch between active and completed
exports.toggle = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return renderNotFound(res, 'Invalid task id.');

    const todo = await Todo.findOne({ _id: id, userid: req.session.user.username });
    if (!todo) return renderNotFound(res, 'Task not found.');

    todo.completed = !todo.completed;
    todo.completedAt = todo.completed ? new Date() : null;
    await todo.save();

    res.redirect('/');
  } catch (err) {
    next(err);
  }
};

// POST /todos/:id/delete - delete one task
exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return renderNotFound(res, 'Invalid task id.');

    const result = await Todo.deleteOne({
      _id: id,
      userid: req.session.user.username,
    });
    if (result.deletedCount === 0) return renderNotFound(res, 'Task not found.');

    res.redirect(`/?msg=${encodeURIComponent('Task deleted.')}`);
  } catch (err) {
    next(err);
  }
};

// POST /todos/clear-completed - deleteMany for all completed tasks of this user
exports.clearCompleted = async (req, res, next) => {
  try {
    const result = await Todo.deleteMany({
      userid: req.session.user.username,
      completed: true,
    });

    res.redirect(
      `/?msg=${encodeURIComponent(`${result.deletedCount} completed task(s) cleared.`)}`
    );
  } catch (err) {
    next(err);
  }
};
