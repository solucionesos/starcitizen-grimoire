import React from 'react';
import { Layers } from 'lucide-react';
import { Link } from 'react-router-dom';

const CodexComponents: React.FC = () => {
    return (
        <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#4fc3f7', marginBottom: '1.5rem', fontFamily: 'var(--cinzel-font)' }}>
                <Layers size={32} /> MÓDULOS Y SUBSISTEMAS
            </h1>

            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                Registro de componentes internos de navíos: Escudos, Plantas de Energía, Motores Quantum y Refrigeradores.
            </p>

            <div className="glass-card" style={{ textAlign: 'center', padding: '4rem' }}>
                <h3 style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Archivo en proceso de desencriptación...</h3>
                <p style={{ fontSize: '0.9rem', opacity: 0.6 }}>Los datos de módulos aún están siendo sincronizados desde los bancos de memoria de Ancalagon.</p>
                <div style={{ marginTop: '2rem' }}>
                    <Link to="/codice/tecnomilagros" className="btn" style={{ background: 'var(--secondary)', color: '#000', fontSize: '0.8rem', padding: '0.5rem 1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                        Ver Tecnomilagros de Módulos
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default CodexComponents;
