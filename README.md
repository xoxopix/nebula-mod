# Nebula Mod

Edición consolidada y optimizada de Nebula para Zen Browser. Combina el diseño visual de Nebula con iconografía vectorial normalizada, correcciones críticas en componentes nativos (reproductor multimedia, visor PDF, menús) y un perfil de red y rendimiento equilibrado.

---

## Qué incluye y qué mejora

### Interfaz y Diseño
- **Iconografía normalizada:** Botones de navegación (Atrás, Adelante, Recargar) con proporciones simétricas exactas (16x16 px) y supresión del recuadro parpadeante nativo de recarga/detención. Iconos vectoriales minimalistas para barra lateral, modo compacto, marcadores, historial, extensiones, descargas, espacios de trabajo y candado de seguridad.
- **Barra de direcciones:** Alineación centrada en reposo con bordes redondeados y transición suave al interactuar.
- **Selector Ctrl + Tab:** Fondo translúcido con desenfoque simétrico de 20 px, eliminando bordes toscos y etiquetas redundantes.
- **Picture-in-Picture (PiP):** Controles oscuros con diseño redondeado e integración visual pulida.
- **Limpieza de menús:** Supresión de opciones redundantes, separadores dobles y espacios vacíos en menús contextuales.

### Correcciones de Componentes
- **Reproductor multimedia independiente:** Soluciona el error donde todas las pestañas compartían la misma portada. Ahora detecta carátulas y metadatos de forma aislada por cada video (YouTube, Spotify, etc.) con observadores de memoria seguros para evitar congelamientos al iniciar el navegador.
- **Visor PDF universal (Better PDF):** Compatible con rutas locales (`file://`), web y recursos internos, resistente a futuras actualizaciones de Zen.

### Rendimiento y Red (user.js)
- **Anti-bloqueo de pestañas:** Desactivación de RCWN para solucionar el problema de pestañas que se quedan cargando en bucle.
- **Navegación y streaming fluidos:** HTTP/3 (QUIC) activado junto a precarga predictiva y DNS prefetch para carga instantánea de miniaturas en YouTube y scroll continuo sin tirones.
- **Aceleración por hardware:** Renderizado completo por WebRender GPU y cálculo paralelo de estilos CSS (Servo).
- **Gestión de memoria:** Descarga automática de pestañas inactivas bajo poca memoria (`unloadOnLowMemory`) y restauración de sesión bajo demanda (`restore_on_demand`).
- **Privacidad:** Telemetría y servicios de diagnóstico en segundo plano completamente desactivados.

---

## Instalación

### Opción 1: Sine Mod Manager (Recomendado)
1. Abre los ajustes de Zen Browser y dirígete a **Sine / Mods**.
2. Haz clic en **Instalar desde URL** y pega el enlace del repositorio:
   ```text
   https://github.com/xoxopix/nebula-mod
   ```
3. Copia el archivo `user.js` ubicado dentro del mod a la raíz de tu perfil de Zen (ver Opción 2).
4. Reinicia Zen Browser.

### Opción 2: Instalación Manual
1. Escribe `about:support` en la barra de direcciones de Zen y pulsa en **Abrir carpeta** en la sección *Carpeta del perfil*.
2. Clona o descomprime este repositorio dentro de `chrome/sine-mods/` con el nombre `nebula-mod`.
3. Copia el archivo `user.js` incluido en el mod y pégalo en la raíz de tu perfil (la carpeta abierta en el paso 1).
4. Reinicia Zen Browser.

---

## Estructura del Proyecto

```text
nebula-mod/
├── theme.json            # Metadatos del mod para Sine
├── preferences.json      # Preferencias configurables
├── userChrome.css        # Estilos principales de interfaz
├── userContent.css       # Estilos para páginas y visor PDF
├── user.js               # Ajustes de rendimiento, red y GPU
├── nebula/               # Módulos CSS estructurados
│   ├── modules/          # Iconos, PiP, pestañas, barra de herramientas
│   └── content/          # Estilos de páginas internas y PDF
├── js/
│   └── nebula.uc.js      # Script central (reproductor, polyfills, eventos)
└── README.md             # Documentación
```

---

## Créditos
- Tema base: **Nebula** por *JustADumbPrsn*.
- Iconos base: **New Icons** por *qumeqa*.
- Integración, correcciones multimedia, PDF, iconografía normalizada y perfil de rendimiento: **EVA 01** ([xoxopix](https://github.com/xoxopix)).
