import React, { useEffect, useId, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { ArrowRight, Compass, ShieldAlert, Flame, Layers } from 'lucide-react';
import { getResources } from '../api/client';
import { TERMINOLOGY } from '../constants/terminology';
import DualLabel from '../components/DualLabel';
import { useToast } from '../components/AbyssalToast';
import type { Resource, UexPrice } from '../types';

type TradeUexPrice = UexPrice & { price_sell?: number | null };

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

const VALID_SYSTEMS = new Set(['ALL', 'Stanton', 'Pyro', 'Nyx']);
const NUM_FMT = new Intl.NumberFormat('es-ES');

function parseSystemFilter(raw: string | null): string {
  if (raw && VALID_SYSTEMS.has(raw)) return raw;
  return 'ALL';
}

const RutasComerciales: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const formId = useId();

  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [scu, setScu] = useState<number>(96);
  const [investment, setInvestment] = useState<number>(500000);

  const systemFilter = parseSystemFilter(searchParams.get('system'));

  const setSystemFilter = (nextSystem: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('system', nextSystem);
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    if (!embedded) {
      document.title = 'Vías de Suministro y Tráfico de Ceniza | DATAVELO';
    }
    let cancelled = false;
    getResources()
      .then((data) => {
        if (!cancelled) {
          setResources(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) {
          showToast('No se pudieron cargar las cotizaciones UEX de recursos.', 'error');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [embedded, showToast]);

  const visibleRoutes = useMemo(() => {
    const calculatedRoutes: Array<
      TradeRoute & { unitsToBuy: number; totalCost: number; totalProfit: number }
    > = [];

    resources.forEach((res) => {
      const prices = res.uex_prices as TradeUexPrice[] | undefined;
      if (!prices || prices.length < 2) return;

      const buyers = prices.filter((p): p is TradeUexPrice & { price_buy: number } => Boolean(p.price_buy && p.price_buy > 0));
      const sellers = prices.filter((p): p is TradeUexPrice & { price_sell: number } => Boolean(p.price_sell && p.price_sell > 0));

      buyers.forEach((buy) => {
        sellers.forEach((sell) => {
          if (buy.terminal_name === sell.terminal_name) return;

          const profit = sell.price_sell - buy.price_buy;
          if (profit <= 0) return;

          const maxUnitsByCapital = Math.floor(investment / buy.price_buy);
          const unitsToBuy = Math.min(scu, maxUnitsByCapital);
          if (unitsToBuy <= 0) return;

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
            roi: (profit / buy.price_buy) * 100,
            unitsToBuy,
            totalCost: unitsToBuy * buy.price_buy,
            totalProfit: unitsToBuy * profit,
          });
        });
      });
    });

    return calculatedRoutes.sort((a, b) => b.profitPerUnit - a.profitPerUnit).slice(0, 50);
  }, [resources, systemFilter, scu, investment]);

  const HeadingTag = embedded ? 'h2' : 'h1';
  const SectionHeadingTag = embedded ? 'h3' : 'h2';
  const CardHeadingTag = embedded ? 'h4' : 'h3';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ padding: '0 2rem 4rem', maxWidth: '1300px', margin: '0 auto' }}
    >
      <div style={{ textAlign: 'center', marginBottom: '2.2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
          <Compass size={32} color="var(--secondary)" aria-hidden="true" />
          <HeadingTag style={{ margin: 0 }}>
            <DualLabel
              sacred={TERMINOLOGY.comercio.sacred.toUpperCase()}
              tactical={TERMINOLOGY.comercio.tactical}
              size={embedded ? 'md' : 'lg'}
              align="center"
              sacredColor="var(--secondary)"
            />
          </HeadingTag>
        </div>
        <p className="prose-grimoire" style={{ color: 'var(--text-muted)', fontSize: '0.98rem', margin: '0 auto' }}>
          La Hermandad no acumula riqueza por vanidad: drena los recursos de <strong>La Gran Mentira</strong> para
          alimentar la Forja Abisal y sostener la maquinaria de guerra de <strong>Ancalagon Oblivion Fleet</strong> en el
          Ciclo 2956.
        </p>
      </div>

      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--secondary)', fontFamily: 'var(--cinzel-font)' }}>
          <SectionHeadingTag style={{ margin: 0, fontSize: '0.9rem', fontWeight: 400, letterSpacing: '3px', color: 'var(--secondary)' }}>
            TRAZANDO ARTERIAS DE SUMINISTRO EN LAS FISURAS DEL ORDEN…
          </SectionHeadingTag>
        </div>
      ) : (
        <>

      {/* Parámetros del Arca de Transporte */}
      <div
        className="surface-monolith"
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
            htmlFor={`${formId}-scu`}
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
            <Layers size={14} aria-hidden="true" /> CAPACIDAD DE BODEGA DEL ARCA (SCU)
          </label>
          <input
            id={`${formId}-scu`}
            name="scuCapacity"
            type="number"
            inputMode="numeric"
            min={1}
            value={scu}
            onChange={(e) => setScu(Math.max(1, Number(e.target.value) || 1))}
            className="search-input tabular-nums"
          />
        </div>

        <div>
          <label
            htmlFor={`${formId}-investment`}
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
            <Flame size={14} aria-hidden="true" /> FONDO DE GUERRA DISPONIBLE (aUEC)
          </label>
          <input
            id={`${formId}-investment`}
            name="investmentCapital"
            type="number"
            inputMode="numeric"
            min={0}
            value={investment}
            onChange={(e) => setInvestment(Math.max(0, Number(e.target.value) || 0))}
            className="search-input tabular-nums"
          />
        </div>

        <div>
          <label
            htmlFor={`${formId}-system`}
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
            <ShieldAlert size={14} aria-hidden="true" /> TEATRO ESTELAR
          </label>
          <select
            id={`${formId}-system`}
            name="starSystem"
            value={systemFilter}
            onChange={(e) => setSystemFilter(e.target.value)}
            className="select-filter"
          >
            <option value="ALL">Todos los Sistemas (Stanton / Pyro / Nyx)</option>
            <option value="Stanton">Stanton (Dominio de Los Custodios)</option>
            <option value="Pyro">Pyro (Fisura de Fuego)</option>
            <option value="Nyx">Nyx (Borde Exterior)</option>
          </select>
        </div>
      </div>

      {/* Lista de Rutas */}
      <SectionHeadingTag
        className="tabular-nums"
        style={{
          fontSize: '0.82rem',
          color: 'var(--secondary)',
          fontFamily: 'var(--cinzel-font)',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          margin: '0 0 1rem',
        }}
      >
        ARTERIAS DE SUMINISTRO ACTIVAS ({visibleRoutes.length})
      </SectionHeadingTag>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {visibleRoutes.map((r, i) => (
          <div
            key={`${r.resource}-${r.buyTerminal}-${r.sellTerminal}-${i}`}
            className="surface-monolith"
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
              <CardHeadingTag style={{ margin: '0.2rem 0', color: 'var(--secondary)', fontSize: '1.15rem', fontFamily: 'var(--cinzel-font)', textTransform: 'uppercase', letterSpacing: '3px' }}>
                {r.resource}
              </CardHeadingTag>
              <span
                className="tabular-nums"
                style={{
                  fontSize: '0.75rem',
                  background: 'rgba(212, 175, 55, 0.12)',
                  color: 'var(--secondary)',
                  border: '1px solid rgba(212, 175, 55, 0.3)',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '4px',
                  fontFamily: 'var(--cinzel-font)',
                  display: 'inline-block',
                }}
              >
                RENDIMIENTO: +{r.roi.toFixed(1)}%
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 160px', background: 'rgba(0,0,0,0.35)', padding: '0.8rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--cinzel-font)' }}>
                  PUNTO DE EXTRACCIÓN ({r.buySystem})
                </div>
                <div style={{ fontWeight: 'bold', fontSize: '0.92rem', color: 'var(--text-main)' }}>{r.buyTerminal}</div>
                <div className="tabular-nums" style={{ color: 'var(--primary)', fontSize: '0.82rem', fontWeight: 'bold' }}>
                  {NUM_FMT.format(r.buyPrice)} aUEC / SCU
                </div>
              </div>

              <ArrowRight color="var(--secondary)" size={20} aria-hidden="true" style={{ flexShrink: 0 }} />

              <div style={{ flex: '1 1 160px', background: 'rgba(0,0,0,0.35)', padding: '0.8rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--cinzel-font)' }}>
                  ENTREGA DE TRIBUTO ({r.sellSystem})
                </div>
                <div style={{ fontWeight: 'bold', fontSize: '0.92rem', color: 'var(--text-main)' }}>{r.sellTerminal}</div>
                <div className="tabular-nums" style={{ color: 'var(--secondary)', fontSize: '0.82rem', fontWeight: 'bold' }}>
                  {NUM_FMT.format(r.sellPrice)} aUEC / SCU
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--cinzel-font)' }}>
                TRIBUTO NETO PARA LA FLOTA
              </div>
              <div className="tabular-nums" style={{ fontSize: '1.35rem', fontWeight: 'bold', color: 'var(--secondary)', fontFamily: 'var(--cinzel-font)' }}>
                +{NUM_FMT.format(r.totalProfit)} aUEC
              </div>
              <div className="tabular-nums" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Inversión: {NUM_FMT.format(r.totalCost)} aUEC ({NUM_FMT.format(r.unitsToBuy)} SCU)
              </div>
            </div>
          </div>
        ))}

        {visibleRoutes.length === 0 && (
          <div className="surface-monolith" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No se hallaron vías de suministro activas con los parámetros indicados.
          </div>
        )}
      </div>
        </>
      )}
    </motion.div>
  );
};

export default RutasComerciales;
