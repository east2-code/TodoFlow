const User = require('../models/user');

// Show the login page
exports.showLogin = (req, res) => {
  res.render('login', { title: 'Login', error: null, username: '' });
};

// Check the username and password, then create the session
exports.login = async (req, res, next) => {
  try {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');

    const user = await User.findOne({ username });
    if (!user || !user.verifyPassword(password)) {
      return res.status(401).render('login', {
        title: 'Login',
        error: 'Invalid username or password.',
        username,
      });
    }

    // Store the logged-in user in the cookie session
    req.session.user = { username: user.username, name: user.name };

    // Go back to the page that the user originally requested
    const target = req.session.returnTo || '/';
    req.session.returnTo = null;
    res.redirect(target);
  } catch (err) {
    next(err);
  }
};

// Show the registration page
exports.showRegister = (req, res) => {
  res.render('register', { title: 'Register', error: null, values: {} });
};

// Validate the input, hash the password and create the user
exports.register = async (req, res, next) => {
  try {
    const username = String(req.body.username || '').trim();
    const name = String(req.body.name || '').trim() || username;
    const password = String(req.body.password || '');
    const confirm = String(req.body.confirm || '');

    const values = { username, name };
    const fail = (status, error) =>
      res.status(status).render('register', { title: 'Register', error, values });

    if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) {
      return fail(400, 'Username must be 3-20 characters: letters, digits or underscore.');
    }
    if (password.length < 6) {
      return fail(400, 'Password must be at least 6 characters.');
    }
    if (password !== confirm) {
      return fail(400, 'The two passwords do not match.');
    }

    const exists = await User.findOne({ username });
    if (exists) {
      return fail(409, 'This username is already taken.');
    }

    // Store only salt + hash, never the plain password
    const { salt, hash } = User.hashPassword(password);
    const user = await User.create({ username, name, salt, passwordHash: hash });

    // Log the user in right after registration
    req.session.user = { username: user.username, name: user.name };
    res.redirect('/');
  } catch (err) {
    next(err);
  }
};

// Destroy the session and return to the login page
exports.logout = (req, res) => {
  req.session = null;
  res.redirect('/login');
};
