const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get all registrations for a particular student (to view passes)
router.get('/student/:studId', async (req, res) => {
  const { studId } = req.params;
  try {
    const query = `
      SELECT 
        r.RegId,
        r.Studid,
        r.Eventid,
        r.IsRegister,
        er.Eventname,
        er.Registercount,
        er.Check_In,
        DATE_FORMAT(e.Eventdate, '%Y-%m-%d') AS Eventdate,
        e.Capacity,
        e.Status AS EventStatus
      FROM Registration r
      JOIN EventRegistration er ON r.RegId = er.RegId
      JOIN Event e ON r.Eventid = e.Eventid
      WHERE r.Studid = ?
      ORDER BY r.RegId DESC
    `;
    const [rows] = await db.query(query, [studId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List all registrations (for administrative view/monitoring)
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        r.RegId,
        r.Studid,
        s.Studname,
        r.Eventid,
        er.Eventname,
        r.IsRegister,
        er.Check_In,
        DATE_FORMAT(e.Eventdate, '%Y-%m-%d') AS Eventdate
      FROM Registration r
      JOIN Student s ON r.Studid = s.Studid
      JOIN EventRegistration er ON r.RegId = er.RegId
      JOIN Event e ON r.Eventid = e.Eventid
      ORDER BY r.RegId DESC
    `;
    const [rows] = await db.query(query);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Use Case 2: Register for Event
// "A student can register once only. Duplicate registration is not allowed. 
// Event capacity cannot be exceeded; once full, registrations must be blocked."
router.post('/', async (req, res) => {
  const { Studid, Eventid } = req.body;
  if (!Studid || !Eventid) {
    return res.status(400).json({ error: 'Studid and Eventid are required' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Lock and inspect event
    const [events] = await connection.query(
      'SELECT Eventid, Eventname, Capacity, Registercount, Status FROM Event WHERE Eventid = ? FOR UPDATE',
      [Eventid]
    );
    if (events.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = events[0];

    // 2. Capacity check
    if (event.Registercount >= event.Capacity || event.Status === 'Full') {
      await connection.rollback();
      return res.status(400).json({ error: 'Event capacity cannot be exceeded; event is full and registrations are blocked.' });
    }

    // 3. Duplicate registration check
    const [existing] = await connection.query(
      'SELECT RegId FROM Registration WHERE Studid = ? AND Eventid = ?',
      [Studid, Eventid]
    );
    if (existing.length > 0) {
      await connection.rollback();
      return res.status(409).json({ error: 'Duplicate registration is not allowed. Student is already registered for this event.' });
    }

    // 4. Create Registration record (ER Table 3)
    const [regResult] = await connection.query(
      'INSERT INTO Registration (Studid, Eventid, IsRegister) VALUES (?, ?, ?)',
      [Studid, Eventid, 'Registered']
    );
    const newRegId = regResult.insertId;

    // 5. Update Event register count & status (ER Table 2)
    const newCount = event.Registercount + 1;
    const newStatus = newCount >= event.Capacity ? 'Full' : 'Open';

    await connection.query(
      'UPDATE Event SET Registercount = ?, Status = ? WHERE Eventid = ?',
      [newCount, newStatus, Eventid]
    );

    // 6. Create EventRegistration record (ER Table 4)
    await connection.query(
      'INSERT INTO EventRegistration (RegId, Eventid, Eventname, Registercount, Check_In) VALUES (?, ?, ?, ?, ?)',
      [newRegId, Eventid, event.Eventname, newCount, 'No']
    );

    await connection.commit();

    res.status(201).json({
      message: 'Registration successful! Event pass generated.',
      pass: {
        RegId: newRegId,
        Studid,
        Eventid,
        Eventname: event.Eventname,
        IsRegister: 'Registered',
        Registercount: newCount,
        Check_In: 'No'
      }
    });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// Use Case 3: Cancel Registration
// "A student can cancel before the event. Registration is removed and capacity becomes available again."
router.delete('/:regId', async (req, res) => {
  const { regId } = req.params;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Fetch registration
    const [regs] = await connection.query(
      'SELECT RegId, Studid, Eventid FROM Registration WHERE RegId = ? FOR UPDATE',
      [regId]
    );
    if (regs.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Registration record not found' });
    }

    const { Eventid } = regs[0];

    // 2. Remove from EventRegistration and Registration
    await connection.query('DELETE FROM EventRegistration WHERE RegId = ?', [regId]);
    await connection.query('DELETE FROM Registration WHERE RegId = ?', [regId]);

    // 3. Decrement count and re-open capacity in Event
    await connection.query(
      `UPDATE Event 
       SET Registercount = GREATEST(Registercount - 1, 0), 
           Status = 'Open' 
       WHERE Eventid = ?`,
      [Eventid]
    );

    await connection.commit();

    res.json({
      message: 'Registration removed and capacity is now available again.',
      RegId: parseInt(regId, 10),
      Eventid
    });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// Use Case 4: Check-In to Event
// "On the event day, only registered students can check in, and check-in is allowed only once."
router.post('/check-in', async (req, res) => {
  const { RegId } = req.body;
  if (!RegId) {
    return res.status(400).json({ error: 'RegId is required for check-in' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Check if registered
    const [records] = await connection.query(
      `SELECT er.RegId, er.Eventname, er.Check_In, e.Eventdate
       FROM EventRegistration er
       JOIN Registration r ON er.RegId = r.RegId
       JOIN Event e ON er.Eventid = e.Eventid
       WHERE er.RegId = ? FOR UPDATE`,
      [RegId]
    );

    if (records.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Invalid registration pass. Only registered students can check in.' });
    }

    const regRecord = records[0];

    // 2. Check if already checked in (check-in allowed only once)
    if (regRecord.Check_In === 'Yes') {
      await connection.rollback();
      return res.status(400).json({ error: 'Student has already checked in. Check-in is allowed only once.' });
    }

    // 3. Update check-in status
    await connection.query(
      "UPDATE EventRegistration SET Check_In = 'Yes' WHERE RegId = ?",
      [RegId]
    );

    await connection.commit();

    res.json({
      message: 'Check-in successful! Welcome to the event.',
      RegId,
      Eventname: regRecord.Eventname,
      Check_In: 'Yes'
    });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

module.exports = router;
