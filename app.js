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

function generateToken() {
    const length = 20; // Длина токена
    const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; // Допустимые символы
    let token = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      token += characters.charAt(randomIndex);
    }
    return token;
}

const app = express();

app.get('/admin', (req, res) => {
    res.send('Привет, администратор!');
});
  
app.get('/admin/get-users', (req, res) => {
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

app.post('/admin/login', (req, res) => {
    const { login, password } = req.body;
    const query = 'SELECT * FROM admins WHERE login = ? AND password = ?';
  
    connection.query(query, [login, password], (error, results) => {
      if (error) {
        console.error('Ошибка при выполнении запроса: ', error);
        res.sendStatus(500);
      } else {
        if (results.length > 0) {
          const admin = results[0];
          const token = generateToken();
          const updateQuery = 'UPDATE admins SET token = ? WHERE id = ?';
          connection.query(updateQuery, [token, admin.id], (updateError) => {
            if (updateError) {
              console.error('Ошибка при обновлении токена: ', updateError);
              res.sendStatus(500);
            } else {
              res.send({ result: 'ok', name: admin.name, token: token });
            }
          });
        } else {
          res.send({ result: 'error', message: 'Неверные данные логина или пароля' });
        }
      }
    });
});

app.post('/admin/checkAuth', (req, res) => {
  const { login, password, token } = req.body;
  const query = 'SELECT * FROM admins WHERE login = ? AND password = ? AND token = ?';
  connection.query(query, [login, password, token], (error, results) => {
    if (error) {
      console.error('Ошибка при выполнении запроса: ', error);
      res.sendStatus(500);
    } else {
      if (results.length > 0) {
        res.send({ result: 'ok' });
      } else {
        res.send({ result: 'error' });
      }
    }
  });
});

app.get('/public', (req, res) => {
    res.send('Привет, фронтендер!');
});

const privateKey = fs.readFileSync('/var/www/httpd-cert/api.mirbezgranic-novsu.ru_2023-12-24-18-44_57.key', 'utf8');
const certificate = fs.readFileSync('/var/www/httpd-cert/api.mirbezgranic-novsu.ru_2023-12-24-18-44_57.crt', 'utf8');
const credentials = { key: privateKey, cert: certificate };
const httpsServer = https.createServer(credentials, app);

httpsServer.listen(443, () => {
    console.log('Сервер запущен на порту 443 (HTTPS)');
});
