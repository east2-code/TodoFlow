const express = require('express');
const router = express.Router();

const auth = require('../controllers/authController');
const todo = require('../controllers/todoWebController');
const { isLoggedIn, isGuest } = require('../middleware/auth');

// Public pages: login and registration
router.get('/login', isGuest, auth.showLogin);
router.post('/login', isGuest, auth.login);
router.get('/register', isGuest, auth.showRegister);
router.post('/register', isGuest, auth.register);
router.get('/logout', auth.logout);

// Every route below this line requires a logged-in user
router.use(isLoggedIn);

router.get('/', todo.list);

// Fixed paths must be declared before "/:id"
router.get('/todos/new', todo.showCreate);
router.post('/todos/clear-completed', todo.clearCompleted);
router.post('/todos', todo.create);

router.get('/todos/:id', todo.details);
router.get('/todos/:id/edit', todo.showEdit);
router.post('/todos/:id', todo.update);
router.post('/todos/:id/toggle', todo.toggle);
router.post('/todos/:id/delete', todo.remove);

module.exports = router;
