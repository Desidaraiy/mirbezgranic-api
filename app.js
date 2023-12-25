require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.options('*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.sendStatus(200);
});

app.get('/admin', (req, res) => {
  res.send('Привет, администратор!');
});
  
app.get('/admin/get-users', (req, res) => {
  const query = 'SELECT birthday, name, surname, patronymic FROM users';
  connection.query(query, (error, results) => {
    if (error) {
      console.error('Ошибка при получении списка пользователей: ', error);
      res.send({ success: false, error: 'Ошибка при получении списка пользователей :' + error });
    } else {
      res.send({ success: true, users: results });
    }
  });
});

app.get('/admin/get-users/:id', (req, res) => {
  const { id } = req.params;
  const query = 'SELECT * FROM users WHERE id = ?';
  connection.query(query, [id], (error, results) => {
    if (error) {
      console.error('Ошибка при получении пользователя: ', error);
      res.send({ success: false, error: 'Ошибка при получении пользователя' });
    } else {
      res.send({ success: true, user: results[0] });
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
            res.send({ success: true, name: admin.name, token: token });
          }
        });
      } else {
        res.send({ success: false, message: 'Неверные данные логина или пароля' });
      }
    }
  });
});

app.post('/admin/checkAuth', (req, res) => {
  const { token } = req.body;
  const query = 'SELECT * FROM admins WHERE token = ?';
  connection.query(query, [token], (error, results) => {
    if (error) {
      console.error('Ошибка при выполнении запроса: ', error);
      res.sendStatus(500);
    } else {
      if (results.length > 0) {
        res.send({ success: true, });
      } else {
        res.send({ success: false });
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

httpsServer.listen(3000, () => {
  console.log('Сервер запущен на порту 443 (HTTPS)');
});
