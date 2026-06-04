/**
 * RAYOCERO — LAZY ROUTE MAP WRAPPER
 * Carga RouteMapStrava + Leaflet solo cuando se necesita
 * Evita cargar ~200kb de Leaflet en páginas que no tienen mapa
 */

import { lazy, Suspense } from 'react';
import type { GeoPoint } from './RouteMapStrava';

const RouteMapStrava = lazy(() => import('./RouteMapStrava'));

interface Props {
  points: GeoPoint[];
  athleteName?: string;
  eventName?: string;
  showShareCard?: boolean;
  live?: boolean;
}

const MapSkeleton = () => (
  <div style={{
    height: 320,
    background: 'rgba(5,13,22,0.8)',
    borderRadius: 20,
    border: '1px solid rgba(0,242,255,0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  }}>
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 12,
    }}>
      <div style={{
        width: 32,
        height: 32,
        border: '2px solid rgba(0,242,255,0.15)',
        borderTopColor: '#00f2ff',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <span style={{
        fontSize: 9,
        color: 'rgba(0,242,255,0.4)',
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        fontFamily: "'Barlow Condensed', sans-serif",
        fontStyle: 'italic',
        fontWeight: 700,
      }}>
        Cargando mapa...
      </span>
    </div>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

export default function LazyRouteMapStrava(props: Props) {
  return (
    <Suspense fallback={<MapSkeleton />}>
      <RouteMapStrava {...props} />
    </Suspense>
  );
}

export type { GeoPoint };