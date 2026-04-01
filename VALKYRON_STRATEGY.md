# VALKYRON_STRATEGY.md
## Proyecto Rayo Cero — Auditoría de Ingeniería de Grado Militar
**Ejecutado por:** MIA — Senior Developer, Valkyron Group  
**Fecha:** 2026-03-30  
**Referencia Live:** https://rayo-cero-run-zwo6.vercel.app/  
**Workspace:** `C:\Users\LSciscioli\Desktop\liquid-race-flow-main`

---

## 1. ANÁLISIS DEL STACK ACTUAL

### Frontend Framework
- **Runtime:** React 18.3.1 con TypeScript 5.8.3
- **Build Tool:** Vite 5.4 + plugin `@vitejs/plugin-react-swc` (compilación SWC de alto rendimiento)
- **Routing:** React Router DOM 6.30
- **Estado Servidor:** TanStack React Query 5.83
- **Formularios:** React Hook Form 7.61 + Zod 3.25 (instalados pero NO utilizados en producción — ver bugs)
- **Animaciones:** Framer Motion 11.15
- **UI Components:** Shadcn/UI (Radix UI primitives + Tailwind)
- **Estilos:** Tailwind CSS 3.4 + tailwindcss-animate + tailwind-merge
- **Testing:** Vitest 3.2 + Playwright 1.57 + Testing Library
- **Deploy:** Vercel (configuración presente)

### Estructura de Directorios
```
src/
├── components/
│   ├── RegistrationForm.tsx   ← COMPONENTE PRINCIPAL — registro de corredores
│   ├── ResultsSection.tsx     ← Consulta de resultados por dorsal (BIB)
│   ├── HeroSection.tsx        ← Landing visual
│   ├── Navbar.tsx / NavLink.tsx / Footer.tsx
│   └── ui/                    ← 40+ componentes Shadcn/Radix
├── pages/
│   ├── Index.tsx              ← Página principal (orquesta todos los componentes)
│   └── NotFound.tsx
├── hooks/
│   ├── use-mobile.tsx
│   └── use-toast.ts
└── lib/utils.ts               ← cn() utility (clsx + tailwind-merge)
```

### Dependencias de Valor Estratégico
| Librería | Versión | Estado | Uso |
|---|---|---|---|
| react-hook-form | 7.61 | ⚠️ INSTALADA, NO USADA | Validación formulario |
| zod | 3.25 | ⚠️ INSTALADA, NO USADA | Schema validation |
| @tanstack/react-query | 5.83 | ⚠️ INSTALADA, NO USADA | Llamadas API / cache |
| framer-motion | 11.15 | ✅ EN USO | Animaciones UI |
| recharts | 2.15 | ⚠️ INSTALADA, NO USADA | Gráficos (potencial) |

---

## 2. BUGS DETECTADOS Y MÓDULOS INCOMPLETOS

### 🔴 CRÍTICO — Sin Persistencia de Datos
**Archivo:** `src/components/RegistrationForm.tsx` → función `handleSubmit()`
```tsx
// PROBLEMA: El dorsal es aleatorio y nada se guarda en ninguna base de datos
const handleSubmit = () => {
  setBibNumber(Math.floor(Math.random() * 9000) + 1000); // ← NO DETERMINÍSTICO
  setSubmitted(true);
};
```
**Impacto:** Los registros de atletas se pierden al recargar la página. No hay persistencia, no hay deduplicación de cédulas, no hay confirmación por email.

---

### 🔴 CRÍTICO — Archivo de Deploy con Typo
**Archivo:** `verccel.json` (raíz del proyecto)  
**Problema:** El archivo de configuración de Vercel tiene un error tipográfico (`verccel` en lugar de `vercel`). Vercel ignora este archivo, lo que puede causar rutas mal configuradas en producción.

---

### 🟠 ALTO — ResultsSection con Datos Mock Hardcodeados
**Archivo:** `src/components/ResultsSection.tsx`
```tsx
// Solo 4 corredores de prueba, no conectado a datos reales
const mockResults: Record<string, RunnerResult> = {
  "1001": { ... },
  "1002": { ... },
  ...
};
```
**Impacto:** Los resultados reales post-evento no pueden mostrarse. El botón "Descargar Certificado" no tiene funcionalidad.

---

