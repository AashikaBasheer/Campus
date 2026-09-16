const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get all students (for selecting active student in UI)
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT Studid, Studname, Phoneno, Email FROM Student ORDER BY Studid ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Student registration
router.post('/', async (req, res) => {
  const { Studname, Phoneno, Email, Password } = req.body;
  if (!Studname || !Phoneno || !Email || !Password) {
    return res.status(400).json({ error: 'All fields (Studname, Phoneno, Email, Password) are required' });
  }
  try {
    const [result] = await db.query(
      'INSERT INTO Student (Studname, Phoneno, Email, Password) VALUES (?, ?, ?, ?)',
      [Studname, Phoneno, Email, Password]
    );
    res.status(201).json({
      message: 'Student registered successfully',
      Studid: result.insertId,
      Studname,
      Phoneno,
      Email
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Student login
router.post('/login', async (req, res) => {
  const { Email, Password } = req.body;
  if (!Email || !Password) {
    return res.status(400).json({ error: 'Email and Password are required' });
  }
  try {
    const [rows] = await db.query(
      'SELECT Studid, Studname, Phoneno, Email FROM Student WHERE Email = ? AND Password = ?',
      [Email, Password]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    res.json({ message: 'Login successful', student: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
