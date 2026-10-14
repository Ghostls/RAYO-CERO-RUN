/**
 * RAYOCERO — CANINATA CLIENT DASHBOARD (V1.4 — EVOLUCIÓN LIQUID GLASS + RACE CONTROL)
 * Senior Dev: MIA (Valkyron Group)
 * CEO: Lualdo Sciscioli
 * REGLA DE ORO: Evolución sin Destrucción. Código completo. Copy-paste ready.
 *
 * CHANGELOG V1.5 (evolución de V1.4, Dirección de carrera):
 * [V1.5-1] Reinicio de pruebas exclusivamente desde Dirección de Carrera.
 * [V1.5-2] Vista previa, doble confirmación, respaldo transaccional en servidor.
 * [V1.5-3] No reinicia una carrera en marcha; requiere cerrar la prueba.
 * [V1.5-4] Detección de cambio de salida y limpieza de colas locales obsoletas.
 * [V1.5-5] Panel de Dirección responsive Liquid Glass, sin modificar otros módulos.
 * REQUIERE: instalar 20261014_caninata_timing_reset.sql una sola vez.
 *
 * CHANGELOG V1.4 (evolución sobre V1.3 SIN ELIMINAR FUNCIONES):
 * [V1.4-1] Diseño responsive Liquid Glass encapsulado en este archivo.
 * [V1.4-2] Pestaña Cronometraje aislada (RACE CONTROL: reloj maestro, KM5, meta).
 * [V1.4-3] Diseño móvil con tabla horizontal y controles de tamaño táctil.
 * [V1.4-4] Conserva componentes, endpoints, búsqueda de comprobantes y estado.
 * [V1.4-5] Cronometraje requiere migración SQL aparte y cuentas individuales Auth.
 *
 * CHANGELOG V1.3 (evoluciona sobre V1.2):
 * [V1.3-1] Atleta + referencia_pago, comprobante_url, comprobante_path.
 *          fetchAtletas usa select("*") — el SELECT explícito de V1.2 rompía
 *          la carga completa si alguna columna opcional no existía.
 * [V1.3-2] resolveComprobanteCaninata(): resolver multi-capa AISLADO a la caninata:
 *            Capa 1 — ruta registrada en el runner (verificada contra storage).
 *            Capa 2 — carpetas de la caninata (slug de la carrera, caninata/).
 *            Capa 3 — raíz del bucket (fallback, marcado para verificación).
 *          NO escanea carpetas de otras carreras (coro-499/, lara/, ...), así un
 *          atleta inscrito en varias carreras no muestra el comprobante equivocado.
 *          Desempate temporal: gana el archivo con menor |file.created_at − runner.created_at|.
 * [V1.3-3] Cache de listados de storage por prefijo (TTL 60 s) + re-escaneo forzado.
 * [V1.3-4] ComprobanteModal (portal): imagen o PDF, origen del comprobante,
 *          delta temporal, toggles pago/kit, abrir original, cerrar con Esc.
 * [V1.3-5] Guardia anti-race-condition: requestId descarta respuestas de
 *          inspecciones previas (cambio rápido entre atletas / cierre del modal).
 * [V1.3-6] togglePago()/toggleKit() retornan Promise<boolean> (éxito/fallo)
 *          para que la pestaña de entrega reporte el resultado real.
 * [V1.3-7] Pestaña "Entrega Kits": búsqueda por dorsal sobre el estado local,
 *          detección de dorsal duplicado, alerta si el pago no está verificado,
 *          confirmar / revertir con toggleKit (contadores siempre sincronizados).
 * [V1.3-8] Columna "Comprobante" en la tabla (VER / ADMIN / GRATIS).
 *
 * CHANGELOG V1.2:
 * [V1.2-1] togglePago() — verifica/desverifica pago desde el dashboard cliente.
 * [V1.2-2] toggleKit()  — marca/desmarca kit entregado desde el dashboard cliente.
 * [V1.2-3] Botones inline en tabla con feedback visual inmediato.
 * [V1.2-4] Estado optimista — UI actualiza antes de confirmar Supabase.
 *
 * CHANGELOG V1.1:
 * [V1.1-1] Columna Teléfono añadida.
 *
 * CHANGELOG V1.0:
 * [V1.0-1] PIN gate — CANINATA2026, persiste en localStorage.
 * [V1.0-2] Carga automática de la carrera caninata activa.
 * [V1.0-3] Tabla atletas, TasaConfig, buscador, contadores.
 */

import { useState, useEffect, useMemo, useCallback, useRef } from "react"; // [V1.3] + useRef
import { createPortal } from "react-dom";                                    // [V1.3-4]
import { supabase } from "@/lib/supabase";
import {
  Dog, LogOut, Search, ShieldCheck, RefreshCw,
  Save, CheckCircle, Users, AlertCircle, Loader2,
  Eye, EyeOff, Lock, Phone, Gift, Shield,
  X, FileText, ExternalLink, ShieldAlert, Package, AlertTriangle, // [V1.3]
  Activity, ArrowRight, Check, CheckCircle2, Clock3, Flag, Gauge,
  LockKeyhole, Smartphone, Timer, Wifi, WifiOff, Zap, RotateCcw, Archive,
} from "lucide-react";

