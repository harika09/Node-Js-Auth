//jshint esversion:6
require('dotenv').config()
const  express = require('express')
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose')
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose')

//google Auth
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const e = require('express');

const app = express()

const PORT = process.env.PORT || 3000;
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}))

let currentUrl = '';

app.use(session({
    secret: "The Secret",
    resave: false,
    saveUninitialized: false
}))

app.use(passport.initialize());
app.use(passport.session()) //Setup session


mongoose.connect('mongodb://localhost:27017/userDB', {useNewUrlParser: true , useUnifiedTopology: true  })
mongoose.set('useCreateIndex', true)//fixed  collection.ensureIndex is deprecated. Use createIndexes instead.

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String, //saving googleID
    secret: String
});

userSchema.plugin(passportLocalMongoose);
//Google plugin
userSchema.plugin(findOrCreate)

//userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields:['password'] })  // add the plugin before mongoose model
const User = new mongoose.model("User", userSchema);

// CHANGE: USE "createStrategy" INSTEAD OF "authenticate"
passport.use(User.createStrategy());

// use static serialize and deserialize of model for passport session support
passport.serializeUser(function(user, done){
    done(null, user.id)
});
passport.deserializeUser(function(id, done){
    User.findById(id, function(err, user){
        done(err, user)
    })
})

//Google Auth Here 
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets", //Re-direct if user is authenticate succesfully
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo", // Authenticate user
    
},
  function(accessToken, refreshToken, profile, cb) {
    //console.log(profile)
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));
//Google Auth END Here 


//Index
app.get('/', (req, res)=>{
   
    if(req.isAuthenticated){
        res.redirect('/secrets')
    }else{
        res.render('home')
    }
})

//Google Login
app.get('/auth/google',
    passport.authenticate('google', { 
      scope: ['profile'] 
}))

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
});
//Google Login END Here



//Login Page
app.get('/login', (req, res)=>{
    if(req.isAuthenticated()){
        res.redirect('/secrets')
   
    }else{
        console.log("mali")
        res.render('login')
    }
    //2343
})

app.post('/login', (req, res)=>{
    const user  = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function(err){
        if(err){
            console.log(err)
        }else{
            passport.authenticate("local")(req, res, function(){
                res.redirect("secrets")
                console.log("Authentication Success")
            })
        }
    })

})


//Registration Page
app.get('/register', (req, res)=>{
    if(req.isAuthenticated()){ //check if the user is authenticated and it will redirect to the home page
        res.redirect('/secrets')
    }else{
        res.render('register')
    }
});


app.post('/register', (req, res) =>{
    User.register({username: req.body.username}, req.body.password, function(err, user){
        if(err){
            console.log(err)
            res.redirect('/register')
        }else{
            passport.authenticate("local")(req, res, function(){
                res.redirect("secrets")
                console.log("Sucess")
            });
        }
    });
});

app.get('/secrets', (req, res)=>{
  if(req.isAuthenticated()){
    User.find({'secret': {$ne: null}}, function(err, foundUser){
        if(err){
            console.log(err)
        }else{
            if(foundUser){
                res.render('secrets', {usersWithSecrets: foundUser})
            }
        }
    })
  }else{
      res.render('home')
  }
});


app.get('/submit', (req, res)=>{
    if(req.isAuthenticated()){
        res.render('submit')
    }else{
        res.redirect('/')
    }
})


app.post('/submit', (req, res)=>{
    const submitSecret = req.body.secret

   // console.log(req.user.username)

   User.findById(req.user.id, function(err, foundUser){
       if(err){
        console.log(err)
       }else{
        if(foundUser){
            foundUser.secret = submitSecret; //input
            foundUser.save(function(err){
                if(err){
                    console.log(" Failed to Submit " + err)
                }else{
                    console.log("Saved")
                    res.redirect("/secrets")
                }
            })
        }
       }
   })


})


app.get('/logout', (req, res)=>{
    req.logout();
    res.redirect("/")
})

//Hanle Error 404
app.use(function(req, res, next) {
   if(req.isAuthenticated){
        req.statusCode = 404;
        res.redirect('/secrets')
       
        
   }else{
    req.statusCode = 404;
    res.redirect('/')
   }
});






app.listen(PORT, ()=>{ console.log("Server is running on "+ PORT)})