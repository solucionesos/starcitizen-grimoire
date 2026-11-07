import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Rocket, Crosshair, Box, Layers, ScrollText } from 'lucide-react';

const CodexIndex: React.FC = () => {
  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'var(--cinzel-font)' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '1rem', fontSize: '3rem', color: 'var(--accent-gold)' }}>
        EL CÓDICE
      </h1>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '3.5rem', fontSize: '1.15rem', fontFamily: 'var(--body-font)' }}>
        El Gran Compendio de la Creación. Todo lo material, bélico y conceptual documentado para los Iniciados de la Flota.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '2rem' }}>
        <Link to="/codice/mandatos" className="glass-card hover-primary" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem', textDecoration: 'none', color: 'white' }}>
          <ScrollText size={48} style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem', textAlign: 'center' }}>Mandatos Profanos</h2>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontFamily: 'var(--body-font)', textAlign: 'center' }}>
            Contratos del Imperio y Facciones
          </div>
        </Link>

        <Link to="/codice/ofrendas" className="glass-card hover-primary" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem', textDecoration: 'none', color: 'white' }}>
          <Box size={48} style={{ color: 'var(--accent-cyan)', marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem', textAlign: 'center' }}>Ofrendas</h2>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontFamily: 'var(--body-font)', textAlign: 'center' }}>
            Recursos y Materiales del Vacío
          </div>
        </Link>

        <Link to="/codice/tecnomilagros" className="glass-card hover-primary" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem', textDecoration: 'none', color: 'white' }}>
          <BookOpen size={48} style={{ color: 'var(--secondary)', marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem', textAlign: 'center' }}>Tecnomilagros</h2>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontFamily: 'var(--body-font)', textAlign: 'center' }}>
            Blueprints y Litanias de Forja
          </div>
        </Link>

        <Link to="/codice/arcas-estelares" className="glass-card hover-primary" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem', textDecoration: 'none', color: 'white' }}>
          <Rocket size={48} style={{ color: '#ff8a65', marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem', textAlign: 'center' }}>Arcas Estelares</h2>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontFamily: 'var(--body-font)', textAlign: 'center' }}>
            Navíos y Blindajes del Vacío
          </div>
        </Link>

        <Link to="/codice/armamentos" className="glass-card hover-primary" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem', textDecoration: 'none', color: 'white' }}>
          <Crosshair size={48} style={{ color: '#ff4444', marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem', textAlign: 'center' }}>Armamentos</h2>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontFamily: 'var(--body-font)', textAlign: 'center' }}>
            Balística, Láser y Penetración
          </div>
        </Link>

        <Link to="/codice/modulos" className="glass-card hover-primary" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem', textDecoration: 'none', color: 'white' }}>
          <Layers size={48} style={{ color: '#4fc3f7', marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem', textAlign: 'center' }}>Módulos</h2>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontFamily: 'var(--body-font)', textAlign: 'center' }}>
            Componentes y Escudos
          </div>
        </Link>
      </div>
    </div>
  );
};

export default CodexIndex;
