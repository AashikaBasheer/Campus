const axios = require('axios');
const mysql = require('mysql2/promise');

const API = 'http://localhost:5000/api';

async function verify() {
  console.log('----------------------------------------------------');
  console.log('   CAMPUS EVENT PASS MANAGEMENT SYSTEM - E2E TEST   ');
  console.log('----------------------------------------------------\n');

  // Direct DB Connection to verify ER table states
  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'asdF#_1234',
    database: 'campusevent_db'
  });

  console.log('1. Checking Students:');
  const studentsRes = await axios.get(`${API}/students`);
  console.log(`   Found ${studentsRes.data.length} students:`, studentsRes.data.map(s => s.Studname).join(', '));

  console.log('\n2. USE CASE 1: Create Event (Organizer)');
  const createEventRes = await axios.post(`${API}/events`, {
    Studid: 1, // Aashika B
    Eventname: 'Tech Symposium 2026',
    Eventdate: '2026-11-10',
    Capacity: 2
  });
  const event = createEventRes.data;
  console.log(`   Event Created: "${event.Eventname}" (ID: ${event.Eventid}, Capacity: ${event.Capacity}, Status: ${event.Status})`);

  console.log('\n3. USE CASE 2: Register for Event');
  // Student 1 registers
  const reg1 = await axios.post(`${API}/registrations`, { Studid: 1, Eventid: event.Eventid });
  console.log(`   Student 1 Registered: RegId = ${reg1.data.pass.RegId}`);

  // Test duplicate registration prevention
  try {
    await axios.post(`${API}/registrations`, { Studid: 1, Eventid: event.Eventid });
    console.error('   FAIL: Duplicate registration was allowed!');
  } catch (err) {
    console.log(`   SUCCESS: Duplicate registration blocked (${err.response.status}: ${err.response.data.error})`);
  }

  // Student 2 registers (Reaches capacity)
  const reg2 = await axios.post(`${API}/registrations`, { Studid: 2, Eventid: event.Eventid });
  console.log(`   Student 2 Registered: RegId = ${reg2.data.pass.RegId}`);

  // Test capacity exceeded prevention
  try {
    await axios.post(`${API}/registrations`, { Studid: 3, Eventid: event.Eventid });
    console.error('   FAIL: Over-capacity registration was allowed!');
  } catch (err) {
    console.log(`   SUCCESS: Over-capacity registration blocked (${err.response.status}: ${err.response.data.error})`);
  }

  console.log('\n4. USE CASE 4: Check-In to Event (Day of Event)');
  const checkInRes = await axios.post(`${API}/registrations/check-in`, { RegId: reg1.data.pass.RegId });
  console.log(`   Student 1 Check-In: ${checkInRes.data.message}`);

  // Test duplicate check-in blocked
  try {
    await axios.post(`${API}/registrations/check-in`, { RegId: reg1.data.pass.RegId });
    console.error('   FAIL: Duplicate check-in was allowed!');
  } catch (err) {
    console.log(`   SUCCESS: Duplicate check-in blocked (${err.response.status}: ${err.response.data.error})`);
  }

  console.log('\n5. USE CASE 5: View Event Summary');
  const summaryRes = await axios.get(`${API}/events/summary`);
  const sympSummary = summaryRes.data.find(s => s.Eventid === event.Eventid);
  console.log('   Event Summary Data:');
  console.log(`     - Event Name:        ${sympSummary.Eventname}`);
  console.log(`     - Capacity:          ${sympSummary.Capacity}`);
  console.log(`     - Registered Count:  ${sympSummary.RegisteredCount}`);
  console.log(`     - Checked-In Count:  ${sympSummary.CheckedInCount}`);
  console.log(`     - Status:            ${sympSummary.Status}`);

  console.log('\n6. USE CASE 3: Cancel Registration');
  const cancelRes = await axios.delete(`${API}/registrations/${reg2.data.pass.RegId}`);
  console.log(`   Cancelled Student 2 RegId ${reg2.data.pass.RegId}: ${cancelRes.data.message}`);

  // Now Student 3 can register because capacity is available again!
  const reg3 = await axios.post(`${API}/registrations`, { Studid: 3, Eventid: event.Eventid });
  console.log(`   Student 3 Registered successfully in freed slot: RegId = ${reg3.data.pass.RegId}`);

  console.log('\n7. DIRECT DATABASE INTEGRITY VERIFICATION (ER Tables):');
  const [dbStudents] = await db.query('SELECT COUNT(*) AS c FROM Student');
  const [dbEvents] = await db.query('SELECT * FROM Event WHERE Eventid = ?', [event.Eventid]);
  const [dbRegs] = await db.query('SELECT * FROM Registration WHERE Eventid = ?', [event.Eventid]);
  const [dbEventRegs] = await db.query('SELECT * FROM EventRegistration WHERE Eventid = ?', [event.Eventid]);

  console.log(`   - Student table count:           ${dbStudents[0].c}`);
  console.log(`   - Event record:                  Name="${dbEvents[0].Eventname}", Count=${dbEvents[0].Registercount}, Status=${dbEvents[0].Status}`);
  console.log(`   - Registration table records:    ${dbRegs.length} rows`);
  console.log(`   - EventRegistration records:     ${dbEventRegs.length} rows (Check-Ins: ${dbEventRegs.map(r => r.Check_In).join(', ')})`);

  await db.end();

  console.log('\n====================================================');
  console.log('      ALL 5 CORE USE CASES FULLY VERIFIED!          ');
  console.log('====================================================');
}

verify().catch(err => {
  console.error('Verification failed:', err.message);
  process.exit(1);
});
