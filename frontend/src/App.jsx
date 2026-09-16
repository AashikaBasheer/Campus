import React, { useState, useEffect } from 'react';
import {
  getStudents,
  registerStudent,
  getEvents,
  createEvent,
  getEventSummary,
  registerForEvent,
  getStudentPasses,
  cancelRegistration,
  checkInToEvent
} from './api';

function App() {
  // State
  const [students, setStudents] = useState([]);
  const [activeStudentId, setActiveStudentId] = useState('');
  const [activeTab, setActiveTab] = useState('events'); // 'events', 'create', 'passes', 'summary'

  const [events, setEvents] = useState([]);
  const [passes, setPasses] = useState([]);
  const [summary, setSummary] = useState([]);

  // Notifications
  const [message, setMessage] = useState({ type: '', text: '' });

  // Create Event Form
  const [newEvent, setNewEvent] = useState({
    Eventname: '',
    Eventdate: '',
    Capacity: ''
  });

  // New Student Form (modal/toggle)
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStudent, setNewStudent] = useState({
    Studname: '',
    Phoneno: '',
    Email: '',
    Password: ''
  });

  // Load initial data
  useEffect(() => {
    loadStudents();
    loadEvents();
    loadSummary();
  }, []);

  // When active student changes, reload passes
  useEffect(() => {
    if (activeStudentId) {
      loadStudentPasses(activeStudentId);
    } else {
      setPasses([]);
    }
  }, [activeStudentId]);

  const showNotification = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const loadStudents = async () => {
    try {
      const res = await getStudents();
      setStudents(res.data);
      if (res.data.length > 0 && !activeStudentId) {
        setActiveStudentId(res.data[0].Studid);
      }
    } catch (err) {
      showNotification('error', err.response?.data?.error || 'Failed to load students');
    }
  };

  const loadEvents = async () => {
    try {
      const res = await getEvents();
      setEvents(res.data);
    } catch (err) {
      showNotification('error', err.response?.data?.error || 'Failed to load events');
    }
  };

  const loadSummary = async () => {
    try {
      const res = await getEventSummary();
      setSummary(res.data);
    } catch (err) {
      showNotification('error', err.response?.data?.error || 'Failed to load event summary');
    }
  };

  const loadStudentPasses = async (studId) => {
    try {
      const res = await getStudentPasses(studId);
      setPasses(res.data);
    } catch (err) {
      showNotification('error', err.response?.data?.error || 'Failed to load passes');
    }
  };

  // Handler: Register New Student
  const handleRegisterStudent = async (e) => {
    e.preventDefault();
    try {
      const res = await registerStudent(newStudent);
      showNotification('success', `Student "${res.data.Studname}" registered successfully!`);
      setNewStudent({ Studname: '', Phoneno: '', Email: '', Password: '' });
      setShowAddStudent(false);
      await loadStudents();
      setActiveStudentId(res.data.Studid);
    } catch (err) {
      showNotification('error', err.response?.data?.error || 'Student registration failed');
    }
  };

  // Use Case 1: Create Event
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!activeStudentId) {
      showNotification('error', 'Please select an organizer student profile');
      return;
    }
    try {
      await createEvent({
        Studid: activeStudentId,
        Eventname: newEvent.Eventname,
        Eventdate: newEvent.Eventdate,
        Capacity: newEvent.Capacity
      });
      showNotification('success', `Event "${newEvent.Eventname}" created successfully with status Open!`);
      setNewEvent({ Eventname: '', Eventdate: '', Capacity: '' });
      loadEvents();
      loadSummary();
      setActiveTab('events');
    } catch (err) {
      showNotification('error', err.response?.data?.error || 'Failed to create event');
    }
  };

  // Use Case 2: Register for Event
  const handleRegisterForEvent = async (eventId) => {
    if (!activeStudentId) {
      showNotification('error', 'Please select an active student first');
      return;
    }
    try {
      const res = await registerForEvent({
        Studid: activeStudentId,
        Eventid: eventId
      });
      showNotification('success', res.data.message);
      loadEvents();
      loadSummary();
      loadStudentPasses(activeStudentId);
    } catch (err) {
      showNotification('error', err.response?.data?.error || 'Registration failed');
    }
  };

  // Use Case 3: Cancel Registration
  const handleCancelRegistration = async (regId) => {
    if (!window.confirm('Are you sure you want to cancel this registration? Capacity will become available again.')) {
      return;
    }
    try {
      const res = await cancelRegistration(regId);
      showNotification('success', res.data.message);
      loadEvents();
      loadSummary();
      loadStudentPasses(activeStudentId);
    } catch (err) {
      showNotification('error', err.response?.data?.error || 'Failed to cancel registration');
    }
  };

  // Use Case 4: Check-In to Event
  const handleCheckIn = async (regId) => {
    try {
      const res = await checkInToEvent(regId);
      showNotification('success', res.data.message);
      loadStudentPasses(activeStudentId);
      loadSummary();
    } catch (err) {
      showNotification('error', err.response?.data?.error || 'Check-in failed');
    }
  };

  const activeStudent = students.find((s) => s.Studid === parseInt(activeStudentId, 10));

  // Check if active student is already registered for an event
  const isStudentRegistered = (eventId) => {
    return passes.some((p) => p.Eventid === eventId);
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="header-title">
          <h1>Campus Event Pass Management System</h1>
          <p className="subtitle">Technical Events, Pass Generation &amp; Check-In System</p>
        </div>

        {/* Active Student Selector */}
        <div className="student-selector-box">
          <label htmlFor="student-select">Active Student:</label>
          <select
            id="student-select"
            value={activeStudentId}
            onChange={(e) => setActiveStudentId(e.target.value)}
          >
            {students.map((s) => (
              <option key={s.Studid} value={s.Studid}>
                {s.Studname} (ID: {s.Studid} - {s.Email})
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowAddStudent(!showAddStudent)}
          >
            {showAddStudent ? 'Cancel' : '+ New Student'}
          </button>
        </div>
      </header>

      {/* Add Student Inline Form */}
      {showAddStudent && (
        <div className="card add-student-card">
          <h3>Register New Student</h3>
          <form onSubmit={handleRegisterStudent} className="form-inline">
            <input
              type="text"
              placeholder="Student Name"
              required
              value={newStudent.Studname}
              onChange={(e) => setNewStudent({ ...newStudent, Studname: e.target.value })}
            />
            <input
              type="tel"
              placeholder="Phone Number"
              required
              value={newStudent.Phoneno}
              onChange={(e) => setNewStudent({ ...newStudent, Phoneno: e.target.value })}
            />
            <input
              type="email"
              placeholder="Email"
              required
              value={newStudent.Email}
              onChange={(e) => setNewStudent({ ...newStudent, Email: e.target.value })}
            />
            <input
              type="password"
              placeholder="Password"
              required
              value={newStudent.Password}
              onChange={(e) => setNewStudent({ ...newStudent, Password: e.target.value })}
            />
            <button type="submit" className="btn btn-primary">Add Student</button>
          </form>
        </div>
      )}

      {/* Notification Banner */}
      {message.text && (
        <div className={`notification ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Navigation Tabs */}
      <nav className="nav-tabs">
        <button
          className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`}
          onClick={() => { setActiveTab('events'); loadEvents(); }}
        >
          1. Browse &amp; Register Events
        </button>
        <button
          className={`tab-btn ${activeTab === 'create' ? 'active' : ''}`}
          onClick={() => setActiveTab('create')}
        >
          2. Create Event (Organizer)
        </button>
        <button
          className={`tab-btn ${activeTab === 'passes' ? 'active' : ''}`}
          onClick={() => { setActiveTab('passes'); if (activeStudentId) loadStudentPasses(activeStudentId); }}
        >
          3. My Passes &amp; Check-In ({passes.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => { setActiveTab('summary'); loadSummary(); }}
        >
          4. Event Summary Dashboard
        </button>
      </nav>

      {/* Tab 1: Browse Events (Use Case 2) */}
      {activeTab === 'events' && (
        <section className="tab-content">
          <div className="section-header">
            <h2>Available Technical Events</h2>
            <button className="btn btn-secondary btn-sm" onClick={loadEvents}>Refresh</button>
          </div>

          {events.length === 0 ? (
            <div className="card empty-state">No events scheduled. Create one in the "Create Event" tab!</div>
          ) : (
            <div className="events-grid">
              {events.map((ev) => {
                const isFull = ev.Status === 'Full' || ev.Registercount >= ev.Capacity;
                const registered = isStudentRegistered(ev.Eventid);

                return (
                  <div key={ev.Eventid} className={`card event-card ${isFull ? 'card-full' : ''}`}>
                    <div className="event-card-header">
                      <h3>{ev.Eventname}</h3>
                      <span className={`badge ${isFull ? 'badge-danger' : 'badge-success'}`}>
                        {isFull ? 'Full (Blocked)' : 'Open'}
                      </span>
                    </div>

                    <div className="event-details">
                      <p><strong>Date:</strong> {ev.Eventdate}</p>
                      <p><strong>Organizer:</strong> {ev.OrganizerName}</p>
                      <p><strong>Capacity:</strong> {ev.Capacity}</p>
                      <p>
                        <strong>Registered:</strong> {ev.Registercount} / {ev.Capacity}{' '}
                        <span className="remaining-text">
                          ({Math.max(ev.Capacity - ev.Registercount, 0)} spots left)
                        </span>
                      </p>
                    </div>

                    <div className="event-actions">
                      {registered ? (
                        <button className="btn btn-disabled" disabled>
                          Already Registered
                        </button>
                      ) : isFull ? (
                        <button className="btn btn-disabled" disabled title="Event is full; registrations are blocked">
                          Registrations Blocked (Full)
                        </button>
                      ) : (
                        <button
                          className="btn btn-primary"
                          onClick={() => handleRegisterForEvent(ev.Eventid)}
                        >
                          Register for Event
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Tab 2: Create Event (Use Case 1) */}
      {activeTab === 'create' && (
        <section className="tab-content">
          <div className="card form-card">
            <h2>Create New Technical Event</h2>
            <p className="hint">
              Organizer: <strong>{activeStudent?.Studname || 'Selected Student'}</strong> (ID: {activeStudentId})
            </p>

            <form onSubmit={handleCreateEvent} className="form-vertical">
              <div className="form-group">
                <label htmlFor="event-name">Event Name:</label>
                <input
                  id="event-name"
                  type="text"
                  placeholder="e.g., Codeathon 2026, AI Symposium"
                  required
                  value={newEvent.Eventname}
                  onChange={(e) => setNewEvent({ ...newEvent, Eventname: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="event-date">Event Date:</label>
                <input
                  id="event-date"
                  type="date"
                  required
                  value={newEvent.Eventdate}
                  onChange={(e) => setNewEvent({ ...newEvent, Eventdate: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="event-capacity">Maximum Capacity:</label>
                <input
                  id="event-capacity"
                  type="number"
                  min="1"
                  placeholder="e.g., 50"
                  required
                  value={newEvent.Capacity}
                  onChange={(e) => setNewEvent({ ...newEvent, Capacity: e.target.value })}
                />
              </div>

              <button type="submit" className="btn btn-primary">
                Create Event (Status: Open)
              </button>
            </form>
          </div>
        </section>
      )}

      {/* Tab 3: My Passes & Check-In (Use Case 3 & 4) */}
      {activeTab === 'passes' && (
        <section className="tab-content">
          <div className="section-header">
            <h2>Event Passes for {activeStudent?.Studname}</h2>
            <button className="btn btn-secondary btn-sm" onClick={() => loadStudentPasses(activeStudentId)}>
              Refresh
            </button>
          </div>

          {passes.length === 0 ? (
            <div className="card empty-state">
              No passes found for {activeStudent?.Studname}. Register for an event in the Browse Events tab!
            </div>
          ) : (
            <div className="passes-grid">
              {passes.map((p) => {
                const isCheckedIn = p.Check_In === 'Yes';

                return (
                  <div key={p.RegId} className={`card pass-card ${isCheckedIn ? 'pass-checked' : ''}`}>
                    <div className="pass-header">
                      <div>
                        <span className="pass-label">PASS #</span>
                        <h3 className="pass-id">{p.RegId}</h3>
                      </div>
                      <span className={`badge ${isCheckedIn ? 'badge-success' : 'badge-warning'}`}>
                        {isCheckedIn ? 'Checked In' : 'Not Checked In'}
                      </span>
                    </div>

                    <div className="pass-body">
                      <h4>{p.Eventname}</h4>
                      <p><strong>Event Date:</strong> {p.Eventdate}</p>
                      <p><strong>Registration Status:</strong> {p.IsRegister}</p>
                      <p><strong>Attendee:</strong> {activeStudent?.Studname}</p>
                    </div>

                    <div className="pass-actions">
                      {/* Use Case 4: Check-In */}
                      {isCheckedIn ? (
                        <button className="btn btn-disabled" disabled>
                          Already Checked In
                        </button>
                      ) : (
                        <button
                          className="btn btn-success"
                          onClick={() => handleCheckIn(p.RegId)}
                        >
                          Check-In to Event
                        </button>
                      )}

                      {/* Use Case 3: Cancel Registration */}
                      <button
                        className="btn btn-danger"
                        onClick={() => handleCancelRegistration(p.RegId)}
                      >
                        Cancel Registration
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Tab 4: Event Summary Dashboard (Use Case 5) */}
      {activeTab === 'summary' && (
        <section className="tab-content">
          <div className="section-header">
            <h2>Event Summary Report</h2>
            <button className="btn btn-secondary btn-sm" onClick={loadSummary}>Refresh</button>
          </div>
          <p className="hint">Live statistics directly queried from MySQL database.</p>

          <div className="card table-card">
            <table className="summary-table">
              <thead>
                <tr>
                  <th>Event ID</th>
                  <th>Event Name</th>
                  <th>Status</th>
                  <th>Capacity</th>
                  <th>Registered Count</th>
                  <th>Checked-In Count</th>
                  <th>Available Slots</th>
                </tr>
              </thead>
              <tbody>
                {summary.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center' }}>No events recorded.</td>
                  </tr>
                ) : (
                  summary.map((row) => {
                    const available = Math.max(row.Capacity - row.RegisteredCount, 0);
                    const isFull = row.Status === 'Full' || row.RegisteredCount >= row.Capacity;

                    return (
                      <tr key={row.Eventid}>
                        <td>{row.Eventid}</td>
                        <td className="font-semibold">{row.Eventname}</td>
                        <td>
                          <span className={`badge ${isFull ? 'badge-danger' : 'badge-success'}`}>
                            {row.Status}
                          </span>
                        </td>
                        <td>{row.Capacity}</td>
                        <td>{row.RegisteredCount}</td>
                        <td>
                          <span className="checked-in-count">
                            {row.CheckedInCount}
                          </span>
                        </td>
                        <td>{available}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

export default App;
