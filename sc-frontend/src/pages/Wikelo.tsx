import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, Crosshair, Shield, Coins, AlertCircle, Search, Filter } from 'lucide-react';
import { getMissions } from '../api/client';
import { useNavigate } from 'react-router-dom';

const CATEGORIES = [
  { id: 'Todos', label: 'TODOS', icon: Filter, color: 'var(--text-main)' },
  { id: 'Nave', label: 'NAVES', icon: Rocket, color: 'var(--primary)' },
  { id: 'Arma', label: 'ARMAS', icon: Crosshair, color: '#f87171' },
  { id: 'Armadura', label: 'ARMADURAS', icon: Shield, color: '#60a5fa' },
  { id: 'Intercambios', label: 'INTERCAMBIOS', icon: Coins, color: 'var(--secondary)' },
];

const WIKELO_MISSION_MAP: Record<string, string> = {
  "TheCollector_OrbArm": "Armor with horn and string",
  "TheCollector_SpikeyArmor": "Armor with Vanduul",
  "TheCollector_Vehicle_Large_Anvil_Asgard": "Asgard Fight Mod",
  "TheCollector_Vehicle_Medium_Scorpius": "Build a Mod Scorpius",
  "TheCollector_BigBooma": "Curious Weapon",
  "TheCollector_Nov_Molten": "Do Lava Suit",
  "TheCollector_Vehicle_Large_F8C_Milt": "F8 War Mod",
  "TheCollector_Vehicle_Medium_Firebird": "Firebird Mod",
  "TheCollector_Vehicle_Small_Fortune": "Fortune ship for you",
  "TheCollector_OrbVolt_KopSkull": "Fun Kopion Skull Gun",
  "TheCollector_OrbVolt_MiltSkull": "Fun Military Skull Gun",
  "TheCollector_Vehicle_Small_Drake_Golem": "Golem Rocks",
  "TheCollector_Vehicle_Medium_Guardian": "Guardian Fight Mod",
  "TheCollector_Vehicle_Medium_GuardianQI": "Guardian take down ship",
  "TheCollector_Vehicle_Medium_GuardianMX": "Guardian WiK-X",
  "TheCollector_AD_Hush": "Hide Snow Suit",
  "TheCollector_NonePistol": "Hot Shot",
  "TheCollector_Vehicle_Ground_Ursa_Medical": "Make a Ursa Mod",
  "TheCollector_Vehicle_Ground_ATLS_IKTI": "Make ATLS shoot",
  "TheCollector_AO_IrrArm": "Make glowy armor",
  "TheCollector_Vehicle_Ground_ATLS_IKTI_GEO": "Make jumpy ATLS shoot",
  "TheCollector_AO_VoltThwack": "Make VOLT shotgun angrier",
  "TheCollector_Vehicle_Large_Starlancer_max": "More than a Max",
  "TheCollector_Vehicle_Small_Kruger_Wolf_Unique": "Most Special Wolf",
  "TheCollector_Vehicle_Large_Starlancer_TAC": "New Move Big Starlancer Ship",
  "TheCollector_Vehicle_Polaris": "Now make Polaris. Short Time Deal.",
  "TheCollector_Vehicle_Ground_Nox": "Noxy Mod",
  "TheCollector_Vehicle_Medium_Peregrine": "Peregrine Wikelo Mod",
  "TheCollector_Vehicle_Small_MISC_Prospector": "Prospects Look Good",
  "TheCollector_Vehicle_Large_Prowler_Utility": "Prowler More Utility",
  "TheCollector_Vehicle_Ground_Pulse": "Pulse Plus",
  "TheCollector_Vehicle_Small_ARGO_Raft": "Ready for RAFT?",
  "TheCollector_Vehicle_Apollo_Triage": "Red Fight Apollo",
  "TheCollector_RedHunterArmour": "Red Fight Armor",
  "TheCollector_GeminiShotgun": "Red Fight Shotgun",
  "TheCollector_Vehicle_Small_RSI_Meteor": "RSI Meteor Mod",
  "TheCollector_Nov_HeavyUtil": "Shiny Builder Suit",
  "TheCollector_Vehicle_Large_F8C_Stealth": "Sneaky Stabber",
  "TheCollector_Vehicle_Medium_Starfighter_Ion": "Sneaky Starfighter Ion",
  "TheCollector_AD_ZapZip": "Snow Snipe",
  "TheCollector_Vehicle_Super_Idris": "Special Idris For Killing",
  "TheCollector_Vehicle_Medium_Spirit_C1": "Spirit Cargo mod",
  "TheCollector_Vehicle_Medium_Starfighter_Inferno": "Starfighter Inferno Special",
  "TheCollector_Vehicle_Large_Crusader_A2": "Starlifter A2 War Mod",
  "TheCollector_Battle": "Test Armor",
  "TheCollector_Favours_CouncilScrip": "Trade Council Scrip for Favors?",
  "TheCollector_Favours_MercScrip": "Trade Merc Scrip for Favors?",
  "TheCollector_Favours_IrradiatedPearls": "Trade Worm Parts for Favors?",
  "TheCollector_Favours_Caranite": "Turn Things to Favor",
  "TheCollector_Vehicle_Small_Intrepid": "Upgrade Intrepid",
  "TheCollector_FoodOrder": "Very Hungry",
  "TheCollector_Favours_PolarisParts": "Want Polaris? Need something special.",
  "TheCollector_Vehicle_Large_Connie_Tau": "Want Taurus ship",
  "TheCollector_Vehicle_Medium_Terrapin_Medic": "What is Terrapin?",
  "TheCollector_Vehicle_Small_Kruger_Wolf": "Where Wolf? Here Wolf",
  "TheCollector_Intro": "Wikelo Arrive to System",
  "TheCollector_Vehicle_Medium_F7_MK2": "Wikelo Navy F7",
  "TheCollector_SlimyLMG": "Yormandi Gun",
  "TheCollector_Vehicle_Medium_ZeusCL": "Zeus Cargo Special",
  "TheCollector_Vehicle_Medium_ZeusES": "Zeus Special"
};

