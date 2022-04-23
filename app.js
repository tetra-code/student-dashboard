if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const express = require('express');
const ws = require("ws");
const app = express();
const bcrypt = require("bcrypt");
const passport = require('passport');
const flash = require('express-flash');
const session = require('express-session');
const methodOverride = require('method-override');
const http = require('http');
const port = process.env.PORT || 3000;

const users =[];

const initializePassport = require('./passport-config');
initializePassport(passport, 
    email => users.find(user => user.email === email),
    id => users.find(user => user.id === id)
);

app.set("views", `${__dirname}/views`);
app.set("view engine", "ejs");
app.use(
    express.static(`${__dirname}/public`), 
    express.urlencoded({ extended: false}),
    flash(),
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false
    }),
    passport.initialize(),
    passport.session(),
    methodOverride('_method')
)

app.get('/', checkNotAuthenticated, (req, res) => {
    res.render("splash");
})

app.get('/login', checkNotAuthenticated, (req, res) => {
    res.render("login");
})

app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
    successRedirect: '/home',
    failureRedirect: '/login',
    failureFlash: true
}))

app.get('/register', checkNotAuthenticated, (req, res) => {
    res.render("register");
})

app.post('/register', checkNotAuthenticated, async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        users.push({
            id: Date.now().toString(),
            username: req.body.username,
            email: req.body.email,
            password: hashedPassword
        })
        res.redirect('/login');
    } catch {
        res.redirect('/register')
    }
});

app.delete('/logout', (req, res) => {
    req.logout();
    res.redirect('/login');
});

app.get('/home', checkAuthenticated, (req, res) => {
    res.render("home", {name: req.user.username});
});

app.get('/calendar', checkAuthenticated, (req, res) => {
    res.render("calendar");
});

app.get('/timeline', checkAuthenticated, (req, res) => {
    res.render("timeline");
});

app.get('/settings', checkAuthenticated, (req, res) => {
    res.render("settings");
});

const server = http.createServer(app);
const wss = new ws.Server({ server });

wss.on("connection", (con) => {

    con.on("message", async (request) => {
      const city = JSON.parse(request)
      con.send(JSON.stringify(waterData[city]));
    });
  
    con.on("close", () => {
    })
});

function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return res.redirect('/home')
    }
    next();
}


server.listen(port, ()=>{
    console.log(`Server conected to port ${port}`);
});
