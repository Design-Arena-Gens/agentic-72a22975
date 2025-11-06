"use client";

import { useEffect, useMemo, useState } from 'react';

type ApiItem = {
  ticker: string;
  name: string;
  segment: 'Log?stica';
  price: number | null;
  currency: string | null;
  ltmDividends: number | null;
  ltmYield: number | null;
  selic: number;
  riskPremium: number;
  discountRate: number;
  priceCeiling: number | null;
  upsideToCeilingPct: number | null;
  status: 'Abaixo do teto' | 'Acima do teto' | 'Indefinido';
  updatedAt: string;
};

function formatBRL(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return '-';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 });
}

function formatPct(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return '-';
  return (n * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + '%';
}

export default function Page() {
  const [riskPremium, setRiskPremium] = useState<number>(0.03);
  const [data, setData] = useState<{ selic: number; items: ApiItem[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const discountRate = useMemo(() => (data ? data.selic + riskPremium : null), [data, riskPremium]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/fiis?riskPremium=${riskPremium}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Falha ao carregar dados');
      const json = await res.json();

      // Enriquecer client-side para casos em que o server n?o conseguiu pre?o/dividendo
      const items = await Promise.all(
        (json.items as ApiItem[]).map(async (it: ApiItem) => {
          if (it.price != null && it.ltmDividends != null) return it;
          try {
            const extra = await fetch(`https://brapi.dev/api/quote/${encodeURIComponent(it.ticker)}?range=5y&interval=1d&fundamental=true&dividends=true`, { cache: 'no-store' });
            if (!extra.ok) return it;
            const ej = await extra.json();
            const r = ej?.results?.[0] ?? {};
            const price: number | null = Number.isFinite(r?.regularMarketPrice) ? r.regularMarketPrice : it.price;
            const divs = r?.dividends ?? r?.dividendsData?.cashDividends ?? [];
            const now = Date.now();
            const oneYear = 365 * 24 * 3600 * 1000;
            let ltm = 0; let any = false;
            for (const d of divs) {
              const dateStr: string | undefined = d?.date || d?.paymentDate || d?.approvedOn || d?.exDate;
              const val: number | undefined = d?.value ?? d?.cashDividend ?? d?.amount;
              if (!dateStr || !Number.isFinite(val as any)) continue;
              const ts = new Date(dateStr).getTime();
              if (now - ts <= oneYear) { ltm += Number(val); any = true; }
            }
            if (!any && Number.isFinite(r?.dividendYield) && price) { ltm = (r.dividendYield / 100) * price; any = true; }
            const ltmDividends = any ? ltm : it.ltmDividends;
            const priceCeiling = ltmDividends && json.selic + riskPremium > 0 ? ltmDividends / (json.selic + riskPremium) : it.priceCeiling;
            const upsideToCeilingPct = priceCeiling && price ? priceCeiling / price - 1 : it.upsideToCeilingPct;
            const ltmYield = ltmDividends && price ? ltmDividends / price : it.ltmYield;
            const status = priceCeiling && price ? (price <= priceCeiling ? 'Abaixo do teto' : 'Acima do teto') : it.status;
            return { ...it, price, ltmDividends, ltmYield, priceCeiling, upsideToCeilingPct, status };
          } catch {
            return it;
          }
        })
      );

      setData({ selic: json.selic, items });
    } catch (e: any) {
      setError(e?.message || 'Erro inesperado');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riskPremium]);

  return (
    <div>
      <div className="controls">
        <label>Pr?mio de risco anual:</label>
        <input
          type="range"
          min={0}
          max={0.06}
          step={0.005}
          value={riskPremium}
          onChange={(e) => setRiskPremium(parseFloat(e.target.value))}
        />
        <strong>{formatPct(riskPremium)}</strong>
        <button className="refresh" onClick={load} disabled={loading}>
          {loading ? 'Atualizando?' : 'Atualizar agora'}
        </button>
        {data && (
          <span className="small">SELIC: {formatPct(data.selic)} | Taxa de desconto: {discountRate != null ? formatPct(discountRate) : '-'}</span>
        )}
      </div>

      {error && <div style={{ color: '#b91c1c', marginBottom: 12 }}>{error}</div>}

      <table className="table">
        <thead>
          <tr>
            <th>Ticker</th>
            <th>Nome</th>
            <th>Pre?o atual</th>
            <th>Dividendos 12m</th>
            <th>DY 12m</th>
            <th>Pre?o teto</th>
            <th>Upside vs teto</th>
            <th>Status</th>
            <th>Atualizado</th>
          </tr>
        </thead>
        <tbody>
          {(data?.items ?? []).map((item) => (
            <tr key={item.ticker}>
              <td><strong>{item.ticker}</strong></td>
              <td>{item.name}</td>
              <td>{formatBRL(item.price)}</td>
              <td>{formatBRL(item.ltmDividends)}</td>
              <td>{formatPct(item.ltmYield)}</td>
              <td>{formatBRL(item.priceCeiling)}</td>
              <td>{item.upsideToCeilingPct != null ? (item.upsideToCeilingPct * 100).toFixed(1) + '%' : '-'}</td>
              <td>
                {item.status === 'Abaixo do teto' ? (
                  <span className="badge green">Abaixo do teto</span>
                ) : item.status === 'Acima do teto' ? (
                  <span className="badge red">Acima do teto</span>
                ) : (
                  <span className="badge">Indefinido</span>
                )}
              </td>
              <td className="small">{new Date(item.updatedAt).toLocaleString('pt-BR')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