// [V1.4] Autocontenido: ningún import CSS adicional, no afecta otros módulos.
const CANINATA_GLASS_STYLES = String.raw`/* RAYOCERO | LIQUID GLASS UI — scoped to rc-*, no global Tailwind reset */
.rc-glass-page {
  --rc-yellow: #fdd454;
  --rc-lime: #d9fc6b;
  --rc-ink: #070c09;
  --rc-text: #f7faf7;
  --rc-muted: rgba(241, 250, 239, .49);
  --rc-stroke: rgba(255, 255, 255, .105);
  --rc-glass: rgba(17, 26, 20, .58);
  min-height: 100vh;
  width: 100%;
  color: var(--rc-text);
  background:
    radial-gradient(ellipse 65% 32% at 90% -3%, rgba(217, 252, 107, .12), transparent 70%),
    radial-gradient(ellipse 40% 35% at 4% 55%, rgba(253, 212, 84, .07), transparent 80%),
    linear-gradient(157deg, #101710, #070b09 40%, #0a100c);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  position: relative;
  isolation: isolate;
  overflow-x: clip;
  font-feature-settings: "tnum";
}
.rc-glass-page *, .rc-glass-page *::before, .rc-glass-page *::after { box-sizing: border-box; }
.rc-glass-page::before { content: ""; pointer-events: none; position: fixed; inset: 0; z-index: -1; opacity: .28; background-image: linear-gradient(rgba(255,255,255,.027) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.027) 1px,transparent 1px); background-size: 36px 36px; mask-image: linear-gradient(to bottom, black, transparent 96%); }
.rc-glass {
  background: var(--rc-glass);
  border: 1px solid var(--rc-stroke);
  box-shadow: 0 12px 44px rgba(0, 0, 0, .26), inset 0 1px 0 rgba(255, 255, 255, .10), inset 0 -1px 0 rgba(255, 255, 255, .025);
  backdrop-filter: blur(24px) saturate(145%);
  -webkit-backdrop-filter: blur(24px) saturate(145%);
  border-radius: 24px;
}
.rc-glass-shell { max-width: 1540px; margin: auto; }
.rc-topbar { border-radius: 0 0 24px 24px; border-top: 0; padding: 15px clamp(14px,3vw,40px); display: flex; justify-content: space-between; align-items: center; gap: 16px; position: sticky; top: 0; z-index: 30; background: rgba(11,17,13,.82); }
.rc-brand { display: flex; align-items: center; gap: 12px; min-width: 0; }
.rc-brand strong { display: block; font-size: 14px; letter-spacing: .045em; white-space: nowrap; }
.rc-brand strong span { color: var(--rc-yellow); }
.rc-brand small { display: block; margin-top: 5px; color: var(--rc-muted); font-size: 9px; letter-spacing: .19em; }
.rc-brand-icon { width: 60px; height: 60px; flex: 0 0 auto; color: var(--rc-yellow); display: grid; place-items: center; background: linear-gradient(140deg,rgba(253,212,84,.22),rgba(255,255,255,.03)); border: 1px solid rgba(253,212,84,.27); border-radius: 19px; box-shadow: inset 0 1px 0 rgba(255,255,255,.14); }
.rc-brand-icon.small { width: 42px; height: 42px; border-radius: 13px; }
.rc-top-actions { display:flex; align-items:center; gap: 12px; }
.rc-status { display: inline-flex; align-items: center; gap: 8px; font-size: 10px; letter-spacing: .12em; font-weight: 900; color: rgba(255,255,255,.64); }
.rc-status.live { color: #d8ff84; }
.rc-dot { height: 8px; width: 8px; display: inline-block; background: #758b70; border-radius: 50%; }
.rc-status.live .rc-dot { background: #d8ff84; box-shadow: 0 0 0 5px rgba(216,255,132,.08), 0 0 15px #d8ff84; animation: rc-pulse 1.8s ease-in-out infinite; }
.rc-connection { color: #94dfa4; display:flex; align-items:center; gap:6px; font-size: 11px; }
.rc-connection.offline { color: #fdad73; }
.rc-icon-btn, .rc-modal-head button, .rc-alert button { color:var(--rc-muted); border:1px solid var(--rc-stroke); border-radius: 12px; background: rgba(255,255,255,.035); padding: 10px; display: inline-flex; align-items:center; justify-content:center; cursor:pointer; }
.rc-main { max-width: 1320px; margin: auto; padding: clamp(18px,3vw,38px); }
.rc-section-heading { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin: 12px 0 27px; }
.rc-eyebrow { display:flex; align-items:center; gap:8px; color:var(--rc-yellow); font-size:10px; font-weight:900; letter-spacing: .2em; margin: 0 0 13px; }
.rc-section-heading h1 { font-weight: 800; font-size: clamp(29px,3.5vw,47px); letter-spacing:-.06em; line-height: 1.1; margin: 0 0 12px; }
.rc-section-heading h1 span { color: var(--rc-yellow); }
.rc-muted { color: var(--rc-muted); font-size: 12px; margin: 0; line-height:1.65; }
.rc-header-badge { color: var(--rc-yellow); display: flex; align-items: center; gap: 9px; font-size: 11px; font-weight:800; padding: 13px 18px; background:rgba(253,212,84,.065); border:1px solid rgba(253,212,84,.18); border-radius: 99px; white-space: nowrap; }
.rc-clock-grid { display: grid; grid-template-columns: minmax(0, 1.48fr) minmax(0, 1fr); gap: 16px; margin-bottom: 16px; }
.rc-clock-panel { display:flex; flex-direction:column; justify-content:space-between; min-width:0; padding: clamp(18px,2.4vw,30px); background: linear-gradient(130deg,rgba(29,40,29,.80),rgba(10,17,11,.68)); }
.rc-card-head { display:flex; justify-content: space-between; gap: 16px; align-items:center; flex-wrap:wrap; font-size:10px; font-weight:800; color:rgba(255,255,255,.47); letter-spacing:.12em; }
.rc-card-head span { display:inline-flex; align-items:center; gap:7px; }
.rc-card-head > span:first-child { color:var(--rc-yellow); }
.rc-mono { font-variant-numeric: tabular-nums; font-family:ui-monospace,SFMono-Regular,Consolas,monospace; }
.rc-primary-time { font-size: clamp(32px, 5.1vw, 69px); letter-spacing: -.075em; font-weight: 850; line-height: 1.3; padding: 25px 0 18px; color:#fafcf5; font-variant-numeric: tabular-nums; font-family: ui-monospace, "SFMono-Regular", Consolas, monospace; white-space: nowrap; text-shadow: 0 0 35px rgba(253,212,84,.09); }
.rc-clock-footer { display:flex; justify-content:space-between; flex-wrap:wrap; gap:12px; font-size:11px; color:var(--rc-muted); }
.rc-clock-footer span { display:flex; align-items:center; gap:8px; }
.rc-clock-controls { padding-top:22px; margin-top:18px; border-top:1px solid var(--rc-stroke); }
.rc-clock-controls .rc-btn { width:100%; }
.rc-stat-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; }
.rc-stat { padding: 18px 20px; display:flex; flex-direction:column; justify-content:space-between; gap:9px; min-width:0; }
.rc-stat > span { color:var(--rc-muted); font-size: 10px; font-weight:850; letter-spacing:.13em; }
.rc-stat strong { font-size: clamp(26px,2.5vw,39px); line-height:1; letter-spacing:-.06em; }
.rc-stat small { font-size:11px; color:rgba(255,255,255,.33); }
.rc-stat .rc-warning { color:#ffc48a; }
.rc-btn { display:inline-flex; justify-content:center; align-items:center; gap:10px; min-height:45px; border-radius:13px; padding:12px 18px; font-size:11px; font-weight:900; text-transform:uppercase; letter-spacing:.075em; border:1px solid transparent; cursor:pointer; transition:transform .15s ease, filter .15s ease, background .15s ease; white-space:nowrap; }
.rc-btn:hover:not(:disabled) { transform:translateY(-1px); filter:brightness(1.06); }
.rc-btn:active:not(:disabled) { transform:translateY(1px); }
.rc-btn:disabled { opacity:.44; cursor:not-allowed; }
.rc-btn-primary { background:linear-gradient(110deg,var(--rc-yellow),var(--rc-lime)); box-shadow: 0 10px 26px rgba(253,212,84,.11), inset 0 1px 0 rgba(255,255,255,.42); color:#142014; }
.rc-btn-dark, .rc-btn-subtle { color:#f4f8f3; border-color:var(--rc-stroke); background:rgba(255,255,255,.07); }
.rc-btn-subtle { font-size:10px; min-height:39px; padding:10px 13px; }
.rc-settings { margin-bottom:16px; padding:20px 24px; display:flex; align-items:center; justify-content:space-between; gap:22px; }
.rc-settings h2 { margin:0 0 7px; font-size:14px; }
.rc-settings p { margin:0; max-width:780px; font-size:11px; color:var(--rc-muted); line-height:1.6; }
.rc-toggle { display:flex; align-items:center; gap:8px; font-size:11px; cursor:pointer; }
.rc-toggle input { position:absolute; opacity:0; width:1px; height:1px; }
.rc-toggle span { display:block; width:53px; height:29px; border:1px solid var(--rc-stroke); background:#333c33; border-radius:99px; position:relative; transition:background .2s; }
.rc-toggle span:after { content:""; display:block; width:21px; height:21px; border-radius:50%; background:#e9f0e6; position:absolute; top:3px; left:3px; transition:transform .2s; }
.rc-toggle input:checked+span { background:#afce5c; }
.rc-toggle input:checked+span:after { transform:translateX(23px); background:#172514; }
.rc-toggle input:disabled+span { opacity:.5; }
.rc-capture { margin-bottom:16px; padding:clamp(17px,2.5vw,30px); }
.rc-capture-heading { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; gap:20px; }
.rc-capture-heading h2 { font-size: clamp(26px,2.5vw,36px); font-weight:800; letter-spacing:-.05em; margin:0 0 8px; }
.rc-point-icon { border-radius:21px; color:var(--rc-yellow); font-weight:800; font-size:27px; width:71px; height:71px; background:rgba(253,212,84,.075); border:1px solid rgba(253,212,84,.24); display:grid; place-items:center; flex:0 0 auto; }
.rc-capture-form label { display:block; margin-bottom:10px; font-size:10px; letter-spacing:.16em; font-weight:800; color:var(--rc-yellow); }
.rc-entry-row { display:flex; gap:12px; }
.rc-entry-row input { min-width:0; flex:1; padding:15px 21px; color:#fff; font-weight:850; font-size:clamp(23px,3vw,36px); letter-spacing:.08em; font-variant-numeric:tabular-nums; background:rgba(255,255,255,.045); border:1px solid rgba(253,212,84,.22); border-radius:15px; outline:none; }
.rc-entry-row input:focus { border-color:var(--rc-yellow); box-shadow:0 0 0 3px rgba(253,212,84,.1); }
.rc-entry-row input::placeholder { color:rgba(255,255,255,.14); }
.rc-entry-row .rc-btn { padding-left:28px; padding-right:28px; }
.rc-operation-hint { font-size:11px; color:var(--rc-muted); margin-top:14px; display:flex; align-items:center; gap:9px; flex-wrap:wrap; }
.rc-table-card { overflow:hidden; margin-bottom:20px; }
.rc-table-head { padding:23px 25px 14px; display:flex; align-items:center; justify-content:space-between; gap:12px; }
.rc-table-head h2 { font-size:18px; margin:0; letter-spacing:-.04em; }
.rc-table-head .rc-eyebrow { margin-bottom:7px; }
.rc-table-scroll { overflow-x:auto; }
.rc-table { width:100%; min-width:720px; border-collapse:collapse; text-align:left; }
.rc-table th { background:rgba(255,255,255,.025); color:rgba(255,255,255,.42); font-size:10px; letter-spacing:.095em; font-weight:800; text-transform:uppercase; padding:15px 18px; white-space:nowrap; }
.rc-table td { font-size:12px; color:rgba(255,255,255,.75); padding:13px 18px; border-top:1px solid rgba(255,255,255,.055); white-space:nowrap; }
.rc-table tbody tr:hover { background:rgba(255,255,255,.035); }
.rc-bib { font-size:15px; color:var(--rc-yellow); }
.rc-chip { padding:5px 9px; color:#d5efc5; font-weight:800; font-size:10px; background:rgba(182,248,129,.08); border-radius:9px; border:1px solid rgba(182,248,129,.13); }
.rc-time-cell { color:#f5f7ed!important; font-weight:800; letter-spacing:.025em; font-family:ui-monospace,SFMono-Regular,Consolas,monospace; font-variant-numeric:tabular-nums; }
.rc-mark-status { font-size:10px; font-weight:800; padding:5px 10px; border-radius:30px; display:inline-flex; }
.rc-mark-status.confirmed { background:rgba(128,230,143,.12); color:#a0eb9c; }
.rc-mark-status.review { background:rgba(250,185,98,.15); color:#ffd099; }
.rc-text-button { color:var(--rc-yellow); background:transparent; padding:3px 4px; border:0; cursor:pointer; font-size:11px; font-weight:750; }
.rc-empty-cell { text-align:center; color:var(--rc-muted)!important; padding:30px!important; }
.rc-table-foot { color:var(--rc-muted); font-size:10px; padding:14px 24px; border-top:1px solid var(--rc-stroke); }
.rc-footer { text-align:center; margin:25px 0 12px; font-size:9px; letter-spacing:.13em; color:rgba(255,255,255,.26); }
.rc-footer span { color:var(--rc-yellow); margin:0 8px; }
.rc-alert { border-radius:13px; padding:13px 15px; display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:15px; color:#f8d0b1; background:rgba(252,153,72,.09); border:1px solid rgba(252,153,72,.21); font-size:12px; }
.rc-alert.ok { background:rgba(131,232,155,.08); border-color:rgba(131,232,155,.2); color:#bff6bc; }
.rc-alert.warn { background:rgba(253,212,84,.085); border-color:rgba(253,212,84,.22); color:#f7dc8e; }
.rc-alert button { border:0; background:transparent; padding:0; color:inherit; }
.rc-timing-center { display:flex; min-height:100vh; align-items:center; justify-content:center; padding:18px; }
.rc-login-card { width:min(100%,430px); padding:clamp(22px,4vw,36px); }
.rc-login-card .rc-brand-icon { margin:0 0 20px; }
.rc-heading { font-size:clamp(29px,5vw,42px); margin:0 0 8px; line-height:1; letter-spacing:-.065em; font-weight:900; }
.rc-heading span { color:var(--rc-yellow); }
.rc-form-stack { display:flex; flex-direction:column; gap:16px; margin-top:29px; }
.rc-form-stack label, .rc-modal label { display:flex; flex-direction:column; gap:9px; font-weight:800; font-size:11px; color:rgba(255,255,255,.75); }
.rc-form-stack input, .rc-modal input { width:100%; background:rgba(255,255,255,.045); border:1px solid var(--rc-stroke); padding:14px 13px; color:#fff; font-size:13px; border-radius:12px; outline:none; color-scheme: dark; }
.rc-form-stack input:focus, .rc-modal input:focus { border-color:var(--rc-yellow); }
.rc-form-stack .rc-btn { width:100%; }
.rc-tiny { font-size:10px; color:var(--rc-muted); margin:18px 0 0; text-align:center; }
.rc-empty { padding:25px; display:flex; align-items:center; gap:12px; }
.rc-spin { animation:rc-rotate 1s linear infinite; }
.rc-modal-backdrop { position:fixed; inset:0; z-index:80; background:rgba(0,0,0,.82); display:flex; align-items:center; justify-content:center; padding:15px; }
.rc-modal { width:min(100%,510px); padding:26px; display:flex; flex-direction:column; gap:19px; }
.rc-modal-head { display:flex; align-items:center; justify-content:space-between; }
.rc-modal-head h2 { font-size:18px; margin:0; }
.rc-modal > p { font-size:12px; color:var(--rc-muted); margin:0; }
.rc-modal .rc-btn { width:100%; }
@keyframes rc-pulse { 50% { opacity:.65; } }
@keyframes rc-rotate { to { transform:rotate(360deg); } }
@media (max-width: 1000px) {
  .rc-clock-grid { grid-template-columns:1fr; }
  .rc-clock-panel { min-height:210px; }
  .rc-stat-grid { grid-template-columns:repeat(4,minmax(0,1fr)); }
}
@media (max-width: 700px) {
  .rc-topbar { border-radius:0 0 19px 19px; }
  .rc-brand strong { font-size:12px; }
  .rc-brand strong span { display:block; }
  .rc-brand small { display:none; }
  .rc-top-actions { gap:7px; }
  .rc-connection span { display:none; }
  .rc-header-badge { display:none; }
  .rc-clock-grid, .rc-stat-grid { gap:10px; }
  .rc-stat-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .rc-stat { padding:17px; }
  .rc-settings { align-items:flex-start; }
  .rc-entry-row { flex-direction:column; }
  .rc-entry-row .rc-btn { min-height:60px; font-size:13px; }
  .rc-entry-row input { min-height:77px; text-align:center; }
  .rc-card-head { font-size:9px; }
  .rc-primary-time { font-size:clamp(26px,7.25vw,50px); letter-spacing:-.09em; }
  .rc-section-heading { margin-top:3px; }
  .rc-table-head { padding:18px; }
}
@media (max-width:380px) {
  .rc-main { padding:15px 11px; }
  .rc-brand-icon.small { height:36px; width:36px; }
  .rc-brand strong { font-size:10px; }
  .rc-status { font-size:9px; }
  .rc-connection { display:none; }
  .rc-clock-panel { padding:17px 14px; }
  .rc-primary-time { font-size:clamp(24px,7vw,32px); }
  .rc-settings { flex-direction:column; }
}
@media (prefers-reduced-motion:reduce) { .rc-glass-page *, .rc-glass-page *::before, .rc-glass-page *::after { animation-duration:.01ms!important; transition-duration:.01ms!important; } }
.rc-modal-backdrop {
  --rc-yellow:#fdd454; --rc-lime:#d9fc6b; --rc-text:#f7faf7;
  --rc-muted:rgba(241,250,239,.49); --rc-stroke:rgba(255,255,255,.105);
  --rc-glass:rgba(17,26,20,.91); color:var(--rc-text);
  font-family:Inter,ui-sans-serif,system-ui,sans-serif;
}
/* Fast-tap: primer toque registra el tiempo, dorsal después. */
.rc-capture-modes { display:flex;gap:8px;flex-wrap:wrap;margin:0 0 20px; }
.rc-capture-modes button { background:rgba(255,255,255,.045);border:1px solid var(--rc-stroke);color:var(--rc-muted);padding:10px 15px;border-radius:12px;font-size:11px;font-weight:850;cursor:pointer; }
.rc-capture-modes button.active { background:rgba(253,212,84,.12);color:var(--rc-yellow);border-color:rgba(253,212,84,.3); }
.rc-fast-tap { min-height:143px;width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px;background:linear-gradient(140deg,#fdd454,#c7f87c);color:#182218;border:1px solid rgba(255,255,255,.25);border-radius:19px;box-shadow:0 8px 30px rgba(253,212,84,.16);cursor:pointer;user-select:none;touch-action:manipulation; }
.rc-fast-tap strong { font-size:clamp(18px,4vw,26px);font-weight:900;letter-spacing:-.03em; }
.rc-fast-tap small { font-size:10px;opacity:.75;font-weight:750;text-align:center;padding:0 9px; }
.rc-fast-tap:active { transform:scale(.985); }
.rc-fast-tap:disabled { opacity:.35;cursor:not-allowed; }
.rc-fast-list { margin-top:21px;display:flex;flex-direction:column;gap:9px; }
.rc-fast-list-title { display:flex;justify-content:space-between;color:var(--rc-muted);font-size:10px;letter-spacing:.1em;font-weight:900;padding:0 2px 8px; }
.rc-fast-list-title span { color:var(--rc-yellow); }
.rc-fast-row { display:flex;align-items:center;justify-content:space-between;gap:11px;flex-wrap:wrap;padding:13px;background:rgba(255,255,255,.045);border:1px solid var(--rc-stroke);border-radius:13px; }
.rc-fast-stamp { display:flex;flex-direction:column;gap:5px; }
.rc-fast-stamp small { font-size:9px;color:var(--rc-muted); }
.rc-fast-stamp strong { font-family:ui-monospace,Consolas,monospace;font-size:16px;letter-spacing:-.04em; }
.rc-fast-row form { display:flex;gap:8px;align-items:center; }
.rc-fast-row input { min-width:0;width:115px;max-width:155px;padding:12px;border:1px solid var(--rc-stroke);background:rgba(255,255,255,.04);border-radius:10px;color:white;outline:none; }
.rc-fast-row input:focus { border-color:var(--rc-yellow); }
@media(max-width:510px) { .rc-fast-row form { flex:1; } .rc-fast-row input { width:100%; flex:1;max-width:none; } .rc-fast-row .rc-btn { padding:10px 12px; } .rc-fast-stamp { flex:1; } }


/* RAYOCERO CANINATA V1.4 — one-file scoped Liquid Glass */
.rcgl-dashboard,.rcgl-login-layout {
  --rg-gold:#FDD454; --rg-lime:#D9FC6B;
  background:radial-gradient(ellipse 60% 40% at 98% -5%,rgba(217,252,107,.11),transparent 76%),
  radial-gradient(ellipse 45% 36% at -10% 48%,rgba(253,212,84,.065),transparent 83%),
  linear-gradient(150deg,#121a12,#070c09 45%,#0a110c) !important;
  color:#f8fff8; font-family:Inter,ui-sans-serif,system-ui,sans-serif;
  isolation:isolate; position:relative; overflow-x:clip;
}
.rcgl-dashboard:before,.rcgl-login-layout:before{
  content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;opacity:.25;
  background-image:linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px);
  background-size:36px 36px;mask-image:linear-gradient(to bottom,black,transparent 90%);
}
.rcgl-dashboard *, .rcgl-login-layout *{box-sizing:border-box}
.rcgl-navbar{
  background:rgba(10,17,12,.76)!important;backdrop-filter:blur(26px) saturate(160%)!important;
  -webkit-backdrop-filter:blur(26px) saturate(160%);border-color:rgba(253,212,84,.16)!important;
  box-shadow:0 12px 40px rgba(0,0,0,.24);padding-inline:clamp(16px,4vw,36px);
}
.rcgl-navbar button,.rcgl-tabbar button,.rcgl-roster button,.rcgl-tarifas button,.rcgl-kits-panel button{
  min-height:38px;transition:transform .17s ease,background .2s ease,border-color .2s ease;
}
.rcgl-navbar button:active,.rcgl-tabbar button:active,.rcgl-roster button:active{transform:scale(.97)}
.rcgl-content{max-width:1480px!important;padding-top:clamp(19px,3.1vw,42px);padding-bottom:50px}
.rcgl-stats{gap:clamp(9px,1.5vw,16px)}
.rcgl-stat,.rcgl-roster,.rcgl-kits-progress,.rcgl-kits-panel,.rcgl-tarifas,.rcgl-login-pane{
  background:linear-gradient(130deg,rgba(255,255,255,.080),rgba(255,255,255,.019) 49%,rgba(217,252,107,.022))!important;
  border:1px solid rgba(255,255,255,.13)!important;border-radius:22px!important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 16px 45px rgba(0,0,0,.20);
  backdrop-filter:blur(22px) saturate(155%);-webkit-backdrop-filter:blur(22px) saturate(155%);
}
.rcgl-stat{min-height:115px;padding:clamp(14px,2vw,23px)!important;position:relative;overflow:hidden}
.rcgl-stat:after{content:"";position:absolute;left:14px;right:14px;top:0;height:1px;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.26),transparent)}
.rcgl-stat p:last-child{font-variant-numeric:tabular-nums;font-size:clamp(20px,3vw,33px);
  letter-spacing:-.04em;text-shadow:0 0 28px rgba(253,212,84,.07)}
.rcgl-tabbar{gap:9px;align-items:center}
.rcgl-tab{border-radius:13px!important;min-height:44px!important;padding-inline:clamp(12px,1.8vw,22px)!important;
  font-size:10px!important;letter-spacing:.08em}
.rcgl-tabbar>button:not(.rcgl-tab){min-height:44px;border-radius:13px}
.rcgl-tab[style*="background: rgb(253, 212, 84)"],.rcgl-tab[style*="#FDD454"]{
  box-shadow:0 6px 22px rgba(253,212,84,.17)}
.rcgl-roster{border-radius:24px!important}
.rcgl-roster>div:first-child{background:rgba(255,255,255,.017)!important;padding:clamp(13px,2vw,22px)}
.rcgl-roster table{border-collapse:separate;border-spacing:0;width:100%;min-width:970px}
.rcgl-roster thead th{background:rgba(253,212,84,.055);position:sticky;top:0;z-index:1;padding-block:15px}
.rcgl-roster tbody tr{transition:background .18s ease}
.rcgl-roster tbody tr:hover{background:rgba(253,212,84,.052)!important}
.rcgl-roster td{padding-block:14px!important}
.rcgl-table-scroll{scrollbar-color:rgba(253,212,84,.44) rgba(255,255,255,.04);scrollbar-width:thin}
.rcgl-roster input:focus,.rcgl-tarifas input:focus,.rcgl-kits-panel input:focus,.rcgl-login-pane input:focus{
  outline:2px solid rgba(253,212,84,.35)!important;outline-offset:1px}
.rcgl-tarifas{padding:clamp(17px,2.7vw,30px)!important}
.rcgl-kits-progress,.rcgl-kits-panel{padding:clamp(15px,2.8vw,27px)!important}
.rcgl-kits-panel form input{min-width:0}
.rcgl-login-layout{min-height:100dvh}
.rcgl-login-card{position:relative}
.rcgl-login-pane{padding:clamp(22px,5vw,34px)!important;position:relative}
.rcgl-login-pane:before{content:"";height:1px;position:absolute;top:0;left:22px;right:22px;
  background:linear-gradient(90deg,transparent,rgba(253,212,84,.7),transparent)}
.rcgl-comprobante-modal{background:rgba(9,16,12,.94)!important;border:1px solid rgba(253,212,84,.21)!important;
  box-shadow:0 25px 100px rgba(0,0,0,.65),inset 0 1px rgba(255,255,255,.1);
  backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px)}
.rcgl-comprobante-sidebar{background:rgba(18,26,19,.85)!important}
.rcgl-timing-slot{min-width:0;overflow:hidden;border-radius:24px;border:1px solid rgba(255,255,255,.11)}
.rcgl-timing-slot .rc-glass-page{min-height:700px}
.rcgl-timing-slot .rc-topbar{position:relative;border-radius:0}
.rcgl-timing-slot .rc-main{padding:clamp(15px,2vw,24px)}
.rcgl-timing-empty{display:flex;align-items:center;gap:9px;padding:25px;color:#fdd454}
@media(max-width:740px){
  .rcgl-content{padding-inline:12px!important;padding-top:18px!important}
  .rcgl-navbar{padding:12px!important}
  .rcgl-stats{grid-template-columns:repeat(2,minmax(0,1fr))!important}
  .rcgl-tabbar{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important}
  .rcgl-tabbar .rcgl-tab{justify-content:center!important;padding:12px 6px!important}
  .rcgl-tabbar>button:not(.rcgl-tab){grid-column:span 2;margin-left:0!important}
  .rcgl-roster{overflow:hidden!important}
  .rcgl-kits-panel form{flex-wrap:wrap}
  .rcgl-kits-panel form>div:last-child,.rcgl-kits-panel form>div:last-child button{width:100%}
  .rcgl-comprobante-modal{max-height:96dvh!important;overflow-y:auto!important}
  .rcgl-comprobante-modal>div:first-child{min-height:260px!important;max-height:42dvh}
  .rcgl-comprobante-sidebar{overflow:visible!important}
  .rcgl-timing-slot .rc-topbar{flex-wrap:wrap}
}
@media(max-width:370px){.rcgl-stat{min-height:100px!important;padding:12px!important}}
@media(prefers-reduced-motion:reduce){.rcgl-dashboard *,.rcgl-login-layout *{transition:none!important;animation-duration:.001ms!important}}

/* V1.5 · DIRECCIÓN DE CARRERA — CONTROL DE REINICIO DE PRUEBAS */
.rc-dir-actions { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:13px;margin-bottom:16px; }
.rc-dir-card { min-width:0;padding:clamp(18px,2vw,25px);position:relative;overflow:hidden; }
.rc-dir-card::before { content:"";position:absolute;inset:0 0 auto;height:1px;pointer-events:none;background:linear-gradient(90deg,rgba(253,212,84,.5),transparent 78%); }
.rc-dir-heading { display:flex;gap:13px;align-items:flex-start;margin-bottom:12px; }
.rc-dir-icon { width:44px;height:44px;display:grid;place-items:center;flex:0 0 auto;border-radius:14px;color:#fdd454;border:1px solid rgba(253,212,84,.2);background:rgba(253,212,84,.075); }
.rc-dir-icon.warn { color:#ffc49a;background:rgba(255,153,102,.09);border-color:rgba(255,153,102,.23); }
.rc-dir-kicker { color:#fdd454;font-size:9px;font-weight:900;letter-spacing:.17em;margin-bottom:7px; }
.rc-dir-card h3 { margin:0 0 6px;font-size:clamp(16px,1.8vw,21px);letter-spacing:-.04em;font-weight:850; }
.rc-dir-card p { margin:0;font-size:11px;line-height:1.65;color:var(--rc-muted); }
.rc-dir-meta { display:flex;flex-wrap:wrap;gap:8px;margin:15px 0; }
.rc-dir-pill { border:1px solid rgba(255,255,255,.12);border-radius:30px;padding:7px 10px;color:rgba(255,255,255,.78);background:rgba(255,255,255,.04);font-size:10px;white-space:nowrap; }
.rc-dir-btn {width:100%;display:flex;align-items:center;justify-content:center;gap:9px;border:1px solid rgba(253,192,129,.38);border-radius:13px;min-height:48px;padding:11px 16px;cursor:pointer;background:rgba(255,153,102,.105);color:#ffd0a4;font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;transition:background .15s,transform .15s;}
.rc-dir-btn:disabled {opacity:.42;cursor:not-allowed;}
.rc-dir-btn:hover:not(:disabled) {background:rgba(255,153,102,.18);transform:translateY(-1px);}
.rc-dir-btn.primary {background:linear-gradient(115deg,#fdd454,#d9fc6b);color:#152018;border:0;}
.rc-dir-btn:focus-visible {outline:2px solid #fdd454;outline-offset:3px;}
.rc-dir-note {margin-top:10px!important;color:#f5c5a0!important;font-size:10px!important;}
.rc-reset-modal {width:min(100%,580px);max-height:94dvh;overflow:auto;padding:clamp(18px,4vw,30px);border:1px solid rgba(255,189,130,.26);}
.rc-reset-title {display:flex;gap:12px;align-items:flex-start;}
.rc-reset-title h2 {margin:0;font-size:clamp(19px,3vw,25px);letter-spacing:-.045em;}
.rc-reset-title p {margin:6px 0 0;color:var(--rc-muted);font-size:11px;line-height:1.6;}
.rc-reset-preview {display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;}
.rc-reset-preview>div {padding:15px 11px;border:1px solid rgba(255,255,255,.1);border-radius:14px;background:rgba(255,255,255,.035);text-align:center;}
.rc-reset-preview strong {display:block;font-size:clamp(22px,5vw,32px);font-weight:850;color:#fdd454;}
.rc-reset-preview span {display:block;color:var(--rc-muted);font-size:9px;text-transform:uppercase;letter-spacing:.08em;margin-top:6px;}
.rc-reset-confirm {padding:15px;border:1px solid rgba(255,189,130,.20);background:rgba(255,146,84,.06);border-radius:14px;display:flex;gap:12px;align-items:flex-start;font-size:11px;line-height:1.65;cursor:pointer;color:#f3e9df;}
.rc-reset-confirm input {flex:0 0 18px;width:18px;height:18px;margin-top:2px;accent-color:#fdd454;}
.rc-reset-buttons {display:grid;grid-template-columns:1fr 1.4fr;gap:10px;}
.rc-reset-buttons .rc-btn,.rc-reset-buttons .rc-dir-btn {white-space:normal;line-height:1.35;}
.rc-reset-busy {font-size:11px;color:#fdd454;display:flex;gap:7px;align-items:center;}
@media(max-width:800px){.rc-dir-actions{grid-template-columns:1fr}.rc-dir-card{padding:19px}.rc-dir-heading{gap:10px}.rc-reset-buttons{grid-template-columns:1fr}}
@media(max-width:420px){.rc-reset-preview>div{padding:12px 5px}.rc-reset-preview strong{font-size:23px}.rc-dir-icon{width:39px;height:39px}}
`;

