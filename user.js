user_pref("toolkit.legacyUserProfileCustomizations.stylesheets", true);
user_pref("browser.startup.page", 3);
user_pref("browser.tabs.allow_transparent_browser", false);
user_pref("widget.windows.mica", true);
user_pref("widget.windows.mica.toplevel-backdrop", 2);
user_pref("zen.theme.acrylic-elements", true);


/* ====== Optimizaciones de Red Anti-Bloqueos (Solución a Pestañas que no terminan de cargar) ====== */
user_pref("network.http.rcwn.enabled", false);
user_pref("network.http.response.timeout", 20);
user_pref("network.http.connection-timeout", 10);
user_pref("network.http.max-connections", 300);
user_pref("network.http.max-persistent-connections-per-server", 6);
user_pref("network.http.max-urgent-start-connections", 4);
user_pref("network.http.speculative-parallel-limit", 0);
user_pref("network.http.http3.enable", false);
user_pref("network.dns.disableIPv6", true);
user_pref("network.dns.disablePrefetch", true);
user_pref("network.dns.disablePrefetchFromHTTPS", true);
user_pref("network.predictor.enabled", false);
user_pref("network.predictor.enable-prefetch", false);
user_pref("network.ssl_tokens_cache_capacity", 2048);

/* ====== Rendimiento de Memoria y Caché Saludable ====== */
user_pref("browser.cache.memory.enable", true);
user_pref("browser.cache.memory.capacity", -1);
user_pref("browser.cache.disk.smart_size.enabled", true);
user_pref("browser.sessionhistory.max_total_viewers", 4);
user_pref("browser.tabs.unloadOnLowMemory", true);
user_pref("browser.tabs.remote.warmup.enabled", false);

/* ====== Arranque Ultrarrápido (Carga Bajo Demanda) ====== */
user_pref("browser.sessionstore.restore_on_demand", true);

/* ====== Renderizado Multihilo y CPU-Friendly (Gráficos Integrados) ====== */
user_pref("layout.css.servo.parallel-restyle", true);
user_pref("gfx.webrender.all", true);
user_pref("accessibility.force_disabled", 1);
user_pref("dom.ipc.processPriorityManager.enabled", false);

/* ====== Mantenimiento y Límite de Historial (Base de Datos Ligera) ====== */
user_pref("places.history.expiration.max_pages", 20000);

/* ====== Desactivar Telemetría y Procesos Ocultos en Segundo Plano ====== */
user_pref("toolkit.telemetry.enabled", false);
user_pref("toolkit.telemetry.unified", false);
user_pref("browser.ping-centre.telemetry", false);
user_pref("datareporting.healthreport.uploadEnabled", false);
user_pref("datareporting.policy.dataSubmissionEnabled", false);

/* ====== Optimizaciones para Visor PDF ====== */
user_pref("pdfjs.annotationEditorMode", 0);
user_pref("pdfjs.enableAltText", false);
user_pref("pdfjs.enableAltTextForEnglish", false);
user_pref("pdfjs.enableScripting", false);
user_pref("pdfjs.enabledCache.state", true);
user_pref("pdfjs.enableOptimizedPartialRendering", false);
user_pref("pdfjs.capCanvasAreaFactor", -1);
user_pref("pdfjs.disableAutoFetch", false);


