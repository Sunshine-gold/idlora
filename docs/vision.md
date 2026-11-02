# Visión

## El punto de partida

Un cajón con un celular viejo. Cuatro núcleos, 3 GB de RAM, 64 GB de almacenamiento, WiFi, Bluetooth,
sensores y una batería. Más computadora que muchos servidores que alguna vez fueron tope de gama.

Hoy ese hardware se descarta, o se usa como accesorio de una PC: pantalla secundaria, control remoto,
app de Android que depende de que Windows esté encendido.

## El cambio de pregunta

La pregunta habitual es: *¿cómo uso el teléfono desde la PC?*

RELIC pregunta otra cosa: *¿qué puede hacer el teléfono por sí solo, y cómo se coordina con la PC
sin depender de ella?*

Eso cambia el diseño completo:

| Modelo accesorio | Modelo nodo |
|---|---|
| La PC manda, el teléfono obedece | El nodo tiene tareas y criterio |
| Si la PC se apaga, todo se detiene | El nodo sigue trabajando |
| La tarea vive en la PC | La tarea vive en el nodo, con su estado |
| El resultado se pierde si falla el enlace | El resultado espera en la cola |
| El teléfono aporta pantalla y entrada | El teléfono aporta CPU, disco, red y sensores |

## Principios

1. **Aprovechar, no fabricar.** No se diseña hardware nuevo; se recupera el que existe.
2. **Un núcleo, muchos adaptadores.** Agregar un dispositivo no debe tocar el núcleo.
3. **Autonomía real.** Una tarea no se pierde porque la PC se apague.
4. **Permisos acotados.** Deny by default; el alcance viaja con la tarea.
5. **Recuperación obligatoria.** Sin camino de vuelta probado, no hay ficha.
6. **Evidencia sobre entusiasmo.** Lo no probado se publica como experimental.
7. **Conocimiento abierto.** Lo que aprende uno lo aprovecha el siguiente.

## Qué significa «funcionó»

No es «arrancó Linux en el teléfono». Es:

- El nodo ejecutó una tarea real durante días sin intervención.
- La tarea siguió viva con la PC apagada.
- El resultado llegó completo, con la hora real del evento.
- El equipo se pudo recuperar con el procedimiento documentado.

## Alcance

Empieza con un Redmi Note 9 y una PC con Windows. La arquitectura está pensada para que el segundo
dispositivo —un Samsung, una tablet, una Raspberry Pi, una PC vieja— no obligue a reescribir nada.

El límite no es el hardware: es cuánto trabajo de adaptación está dispuesta a hacer la comunidad, y
cuánta honestidad hay al publicar lo que no funciona.
