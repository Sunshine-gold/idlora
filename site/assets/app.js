/* ============================================================
   RELIC — interacción de la presentación
   Navegación por pestañas + panel de detalle + flujo animado.
   ============================================================ */

(function () {
  "use strict";

  /* ---------- datos del panel de detalle ---------- */
  const NODES = {
    /* --- capa de control --- */
    agent: {
      kind: "Control · PC",
      title: "Agente local",
      body: `<p>Proceso que corre en la PC con privilegios mínimos. No es un servidor abierto: escucha
             solo en <code>127.0.0.1</code> o por un socket local, y expone únicamente las funciones
             que estén en la lista de permitidas.</p>
             <p>Su trabajo es traducir pedidos en <em>tareas firmadas</em>, no ejecutar comandos arbitrarios.</p>`,
      kv: {
        corre: "Usuario normal, sin elevación",
        escucha: "Loopback / named pipe",
        expone: "API declarada por capacidades",
        falla: "Se apaga, el nodo sigue trabajando"
      }
    },
    perms: {
      kind: "Control · PC",
      title: "Política de permisos",
      body: `<p>Cada módulo declara qué necesita leer o tocar. La política lo aprueba o lo rechaza
             una sola vez, y queda registrado quién aprobó y cuándo.</p>
             <ul>
               <li><code>gpu:read</code> — leer sensores de GPU</li>
               <li><code>disk:write:/srv/media</code> — escribir en una ruta puntual</li>
               <li><code>notify:send</code> — mandar una notificación</li>
             </ul>
             <p>Un módulo sin <code>shell:exec</code> no puede ejecutar comandos, aunque lo intente.</p>`,
      kv: {
        modelo: "Capacidades (allowlist)",
        grano: "Por módulo y por ruta",
        efecto: "Deny by default",
        cambio: "Requiere aprobación explícita"
      }
    },
    audit: {
      kind: "Control · PC",
      title: "Registro de auditoría",
      body: `<p>Todo lo que se aprobó, se ejecutó o se rechazó queda en un log append-only, local y legible.
             Sirve para dos cosas: entender por qué algo pasó, y poder revocar un permiso con evidencia.</p>
             <p>Si un nodo intenta algo fuera de su alcance, queda registrado como incidente, no como error silencioso.</p>`,
      kv: {
        formato: "JSON Lines, rotativo",
        integridad: "Hash encadenado por entrada",
        retención: "Configurable, local",
        salida: "Nunca sale de la máquina por defecto"
      }
    },

    /* --- transporte --- */
    usb: {
      kind: "Transporte",
      title: "USB",
      body: `<p>El camino más confiable cuando el teléfono está al lado: no depende del router, no
             depende del WiFi, y la latencia es baja y estable.</p>
             <p>Se implementa con <code>adb reverse</code> (túnel TCP sobre USB) o con RNDIS/USB-Ethernet
             cuando el dispositivo expone interfaz de red. Requiere depuración USB habilitada.</p>`,
      kv: {
        requiere: "Cable + ADB habilitado",
        latencia: "Baja y estable",
        ancho: "Suficiente para control",
        riesgo: "Cable se desconecta"
      }
    },
    lan: {
      kind: "Transporte",
      title: "Red local (TCP)",
      body: `<p>Para cuando el dispositivo vive en un rincón y no hay cable. Descubrimiento por mDNS,
             conexión cifrada con TLS mutuo, y verificación de identidad por certificado: no por IP.</p>
             <p>Funciona igual en la LAN de casa que sobre una VPN de malla (Tailscale/WireGuard) si
             querés alcanzarlo desde afuera sin abrir puertos.</p>`,
      kv: {
        requiere: "WiFi o Ethernet",
        latencia: "Media, variable",
        ancho: "Alto (sync de archivos)",
        riesgo: "Se cae el router"
      }
    },
    queue: {
      kind: "Transporte",
      title: "Cola offline",
      body: `<p>La pieza que hace que esto no sea control remoto: las tareas viajan con su estado y
             el nodo las ejecuta aunque la PC esté apagada. El resultado se guarda local y se
             sincroniza cuando vuelve el enlace.</p>
             <p>Es el mismo patrón que un sistema de mensajería durable: at-least-once, con idempotencia
             por ID de tarea.</p>`,
      kv: {
        modelo: "Store &amp; forward",
        garantía: "At-least-once + idempotencia",
        límite: "Cuota de disco en el nodo",
        conflicto: "Gana el último resultado válido"
      }
    },

    /* --- ejecución --- */
    core: {
      kind: "Ejecución · nodo",
      title: "Núcleo (relic-core)",
      body: `<p>El mismo código en todos los dispositivos. Sabe recibir una tarea, verificar quién la
             firmó, ejecutarla, medirla y devolver el resultado. No sabe nada específico de ningún
             teléfono: eso lo resuelve el adaptador.</p>
             <ul>
               <li>Scheduler de tareas y watchdogs</li>
               <li>Registro de capacidades disponibles</li>
               <li>Cola local persistente</li>
               <li>Métricas propias (CPU, RAM, temperatura)</li>
             </ul>`,
      kv: {
        lenguaje: "Python 3 (portable)",
        corre: "Linux ARM64 / ARMv7 / x86",
        peso: "Bajo: pensado para 2 GB RAM",
        prueba: "Pasa la suite sin hardware real"
      }
    },
    adapter: {
      kind: "Ejecución · nodo",
      title: "Adaptador de dispositivo",
      body: `<p>La capa que traduce entre el núcleo y el hardware concreto: qué sensores existen, cómo
             se leen, qué se puede y qué no. Un adaptador por familia, no por modelo.</p>
             <ul>
               <li><code>android-termux</code> — fase 0, sin root</li>
               <li><code>android-root</code> — acceso a sensores y governor</li>
               <li><code>postmarketos</code> — Linux real en el SoC</li>
               <li><code>linux-arm64</code> — SBC y PCs viejas</li>
             </ul>
             <p>Si un adaptador no puede hacer algo, lo declara. No se inventa capacidades.</p>`,
      kv: {
        contrato: "manifiesto JSON versionado",
        degrada: "Declara capacidades faltantes",
        aísla: "El núcleo no cambia por modelo",
        aporta: "La comunidad, uno por familia"
      }
    },
    modules: {
      kind: "Ejecución · nodo",
      title: "Módulos",
      body: `<p>Donde vive la utilidad. Cada módulo es una unidad chica y reemplazable que declara qué
             permisos necesita y qué produce.</p>
             <ul>
               <li>Monitoreo de PC y GPU (sensores, series temporales)</li>
               <li>Almacenamiento y sincronización de archivos</li>
               <li>Red: DNS local, proxy de caché, chequeos de disponibilidad</li>
               <li>Automatización: reglas "si pasa X, hacé Y"</li>
               <li>Sensores del propio teléfono como nodo físico</li>
             </ul>`,
      kv: {
        empaque: "Carpeta + manifiesto",
        lenguaje: "Python o script nativo",
        sandbox: "Permisos por módulo",
        versionado: "Semver independiente"
      }
    },
    firmware: {
      kind: "Ejecución · nodo",
      title: "Sistema base (imagen)",
      body: `<p>El sistema operativo que corre debajo. No lo escribimos desde cero: usamos lo que ya
             existe y lo empaquetamos de forma reproducible.</p>
             <p>Tres niveles, de menor a mayor riesgo:</p>
             <ul>
               <li><strong>Sin tocar el teléfono:</strong> Termux + proot (Android stock)</li>
               <li><strong>Linux en Android:</strong> chroot/Docker en un Android rooteado</li>
               <li><strong>Linux nativo:</strong> postmarketOS / Ubuntu Touch / mainline</li>
             </ul>`,
      kv: {
        fase0: "Cero riesgo de brick",
        fase1: "Requiere root",
        fase2: "Requiere bootloader libre",
        compromiso: "Cada nivel, su ficha y su rollback"
      }
    },

    /* --- confianza --- */
    pairing: {
      kind: "Confianza",
      title: "Emparejamiento",
      body: `<p>Un dispositivo nuevo no confía en nadie hasta que alguien, delante de las dos máquinas,
             lo autoriza. Se muestra un código, se compara, se emite un certificado del hogar.</p>
             <p>Sin ese paso, un nodo en la red no acepta tareas de nadie.</p>`,
      kv: {
        método: "Código de un solo uso",
        emite: "CA local del hogar",
        expira: "Certificados revocables",
        sin_pairing: "Rechaza todo"
      }
    },
    scopes: {
      kind: "Confianza",
      title: "Alcance mínimo",
      body: `<p>Cada tarea lleva escrito qué puede hacer: leer esto, escribir aquello, nada más. El nodo
             verifica el alcance antes de ejecutar y otra vez antes de devolver datos.</p>
             <p>Un módulo de monitoreo no puede, ni con un bug, escribir en tus archivos.</p>`,
      kv: {
        unidad: "Tarea",
        verifica: "Firma + alcance + versión",
        revoca: "Inmediato, por nodo o por módulo",
        auditoría: "Cada intento, aceptado o no"
      }
    },
    recovery: {
      kind: "Confianza",
      title: "Recuperación",
      body: `<p>Requisito de entrada al catálogo: si el experimento sale mal, tiene que existir un camino
             de vuelta documentado y probado.</p>
             <ul>
               <li>Firmware original descargado y verificado <em>antes</em> de flashear</li>
               <li>Método de recuperación: fastboot, EDL / SP Flash Tool, modo download</li>
               <li>Anti-rollback check: algunos equipos no vuelven atrás nunca</li>
               <li>Prueba de recuperación real, no teórica</li>
             </ul>
             <p>Una ficha sin rollback probado se publica como <strong>experimental</strong>, no como compatible.</p>`,
      kv: {
        antes: "Backup + firmware stock",
        durante: "Registro de cada paso",
        después: "Prueba de arranque",
        sin_rollback: "No entra al catálogo"
      }
    },
    battery: {
      kind: "Confianza",
      title: "Batería y térmica",
      body: `<p>Un teléfono viejo funcionando 24/7 enchufado es un riesgo real: las celdas de litio de
             varios años se hinchan. Esto no es un detalle, es una condición de diseño.</p>
             <ul>
               <li>Carga limitada (bypass / corte por software cuando el hardware lo permite)</li>
               <li>Monitoreo de temperatura y de ciclos</li>
               <li>Alerta si el nodo pierde el enlace estando caliente</li>
               <li>Recomendación de retirar la batería cuando el equipo lo permita</li>
             </ul>`,
      kv: {
        riesgo: "Hinchazón, incendio",
        mitiga: "Carga limitada + térmica",
        mide: "Temperatura y uptime",
        regla: "Mejor apagar que forzar"
      }
    },

    /* --- flujo --- */
    flow1: {
      kind: "Flujo · paso 1",
      title: "El pedido nace en la PC",
      body: `<p>Vos declarás una regla en lenguaje simple: qué mirar, cada cuánto y qué hacer cuando se
             cumple. No es un script: es una tarea con parámetros.</p>
             <p>Queda guardada en el agente, así que se puede editar, pausar o duplicar sin tocar el nodo.</p>`,
      kv: { entrada: "Regla + parámetros", dónde: "Agente (PC)", estado: "Borrador" }
    },
    flow2: {
      kind: "Flujo · paso 2",
      title: "La política dice sí o no",
      body: `<p>El agente revisa si el módulo tiene los permisos que pide. Si el módulo es nuevo, te
             muestra exactamente qué va a poder leer o escribir y espera tu aprobación.</p>
             <p>Si decís que no, la tarea no existe. No hay reintento silencioso.</p>`,
      kv: { verifica: "gpu:read, notify:send", decide: "Humano, una vez", efecto: "Allowlist" }
    },
    flow3: {
      kind: "Flujo · paso 3",
      title: "Se firma la tarea",
      body: `<p>La tarea se serializa, se le pone vencimiento y un ID único, y se firma con la clave del
             agente. El nodo solo acepta tareas firmadas por alguien que ya emparejó antes.</p>
             <p>El ID único permite reintentar sin duplicar efectos: si llega dos veces, se ejecuta una.</p>`,
      kv: { firma: "Ed25519", incluye: "Alcance + vencimiento", reuso: "Seguro por idempotencia" }
    },
    flow4: {
      kind: "Flujo · paso 4",
      title: "Viaja por donde pueda",
      body: `<p>Si hay USB, va por USB. Si hay red, va por la red. Si no hay nada, se queda en la cola
             esperando: no se descarta ni se pierde.</p>
             <p>El transporte es reemplazable justamente porque el contrato no cambia.</p>`,
      kv: { prioridad: "USB → LAN → cola", cifrado: "TLS mutuo en red", pérdida: "Se reintenta" }
    },
    flow5: {
      kind: "Flujo · paso 5",
      title: "El nodo verifica y ejecuta",
      body: `<p>Antes de tocar nada: firma válida, alcance permitido, versión del módulo soportada y
             deadline vigente. Con eso, arranca.</p>
             <p>Ejecuta en su propio proceso, con su propio límite de memoria, y mide lo que hace.</p>`,
      kv: { verifica: "4 chequeos antes de correr", aísla: "Proceso + cuota", mide: "CPU, RAM, temp" }
    },
    flow6: {
      kind: "Flujo · paso 6",
      title: "La PC se apaga. El trabajo no.",
      body: `<p>Acá se rompe la analogía con el control remoto. El nodo ya tiene la tarea, el reloj y el
             disco. Sigue muestreando, sigue evaluando la regla y sigue guardando la serie.</p>
             <p>Si se reinicia, la cola en disco le devuelve el estado al arrancar.</p>`,
      kv: { requiere: "Nada de la PC", guarda: "Serie temporal local", excepción: "Notificar sí requiere enlace" }
    },
    flow7: {
      kind: "Flujo · paso 7",
      title: "Sincroniza y deja rastro",
      body: `<p>Cuando vuelve el enlace, el nodo entrega el resultado con marca de tiempo, el agente
             evalúa la regla y dispara la notificación. Todo el camino queda en el registro.</p>
             <p>Si la regla se cumplió mientras la PC estaba apagada, te enterás igual: con la hora real
             del evento, no con la hora del aviso.</p>`,
      kv: { entrega: "Resultado + serie", marca: "Hora del evento", cierre: "Entrada de auditoría" }
    },

    /* --- roadmap --- */
    ph1: {
      kind: "Fase 0",
      title: "Núcleo sin tocar el teléfono",
      body: `<p>Todo el software corre en Termux con un Linux en proot. El teléfono no se flashea, no se
             rootea, no se desbloquea: si algo sale mal, se desinstala la app y listo.</p>
             <p>Sirve para lo único que importa al principio: demostrar que el modelo de tareas funciona.</p>`,
      kv: { riesgo: "Cero", reversión: "Desinstalar", límite: "Sin acceso a hardware real" }
    },
    ph2: {
      kind: "Fase 1",
      title: "Un nodo de verdad",
      body: `<p>El experimento se convierte en electrodoméstico: arranca solo, se recupera solo, no se
             cuelga, no se calienta de más y no infla la batería.</p>
             <p>Acá aparecen los problemas aburridos que definen si el proyecto sirve o no.</p>`,
      kv: { métrica: "7 días de uptime", vigilancia: "Watchdog + reinicio", energía: "Carga limitada" }
    },
    ph3: {
      kind: "Fase 2",
      title: "Catálogo y contrato público",
      body: `<p>El proyecto deja de ser tuyo y pasa a ser de quien lo use: esquema de fichas, validador,
             plantilla de módulo y guía de contribución.</p>
             <p>El criterio es duro a propósito: si un tercero no puede agregar una ficha sin ayuda, la
             documentación todavía no está.</p>`,
      kv: { entregable: "Esquema + validador", prueba: "Alta externa", calidad: "Revisión por pares" }
    },
    ph4: {
      kind: "Fase 3",
      title: "Linux real en el Redmi Note 9",
      body: `<p>La parte incierta. Un SoC MediaTek de gama media no es el terreno más amable para Linux
             mainline: drivers, DRAM init, GPU, módem y cámara suelen faltar.</p>
             <p>El objetivo no es «que ande todo», es saber y documentar exactamente qué anda. Un resultado
             negativo, publicado, también vale.</p>`,
      kv: { riesgo: "Alto (brick / anti-rollback)", requisito: "Firmware stock verificado", salida: "Imagen + rollback probado" }
    },
    ph5: {
      kind: "Fase 4",
      title: "Segunda familia de hardware",
      body: `<p>La prueba de fuego de la modularidad: agregar un dispositivo de otra marca o arquitectura
             tocando solo el adaptador.</p>
             <p>Si hay que cambiar el núcleo, la arquitectura falló y hay que rediseñarla antes de crecer.</p>`,
      kv: { meta: "Cero cambios en el núcleo", candidatos: "SBC, tablet, PC x86", señal: "Mismo módulo, dos plataformas" }
    },
    ph6: {
      kind: "Fase 5",
      title: "Comunidad",
      body: `<p>El proyecto como bien común: proyectos publicados, fichas revisadas, imágenes reproducibles
             y un banco de pruebas que cualquiera pueda repetir.</p>
             <p>El indicador no es la cantidad de estrellas, es la cantidad de gente que publicó algo que
             otro pudo usar.</p>`,
      kv: { señal: "Contribuciones externas > propias", sostén: "Revisión por pares", riesgo: "Calidad despareja" }
    }
  };

  /* ---------- pestañas ---------- */
  const tabs = Array.from(document.querySelectorAll("#tabs button"));
  const views = Array.from(document.querySelectorAll(".view"));

  function show(id, push) {
    const target = document.getElementById(id);
    if (!target) return;
    views.forEach(v => v.classList.toggle("active", v === target));
    tabs.forEach(t => t.classList.toggle("active", t.dataset.view === id));
    if (push !== false) {
      try { history.replaceState(null, "", "#" + id); } catch (e) { /* file:// sin soporte */ }
    }
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    closePanel();
  }

  tabs.forEach(t => t.addEventListener("click", () => show(t.dataset.view)));

  document.addEventListener("keydown", e => {
    if (e.target.matches("input, textarea")) return;
    const i = tabs.findIndex(t => t.classList.contains("active"));
    if (e.key === "ArrowRight" && i < tabs.length - 1) { show(tabs[i + 1].dataset.view); }
    if (e.key === "ArrowLeft" && i > 0) { show(tabs[i - 1].dataset.view); }
    if (e.key === "Escape") closePanel();
  });

  const initial = (location.hash || "").replace("#", "");
  if (initial && document.getElementById(initial)) show(initial, false);

  /* ---------- panel de detalle ---------- */
  const panel = document.getElementById("panel");
  const pKind = panel.querySelector(".p-kind");
  const pTitle = panel.querySelector("h3");
  const pBody = panel.querySelector(".body");

  function openPanel(key) {
    const d = NODES[key];
    if (!d) return;
    pKind.textContent = d.kind;
    pTitle.textContent = d.title;

    let html = d.body;
    if (d.kv) {
      html += "<dl class='kv'>";
      for (const [k, v] of Object.entries(d.kv)) {
        html += `<dt>${k}</dt><dd>${v}</dd>`;
      }
      html += "</dl>";
    }
    pBody.innerHTML = html;
    panel.classList.add("open");
    document.body.classList.add("panel-open");
    pBody.scrollTop = 0;

    document.querySelectorAll(".node.sel").forEach(n => n.classList.remove("sel"));
    document.querySelectorAll(`[data-node="${key}"]`).forEach(n => n.classList.add("sel"));
  }

  function closePanel() {
    panel.classList.remove("open");
    document.body.classList.remove("panel-open");
    document.querySelectorAll(".node.sel").forEach(n => n.classList.remove("sel"));
  }

  panel.querySelector("button.close").addEventListener("click", closePanel);

  document.addEventListener("click", e => {
    const el = e.target.closest("[data-node]");
    if (el) {
      e.preventDefault();
      openPanel(el.dataset.node);
    }
  });

  /* ---------- flujo animado ---------- */
  const steps = Array.from(document.querySelectorAll(".step"));
  const btnPlay = document.getElementById("play");
  const btnReset = document.getElementById("reset");
  let timers = [];

  function clearTimers() {
    timers.forEach(t => clearTimeout(t));
    timers = [];
  }

  function resetFlow() {
    clearTimers();
    steps.forEach(s => s.classList.remove("lit", "done"));
    if (btnPlay) btnPlay.textContent = "▶ Reproducir";
  }

  function playFlow() {
    resetFlow();
    btnPlay.textContent = "▶ Reproduciendo…";
    steps.forEach((s, i) => {
      timers.push(setTimeout(() => {
        steps.forEach(o => o.classList.remove("lit"));
        if (i > 0) steps[i - 1].classList.add("done");
        s.classList.add("lit");
        if (i === steps.length - 1) {
          btnPlay.textContent = "▶ Repetir";
          steps[i].classList.add("done");
        }
      }, i * 900));
    });
  }

  if (btnPlay) btnPlay.addEventListener("click", playFlow);
  if (btnReset) btnReset.addEventListener("click", resetFlow);

  /* ---------- filtro de compatibilidad ---------- */
  const chips = Array.from(document.querySelectorAll(".chip[data-filter]"));
  const rows = Array.from(document.querySelectorAll("tr[data-state]"));

  chips.forEach(c => c.addEventListener("click", () => {
    chips.forEach(o => o.classList.remove("active"));
    c.classList.add("active");
    const f = c.dataset.filter;
    rows.forEach(r => {
      r.classList.toggle("hidden", f !== "all" && r.dataset.state !== f);
    });
  }));

  /* ---------- año del footer ---------- */
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
})();