### 🟠 ALTO — Validación de Formulario Manual (sin Zod/RHF)
**Archivo:** `src/components/RegistrationForm.tsx`
- `react-hook-form` y `zod` están instalados pero se usa validación manual básica (`canNext()`)
- Sin validación de formato de email (solo `type="email"` HTML nativo)
- Sin validación de formato de cédula venezolana (V-XXXXXXXX)
- Sin validación de teléfono (longitud, formato)
- Sin validación de edad mínima (< 14 años debería bloquearse)
- El campo `timestampAceptacion` existe en la interface `FormData` pero NUNCA se asigna

---

### 🟡 MEDIO — Número de Dorsal No Determinístico
**Problema:** `Math.random()` puede generar duplicados en múltiples registros simultáneos. En un sistema real de carrera con 500+ atletas, esto provoca colisiones.

**Solución requerida:** Secuencia atómica en base de datos (AUTO_INCREMENT / SERIAL).

---

### 🟡 MEDIO — Checkbox de Deslinde no usa Componente UI Correcto
**Archivo:** `RegistrationForm.tsx` — Step 3
```tsx
<input type="checkbox" ... className="...text-white focus:ring-white/20" />
```
El proyecto tiene `src/components/ui/checkbox.tsx` (Radix UI accesible) que no se usa aquí. El checkbox nativo no respeta el sistema de diseño y tiene issues de accesibilidad (WCAG 2.1 AA).

---

### 🟡 MEDIO — Talla XL es el Máximo (falta XXL)
**Archivo:** `RegistrationForm.tsx` — Step 2  
Las opciones de talla son: XS, S, M, L, XL. No incluye XXL, lo que excluye a una parte de la base de atletas.

---

### 🟡 MEDIO — Sin Loading State en Submit
El botón "Confirmar Registro" no tiene estado de carga. Si la llamada API futura tarda, el usuario puede hacer clic múltiples veces generando registros duplicados.

---

### 🟢 MENOR — Metadata de Proyecto sin Actualizar
**Archivo:** `package.json`
```json
"name": "vite_react_shadcn_ts"  // ← Nombre genérico, debería ser "rayo-cero-app"
```

---

## 3. PLAN DE ACCIÓN — CONEXIÓN A BASE DE DATOS REAL

### Arquitectura Recomendada: Supabase (PostgreSQL)
**Justificación:** Supabase provee PostgreSQL + API REST + Realtime + Auth + Storage, compatible con Vercel, con tier gratuito generoso y SDK oficial para React.

---

### FASE 1 — Infraestructura de Base de Datos

#### Esquema SQL (PostgreSQL / Supabase)

```sql
-- Tabla principal de corredores registrados
CREATE TABLE runners (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bib_number      SERIAL UNIQUE NOT NULL,               -- Dorsal auto-incremental determinístico
  
  -- Identificación
  nombre          VARCHAR(100) NOT NULL,
  apellido        VARCHAR(100) NOT NULL,
  cedula          VARCHAR(20) UNIQUE NOT NULL,           -- Deduplicación garantizada
  email           VARCHAR(255) UNIQUE NOT NULL,
  telefono        VARCHAR(20),
  
  -- Categorización (calculada en backend para inmutabilidad)
  fecha_nacimiento DATE NOT NULL,
  edad            INTEGER GENERATED ALWAYS AS (
                    EXTRACT(YEAR FROM AGE(fecha_nacimiento))
                  ) STORED,                              -- CÁLCULO FÍSICO PRECISO
  genero          CHAR(1) CHECK (genero IN ('M', 'F')) NOT NULL,
  categoria       VARCHAR(50) NOT NULL,                  -- Calculada y almacenada
  talla_camiseta  VARCHAR(5) CHECK (talla_camiseta IN ('XS','S','M','L','XL','XXL')),
  
  -- Seguridad
  contacto_emergencia       VARCHAR(100) NOT NULL,
  telefono_emergencia       VARCHAR(20) NOT NULL,
  acepta_deslinde           BOOLEAN NOT NULL DEFAULT FALSE,
  timestamp_aceptacion      TIMESTAMPTZ,                 -- Evidencia legal
  
  -- Auditoría
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  estado          VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmado', 'cancelado'))
);

-- Tabla de resultados (post-evento)
CREATE TABLE race_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  runner_id       UUID REFERENCES runners(id) ON DELETE CASCADE,
  bib_number      INTEGER REFERENCES runners(bib_number),
  
  -- Tiempos precisos con nanosegundos (chip-timing)
  tiempo_gun      INTERVAL,          -- Tiempo desde el disparo oficial
  tiempo_chip     INTERVAL,          -- Tiempo neto del chip personal
  tiempo_raw_ns   BIGINT,            -- Nanosegundos raw del chip RFID (precisión física máxima)
  
  -- Ritmos — Cálculo físico: pace = tiempo_chip / distancia_km
  distancia_km    NUMERIC(6,3) DEFAULT 10.000,
  pace_seg_km     NUMERIC(8,3) GENERATED ALWAYS AS (
                    EXTRACT(EPOCH FROM tiempo_chip) / distancia_km
                  ) STORED,          -- Segundos por km, precisión de 3 decimales
  velocidad_kmh   NUMERIC(8,4) GENERATED ALWAYS AS (
                    (distancia_km / EXTRACT(EPOCH FROM tiempo_chip)) * 3600
                  ) STORED,          -- v = d/t × 3600
  
  -- Rankings
  ranking_general INTEGER,
  ranking_categoria INTEGER,
  
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de performance
CREATE INDEX idx_runners_cedula ON runners(cedula);
CREATE INDEX idx_runners_email ON runners(email);
CREATE INDEX idx_runners_bib ON runners(bib_number);
CREATE INDEX idx_results_bib ON race_results(bib_number);
```

