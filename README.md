# IDLORA

**Convertir hardware olvidado en tecnología útil.**

*Un proyecto de Kraenns.*

Infraestructura abierta para reutilizar celulares, tablets y SBC viejos como nodos de cómputo
autónomos que trabajan junto a nuestras PCs.

> Documento de concepto v0.1 · el primer experimento es un Redmi Note 9 con Linux.
> El proyecto es más grande que el teléfono, pero empieza por el teléfono.

**Presentación interactiva → [`site/index.html`](site/index.html)** (abre offline, sin dependencias)

**🌐 Ver online → https://sunshine-gold.github.io/idlora/**

---

## 1. La idea en una página

Hay un cajón en casi todas las casas con un celular viejo adentro. Ese equipo tiene cuatro núcleos,
3 GB de RAM, 64 GB de almacenamiento, WiFi, Bluetooth, sensores y una batería. Es más computadora que
muchos servidores que alguna vez fueron tope de gama.

Hoy ese hardware se descarta o se usa como accesorio: pantalla secundaria, control remoto, app de
Android que depende de la PC encendida.

IDLORA propone otra cosa: **darle al dispositivo un sistema propio, tareas propias y criterio propio.**
Que monitoree, procese, almacene o automatice sin gastar recursos de Windows, y que siga trabajando
cuando la PC ya no está.

La pieza que hace la diferencia es simple de enunciar y difícil de implementar: **una tarea no se
pierde porque la PC se apague.**

---

## 2. Qué es y qué no es

| Es | No es |
|---|---|
| Una arquitectura modular: núcleo + adaptadores + módulos | Un sistema operativo nuevo desde cero |
| Un protocolo de tareas firmadas con permisos acotados | Un control remoto ni una segunda pantalla |
| Un catálogo comunitario de dispositivos, imágenes y proyectos | Un catálogo de promesas sin pruebas |
| Una ética de recuperación obligatoria | Un bypass de seguridad, anti-cheat o cuentas ajenas |
| Una forma de reutilizar hardware existente | Una forma de fabricar hardware nuevo |

---

## 3. Arquitectura

Tres capas, un contrato. Ninguna capa conoce los detalles internos de la otra.

```
┌──────────────────────────┐        ┌──────────────────────────┐        ┌──────────────────────────┐
│  1. CONTROL (PC)         │        │  2. TRANSPORTE           │        │  3. EJECUCIÓN (nodo)     │
│                          │        │                          │        │                          │
│  · Agente local          │ tarea  │  · USB (adb reverse)     │ tarea  │  · Sistema base          │
│  · Política de permisos  │ ─────▶ │  · Red local (TLS mutuo) │ ─────▶ │  · Núcleo (idlora-core)   │
│  · Auditoría             │ ◀───── │  · Cola offline          │ ◀───── │  · Adaptador de hardware │
│                          │result. │                          │result. │  · Módulos               │
└──────────────────────────┘        └──────────────────────────┘        └──────────────────────────┘
```

### 3.1 Núcleo (`idlora-core`)

El mismo código en todos los dispositivos. Recibe una tarea, verifica quién la firmó, la ejecuta,
la mide y devuelve el resultado. No sabe nada específico de ningún teléfono.

- Scheduler de tareas y watchdogs
- Registro de capacidades disponibles
- Cola local persistente (sobrevive reinicios)
- Métricas propias: CPU, RAM, temperatura, uptime

### 3.2 Adaptadores

La capa que traduce entre el núcleo y el hardware concreto. Uno por **familia**, no por modelo.

| Adaptador | Qué permite | Riesgo |
|---|---|---|
| `android-termux` | Fase 0: corre sobre Android stock, sin root | Cero |
| `android-root` | Acceso a sensores, governor, almacenamiento real | Bajo |
| `postmarketos` | Linux nativo en el SoC | Alto |
| `linux-arm64` / `x86` | SBC y PCs recuperadas | Cero |

Un adaptador que no puede hacer algo **lo declara**. No inventa capacidades y no hay caminos alternativos.

### 3.3 Módulos

Donde vive la utilidad. Unidades chicas y reemplazables que declaran qué permisos necesitan y qué
producen.

- **Monitoreo** — sensores de PC y GPU, series temporales, umbrales
- **Almacenamiento** — sincronización de archivos, respaldo, caché
- **Red** — DNS local, proxy de caché, chequeos de disponibilidad
- **Automatización** — reglas «si pasa X, hacé Y»
- **Sensores** — el propio teléfono como nodo físico (luz, movimiento, audio)

---

## 4. El contrato: tareas firmadas

Todo lo que cruza el transporte es una tarea firmada. Nada más.

```json
{
  "id": "tsk_01J8Z3…",
  "module": "gpu-watch",
  "scope": ["gpu:read", "notify:send"],
  "deadline": "2026-11-10T00:00:00Z",
  "params": { "interval_s": 5, "threshold": 83 },
  "sig": "ed25519:…"
}
```

