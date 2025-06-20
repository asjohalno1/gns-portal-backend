const express = require('express');
const bodyParser = require('body-parser')
const validator = require('express-joi-validation').createValidator({ passError: true })
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, `.env.${process.env.NODE_ENV}`) })
const app = express();
app.use(cors());


app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    next();
});

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json({limit :'100mb'}))
console.log("NODE_ENV:", process.env.NODE_ENV);

app.use('/apidoc', express.static(path.join(__dirname, '/apidoc/doc')));
require('./api/routes')(app, validator);

/**Reminder */
// let remainder = require('./api/services/mail.services');
// remainder("saini@yopmail.com","reminder","https://www.google.com")


/**Db Require */
let connectDB = require('./api/lib/db');
connectDB()
app.use((err, req, res, next) => {
    if (err && err.error && err.error.isJoi) {
        res.status(400).json({ status: false, message: err.error.message, data: null });
    }
    next()
});
 const { createClientFolder,listFilesInFolder} = require('./api/services/googleDriveService.js');
 //listFilesInFolder("1cMxxr5kn83InV6wtrO515_Jr4tSlRX3B")
// createClientFolder()

app.listen(process.env.PORT, () => {
    console.log(`app listening on port ${process.env.PORT}!`)
});




