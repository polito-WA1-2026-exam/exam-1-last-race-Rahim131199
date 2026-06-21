'use strict';

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const crypto = require('crypto');
const db = require('./db');

const app = express();
const port = 3001;

app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
  })
);

app.use(express.json());

app.use(
  session({
    secret: 'a secret key for last race',
    resave: false,
    saveUninitialized: false,
  })
);

passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = await db.getUserByUsername(username);

      if (!user) {
        return done(null, false, { message: 'Incorrect username or password' });
      }

      const hashedPassword = crypto
        .scryptSync(password, user.salt, 64)
        .toString('hex');

      if (hashedPassword !== user.password_hash) {
        return done(null, false, { message: 'Incorrect username or password' });
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  })
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await db.getUserById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

app.use(passport.initialize());
app.use(passport.session());

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }

  return res.status(401).json({ error: 'Not authenticated' });
}

app.get('/api/health', (req, res) => {
  res.json({ message: 'Server is running' });
});

app.post('/api/sessions', (req, res, next) => {
  passport.authenticate('local', (error, user, info) => {
    if (error) {
      return next(error);
    }

    if (!user) {
      return res.status(401).json({ error: info.message });
    }

    req.login(user, (loginError) => {
      if (loginError) {
        return next(loginError);
      }

      return res.json({
        id: user.id,
        username: user.username,
      });
    });
  })(req, res, next);
});

app.get('/api/sessions/current', (req, res) => {
  if (req.isAuthenticated()) {
    return res.json({
      id: req.user.id,
      username: req.user.username,
    });
  }

  return res.status(401).json({ error: 'Not authenticated' });
});

app.delete('/api/sessions/current', (req, res) => {
  req.logout((error) => {
    if (error) {
      return res.status(500).json({ error: 'Logout failed' });
    }

    req.session.destroy((sessionError) => {
      if (sessionError) {
        return res.status(500).json({ error: 'Session destroy failed' });
      }

      res.clearCookie('connect.sid');
      return res.status(200).json({ message: 'Logged out' });
    });
  });
});

app.get('/api/ranking', async (req, res) => {
  try {
    const ranking = await db.getRanking();
    return res.json(ranking);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to get ranking' });
  }
});

