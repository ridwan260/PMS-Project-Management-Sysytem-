var express = require('express');
var router = express.Router();
const path = require('path');
const helpers = require('../helpers/util.js');

module.exports = (pool) => {

    router.get('/', helpers.isLoggedIn, (req, res, next) => {
        const page = req.query.page || 1;
        const limit = 3;
        const offset = (page - 1) * limit;
        let params = [];
        const url = req.url == '/' ? '?page=1' : req.url;

        if (req.query.checkprojectid && req.query.projectid) {
            params.push(`project.projectid = ${req.query.projectid}`)
        };

        if (req.query.checkname && req.query.name) {
            params.push(`project.name ILIKE '%${req.query.toLowerCase()}'`)
        };

        if (req.query.checkmember && req.query.member) {
            params.push(`members.userid = ${req.query.member}`)
        };

        let sql = `SELECT COUNT(id) AS total FROM (SELECT DISTINCT projects.projectid AS id FROM projects LEFT JOIN members ON projects.projectid = members.projectid`;
        if (params.length > 0) {
            sql += `WHERE ${params.join(' AND ')}`;
        }
        sql += `) AS projectmember`;
        
        pool.query(sql, (err, count) => {
            console.log(count)
            const total = count.rows[0].total;
            const pages = Math.ceil(total / limit);
            // console.log(responser)


            sql = `SELECT DISTINCT projects.projectid, projects.name FROM projects LEFT JOIN members ON projects.projectid = members.projectid`;
            if (params.length > 0) {
                sql += ` WHERE ${params.join(' AND ')}`;
            }

            sql += ` ORDER BY projects.projectid LIMIT ${limit} OFFSET ${offset}`

            let subquery = `SELECT DISTINCT projects.projectid FROM projects LEFT JOIN members ON projects.projectid = members.projectid`
            if (params.length > 0) {
                subquery += ` WHERE ${param.join(' AND ')}`;
            }
            subquery += ` ORDER BY projects.projectid LIMIT ${limit} OFFSET ${offset} `

            let sqlMembers = `SELECT projects.projectid, users.userid, CONCAT (users.firstname,' ',users.lastname) AS fullname FROM projects LEFT JOIN members ON projects.projectid = members.projectid LEFT JOIN users ON users.userid = members.userid WHERE projects.projectid IN (${subquery})`
            // console.log(sql)
            pool.query(sql, (err, response) => {
                // console.log(response)
                if (err) throw err;
                pool.query(sqlMembers, (err, result) => {
                    response.rows.map(projects => {
                        projects.members = result.rows.filter(member => { return member.projectid == projects.projectid }).map(data => data.fullname)
                    });
                    let sqlusers = `SELECT * FROM users`;
                    let sqloptions = `SELECT projectsoptions FROM users WHERE userid =${req.session.user.userid}`;
                    pool.query(sqlusers, (err, data) => {
                        pool.query(sqlusers, (err, options) => {
                            res.render('project/list', {
                                title: 'project',
                                path: 'project',
                                data: response.rows,
                                query: req.query,
                                users: data.rows,
                                pagination: { pages, page, url },
                                user: req.session.user
                            })
                        });
                    });
                });
            });
        });
    });

    router.post('/', (req, res) => {
        let sql = `UPDATE users SET projectopions = '${JSON.stringify(req.body)}' WHERE userid = ${req.session.user.userid}`
        pool.query(sql, (err) => {
            if (err) throw err;
            res.redirect('/project')
        });
    });

    router.get('/add', helpers.isLoggedIn, (req, res, next) => {
        let sqladd = ` SELECT userid, firstname || '' || lastname AS fullname FROM users`;
        pool.query(sqladd, (err, result) => {
            if (err) throw err;
            res.render('project/add', {
                title: 'add project',
                path: 'project',
                users: result.rows,
                user: req.session.user
            });
        });
    });
    //add
    router.post('/add', helpers.isLoggedIn, (req, res, next) => {
        let sqladdName = ` INSERT INTO projects(name) VALUES('${req.body.projectname}')`;
        pool.query(sqladdName, (err, result) => {
            let sqladdNext = ` SELECT MAX(projectid) total FROM projects`;
            pool.query(sqladdNext, (err, result) => {
                if (err) throw err;
                let params = [];
                const projectid = result.rows[0].total;
                if (typeof req.body.members == 'string') {
                    params.push(` (${req.body.members}, ${projectid})`);

                } else {
                    for (let i = 0; i < req.body.members.length; i++) {
                        params.push(` (${req.body.members[i]}, ${projectid})`);
                    }
                }
                let sqlAddMembers = `INSERT INTO members(userid, projectid) VALUES ${params.join(', ')}`;
                pool.query(sqlAddMembers, (err) => {
                    if (err) throw err;
                    res.redirect('/project')
                });

            });

        });
    });

    // edit
    router.get('/edit/:id', helpers.isLoggedIn, (req, res, next) => {
        let pid = parseInt(req.params.id);
        let sqlEdit = `SELECT members.userid, projects.name, projects.projectid FROM members LEFT JOIN projects ON members.projectid = projects.projectid WHERE projects.projectid = $1`;
        pool.query(sqlEdit, [pid], (err, result) => {
            let sqlEditNext = `SELECT * FROM users`
            pool.query(sqlEditNext, (err, data) => {
                if (err) throw err;
                res.render('project/edit', {
                    title: 'Edit Project',
                    path: 'project',
                    name: result.rows[0],
                    projectid: result.rows[0].projectid,
                    members: result.rows.map(item => item.userid),
                    users: data.rows
                });
            });
        });
    });
    //data update//
   
    router.post('/edit/:id', helpers.isLoggedIn, (req, res, next) => {
        let pid = parseInt(req.params.id);
        let sqlEdit = `UPDATE projects SET name = '${req.body.name}' WHERE projectid = $1`;
        console.log('Edit ' + sqlEdit)
        pool.query(sqlEdit, [pid], (err, result) => {
            sqlEditNext = `DELETE FROM members WHERE projectid = $1`;
            console.log('Next edit ' +sqlEditNext)
            pool.query(sqlEditNext, [pid], (err, response) => {
                let params = [];
                if(typeof req.body.members == 'string') {
                    params.push(`(${req.body.members}, ${pid})`)
                } else {
                    for (let i = 0; i < req.body.members.length; i++) {
                        params.push(`(${req.body.members[i]}, ${pid})`)
                    }
                }
                let sqlPush = `INSERT INTO members (userid, projectid) VALUES ${params.join(', ')}`;
                console.log('Push edit ' + sqlPush)
                pool.query(sqlPush, (err) => {
                    if (err) throw err;
                    res.redirect('/project')
                });
            });
        });
    });


 // delete
 router.get('/delete/:id', helpers.isLoggedIn, (req, res, next) => {
    let projectid = parseInt(req.params.id);
    let sqlDelete = `DELETE FROM members WHERE projectid = $1`;
    pool.query(sqlDelete, [projectid], (err, response) => {
        if (err) throw err;
        let sqlDeleteNext = `DELETE FROM projects WHERE projectid = $1`;
        pool.query(sqlDeleteNext, [projectid], (err, response) => {
            if (err) throw err;
            res.redirect('/project')
        });
    });
});

    // overview
    router.get('/overview/:projectid', helpers.isLoggedIn, (req, res, next) => {
        res.render('project/overview/view', { title: 'Overview', path: "project" });
    });

    router.get('/activity/:projectid', helpers.isLoggedIn, (req, res, next) =>{
        res.render('project/activity/view', { title: 'Activity', path: "project"});
    });

    router.get('/issues/:projectid', helpers.isLoggedIn, (req, res, next) =>{
        res.render('project/issues/view', { title: 'issues', path: "project"});
    });

    // members
    router.get('/members/:projectid', helpers.isLoggedIn, (req, res, next) => {
        res.render('project/members/view', { title: 'Members', path: "project" });
    });

    router.post('/members/:projectid', helpers.isLoggedIn, (req, res, next) => {
        res.redirect('project/members/view');
    });
    
    // add members
    router.get('/project/members/add', helpers.isLoggedIn, (req, res, next) => {
        res.render('project/members/add', { title: 'Add Members', path: "project" });
    });


    return router;
}