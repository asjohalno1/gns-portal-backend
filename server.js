const express = require('express');
const bodyParser = require('body-parser')
const validator = require('express-joi-validation').createValidator({ passError: true })
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, `.env.${process.env.NODE_ENV}`) })
const app = express();

// ✅ Allowed frontend origins
const allowedOrigins = [
    "http://localhost:5173", // dev frontend
    "http://localhost:2001" // production frontend domain
];

// ✅ CORS setup
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true
}));

// ✅ Headers middleware
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
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
 const { deleteAllClientFolders} = require('./api/services/googleDriveService.js');
 //listFilesInFolder("1cMxxr5kn83InV6wtrO515_Jr4tSlRX3B")
 //deleteAllClientFolders()

app.listen(process.env.PORT, () => {
    console.log(`app listening on port ${process.env.PORT}!`)
});




