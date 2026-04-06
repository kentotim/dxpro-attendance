function requireLogin(req, res, next) {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    next();
}

function isAdmin(req, res, next) {
    console.log('管理者権限確認:', {
        userId: req.session.userId,
        isAdmin: req.session.isAdmin,
        username: req.session.username
    });
    if (req.session.isAdmin) {
        return next();
    }
    res.status(403).send('管理者権限が必要です');
}

module.exports = { requireLogin, isAdmin };
