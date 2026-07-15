import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Rocket, Crosshair, Box, Layers } from 'lucide-react';

const CodexIndex: React.FC = () => {
    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'var(--cinzel-font)' }}>
            <h1 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '3rem', color: 'var(--accent-gold)' }}>EL CÓDICE</h1>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '4rem', fontSize: '1.2rem', fontFamily: 'var(--body-font)' }}>
                El Gran Compendio de la Creación. Todo lo material y conceptual del universo documentado para los Iniciados.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
                <Link to="/codice/ofrendas" className="glass-card hover-primary" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem', textDecoration: 'none', color: 'white' }}>
                    <Box size={48} style={{ color: 'var(--accent-cyan)', marginBottom: '1rem' }} />
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Ofrendas</h2>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontFamily: 'var(--body-font)', textAlign: 'center' }}>Recursos y Materiales</div>
                </Link>

                <Link to="/codice/tecnomilagros" className="glass-card hover-primary" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem', textDecoration: 'none', color: 'white' }}>
                    <BookOpen size={48} style={{ color: 'var(--accent-silver)', marginBottom: '1rem' }} />
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Tecnomilagros</h2>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontFamily: 'var(--body-font)', textAlign: 'center' }}>Blueprints</div>
                </Link>

                <Link to="/codice/arcas-estelares" className="glass-card hover-primary" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem', textDecoration: 'none', color: 'white' }}>
                    <Rocket size={48} style={{ color: '#ff8a65', marginBottom: '1rem' }} />
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Arcas Estelares</h2>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontFamily: 'var(--body-font)', textAlign: 'center' }}>Navíos del Vacío</div>
                </Link>

                <Link to="/codice/armamentos" className="glass-card hover-primary" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem', textDecoration: 'none', color: 'white' }}>
                    <Crosshair size={48} style={{ color: '#ff4444', marginBottom: '1rem' }} />
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Armamentos</h2>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontFamily: 'var(--body-font)', textAlign: 'center' }}>Balística y Energía</div>
                </Link>

                <Link to="/codice/modulos" className="glass-card hover-primary" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem', textDecoration: 'none', color: 'white' }}>
                    <Layers size={48} style={{ color: '#4fc3f7', marginBottom: '1rem' }} />
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Módulos</h2>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontFamily: 'var(--body-font)', textAlign: 'center' }}>Componentes de Navíos</div>
                </Link>
            </div>
        </div>
    );
};

export default CodexIndex;
