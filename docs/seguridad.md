# Seguridad y recuperación

## Modelo de confianza

El proyecto asume que la red puede estar comprometida y que el dispositivo puede ser robado.
Por eso nada se autoriza por ubicación ni por IP: se autoriza por identidad criptográfica y por alcance
explícito.

### 1. Emparejamiento

Un dispositivo nuevo no confía en nadie. El emparejamiento es presencial:

1. El nodo muestra un código de un solo uso.
2. El agente lo confirma.
3. Se emite un certificado firmado por la CA local del hogar.
4. Se define, explícitamente, qué módulos puede ejecutar.

Sin emparejamiento, el nodo rechaza toda tarea. No hay modo «abierto por comodidad».

### 2. Autorización por alcance

Cada tarea lleva su alcance. El nodo verifica:

- Firma válida y dispositivo emparejado
- Alcance solicitado ⊆ alcance aprobado para ese módulo
- Versión de módulo soportada
- Deadline vigente
- Cuota de recursos disponible

Se verifica **antes de ejecutar** y otra vez **antes de devolver datos**. Un módulo de monitoreo no
puede escribir archivos ni con un bug, porque no tiene el permiso, no porque «no lo hace».

### 3. Auditoría

- Log append-only, local, con hash encadenado por entrada.
- Registra: tarea recibida, verificación, resultado, rechazos, revocaciones.
- Exportable manualmente por el dueño. Nunca se envía solo.
- Rotación por tamaño, retención configurable.

### 4. Revocación

- Revocar un nodo: se invalida su certificado, deja de aceptar tareas nuevas.
- Revocar un módulo: se detiene y se borra su cola pendiente.
- Revocar un permiso: aplica a la siguiente verificación, no a la siguiente sesión.

### 5. Batería y térmica

La parte que casi nadie documenta y que puede lastimar a alguien.

Un teléfono de cinco años enchufado 24/7, sin pantalla, en un cajón, es un escenario de riesgo real:
las celdas de litio se hinchan.

Controles mínimos:

- Carga limitada (corte por software cuando el hardware lo permite)
- Monitoreo de temperatura con umbral y apagado
- Alerta si el nodo pierde el enlace estando caliente
- Registro de ciclos y de tiempo en carga
- Recomendación explícita de retirar la celda cuando el equipo lo permita

## Procedimiento de recuperación

Requisito de entrada: **probar el camino de vuelta antes de modificar nada.**

### Antes

- [ ] Modelo exacto y variante regional confirmados
- [ ] Firmware stock descargado de fuente conocida
- [ ] Hash verificado y guardado en dos lugares
- [ ] Método de recuperación identificado (fastboot, EDL/SP Flash Tool, modo download)
- [ ] Anti-rollback investigado: ¿este equipo puede volver atrás?
- [ ] Batería con carga suficiente para todo el proceso
- [ ] Segundo dispositivo disponible para leer la guía si algo se cuelga

### Durante

- Un cambio por vez, con registro de cada paso y de cada salida de consola.
- Nada de comandos copiados sin entender qué hacen.
- Si aparece una instrucción de desactivar verificaciones de seguridad del sistema anfitrión → alto.

### Después

- [ ] El equipo arranca en stock
- [ ] Red, almacenamiento y sensores funcionan
- [ ] Se documentó el tiempo total de recuperación
- [ ] La ficha se actualiza con el resultado, bueno o malo

## Señales de alto

- No hay firmware stock disponible → no se empieza.
- El único tutorial es un video sin pasos escritos → no alcanza.
- La guía pide desactivar Defender, UAC, Secure Boot o verificaciones del sistema → no se hace.
- El equipo es el único que la persona tiene para trabajar → no se toca.
- Batería visiblemente hinchada → se retira y se dispone correctamente, no se carga.

## Límites duros del proyecto

- Nada de cuentas ajenas, anti-cheat, DRM ni datos personales del dueño anterior.
- Nada de acceso remoto a dispositivos de terceros.
- Nada de instalación silenciosa ni de permisos ampliados «porque funciona mejor».
- Nada de binarios sin fuente ni de imágenes sin receta reproducible.
