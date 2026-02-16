const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(express.static(path.join(__dirname)));

function findUserByRemember(token) {
  return new Promise((resolve, reject) => {
    db.get('SELECT id, username FROM users WHERE remember_token = ?', [token], (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  try {
    const hash = await bcrypt.hash(password, 10);
    db.run('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, hash], function (err) {
      if (err) return res.status(400).json({ error: 'Username taken' });
      res.json({ ok: true, id: this.lastID });
    });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/login', (req, res) => {
  const { username, password, remember } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  db.get('SELECT id, username, password_hash FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });

    if (remember) {
      const token = crypto.randomBytes(32).toString('hex');
      db.run('UPDATE users SET remember_token = ? WHERE id = ?', [token, user.id], (uerr) => {
        if (uerr) return res.status(500).json({ error: 'DB error' });
        res.cookie('remember', token, { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true });
        res.json({ ok: true, username: user.username });
      });
    } else {
      // clear any existing token
      db.run('UPDATE users SET remember_token = NULL WHERE id = ?', [user.id], (uerr) => {
        if (uerr) return res.status(500).json({ error: 'DB error' });
        res.clearCookie('remember');
        res.json({ ok: true, username: user.username });
      });
    }
  });
});

app.get('/api/me', async (req, res) => {
  const token = req.cookies.remember;
  if (!token) return res.json({ logged: false });
  try {
    const user = await findUserByRemember(token);
    if (!user) return res.json({ logged: false });
    res.json({ logged: true, username: user.username });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/logout', (req, res) => {
  const token = req.cookies.remember;
  if (!token) {
    res.clearCookie('remember');
    return res.json({ ok: true });
  }
  db.run('UPDATE users SET remember_token = NULL WHERE remember_token = ?', [token], (err) => {
    res.clearCookie('remember');
    res.json({ ok: true });
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
