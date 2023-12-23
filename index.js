require('dotenv').config();
const express = require('express');
const mysql = require('mysql');
const https = require("https");
const fs = require("fs");

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
});

connection.connect((err) => {
    if (err) {
        console.error('Ошибка подключения к базе данных: ', err);
    } else {
        console.log('Подключение к базе данных успешно установлено');
    }
});

function checkAdminAuthentication(req, res, next) {
    const { 'admin-name': username, 'admin-pass': password } = req.headers;
    const query = 'SELECT * FROM admins WHERE username = ? AND password = ?';
    connection.query(query, [username, password], (error, results) => {
    if (error) {
        console.error('Ошибка при проверке аутентификации администратора: ', error);
        res.sendStatus(500);
    } else {
        if (results.length > 0) {
            next();
        } else {
            res.sendStatus(401); 
        }
    }
    });
  }

const app = express();

app.get('/admin', checkAdminAuthentication, (req, res) => {
    res.send('Привет, администратор!');
});
  
app.get('/admin/get-users', checkAdminAuthentication, (req, res) => {
    const query = 'SELECT * FROM users';
    connection.query(query, (error, results) => {
        if (error) {
            console.error('Ошибка при получении списка пользователей: ', error);
            res.send({ success: false, error: 'Ошибка при получении списка пользователей' });
        } else {
            res.send({ success: true, users: results });
        }
    });
});

app.get('/public', (req, res) => {
    res.send('Привет, фронтендер!');
});

// const privateKey = fs.readFileSync('path/to/private.key', 'utf8');
// const certificate = fs.readFileSync('path/to/certificate.crt', 'utf8');
// const credentials = { key: privateKey, cert: certificate };
// const httpsServer = https.createServer(credentials, app);

// httpsServer.listen(443, () => {
//     console.log('Сервер запущен на порту 443 (HTTPS)');
// });

app.listen(3000, () => {
    console.log('Сервер запущен на порту 3000');
});