const Wikelo: React.FC = () => {
  const navigate = useNavigate();
  const [missionsDB, setMissionsDB] = useState<any[]>([]);
  const [wikeloConfig, setWikeloConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // New Search and Filter State
  const [activeFilter, setActiveFilter] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    Promise.all([
      getMissions(),
      fetch('/data/wikelo.json').then(r => r.json())
    ])
      .then(([dbData, configData]) => {
        setMissionsDB(Array.isArray(dbData) ? dbData : (dbData.missions || []));
        setWikeloConfig(configData);
      })
      .catch(err => console.error("Error loading Wikelo data:", err))
      .finally(() => setLoading(false));
  }, []);

  const getCategoryColor = (cat: string) => {
    switch (cat?.toLowerCase()) {
      case 'nave': return 'var(--primary)';
      case 'arma': return '#f87171';
      case 'armadura': return '#60a5fa';
      default: return 'var(--secondary)';
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat?.toLowerCase()) {
      case 'nave': return <Rocket size={12} />;
      case 'arma': return <Crosshair size={12} />;
      case 'armadura': return <Shield size={12} />;
      default: return <Coins size={12} />;
    }
  };

  const filteredData = useMemo(() => {
    let data = wikeloConfig?.items || [];

    // Filter by Category
    if (activeFilter !== 'Todos') {
      data = data.filter((item: any) => item.categoria === activeFilter);
    }

    // Filter by Search Query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      data = data.filter((item: any) => 
        (item.name || '').toLowerCase().includes(q) || 
        (item.soborno || '').toLowerCase().includes(q) ||
        (item.mision_nombre || '').toLowerCase().includes(q)
      );
    }

    return data;
  }, [wikeloConfig, activeFilter, searchQuery]);

  return (
    <div style={{ padding: '0 2rem' }}>
      <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid rgba(212,175,55,0.2)', paddingBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div>
          <h1 style={{ color: 'var(--secondary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            Wikelo "El Estafador"
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontFamily: 'var(--cinzel-font)', letterSpacing: '1px' }}>
            Mercado Negro Clandestino / Catálogo Versión {wikeloConfig?.version || '4.7.1'}
          </p>
        </div>
      </div>

      {/* Control Panel: Filters + Search */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '600px' }}>
          <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Buscar cargamento, armamento o precio de soborno..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '1rem 1rem 1rem 3rem',
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(212,175,55,0.3)',
              borderRadius: '4px',
              color: 'var(--text-main)',
              fontSize: '1rem',
              outline: 'none',
              fontFamily: 'var(--main-font)'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const isActive = activeFilter === cat.id;
            // Optionally compute counts for each category specifically:
            const count = cat.id === 'Todos' 
              ? (wikeloConfig?.items?.length || 0) 
              : (wikeloConfig?.items?.filter((i:any) => i.categoria === cat.id).length || 0);

            return (
              <button
                key={cat.id}
                onClick={() => setActiveFilter(cat.id)}
                className="filter-btn"
                style={{
                  flex: 1, minWidth: '120px',
                  background: isActive ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.02)',
                  borderColor: isActive ? cat.color : 'rgba(255,255,255,0.1)',
                  color: isActive ? cat.color : 'var(--text-muted)',
                  padding: '0.8rem',
                  fontSize: '0.9rem',
                  position: 'relative'
                }}
              >
                <Icon size={16} style={{ margin: '0 auto 0.5rem block' }} />
                <div>{cat.label} ({count})</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Warning banner */}
      <div style={{ background: 'rgba(255, 62, 62, 0.05)', border: '1px solid rgba(255, 62, 62, 0.2)', borderRadius: '4px', padding: '1rem', marginBottom: '2rem', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
        <AlertCircle size={24} style={{ color: '#ff4444', flexShrink: 0 }} />
        <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
          {wikeloConfig?.warning_message || 'Precaución al adquirir material.'}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--secondary)' }}>Sincronizando con el mercado negro...</div>
      ) : (
        <div className="grid-layout">
          <AnimatePresence>
            {filteredData.map((item: any, i: number) => {
              const realNameFromMap = WIKELO_MISSION_MAP[item.mision_id];
              const dbRef = missionsDB.find(m => 
                m.technicalName === item.mision_id || 
                m.id === item.mision_id || 
                (realNameFromMap && m.name === realNameFromMap) ||
                m.name === item.mision_id
              ) || {};
              
              const friendlyName = item.name;
              const imageName = item.imagen;
              
              // Determine reputation: priority to DB, then fallbacks
              let rep = dbRef.reputation_required;
              if (!rep) {
                // Hardcoded fallbacks based on imperial intelligence
                if (friendlyName.includes('Idris')) rep = 'Very Best Customer ( Favor Máximo )';
                else if (friendlyName === 'L-21 Wolf (Military Spec)') rep = 'Very Good Customer';
                else if (friendlyName === 'L-21 Wolf (Stealth Spec)') rep = 'Neutral';
                else rep = 'Neutral';
              }
              
              const dbId = dbRef.id || null;
              const catColor = getCategoryColor(item.categoria);
              
              return (
                <motion.div
                  layout
                  key={item.id || i}
                  className="glass-card"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  style={{ display: 'flex', flexDirection: 'column', borderTop: `4px solid ${catColor}` }}
                >
                  <div style={{ background: 'rgba(0,0,0,0.4)', height: '180px', borderRadius: '4px', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden', position: 'relative', cursor: dbId ? 'pointer' : 'default' }} onClick={() => dbId && navigate(`/missions?id=${dbId}`)}>
                    <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'rgba(0,0,0,0.8)', padding: '0.3rem 0.6rem', borderRadius: '4px', border: `1px solid ${catColor}`, color: catColor, fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 'bold' }}>
                      {getCategoryIcon(item.categoria)} {item.categoria?.toUpperCase()}
                    </div>
                    <img src={`/assets/wikelo/${imageName}`} alt={friendlyName} onError={(e) => { e.currentTarget.style.display='none'; e.currentTarget.parentElement!.innerHTML = '<div style="color:var(--text-muted);font-size:0.8rem;text-align:center"><p>IMAGEN DE REFERENCIA PENDIENTE</p><span style="font-size:2rem;opacity:0.2">👁️</span><p style="font-size:0.6rem;opacity:0.5;margin-top:0.5rem">'+imageName+'</p></div>'; }} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>

                  <h3 style={{ color: 'var(--text-main)', fontSize: '1.1rem', marginBottom: '0.2rem', fontFamily: 'var(--cinzel-font)' }}>{friendlyName}</h3>

                  {dbRef.name && (
                    <p style={{ fontSize: '0.6rem', color: 'var(--secondary)', marginBottom: '0.8rem', opacity: 0.8, letterSpacing: '1px' }}>
                       EDICTO: {dbRef.name.toUpperCase()}
                    </p>
                  )}
                  
                  <p style={{ color: 'var(--primary)', fontSize: '0.75rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    REP: <span style={{ color: 'var(--text-main)' }}>{rep}</span>
                  </p>

                  <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.2rem', letterSpacing: '1px' }}>REQUISITO DE SOBORNO:</div>
                    {(item.soborno || item.costo || "").split(',').map((part: string, pIdx: number) => {
                      const trimmed = part.trim();
                      if (!trimmed) return null;
                      return (
                        <div key={pIdx} style={{ 
                          fontSize: '0.8rem', 
                          color: 'var(--secondary)', 
                          background: 'rgba(212, 175, 55, 0.05)',
                          padding: '0.5rem 0.8rem',
                          borderRadius: '4px',
                          borderLeft: '3px solid var(--secondary)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span>{trimmed}</span>
                        </div>
                      );
                    })}
                  </div>
                  
                  {dbId && (
                    <div style={{ marginTop: '0.8rem', display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className="btn" 
                        style={{ flex: 1, padding: '0.6rem', fontSize: '0.75rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem' }}
                        onClick={() => navigate(`/missions?id=${dbId}`, { state: { breadcrumbLabel: `WIKELO: ${friendlyName}` } })}
                      >
                        <Search size={14} /> EXAMINAR EDICTO
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
          {filteredData.length === 0 && !loading && (
            <div style={{ padding: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem', gridColumn: '1 / -1', textAlign: 'center' }}>No hay registros que coincidan con la búsqueda.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default Wikelo;
