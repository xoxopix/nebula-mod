# 🌌 Nebula Mod (Edición Personalizada Completa)

Una versión todo-en-uno de **Nebula** para Zen Browser que unifica el tema visual, iconos vectoriales minimalistas normalizados, correcciones para componentes nativos y optimizaciones avanzadas de rendimiento y red.

---

## ✨ Características Principales

### 1. 🎨 Interfaz y Estilos Visuales
- **Tema Nebula:** Interfaz moderna con soporte para transparencias, efectos acrílicos y diseño minimalista.
- **Iconos Personalizados Normalizados (`custom-icons.css`):**
  - Botón de modo compacto y barra lateral rediseñados.
  - Botones de navegación (Atrás, Adelante, Recargar y Detener) con proporción simétrica exacta (16x16 px).
  - Supresión de la caja de animación defectuosa de recarga/detención de Zen.
  - Iconos de Marcadores, Historial, Descargas, Extensiones, Menú de hamburguesa y Espacios de trabajo (Workspaces).
  - Iconos de seguridad/candado y traducción de idioma.
- **Barra de Direcciones Centrada:** Alineación limpia de la URL con bordes redondeados en reposo.
- **Vista Previa Ctrl + Tab:** Fondo de cristal esmerilado con *blur* simétrico de 20px, sin bordes toscos ni etiquetas innecesarias.
- **Picture-in-Picture (PiP) Mejorado:** Controles con desenfoque de fondo y diseño oscuro elegante.
- **Limpieza de Menús Contextuales:** Ocultación de elementos redundantes y eliminación total de separadores vacíos y duplicados.

### 2. 🎬 Reproductor Multimedia Corregido
- Miniaturas/carátulas independientes por cada video cargado (las pestañas ya no comparten la misma portada repetida).
- Detección precisa por título y canal/artista de la pestaña activa.
- Observador seguro y no recursivo (evita cuelgues o congelamientos al iniciar el navegador).
- Notas musicales animadas solo cuando el reproductor está activo y en reproducción.

### 3. 📄 Visor PDF (Better PDF)
- Selector universal resistente a actualizaciones de Firefox y Zen Browser (`file://`, enlaces web y `resource://`).
- Detección automática de pestañas PDF sin importar variaciones de mayúsculas/minúsculas.

### 4. ⚡ Optimizaciones de Red y Rendimiento
- **Aplicación Automática (`NebulaPerformanceModule`):** El script central aplica automáticamente las siguientes optimizaciones en `about:config`:
  - **Red Anti-Bloqueos:** Desactivación de RCWN, HTTP3 y prefetch especulativo para evitar que las pestañas se queden cargando en bucle. Tiempos de espera de conexión optimizados (10s/20s).
  - **Memoria RAM y Caché:** Gestión dinámica de memoria y descarga de pestañas inactivas bajo poca memoria (`unloadOnLowMemory`).
  - **Arranque Ultrarrápido:** Restauración de pestañas bajo demanda (`restore_on_demand`).
  - **Aceleración Gráfica:** Habilitación completa de WebRender y paralelismo CSS Servo (`parallel-restyle`).
  - **Telemetría Desactivada:** Eliminación de llamadas y pings en segundo plano.
- **Archivo `user.js` de Respaldo:** Incluido en la raíz para copia manual o respaldo directo en cualquier perfil.

---

## 🚀 Instalación en Zen Browser

### Método 1: Mediante Sine Mod Manager (Recomendado)
1. Abre los ajustes de Zen Browser y ve a **Sine** (o la sección de Mods/Temas).
2. Selecciona **Instalar desde URL** (o añade el enlace del repositorio de GitHub).
3. Pega el enlace de este repositorio:
   ```text
   https://github.com/xoxopix/nebula-mod
   ```
4. Haz clic en **Instalar** y reinicia Zen Browser.

### Método 2: Respaldo Manual
1. Abre tu perfil de Zen (escribe `about:support` en la barra de direcciones y abre la carpeta del perfil).
2. Ve a la carpeta `chrome/sine-mods/` y copia esta carpeta como `nebula-mod`.
3. (Opcional) Copia el archivo `user.js` directamente en la raíz de tu perfil para aplicar permanentemente las optimizaciones de red y rendimiento al arrancar.
4. Reinicia Zen Browser.

---

## 🛠️ Estructura del Repositorio

```text
nebula-mod/
├── theme.json                    # Manifiesto para Sine Mod Manager
├── preferences.json              # Preferencias configurables
├── userChrome.css                # Estilos principales de interfaz + 12 secciones personalizadas
├── userContent.css               # Estilos de contenido web y visor PDF
├── user.js                       # Optimizaciones de red, memoria, GPU y telemetría
├── nebula/
│   ├── chrome.css                # Importador de módulos de Nebula
│   ├── content.css               # Importador de estilos de contenido
│   ├── config.css                # Variables de color y dimensiones
│   ├── content/                  # Better PDF, ajustes transparentes, etc.
│   └── modules/                  # Módulos de interfaz y custom-icons.css
├── js/
│   └── nebula.uc.js              # Script central con módulos de medios, polyfills y rendimiento
└── README.md                     # Documentación de uso e instalación
```

---

## 👤 Créditos y Licencia
- Basado en el mod original **Nebula** por *JustADumbPrsn* y **New Icons** por *qumeqa*.
- Correcciones de reproductor, integración de iconos normalizados, Better PDF y perfil de rendimiento unificados por **EVA 01**.
- Licencia MIT / Mozilla Public License.
