require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const https = require("https");
const fs = require("fs");
const nodemailer = require('nodemailer');

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

let transporter = nodemailer.createTransport({
  host: 'smtp.beget.com',
  name: 'mirbezgranic-novsu.ru',
  port: 465,
  secure: true,
  auth: {
      user: 'info@mirbezgranic-novsu.ru',
      pass: 'QoBkq3&o',
  },
});

async function sendSosEmail (user, message){
  let result = await transporter.sendMail({
    from: '"Мир без границ" <info@mirbezgranic-novsu.ru>',
    to: 'kent2011981@gmail.com',
    subject: 'Тревожная кнопка. Мир Без Границ.',
    html: `
      <h1>Добрый день</h1>
      <h2>Пользователь запросил помощь</h2>
      <p>Cообщение: ${message}</p>
      <ul style="font-size: 20px">
        <li>Телефон: ${user.phone}</li>
        <li>Email: ${user.email}</li>
        <li>Имя: ${user.name}</li>
        <li>Фамилия: ${user.surname}</li>
      </ul>
    `,
  });
  return result;
}

async function sendRVPOEmail (user, type){
  let message = type === 1 ? 'Пользователь заказал справку о регистрации' : 'Пользователь заказал справку для РВПО';
  let subject = type === 1 ? 'Заказана справка о регистрации. Мир Без Границ' : 'Заказана справка для РВПО. Мир Без Границ';
  let result = await transporter.sendMail({
    from: '"Мир без границ" <info@mirbezgranic-novsu.ru>',
    to: 'kent2011981@gmail.com',
    subject: subject,
    html: `
      <h1>Добрый день</h1>
      <h2>${message}</h2>
      <ul style="font-size: 20px">
        <li>Телефон: ${user.phone}</li>
        <li>Email: ${user.email}</li>
        <li>Имя: ${user.name}</li>
        <li>Фамилия: ${user.surname}</li>
      </ul>
    `,
  });
  return result;
}

