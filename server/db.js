'use strict';

const sqlite = require('sqlite3');

const database = new sqlite.Database('./database.sqlite', (error) => {
  if (error) {
    console.error(error.message);
  }
});

function getUserByUsername(username) {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM users WHERE username = ?';

    database.get(sql, [username], (error, user) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(user);
    });
  });
}

function getUserById(id) {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM users WHERE id = ?';

    database.get(sql, [id], (error, user) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(user);
    });
  });
}

function getRanking() {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT users.username, MAX(games.final_score) AS best_score
      FROM games
      JOIN users ON games.user_id = users.id
      WHERE games.is_valid = 1
      GROUP BY users.id, users.username
      ORDER BY best_score DESC, users.username ASC
    `;

    database.all(sql, [], (error, rows) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(rows);
    });
  });
}

function getAllStations() {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT id, name FROM stations ORDER BY name';

    database.all(sql, [], (error, rows) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(rows);
    });
  });
}

function getAllLines() {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT id, name, color FROM lines ORDER BY id';

    database.all(sql, [], (error, rows) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(rows);
    });
  });
}

function getAllLineStations() {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT
        ls.line_id,
        l.name AS line_name,
        l.color,
        ls.station_id,
        s.name AS station_name,
        ls.position
      FROM line_stations ls
      JOIN lines l ON ls.line_id = l.id
      JOIN stations s ON ls.station_id = s.id
      ORDER BY ls.line_id, ls.position
    `;

    database.all(sql, [], (error, rows) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(rows);
    });
  });
}

function getAllEvents() {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT id, description, coinChange FROM events ORDER BY id';

    database.all(sql, [], (error, rows) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(rows);
    });
  });
}

function saveGame(game) {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO games (
        user_id,
        start_station_id,
        destination_station_id,
        final_score,
        is_valid,
        played_at
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    database.run(
      sql,
      [
        game.user_id,
        game.start_station_id,
        game.destination_station_id,
        game.final_score,
        game.is_valid,
        game.played_at,
      ],
      function (error) {
        if (error) {
          reject(error);
          return;
        }

        resolve(this.lastID);
      }
    );
  });
}

function getAllSegments() {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT DISTINCT
        s1.id AS station1_id,
        s1.name AS station1_name,
        s2.id AS station2_id,
        s2.name AS station2_name
      FROM line_stations ls1
      JOIN line_stations ls2
        ON ls1.line_id = ls2.line_id
        AND ls2.position = ls1.position + 1
      JOIN stations s1 ON ls1.station_id = s1.id
      JOIN stations s2 ON ls2.station_id = s2.id
      ORDER BY station1_name, station2_name
    `;

    database.all(sql, [], (error, rows) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(rows);
    });
  });
}

module.exports = {
  database,
  getUserByUsername,
  getUserById,
  getRanking,
  getAllStations,
  getAllLines,
  getAllLineStations,
  getAllEvents,
  saveGame,
  getAllSegments,
};