PRAGMA foreign_keys = ON;

CREATE TABLE lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL
);

CREATE TABLE stations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE line_stations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  line_id INTEGER NOT NULL,
  station_id INTEGER NOT NULL,
  position INTEGER NOT NULL,
  FOREIGN KEY (line_id) REFERENCES lines(id),
  FOREIGN KEY (station_id) REFERENCES stations(id),
  UNIQUE(line_id, position),
  UNIQUE(line_id, station_id)
);

CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  description TEXT NOT NULL,
  delta INTEGER NOT NULL CHECK(delta BETWEEN -4 AND 4)
);

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL
);

CREATE TABLE games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  start_station_id INTEGER NOT NULL,
  destination_station_id INTEGER NOT NULL,
  final_score INTEGER NOT NULL,
  is_valid INTEGER NOT NULL CHECK(is_valid IN (0,1)),
  played_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (start_station_id) REFERENCES stations(id),
  FOREIGN KEY (destination_station_id) REFERENCES stations(id)
);

INSERT INTO lines (id, name, color) VALUES
(1, 'Red Line', 'red'),
(2, 'Blue Line', 'blue'),
(3, 'Green Line', 'green'),
(4, 'Yellow Line', 'yellow');

INSERT INTO stations (id, name) VALUES
(1, 'Central'),
(2, 'Park'),
(3, 'Museum'),
(4, 'North'),
(5, 'Lake'),
(6, 'Stadium'),
(7, 'South'),
(8, 'Garden'),
(9, 'Library'),
(10, 'Market'),
(11, 'Harbor'),
(12, 'Hill');

INSERT INTO line_stations (line_id, station_id, position) VALUES
(1, 1, 1),
(1, 2, 2),
(1, 3, 3),
(1, 4, 4),

(2, 1, 1),
(2, 5, 2),
(2, 6, 3),
(2, 7, 4),

(3, 3, 1),
(3, 8, 2),
(3, 9, 3),
(3, 6, 4),

(4, 2, 1),
(4, 10, 2),
(4, 11, 3),
(4, 12, 4),
(4, 6, 5);

INSERT INTO events (id, description, delta) VALUES
(1, 'Quiet Ride', 0),
(2, 'Helpful Tourist', 1),
(3, 'Lost Ticket', -2),
(4, 'Fast Transfer', 2),
(5, 'Wrong Platform', -3),
(6, 'Coffee Discount', 1),
(7, 'Crowded Train', -1),
(8, 'Lucky Day', 4);

INSERT INTO users (id, username, password_hash, salt) VALUES
(1, 'mario', 'TEMP_HASH_1', 'TEMP_SALT_1'),
(2, 'luca', 'TEMP_HASH_2', 'TEMP_SALT_2'),
(3, 'anna', 'TEMP_HASH_3', 'TEMP_SALT_3');

INSERT INTO games (id, user_id, start_station_id, destination_station_id, final_score, is_valid, played_at) VALUES
(1, 1, 1, 7, 26, 1, '2026-06-01 10:00:00'),
(2, 1, 2, 11, 19, 1, '2026-06-03 15:30:00'),
(3, 2, 3, 7, 21, 1, '2026-06-02 11:20:00'),
(4, 2, 5, 4, 17, 1, '2026-06-04 17:45:00');