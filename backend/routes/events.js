const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Use Case 5: View Event Summary
// "Display Event Name, Capacity, Registered Count, and Checked-In Count."
router.get('/summary', async (req, res) => {
  try {
    const query = `
      SELECT 
        e.Eventid,
        e.Eventname,
        e.Capacity,
        e.Registercount AS RegisteredCount,
        e.Status,
        COUNT(CASE WHEN er.Check_In = 'Yes' THEN 1 END) AS CheckedInCount
      FROM Event e
      LEFT JOIN EventRegistration er ON e.Eventid = er.Eventid
      GROUP BY e.Eventid, e.Eventname, e.Capacity, e.Registercount, e.Status
      ORDER BY e.Eventid DESC
    `;
    const [rows] = await db.query(query);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List all events (with organizer name and details)
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        e.Eventid,
        e.Studid,
        s.Studname AS OrganizerName,
        e.Eventname,
        DATE_FORMAT(e.Eventdate, '%Y-%m-%d') AS Eventdate,
        e.Capacity,
        e.Status,
        e.Registercount
      FROM Event e
      JOIN Student s ON e.Studid = s.Studid
      ORDER BY e.Eventid DESC
    `;
    const [rows] = await db.query(query);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Use Case 1: Create Event
// "Organizer creates an event with Event Name, Event Date, and Maximum Capacity. Event status = Open."
router.post('/', async (req, res) => {
  const { Studid, Eventname, Eventdate, Capacity } = req.body;
  if (!Studid || !Eventname || !Eventdate || !Capacity) {
    return res.status(400).json({ error: 'Studid, Eventname, Eventdate, and Capacity are required' });
  }

  const parsedCapacity = parseInt(Capacity, 10);
  if (isNaN(parsedCapacity) || parsedCapacity <= 0) {
    return res.status(400).json({ error: 'Capacity must be a positive integer' });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO Event (Studid, Eventname, Eventdate, Capacity, Status, Registercount) 
       VALUES (?, ?, ?, ?, 'Open', 0)`,
      [Studid, Eventname, Eventdate, parsedCapacity]
    );

    res.status(201).json({
      message: 'Event created successfully',
      Eventid: result.insertId,
      Studid,
      Eventname,
      Eventdate,
      Capacity: parsedCapacity,
      Status: 'Open',
      Registercount: 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
