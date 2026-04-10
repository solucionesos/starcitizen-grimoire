import React from 'react';
import { useAltar } from '../context/AltarContext';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, PackageOpen, Target } from 'lucide-react';

const Altar: React.FC = () => {
    const { cart, addToAltar, removeFromAltar, clearAltar, getConsolidatedMaterials } = useAltar();
    const navigate = useNavigate();
    const materials = getConsolidatedMaterials();
    const materialKeys = Object.keys(materials).sort();

    return (
        <div style={{ padding: '0 2rem 4rem', maxWidth: '1000px', margin: '0 auto' }}>
            <h1 style={{ color: 'var(--secondary)', marginBottom: '1rem' }}>Rito de Transmutación</h1>
            <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--cinzel-font)', letterSpacing: '1px', marginBottom: '2rem' }}>
                Concentra los tecnomilagros que deseas manifestar para revelar el sumatorio sagrado de ofrendas requeridas.
            </p>

            {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '5rem', border: '1px dashed var(--border)', borderRadius: '8px', background: 'rgba(255,255,255,0.02)' }}>
                    <PackageOpen size={48} style={{ color: 'var(--secondary)', marginBottom: '1rem', opacity: 0.5 }} />
                    <h3 style={{ fontFamily: 'var(--cinzel-font)', letterSpacing: '2px', color: 'var(--text-muted)' }}>EL ALTAR ESTÁ VACÍO</h3>
                    <p style={{ marginTop: '1rem' }}>
                        <Link to="/recipes" className="btn" style={{ textDecoration: 'none' }}>EXAMINAR TECNOMILAGROS</Link>
                    </p>
                </div>
            ) : (
                <div className="responsive-grid-2" style={{ gap: '2rem' }}>
                    {/* COLUMNA IZQUIERDA: LOS TECNOMILAGROS SELECCIONADOS */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(196,30,58,0.2)', paddingBottom: '0.8rem' }}>
                            <h3 style={{ fontFamily: 'var(--cinzel-font)', letterSpacing: '2px', color: 'var(--primary)', margin: 0 }}>
                                <Target size={16} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'text-top' }}/>
                                FOCOS DE MANIFESTACIÓN
                            </h3>
                            <button 
                                onClick={clearAltar}
                                style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                                title="Purgar Altar"
                            >
                                <Trash2 size={14} /> PURGAR
                            </button>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            {cart.map((item) => (
                                <motion.div 
                                    key={item.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="glass-card"
                                    style={{ padding: '1rem', borderTop: '2px solid var(--secondary)' }}
                                >
                                    <h4 className="accent-gold" style={{ marginBottom: '0.5rem' }}>{item.name}</h4>
                                    
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.4)', borderRadius: '4px', padding: '0.2rem' }}>
                                            <button 
                                                onClick={() => removeFromAltar(item.id)}
                                                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '0.3rem', borderRadius: '4px', cursor: 'pointer' }}
                                            ><Minus size={14}/></button>
                                            <span style={{ fontFamily: 'var(--cinzel-font)', width: '30px', textAlign: 'center', fontWeight: 'bold' }}>{item.quantity}</span>
                                            <button 
                                                onClick={() => addToAltar(item)}
                                                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '0.3rem', borderRadius: '4px', cursor: 'pointer' }}
                                            ><Plus size={14}/></button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* COLUMNA DERECHA: CONSOLIDADO DE MATERIALES */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass-card"
                        style={{ height: 'fit-content', position: 'sticky', top: '6rem', borderTop: '4px solid var(--primary)' }}
                    >
                        <h3 style={{ fontFamily: 'var(--cinzel-font)', letterSpacing: '2px', color: 'var(--secondary)', marginBottom: '1.5rem', borderBottom: '1px solid rgba(212,175,55,0.2)', paddingBottom: '0.8rem' }}>RESUMEN DE OFRENDAS NECESARIAS</h3>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            {materialKeys.map(key => {
                                const mat = materials[key];
                                return (
                                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', borderLeft: mat.resourceId ? '2px solid var(--primary)' : '2px solid transparent' }}>
                                        {mat.resourceId ? (
                                            <Link 
                                                to={`/recurso/${mat.resourceId}`}
                                                state={{ breadcrumbLabel: `REQ: ${mat.label}` }}
                                                style={{ color: 'var(--text-main)', textDecoration: 'none', fontWeight: 500 }}
                                                className="hover-primary"
                                            >
                                                {mat.label}
                                            </Link>
                                        ) : (
                                            <Link 
                                                to={`/mapa?tags=${encodeURIComponent(mat.label)}`}
                                                state={{ breadcrumbLabel: `MAPEO: ${mat.label}` }}
                                                style={{ color: 'var(--text-muted)', textDecoration: 'none' }}
                                                className="hover-primary"
                                            >
                                                {mat.label} <span style={{fontSize: '0.6rem'}}>(🔍)</span>
                                            </Link>
                                        )}
                                        <span className="accent-amber" style={{ fontFamily: 'var(--cinzel-font)', fontWeight: 'bold', fontSize: '1.1rem' }}>
                                            x{mat.amount.toLocaleString()} <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>SCU</span>
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                        
                        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
                            <button 
                                className="btn"
                                style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--cinzel-font)' }}
                                onClick={() => {
                                    const allTags = materialKeys.map(k => encodeURIComponent(materials[k].label)).join(',');
                                    navigate(`/mapa?tags=${allTags}`, { state: { breadcrumbLabel: 'MAPEO MASIVO' } });
                                }}
                            >
                                <Target size={18} /> ESCANEAR TODAS EN MAPA
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default Altar;
