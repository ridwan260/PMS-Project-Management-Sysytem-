var express = require('express');
var router = express.Router();
const bodyParser = require('body-parser');
const path = require('path');
const isLoggedIn = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        req.session.latestUrl = req.originalUrl;
        res.redirect('/');
    }
};
const moment = require('moment');
moment().format();

/* GET users listing. */
router.get('/', isLoggedIn, (req, res, next) => {
  res.render('users/add', { title: 'users', path: "users" });
});

module.exports = router;
