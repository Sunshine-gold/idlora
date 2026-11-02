# Cómo contribuir

Gracias por querer sumar. Este proyecto vive de gente que prueba cosas en hardware que ya tenía.

## Antes de empezar

Leé [`docs/seguridad.md`](docs/seguridad.md). No es letra chica: si tu aporte requiere saltarse una
verificación de seguridad, o no hay camino de vuelta documentado, no entra.

## Qué se puede aportar

| Tipo | Dónde | Necesita |
|---|---|---|
| Ficha de dispositivo | `devices/` | Pruebas con fecha + recuperación probada |
| Módulo | `modules/` | Manifiesto + README + no pedir permisos de más |
| Adaptador | `adapters/` | Manifiesto de capacidades honesto |
| Proyecto completo | `projects/` | Fotos, consumo medido, problemas encontrados |
| Corrección de docs | `docs/` | Nada especial |

## Reglas de oro

1. **Lo que no probaste, no lo afirmes.** Si no lo corriste, decí «no probado».
2. **Los resultados negativos se publican.** Ahorran trabajo a otros.
3. **Un cambio por contribución.** Fichas, módulos y arreglos no van mezclados.
4. **Nada de binarios sin fuente.** Si no se puede reconstruir, no se acepta.
5. **Sin datos personales.** Ni tuyos ni del dueño anterior del equipo.
6. **Sin DRM, anti-cheat ni cuentas ajenas.** No se discute.

## Formato de una ficha

Usá la plantilla de [`docs/compatibilidad.md`](docs/compatibilidad.md). El validador rechaza fichas sin:

- `no_funciona` declarado
- `recuperacion.probado` explícito
- Al menos una prueba con fecha y autor

## Revisión

Dos revisores por ficha nueva. La revisión mira evidencia, no entusiasmo. Si tu ficha queda en
`experimental`, no es un rechazo: es el estado honesto hasta que haya prueba de recuperación.

## Estilo

- Español claro, sin marketing.
- Números concretos: días de uptime, grados, watts, megabytes.
- Si algo es incierto, decilo en el texto, no en un comentario de código.