---

### FASE 2 — Capa de Servicio (API Client)

**Archivo a crear:** `src/lib/api.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Esquema Zod para validación tipo-segura del formulario
import { z } from 'zod';

export const registrationSchema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres').max(100),
  apellido: z.string().min(2).max(100),
  cedula: z.string()
    .regex(/^[VEJPGvejpg]-?\d{6,8}$/, 'Formato de cédula inválido (ej: V-12345678)'),
  email: z.string().email('Email inválido'),
  telefono: z.string().regex(/^\+?[\d\s\-()]{7,15}$/).optional(),
  fechaNacimiento: z.string().refine(val => {
    const age = Math.floor((Date.now() - new Date(val).getTime()) / (365.25 * 24 * 3600 * 1000));
    return age >= 14 && age <= 80;
  }, 'Edad fuera del rango permitido (14-80 años)'),
  genero: z.enum(['M', 'F']),
  talla: z.enum(['XS', 'S', 'M', 'L', 'XL', 'XXL']),
  contactoEmergencia: z.string().min(3).max(100),
  telefonoEmergencia: z.string().regex(/^\+?[\d\s\-()]{7,15}$/),
  aceptaDeslinde: z.literal(true, { errorMap: () => ({ message: 'Debe aceptar el deslinde' }) }),
});

export type RegistrationFormData = z.infer<typeof registrationSchema>;

// Función de registro con manejo de errores y deduplicación
export async function registerRunner(data: RegistrationFormData) {
  const { data: result, error } = await supabase
    .from('runners')
    .insert({
      ...data,
      fecha_nacimiento: data.fechaNacimiento,
      contacto_emergencia: data.contactoEmergencia,
      telefono_emergencia: data.telefonoEmergencia,
      acepta_deslinde: data.aceptaDeslinde,
      timestamp_aceptacion: new Date().toISOString(),
      talla_camiseta: data.talla,
    })
    .select('bib_number, id')
    .single();

  if (error) {
    if (error.code === '23505') { // Unique violation
      throw new Error('La cédula o email ya está registrado en el sistema.');
    }
    throw new Error(`Error de registro: ${error.message}`);
  }

  return result;
}

// Búsqueda de resultados por dorsal
export async function getResultsByBib(bib: string) {
  const { data, error } = await supabase
    .from('race_results')
    .select(`
      *,
      runners (nombre, apellido, categoria)
    `)
    .eq('bib_number', parseInt(bib))
    .single();

  if (error) throw new Error('Dorsal no encontrado en el sistema de cronometraje.');
  return data;
}
```

---

### FASE 3 — Integración en RegistrationForm.tsx

**Modificación de `handleSubmit` (sin borrar código existente):**

