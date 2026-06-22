import { useEffect, useState } from 'react';

function RankingPage() {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadRanking = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/ranking', {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to load ranking');
        }

        const data = await response.json();
        setRanking(data);
      } catch (error) {
        setErrorMessage('Could not load ranking.');
      } finally {
        setLoading(false);
      }
    };

    loadRanking();
  }, []);

  return (
    <div className="container py-4">
      <div className="page-box">
        <h2>Ranking</h2>

        {loading && <p>Loading ranking...</p>}

        {!loading && errorMessage && (
          <div className="alert alert-danger">{errorMessage}</div>
        )}

        {!loading && !errorMessage && ranking.length === 0 && (
          <p>No ranking data available.</p>
        )}

        {!loading && !errorMessage && ranking.length > 0 && (
          <ul className="list-group">
            {ranking.map((player, index) => (
              <li
                key={player.username}
                className="list-group-item d-flex justify-content-between align-items-center"
              >
                <span>
                  {index + 1}. {player.username}
                </span>
                <span className="badge text-bg-primary rounded-pill">
                  {player.best_score}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default RankingPage;