function generateToken() {
  const length = 20;
  const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
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
  const query = 'SELECT id, birthday, name, surname, patronymic FROM users';
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

app.post('/public/auth', (req, res) => {
  const { phone } = req.body;
  const query = 'SELECT * FROM users WHERE phone = ?';
  connection.query(query, [phone], (error, results) => {
    if (error) {
      console.error('Ошибка при выполнении запроса: ', error);
      res.sendStatus(500);
    } else {
      if (results.length > 0) {
        res.send({ success: true, user: results[0] });
      } else {
        res.send({ success: false });
      }
    }
  })
})

app.post('/public/register', (req, res) => {

  const { 
    phone,
    push_id,
    birthday,
    name,
    surname,
    patronymic,
    country,
    email,
    sex, 
    universityYearOfEntry,
    universityCourse,
    universityAcademicUnit,
    universityUnit,
    univeristyFaculty,
    contactPersonName,
    contactPersonSurname,
    contactPersonPatronymic,
    contactPersonPhone,
    contactPersonIsForMe,
    contactPersonEmail,
    documentsDateOfArrival,
    documentsDateOfVisaExpiring,
    documentsDateOfPassportExpiring,
  } = req.body;
  
  const query = `INSERT INTO users (
    phone,
    push_id,
    birthday,
    name,
    surname,
    patronymic,
    country,
    email,
    sex,
    universityYearOfEntry,
    universityCourse,
    universityAcademicUnit,
    universityUnit,
    univeristyFaculty,
    contactPersonName,
    contactPersonSurname,
    contactPersonPatronymic,
    contactPersonPhone,
    contactPersonIsForMe,
    contactPersonEmail,
    documentsDateOfArrival,
    documentsDateOfVisaExpiring,
    documentsDateOfPassportExpiring
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const values = [
    phone,
    push_id,
    birthday,
    name,
    surname,
    patronymic,
    country,
    email,
    sex,
    universityYearOfEntry,
    universityCourse,
    universityAcademicUnit,
    universityUnit,
    univeristyFaculty,
    contactPersonName,
    contactPersonSurname,
    contactPersonPatronymic,
    contactPersonPhone,
    contactPersonIsForMe,
    contactPersonEmail,
    documentsDateOfArrival,
    documentsDateOfVisaExpiring,
    documentsDateOfPassportExpiring,
  ];

  connection.query(query, values, (error, results) => {
    if (error) {
      console.error('Ошибка при выполнении запроса: ', error);
      // res.sendStatus(500);
      res.send({ success: false, message: 'Произошла ошибка при регистрации: ' + error + ', phone is ' + phone  + ' req is ' + JSON.stringify(req.body) });
    } else {
      res.send({ success: true });
    }
  });
});

app.post('/public/takeACourse', (req, res) => {
  const { phone } = req.body;
  const query = 'UPDATE users SET hasTakenCourse = ? WHERE phone = ?';
  connection.query(query, [1, phone], (error, results) => {
    if (error) {
      console.error('Ошибка при выполнении запроса: ', error);
      res.send({success : false, message: 'Произошла ошибка при регистрации: ' + error + ', phone is ' + phone  + ' req is ' + JSON.stringify(req.body) });
    } else {
      if (results.length > 0) {
        res.send({ success: true });
      } else {
        res.send({ success: false });
      }
    }
  })
})

app.post('/public/sendEmailSos', (req, res) => {
  const { id, message } = req.body;
  const userbyId = `SELECT * FROM users WHERE id = ${id}`;
  connection.query(userbyId, async  (error, results) => {
    if (error) {
      res.send({success: false, message: 'Произошла ошибка. ' + error});
    } else {
      if (results.length > 0) {
        const user = results[0];
        let result = await sendSosEmail(user, message);
        res.send({ success: true, result: result});
      } else {
        res.send({ success: false });
      }
    }    
  })
})

app.post('/public/sendRVPOEmail', (req, res) => {
  const { id, type } = req.body;
  const userbyId = `SELECT * FROM users WHERE id = ${id}`;
  connection.query(userbyId, async  (error, results) => {
    if (error) {
      res.send({success: false, message: 'Произошла ошибка. ' + error});
    } else {
      if (results.length > 0) {
        const user = results[0];
        let result = await sendRVPOEmail(user, type);
        res.send({ success: true, result: result});
      } else {
        res.send({ success: false });
      }
    }    
  })
})

app.post('/public/sendAcademicEmail', (req, res) => {
  const { id, type, form } = req.body;
  const userbyId = `SELECT * FROM users WHERE id = ${id}`;
  connection.query(userbyId, async  (error, results) => {
    if (error) {
      res.send({success: false, message: 'Произошла ошибка. ' + error});
    } else {
      if (results.length > 0) {
        const user = results[0];
        let htmlForm;
        if(type === 0){ 
          const { certificateCitizenship, fullVisaNameRus, fullVisaNameLat, course, speciality, groupNumber, email, yearSchool } = form
      
          htmlForm = `
            <h2>Заполненная форма</h2>
            <ul>
              <li>Гражданство: ${certificateCitizenship}</li>
              <li>Имя полностью на русском: ${fullVisaNameRus}</li>
              <li>Имя полностью на английском: ${fullVisaNameLat}</li>
              <li>Курс: ${course}</li>
              <li>Номер группы: ${groupNumber}</li>
              <li>Специальность: ${speciality}</li>
              <li>Год окончания школы: ${yearSchool}</li>
              <li>Почта: ${email}</li>
            </ul>
          `
        }else { 
          const { certificateCitizenship, passportNumber, dateOfBirth, fullVisaNameRus, fullVisaNameLat, course, speciality, email, certificateLanguage } = form
      
          htmlForm = `
          <h2>Заполненная форма</h2>
          <ul>
            <li>Гражданство: ${certificateCitizenship}</li>
            <li>Номер паспорта: ${passportNumber}</li>
            <li>Дата рождения: ${dateOfBirth}</li>
            <li>Имя полностью на русском: ${fullVisaNameRus}</li>
            <li>Имя полностью на английском: ${fullVisaNameLat}</li>
            <li>Курс: ${course}</li>
            <li>Специальность: ${speciality}</li>
            <li>Почта: ${email}</li>
            <li>Язык справки: ${certificateLanguage}</li>
          </ul>
        `
        }
        let result = await sendAcademicEmail(user, type, htmlForm);
        res.send({ success: true, result: result});
      } else {
        res.send({ success: false });
      }
    }    
  })
})

async function sendAcademicEmail (user, type, form){
  let message = type === 1 ? 'Пользователь заказал справку об обучении' : 'Пользователь заказал академическую справку';
  let subject = type === 1 ? 'Заказана справка об обучении. Мир Без Границ' : 'Заказана академическая справка. Мир Без Границ';
  let result = await transporter.sendMail({
    from: '"Мир без границ" <info@mirbezgranic-novsu.ru>',
    to: 'kent2011981@gmail.com',
    subject: subject,
    html: `
      <h1>Добрый день</h1>
      <h2>${message}</h2>
      <ul style="font-size: 20px">
        <li>Телефон: ${user.phone}</li>
        <li>Email: ${user.email}</li>
        <li>Имя: ${user.name}</li>
        <li>Фамилия: ${user.surname}</li>
      </ul>
      ${form}
    `,
  });
  return result;
}

const privateKey = fs.readFileSync('/var/www/httpd-cert/api.mirbezgranic-novsu.ru_2023-12-24-18-44_57.key', 'utf8');
const certificate = fs.readFileSync('/var/www/httpd-cert/api.mirbezgranic-novsu.ru_2023-12-24-18-44_57.crt', 'utf8');
const credentials = { key: privateKey, cert: certificate };
const httpsServer = https.createServer(credentials, app);

httpsServer.listen(3000, () => {
  console.log('Сервер запущен на порту 443 (HTTPS)');
});
