CREATE DATABASE IF NOT EXISTS campusevent_db;
USE campusevent_db;

DROP TABLE IF EXISTS EventRegistration;
DROP TABLE IF EXISTS Registration;
DROP TABLE IF EXISTS Event;
DROP TABLE IF EXISTS Student;

CREATE TABLE Student (
  Studid INT AUTO_INCREMENT PRIMARY KEY,
  Studname VARCHAR(100) NOT NULL,
  Phoneno VARCHAR(20) NOT NULL,
  Email VARCHAR(100) NOT NULL UNIQUE,
  Password VARCHAR(100) NOT NULL
);

CREATE TABLE Event (
  Eventid INT AUTO_INCREMENT PRIMARY KEY,
  Studid INT NOT NULL,
  Eventname VARCHAR(150) NOT NULL,
  Eventdate DATE NOT NULL,
  Capacity INT NOT NULL,
  Status VARCHAR(20) NOT NULL DEFAULT 'Open',
  Registercount INT NOT NULL DEFAULT 0,
  FOREIGN KEY (Studid) REFERENCES Student(Studid) ON DELETE CASCADE
);

CREATE TABLE Registration (
  RegId INT AUTO_INCREMENT PRIMARY KEY,
  Studid INT NOT NULL,
  Eventid INT NOT NULL,
  IsRegister VARCHAR(20) NOT NULL DEFAULT 'Registered',
  FOREIGN KEY (Studid) REFERENCES Student(Studid) ON DELETE CASCADE,
  FOREIGN KEY (Eventid) REFERENCES Event(Eventid) ON DELETE CASCADE,
  UNIQUE KEY unique_stud_event (Studid, Eventid)
);

CREATE TABLE EventRegistration (
  RegId INT PRIMARY KEY,
  Eventid INT NOT NULL,
  Eventname VARCHAR(150) NOT NULL,
  Registercount INT NOT NULL,
  Check_In VARCHAR(20) NOT NULL DEFAULT 'No',
  FOREIGN KEY (RegId) REFERENCES Registration(RegId) ON DELETE CASCADE,
  FOREIGN KEY (Eventid) REFERENCES Event(Eventid) ON DELETE CASCADE
);

-- Initial students
INSERT INTO Student (Studname, Phoneno, Email, Password) VALUES
('Aashika B', '9876543210', 'aashika@example.com', 'pass123'),
('Rahul Sharma', '9876543211', 'rahul@example.com', 'pass123'),
('Priya Nair', '9876543212', 'priya@example.com', 'pass123');
