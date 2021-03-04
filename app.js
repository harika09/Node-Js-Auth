//jshint esversion:6
require('dotenv').config()
const  express = require('express')
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose')
const encrypt = require('mongoose-encryption') //encryting password

const app = express()

const PORT = process.env.PORT || 3000;
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}))


mongoose.connect('mongodb://localhost:27017/userDB', {useNewUrlParser: true , useUnifiedTopology: true  })


const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields:['password'] })  // add the plugin before mongoose model


const User = new mongoose.model("User", userSchema);


//Index
app.get('/', (req, res)=>{
    res.render('home')
})


//Login Page
app.get('/login', (req, res)=>{
    res.render('login')
})

app.post('/login', (req, res)=>{
    const username = req.body.username;
    const password = req.body.password;

    User.findOne({email: username}, function(err, foundUser){
        if(err){
            console.log(err)
        }else{
            if(foundUser){ // if the user is true
                if(foundUser.password === password){ // checking current user if the password entered is equal to the existing user
                    res.render('secrets')
                }else{  
                    console.log("Auth failed")
                }
            }
        }
    })
})


//Registration Page
app.get('/register', (req, res)=>{
    res.render('register')
})

app.post('/register', (req, res) =>{
    const username = req.body.username;
    const password = req.body.password

    const newUser = User({
        email: username,
        password: password
    })

    newUser.save(function(err){
        if(err){
            console.log(err)
        }else{
            console.log("Success")
            res.render('secrets')
        }
    })
})








app.listen(PORT, ()=>{ console.log("Server is running on "+ PORT)})