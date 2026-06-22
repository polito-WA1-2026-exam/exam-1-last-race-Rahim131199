import { useEffect, useState, useRef } from 'react';

function GamePage() {
  const [phase, setPhase] = useState('setup');
  const [network, setNetwork] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const [startStation, setStartStation] = useState(null);
  const [destinationStation, setDestinationStation] = useState(null);
  const [route, setRoute] = useState([]);
  const [timeLeft, setTimeLeft] = useState(90);
  
  const [executionValid, setExecutionValid] = useState(true);
  const [executionReason, setExecutionReason] = useState('');
  const [finalScore, setFinalScore] = useState(null);
  const [executionSteps, setExecutionSteps] = useState(null);

  useEffect(() => {
    const loadNetworkData = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/network', {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to load network');
        }

        const data = await response.json();
        setNetwork(data);
      } catch (error) {
        setErrorMessage('Could not load network data.');
      } finally {
        setLoading(false);
      }
    };

    loadNetworkData();
  }, []);

  const submitRouteRef = useRef();

  const submitRoute = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/game/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          route: route,
          start_station_id: startStation.id,
          destination_station_id: destinationStation.id,
        }),
      });
      
      const data = await response.json();
      
      setExecutionValid(data.isValid);
      setExecutionReason(data.reason || '');
      setFinalScore(data.finalScore || 0);
      setExecutionSteps(data.steps || []);
      
      await fetch('http://localhost:3001/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          start_station_id: startStation.id,
          destination_station_id: destinationStation.id,
          final_score: data.finalScore || 0,
          is_valid: data.isValid,
        }),
      });

      setPhase('execution');
    } catch (error) {
      setErrorMessage('Failed to execute route.');
    } finally {
      setLoading(false);
    }
  };
  
  submitRouteRef.current = submitRoute;

  useEffect(() => {
    if (phase === 'planning') {
      if (timeLeft <= 0) {
        submitRouteRef.current();
        return;
      }
      const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [phase, timeLeft]);

  const startPlanning = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/game/start', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to start game');
      const data = await response.json();
      setStartStation(data.startStation);
      setDestinationStation(data.destinationStation);
      setRoute([data.startStation.id]);
      setPhase('planning');
      setTimeLeft(90);
    } catch (error) {
      setErrorMessage('Could not start game.');
    } finally {
      setLoading(false);
    }
  };

  const handleSegmentClick = (segment) => {
    const lastStationId = route[route.length - 1];
    
    if (route.length === 0) {
      setRoute([segment.station1_id, segment.station2_id]);
      return;
    }

    if (lastStationId === segment.station1_id) {
      setRoute([...route, segment.station2_id]);
    } else if (lastStationId === segment.station2_id) {
      setRoute([...route, segment.station1_id]);
    } else {
      setRoute([...route, segment.station1_id, segment.station2_id]);
    }
  };

  const resetGame = () => {
    setPhase('setup');
    setRoute([]);
    setStartStation(null);
    setDestinationStation(null);
    setFinalScore(null);
    setExecutionSteps(null);
    setExecutionValid(true);
    setExecutionReason('');
  };

  if (loading) {
    return (
      <div className="container py-4">
        <div className="page-box">
          <h2>Game</h2>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="container py-4">
        <div className="page-box">
          <h2>Game</h2>
          <div className="alert alert-danger">{errorMessage}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="page-box">
        <h2>Game</h2>

        {phase === 'setup' && (
          <>
            <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
              <div>
                <h3 className="mb-1">Setup</h3>
                <p className="text-muted mb-0">
                  In this phase, you can study the underground network before starting the game.
                </p>
              </div>
              <button
                className="btn btn-primary btn-lg px-4"
                onClick={startPlanning}
              >
                Start planning
              </button>
            </div>

            <div className="row">
              <div className="col-md-3 mb-4">
                <h4 className="h5 text-primary">Stations</h4>
                <ul className="list-group list-group-flush border rounded">
                  {network.stations.map((station) => (
                    <li key={station.id} className="list-group-item">
                      {station.name}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="col-md-5 mb-4">
                <h4 className="h5 text-primary">Lines</h4>
                <ul className="list-group list-group-flush border rounded">
                  {network.lines.map((line) => {
                    const stationsOfLine = network.lineStations
                      .filter((item) => item.line_id === line.id)
                      .sort((a, b) => a.position - b.position)
                      .map((item) => {
                        const station = network.stations.find(
                          (station) => station.id === item.station_id
                        );
                        return station ? station.name : '';
                      });

                    return (
                      <li key={line.id} className="list-group-item">
                        <strong>{line.name}:</strong> <br/>
                        <span className="text-muted small">{stationsOfLine.join(' → ')}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="col-md-4 mb-4">
                <h4 className="h5 text-primary">Segments</h4>
                <ul className="list-group list-group-flush border rounded" style={{maxHeight: '500px', overflowY: 'auto'}}>
                  {network.segments.map((segment) => {
                    const station1 = network.stations.find(
                      (station) => station.id === segment.station1_id
                    );
                    const station2 = network.stations.find(
                      (station) => station.id === segment.station2_id
                    );

                    return (
                      <li key={segment.id} className="list-group-item">
                        {station1?.name} — {station2?.name}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </>
        )}

        {phase === 'planning' && (
          <>
            <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
              <div>
                <h3 className="mb-1">Planning</h3>
                <p className="mb-0 text-muted">
                  Construct your route from <strong>{startStation?.name}</strong> to <strong>{destinationStation?.name}</strong>
                </p>
              </div>
              <div className="d-flex align-items-center gap-3">
                <div className={`alert mb-0 py-2 ${timeLeft <= 10 ? 'alert-danger' : 'alert-info'}`}>
                  <strong>{timeLeft}s</strong> remaining
                </div>
                <button className="btn btn-success btn-lg px-4 shadow-sm" onClick={submitRoute}>
                  Submit Route
                </button>
              </div>
            </div>
            
            <div className="row">
              <div className="col-md-3 mb-4">
                <h4 className="h5 text-primary">Map (Stations Only)</h4>
                <ul className="list-group list-group-flush border rounded" style={{maxHeight: '500px', overflowY: 'auto'}}>
                  {network.stations.map((station) => (
                    <li key={station.id} className="list-group-item">
                      {station.name}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="col-md-5 mb-4">
                <h4 className="h5 text-primary d-flex justify-content-between align-items-center">
                  Available Segments
                  <span className="badge bg-secondary fs-6">Click to add</span>
                </h4>
                <div className="list-group list-group-flush border rounded shadow-sm" style={{maxHeight: '500px', overflowY: 'auto'}}>
                  {network.segments.map((segment) => {
                    const station1 = network.stations.find(
                      (station) => station.id === segment.station1_id
                    );
                    const station2 = network.stations.find(
                      (station) => station.id === segment.station2_id
                    );

                    return (
                      <button
                        key={segment.id}
                        className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                        onClick={() => handleSegmentClick(segment)}
                      >
                        <span>{station1?.name}</span>
                        <span className="text-muted mx-2">&harr;</span>
                        <span>{station2?.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="col-md-4 mb-4">
                <h4 className="h5 text-primary">Current Route</h4>
                {route.length === 0 ? (
                  <div className="alert alert-secondary">No stations selected yet.</div>
                ) : (
                  <ul className="list-group list-group-flush border rounded shadow-sm">
                    {route.map((stationId, idx) => {
                      const st = network.stations.find(s => s.id === stationId);
                      return (
                        <li key={idx} className="list-group-item d-flex align-items-center">
                          <span className="badge bg-primary rounded-pill me-3">{idx + 1}</span>
                          {st?.name}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}

        {phase === 'execution' && (
          <>
            <h3>Result</h3>
            {!executionValid ? (
              <div className="alert alert-danger">
                <h4>Invalid Route</h4>
                <p>{executionReason}</p>
                <p><strong>Final Score: 0</strong></p>
              </div>
            ) : (
              <div>
                <div className="alert alert-success">
                  <h4>Valid Route!</h4>
                  <p><strong>Final Score: {finalScore}</strong></p>
                </div>
                
                <h4>Journey Steps</h4>
                <ul className="list-group mb-4">
                  {executionSteps.map((step, idx) => {
                    const fromStation = network.stations.find(s => s.id === step.from_station_id);
                    const toStation = network.stations.find(s => s.id === step.to_station_id);
                    return (
                      <li key={idx} className="list-group-item">
                        <strong>{fromStation?.name} &rarr; {toStation?.name}</strong>
                        <p className="mb-1 text-muted">{step.description}</p>
                        <div className="d-flex justify-content-between">
                          <span className={step.coinChange >= 0 ? "text-success" : "text-danger"}>
                            {step.coinChange >= 0 ? '+' : ''}{step.coinChange} coins
                          </span>
                          <strong>Total: {step.coinsAfterStep}</strong>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            
            <button className="btn btn-primary" onClick={resetGame}>
              Start New Game
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default GamePage;
