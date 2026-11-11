// Block guests and remember the page they wanted to open
function isLoggedIn(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  req.session.returnTo = req.originalUrl;
  return res.redirect('/login');
}

// Keep logged-in users away from the login and register pages
function isGuest(req, res, next) {
  if (req.session && req.session.user) {
    return res.redirect('/');
  }
  return next();
}

module.exports = { isLoggedIn, isGuest };
