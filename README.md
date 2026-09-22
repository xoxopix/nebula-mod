# Nebula Mod for Zen Browser

[![Zen Browser](https://img.shields.io/badge/Zen_Browser-Compatible-blue?style=flat-square&logo=firefoxbrowser)](https://zen-browser.app/)
[![CSS3](https://img.shields.io/badge/Styles-CSS3-1572B6?style=flat-square&logo=css3)](https://developer.mozilla.org/es/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/Scripts-ES6+-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](https://developer.mozilla.org/es/docs/Web/JavaScript)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

Edición consolidada, optimizada y libre de fugas de memoria del tema **Nebula** para **Zen Browser**. Integra diseño glassmórfico refinado, iconografía vectorial simétrica normalizada, rescate inteligente de favicons (incluso tras Cloudflare), aislamiento de portadas multimedia por pestaña y un perfil integral de rendimiento de red y GPU.

---

## Características Principales

### 🎨 Interfaz y Experiencia Visual
- **Barra de direcciones híbrida:**
  - *En reposo:* Mantiene el diseño limpio y nativo de Zen (`--zen-toolbar-element-bg`, bordes simétricos de 8px, texto centrado y sin saltos bruscos).
  - *En búsqueda (`Ctrl + E` / abierta):* Activa el panel flotante Nebula con efecto vidrio (`backdrop-filter`), radio de 15px, desenfoque dinámico de la web de fondo y aparición escalonada de resultados.
- **Iconografía vectorial normalizada:** Proporciones simétricas exactas (16×16 px) para navegación (Atrás, Adelante, Recargar) sin parpadeos de recuadro. Iconos vectoriales pulidos para modo compacto, extensiones, historial, descargas, marcadores y seguridad.
- **Botones de ventana estilo macOS / Windows:** Escala adaptativa (0.95) calibrada para alineación milimétrica con soporte nativo tanto en modo normal como compacto y barra a la izquierda o derecha.
- **Selector Ctrl + Tab Glassmorphic:** Previsualización flotante con desenfoque de 28px y eliminación de etiquetas o marcos excedentes.
- **Picture-in-Picture (PiP) oscuro y redondeado:** Controles minimalistas estilizados y acordes al tema.
- **Menú contextual minimalista:** Supresión de elementos redundantes, separadores duplicados y accesos inútiles para un menú limpio y ligero.

### ⚙️ Mejoras de Motor y Componentes (`js/nebula.uc.js`)
- **Rescate inteligente de Favicons (`NebulaDirectFaviconModule`):**
  - Recupera automáticamente favicons en sitios que Zen no logra mostrar o que no tienen etiqueta `<link rel="icon">` estándar.
  - Compatible con protección Cloudflare (soporte de `cf_clearance`).
  - Detección ampliada de iconos genéricos de Gecko (`chrome://`, `resource://`, `defaultFavicon.svg`).
  - Blindado con `AbortController` (timeout de 3s) y fallback de imagen controlado para evitar consumo residual de memoria.
- **Reproductor multimedia independiente (`NebulaMediaCoverArtModule`):**
  - Elimina el error donde todas las pestañas compartían la misma portada musical.
  - Detección asíncrona y aislada por pestaña para YouTube, Spotify, etc., con limpieza estricta en el evento `destroy()` para garantizar cero fugas de memoria al cerrar pestañas.
- **Visor Better PDF seguro:** Estilos delimitados estrictamente a visores PDF internos mediante `@-moz-document`, erradicando la fuga de estilos que rompía páginas web convencionales.

### 🚀 Rendimiento, Red y Privacidad (`user.js`)
- **Cero bloqueos de pestañas:** Desactivación de RCWN (`network.http.rcwn.enabled = false`) para evitar pestañas que cargan indefinidamente.
- **Protocolo HTTP/3 (QUIC) + Prefetch:** Conexiones paralelas y DNS prefetch activados para carga instantánea de miniaturas en YouTube y navegación ágil.
- **Aceleración por hardware completa:** Renderizado impulsado por WebRender GPU y cálculo paralelo de estilos CSS (Servo).
- **Gestión inteligente de memoria:** Descarga automática de pestañas bajo estrés de RAM (`unloadOnLowMemory`) y restauración de sesión bajo demanda (`restore_on_demand`).
- **Privacidad y telemetría desactivada:** Supresión total de métricas, pings de telemetría y diagnósticos en segundo plano.

---

## Instalación

### Opción 1: Sine Mod Manager (Recomendado)
1. Abre los ajustes de Zen Browser y dirígete a **Sine / Mods**.
2. Haz clic en **Instalar desde URL** y pega el enlace del repositorio:
   ```text
   https://github.com/xoxopix/nebula-mod
   ```
3. Copia el archivo `user.js` ubicado dentro del mod a la raíz de tu carpeta de perfil de Zen (ver Opción 2 para ubicarla).
4. Reinicia Zen Browser.

### Opción 2: Instalación Manual
1. Escribe `about:support` en la barra de direcciones de Zen y pulsa en **Abrir carpeta** en la sección *Carpeta del perfil*.
2. Si no existe, crea la ruta `chrome/sine-mods/`.
3. Clona o descarga este repositorio dentro de esa carpeta asegurándote de que la carpeta se llame `nebula-mod`:
   ```bash
   cd "chrome/sine-mods"
   git clone https://github.com/xoxopix/nebula-mod.git
   ```
4. Copia el archivo `user.js` incluido en el mod y pégalo directamente en la raíz de tu perfil de Zen (la carpeta abierta en el paso 1).
5. Reinicia Zen Browser.

---

## Opciones de Configuración (`preferences.json`)

Puedes personalizar el comportamiento visual desde los ajustes de Sine o directamente en `about:config`:

| Preferencia | Tipo | Opciones / Descripción |
| :--- | :---: | :--- |
| `nebula-macos-style-buttons` | Boolean | Activa botones circulares estilo macOS en la barra de título. |
| `nebula-urlbar-animation` | Número | `0` (Sin animación), `1` (Zoom In + Blur), `2` (Zoom Out), `3` (Desaturar). |
| `nebula-glow-gradient` | Número | `0` (Sin gradiente), `1` (Color de acento Zen), `2` (Monocromático), `3` (RGB). |
| `nebula-tab-switch-animation` | Número | `0` (Ninguna), `1` (Por defecto), `2` (Suave), `3` (Rebote), `4` (Crossfade). |
| `nebula-turn-off-zen-menu-icon` | Boolean | Desactiva el icono personalizado de Zen en el botón de menú principal. |

---

## Estructura del Proyecto

```text
nebula-mod/
├── theme.json            # Metadatos del mod para Sine
├── preferences.json      # Opciones configurables en UI
├── userChrome.css        # Hoja de estilos del navegador y personalizaciones
├── userContent.css       # Hoja de estilos para contenido web y PDF
├── user.js               # Parámetros optimizados de red, GPU y memoria
├── nebula/               # Módulos CSS modulares
│   ├── config.css        # Variables globales de color, desenfoque y radios
│   ├── chrome.css        # Índice de importación de módulos de interfaz
│   ├── content.css       # Índice de importación de módulos de contenido
│   ├── content/          # Estilos para Better PDF y tarjetas de ajustes
│   └── modules/          # Módulos individuales (urlbar, topbar, icons, pip, etc.)
├── js/
│   └── nebula.uc.js      # Script central (reproductor, favicons, polyfills)
└── README.md             # Documentación del proyecto
```

---

## Créditos y Agradecimientos
- Tema original: **Nebula** por *JustADumbPrsn*.
- Iconografía base: **New Icons** por *qumeqa*.
- Integración, correcciones críticas de aislamiento, Better PDF, rescate de favicons y perfil de rendimiento: **EVA 01** ([xoxopix](https://github.com/xoxopix)).
