import React, { useEffect, useState } from 'react';

const Comunicaciones: React.FC = () => {
  const [devPosts, setDevPosts] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any>(null);

  useEffect(() => {
    // Basic polling
    const fetchData = async () => {
      try {
        const [devRes, statusRes] = await Promise.all([
          fetch('http://localhost:3001/api/devtracker'),
          fetch('http://localhost:3001/api/status')
        ]);
        if (devRes.ok) setDevPosts(await devRes.json());
        if (statusRes.ok) setStatusData(await statusRes.json());
      } catch(e) { console.error(e); }
    };
    fetchData();
    const interval = setInterval(fetchData, 60000); // 1 minute polling
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ color: 'var(--text-main)', padding: '2rem' }}>
      <h2>RED DE COMUNICACIONES</h2>
      <div style={{ display: 'flex', gap: '2rem' }}>
        <div style={{ flex: 1 }}>
          <h3>Estado del Servidor (LIVE)</h3>
          {statusData ? (
             <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                <p>Indicador: <strong style={{ color: statusData.status?.indicator === 'none' ? 'green' : 'orange' }}>{statusData.status?.description}</strong></p>
                {statusData.incidents?.length > 0 && (
                    <ul>
                      {statusData.incidents.map((inc: any) => <li key={inc.id}>{inc.name} ({inc.status})</li>)}
                    </ul>
                )}
             </div>
          ) : <p>Cargando estado...</p>}
        </div>
        <div style={{ flex: 2 }}>
          <h3>DevTracker (Reddit)</h3>
          {devPosts.length > 0 ? devPosts.slice(0, 10).map((post: any) => (
             <div key={post.id} style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px', borderLeft: '4px solid #00d2ff' }}>
                <h4><a href={post.url} target="_blank" rel="noreferrer" style={{ color: '#00d2ff', textDecoration: 'none' }}>{post.title}</a></h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Por {post.author}</p>
             </div>
          )) : <p>Cargando posts...</p>}
        </div>
      </div>
    </div>
  );
};

export default Comunicaciones;
