-- TransitOps Database Schema
-- Run this file against your MySQL instance after configuring your .env credentials.
-- Example: mysql -u YOUR_USER -p < schema.sql

CREATE DATABASE IF NOT EXISTS transitops
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE transitops;

-- ─────────────────────────────────────────────
-- Users
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120)  NOT NULL,
  email         VARCHAR(255)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  role          ENUM('FleetManager','Driver','SafetyOfficer','FinancialAnalyst') NOT NULL,
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- Vehicles
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicles (
  id                   INT AUTO_INCREMENT PRIMARY KEY,
  registration_number  VARCHAR(50)    NOT NULL UNIQUE,
  name                 VARCHAR(120)   NOT NULL,
  type                 VARCHAR(80)    NOT NULL,
  region               VARCHAR(100)   NULL,
  max_load_capacity    DECIMAL(12,2)  NOT NULL DEFAULT 0,
  odometer             DECIMAL(12,2)  NOT NULL DEFAULT 0,
  acquisition_cost     DECIMAL(14,2)  NOT NULL DEFAULT 0,
  status               ENUM('Available','On Trip','In Shop','Retired') NOT NULL DEFAULT 'Available'
);

-- ─────────────────────────────────────────────
-- Drivers
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS drivers (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  name              VARCHAR(120)   NOT NULL,
  license_number    VARCHAR(80)    NOT NULL UNIQUE,
  license_category  VARCHAR(20)    NOT NULL,
  license_expiry    DATE           NOT NULL,
  contact_number    VARCHAR(30)    NULL,
  safety_score      DECIMAL(5,2)   NOT NULL DEFAULT 100,
  status            ENUM('Available','On Trip','Off Duty','Suspended') NOT NULL DEFAULT 'Available'
);

-- ─────────────────────────────────────────────
-- Trips
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trips (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  source           VARCHAR(200)   NOT NULL,
  destination      VARCHAR(200)   NOT NULL,
  vehicle_id       INT            NOT NULL,
  driver_id        INT            NOT NULL,
  cargo_weight     DECIMAL(12,2)  NOT NULL DEFAULT 0,
  planned_distance DECIMAL(12,2)  NOT NULL DEFAULT 0,
  revenue          DECIMAL(14,2)  NOT NULL DEFAULT 0,
  final_odometer   DECIMAL(12,2)  NULL,
  fuel_consumed    DECIMAL(10,2)  NULL,
  status           ENUM('Draft','Dispatched','Completed','Cancelled') NOT NULL DEFAULT 'Draft',
  created_at       TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_trips_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
  CONSTRAINT fk_trips_driver  FOREIGN KEY (driver_id)  REFERENCES drivers(id)
);

-- ─────────────────────────────────────────────
-- Maintenance Logs
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS maintenance_logs (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  vehicle_id  INT            NOT NULL,
  description TEXT           NOT NULL,
  cost        DECIMAL(12,2)  NOT NULL DEFAULT 0,
  status      ENUM('Open','Closed') NOT NULL DEFAULT 'Open',
  created_at  TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
  closed_at   TIMESTAMP      NULL,
  CONSTRAINT fk_maint_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
);

-- ─────────────────────────────────────────────
-- Fuel Logs
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fuel_logs (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  vehicle_id  INT            NOT NULL,
  trip_id     INT            NULL,
  liters      DECIMAL(10,2)  NOT NULL,
  cost        DECIMAL(12,2)  NOT NULL,
  log_date    DATE           NOT NULL,
  CONSTRAINT fk_fuel_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
  CONSTRAINT fk_fuel_trip    FOREIGN KEY (trip_id)    REFERENCES trips(id)
);

-- ─────────────────────────────────────────────
-- Expenses
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  vehicle_id   INT            NOT NULL,
  type         VARCHAR(50)    NOT NULL,
  amount       DECIMAL(12,2)  NOT NULL,
  expense_date DATE           NOT NULL,
  CONSTRAINT fk_expense_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
);
