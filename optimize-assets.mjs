// optimize-assets.mjs — ejecutar con: node optimize-assets.mjs
import sharp from 'sharp';
import { readdirSync, mkdirSync } from 'fs';
import { join, extname, basename } from 'path';

const INPUT_DIR  = './src/assets';
const OUTPUT_DIR = './src/assets/webp';

// Prioridad crítica — hero y flyers above-the-fold
const CRITICAL = [
  'led-run-hero.png',
  'flyer-caninata.png',
  'PORTADA_499.png',
  'flyer-coro-inscripciones.png',
  'runner-hero.png',
];

// Resto de flyers pesados
const HEAVY = [
  'flier_premios_info.png',
  'precio.png',
  'fondobg1.png',
  'flier_inscripciones_abiertas.png',
  'dorsal-coro.png',
  'falco-n-2.png',
  'falco-n-1.png',
  'flyer-coro-precios.png',
  'precios-web.png',
  'led-run-kit.png',
  '499_AZUL_CORREDOR_2.png',
  '499_AZUL_CORREDORA.png',
];

mkdirSync(OUTPUT_DIR, { recursive: true });

const convert = async (filename, quality) => {
  const input  = join(INPUT_DIR, filename);
  const output = join(OUTPUT_DIR, basename(filename, extname(filename)) + '.webp');
  try {
    const info = await sharp(input)
      .webp({ quality, effort: 6 })
      .toFile(output);
    const original = (await import('fs')).statSync(input).size;
    const saved = Math.round((1 - info.size / original) * 100);
    console.log(`✅ ${filename} → ${Math.round(info.size/1024)}KB (saved ${saved}%)`);
  } catch (e) {
    console.error(`❌ ${filename}:`, e.message);
  }
};

console.log('\n🔴 CRÍTICOS (hero / above-the-fold):');
for (const f of CRITICAL) await convert(f, 85);

console.log('\n🟠 PESADOS (flyers / below-the-fold):');
for (const f of HEAVY)    await convert(f, 78);