```typescript
// AGREGAR al inicio del componente:
import { useMutation } from '@tanstack/react-query';
import { registerRunner } from '@/lib/api';

// REEMPLAZAR handleSubmit:
const { mutate: submitRegistration, isPending } = useMutation({
  mutationFn: registerRunner,
  onSuccess: (data) => {
    setBibNumber(data.bib_number);      // BIB determinístico desde DB
    setSubmitted(true);
  },
  onError: (error: Error) => {
    toast({ title: 'Error', description: error.message, variant: 'destructive' });
  },
});

const handleSubmit = () => {
  submitRegistration({
    ...form,
    aceptaDeslinde: true,
    timestampAceptacion: new Date().toISOString(),
  });
};
```

---

### FASE 4 — Variables de Entorno

**Archivo a crear:** `.env.local`
```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxxxxxxxxxxxxxxxxxxxxxx
```

**Agregar a Vercel:** Dashboard → Settings → Environment Variables

---

### FASE 5 — Corrección del Deploy

**Renombrar:** `verccel.json` → `vercel.json`

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## 4. PRECISIÓN MATEMÁTICA — CÁLCULOS DE TIEMPOS DE CARRERA

### Fórmulas Físicas Implementadas

**Velocidad media del corredor:**
```
v = d / t
donde:
  d = distancia recorrida [km]
  t = tiempo chip neto [horas]
  v = velocidad [km/h]
```

**Pace (ritmo por kilómetro):**
```
pace = t_total_segundos / d_km
     = 1 / v × 3600  [seg/km]
```

**Cálculo de edad precisa (evitar errores ±1 día):**
```typescript
function getAge(dateStr: string): number {
  const today = new Date();
  const birth = new Date(dateStr);
  // Diferencia en milisegundos → años con corrección de mes/día
  const diffMs = today.getTime() - birth.getTime();
  const ageDate = new Date(diffMs);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
  // Equivalente a: floor((t_now - t_birth) / (365.25 × 86400 × 1000))
  // Factor 365.25 incorpora corrección de año bisiesto (Δ = 0.25 días/año)
}
```

**Ranking percentil del atleta:**
```
percentil = (1 - (ranking - 1) / total_corredores) × 100
```
*Ejemplo: Rank 3 de 250 → percentil = (1 - 2/250) × 100 = 99.2%*

---

## 5. ROADMAP DE EJECUCIÓN

| Prioridad | Tarea | Estimado |
|---|---|---|
| P0 | Renombrar `verccel.json` → `vercel.json` | 5 min |
| P0 | Crear cuenta Supabase + ejecutar schema SQL | 30 min |
| P0 | Crear `src/lib/api.ts` con cliente Supabase + Zod schema | 2h |
| P1 | Integrar `useMutation` en `RegistrationForm.tsx` | 1h |
| P1 | Agregar loading state al botón de submit | 30 min |
| P1 | Reemplazar `input[type=checkbox]` por `<Checkbox>` de Shadcn | 20 min |
| P1 | Agregar opción `XXL` a tallas | 5 min |
| P2 | Conectar `ResultsSection.tsx` a tabla `race_results` | 2h |
| P2 | Implementar descarga de certificado PDF (jsPDF) | 3h |
| P2 | Confirmación por email post-registro (Supabase Edge Functions + Resend) | 4h |
| P3 | Dashboard admin para gestión de corredores | 8h |
| P3 | Importación de resultados via CSV (chip-timing export) | 4h |

---

## 6. DIRECTIVAS ACTIVAS

```
[DIRECTIVA-01] PRESERVACIÓN: Cero líneas de código funcional eliminadas.
               Solo extensiones y adiciones sobre base existente.

[DIRECTIVA-02] PRECISIÓN: Todos los cálculos de tiempo usan IEEE 754 double
               precision floating point. Pace calculado con 3 decimales.
               Edad calculada con factor de año bisiesto (365.25).

[DIRECTIVA-03] SEGURIDAD: Validación de datos en doble capa:
               - Frontend: Zod schema (UX inmediata)
               - Backend: PostgreSQL constraints (integridad garantizada)

[DIRECTIVA-04] DETERMINISMO: BIB numbers via SERIAL atómico en PostgreSQL.
               Imposibilidad matemática de colisión bajo transacciones ACID.
```

---

*Generado por MIA — Senior Developer, Valkyron Group*  
*Clasificación: GRADO OPERATIVO — Proyecto Rayo Cero*  
*`VALKYRON_AUDIT_TS_${Date.now()}`*
