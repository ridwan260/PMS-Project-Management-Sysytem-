var express = require('express');
var router = express.Router();

module.exports = (pool) => {

  router.get('/', function (req, res, next) {
    res.render('login', { title: 'Login' });
  });

  router.post('/login', function (req, res, next) {
    let { email, password } = req.body;
    let sql = `SELECT * FROM users WHERE email='${email}'`;

    pool.query(sql, (err, response) => {
      if (response.rows.length > 0) {
        if (email == response.rows[0].email && password == response.rows[0].password) {
          response.rows[0].password = null;
          req.session.user = response.rows[0];
          res.redirect('/project');
        } else {
          req.flash('info', 'Password is wrong');
          res.redirect('/');
        }
      } else {
        req.flash('info', 'Email is wrong')
        res.redirect('/');
      }
    })
  })


  return router;
}