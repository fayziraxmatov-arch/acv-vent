const crypto = require('crypto');

/** Gate: only logged-in admins pass; everyone else goes to the login page. */
function requireAuth(req, res, next) {
  if (req.session && req.session.adminId) return next();
  return res.redirect('/admin/login');
}

/** Ensure the session has a CSRF token and expose it to views. */
function csrfToken(req, res, next) {
  if (req.session && !req.session.csrf) {
    req.session.csrf = crypto.randomBytes(24).toString('hex');
  }
  res.locals.csrf = req.session ? req.session.csrf : '';
  next();
}

/** Verify the CSRF token on state-changing admin requests. */
function verifyCsrf(req, res, next) {
  const sent = req.body && req.body._csrf;
  if (req.session && sent && sent === req.session.csrf) return next();
  req.session.flash = { type: 'error', msg: 'Security token mismatch — the form was resubmitted or expired. Try again.' };
  return res.redirect(req.get('Referrer') || '/admin');
}

module.exports = { requireAuth, csrfToken, verifyCsrf };
