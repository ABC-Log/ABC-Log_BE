const express = require('express');
const db = require('../db');
const { toId, isFilled, sendServerError } = require('../helpers');

const router = express.Router();

// 주의: 지금은 동작 확인용이라 비밀번호를 암호화하지 않고, 로그인 상태(토큰/세션)도 만들지 않는다.

// 회원가입: POST /api/users/signup
router.post('/signup', (req, res) => {
  const body = req.body || {};
  const email = body.email;
  const password = body.password;
  const name = body.name;

  if (!isFilled(email) || !email.includes('@') || !isFilled(password) || !isFilled(name)) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_SIGNUP_INPUT',
      message: '이메일, 비밀번호, 이름을 올바르게 입력해 주세요.',
    });
  }

  try {
    const sameEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (sameEmail) {
      return res.status(409).json({
        success: false,
        code: 'EMAIL_ALREADY_EXISTS',
        message: '이미 가입된 이메일입니다.',
      });
    }

    const result = db.prepare('INSERT INTO users (email, password, name) VALUES (?, ?, ?)').run(email, password, name);

    res.status(201).json({
      success: true,
      message: '회원가입이 완료되었습니다.',
      data: { userId: toId('user', result.lastInsertRowid), email: email, name: name },
    });
  } catch (error) {
    sendServerError(res, error);
  }
});

// 로그인: POST /api/users/login
router.post('/login', (req, res) => {
  const body = req.body || {};
  const email = body.email;
  const password = body.password;

  if (!isFilled(email) || !isFilled(password)) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_LOGIN_INPUT',
      message: '이메일과 비밀번호를 입력해 주세요.',
    });
  }

  try {
    const user = db.prepare('SELECT id, email, name FROM users WHERE email = ? AND password = ?').get(email, password);
    if (!user) {
      return res.status(401).json({
        success: false,
        code: 'LOGIN_FAILED',
        message: '이메일 또는 비밀번호가 올바르지 않습니다.',
      });
    }

    res.json({
      success: true,
      message: '로그인되었습니다.',
      data: { userId: toId('user', user.id), email: user.email, name: user.name },
    });
  } catch (error) {
    sendServerError(res, error);
  }
});

module.exports = router;
