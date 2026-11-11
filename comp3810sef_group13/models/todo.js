const mongoose = require('mongoose');

// Priority values shared by the web pages and the REST API
const PRIORITIES = ['high', 'medium', 'low'];

// Todo document: every task belongs to one user (userid)
const todoSchema = new mongoose.Schema({
  userid: { type: String, required: true, index: true },

  title: {
    type: String,
    required: [true, 'Title is required.'],
    trim: true,
    minlength: 1,
    maxlength: 80,
  },
  description: {
    type: String,
    default: '',
    trim: true,
    maxlength: 500,
  },
  priority: {
    type: String,
    enum: PRIORITIES,
    default: 'medium',
  },
  completed: {
    type: Boolean,
    default: false,
  },
  deadline: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: {
    type: Date,
    default: null,
  },
});

// Derived field: a task is overdue when it is not completed and the deadline has passed
todoSchema.virtual('isOverdue').get(function isOverdue() {
  if (this.completed || !this.deadline) return false;
  return this.deadline.getTime() < Date.now();
});

// Include virtual fields when a document is rendered in EJS or returned as JSON
todoSchema.set('toObject', { virtuals: true });
todoSchema.set('toJSON', { virtuals: true });

module.exports = {
  Todo: mongoose.model('Todo', todoSchema),
  PRIORITIES,
};
