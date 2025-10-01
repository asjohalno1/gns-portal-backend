// server.js
const http = require('http');
const https = require('https');
const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const validator = require('express-joi-validation').createValidator({ passError: true });
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const { initSocket } = require('./api/services/socket');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, `.env.${process.env.NODE_ENV}`) });

const app = express();

// ✅ CORS setup
app.use(cors({
    origin: true,         // Reflects origin in Access-Control-Allow-Origin
    credentials: true     // Allows cookies/auth headers
}));

// ✅ Headers middleware — handle preflight
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");

    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }
    next();
});

// ✅ Body parsers
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ limit: '100mb' }));

console.log("NODE_ENV:", process.env.NODE_ENV);

// ✅ Static & API routes
app.use('/apidoc', express.static(path.join(__dirname, '/apidoc/doc')));
require('./api/routes')(app, validator);
app.use('/uploads', express.static(path.join(__dirname, 'api/uploads')));

// ✅ Connect DB
const connectDB = require('./api/lib/db');
connectDB();

// ✅ Joi validation error handler
app.use((err, req, res, next) => {
    if (err && err.error && err.error.isJoi) {
        return res.status(400).json({ status: false, message: err.error.message, data: null });
    }
    next();
});

// ✅ Token handler static files
app.use("/dist/client/token-handler/assets",
    express.static(path.join(__dirname, "dist/client/token-handler/assets"))
);

app.get("/dist/client/token-handler/*", (req, res) => {
    res.sendFile(path.join(__dirname, "dist/client/token-handler/index.html"));
});

// ✅ Create HTTP or HTTPS server
let server;
if (process.env.NODE_ENV === "staging") {
    server = https.createServer(
        {
            key: fs.readFileSync("/home/ubuntu/ssl/privkey.pem"),
            cert: fs.readFileSync("/home/ubuntu/ssl/fullchain.pem")
        },
        app
    );
} else {
    server = http.createServer(app);
}

// ✅ Initialize socket with the correct server
initSocket(server);

// ✅ Start server
server.listen(process.env.PORT, () => {
    console.log(`App listening on ${process.env.NODE_ENV === 'staging' ? 'HTTPS' : 'HTTP'} port ${process.env.PORT}`);
});
