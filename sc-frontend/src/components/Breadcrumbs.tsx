import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home, Trash2 } from 'lucide-react';

interface BreadcrumbItem {
    label: string;
    path: string;
}

const Breadcrumbs: React.FC = () => {
    const location = useLocation();
    const [history, setHistory] = useState<BreadcrumbItem[]>([]);

    useEffect(() => {
        const stored = sessionStorage.getItem('breadcrumbHistory');
        let currentHistory: BreadcrumbItem[] = stored ? JSON.parse(stored) : [];

        // Determine current label based on path and state
        const path = location.pathname + location.search;
        
        const pathMapping: Record<string, string> = {
            '/': 'INICIO',
            '/missions': 'EDICTOS',
            '/mapa': 'MAPA DE OFRENDAS',
            '/recipes': 'TECNOMILAGROS',
            '/lore': 'CRÓNICA DE ANCALAGON',
            '/rituales': 'RITUALES SAGRADOS'
        };

        let label = pathMapping[location.pathname] || 'REGISTRO';
        
        // Try to get label from state or specific patterns
        if (location.state && (location.state as any).breadcrumbLabel) {
            label = (location.state as any).breadcrumbLabel;
        } else if (location.pathname.startsWith('/recurso/')) {
            label = `OFRENDA: ${location.pathname.split('/').pop()}`;
        } else if (location.pathname.startsWith('/locacion/')) {
            const parts = location.pathname.split('/');
            label = `RITO: ${parts[3] || 'LOCALIZACIÓN'}`;
        } else if (location.search.includes('id=')) {
           // If we are in missions filter, we'll try to get it from state later
           // for now we'll check if we have a name in state
           if ((location.state as any)?.name) label = (location.state as any).name;
        }

        // Check if path already exists
        const existingIndex = currentHistory.findIndex(item => item.path === path);

        if (existingIndex !== -1) {
            // If it exists, we go back to that point
            currentHistory = currentHistory.slice(0, existingIndex + 1);
        } else {
            // New path: Add it
            // Special case: if we go from / to / again with different filters, maybe don't stack indefinitely
            // But user asked for detailed registry.
            
            // If the last item is a generic category and we are now in a detail of that category
            // we might want to keep both.
            currentHistory.push({ label, path });
        }

        // Limit history to 8 items to avoid UI mess
        if (currentHistory.length > 8) currentHistory.shift();

        setHistory(currentHistory);
        sessionStorage.setItem('breadcrumbHistory', JSON.stringify(currentHistory));
    }, [location]);

    if (history.length <= 1 && location.pathname === '/') return null;

    const clearHistory = () => {
        const reset = [{ label: 'INICIO', path: '/' }];
        setHistory(reset);
        sessionStorage.setItem('breadcrumbHistory', JSON.stringify(reset));
    };

    return (
        <div style={{ padding: '0.8rem 2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
            <Link to="/" onClick={clearHistory} style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }} className="hover-underline">
                <Home size={14} />
            </Link>
            
            {history.map((item, index) => (
                <React.Fragment key={index + item.path}>
                    <ChevronRight size={14} style={{ opacity: 0.3 }} />
                    <Link 
                        to={item.path} 
                        style={{ 
                            color: index === history.length - 1 ? 'var(--primary)' : 'inherit', 
                            textDecoration: 'none',
                            fontSize: '0.75rem',
                            fontWeight: index === history.length - 1 ? 'bold' : 'normal',
                            maxWidth: '150px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }} 
                        className="hover-underline"
                        title={item.label}
                    >
                        {item.label}
                    </Link>
                </React.Fragment>
            ))}

            {history.length > 2 && (
                <button 
                    onClick={clearHistory}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.65rem' }}
                    className="hover-primary"
                >
                    <Trash2 size={12} /> PURIFICAR RASTRO
                </button>
            )}
        </div>
    );
};

export default Breadcrumbs;