// ─── CONSTANTES ──────────────────────────────────────────────────────────────
const PIN_CORRECTO = "CANINATA2026";
const LS_KEY       = "caninata_dash_auth";
const YELLOW       = "#FDD454";
const BG           = "#080f08";

// [V1.3-2] Storage de comprobantes
const BUCKET              = "comprobantes-pago";
const LIST_PAGE_SIZE      = 200;
const LIST_MAX_PAGES      = 50;          // cota dura: 10.000 archivos por prefijo
const LIST_CACHE_TTL_MS   = 60_000;      // [V1.3-3]
const MATCH_WINDOW_MIN    = 72 * 60;     // ventana de confianza para matches en raíz
const REF_SIN_COMPROBANTE = new Set(["INSCRIPCION_ADMIN", "NINO_GRATIS"]);
const FALLBACK_PREFIXES   = ["", "comprobantes/"];

// ─── TIPOS ───────────────────────────────────────────────────────────────────
interface Atleta {
  id               : string;
  nombre           : string;
  apellido         : string;
  cedula           : string;
  telefono?        : string;
  modalidad?       : string;
  categoria?       : string;
  bib_number?      : string | number;
  pago_verificado  : boolean;
  kit_entregado    : boolean;
  talla_camiseta?  : string;
  created_at       : string;
  referencia_pago? : string | null;  // [V1.3-1]
  comprobante_url? : string | null;  // [V1.3-1]
  comprobante_path?: string | null;  // [V1.3-1]
}

interface CaninatRace {
  id  : string;
  name: string;
}

/** [V1.3-2] Entrada de archivo en storage (carpetas tienen id === null). */
interface StorageEntry {
  name      : string;
  id        : string;
  created_at: string | null;
}

/** [V1.3-2] Origen del comprobante resuelto. */
type ComprobanteSource = "registro" | "caninata" | "raiz";

interface ComprobanteHit {
  url     : string;
  path    : string;
  source  : ComprobanteSource;
  deltaMin: number | null;   // |file.created_at − runner.created_at| en minutos
  isPdf   : boolean;
}

// ─── [V1.3-2] RESOLVER DE COMPROBANTES — CANINATA ────────────────────────────

/** [V1.3-3] Cache de listados por prefijo. */
const listCache = new Map<string, { ts: number; files: StorageEntry[] }>();

/** Slug idéntico al del AdminDashboard principal (compatibilidad de rutas). */
const slugRaw = (s: string) =>
  s.toLowerCase().replace(/\s+/g, "-").substring(0, 20);

/** Slug normalizado (sin acentos ni símbolos) — cubre terminales que sanitizan. */
const slugNorm = (s: string) =>
  s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 20);

/** Carpetas propias de la caninata, en orden de prioridad. */
const getCaninataPrefixes = (raceName: string): string[] => {
  const set = new Set<string>();
  [slugRaw(raceName), slugNorm(raceName), "caninata", "caninata-2026"]
    .forEach(p => { if (p) set.add(`${p}/`); });
  return [...set];
};

const publicUrlOf = (path: string): string | null =>
  supabase.storage.from(BUCKET).getPublicUrl(path).data?.publicUrl ?? null;

const isPdfName = (name: string) => /\.pdf$/i.test(name);

