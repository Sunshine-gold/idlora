# Roadmap

Sin fechas inventadas. Cada fase avanza cuando se cumple su criterio de salida, y el orden importa:
nada de saltar a la fase difícil antes de que la fácil funcione de verdad.

---

## Fase 0 · Núcleo sin tocar el teléfono

**Riesgo:** cero · **Reversión:** desinstalar una app

Todo el software corre en Termux con un Linux en proot. El teléfono no se flashea, no se rootea, no se
desbloquea el bootloader.

**Objetivo**

- Núcleo con scheduler, verificación de firma y cola persistente
- Agente en Windows con API local y allowlist
- Un módulo real: monitoreo de GPU de la PC
- Transporte USB funcionando

**Criterio de salida**

> Una tarea sigue viva con la PC apagada, y sincroniza correctamente al volver.

**Qué se aprende:** si el modelo de tareas funciona. Todo lo demás es hardware.

---

## Fase 1 · Un nodo de verdad

**Riesgo:** bajo

El experimento se convierte en electrodoméstico. Aparecen los problemas aburridos que deciden si el
proyecto sirve.

**Objetivo**

- Servicio persistente con arranque automático
- Watchdog y reinicio controlado
- Carga limitada de batería y monitoreo térmico
- Métricas propias del nodo
- Red LAN con TLS mutuo y descubrimiento mDNS

**Criterio de salida**

> 7 días de uptime sin intervención manual, temperatura estable.

---

## Fase 2 · Catálogo y contrato público

**Riesgo:** bajo

El proyecto deja de ser de una persona.

**Objetivo**

- Esquema de ficha + validador automático
- Plantilla de módulo y de adaptador
- Guía de contribución y de revisión
- Primeras fichas con evidencia

**Criterio de salida**

> Un tercero agrega una ficha válida sin ayuda del mantenedor.

---

## Fase 3 · Linux real en el Redmi Note 9

**Riesgo:** alto · **Puede no salir**

La parte incierta. Un SoC MediaTek de gama media no es terreno amable para Linux mainline: DRAM init,
GPU, módem y cámara suelen faltar o ser inestables.

**Objetivo**

- Evaluar postmarketOS / Ubuntu Touch / mainline para el modelo exacto
- Documentar qué funciona, qué no y con qué estabilidad
- Imagen reproducible + rollback probado

**Criterio de salida**

> Imagen reproducible, con recuperación probada y matriz de funciones publicada.

**Regla:** un resultado negativo, publicado, también cierra la fase. No se fuerza un éxito inexistente.

---

## Fase 4 · Segunda familia de hardware

**Riesgo:** medio

La prueba de fuego de la modularidad.

**Objetivo**

- Un adaptador nuevo para otra marca, sin tocar el núcleo
- El mismo módulo corriendo en dos plataformas distintas
- Comparación de rendimiento y consumo

**Criterio de salida**

> Cero cambios en el núcleo; mismo módulo, dos plataformas, resultados comparables.

**Si falla:** la arquitectura estaba mal y hay que rediseñarla antes de crecer.

---

## Fase 5 · Comunidad

**Riesgo:** continuo

**Objetivo**

- Proyectos publicados con resultados medidos
- Revisión por pares activa
- Banco de pruebas reproducible
- Imágenes y recetas mantenidas

**Criterio de salida**

> Más contribuciones externas que propias.

---

## Lo que no está en el roadmap (a propósito)

- Un sistema operativo propio desde cero
- Soporte universal de todos los teléfonos
- Funciones que dependan de saltarse verificaciones de seguridad
- Cualquier cosa que requiera tocar equipos de terceros

## Indicadores que importan

| Indicador | Por qué |
|---|---|
| Uptime mediano de nodos | Si no es estable, no sirve |
| Tareas que sobreviven a la PC apagada | Es la promesa central |
| Fichas con recuperación probada | Calidad del catálogo |
| Tiempo de alta de un dispositivo nuevo | Salud de la arquitectura |
| Contribuciones externas | Salud del proyecto |
