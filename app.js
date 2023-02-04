const express = require('express');
const path = require('path');
const cookieSession = require('cookie-session');
var fs = require("fs");
const url = require("url");
var router = express.Router();
const bcrypt = require('bcryptjs');
var bodyParser = require('body-parser');
const { body, validationResult } = require('express-validator');
const mysql = require('mysql2');
const dbConnection = mysql.createPool({
    host     : 'localhost',
    user     : 'root', 
    password : '123456',
    database : 'fins'
}).promise();
module.exports = dbConnection;


const app = express();
app.use(express.urlencoded({extended:true}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.set('views', path.join(__dirname,'views'));
app.set('view engine','ejs');

app.use(cookieSession({
    name: 'session',
    keys: ['key1', 'key2'],
    maxAge:  3600 * 1000
}));


const ifLoggedin = (req,res,next) => {
    if(req.session.isLoggedIn){
        return res.redirect('/dashboard');
    }
    next();
}

const ifNotLoggedin = (req, res, next) => {
    if(!req.session.isLoggedIn){
        return res.render('home');
    }
    next();
}
 
app.get('/contact', function(req, res, next) {
    res.render('contact');
});

app.get('/vacancy', function(req, res, next) {
    res.render('vacancy');
});




app.get('/', ifNotLoggedin, (req,res,next) => {
    dbConnection.execute("SELECT `name`,`email`,`regtime`,`surname`, `city`, `about` FROM `users` WHERE `id`=?",[req.session.userID])
    .then(([rows]) => {
        res.render('dashboard',{
            name:rows[0].name,
            email:rows[0].email,
            regtime:rows[0].regtime,
            surname:rows[0].surname,
            city:rows[0].city,
            about:rows[0].about
        });
    });
    
});

app.get('/message',ifNotLoggedin, (req, res) => {
    let sql = "SELECT * FROM forms ORDER BY regtime DESC";
    let query = dbConnection.query(sql, (err, rows) => {
        if(err) throw err;
        res.render('message', {
            title : 'Vacancy',
            form : rows
        });
    });
});


app.get('/edit/:formId',ifNotLoggedin,(req, res) => {
    const formId = req.params.formId;
    let sql = `Select * from forms where id = ${formId}`;
    let query = dbConnection.query(sql,(err, result) => {
        if(err) throw err;
        res.render('messageedit', {
            title : 'Vacancy edit',
            form : result[0]
        });
    });
});


app.post('/update',(req, res) => {
    const formId = req.body.id;
    let sql = "update forms SET sname='"+req.body.sname+"',  surname='"+req.body.surname+"',  phone='"+req.body.phone+"',  email='"+req.body.email+"',  city='"+req.body.city+"',  age='"+req.body.age+"',  nodejs='"+req.body.nodejs+"',  mysqls='"+req.body.mysqls+"',  bootstrap='"+req.body.bootstrap+"',  education='"+req.body.education+"',  experience='"+req.body.experience+"',  salary='"+req.body.salary+"',  morei='"+req.body.morei+"',  regtime='"+req.body.regtime+"',  durum='"+req.body.durum+"' where id ="+formId;
    let query = dbConnection.query(sql,(err, results) => {
      if(err) throw err;
      res.redirect('/message');
    });
});


app.get('/delete/:formId',(req, res) => {
    const formId = req.params.formId;
    let sql = `DELETE from forms where id = ${formId}`;
    let query = dbConnection.query(sql,(err, result) => {
        if(err) throw err;
        res.redirect('/');
    });
});



var obj = {};
app.get('/about', function(req, res){
    dbConnection.execute('SELECT * FROM about', function(err, result) {
        if(err){
            throw err;
        } else {
            obj = {see: result};
            res.render('about', obj);                
        }
    });
});


var obj = {};
app.get('/form', function(req, res){
    dbConnection.execute('SELECT * FROM forms', function(err, result) {
        if(err){
            throw err;
        } else {
            obj = {see: result};
            res.render('form', obj);                
        }
    });
});




/*Add form start*/
app.post('/addform', 
[
    body('sname','Name Bosdur!').trim().not().isEmpty(),
],
(req,res,next) => {

    const validation_result = validationResult(req);
    const {sname, surname, email, phone, city, age, nodejs, mysqls, bootstrap, education, experience, salary, morei, durum} = req.body;
    if(validation_result.isEmpty()){
            dbConnection.execute("INSERT INTO `forms`(`sname`, `surname`,`email`,`phone`,`city`,`age`,`nodejs`,`mysqls`,`bootstrap`,`education`,`experience`,`salary`,`morei`,`durum`) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",[sname, surname, email, phone, city, age, nodejs, mysqls, bootstrap, education, experience, salary, morei, durum])
            .then(result => {
                return res.render('true');
            }).catch(err => {
                if (err) throw err;
            });
    }
    else{
        let allErrors = validation_result.errors.map((error) => {
            return error.msg;
        });
        res.render('vacancy',{
            addform_error:allErrors,
            old_data:req.body
        });
    }
});

/*Add form finish*/



/*Login start*/

app.post('/', ifLoggedin, [
    body('email').custom((value) => {
        return dbConnection.execute('SELECT `email` FROM `users` WHERE `email`=?', [value])
        .then(([rows]) => {
            if(rows.length == 1){
                return true;                
            }
            return Promise.reject('Email Error!');
        });
    }),
    body('password','Password Error!!').trim().not().isEmpty(),
], (req, res) => {
    const validation_result = validationResult(req);
    const {password, email} = req.body;
    if(validation_result.isEmpty()){
        dbConnection.execute("SELECT * FROM `users` WHERE `email`=?",[email])
        .then(([rows]) => {
            bcrypt.compare(password, rows[0].password).then(compare_result => {
                if(compare_result === true){
                    req.session.isLoggedIn = true;
                    req.session.userID = rows[0].id;
                    res.redirect('/');
                }
                else{
                    res.render('home',{
                        login_errors:['Invalid Password!']
                    });
                }
            })
            .catch(err => {
                if (err) throw err;
            });
        }).catch(err => {
            if (err) throw err;
        });
    }
    else{
        let allErrors = validation_result.errors.map((error) => {
            return error.msg;
        });
        res.render('home',{
            login_errors:allErrors
        });
    }
});

/*Login finish*/




/*Contact start*/
app.post('/addcontact', 
[
    body('mname','name Bosdur!').trim().not().isEmpty(),
    body('surname','Surname Bosdur!').trim().not().isEmpty(),
    body('email','Email Bosdur!').trim().not().isEmpty(),
    body('phone','Phone Bosdur!').trim().not().isEmpty(),
    body('subject','Subject Bosdur!').trim().not().isEmpty(),
    body('message','Message Bosdur!').trim().not().isEmpty(),
],
(req,res,next) => {

    const validation_result = validationResult(req);
    const {mname, surname, email, phone, subject, message} = req.body;
    if(validation_result.isEmpty()){
            dbConnection.execute("INSERT INTO `contact`(`mname`,`surname`,`email`,`phone`,`subject`,`message`) VALUES(?,?,?,?,?,?)",[mname,surname,email,phone,subject,message])
            .then(result => {
                return res.render('true');
            }).catch(err => {
                if (err) throw err;
            });
    }
    else{
        let allErrors = validation_result.errors.map((error) => {
            return error.msg;
        });
        res.render('home',{
            addcontact_error:allErrors,
            old_data:req.body
        });
    }
});

/*Contact finish*/



app.get('/logout',(req,res)=>{
    req.session = null;
    res.redirect('/');
});

app.use('/', (req,res) => {
    res.status(404).send('<center><h1>404 - Page Not Found!</h1></center>' );
});

var server = app.listen(8079, function () {
    var host = server.address().address
    var port = server.address().port
    console.log("Final App listening at http://%s:%s", host, port)
 });