/** Extrae la ruta interna del bucket desde una URL pública de Supabase. */
const pathFromPublicUrl = (url: string): string | null => {
  const marker = `/object/public/${BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  try {
    return decodeURIComponent(url.substring(i + marker.length).split("?")[0]);
  } catch {
    return null;
  }
};

/** Normaliza una ruta guardada (quita "/" inicial y el nombre del bucket si viene incluido). */
const normalizeStoredPath = (p: string): string => {
  let clean = p.trim().replace(/^\/+/, "");
  if (clean.startsWith(`${BUCKET}/`)) clean = clean.substring(BUCKET.length + 1);
  return clean;
};

/** Lista un prefijo completo con paginación y cache. Excluye carpetas. */
const listPrefix = async (prefix: string, force: boolean): Promise<StorageEntry[]> => {
  const cached = listCache.get(prefix);
  if (!force && cached && Date.now() - cached.ts < LIST_CACHE_TTL_MS) return cached.files;

  const folder = prefix.replace(/\/$/, "");
  const out: StorageEntry[] = [];
  for (let page = 0; page < LIST_MAX_PAGES; page++) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(folder, {
        limit : LIST_PAGE_SIZE,
        offset: page * LIST_PAGE_SIZE,
        sortBy: { column: "name", order: "asc" },
      });
    if (error) {
      console.warn(`[MIA-CANINATA] Error listando "${prefix}":`, error.message);
      break;
    }
    if (!data || data.length === 0) break;
    data.forEach(f => {
      if (f.id) out.push({ name: f.name, id: f.id, created_at: f.created_at ?? null });
    });
    if (data.length < LIST_PAGE_SIZE) break;
  }
  listCache.set(prefix, { ts: Date.now(), files: out });
  return out;
};

/** Verifica que una ruta exista realmente en el bucket. */
const verifyPath = async (path: string): Promise<StorageEntry | null> => {
  const idx  = path.lastIndexOf("/");
  const dir  = idx === -1 ? "" : path.substring(0, idx);
  const file = idx === -1 ? path : path.substring(idx + 1);
  if (!file) return null;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(dir, { limit: 100, search: file });
  if (error || !data) return null;
  const f = data.find(x => x.name === file && x.id);
  return f ? { name: f.name, id: f.id as string, created_at: f.created_at ?? null } : null;
};

const deltaMinutes = (fileTs: string | null, runnerTs: string | null | undefined): number | null => {
  if (!fileTs || !runnerTs) return null;
  const d = Math.abs(Date.parse(fileTs) - Date.parse(runnerTs));
  return Number.isFinite(d) ? Math.round(d / 60_000) : null;
};

/** Matcher por teléfono (prioritario), cédula y referencia. */
const buildMatcher = (a: Atleta) => {
  const ced   = String(a.cedula ?? "").replace(/^V-?/i, "").replace(/\D/g, "");
  const tel   = String(a.telefono ?? "").replace(/\D/g, "");
  const tel10 = tel.length >= 10 ? tel.slice(-10) : "";
  const ref   = String(a.referencia_pago ?? "").toLowerCase().trim();
  const refOk = ref.length >= 4 && !REF_SIN_COMPROBANTE.has(ref.toUpperCase());

  return (fileName: string): boolean => {
    const n = fileName.toLowerCase();
    if (tel && n.startsWith(tel))      return true;
    if (tel10 && n.includes(tel10))    return true;
    if (ced.length >= 5 && n.includes(ced)) return true;
    if (refOk && n.includes(ref))      return true;
    return false;
  };
};

/**
 * [V1.3-2] Resuelve el comprobante del atleta dentro del ámbito de la caninata.
 * @param a        Atleta.
 * @param raceName Nombre de la carrera caninata (para slug de carpeta).
 * @param force    true = ignora cache de listados (re-escaneo).
 */
const resolveComprobanteCaninata = async (
  a: Atleta,
  raceName: string,
  force = false,
): Promise<ComprobanteHit | null> => {
  // ── Capa 1: ruta registrada en el runner ──
  const storedRaw =
    a.comprobante_path?.trim() ||
    (a.comprobante_url ? pathFromPublicUrl(a.comprobante_url) : null);
  if (storedRaw) {
    const path  = normalizeStoredPath(storedRaw);
    const entry = await verifyPath(path);
    if (entry) {
      const url = publicUrlOf(path);
      if (url) {
        return {
          url, path, source: "registro",
          deltaMin: deltaMinutes(entry.created_at, a.created_at),
          isPdf   : isPdfName(path),
        };
      }
    }
  }

  const matches = buildMatcher(a);

  const pickBest = async (prefixes: string[], source: ComprobanteSource): Promise<ComprobanteHit | null> => {
    let best: ComprobanteHit | null = null;
    for (const prefix of prefixes) {
      const files = await listPrefix(prefix, force);
      for (const f of files) {
        if (!matches(f.name)) continue;
        const delta  = deltaMinutes(f.created_at, a.created_at);
        const better = !best || (delta ?? Infinity) < (best.deltaMin ?? Infinity);
        if (!better) continue;
        const path = `${prefix}${f.name}`;
        const url  = publicUrlOf(path);
        if (url) best = { url, path, source, deltaMin: delta, isPdf: isPdfName(f.name) };
      }
    }
    return best;
  };

  // ── Capa 2: carpetas de la caninata ──
  const caninataHit = await pickBest(getCaninataPrefixes(raceName), "caninata");
  if (caninataHit) return caninataHit;

  // ── Capa 3: raíz del bucket (fallback marcado) ──
  return pickBest(FALLBACK_PREFIXES, "raiz");
};

const formatDelta = (min: number | null): string => {
  if (min == null) return "sin fecha";
  if (min < 60)    return `${min} min`;
  if (min < 1440)  return `${Math.round(min / 60)} h`;
  return `${Math.round(min / 1440)} d`;
};

// ─── TASACONFIG EMBEBIDA ─────────────────────────────────────────────────────
const TasaConfigCaninata = ({ raceId }: { raceId: string }) => {
  const [tasaBCV,    setTasaBCV]    = useState("");
  const [costo10k,   setCosto10k]   = useState("");
  const [costo5k,    setCosto5k]    = useState("");
  const [configId,   setConfigId]   = useState<number | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      let data: any = null;
      const { data: d } = await supabase
        .from("system_config")
        .select("*")
        .eq("race_id", raceId)
        .maybeSingle();
      data = d;
      if (!data) {
        const { data: fb } = await supabase
          .from("system_config")
          .select("*")
          .eq("id", 1)
          .single();
        data = fb;
      }
      if (data) {
        setConfigId(data.id);
        setTasaBCV(String(data.tasa_bcv ?? ""));
        setCosto10k(String(data.costo_usd ?? ""));
        setCosto5k(String(data.costo_4k_usd ?? ""));
      }
    } catch {
      setErrorMsg("Error cargando configuración.");
    } finally {
      setLoading(false);
    }
  }, [raceId]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configId) return;
    setSaving(true); setErrorMsg(null);
    try {
      const { error } = await supabase
        .from("system_config")
        .update({
          tasa_bcv            : parseFloat(tasaBCV.replace(",", ".")),
          costo_usd           : parseFloat(costo10k.replace(",", ".")),
          costo_4k_usd        : parseFloat(costo5k.replace(",", ".")),
          ultima_actualizacion: new Date().toISOString(),
        })
        .eq("id", configId);
      if (error) throw error;
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-10">
      <Loader2 className="animate-spin" style={{ color: YELLOW, width: 28, height: 28 }} />
    </div>
  );

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {errorMsg && (
        <div className="p-3 rounded-xl text-xs font-bold text-red-400 border border-red-500/30 bg-red-500/10">
          {errorMsg}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Tasa BCV (Bs/$)",       value: tasaBCV,  set: setTasaBCV,  color: "#94a3b8" },
          { label: "Inscripción 10K (USD)", value: costo10k, set: setCosto10k, color: YELLOW    },
          { label: "Inscripción 5K (USD)",  value: costo5k,  set: setCosto5k,  color: YELLOW    },
        ].map(({ label, value, set, color }) => (
          <div key={label}>
            <label
              className="block text-[10px] font-black uppercase tracking-widest mb-2"
              style={{ color }}
            >
              {label}
            </label>
            <input
              type="text"
              value={value}
              onChange={e => set(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-white text-sm font-bold outline-none"
              style={{
                background: "rgba(255,255,255,0.04)",
                border    : `1px solid ${color}30`,
              }}
            />
          </div>
        ))}
      </div>
      <button
        type="submit"
        disabled={saving}
        className="w-full py-3.5 rounded-xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-40"
        style={{ background: YELLOW, color: BG }}
      >
        {saving
          ? <><RefreshCw size={14} className="animate-spin" /> Guardando...</>
          : <><Save size={14} /> Guardar Configuración</>
        }
      </button>
      {successMsg && (
        <div className="flex items-center justify-center gap-2 text-emerald-400 text-xs font-black uppercase">
          <CheckCircle size={14} /> Configuración guardada
        </div>
      )}
    </form>
  );
};

// ─── [V1.3-4] MODAL DE INSPECCIÓN DE COMPROBANTE ─────────────────────────────
interface ComprobanteModalProps {
  atleta      : Atleta;         // instancia viva (derivada del estado del padre)
  raceName    : string;
  togglingPago: boolean;
  togglingKit : boolean;
  onTogglePago: () => void;
  onToggleKit : () => void;
  onClose     : () => void;
}

const SOURCE_STYLE: Record<ComprobanteSource, { label: string; color: string }> = {
  registro: { label: "Ruta registrada",  color: "#22c55e" },
  caninata: { label: "Carpeta caninata", color: YELLOW    },
  raiz    : { label: "Raíz del bucket",  color: "#f59e0b" },
};

const ComprobanteModal = ({
  atleta, raceName, togglingPago, togglingKit, onTogglePago, onToggleKit, onClose,
}: ComprobanteModalProps) => {
  const [hit,       setHit]       = useState<ComprobanteHit | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [msg,       setMsg]       = useState("");
  const [imgFailed, setImgFailed] = useState(false);
  const [scanNonce, setScanNonce] = useState(0);
  const reqRef = useRef(0); // [V1.3-5]

  const refUpper       = String(atleta.referencia_pago ?? "").toUpperCase();
  const sinComprobante = REF_SIN_COMPROBANTE.has(refUpper);

  // [V1.3-2 / V1.3-5] Escaneo con descarte de respuestas obsoletas
  useEffect(() => {
    const reqId = ++reqRef.current;
    setHit(null);
    setImgFailed(false);

    if (sinComprobante) {
      setLoading(false);
      setMsg(refUpper === "NINO_GRATIS"
        ? "Inscripción gratuita: no requiere comprobante."
        : "Inscripción directa desde el panel admin: no hay comprobante en storage.");
      return;
    }

    setLoading(true);
    setMsg("Buscando comprobante...");
    (async () => {
      try {
        const r = await resolveComprobanteCaninata(atleta, raceName, scanNonce > 0);
        if (reqId !== reqRef.current) return;
        if (r) {
          setHit(r);
          setMsg("");
        } else {
          setMsg(
            `No se encontró comprobante para V-${atleta.cedula}` +
            ` · Tel ${atleta.telefono ?? "—"}` +
            (atleta.referencia_pago ? ` · Ref ${atleta.referencia_pago}` : "")
          );
        }
      } catch {
        if (reqId === reqRef.current) setMsg("No se pudo consultar el storage. Usa Re-escanear.");
      } finally {
        if (reqId === reqRef.current) setLoading(false);
      }
    })();

    return () => { reqRef.current++; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atleta.id, raceName, scanNonce, sinComprobante]);

  // Cerrar con Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const fueraDeVentana = hit?.source === "raiz" && (hit.deltaMin == null || hit.deltaMin > MATCH_WINDOW_MIN);

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[999999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(6px)" }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="rcgl-comprobante-modal w-full max-w-6xl max-h-[92vh] rounded-3xl overflow-hidden flex flex-col md:flex-row"
        style={{ background: BG, border: `1px solid ${YELLOW}25` }}
      >
        {/* Panel izquierdo — comprobante */}
        <div className="flex-1 bg-black flex items-center justify-center p-4 min-h-[360px] overflow-auto">
          {loading ? (
            <div className="text-center">
              <Loader2 className="animate-spin mx-auto mb-3" style={{ color: YELLOW, width: 36, height: 36 }} />
              <p className="text-xs font-bold" style={{ color: `${YELLOW}90` }}>{msg}</p>
            </div>
          ) : sinComprobante ? (
            <div className="text-center max-w-xs">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)" }}
              >
                <ShieldCheck size={30} style={{ color: "#818cf8" }} />
              </div>
              <p className="text-sm font-black text-white mb-1">
                {refUpper === "NINO_GRATIS" ? "Inscripción gratuita" : "Inscripción admin"}
              </p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>{msg}</p>
            </div>
          ) : hit && !imgFailed ? (
            hit.isPdf ? (
              <iframe
                src={hit.url}
                title="Comprobante PDF"
                className="w-full h-[80vh] rounded-xl bg-white"
              />
            ) : (
              <img
                src={hit.url}
                alt={`Comprobante de ${atleta.nombre} ${atleta.apellido}`}
                className="max-h-[82vh] max-w-full object-contain"
                onError={() => setImgFailed(true)}
              />
            )
          ) : (
            <div className="text-center max-w-sm">
              <ShieldAlert size={48} className="mx-auto mb-4" style={{ color: "rgba(255,255,255,0.15)" }} />
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                {imgFailed
                  ? "El archivo existe pero no se pudo mostrar. Ábrelo en una pestaña nueva."
                  : msg}
              </p>
            </div>
          )}
        </div>

        {/* Panel derecho — datos y acciones */}
        <div
          className="rcgl-comprobante-sidebar w-full md:w-[360px] p-6 flex flex-col gap-3 overflow-y-auto"
          style={{ background: "rgba(255,255,255,0.02)", borderLeft: `1px solid ${YELLOW}12` }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-lg font-black uppercase text-white leading-tight">
                {atleta.nombre} {atleta.apellido}
              </p>
              <p className="text-[10px] font-mono mt-1" style={{ color: `${YELLOW}90` }}>
                V-{atleta.cedula}{atleta.bib_number ? ` · Dorsal #${atleta.bib_number}` : ""}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="p-2 rounded-full hover:bg-white/10"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              <X size={18} />
            </button>
          </div>

          {[
            ["Teléfono",   atleta.telefono ?? "—"],
            ["Modalidad",  atleta.modalidad ?? "—"],
            ["Categoría",  atleta.categoria ?? "—"],
            ["Talla",      atleta.talla_camiseta ?? "N/A"],
            ["Referencia", atleta.referencia_pago ?? "Sin referencia"],
          ].map(([lbl, val]) => (
            <div
              key={lbl}
              className="rounded-xl px-4 py-3"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <p className="text-[9px] uppercase font-black" style={{ color: "rgba(255,255,255,0.35)" }}>{lbl}</p>
              <p className="text-xs font-bold text-white break-all">{val}</p>
            </div>
          ))}

          {/* Origen del comprobante */}
          {hit && (
            <div
              className="rounded-xl px-4 py-3"
              style={{
                background: `${SOURCE_STYLE[hit.source].color}10`,
                border    : `1px solid ${SOURCE_STYLE[hit.source].color}35`,
              }}
            >
              <p className="text-[9px] uppercase font-black" style={{ color: SOURCE_STYLE[hit.source].color }}>
                {SOURCE_STYLE[hit.source].label} · subido a {formatDelta(hit.deltaMin)} del registro
              </p>
              <p className="text-[10px] font-mono mt-1 break-all" style={{ color: "rgba(255,255,255,0.5)" }}>
                {hit.path}
              </p>
              {fueraDeVentana && (
                <p className="text-[10px] font-bold mt-2 flex items-start gap-1.5 text-amber-400">
                  <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                  Encontrado fuera de la carpeta de la caninata y lejos de la fecha de inscripción. Confirma que corresponde a esta carrera antes de aprobar.
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setScanNonce(n => n + 1)}
              disabled={loading || sinComprobante}
              className="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1.5 disabled:opacity-30"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Re-escanear
            </button>
            {hit && (
              <a
                href={hit.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1.5"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}
              >
                <ExternalLink size={12} /> Abrir original
              </a>
            )}
          </div>

          <div className="mt-auto flex flex-col gap-2 pt-2">
            <button
              onClick={onToggleKit}
              disabled={togglingKit}
              className="w-full py-3 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 transition-all disabled:opacity-40 active:scale-95"
              style={atleta.kit_entregado
                ? { background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b" }
                : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }
              }
            >
              {togglingKit ? <RefreshCw size={14} className="animate-spin" /> : <Gift size={14} />}
              {atleta.kit_entregado ? "Kit entregado · revertir" : "Marcar kit entregado"}
            </button>
            <button
              onClick={onTogglePago}
              disabled={togglingPago}
              className="w-full py-3 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 transition-all disabled:opacity-40 active:scale-95"
              style={atleta.pago_verificado
                ? { background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e" }
                : { background: YELLOW, color: BG }
              }
            >
              {togglingPago
                ? <RefreshCw size={14} className="animate-spin" />
                : atleta.pago_verificado ? <CheckCircle size={14} /> : <ShieldCheck size={14} />
              }
              {atleta.pago_verificado ? "Pago validado · revertir" : "Aprobar pago"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ─── [V1.3-7] PESTAÑA ENTREGA DE KITS POR DORSAL ─────────────────────────────
interface EntregaKitsProps {
  atletas    : Atleta[];
  loading    : boolean;
  togglingKit: string | null;
  onToggleKit: (id: string, current: boolean) => Promise<boolean>;
}

const EntregaKitsCaninata = ({ atletas, loading, togglingKit, onToggleKit }: EntregaKitsProps) => {
  const [bibInput, setBibInput] = useState("");
  const [targetId, setTargetId] = useState<string | null>(null);
  const [msg,      setMsg]      = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const bibRef   = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  // Instancia viva: refleja cambios hechos desde la tabla o el modal
  const target = useMemo(
    () => atletas.find(a => a.id === targetId) ?? null,
    [atletas, targetId],
  );

  const total      = atletas.length;
  const entregados = atletas.filter(a => a.kit_entregado).length;
  const pct        = total > 0 ? Math.round((entregados / total) * 100) : 0;

  const reset = () => {
    setTargetId(null);
    setBibInput("");
    bibRef.current?.focus();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = bibInput.trim();
    if (!q) return;
    const n = Number(q);
    const found = atletas.filter(a => {
      if (a.bib_number == null || a.bib_number === "") return false;
      return Number.isFinite(n) ? Number(a.bib_number) === n : String(a.bib_number) === q;
    });
    if (found.length === 0) {
      setTargetId(null);
      setMsg({ text: `Dorsal #${q} no está asignado en esta carrera.`, type: "error" });
      return;
    }
    if (found.length > 1) {
      setTargetId(null);
      setMsg({ text: `Dorsal #${q} está asignado a ${found.length} atletas. Corrige el duplicado antes de entregar.`, type: "error" });
      return;
    }
    setTargetId(found[0].id);
    setMsg(found[0].kit_entregado
      ? { text: `El kit del dorsal #${q} ya fue entregado.`, type: "error" }
      : { text: "Atleta identificado. Confirma la entrega.", type: "info" });
  };

  const handleToggle = async () => {
    if (!target) return;
    const wasDelivered = target.kit_entregado;
    const ok = await onToggleKit(target.id, wasDelivered);
    if (!ok) {
      setMsg({ text: "No se guardó el cambio. Revisa la conexión e intenta de nuevo.", type: "error" });
      return;
    }
    setMsg({
      text: wasDelivered
        ? `Entrega revertida · #${target.bib_number}`
        : `Kit entregado · #${target.bib_number} ${target.nombre} ${target.apellido}`,
      type: wasDelivered ? "info" : "success",
    });
    setTargetId(null);
    setBibInput("");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { setMsg(null); bibRef.current?.focus(); }, 2500);
  };

  const msgStyle = (type: "success" | "error" | "info") =>
    type === "success" ? { background: "rgba(34,197,94,0.1)",  border: "1px solid rgba(34,197,94,0.3)",  color: "#22c55e" }
    : type === "error" ? { background: "rgba(239,68,68,0.1)",  border: "1px solid rgba(239,68,68,0.3)",  color: "#f87171" }
    :                    { background: `${YELLOW}12`,          border: `1px solid ${YELLOW}30`,          color: YELLOW    };

  return (
    <div className="space-y-4">
      {/* Progreso */}
      <div className="rcgl-kits-progress rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(245,158,11,0.2)" }}>
        <div className="flex justify-between items-center mb-3">
          <p className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.6)" }}>
            {entregados} de {total} kits entregados · {total - entregados} pendientes
          </p>
          <p className="text-lg font-black italic text-amber-400">{pct}%</p>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${YELLOW}, #f59e0b)` }}
          />
        </div>
      </div>

      {/* Buscador por dorsal */}
      <div className="rcgl-kits-panel rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${YELLOW}15` }}>
        <form onSubmit={handleSearch} className="flex gap-3 mb-4">
          <div className="flex-1">
            <label className="block text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: `${YELLOW}90` }}>
              Número de dorsal
            </label>
            <input
              ref={bibRef}
              type="text"
              inputMode="numeric"
              value={bibInput}
              onChange={e => setBibInput(e.target.value)}
              disabled={loading}
              autoFocus
              placeholder="0001"
              className="w-full rounded-xl px-4 py-3.5 text-2xl font-black text-white outline-none placeholder:text-white/15"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${YELLOW}20` }}
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={!bibInput.trim() || loading}
              className="h-[60px] px-6 rounded-xl font-black uppercase text-xs tracking-widest flex items-center gap-2 disabled:opacity-40"
              style={{ background: YELLOW, color: BG }}
            >
              <Search size={16} /> Buscar
            </button>
          </div>
        </form>

        {msg && (
          <div className="p-3 mb-4 rounded-xl text-xs font-bold" style={msgStyle(msg.type)}>
            {msg.text}
          </div>
        )}

        {target && (
          <div className="space-y-3 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-xl font-black uppercase text-white">{target.nombre} {target.apellido}</p>
                <p className="text-[10px] font-mono mt-1" style={{ color: `${YELLOW}90` }}>
                  V-{target.cedula} · {target.modalidad ?? "—"} · {target.categoria ?? "Sin categoría"}
                </p>
              </div>
              <div className="rounded-xl p-4 flex flex-col items-center justify-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-[9px] uppercase font-black" style={{ color: "rgba(255,255,255,0.35)" }}>Talla</p>
                <p className="text-3xl font-black italic text-amber-400">{target.talla_camiseta ?? "N/A"}</p>
              </div>
            </div>

            {!target.pago_verificado && !target.kit_entregado && (
              <div className="p-3 rounded-xl text-xs font-bold flex items-start gap-2" style={msgStyle("error")}>
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                El pago de este atleta no está verificado. Revisa el comprobante en la pestaña Inscritos antes de entregar.
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleToggle}
                disabled={togglingKit === target.id}
                className="flex-1 py-3.5 rounded-xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 disabled:opacity-40 active:scale-95"
                style={target.kit_entregado
                  ? { background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }
                  : { background: "#22c55e", color: BG }
                }
              >
                {togglingKit === target.id
                  ? <RefreshCw size={16} className="animate-spin" />
                  : target.kit_entregado ? <RefreshCw size={16} /> : <CheckCircle size={16} />
                }
                {target.kit_entregado ? "Revertir entrega" : "Confirmar entrega"}
              </button>
              <button
                onClick={() => { reset(); setMsg(null); }}
                className="px-5 py-3.5 rounded-xl font-black uppercase text-xs"
                style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)" }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── PIN GATE ────────────────────────────────────────────────────────────────
const PinGate = ({ onAuth }: { onAuth: () => void }) => {
  const [pin,     setPin]     = useState("");
  const [error,   setError]   = useState(false);
  const [visible, setVisible] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.trim().toUpperCase() === PIN_CORRECTO) {
      localStorage.setItem(LS_KEY, "1");
      onAuth();
    } else {
      setError(true);
      setPin("");
      setTimeout(() => setError(false), 2500);
    }
  };

  return (
    <div
      className="rcgl-login-layout min-h-screen flex items-center justify-center px-4"
      style={{ background: BG }}
    >
      <style>{CANINATA_GLASS_STYLES}</style>
      <div className="rcgl-login-card w-full max-w-sm">
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: `${YELLOW}15`, border: `1px solid ${YELLOW}30` }}
          >
            <Dog size={28} style={{ color: YELLOW }} />
          </div>
          <h1
            className="text-2xl font-black italic uppercase leading-none mb-1"
            style={{ color: "#ffffff" }}
          >
            Caninata
          </h1>
          <p
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: `${YELLOW}80` }}
          >
            Panel de Organizador
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rcgl-login-pane rounded-2xl p-6 space-y-4"
          style={{
            background: "rgba(255,255,255,0.02)",
            border    : `1px solid ${error ? "rgba(239,68,68,0.4)" : `${YELLOW}20`}`,
            transition: "border-color 0.3s",
          }}
        >
          <div>
            <label
              className="block text-[10px] font-black uppercase tracking-widest mb-2"
              style={{ color: `${YELLOW}90` }}
            >
              Código de Acceso
            </label>
            <div className="relative">
              <Lock
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: `${YELLOW}50` }}
              />
              <input
                type={visible ? "text" : "password"}
                value={pin}
                onChange={e => setPin(e.target.value)}
                autoFocus
                placeholder="••••••••••••"
                className="w-full rounded-xl pl-9 pr-10 py-3 text-sm font-bold text-white outline-none placeholder:text-white/20"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border    : `1px solid ${error ? "rgba(239,68,68,0.5)" : `${YELLOW}20`}`,
                }}
              />
              <button
                type="button"
                onClick={() => setVisible(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: `${YELLOW}50` }}
              >
                {visible ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {error && (
              <p className="text-[10px] text-red-400 font-bold mt-2 flex items-center gap-1">
                <AlertCircle size={10} /> Código incorrecto
              </p>
            )}
          </div>
          <button
            type="submit"
            className="w-full py-3.5 rounded-xl font-black uppercase text-xs tracking-widest transition-all active:scale-95"
            style={{ background: YELLOW, color: BG }}
          >
            Acceder
          </button>
        </form>

        <p
          className="text-center mt-6 text-[9px] uppercase tracking-widest font-bold"
          style={{ color: "rgba(255,255,255,0.15)" }}
        >
          RAYOCERO · Valkyron Group
        </p>
      </div>
    </div>
  );
};

// ─── DASHBOARD PRINCIPAL ──────────────────────────────────────────────────────
const CaninataDashboardMain = ({ onLogout }: { onLogout: () => void }) => {
  const [race,             setRace]             = useState<CaninatRace | null>(null);
  const [atletas,          setAtletas]          = useState<Atleta[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [searchTerm,       setSearchTerm]       = useState("");
  const [activeTab,        setActiveTab]        = useState<"atletas" | "kits" | "config" | "timing">("atletas"); // [V1.3-7] + "kits"
  const [error,            setError]            = useState<string | null>(null);
  const [togglingPago,     setTogglingPago]     = useState<string | null>(null);  // [V1.2-1]
  const [togglingKit,      setTogglingKit]      = useState<string | null>(null);  // [V1.2-2]
  const [inspectId,        setInspectId]        = useState<string | null>(null);  // [V1.3-4]

  // [V1.3-4] Atleta inspeccionado derivado del estado — los toggles se reflejan sin sincronización manual
  const inspected = useMemo(
    () => atletas.find(a => a.id === inspectId) ?? null,
    [atletas, inspectId],
  );

  // Cargar carrera caninata activa
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("races")
          .select("id,name")
          .ilike("name", "%caninata%")
          .eq("inscripciones_abiertas", true)
          .maybeSingle();
        if (error) throw error;
        if (!data) {
          const { data: fallback } = await supabase
            .from("races")
            .select("id,name")
            .ilike("name", "%caninata%")
            .order("date", { ascending: false })
            .limit(1)
            .maybeSingle();
          setRace(fallback ?? null);
        } else {
          setRace(data);
        }
      } catch {
        setError("No se pudo cargar la carrera caninata.");
      }
    })();
  }, []);

  const fetchAtletas = useCallback(async () => {
    if (!race) return;
    setLoading(true);
    try {
      // [V1.3-1] select("*"): incluye referencia_pago / comprobante_* sin romper si alguna columna no existe
      const { data, error } = await supabase
        .from("runners")
        .select("*")
        .eq("race_id", race.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setAtletas((data as Atleta[]) || []);
    } catch {
      setError("Error cargando atletas.");
    } finally {
      setLoading(false);
    }
  }, [race]);

  useEffect(() => { fetchAtletas(); }, [fetchAtletas]);

  // [V1.2-1] Toggle pago — actualización optimista
  // [V1.3-6] Retorna true/false según resultado real en Supabase
  const togglePago = async (id: string, current: boolean): Promise<boolean> => {
    setTogglingPago(id);
    const next = !current;
    // Optimista: UI primero
    setAtletas(prev => prev.map(a => a.id === id ? { ...a, pago_verificado: next } : a));
    try {
      const { error } = await supabase
        .from("runners")
        .update({ pago_verificado: next })
        .eq("id", id);
      if (error) throw error;
      return true; // [V1.3-6]
    } catch {
      // Revertir si falla
      setAtletas(prev => prev.map(a => a.id === id ? { ...a, pago_verificado: current } : a));
      setError("Error actualizando pago. Intenta de nuevo.");
      setTimeout(() => setError(null), 3000);
      return false; // [V1.3-6]
    } finally {
      setTogglingPago(null);
    }
  };

  // [V1.2-2] Toggle kit — actualización optimista
  // [V1.3-6] Retorna true/false según resultado real en Supabase
  const toggleKit = async (id: string, current: boolean): Promise<boolean> => {
    setTogglingKit(id);
    const next = !current;
    // Optimista: UI primero
    setAtletas(prev => prev.map(a => a.id === id ? { ...a, kit_entregado: next } : a));
    try {
      const { error } = await supabase
        .from("runners")
        .update({ kit_entregado: next })
        .eq("id", id);
      if (error) throw error;
      return true; // [V1.3-6]
    } catch {
      // Revertir si falla
      setAtletas(prev => prev.map(a => a.id === id ? { ...a, kit_entregado: current } : a));
      setError("Error actualizando kit. Intenta de nuevo.");
      setTimeout(() => setError(null), 3000);
      return false; // [V1.3-6]
    } finally {
      setTogglingKit(null);
    }
  };

  const closeInspect = useCallback(() => setInspectId(null), []); // [V1.3-4]

  const filtered = useMemo(() => {
    if (!searchTerm) return atletas;
    const t = searchTerm.toLowerCase();
    return atletas.filter(a =>
      `${a.nombre} ${a.apellido} ${a.cedula} ${a.categoria ?? ""} ${a.telefono ?? ""} ${a.bib_number ?? ""} ${a.modalidad ?? ""}`.toLowerCase().includes(t)
    );
  }, [atletas, searchTerm]);

  const total    = atletas.length;
  const pagados  = atletas.filter(a => a.pago_verificado).length;
  const kits     = atletas.filter(a => a.kit_entregado).length;
  const count10k = atletas.filter(a => a.modalidad === "10K").length;
  const count5k  = atletas.filter(a => a.modalidad === "5K").length;

  return (
    <div className="rcgl-dashboard min-h-screen font-sans" style={{ background: BG, color: "#ffffff" }}>
      <style>{CANINATA_GLASS_STYLES}</style>

      {/* NAVBAR */}
      <nav
        className="rcgl-navbar sticky top-0 z-50 flex items-center justify-between px-5 py-4 border-b"
        style={{ background: `${BG}ee`, borderColor: `${YELLOW}18`, backdropFilter: "blur(12px)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="h-9 w-9 rounded-xl flex items-center justify-center"
            style={{ background: `${YELLOW}15`, border: `1px solid ${YELLOW}30` }}
          >
            <Dog size={18} style={{ color: YELLOW }} />
          </div>
          <div>
            <p className="text-sm font-black italic uppercase leading-none">Caninata</p>
            <p
              className="text-[9px] uppercase tracking-widest"
              style={{ color: `${YELLOW}60` }}
            >
              {race?.name ?? "Cargando..."}
            </p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 text-[10px] uppercase font-black px-3 py-2 rounded-lg transition-all hover:bg-white/5"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          <LogOut size={13} /> Salir
        </button>
      </nav>

      <div className="rcgl-content max-w-6xl mx-auto px-4 py-8 space-y-6">

        {error && (
          <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm font-bold flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* CONTADORES */}
        <div className="rcgl-stats grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total inscritos",   value: total,                      color: YELLOW    },
            { label: "Pagos verificados", value: `${pagados} / ${total}`,    color: "#22c55e" },
            { label: "Kits entregados",   value: `${kits} / ${total}`,       color: "#f59e0b" },
            { label: "10K / 5K",          value: `${count10k} / ${count5k}`, color: YELLOW    },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="rcgl-stat rounded-2xl p-4 flex flex-col gap-1"
              style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${color}20` }}
            >
              <p
                className="text-[9px] uppercase font-black tracking-widest"
                style={{ color: `${color}80` }}
              >
                {label}
              </p>
              <p className="text-2xl font-black italic" style={{ color }}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* TABS */}
        <div className="rcgl-tabbar flex gap-2 flex-wrap">
          {([
            { id: "atletas", label: `Inscritos (${total})`,           icon: <Users size={13} />   },
            { id: "kits",    label: `Entrega Kits (${kits}/${total})`, icon: <Package size={13} /> }, // [V1.3-7]
            { id: "config",  label: "Tarifas",                         icon: <Save size={13} />    },
            { id: "timing",  label: "Cronometraje",                  icon: <Timer size={13} />   }, // [V1.4-2]
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="rcgl-tab flex items-center gap-2 px-5 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all"
              style={activeTab === tab.id
                ? { background: YELLOW, color: BG }
                : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.08)" }
              }
            >
              {tab.icon} {tab.label}
            </button>
          ))}

          <button
            onClick={fetchAtletas}
            className="ml-auto p-2.5 rounded-xl transition-all hover:bg-white/5"
            style={{ color: `${YELLOW}60`, border: `1px solid ${YELLOW}15` }}
            title="Actualizar lista"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* TAB: ATLETAS */}
        {activeTab === "atletas" && (
          <div
            className="rcgl-roster rounded-2xl overflow-hidden"
            style={{ border: `1px solid ${YELLOW}15` }}
          >
            {/* Buscador */}
            <div
              className="p-4 border-b"
              style={{ borderColor: `${YELLOW}10`, background: "rgba(255,255,255,0.01)" }}
            >
              <div className="relative max-w-sm">
                <Search
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: `${YELLOW}50` }}
                />
                <input
                  type="text"
                  placeholder="Buscar nombre, cédula o teléfono..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl pl-9 pr-4 py-2.5 text-xs text-white outline-none placeholder:text-white/20"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border    : `1px solid ${YELLOW}15`,
                  }}
                />
              </div>
            </div>

            {/* Leyenda botones */}
            <div
              className="px-4 py-2 flex items-center gap-4 border-b text-[9px] font-black uppercase"
              style={{ borderColor: `${YELLOW}08`, background: "rgba(255,255,255,0.005)", color: "rgba(255,255,255,0.25)" }}
            >
              {/* [V1.3-8] */}
              <span className="flex items-center gap-1">
                <FileText size={10} style={{ color: YELLOW }} /> Ver comprobante
              </span>
              <span className="flex items-center gap-1">
                <Shield size={10} style={{ color: "#22c55e" }} /> Verificar pago
              </span>
              <span className="flex items-center gap-1">
                <Gift size={10} style={{ color: "#f59e0b" }} /> Marcar kit
              </span>
              <span className="ml-auto">Toca el ícono para cambiar estado</span>
            </div>

            {/* Tabla */}
            <div className="rcgl-table-scroll overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                    {["Atleta", "Teléfono", "Dorsal", "Modalidad", "Categoría", "Talla", "Comprobante", "Pago", "Kit"].map(h => ( /* [V1.3-8] + Comprobante */
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[9px] uppercase font-black tracking-widest whitespace-nowrap"
                        style={{ color: `${YELLOW}60` }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center">
                        <Loader2
                          className="animate-spin mx-auto"
                          style={{ color: YELLOW, width: 28, height: 28 }}
                        />
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="py-16 text-center text-[10px] uppercase font-black"
                        style={{ color: "rgba(255,255,255,0.2)" }}
                      >
                        {searchTerm ? "Sin coincidencias" : "No hay atletas inscritos aún"}
                      </td>
                    </tr>
                  ) : filtered.map((a, i) => {
                    // [V1.3-8] Etiqueta de comprobante
                    const refU = String(a.referencia_pago ?? "").toUpperCase();
                    const compLabel = refU === "INSCRIPCION_ADMIN" ? "ADMIN"
                      : refU === "NINO_GRATIS" ? "GRATIS"
                      : "VER";
                    return (
                    <tr
                      key={a.id}
                      style={{
                        borderTop : "1px solid rgba(255,255,255,0.04)",
                        background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                      }}
                    >
                      {/* Atleta */}
                      <td className="px-4 py-3">
                        <p className="text-xs font-black uppercase text-white whitespace-nowrap">
                          {a.nombre} {a.apellido}
                        </p>
                        <p
                          className="text-[9px] font-mono mt-0.5"
                          style={{ color: "rgba(255,255,255,0.35)" }}
                        >
                          V-{a.cedula}
                        </p>
                      </td>

                      {/* Teléfono */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Phone size={11} style={{ color: `${YELLOW}60`, flexShrink: 0 }} />
                          <span
                            className="text-[10px] font-mono font-bold whitespace-nowrap"
                            style={{ color: `${YELLOW}90` }}
                          >
                            {a.telefono ?? "—"}
                          </span>
                        </div>
                      </td>

                      {/* Dorsal */}
                      <td className="px-4 py-3">
                        <span className="text-sm font-black" style={{ color: YELLOW }}>
                          {a.bib_number ? `#${a.bib_number}` : "—"}
                        </span>
                      </td>

                      {/* Modalidad */}
                      <td className="px-4 py-3">
                        <span
                          className="text-[9px] font-black uppercase px-2.5 py-1 rounded-full whitespace-nowrap"
                          style={a.modalidad === "10K"
                            ? { background: `${YELLOW}12`, color: YELLOW, border: `1px solid ${YELLOW}25` }
                            : a.modalidad === "5K"
                            ? { background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.25)" }
                            : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.08)" }
                          }
                        >
                          {a.modalidad === "10K" ? "🏃 10K"
                            : a.modalidad === "5K" ? "🐕 5K"
                            : "—"}
                        </span>
                      </td>

                      {/* Categoría */}
                      <td className="px-4 py-3">
                        <span
                          className="text-[9px] uppercase font-bold whitespace-nowrap"
                          style={{ color: "rgba(255,255,255,0.5)" }}
                        >
                          {a.categoria ?? "—"}
                        </span>
                      </td>

                      {/* Talla */}
                      <td className="px-4 py-3">
                        <span
                          className="text-[9px] font-mono font-bold px-2 py-0.5 rounded"
                          style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)" }}
                        >
                          {a.talla_camiseta ?? "N/A"}
                        </span>
                      </td>

                      {/* [V1.3-8] Comprobante — abre modal de inspección */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setInspectId(a.id)}
                          title="Ver comprobante de pago"
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all active:scale-95 hover:brightness-125"
                          style={compLabel === "VER"
                            ? { background: `${YELLOW}10`, border: `1px solid ${YELLOW}30`, color: YELLOW }
                            : { background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)", color: "#818cf8" }
                          }
                        >
                          <Eye size={12} />
                          <span className="text-[9px] font-black uppercase whitespace-nowrap">{compLabel}</span>
                        </button>
                      </td>

                      {/* [V1.2-1] Pago — botón toggle */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => togglePago(a.id, a.pago_verificado)}
                          disabled={togglingPago === a.id}
                          title={a.pago_verificado ? "Clic para desverificar pago" : "Clic para verificar pago"}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-40 active:scale-95"
                          style={a.pago_verificado
                            ? { background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e" }
                            : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.3)" }
                          }
                        >
                          {togglingPago === a.id
                            ? <RefreshCw size={12} className="animate-spin" />
                            : a.pago_verificado
                            ? <ShieldCheck size={12} />
                            : <Shield size={12} />
                          }
                          <span className="text-[9px] font-black uppercase whitespace-nowrap">
                            {a.pago_verificado ? "OK" : "—"}
                          </span>
                        </button>
                      </td>

                      {/* [V1.2-2] Kit — botón toggle */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleKit(a.id, a.kit_entregado)}
                          disabled={togglingKit === a.id}
                          title={a.kit_entregado ? "Clic para revertir entrega de kit" : "Clic para marcar kit entregado"}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-40 active:scale-95"
                          style={a.kit_entregado
                            ? { background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b" }
                            : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.3)" }
                          }
                        >
                          {togglingKit === a.id
                            ? <RefreshCw size={12} className="animate-spin" />
                            : <Gift size={12} />
                          }
                          <span className="text-[9px] font-black uppercase whitespace-nowrap">
                            {a.kit_entregado ? "OK" : "—"}
                          </span>
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer tabla */}
            {!loading && filtered.length > 0 && (
              <div
                className="px-4 py-3 text-[9px] uppercase font-black"
                style={{
                  color    : "rgba(255,255,255,0.2)",
                  borderTop: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                Mostrando {filtered.length} de {total} atletas
              </div>
            )}
          </div>
        )}

        {/* [V1.3-7] TAB: ENTREGA DE KITS */}
        {activeTab === "kits" && (
          <EntregaKitsCaninata
            atletas={atletas}
            loading={loading}
            togglingKit={togglingKit}
            onToggleKit={toggleKit}
          />
        )}

        {/* TAB: CONFIG TARIFAS */}
        {activeTab === "config" && race && (
          <div
            className="rcgl-tarifas rounded-2xl p-6"
            style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${YELLOW}15` }}
          >
            <h3
              className="text-sm font-black uppercase tracking-widest mb-6"
              style={{ color: YELLOW }}
            >
              Configuración de Tarifas — {race.name}
            </h3>
            <TasaConfigCaninata raceId={race.id} />
          </div>
        )}

        {activeTab === "config" && !race && (
          <div
            className="py-12 text-center text-sm font-bold"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            No se encontró una carrera caninata activa.
          </div>
        )}

      {/* [V1.4-2] Cronometraje operacional: acceso separado Supabase Auth.
          No modifica tablas runners/races ni flujo de pagos, kits o comprobantes.
          REQUIERE ejecutar 20261014_caninata_timing.sql antes de usar. */}
      {activeTab === "timing" && (
        race ? (
          <section className="rcgl-timing-slot" aria-label="Cronometraje RayoCero">
            <CaninataTiming raceId={race.id} />
          </section>
        ) : (
          <div className="rcgl-timing-empty">
            <AlertCircle size={18} /> No se encontró carrera para cronometraje.
          </div>
        )
      )}

        <p
          className="text-center text-[9px] uppercase tracking-widest font-bold pb-4"
          style={{ color: "rgba(255,255,255,0.1)" }}
        >
          CANINATA · RAYOCERO · VALKYRON GROUP
        </p>
      </div>

      {/* [V1.3-4] Modal de inspección de comprobante */}
      {inspected && race && (
        <ComprobanteModal
          atleta={inspected}
          raceName={race.name}
          togglingPago={togglingPago === inspected.id}
          togglingKit={togglingKit === inspected.id}
          onTogglePago={() => togglePago(inspected.id, inspected.pago_verificado)}
          onToggleKit={() => toggleKit(inspected.id, inspected.kit_entregado)}
          onClose={closeInspect}
        />
      )}
    </div>
  );
};


// ────────────────────────────────────────────────────────────────────────────
// [V1.4-2] MÓDULO DE CRONOMETRAJE AISLADO
// Extraído del RACE CONTROL entregado anteriormente, incorporado aquí para que
// este único archivo sea copiables sin importaciones extra de otros componentes.
// Requiere migración SQL de cronometraje, nunca altera comprobantes/inscritos.
// ────────────────────────────────────────────────────────────────────────────
/**
 * RAYOCERO / Valkyron Group — CRONOMETRAJE MANUAL V1.0
 * Panel único responsive: dirección de carrera, control KM5, 3+ jueces de meta.
 * Diseño Liquid Glass. Cronómetro maestro y validación exclusivamente en PostgreSQL.
 * Instalar la migración SQL ANTES de utilizar este componente.
 */

type Role = "admin" | "km5" | "finish";
type SessionState = "ready" | "running" | "closed";
type Point = "km5" | "finish";

type Assignment = { race_id: string; role: Role; label: string };
type ClockState = {
  status: SessionState;
  started_at: string | null;
  closed_at: string | null;
  five_k_finish_at_km5: boolean;
  server_now: string;
};
type Mark = {
  id: string;
  bib: string;
  name: string;
  modality: string;
  checkpoint: Point;
  captured_at: string;
  corrected_at: string | null;
  received_at: string;
  needs_review: boolean;
  operator_id: string;
  elapsed_ms: number;
};
type Pending = {
  request_id: string;
  bib: string;
  checkpoint: Point;
  observed_at: string;
  rtt: number | null;
};
type Notice = { kind: "ok" | "error" | "warn"; text: string };
type Tap = { request_id: string; checkpoint: Point; observed_at: string; rtt: number | null; stored?: boolean; bib?: string };
type ResetPreview = {
  race_id: string;
  race_name: string;
  status: SessionState;
  started_at: string | null;
  closed_at: string | null;
  marks_count: number;
  taps_count: number;
  audit_count: number;
  can_reset: boolean;
};
type ResetResult = {
  status: "ready";
  backup_id: string;
  marks_archived: number;
  taps_archived: number;
  audit_archived: number;
};

const formatMs = (ms: number | null | undefined) => {
  if (ms == null || !Number.isFinite(ms)) return "--:--:--.---";
  const v = Math.max(0, Math.round(ms));
  const h = String(Math.floor(v / 3_600_000)).padStart(2, "0");
  const m = String(Math.floor(v / 60_000) % 60).padStart(2, "0");
  const s = String(Math.floor(v / 1000) % 60).padStart(2, "0");
  return `${h}:${m}:${s}.${String(v % 1000).padStart(3, "0")}`;
};
const call = async <T,>(name: string, params?: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.rpc(name, params || {});
  if (error) throw new Error(error.message);
  return data as T;
};
const networkError = (e: unknown) =>
  /failed to fetch|network|timeout|offline|load failed|fetcherror/i.test(String(e));
const msgError = (e: unknown) => e instanceof Error ? e.message : String(e);

/** Route: /operacion/caninata/cronometraje (la ruta la define tu router). */
function CaninataTiming({ raceId }: { raceId: string }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [clock, setClock] = useState<ClockState | null>(null);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [nowMs, setNowMs] = useState(Date.now());
  const [clockRtt, setClockRtt] = useState<number | null>(null);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [bib, setBib] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<Pending[]>([]);
  const [taps, setTaps] = useState<Tap[]>([]);
  const [tapBib, setTapBib] = useState<Record<string, string>>({});
  const [captureMode, setCaptureMode] = useState<"direct" | "fast">("direct");
  const [busyControl, setBusyControl] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetPreview, setResetPreview] = useState<ResetPreview | null>(null);
  const [resetPhrase, setResetPhrase] = useState("");
  const [resetAgreed, setResetAgreed] = useState(false);
  const [editMark, setEditMark] = useState<Mark | null>(null);
  const [editReason, setEditReason] = useState("");
  const [editTime, setEditTime] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const offsetRef = useRef(0); // servidor - reloj local, en ms
  const rttRef = useRef<number | null>(null);
  const flushingRef = useRef(false);
  const tapFlushingRef = useRef(false);
  const readyRef = useRef(false);
  const lastClockRef = useRef<ClockState | null>(null);
  const queueKey = useMemo(() => `rc_timing_queue:${raceId}:${userId || "anon"}`, [raceId, userId]);
  const tapKey = useMemo(() => `rc_timing_taps:${raceId}:${userId || "anon"}`, [raceId, userId]);
  const runKey = useMemo(() => `rc_timing_run:${raceId}:${userId || "anon"}`, [raceId, userId]);

  useEffect(() => {
    let valid = true;
    supabase.auth.getUser().then(({ data }) => {
      if (valid) { setUserId(data.user?.id || null); setAuthLoaded(true); }
    }).catch(() => { if (valid) setAuthLoaded(true); });
    const { data } = supabase.auth.onAuthStateChange((_ev, session) => {
      if (valid) setUserId(session?.user?.id ?? null);
    });
    return () => { valid = false; data.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    setAssignment(null); setClock(null); setMarks([]); setNotice(null);
    if (!userId || !raceId) return;
    let valid = true;
    call<Assignment[]>("rc_timing_me").then(all => {
      if (!valid) return;
      const a = all.find(x => x.race_id === raceId) || null;
      setAssignment(a);
      if (a) setCaptureMode(a.role === "finish" ? "fast" : "direct");
      if (!a) setNotice({ kind: "warn", text: "Esta cuenta no está asignada a la carrera. Solicita acceso al administrador." });
    }).catch(e => { if (valid) setNotice({ kind: "error", text: msgError(e) }); });
    return () => { valid = false; };
  }, [userId, raceId]);

  useEffect(() => {
    if (!userId) return;
    try {
      const raw = JSON.parse(localStorage.getItem(queueKey) || "[]") as Pending[];
      setPending(Array.isArray(raw) ? raw : []);
    } catch { setPending([]); }
  }, [queueKey, userId]);
  useEffect(() => {
    if (!userId) return;
    try {
      const saved = JSON.parse(localStorage.getItem(tapKey) || "[]") as Tap[];
      setTaps(Array.isArray(saved) ? saved : []);
    } catch { setTaps([]); }
  }, [tapKey, userId]);
  const saveTaps = useCallback((update: (old: Tap[]) => Tap[]) => {
    setTaps(old => {
      const next = update(old);
      try { localStorage.setItem(tapKey, JSON.stringify(next)); }
      catch { setNotice({kind:"error",text:"No se pueden conservar las capturas localmente. Utiliza planilla de respaldo."}); }
      return next;
    });
  }, [tapKey]);
  // Recuperación de taps ya recibidos en servidor, pero aún sin dorsal.
  useEffect(() => {
    if (!assignment) return;
    let valid = true;
    void call<Tap[]>("rc_timing_open_taps", {p_race_id:raceId}).then(remote => {
      if (!valid || !remote.length) return;
      saveTaps(old => {
        const found = new Map<string,Tap>(remote.map(x => [x.request_id,{...x,stored:true}]));
        old.forEach(x => found.set(x.request_id, {...found.get(x.request_id),...x,stored:found.has(x.request_id) || x.stored}));
        return [...found.values()].sort((a,b) => a.observed_at.localeCompare(b.observed_at));
      });
    }).catch(() => {});
    return () => { valid=false; };
  }, [assignment, raceId, saveTaps]);
  const saveQueue = useCallback((update: (old: Pending[]) => Pending[]) => {
    setPending(old => {
      const next = update(old);
      try { localStorage.setItem(queueKey, JSON.stringify(next)); } catch {
        // Sin espacio, el operador debe recurrir a un registro manual.
        setNotice({ kind: "error", text: "Sin espacio local. Anota dorsal y hora en planilla de respaldo." });
      }
      return next;
    });
  }, [queueKey]);

  const syncClock = useCallback(async () => {
    if (!assignment) return;
    // Mejor muestra de 4 RTT; sincronización aproximada tipo NTP.
    let best: { rtt: number; offset: number; data: ClockState } | null = null;
    for (let i = 0; i < 4; i++) {
      const t0 = Date.now();
      try {
        const data = await call<ClockState>("rc_timing_clock", { p_race_id: raceId });
        const t1 = Date.now();
        const rtt = t1 - t0;
        const offset = new Date(data.server_now).getTime() - (t0 + t1) / 2;
        if (!best || rtt < best.rtt) best = { rtt, offset, data };
      } catch (e) {
        if (i === 3 && !best) throw e;
      }
    }
    if (!best) return;
    offsetRef.current = best.offset;
    rttRef.current = best.rtt;
    setClockRtt(best.rtt);
    // Identifica la salida oficial, no el tiempo del navegador. Tras un
    // reinicio, elimina únicamente colas LOCALMENTE antiguas de este operador.
    // El backend además rechaza marcas anteriores a la nueva salida oficial.
    const currentRun = best.data.started_at || "ready";
    try {
      const seenRun = localStorage.getItem(runKey);
      if (seenRun !== null && seenRun !== currentRun) {
        localStorage.removeItem(queueKey);
        localStorage.removeItem(tapKey);
        setPending([]);
        setTaps([]);
        setTapBib({});
        setNotice({kind:"warn",text:"Nueva sesión detectada: se descartaron las capturas locales de una prueba anterior en este dispositivo."});
      }
      localStorage.setItem(runKey, currentRun);
    } catch {
      setNotice({kind:"warn",text:"No se pudo revisar el almacenamiento local. Comprueba las colas antes de capturar."});
    }
    setClock(best.data);
    lastClockRef.current = best.data;
    readyRef.current = true;
  }, [assignment, raceId, queueKey, tapKey, runKey]);

  const refreshMarks = useCallback(async () => {
    if (!assignment) return;
    try { setMarks(await call<Mark[]>("rc_timing_list", { p_race_id: raceId })); }
    catch (e) { if (navigator.onLine) setNotice({ kind: "warn", text: `No se actualizó el monitor: ${msgError(e)}` }); }
  }, [assignment, raceId]);

  useEffect(() => {
    if (!assignment) return;
    void syncClock().catch(e => setNotice({ kind: "error", text: `Error reloj: ${msgError(e)}` }));
    void refreshMarks();
    const pollMarks = window.setInterval(() => { void refreshMarks(); }, 4500);
    const pollClock = window.setInterval(() => { void syncClock().catch(() => {}); }, 20000);
    const tick = window.setInterval(() => setNowMs(Date.now() + offsetRef.current), 40);
    const onNet = () => setOnline(navigator.onLine);
    window.addEventListener("online", onNet); window.addEventListener("offline", onNet);
    return () => {
      clearInterval(pollMarks); clearInterval(pollClock); clearInterval(tick);
      window.removeEventListener("online", onNet); window.removeEventListener("offline", onNet);
    };
  }, [assignment, syncClock, refreshMarks]);

  const flushQueue = useCallback(async (items: Pending[]) => {
    if (!assignment || flushingRef.current || !navigator.onLine || !items.length) return;
    flushingRef.current = true;
    try {
      for (const item of items) {
        try {
          const outcome = await call<{ status: string; needs_review?: boolean; checkpoint: Point; elapsed_ms?: number; bib: string }>(
            "rc_timing_capture", {
              p_race_id: raceId, p_bib: item.bib, p_checkpoint: item.checkpoint,
              p_observed_at: item.observed_at, p_round_trip_ms: item.rtt,
              p_request_id: item.request_id,
            }
          );
          saveQueue(old => old.filter(x => x.request_id !== item.request_id));
          setNotice({
            kind: outcome.status === "duplicate" ? "warn" : outcome.needs_review ? "warn" : "ok",
            text: outcome.status === "duplicate"
              ? `Dorsal #${outcome.bib} ya tenía marca en ${outcome.checkpoint.toUpperCase()}. No se duplicó.`
              : outcome.needs_review
                ? `#${outcome.bib} guardado, PENDIENTE DE REVISIÓN por desfase o conectividad.`
                : `Dorsal #${outcome.bib} · ${outcome.checkpoint.toUpperCase()} · ${formatMs(outcome.elapsed_ms)} guardado.`,
          });
        } catch (e) {
          if (networkError(e)) break; // La conexión puede recuperarse.
          // Rechazo de validación: no insistir infinitamente, pero informar.
          setNotice({ kind: "error", text: `Dorsal #${item.bib}: ${msgError(e)}. Verifica el registro.` });
          saveQueue(old => old.filter(x => x.request_id !== item.request_id));
        }
      }
      void refreshMarks();
    } finally { flushingRef.current = false; }
  }, [assignment, raceId, refreshMarks, saveQueue]);

  useEffect(() => {
    if (!assignment || !pending.length) return;
    const id = window.setInterval(() => { void flushQueue(pending); }, 6500);
    return () => clearInterval(id);
  }, [assignment, pending, flushQueue]);

  const flushTaps = useCallback(async (items: Tap[]) => {
    if (!assignment || !navigator.onLine || tapFlushingRef.current || !items.length) return;
    tapFlushingRef.current = true;
    try {
      for (const item of items) {
        try {
          if (!item.stored) {
            await call("rc_timing_tap", {
              p_race_id:raceId, p_checkpoint:item.checkpoint,
              p_observed_at:item.observed_at, p_round_trip_ms:item.rtt,
              p_request_id:item.request_id,
            });
            saveTaps(old => old.map(x => x.request_id === item.request_id ? {...x,stored:true} : x));
          }
          if (item.bib) {
            const result = await call<{status:string;bib:string;checkpoint:Point;needs_review?:boolean;elapsed_ms?:number}>("rc_timing_attach_tap", {
              p_race_id:raceId, p_request_id:item.request_id, p_bib:item.bib,
            });
            saveTaps(old => old.filter(x => x.request_id !== item.request_id));
            setNotice({kind:result.status === "saved" && !result.needs_review ? "ok" : "warn",
              text:result.status === "saved"
                ? result.needs_review ? `#${result.bib} guardado, pendiente de revisión.` : `#${result.bib} · ${formatMs(result.elapsed_ms)} guardado desde Fast-tap.`
                : `#${result.bib}: llegada ya registrada. No se duplicó.`});
            void refreshMarks();
          }
        } catch (e) {
          if (networkError(e)) break;
          setNotice({kind:"error",text:`Fast-tap: ${msgError(e)}. Corrige el dorsal o revisa el registro.`});
          // No descartar un TAP: la hora ya capturada debe poder recuperarse.
          // Si el servidor rechazó el dorsal, quitar asignación para reintentar.
          saveTaps(old => old.map(x => x.request_id===item.request_id ? {...x,bib:undefined} : x));
        }
      }
    } finally { tapFlushingRef.current=false; }
  }, [assignment,raceId,refreshMarks,saveTaps]);

  useEffect(() => {
    if (!assignment || !taps.length) return;
    const timer = window.setInterval(() => { void flushTaps(taps.filter(x => !x.stored || !!x.bib)); }, 6500);
    return () => clearInterval(timer);
  }, [assignment,taps,flushTaps]);

  const fastTap = () => {
    if (!assignment || !clock || clock.status !== "running" || !readyRef.current) {
      setNotice({kind:"error",text:"Espera al inicio oficial y a la sincronización horaria."}); return;
    }
    const item:Tap = {request_id:crypto.randomUUID(),checkpoint:assignment.role === "km5" ? "km5" : "finish",
      observed_at:new Date(Date.now()+offsetRef.current).toISOString(),rtt:rttRef.current};
    saveTaps(old => [...old,item]);
    void flushTaps([item]);
  };
  const assignTap = (item:Tap) => {
    const number = (tapBib[item.request_id] || "").trim();
    if (!/^\d{1,10}$/.test(number) || Number(number) === 0) {
      setNotice({kind:"error",text:"Introduce un dorsal numérico válido para ese cruce."}); return;
    }
    const updated = {...item,bib:number};
    saveTaps(old => old.map(x => x.request_id===item.request_id ? updated : x));
    setTapBib(old => ({...old,[item.request_id]:""}));
    void flushTaps([updated]);
  };

  const login = async (e: React.FormEvent) => {
    e.preventDefault(); setLoginBusy(true); setNotice(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(), password: loginPassword,
    });
    setLoginBusy(false);
    if (error) setNotice({ kind: "error", text: error.message });
    else { setLoginPassword(""); inputRef.current?.focus(); }
  };
  const logout = async () => { await supabase.auth.signOut(); setAssignment(null); setClock(null); };

  const record = async (e: React.FormEvent) => {
    e.preventDefault();
    const entered = bib.trim();
    if (!/^\d{1,10}$/.test(entered) || Number(entered) === 0) {
      setNotice({ kind: "error", text: "Introduce un dorsal numérico válido." }); return;
    }
    if (!assignment || !clock || clock.status !== "running") {
      setNotice({ kind: "error", text: "El reloj oficial todavía no está en marcha." }); return;
    }
    if (!readyRef.current || clockRtt === null) {
      setNotice({ kind: "error", text: "Sin sincronización horaria. Reconecta antes de registrar." }); return;
    }
    // Marca TOMADA en el instante del evento, no tras esperar a Supabase.
    const item: Pending = {
      bib: entered,
      checkpoint: assignment.role === "km5" ? "km5" : "finish",
      observed_at: new Date(Date.now() + offsetRef.current).toISOString(),
      rtt: rttRef.current,
      request_id: crypto.randomUUID(),
    };
    setBib(""); inputRef.current?.focus();
    saveQueue(old => [...old, item]);
    setSaving(true);
    await flushQueue([item]);
    setSaving(false);
  };

  const control = async (type: "start" | "close" | "toggle5k") => {
    if (!assignment || assignment.role !== "admin" || !clock) return;
    if (type === "start" && !window.confirm("¿Confirmas la SALIDA OFICIAL? Para reiniciar una prueba será obligatorio cerrar el evento, respaldar y confirmar desde Dirección.")) return;
    if (type === "close" && !window.confirm("¿Cerrar definitivamente la carrera? No se admitirán nuevas marcas.")) return;
    setBusyControl(true);
    try {
      if (type === "start") await call("rc_timing_start", { p_race_id: raceId });
      if (type === "close") await call("rc_timing_close", { p_race_id: raceId });
      if (type === "toggle5k") await call("rc_timing_config_5k", {
        p_race_id: raceId, p_at_km5: !clock.five_k_finish_at_km5,
      });
      await syncClock();
      setNotice({ kind: "ok", text: type === "start" ? "Salida oficial registrada en servidor." : type === "close" ? "Carrera cerrada." : "Configuración 5K actualizada." });
    } catch (e) { setNotice({ kind: "error", text: msgError(e) }); }
    finally { setBusyControl(false); }
  };

  // V1.5: Reinicio de PRUEBAS (solo Dirección), nunca por DELETE del navegador.
  // rc_timing_reset() valida rol y carrera, archiva en la misma transacción,
  // y falla si el estado cambió o hay otro proceso escribiendo.
  const openReset = async () => {
    if (!assignment || assignment.role !== "admin" || !clock || !online) return;
    if (clock.status === "running") {
      setNotice({kind:"warn",text:"Primero cierra la prueba desde Dirección y espera al menos 15 segundos."});
      return;
    }
    setResetOpen(true);
    setResetPhrase("");
    setResetAgreed(false);
    setResetPreview(null);
    setResetLoading(true);
    try {
      const preview = await call<ResetPreview>("rc_timing_reset_preview",{p_race_id:raceId});
      setResetPreview(preview);
    } catch(e) {
      setNotice({kind:"error",text:`No se puede preparar el reinicio: ${msgError(e)}. Comprueba que instalaste la migración de reinicio.`});
      setResetOpen(false);
    } finally { setResetLoading(false); }
  };
  const resetRace = async () => {
    if (!assignment || assignment.role !== "admin" || !clock || !resetPreview ||
        !online || clock.status === "running" || !resetPreview.can_reset ||
        !resetAgreed || resetPhrase.trim() !== "REINICIAR PRUEBA") return;
    setResetLoading(true);
    try {
      const result = await call<ResetResult>("rc_timing_reset",{
        p_race_id:raceId,
        p_expected_started_at:resetPreview.started_at,
        p_confirmation:"REINICIAR PRUEBA",
      });
      try {
        localStorage.removeItem(queueKey);
        localStorage.removeItem(tapKey);
        localStorage.setItem(runKey,"ready");
      } catch {
        // El servidor ya confirmó el reinicio; un error de almacenamiento
        // local NO debe presentarse como un fallo del reinicio oficial.
      }
      setPending([]);setTaps([]);setTapBib({});setMarks([]);
      setResetOpen(false);setResetPreview(null);setResetPhrase("");setResetAgreed(false);
      setNotice({kind:"ok",text:`Prueba reiniciada en servidor. Respaldo ${result.backup_id}. Marcas archivadas: ${result.marks_archived}.`});
      try { await syncClock(); await refreshMarks(); }
      catch {
        setNotice({kind:"warn",text:`Reinicio CONFIRMADO en servidor (respaldo ${result.backup_id}). No se pudo actualizar la pantalla: vuelve a sincronizar antes de empezar otra prueba.`});
      }
    } catch(e) {
      // No hacemos reintentos automáticos en un reinicio.
      setNotice({kind:"error",text:`Reinicio no confirmado: ${msgError(e)}. Actualiza el reloj ANTES de volver a intentar.`});
      setResetOpen(false);
      void syncClock().catch(()=>{});
    } finally {setResetLoading(false);}
  };

  const approve = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editMark) return;
    if (editReason.trim().length < 6) {
      setNotice({ kind: "error", text: "El motivo de revisión requiere al menos 6 caracteres." }); return;
    }
    setBusyControl(true);
    try {
      const corrected = editTime.trim() ? new Date(editTime).toISOString() : null;
      await call("rc_timing_review", {
        p_mark_id: editMark.id, p_reason: editReason,
        p_corrected_at: corrected,
      });
      setEditMark(null); setEditReason(""); setEditTime("");
      await refreshMarks();
      setNotice({ kind: "ok", text: "Marca revisada. La corrección quedó en auditoría." });
    } catch (err) { setNotice({ kind: "error", text: msgError(err) }); }
    finally { setBusyControl(false); }
  };

  const startedMs = clock?.started_at ? new Date(clock.started_at).getTime() : null;
  const elapsed = startedMs == null ? 0 : Math.max(0, (clock?.closed_at ? new Date(clock.closed_at).getTime() : nowMs) - startedMs);
  const activeRole: Role | null = assignment?.role || null;
  const myPoint: Point = activeRole === "km5" ? "km5" : "finish";
  const registered = marks.filter(m => m.checkpoint === myPoint);
  const pendingReview = marks.filter(m => m.needs_review);
  const isAdmin = activeRole === "admin";
  const isOperator = activeRole === "km5" || activeRole === "finish";
  const dateDisplay = clock?.started_at ? new Date(clock.started_at).toLocaleString("es-VE", { dateStyle: "medium", timeStyle: "medium" }) : "Esperando salida";

  if (!authLoaded) return <div className="rc-glass-page rc-timing-center"><RefreshCw className="rc-spin" /> Verificando sesión…</div>;

  if (!userId) return (
    <div className="rc-glass-page rc-timing-center">
      <div className="rc-login-card rc-glass">
        <div className="rc-eyebrow"><ShieldCheck size={14} /> RAYOCERO · CONTROL DE ACCESO</div>
        <div className="rc-brand-icon"><Timer size={29} /></div>
        <h1 className="rc-heading">RACE<span>CONTROL.</span></h1>
        <p className="rc-muted">Cronometraje manual · Caninata 5K / Carrera 10K</p>
        <form onSubmit={login} className="rc-form-stack">
          <label>Correo del operador<input type="email" autoComplete="username" required value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="operador@rayocero.com" /></label>
          <label>Contraseña<input type="password" autoComplete="current-password" required value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="••••••••••••" /></label>
          {notice && <div className={`rc-alert ${notice.kind}`}>{notice.text}</div>}
          <button className="rc-btn rc-btn-primary" type="submit" disabled={loginBusy}><LockKeyhole size={16} /> {loginBusy ? "Autenticando…" : "Ingresar al puesto"} <ArrowRight size={16} /></button>
        </form>
        <p className="rc-tiny">Usuario personal · Cada marca queda asociada a su operador.</p>
      </div>
    </div>
  );

  return (
    <div className="rc-glass-page">
      <div className="rc-glass-shell">
        <header className="rc-topbar rc-glass">
          <div className="rc-brand"><div className="rc-brand-icon small"><Dog size={22} /></div><div><strong>RAYOCERO <span>RACE CONTROL</span></strong><small>VALKYRON GROUP / CANINATA 2026</small></div></div>
          <div className="rc-top-actions">
            <span className={`rc-status ${clock?.status === "running" ? "live" : ""}`}><span className="rc-dot" /> {clock?.status === "running" ? "EN VIVO" : clock?.status === "closed" ? "FINALIZADA" : "EN ESPERA"}</span>
            <span className={`rc-connection ${online ? "" : "offline"}`}>{online ? <Wifi size={15} /> : <WifiOff size={15} />} <span>{online ? "Online" : "Sin red"}</span></span>
            <button className="rc-icon-btn" onClick={() => void logout()} title="Cerrar sesión"><LogOut size={17} /></button>
          </div>
        </header>
        <main className="rc-main">
          <div className="rc-section-heading"><div><p className="rc-eyebrow"><Activity size={14} /> EVENT TIMING SYSTEM</p><h1>Centro de <span>cronometraje.</span></h1><p className="rc-muted">{assignment?.label || "Operación RayoCero"} · {isAdmin ? "Dirección de carrera" : isOperator ? myPoint === "km5" ? "Punto de control KM 5" : "Registro de meta" : "Sin puesto asignado"}</p></div><div className="rc-header-badge"><ShieldCheck size={18} /> {activeRole?.toUpperCase() || "SIN ROL"}</div></div>
          {notice && <div role="alert" className={`rc-alert ${notice.kind}`}><span>{notice.text}</span><button onClick={() => setNotice(null)} aria-label="Cerrar aviso"><X size={16} /></button></div>}
          {!assignment && <div className="rc-glass rc-empty"><AlertTriangle size={24} /> Sin asignación para esta carrera. El administrador debe crear la cuenta en Supabase Auth y asignarla en rc_timing_staff.</div>}
          {assignment && <>
            <div className="rc-clock-grid">
              <section className="rc-clock-panel rc-glass">
                <div className="rc-card-head"><span><Clock3 size={16} /> CRONÓMETRO OFICIAL</span><span>HORA SERVIDOR <span className="rc-mono">{new Date(nowMs).toLocaleTimeString("es-VE", { hour12: false })}</span></span></div>
                <div className="rc-primary-time" aria-live="off">{clock?.status === "ready" || !clock ? "00:00:00.000" : formatMs(elapsed)}</div>
                <div className="rc-clock-footer"><span><Flag size={15} /> {dateDisplay}</span><span><Gauge size={15} /> RTT {clockRtt == null ? "—" : `${clockRtt} ms`}</span></div>
                {isAdmin && <div className="rc-clock-controls">
                  {clock?.status === "ready" && <button className="rc-btn rc-btn-primary" onClick={() => void control("start")} disabled={busyControl || !online}><Zap size={18} /> INICIAR SALIDA OFICIAL</button>}
                  {clock?.status === "running" && <button className="rc-btn rc-btn-dark" onClick={() => void control("close")} disabled={busyControl}>Cerrar evento</button>}
                  {clock?.status === "closed" && <span className="rc-muted"><CheckCircle2 size={16} /> Evento cerrado. Si fue una prueba, puedes reiniciarla desde Dirección.</span>}
                </div>}
              </section>
              <div className="rc-stat-grid">
                <div className="rc-glass rc-stat"><span>KM 5 / SPLITS</span><strong>{marks.filter(x => x.checkpoint === "km5").length}</strong><small>Registros totales</small></div>
                <div className="rc-glass rc-stat"><span>META / FINISH</span><strong>{marks.filter(x => x.checkpoint === "finish").length}</strong><small>Llegadas registradas</small></div>
                <div className="rc-glass rc-stat"><span>REVISIÓN</span><strong className={pendingReview.length ? "rc-warning" : ""}>{pendingReview.length}</strong><small>Marcas no publicadas</small></div>
                <div className="rc-glass rc-stat"><span>COLA LOCAL</span><strong>{pending.length}</strong><small>Pendientes de sincronización</small></div>
              </div>
            </div>
            {isAdmin && <section className="rc-glass rc-settings"><div><h2>Configuración de la Caninata 5K</h2><p>¿El arco ubicado en KM 5 es también la meta oficial de 5K? Activar convierte su registro KM5 en FINISH para dorsales 5K.</p></div><label className="rc-toggle"><input type="checkbox" checked={clock?.five_k_finish_at_km5 || false} disabled={clock?.status !== "ready" || busyControl} onChange={() => void control("toggle5k")} /><span /> <b>{clock?.five_k_finish_at_km5 ? "SÍ" : "NO"}</b></label></section>}
            {isAdmin && <section className="rc-dir-actions" aria-label="Dirección de carrera">
              <div className="rc-glass rc-dir-card">
                <div className="rc-dir-heading"><div className="rc-dir-icon"><ShieldCheck size={22}/></div><div><div className="rc-dir-kicker">DIRECCIÓN / CONTROL DE MISIÓN</div><h3>Estado de operación</h3><p>El reloj maestro y las estaciones KM5 / Meta responden a una misma sesión de carrera.</p></div></div>
                <div className="rc-dir-meta"><span className="rc-dir-pill">ESTADO: {clock?.status?.toUpperCase() || "SIN SINCRONIZAR"}</span><span className="rc-dir-pill">{marks.length} marcas</span><span className="rc-dir-pill">{pendingReview.length} por revisar</span></div>
                <p className="rc-muted">Antes de reiniciar, confirma que los operadores cerraron la prueba y no mantienen capturas sin enviar.</p>
              </div>
              <div className="rc-glass rc-dir-card">
                <div className="rc-dir-heading"><div className="rc-dir-icon warn"><RotateCcw size={23}/></div><div><div className="rc-dir-kicker">MANTENIMIENTO CONTROLADO / SOLO PRUEBAS</div><h3>Reiniciar carrera de prueba</h3><p>Respalda las marcas, Fast-taps y auditoría de esta carrera y vuelve a 00:00:00, sin alterar inscritos, pagos, kits ni usuarios.</p></div></div>
                <button type="button" className="rc-dir-btn" onClick={()=>void openReset()} disabled={busyControl || resetLoading || !online || !clock || clock.status === "running"}><RotateCcw size={17}/> REINICIAR PRUEBA</button>
                <p className="rc-dir-note">{clock?.status === "running" ? "Primero pulsa ‘Cerrar evento’, espera 15 s y desconecta los puestos." : "Disponible únicamente para Dirección y tras una doble confirmación."}</p>
              </div>
            </section>}
            {isOperator && <section className="rc-glass rc-capture">
              <div className="rc-capture-heading"><div><p className="rc-eyebrow"><Smartphone size={14} /> {myPoint === "km5" ? "SPLIT STATION 05" : "FINISH LINE"}</p><h2>{myPoint === "km5" ? "Control KM 5" : "Línea de meta"}</h2><p className="rc-muted">Escribe el dorsal y pulsa Registrar en el instante exacto del paso.</p></div><span className="rc-point-icon">{myPoint === "km5" ? "05" : <Flag size={32} />}</span></div>
              <div className="rc-capture-modes"><button type="button" className={captureMode === "direct" ? "active" : ""} onClick={() => setCaptureMode("direct")}>Dorsal + marca</button><button type="button" className={captureMode === "fast" ? "active" : ""} onClick={() => setCaptureMode("fast")}>Fast-tap · marcar primero</button></div>
              {captureMode === "direct" ? <form className="rc-capture-form" onSubmit={record}><label htmlFor="rc-bib">DORSAL / BIB NUMBER</label><div className="rc-entry-row"><input id="rc-bib" autoFocus ref={inputRef} type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off" placeholder="0000" value={bib} onChange={e => setBib(e.target.value)} /><button type="submit" className="rc-btn rc-btn-primary" disabled={!bib.trim() || clock?.status !== "running" || saving}><Zap size={20} /> REGISTRAR PASO</button></div></form>
              : <div className="rc-fast-capture"><button className="rc-fast-tap" type="button" disabled={clock?.status !== "running"} onClick={fastTap}><Clock3 size={30} /><strong>MARCAR CRUCE</strong><small>Pulsa por cada persona al cruzar. Asocia los dorsales después.</small></button><div className="rc-fast-list"><div className="rc-fast-list-title">CRUCES SIN ASIGNAR <span>{taps.length}</span></div>{taps.slice().sort((a,b) => a.observed_at.localeCompare(b.observed_at)).map((t,i) => <div className="rc-fast-row" key={t.request_id}><div className="rc-fast-stamp"><small>#{i+1} · {t.stored ? "En servidor" : "Pendiente de envío"}</small><strong>{formatMs(startedMs ? new Date(t.observed_at).getTime()-startedMs : 0)}</strong></div><form onSubmit={e => {e.preventDefault();assignTap(t);}}><input aria-label={`Dorsal del cruce ${i+1}`} inputMode="numeric" placeholder="Dorsal" value={tapBib[t.request_id] ?? t.bib ?? ""} onChange={e=>setTapBib(o=>({...o,[t.request_id]:e.target.value}))} /><button className="rc-btn rc-btn-primary" type="submit">ASIGNAR</button></form></div>)}{taps.length===0 && <p className="rc-muted">Los cruces capturados aparecerán aquí para asociar el dorsal sin perder la hora.</p>}</div></div>}
              <div className="rc-operation-hint">{clock?.status !== "running" ? <><AlertTriangle size={16} /> Espera a que dirección inicie la salida.</> : <><CheckCircle2 size={16} /> Hora capturada en el toque. Cada dorsal se acepta una sola vez por punto.</>}{pending.length > 0 && <button className="rc-text-button" onClick={() => void flushQueue(pending)}>Reintentar {pending.length} en cola</button>}</div>
            </section>}
            <section className="rc-glass rc-table-card"><div className="rc-table-head"><div><p className="rc-eyebrow"><Activity size={13} /> LIVE ACTIVITY</p><h2>{isAdmin ? "Monitor general" : "Últimos registros"}</h2></div><button className="rc-btn rc-btn-subtle" onClick={() => { void refreshMarks(); void syncClock(); }}><RefreshCw size={15} /> Actualizar</button></div>
              <div className="rc-table-scroll"><table className="rc-table"><thead><tr><th>Dorsal</th><th>Atleta</th><th>Distancia</th><th>Punto</th><th>Tiempo</th><th>Estado</th>{isAdmin && <th>Acción</th>}</tr></thead><tbody>
                {(isAdmin ? marks : registered).slice(0, 100).map(m => <tr key={m.id}><td><strong className="rc-bib">#{m.bib}</strong></td><td>{m.name}</td><td><span className="rc-chip">{m.modality}</span></td><td>{m.checkpoint === "finish" ? "Meta" : "KM 5"}</td><td className="rc-time-cell">{formatMs(Number(m.elapsed_ms))}</td><td><span className={`rc-mark-status ${m.needs_review ? "review" : "confirmed"}`}>{m.needs_review ? "Revisar" : "Confirmado"}</span></td>{isAdmin && <td><button className="rc-text-button" onClick={() => { setEditMark(m); setEditTime(""); setEditReason(""); }}>Auditar / corregir</button></td>}</tr>)}
                {(isAdmin ? marks : registered).length === 0 && <tr><td colSpan={isAdmin ? 7 : 6} className="rc-empty-cell">Todavía no hay marcas registradas.</td></tr>}
              </tbody></table></div><div className="rc-table-foot">Muestra los últimos 100 registros · Actualización cada 4,5 s · {marks.length} marcas en base de datos</div>
            </section>
          </>}
          <footer className="rc-footer">RAYOCERO TIMING SYSTEM <span>•</span> VALKYRON GROUP <span>•</span> CAPTURA MANUAL CON AUDITORÍA</footer>
        </main>
      </div>
      {resetOpen && isAdmin && <div className="rc-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget && !resetLoading) setResetOpen(false);}}>
        <form className="rc-reset-modal rc-glass" role="dialog" aria-modal="true" aria-label="Reiniciar carrera de prueba" onSubmit={e=>{e.preventDefault();void resetRace();}}>
          <div className="rc-modal-head"><div className="rc-reset-title"><div className="rc-dir-icon warn"><RotateCcw size={22}/></div><div><h2>Reiniciar carrera de prueba</h2><p>Esta acción requiere una sesión cerrada. El servidor crea un respaldo antes de limpiar las marcas.</p></div></div><button type="button" disabled={resetLoading} onClick={()=>setResetOpen(false)} aria-label="Cancelar"><X size={20}/></button></div>
          <div className="rc-dir-meta"><span className="rc-dir-pill">CANINATA BARQUISIMETO</span><span className="rc-dir-pill">{resetPreview?.status?.toUpperCase() || "CARGANDO"}</span></div>
          {resetLoading && !resetPreview && <p className="rc-reset-busy"><RefreshCw size={16} className="rc-spin"/> Consultando estado y registros afectados…</p>}
          {resetPreview && <>
            <div className="rc-reset-preview"><div><strong>{resetPreview.marks_count}</strong><span>Marcas</span></div><div><strong>{resetPreview.taps_count}</strong><span>Fast-taps</span></div><div><strong>{resetPreview.audit_count}</strong><span>Auditorías</span></div></div>
            <p className="rc-muted">Los datos anteriores se archivan en Supabase con un identificador de respaldo. No afecta inscritos, dorsales, pagos, comprobantes, kits ni la configuración de 5K.</p>
            {!resetPreview.can_reset && <div className="rc-alert"><AlertTriangle size={17}/> Cierra primero la carrera. No se reinicia un reloj en marcha.</div>}
            <label className="rc-reset-confirm"><input type="checkbox" checked={resetAgreed} onChange={e=>setResetAgreed(e.target.checked)} disabled={resetLoading}/><span>Confirmo que es una <strong>prueba</strong>, que los operadores terminaron sus registros y que entiendo que el reloj y las marcas activas volverán a cero.</span></label>
            <label>Escribe <strong>REINICIAR PRUEBA</strong> para autorizar<input autoComplete="off" value={resetPhrase} onChange={e=>setResetPhrase(e.target.value)} placeholder="REINICIAR PRUEBA" disabled={resetLoading}/></label>
          </>}
          <div className="rc-reset-buttons"><button type="button" className="rc-btn rc-btn-dark" onClick={()=>setResetOpen(false)} disabled={resetLoading}>Cancelar</button><button type="submit" className="rc-dir-btn" disabled={resetLoading || !resetPreview?.can_reset || !resetAgreed || resetPhrase.trim()!=="REINICIAR PRUEBA"}>{resetLoading?<RefreshCw size={16} className="rc-spin"/>:<Archive size={16}/>} {resetLoading ? "Procesando…" : "RESPALDAR Y REINICIAR"}</button></div>
        </form>
      </div>}
      {editMark && isAdmin && <div className="rc-modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setEditMark(null); }}><form className="rc-modal rc-glass" onSubmit={approve} role="dialog" aria-modal="true" aria-label="Auditar marca"><div className="rc-modal-head"><h2>Auditar marca #{editMark.bib}</h2><button type="button" onClick={() => setEditMark(null)} aria-label="Cerrar"><X size={19} /></button></div><p>Registro original: <strong>{formatMs(editMark.elapsed_ms)}</strong> · {editMark.checkpoint.toUpperCase()}</p><label>Fecha y hora local corregida (opcional)<input type="datetime-local" step="0.001" value={editTime} onChange={e => setEditTime(e.target.value)} /></label><label>Motivo obligatorio<input required minLength={6} placeholder="Ej.: Verificado contra video de meta" value={editReason} onChange={e => setEditReason(e.target.value)} /></label><p className="rc-muted">En blanco, aprueba la hora capturada. Si introduces una hora, se guarda el cambio y una entrada de auditoría.</p><button disabled={busyControl} className="rc-btn rc-btn-primary" type="submit"><Check size={16} /> {busyControl ? "Guardando…" : "Aprobar / corregir"}</button></form></div>}
    </div>
  );
}

// ─── ROOT ────────────────────────────────────────────────────────────────────
export default function CaninataDashboard() {
  const [authed, setAuthed] = useState(
    () => localStorage.getItem(LS_KEY) === "1"
  );

  const handleLogout = () => {
    localStorage.removeItem(LS_KEY);
    setAuthed(false);
  };

  if (!authed) return <PinGate onAuth={() => setAuthed(true)} />;
  return <CaninataDashboardMain onLogout={handleLogout} />;
}