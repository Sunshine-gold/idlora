# Arquitectura

## Vista general

```
 PC (control)              Transporte               Dispositivo (ejecución)
┌───────────────┐        ┌──────────────┐        ┌──────────────────────┐
│ Agente        │ tarea  │ USB          │ tarea  │ Sistema base         │
│ Permisos      │ ─────▶ │ Red local    │ ─────▶ │ Núcleo (relic-core)  │
│ Auditoría     │ ◀───── │ Cola offline │ ◀───── │ Adaptador  ─ Módulos │
└───────────────┘ result └──────────────┘ result └──────────────────────┘
```

Responsabilidades separadas a propósito:

- La **PC** decide *qué* se hace y *quién* puede hacerlo.
- El **transporte** decide *cómo* llega.
- El **nodo** decide *cuándo* y *con qué* se ejecuta.

Ninguna capa necesita conocer los detalles internos de otra. Solo comparten el contrato de tarea.

## Componentes

### Agente (PC)

Proceso de usuario, sin privilegios elevados. Escucha solo en loopback o por socket local. Expone una
API mínima y declarada por capacidades: no es un servidor abierto y no acepta comandos arbitrarios.

- Traduce pedidos en tareas firmadas
- Administra la política de permisos
- Mantiene la cola de salida y los reintentos
- Escribe el registro de auditoría

Si el agente se detiene, los nodos siguen trabajando con lo que ya tienen.

### Núcleo (`relic-core`)

El mismo binario/paquete en todos los dispositivos soportados.

| Función | Detalle |
|---|---|
| Scheduler | Prioridades, intervalos, ventanas de ejecución |
| Verificación | Firma, alcance, versión de módulo, deadline |
| Cola persistente | Sobrevive reinicios; idempotencia por `id` |
| Watchdog | Detecta tareas colgadas y reinicia el proceso |
| Métricas | CPU, RAM, temperatura, uptime, tamaño de cola |
| Registro | Eventos locales, exportables al agente |

Objetivo de peso: funcionar cómodo con 2 GB de RAM y sin swap agresivo.

### Adaptadores

Contrato declarativo (`manifest.json`) + implementación de las operaciones que el hardware soporta.

```json
{
  "adapter": "android-termux",
  "version": "0.1.0",
  "arch": ["arm64", "armv7"],
  "capabilities": {
    "cpu.metrics": true,
    "storage.paths": ["/data/data/com.termux/files/home"],
    "notify.local": true,
    "network.listen": true,
    "gpu.metrics": false,
    "sensors.raw": false
  },
  "requires_root": false,
  "limits": { "battery_aware": true, "may_sleep": true }
}
```

Lo que no está en `capabilities` no existe para los módulos. Un módulo que necesita algo ausente falla
al instalarse, no en producción.

### Módulos

Carpeta + manifiesto + código. Declaran permisos y salidas.

```json
{
  "module": "gpu-watch",
  "version": "0.2.1",
  "requires": ["gpu:read", "notify:send"],
  "produces": ["timeseries.gpu_temp"],
  "limits": { "max_rss_mb": 64, "max_disk_mb": 128 }
}
```

Se ejecutan en proceso propio, con cuota de memoria y de disco. Un módulo roto no tumba el núcleo.

## Transporte

| Medio | Cómo | Cuándo |
|---|---|---|
| USB | `adb reverse` (TCP sobre USB) o RNDIS | Primer arranque, rescate, tareas críticas |
| Red local | mDNS + TLS mutuo, puerto único | Nodos fijos, sincronización de archivos |
| VPN de malla | WireGuard / Tailscale | Acceso remoto sin abrir puertos |
| Cola offline | Persistencia local + reintento | Siempre: es el fallback |

Reglas:

1. El transporte es reemplazable; el contrato no cambia.
2. La identidad se verifica por certificado, nunca por dirección IP.
3. Un enlace caído no descarta tareas: las deja en cola.
4. El reintento usa el mismo `id`, así el nodo descarta duplicados.

## Flujo de una tarea

```
pedido → validación de permisos → firma → encolado → transporte → verificación
      → ejecución aislada → resultado → (entrega inmediata | sync diferido) → auditoría
```

Estados posibles de una tarea: `borrador`, `firmada`, `encolada`, `entregada`, `ejecutando`,
`completada`, `fallida`, `vencida`, `rechazada`.

## Decisiones y por qué

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Tareas declarativas firmadas | Shell remoto | Un shell remoto no se audita ni se acota |
| Adaptadores por familia | Un binario por modelo | La explosión combinatoria mata al proyecto |
| Python en el núcleo | C/Rust desde el día uno | Portabilidad y velocidad de iteración primero |
| Cola persistente desde la fase 0 | «Después lo vemos» | Es la diferencia entre nodo y accesorio |
| Fichas con evidencia | Lista de «compatibles» | La confianza se gana con pruebas, no con marketing |

## Riesgos de arquitectura

- **Fragmentación de Android**: cada fabricante rompe algo distinto. Se absorbe en adaptadores, pero
  cuesta trabajo humano.
- **Soporte de hardware en Linux nativo**: en SoC MediaTek puede no llegar nunca. El diseño no debe
  depender de la fase 3 para ser útil.
- **Consumo y calor en nodos 24/7**: es un problema de diseño, no un detalle operativo.
- **Seguridad del agente**: cualquier API local es superficie de ataque. Loopback, allowlist y firma
  obligatorias desde la primera línea de código.
