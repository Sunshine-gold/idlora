# Ecosistema

## Para qué existe el catálogo

El problema de reutilizar hardware viejo no es técnico: es de información dispersa. Cada modelo tiene
su foro, su hilo de XDA, su video sin pasos escritos, su versión de firmware perdida.

El catálogo ordena eso: **un dispositivo, una ficha, con evidencia.**

## Qué se publica

### 1. Dispositivos

Ficha por modelo con hardware, niveles soportados, qué funciona, qué no y cómo se recupera.
Ver [`compatibilidad.md`](compatibilidad.md).

### 2. Imágenes y configuraciones

Recetas reproducibles, no archivos sueltos: qué sistema, qué versión, qué parches, qué pasos.
Si no se puede reconstruir, no se publica como imagen.

### 3. Métodos de recuperación

El activo más valioso del proyecto. Firmware stock con hash, comandos exactos, advertencias de
anti-rollback, y el registro de alguien que efectivamente lo probó.

### 4. Módulos

Unidades reutilizables con manifiesto. Se pueden combinar libremente entre dispositivos compatibles.

### 5. Proyectos

Lo que alguien construyó: mini servidor, nodo de monitoreo, centro de automatización, laboratorio.
Con fotos, consumo medido, problemas encontrados y qué haría distinto.

### 6. Documentación de límites

La sección menos vistosa y la más útil: «esto no anda, no va a andar, y no pierdas el tiempo».

## Estructura de contribución

```
devices/<fabricante>-<modelo>/
├── ficha.json           datos y estados
├── recuperacion.md      procedimiento probado
├── pruebas/             qué se midió y cuándo
└── notas.md             lo que no entra en el esquema

modules/<nombre>/
├── manifest.json
├── README.md
└── src/

projects/<nombre>/
├── README.md            qué es, qué necesita, cuánto consume
└── install.md
```

## Reglas de calidad

1. **Toda ficha necesita recuperación probada.** Sin eso, queda en `experimental` para siempre.
2. **Toda afirmación necesita una fecha y un autor.** «Funciona» sin contexto no es dato.
3. **Los resultados negativos se publican igual.** Ahorran trabajo a todos.
4. **Nada de binarios sin fuente.** Si no hay build reproducible, no entra.
5. **Sin datos personales.** Ni del que contribuye ni del dueño anterior del equipo.
6. **Sin DRM, sin anti-cheat, sin cuentas ajenas.** No es negociable.

## Revisión

Dos revisores por ficha nueva, uno de ellos con el mismo modelo de dispositivo si es posible.
La revisión mira evidencia, no entusiasmo.

## Gobernanza (mínima, por ahora)

- Un mantenedor por área: núcleo, adaptadores, catálogo, seguridad.
- Cambios al contrato de tareas requieren RFC y período de comentarios.
- Los estados de compatibilidad los cambia quien aporta la prueba, y los confirma un revisor.
- Cualquiera puede abrir una ficha; nadie puede autocertificarla.
