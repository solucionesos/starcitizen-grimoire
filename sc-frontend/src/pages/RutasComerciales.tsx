import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Package, DollarSign, Box } from 'lucide-react';

interface Ship {
  id: string;
  name: string;
  className?: string;
  cargo_capacity?: number;
}

interface CommodityRecord {
  id: number;
  commodity_name: string;
  terminal_name: string;
  price_buy: number;
  price_sell: number;
  price_buy_avg: number;
  price_sell_avg: number;
  is_auto_load?: number;
}

interface Route {
  commodity: string;
  buyFrom: string;
  sellTo: string;
  buyPrice: number;
  sellPrice: number;
  units: number;
  investment: number;
  revenue: number;
  profit: number;
}

const RutasComerciales: React.FC = () => {
  const [commodities, setCommodities] = useState<CommodityRecord[]>([]);
  const [ships, setShips] = useState<Ship[]>([]);
  
  const [selectedShipSCU, setSelectedShipSCU] = useState<number>(0);
  const [capital, setCapital] = useState<number>(100000);
  const [requireAutoLoad, setRequireAutoLoad] = useState<boolean>(true);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('http://localhost:3001/api/commodities').then(r => r.json()),
      fetch('http://localhost:3001/api/ships').then(r => r.json()),
    ])
    .then(([cData, sData]) => {
      setCommodities(cData);
      setShips(sData.filter((s: Ship) => s.cargo_capacity && s.cargo_capacity > 0)
                    .sort((a: Ship, b: Ship) => a.name.localeCompare(b.name)));
      setLoading(false);
    })
    .catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const topRoutes = useMemo(() => {
    if (selectedShipSCU <= 0 || capital <= 0 || commodities.length === 0) return [];

    const routes: Route[] = [];
    const grouped = commodities.reduce((acc, curr) => {
      if (!acc[curr.commodity_name]) acc[curr.commodity_name] = [];
      acc[curr.commodity_name].push(curr);
      return acc;
    }, {} as Record<string, CommodityRecord[]>);

    for (const [commodityName, records] of Object.entries(grouped)) {
      // Best place to buy (lowest price_buy_avg > 0)
      const sellers = records.filter(r => (r.price_buy_avg || r.price_buy) > 0 && (!requireAutoLoad || r.is_auto_load === 1))
                             .sort((a, b) => (a.price_buy_avg || a.price_buy) - (b.price_buy_avg || b.price_buy));
      // Best place to sell (highest price_sell_avg > 0)
      const buyers = records.filter(r => (r.price_sell_avg || r.price_sell) > 0 && (!requireAutoLoad || r.is_auto_load === 1))
                            .sort((a, b) => (b.price_sell_avg || b.price_sell) - (a.price_sell_avg || a.price_sell));

      if (sellers.length > 0 && buyers.length > 0) {
        const bestBuy = sellers[0];
        const bestSell = buyers[0];
        
        const buyPrice = bestBuy.price_buy_avg || bestBuy.price_buy;
        const sellPrice = bestSell.price_sell_avg || bestSell.price_sell;
        
        const profitPerUnit = sellPrice - buyPrice;

        if (profitPerUnit > 0) {
          const maxCarryUnits = selectedShipSCU * 100;
          const maxAffordUnits = Math.floor(capital / buyPrice);
          const units = Math.min(maxCarryUnits, maxAffordUnits);

          if (units > 0) {
            const investment = units * buyPrice;
            const revenue = units * sellPrice;
            const profit = revenue - investment;

            routes.push({
              commodity: commodityName,
              buyFrom: bestBuy.terminal_name,
              sellTo: bestSell.terminal_name,
              buyPrice: buyPrice,
              sellPrice: sellPrice,
              units,
              investment,
              revenue,
              profit
            });
          }
        }
      }
    }

    return routes.sort((a, b) => b.profit - a.profit).slice(0, 5);
  }, [commodities, selectedShipSCU, capital, requireAutoLoad]);

  const handleShipChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const scu = parseInt(e.target.value) || 0;
    setSelectedShipSCU(scu);
  };

  return (
    <div style={{ color: 'var(--text-main)', padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* HEADER */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: '3rem', textAlign: 'center' }}
      >
        <h2 style={{ fontFamily: 'var(--cinzel-font)', fontSize: '2rem', color: '#ffd700', letterSpacing: '4px', textShadow: '0 0 15px rgba(255,215,0,0.3)' }}>
          CALCULADORA DE RUTAS COMERCIALES
        </h2>
        <p style={{ color: 'var(--text-muted)' }}>Optimiza tus trayectos de Cargo Hauling en base a tu capital y capacidad de nave.</p>
      </motion.div>

      {/* CONTROLS */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ 
          background: 'var(--bg-secondary)', 
          padding: '2rem', 
          borderRadius: '12px', 
          border: '1px solid rgba(255,215,0,0.2)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '2rem',
          marginBottom: '3rem'
        }}
      >
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ffd700', fontWeight: 'bold' }}>Nave Activa</label>
          <div style={{ position: 'relative' }}>
            <select 
              onChange={handleShipChange}
              style={{ 
                width: '100%', padding: '0.8rem', paddingLeft: '2.5rem',
                background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px', outline: 'none', appearance: 'none',
                fontFamily: 'inherit'
              }}
            >
              <option value="0">Seleccionar nave...</option>
              {ships.map(s => (
                <option key={s.id} value={s.cargo_capacity}>{s.name} ({s.cargo_capacity} SCU)</option>
              ))}
            </select>
            <Box size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ffd700', fontWeight: 'bold' }}>Capacidad Manual (SCU)</label>
          <input 
            type="number" 
            value={selectedShipSCU}
            onChange={(e) => setSelectedShipSCU(parseInt(e.target.value) || 0)}
            style={{ 
              width: '100%', padding: '0.8rem', 
              background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '6px', outline: 'none'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ffd700', fontWeight: 'bold' }}>Capital Inicial (aUEC)</label>
          <div style={{ position: 'relative' }}>
            <input 
              type="number" 
              value={capital}
              onChange={(e) => setCapital(parseInt(e.target.value) || 0)}
              style={{ 
                width: '100%', padding: '0.8rem', paddingLeft: '2.5rem',
                background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px', outline: 'none'
              }}
            />
            <DollarSign size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>
        </div>

        <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', marginTop: '0.5rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: requireAutoLoad ? '#00ff00' : 'var(--text-muted)' }}>
            <input 
              type="checkbox" 
              checked={requireAutoLoad}
              onChange={(e) => setRequireAutoLoad(e.target.checked)}
              style={{ marginRight: '10px', width: '20px', height: '20px', accentColor: '#ffd700' }}
            />
            <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>Solo Terminales de Carga Automática (Evitar carga manual)</span>
          </label>
        </div>
      </motion.div>

      {/* RESULTS */}
      <div>
        <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>Mejores Rutas Calculadas</h3>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Sincronizando mercado...</div>
        ) : topRoutes.length === 0 ? (
           <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.2)' }}>
              Selecciona una nave o introduce tu SCU y Capital para calcular rutas.
           </div>
        ) : (
          <AnimatePresence>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {topRoutes.map((route, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'linear-gradient(90deg, rgba(30,41,59,0.8) 0%, rgba(15,23,42,0.8) 100%)',
                    border: '1px solid rgba(255,215,0,0.3)',
                    borderRadius: '8px',
                    padding: '1.5rem',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                  }}
                >
                  
                  {/* Commodity & Locations */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <Package size={20} color="#ffd700" />
                      <strong style={{ fontSize: '1.2rem', color: '#fff' }}>{route.commodity}</strong>
                      <span style={{ fontSize: '0.8rem', background: 'rgba(255,215,0,0.1)', color: '#ffd700', padding: '2px 8px', borderRadius: '12px' }}>
                        {route.units.toLocaleString()} uds ({(route.units / 100).toFixed(2)} SCU)
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#888' }}>Comprar en</span>
                        <span style={{ color: '#fff' }}>{route.buyFrom}</span>
                        <span style={{ color: '#ff4444' }}>{route.buyPrice} aUEC/ud</span>
                      </div>
                      
                      <ArrowRight size={24} color="rgba(255,255,255,0.2)" />
                      
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#888' }}>Vender en</span>
                        <span style={{ color: '#fff' }}>{route.sellTo}</span>
                        <span style={{ color: '#00d2ff' }}>{route.sellPrice} aUEC/ud</span>
                      </div>
                    </div>
                  </div>

                  {/* Profit Math */}
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Inversión: <span style={{ color: '#ff4444' }}>-{route.investment.toLocaleString()} ¤</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Ingresos: <span style={{ color: '#00d2ff' }}>+{route.revenue.toLocaleString()} ¤</span>
                    </div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#00ff00', textShadow: '0 0 10px rgba(0,255,0,0.2)', marginTop: '0.3rem' }}>
                      Beneficio: {route.profit.toLocaleString()} ¤
                    </div>
                  </div>

                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>

    </div>
  );
};

export default RutasComerciales;
