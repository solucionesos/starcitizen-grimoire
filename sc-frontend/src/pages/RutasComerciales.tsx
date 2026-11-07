import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Compass, ShieldAlert, Flame, Layers } from 'lucide-react';
import type { Resource } from '../types';

interface TradeRoute {
  resource: string;
  buyTerminal: string;
  buySystem: string;
  buyPrice: number;
  sellTerminal: string;
  sellSystem: string;
  sellPrice: number;
  profitPerUnit: number;
  roi: number;
}

const RutasComerciales: React.FC = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [scu, setScu] = useState<number>(96); // Taurus / Redeemer / Raft
  const [investment, setInvestment] = useState<number>(500000);
  const [systemFilter, setSystemFilter] = useState<string>('ALL');

  useEffect(() => {
    document.title = 'Vías de Suministro y Tráfico de Ceniza | DATAVELO';
    fetch('/api/resources')
      .then((res) => res.json())
      .then((data) => {
        setResources(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const routes = useMemo(() => {
    const calculatedRoutes: TradeRoute[] = [];

    resources.forEach((res) => {
      if (!res.uex_prices || res.uex_prices.length < 2) return;

      const buyers = res.uex_prices.filter((p: any) => p.price_buy && p.price_buy > 0);
      const sellers = res.uex_prices.filter((p: any) => p.price_sell && p.price_sell > 0);

      buyers.forEach((buy: any) => {
        sellers.forEach((sell: any) => {
          if (buy.terminal_name === sell.terminal_name) return;

          const profit = sell.price_sell - buy.price_buy;
          if (profit > 0) {
            const roi = (profit / buy.price_buy) * 100;
            const buySys = buy.starmap_location?.star_system_name || 'Desconocido';
            const sellSys = sell.starmap_location?.star_system_name || 'Desconocido';

            if (systemFilter !== 'ALL' && buySys !== systemFilter && sellSys !== systemFilter) {
              return;
            }

            calculatedRoutes.push({
              resource: res.name,
              buyTerminal: buy.terminal_name,
              buySystem: buySys,
              buyPrice: buy.price_buy,
              sellTerminal: sell.terminal_name,
              sellSystem: sellSys,
              sellPrice: sell.price_sell,
              profitPerUnit: profit,
              roi,
            });
          }
        });
      });
    });

    return calculatedRoutes.sort((a, b) => b.profitPerUnit - a.profitPerUnit).slice(0, 50);
  }, [resources, systemFilter]);

  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--secondary)', fontFamily: 'var(--cinzel-font)' }}>
        TRAZANDO ARTERIAS DE SUMINISTRO EN LAS FISURAS DEL ORDEN...
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ padding: '0 2rem 4rem', maxWidth: '1300px', margin: '0 auto' }}
    >
      <div style={{ textAlign: 'center', marginBottom: '2.2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', marginBottom: '0.5rem' }}>
          <Compass size={34} color="var(--secondary)" />
          <h1 style={{ fontFamily: 'var(--cinzel-font)', color: 'var(--secondary)', fontSize: '2.2rem', letterSpacing: '5px', margin: 0 }}>
            VÍAS DE SUMINISTRO Y TRÁFICO DE CENIZA
          </h1>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.98rem', maxWidth: '800px', margin: '0 auto' }}>
          La Hermandad no acumula riqueza por vanidad: drena los recursos de <strong>La Gran Mentira</strong> para
          alimentar la Forja Abisal y sostener la maquinaria de guerra de <strong>Ancalagon Oblivion Fleet</strong> en el
          Ciclo 2956.
        </p>
      </div>

      {/* Parámetros del Arca de Transporte */}
      <div
        className="glass-card"
        style={{
          padding: '1.5rem',
          marginBottom: '2rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: '1.2rem',
          borderTop: '3px solid var(--secondary)',
        }}
      >
        <div>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.75rem',
              color: 'var(--secondary)',
              fontFamily: 'var(--cinzel-font)',
              marginBottom: '0.4rem',
            }}
          >
            <Layers size={14} /> CAPACIDAD DE BODEGA DEL ARCA (SCU)
          </label>
          <input
            type="number"
            min={1}
            value={scu}
            onChange={(e) => setScu(Math.max(1, Number(e.target.value)))}
            className="search-input"
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.75rem',
              color: 'var(--secondary)',
              fontFamily: 'var(--cinzel-font)',
              marginBottom: '0.4rem',
            }}
          >
            <Flame size={14} /> FONDO DE GUERRA DISPONIBLE (aUEC)
          </label>
          <input
            type="number"
            min={1000}
            value={investment}
            onChange={(e) => setInvestment(Math.max(0, Number(e.target.value)))}
            className="search-input"
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.75rem',
              color: 'var(--secondary)',
              fontFamily: 'var(--cinzel-font)',
              marginBottom: '0.4rem',
            }}
          >
            <ShieldAlert size={14} /> TEATRO ESTELAR
          </label>
          <select
            value={systemFilter}
            onChange={(e) => setSystemFilter(e.target.value)}
            className="search-input"
            style={{ width: '100%' }}
          >
            <option value="ALL">Todos los Sistemas (Stanton / Pyro / Nyx)</option>
            <option value="Stanton">Stanton (Dominio de Los Custodios)</option>
            <option value="Pyro">Pyro (Fisura de Fuego)</option>
            <option value="Nyx">Nyx (Borde Exterior)</option>
          </select>
        </div>
      </div>

      {/* Lista de Rutas */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {routes.map((r, i) => {
          // Corrección C3: los precios UEX están expresados por SCU directamente (sin multiplicar por 100)
          const maxUnitsByCapital = Math.floor(investment / r.buyPrice);
          const unitsToBuy = Math.min(scu, maxUnitsByCapital);
          const totalCost = unitsToBuy * r.buyPrice;
          const totalProfit = unitsToBuy * r.profitPerUnit;

          if (unitsToBuy <= 0) return null;

          return (
            <div
              key={i}
              className="glass-card"
              style={{
                padding: '1.4rem 1.8rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1.2rem',
                alignItems: 'center',
                borderLeft: '4px solid var(--secondary)',
              }}
            >
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--cinzel-font)', letterSpacing: '1px' }}>
                  OFRENDA / SUMINISTRO
                </span>
                <h3 style={{ margin: '0.2rem 0', color: 'var(--secondary)', fontSize: '1.2rem', fontFamily: 'var(--cinzel-font)' }}>
                  {r.resource}
                </h3>
                <span
                  style={{
                    fontSize: '0.75rem',
                    background: 'rgba(212, 175, 55, 0.12)',
                    color: 'var(--secondary)',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '4px',
                    fontFamily: 'var(--cinzel-font)',
                  }}
                >
                  RENDIMIENTO: +{r.roi.toFixed(1)}%
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', gridColumn: 'span 2' }}>
                <div style={{ flex: 1, background: 'rgba(0,0,0,0.35)', padding: '0.8rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--cinzel-font)' }}>
                    PUNTO DE EXTRACCIÓN ({r.buySystem})
                  </div>
                  <div style={{ fontWeight: 'bold', fontSize: '0.92rem', color: 'var(--text-main)' }}>{r.buyTerminal}</div>
                  <div style={{ color: 'var(--primary)', fontSize: '0.82rem', fontWeight: 'bold' }}>
                    {r.buyPrice.toLocaleString()} aUEC / SCU
                  </div>
                </div>

                <ArrowRight color="var(--secondary)" size={20} style={{ flexShrink: 0 }} />

                <div style={{ flex: 1, background: 'rgba(0,0,0,0.35)', padding: '0.8rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--cinzel-font)' }}>
                    ENTREGA DE TRIBUTO ({r.sellSystem})
                  </div>
                  <div style={{ fontWeight: 'bold', fontSize: '0.92rem', color: 'var(--text-main)' }}>{r.sellTerminal}</div>
                  <div style={{ color: 'var(--secondary)', fontSize: '0.82rem', fontWeight: 'bold' }}>
                    {r.sellPrice.toLocaleString()} aUEC / SCU
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--cinzel-font)' }}>
                  TRIBUTO NETO PARA LA FLOTA
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 'bold', color: 'var(--secondary)', fontFamily: 'var(--cinzel-font)' }}>
                  +{totalProfit.toLocaleString()} aUEC
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Inversión: {totalCost.toLocaleString()} aUEC ({unitsToBuy} SCU)
                </div>
              </div>
            </div>
          );
        })}

        {routes.length === 0 && (
          <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No se hallaron vías de suministro activas con los parámetros indicados.
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default RutasComerciales;