- **`id`** — idempotente: si llega dos veces, se ejecuta una.
- **`scope`** — alcance mínimo. El nodo lo verifica antes de ejecutar y otra vez antes de responder.
- **`deadline`** — una tarea vencida no se ejecuta; se reporta como vencida.
- **`sig`** — solo firmas de dispositivos emparejados son aceptadas.

Del otro lado, el nodo devuelve únicamente estado, resultado y métricas. Nunca su sistema de archivos
ni su shell.

---

## 5. Ejemplo real, de punta a punta

> «Vigilá la GPU cada 5 segundos y avisame si pasa los 83 °C.»

1. Escribís la regla una vez, en la PC.
2. La política valida `gpu:read` y `notify:send`.
3. El agente firma la tarea con vencimiento e ID único.
4. Viaja por USB si está cerca; por red si no; a la cola si no hay enlace.
5. El nodo verifica firma, alcance, versión y deadline. Ejecuta.
6. **Apagás la PC.** El teléfono sigue midiendo, evaluando y guardando la serie.
7. Al volver el enlace: entrega resultados con la hora real del evento, avisa y deja rastro en auditoría.

En un sistema de control remoto, el paso 6 detiene todo. Acá no: el nodo tiene la tarea, el reloj y el
almacenamiento. **La PC es quien pide, no quien sostiene.**

---

## 6. El ecosistema

Un repositorio comunitario donde el conocimiento no queda encerrado en el dispositivo de quien lo creó.

- **Catálogo de dispositivos** — modelo, SoC, RAM, arquitectura, qué niveles funcionan
- **Imágenes y configuraciones** — sistemas, kernels, ajustes, parches
- **Métodos de recuperación** — fastboot, EDL, modo download, firmware stock con hash
- **Módulos** — monitoreo, almacenamiento, red, automatización, cómputo
- **Proyectos completos** — lo que otros construyeron, con fotos y resultados
- **Documentación y límites** — qué no funciona y por qué (tan importante como lo que sí)

Alguien entra, busca su modelo, ve qué puede hacer y encuentra la guía. Después publica lo que armó.

---

## 7. Qué puede construirse

| Proyecto | Con qué alcanza |
|---|---|
| Mini servidor doméstico de archivos | Fase 0/1 |
| Nodo de monitoreo de la PC y la GPU | Fase 0 |
| Centro de automatización del hogar | Fase 0/1 |
| Laboratorio de aprendizaje Linux | Fase 1/2 |
| Procesador auxiliar de tareas largas | Fase 2 |
| Sensores y vigilancia física | Fase 1 |

---

## 8. Compatibilidad: la ficha es el producto

Ningún dispositivo es «compatible» sin evidencia. Cada fila del catálogo es una ficha con pruebas,
límites y procedimiento de recuperación probado.

```json
{
  "id": "xiaomi-redmi-note-9-merlin",
  "hardware": { "soc": "…", "ram_gb": 3, "arch": "arm64" },
  "niveles": {
    "fase0_termux": "verificado",
    "fase1_root":   "en-pruebas",
    "fase2_linux":  "no-soportado"
  },
  "funciona": ["red", "storage", "scheduler"],
  "no_funciona": ["gpu", "modem", "camera"],
  "recuperacion": { "metodo": "fastboot", "probado": true },
  "firmware_stock": { "sha256": "…", "verificado": true }
}
```

Estados posibles: `verificado` · `en-pruebas` · `experimental` · `no-soportado`.
Sin `recuperacion.probado: true`, la ficha no puede pasar de `experimental`.

---

## 9. Seguridad y recuperación

Cuatro pasos de confianza y un quinto que casi nadie documenta.

1. **Emparejamiento** — código de un solo uso, certificado emitido por la CA del hogar. Sin esto, un nodo
   rechaza todo.
2. **Alcance mínimo** — permisos por tarea, deny by default, verificación antes de ejecutar y antes de
   responder.
3. **Auditoría** — todo intento (aceptado o no) queda en un log append-only, local y revocable.
4. **Recuperación** — firmware stock verificado, método de recuperación identificado, anti-rollback
   conocido, y **prueba real de recuperación**, no teórica.
5. **Batería y térmica** — un teléfono de cinco años enchufado 24/7 es un riesgo de incendio. Carga
   limitada, monitoreo de temperatura y retiro de la celda cuando el equipo lo permita.

### Límites duros

- Nada de cuentas ajenas, anti-cheat, DRM ni datos personales del dueño anterior.
- Nada de desactivar verificaciones de seguridad del sistema operativo anfitrión.
- Ningún dispositivo se flashea sin backup verificado y ruta de vuelta documentada.
- Un nodo solo ejecuta tareas firmadas por quien lo emparejó, con los permisos que esa persona aprobó.