app.get('/api/network', async (req, res) => {
  try {
    const stations = await db.getAllStations();
    const lines = await db.getAllLines();
    const lineStations = await db.getAllLineStations();

    return res.json({
      stations,
      lines,
      lineStations,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to get network data' });
  }
});

app.get('/api/events', async (req, res) => {
  try {
    const events = await db.getAllEvents();
    return res.json(events);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to get events' });
  }
});

app.get('/api/segments', async (req, res) => {
  try {
    const segments = await db.getAllSegments();
    return res.json(segments);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to get segments' });
  }
});

app.post('/api/games', isLoggedIn, async (req, res) => {
  try {
    const game = {
      user_id: req.user.id,
      start_station_id: req.body.start_station_id,
      destination_station_id: req.body.destination_station_id,
      final_score: Math.max(0, Number(req.body.final_score) || 0),
      is_valid: req.body.is_valid ? 1 : 0,
      played_at: new Date().toISOString(),
    };

    const gameId = await db.saveGame(game);

    return res.status(201).json({
      id: gameId,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to save game' });
  }
});

function buildAdjacency(segments) {
  const adjacency = {};

  for (const segment of segments) {
    const a = segment.station1_id;
    const b = segment.station2_id;

    if (!adjacency[a]) adjacency[a] = [];
    if (!adjacency[b]) adjacency[b] = [];

    if (!adjacency[a].includes(b)) adjacency[a].push(b);
    if (!adjacency[b].includes(a)) adjacency[b].push(a);
  }

  return adjacency;
}

function findDistances(startId, adjacency) {
  const distances = {};
  const queue = [startId];
  distances[startId] = 0;

  while (queue.length > 0) {
    const current = queue.shift();

    for (const neighbor of adjacency[current] || []) {
      if (distances[neighbor] === undefined) {
        distances[neighbor] = distances[current] + 1;
        queue.push(neighbor);
      }
    }
  }

  return distances;
}

app.get('/api/game/start', isLoggedIn, async (req, res) => {
  try {
    const stations = await db.getAllStations();
    const segments = await db.getAllSegments();

    const adjacency = buildAdjacency(segments);

    let startStation = null;
    let validDestinations = [];

    while (validDestinations.length === 0) {
      const randomStart = stations[Math.floor(Math.random() * stations.length)];
      const distances = findDistances(randomStart.id, adjacency);

      validDestinations = stations.filter(
        (station) =>
          station.id !== randomStart.id && distances[station.id] >= 3
      );

      if (validDestinations.length > 0) {
        startStation = randomStart;
      }
    }

    const destinationStation =
      validDestinations[Math.floor(Math.random() * validDestinations.length)];

    return res.json({
      startStation,
      destinationStation,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to generate game stations' });
  }
});

function makeSegmentKey(a, b) {
  return [Math.min(a, b), Math.max(a, b)].join('-');
}

function buildSegmentMap(segments) {
  const segmentMap = new Map();

  for (const segment of segments) {
    const key = makeSegmentKey(segment.station1_id, segment.station2_id);
    segmentMap.set(key, segment);
  }

  return segmentMap;
}

function buildStationLinesMap(lineStations) {
  const stationLinesMap = {};

  for (const row of lineStations) {
    if (!stationLinesMap[row.station_id]) {
      stationLinesMap[row.station_id] = new Set();
    }

    stationLinesMap[row.station_id].add(row.line_id);
  }

  return stationLinesMap;
}

function buildSegmentLinesMap(lineStations) {
  const sorted = [...lineStations].sort(
    (a, b) => a.line_id - b.line_id || a.position - b.position
  );

  const segmentLinesMap = new Map();

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];

    if (
      current.line_id === next.line_id &&
      next.position === current.position + 1
    ) {
      const key = makeSegmentKey(current.station_id, next.station_id);

      if (!segmentLinesMap.has(key)) {
        segmentLinesMap.set(key, new Set());
      }

      segmentLinesMap.get(key).add(current.line_id);
    }
  }

  return segmentLinesMap;
}

function isInterchange(stationId, stationLinesMap) {
  return stationLinesMap[stationId] && stationLinesMap[stationId].size > 1;
}

function getEventDelta(event) {
  if (typeof event.coinChange === 'number') return event.coinChange;
  if (typeof event.effect === 'number') return event.effect;
  if (typeof event.coin_change === 'number') return event.coin_change;
  return 0;
}

function validateRoute(
  route,
  startStationId,
  destinationStationId,
  segmentMap,
  segmentLinesMap,
  stationLinesMap
) {
  if (!Array.isArray(route) || route.length < 2) {
    return { valid: false, reason: 'Route is too short' };
  }

  if (route[0] !== startStationId) {
    return { valid: false, reason: 'Route does not start at assigned station' };
  }

  if (route[route.length - 1] !== destinationStationId) {
    return { valid: false, reason: 'Route does not end at assigned destination' };
  }

  const usedSegments = new Set();
  let currentLine = null;

  for (let i = 0; i < route.length - 1; i++) {
    const from = route[i];
    const to = route[i + 1];
    const key = makeSegmentKey(from, to);

    if (!segmentMap.has(key)) {
      return { valid: false, reason: 'Route contains an invalid segment' };
    }

    if (usedSegments.has(key)) {
      return { valid: false, reason: 'A segment was used more than once' };
    }

    usedSegments.add(key);

    const possibleLines = segmentLinesMap.get(key);

    if (!possibleLines || possibleLines.size === 0) {
      return { valid: false, reason: 'Segment is not reachable through a line' };
    }

    if (currentLine === null) {
      currentLine = [...possibleLines][0];
      continue;
    }

    if (possibleLines.has(currentLine)) {
      continue;
    }

    if (!isInterchange(from, stationLinesMap)) {
      return { valid: false, reason: 'Line change outside interchange station' };
    }

    currentLine = [...possibleLines][0];
  }

  return { valid: true };
}

app.post('/api/game/execute', isLoggedIn, async (req, res) => {
  try {
    const { route, start_station_id, destination_station_id } = req.body;

    const segments = await db.getAllSegments();
    const lineStations = await db.getAllLineStations();
    const events = await db.getAllEvents();

    if (!Array.isArray(events) || events.length === 0) {
      return res.status(500).json({ error: 'No events available' });
    }

    const segmentMap = buildSegmentMap(segments);
    const stationLinesMap = buildStationLinesMap(lineStations);
    const segmentLinesMap = buildSegmentLinesMap(lineStations);

    const validation = validateRoute(
      route,
      start_station_id,
      destination_station_id,
      segmentMap,
      segmentLinesMap,
      stationLinesMap
    );

    if (!validation.valid) {
      return res.json({
        isValid: false,
        finalScore: 0,
        steps: [],
        reason: validation.reason,
      });
    }

    let coins = 20;
    const steps = [];

    for (let i = 0; i < route.length - 1; i++) {
      const from = route[i];
      const to = route[i + 1];

      const event = events[Math.floor(Math.random() * events.length)];
      const delta = getEventDelta(event);
      coins += delta;

      steps.push({
        from_station_id: from,
        to_station_id: to,
        event_id: event.id,
        description: event.description,
        coinChange: delta,
        coinsAfterStep: coins,
      });
    }

    const finalScore = Math.max(0, coins);

    return res.json({
      isValid: true,
      finalScore,
      steps,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to execute game' });
  }
});

app.listen(port, () => {
  console.log(`LastRace server listening on http://localhost:${port}`);
});