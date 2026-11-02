# Compatibilidad

## Idea central

«Compatible» no es un sí o un no. Es un conjunto de niveles, cada uno con su estado y su evidencia.

Un teléfono puede ser perfectamente útil en fase 0 (sin root, sin flashear) y no tener nunca Linux
nativo. Eso no lo hace un fracaso: lo hace un nodo de monitoreo y almacenamiento, y está bien.

## Niveles

| Nivel | Qué significa | Riesgo | Reversible |
|---|---|---|---|
| **Fase 0** | Termux + proot sobre Android stock | Cero | Desinstalar |
| **Fase 1** | Acceso root / chroot en Android | Bajo | Restaurar boot.img |
| **Fase 2** | Linux nativo (postmarketOS, Ubuntu Touch, mainline) | Alto | Flashear stock |
| **No soportado** | Documentado como imposible o no intentado | — | — |

## Estados

| Estado | Significado |
|---|---|
| `verificado` | Alguien lo corrió, lo midió y publicó evidencia con fecha |
| `en-pruebas` | Hay avances reales, todavía sin resultados publicados |
| `experimental` | Se sabe que arranca o debería, sin garantías |
| `no-soportado` | Se intentó y no se pudo, o no se recomienda intentarlo |

Ningún estado es una promesa del fabricante. Son estados del proyecto.

## Esquema de ficha

```json
{
  "id": "xiaomi-redmi-note-9-merlin",
  "nombre": "Xiaomi Redmi Note 9",
  "hardware": {
    "soc": "a confirmar",
    "arch": "arm64",
    "ram_gb": 3,
    "storage_gb": 64,
    "bateria": "por verificar estado"
  },
  "niveles": {
    "fase0_termux": "verificado",
    "fase1_root": "en-pruebas",
    "fase2_linux": "no-soportado"
  },
  "funciona": ["red.wifi", "storage", "scheduler", "notify.local"],
  "no_funciona": ["gpu", "modem", "camera", "sensors.raw"],
  "recuperacion": {
    "metodo": "fastboot",
    "firmware_stock": { "id": "…", "sha256": "…", "verificado": true },
    "anti_rollback": "por verificar",
    "probado": false
  },
  "pruebas": [
    { "fecha": "2026-11-02", "autor": "…", "que": "uptime 72 h", "resultado": "ok" }
  ],
  "notas": "…"
}
```

Reglas del esquema:

- `probado: false` en recuperación ⇒ el nivel máximo publicable es `experimental`.
- `no_funciona` es obligatorio y no puede quedar vacío sin justificación.
- Los campos de hardware marcados «a confirmar» deben verificarse contra el equipo físico, no contra
  catálogos de terceros.

## Candidatos iniciales

| Dispositivo | Plataforma | Estado | Camino | Riesgo principal |
|---|---|---|---|---|
| Redmi Note 9 (merlin) | MediaTek Helio G85 | Experimental | Fase 0 hoy; Linux incierto | Soporte mainline; anti-rollback |
| Redmi Note 9S / Pro | Snapdragon 720G | En pruebas | Fase 0 → root → Linux | Drivers del SoC |
| Tablets Android viejas | ARM32/ARM64 | Solo fase 0 | Termux + proot | RAM escasa |
| Raspberry Pi 3/4/5 | ARM64 | Verificado | Linux nativo | Alimentación, calor |
| PC x86 recuperada | x86_64 | Verificado | Linux nativo | Consumo eléctrico |
| Samsung Galaxy A/S antiguos | Exynos / Snapdragon | Experimental | Según modelo | Knox, bootloader |

> Los datos de hardware de esta tabla son preliminares. Se confirman modelo por modelo antes de
> publicarse como ficha oficial.

## Cómo se prueba un dispositivo

1. **Inventario**: confirmar modelo exacto, variante regional, SoC, RAM, almacenamiento.
2. **Respaldo**: firmware stock descargado, hash verificado, guardado fuera del equipo.
3. **Recuperación primero**: probar el camino de vuelta *antes* de modificar nada.
4. **Fase 0**: correr el núcleo en Termux y medir 72 h de uptime.
5. **Fase 1** (opcional): root, sensores, governor, almacenamiento real.
6. **Fase 2** (si hay soporte): imagen nativa, con registro de cada paso.
7. **Publicar**: ficha + pruebas + límites + lo que no anda.

## Plantilla de medición

| Métrica | Cómo |
|---|---|
| Uptime | Días consecutivos sin reinicio no planificado |
| RAM en reposo | `free -m` a los 10 min de arranque |
| Temperatura | Máxima en 24 h de carga típica |
| Consumo | W medidos en el enchufe, promedio 24 h |
| Estabilidad de red | Caídas por día, reconexión automática |
| Recuperación | Tiempo desde brick hasta stock funcional |