---

## 10. Roadmap

Cada fase avanza cuando se cumple su criterio de salida. Sin fechas inventadas.

| Fase | Objetivo | Sale cuando |
|---|---|---|
| **0 · Núcleo sin tocar el teléfono** | Termux + proot, agente y cola funcionando de punta a punta | Una tarea sobrevive al apagado de la PC y sincroniza al volver |
| **1 · Un nodo de verdad** | Servicio persistente, watchdog, carga limitada, métricas | 7 días de uptime sin intervención |
| **2 · Catálogo y contrato público** | Fichas, validador, plantilla de módulo, guía de contribución | Un tercero agrega una ficha válida sin ayuda |
| **3 · Linux real en el Redmi Note 9** | Evaluar postmarketOS / mainline y documentar límites | Imagen reproducible + rollback probado |
| **4 · Segunda familia** | Otro fabricante, solo con adaptador nuevo | Mismo módulo corre en dos plataformas |
| **5 · Comunidad** | Proyectos, revisión por pares, banco de pruebas | Más contribuciones externas que propias |

Detalle honesto: las fases 0 y 1 se pueden hacer ya, sin riesgo. La fase 3 es investigación, no promesa.
Publicar resultados negativos también es parte del proyecto.

---

## 11. Riesgos conocidos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Soporte mainline pobre del SoC (MediaTek) | Fase 3 puede no llegar nunca | Fase 0/1 no lo necesitan; se documenta como limitación |
| Anti-rollback / brick | Equipo inutilizable | Firmware stock verificado + prueba de recuperación previa |
| Batería hinchada en equipos viejos | Seguridad física | Carga limitada, monitoreo térmico, retiro de celda |
| RAM y almacenamiento escasos | Módulos limitados | Cuotas, rotación y módulos chicos por diseño |
| Nodo siempre encendido = consumo y calor | Desgaste | Perfiles de bajo consumo, apagado programado |
| Fragmentación de Android por fabricante | Mucho trabajo por modelo | Adaptadores por familia, no por modelo |
| Proyecto que promete más de lo que prueba | Pérdida de confianza | Estados de compatibilidad con evidencia obligatoria |

---

## 12. Estructura del repositorio

```
idlora/
├── README.md              ← este documento
├── CONTRIBUTING.md
├── subir.ps1              ← publica el repo en GitHub (privado por defecto)
├── SUBIR.cmd              ← doble click para el mismo script
├── site/                  ← presentación interactiva (abre offline)
│   ├── index.html
│   └── assets/
│       ├── styles.css
│       └── app.js
└── docs/
    ├── vision.md
    ├── arquitectura.md
    ├── ecosistema.md
    ├── compatibilidad.md
    ├── seguridad.md
    └── roadmap.md
```

Previsto para cuando el proyecto avance (todavía no existe):

```
core/          núcleo portable
adapters/      android-termux · android-root · postmarketos · linux-arm64
agents/        agente para Windows y Linux
modules/       monitoreo · storage · red · automatización
devices/       fichas JSON + pruebas
images/        recetas de imagen y scripts de instalación
```

---

## 13. Cómo ver la presentación

Abrí `site/index.html` en cualquier navegador. No necesita servidor, ni internet, ni dependencias:
todo está en tres archivos.

Navegación: pestañas arriba, flechas `←` `→`, y cada bloque con borde abre su ficha técnica.

---

## 14. Cómo publicarlo

Doble click en `SUBIR.cmd`, o desde una terminal:

```powershell
.\subir.ps1
```

Hace todo: verifica el repo, crea el repositorio en tu cuenta y sube la rama.
Si `gh` no está logueado, te dice exactamente qué ejecutar (`gh auth login`) y no toca nada.

Opciones: `-Nombre idlora` para elegir el nombre, `-Publico` para crearlo abierto,
`-DryRun` para probar el script sin subir nada.

### Presentación online

El repositorio es **público** y la carpeta `site/` se publica sola con GitHub Pages en cada push
a `main` (workflow en `.github/workflows/pages.yml`).

**https://sunshine-gold.github.io/idlora/**

Ese link lo abre cualquiera, sin cuenta y sin instalar nada. Si el workflow falla la primera vez,
revisá que en *Settings → Pages* la fuente sea **GitHub Actions**.

### Si alguna vez lo volvés privado

GitHub no renderiza HTML adentro de un repo privado, y Pages requiere Pro. Las alternativas son
abrir el repo con `github.dev` (tecla `.`) o mandar la carpeta y abrir `site/index.html`.

---

## 15. Estado del proyecto

**Concepto documentado.** No hay código todavía. Lo que sigue es la fase 0: núcleo mínimo, agente,
cola y una tarea que sobreviva al apagado de la PC.

Si algo de este documento suena a promesa, es un error de redacción: el proyecto se sostiene sobre
lo que se puede probar.
