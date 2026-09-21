// ==UserScript==
// @name           nebula.uc.js
// @description    Central engine for Nebula with all modules
// @author         JustAdumbPrsn
// @version        v3.4
// @include        main
// @grant          none
// ==/UserScript==

(function () {
  "use strict";

  if (window.Nebula) {
    try {
      window.Nebula.destroy();
    } catch {}
  }

  window.Nebula = {
    _modules: [],
    _initialized: false,

    logger: {
      _prefix: "[Nebula]",
      log(msg) {
        console.log(`${this._prefix} ${msg}`);
      },
      warn(msg) {
        console.warn(`${this._prefix} ${msg}`);
      },
      error(msg) {
        console.error(`${this._prefix} ${msg}`);
      },
    },

    runOnLoad(callback) {
      if (
        document.readyState === "complete" ||
        document.readyState === "interactive"
      ) {
        callback();
      } else {
        document.addEventListener("DOMContentLoaded", callback, { once: true });
        window.addEventListener("load", callback, { once: true });
      }
    },

    register(ModuleClass) {
      const name = ModuleClass?.name || "UnnamedModule";
      if (!ModuleClass) {
        this.logger.warn(
          `Module "${name}" is not defined, skipping registration.`,
        );
        return;
      }
      if (this._modules.find((m) => m._name === name)) {
        this.logger.warn(`Module "${name}" already registered.`);
        return;
      }

      let instance;
      try {
        instance = new ModuleClass();
      } catch (err) {
        this.logger.error(`Module "${name}" failed to construct:\n${err}`);
        return; // skip this module, keep others running
      }

      instance._name = name;
      this._modules.push(instance);

      if (this._initialized && typeof instance.init === "function") {
        try {
          instance.init();
        } catch (err) {
          this.logger.error(`Module "${name}" failed to init:\n${err}`);
        }
      }
    },

    getModule(name) {
      return this._modules.find((m) => m._name === name);
    },

    observePresence(selector, attrName) {
      const update = () => {
        const found = !!document.querySelector(selector);
        document.documentElement.toggleAttribute(attrName, found);
      };
      const observer = new MutationObserver(update);
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
      });
      update();
      return observer;
    },

    init() {
      this.logger.log("⏳ Initializing core...");
      this._initialized = true;
      this.runOnLoad(() => {
        this._modules.forEach((m) => {
          try {
            m.init?.();
          } catch (err) {
            this.logger.error(`Module "${m._name}" failed to init:\n${err}`);
          }
        });
      });
      window.addEventListener("unload", () => this.destroy(), { once: true });
    },

    destroy() {
      this._modules.forEach((m) => {
        try {
          m.destroy?.();
        } catch (err) {
          this.logger.error(`Module "${m._name}" failed to destroy:\n${err}`);
        }
      });
      this.logger.log("🧹 All modules destroyed.");
      delete window.Nebula;
    },

    debug: {
      listModules() {
        return Nebula._modules.map((m) => m._name || "Unnamed");
      },
      destroyModule(name) {
        const mod = Nebula._modules.find((m) => m._name === name);
        try {
          mod?.destroy?.();
        } catch (err) {
          Nebula.logger.error(`Module "${name}" failed to destroy:\n${err}`);
        }
      },
      reload() {
        Nebula.destroy();
        location.reload();
      },
    },
  };

  // ========== NebulaPolyfillModule ==========
  class NebulaPolyfillModule {
    constructor() {
      this.root = document.documentElement;
      this.compactObserver = null;
      this.modeObserver = null;

      this.updateFaviconColor = this.updateFaviconColor.bind(this);
    }

    async init() {
      // Wait until gBrowser and tabContainer are available
      while (!window.gBrowser?.tabContainer) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      // Sync active tab glow preference attribute to root
      const updateGlowPref = () => {
        try {
          const val = Services.prefs.getIntPref("nebula-active-tab-glow", 2);
          this.root.setAttribute("nebula-active-tab-glow", String(val));
        } catch {
          this.root.setAttribute("nebula-active-tab-glow", "2");
        }
      };
      updateGlowPref();
      try {
        Services.prefs.addObserver("nebula-active-tab-glow", updateGlowPref);
      } catch {}

      // Toolbar and compact mode detection (directly on root, avoiding full-DOM subtree observation)
      this.modeObserver = new MutationObserver(() => this.updateToolbarModes());
      this.modeObserver.observe(this.root, {
        attributes: true,
        attributeFilter: [
          "zen-sidebar-expanded",
          "zen-single-toolbar",
          "zen-compact-mode",
        ],
      });
      this.updateToolbarModes();

      // Favicon color detection
      gBrowser.tabContainer.addEventListener(
        "TabSelect",
        this.updateFaviconColor,
      );
      gBrowser.tabContainer.addEventListener(
        "TabAttrModified",
        this.updateFaviconColor,
      );

      // Multiple initial passes to ensure active tab is colored immediately
      setTimeout(() => this.updateFaviconColor(), 50);
      setTimeout(() => this.updateFaviconColor(), 250);
      setTimeout(() => this.updateFaviconColor(), 800);

      Nebula.logger.log("✅ [Polyfill] Detection active.");
    }

    updateToolbarModes() {
      const hasSidebar =
        this.root.getAttribute("zen-sidebar-expanded") === "true";
      const isSingle =
        this.root.getAttribute("zen-single-toolbar") === "true";
      const isCompact =
        this.root.getAttribute("zen-compact-mode") === "true";

      this.root.toggleAttribute("nebula-compact-mode", isCompact);
      this.root.toggleAttribute("nebula-single-toolbar", isSingle);
      this.root.toggleAttribute(
        "nebula-multi-toolbar",
        hasSidebar && !isSingle,
      );
      this.root.toggleAttribute(
        "nebula-collapsed-toolbar",
        !hasSidebar && !isSingle,
      );
    }

    _applyFaviconColor(color, tab) {
      if (!color) return;
      this.root.style.setProperty("--nebula-selected-favicon-color", color);
      this.root.setAttribute("data-nebula-favicon-active", "true");
      this.root.setAttribute("nebula-active-tab-glow", "2");
      if (tab) {
        tab.style.setProperty("--nebula-selected-favicon-color", color);
        tab.setAttribute("data-favicon-color", color);
      }
    }

    _extractDominantFromData(data) {
      if (!data || data.length === 0) return null;
      const counts = [];
      for (let i = 0; i < data.length; i += 4) {
        const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
        if (a < 128) continue;
        const key = `${r & 0xfc},${g & 0xfc},${b & 0xfc}`;
        const index = counts.findIndex((c) => c.key === key);
        if (index >= 0) counts[index].freq++;
        else counts.push({ key, r, g, b, freq: 1 });
      }

      if (counts.length === 0) return null;

      let best = null;
      let brightCandidate = null;

      for (let c of counts) {
        const hsl = this.rgbToHsl(c.r, c.g, c.b);
        const vibrancy = hsl.s * (1 - Math.abs(0.5 - hsl.l) * 2);
        const brightness = (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255;
        const score = c.freq * (vibrancy + 0.1) * (brightness + 0.1);

        if (!best || score > best.score) best = { ...c, score, brightness, hsl };
        if (brightness > 0.4 && hsl.s > 0.2) {
          if (!brightCandidate || score > brightCandidate.score) {
            brightCandidate = { ...c, score, brightness, hsl };
          }
        }
      }

      if (best && best.r + best.g + best.b < 280 && brightCandidate) {
        best = brightCandidate;
      }

      if (best) {
        let { r, g, b, hsl } = best;
        const sum = r + g + b;
        if (sum < 180) {
          let newL = Math.max(hsl.l, 0.45);
          newL = Math.min(newL * 1.6, 0.85);
          let newS = Math.min(Math.max(hsl.s, 0.4) * 1.3, 1);
          ({ r, g, b } = this.hslToRgb(hsl.h, newS, newL));
        }
        return `rgb(${r | 0}, ${g | 0}, ${b | 0})`;
      }
      return null;
    }

    async updateFaviconColor(e) {
      if (
        e?.type === "TabAttrModified" &&
        e.detail?.changed &&
        !e.detail.changed.some((attr) => ["image", "icon", "label", "title"].includes(attr))
      ) {
        return;
      }

      const tab = window.gBrowser?.selectedTab;
      if (!tab) return;

      const uri = tab.linkedBrowser?.currentURI?.spec || "";
      if (
        uri.startsWith("about:") ||
        uri.startsWith("chrome:") ||
        uri.startsWith("resource:")
      ) {
        if (this.root.style.getPropertyValue("--nebula-selected-favicon-color")) {
          this.root.style.removeProperty("--nebula-selected-favicon-color");
        }
        if (tab.style.getPropertyValue("--nebula-selected-favicon-color")) {
          tab.style.removeProperty("--nebula-selected-favicon-color");
        }
        if (tab.hasAttribute("data-favicon-color")) {
          tab.removeAttribute("data-favicon-color");
        }
        return;
      }

      const iconUrl =
        tab.image ||
        tab.getAttribute("image") ||
        tab.querySelector(".tab-icon-image")?.getAttribute("src") ||
        tab.querySelector(".tab-icon-image")?.src ||
        (window.gBrowser && typeof gBrowser.getIcon === "function"
          ? gBrowser.getIcon(tab)
          : null);

      const cacheKey = iconUrl || uri;
      this._faviconCache = this._faviconCache || new Map();
      if (cacheKey && this._faviconCache.has(cacheKey)) {
        this._applyFaviconColor(this._faviconCache.get(cacheKey), tab);
        return;
      }

      // Fast immediate domain fallback for popular sites so tab lights up instantly
      let fastColor = null;
      if (uri.includes("reddit.")) fastColor = "rgb(255, 69, 0)";
      else if (uri.includes("youtube.")) fastColor = "rgb(255, 0, 0)";
      else if (uri.includes("spotify.")) fastColor = "rgb(30, 215, 96)";
      else if (uri.includes("twitter.") || uri.includes("x.com")) fastColor = "rgb(29, 155, 240)";
      else if (uri.includes("twitch.")) fastColor = "rgb(145, 71, 255)";
      else if (uri.includes("discord.")) fastColor = "rgb(88, 101, 242)";
      else if (uri.includes("github.")) fastColor = "rgb(180, 140, 255)";

      if (fastColor) {
        if (cacheKey) this._faviconCache.set(cacheKey, fastColor);
        this._applyFaviconColor(fastColor, tab);
        return;
      }

      // Debounce: exact pixel color extraction (deferred so it never interrupts tab switch transitions)
      if (this._faviconTimeout) clearTimeout(this._faviconTimeout);
      this._faviconTimeout = setTimeout(async () => {
        try {
          let extractedColor = null;

          // Strategy 1: ctx.drawWindow from rendered .tab-icon-image
          const iconEl = tab.querySelector(".tab-icon-image");
          if (iconEl) {
            const rect = iconEl.getBoundingClientRect();
            if (rect.width > 2 && rect.height > 2) {
              const canvas = document.createElement("canvas");
              canvas.width = 16;
              canvas.height = 16;
              const ctx = canvas.getContext("2d", { willReadFrequently: true });
              if (typeof ctx.drawWindow === "function") {
                try {
                  ctx.drawWindow(
                    window,
                    rect.left,
                    rect.top,
                    rect.width,
                    rect.height,
                    "rgba(0,0,0,0)"
                  );
                  const imgData = ctx.getImageData(0, 0, 16, 16).data;
                  extractedColor = this._extractDominantFromData(imgData);
                } catch {}
              }
            }
          }

          // Strategy 2: privileged fetch + createImageBitmap
          if (!extractedColor && iconUrl) {
            try {
              let bitmap = null;
              if (
                iconUrl.startsWith("http://") ||
                iconUrl.startsWith("https://") ||
                iconUrl.startsWith("data:")
              ) {
                const res = await window.fetch(iconUrl);
                const blob = await res.blob();
                bitmap = await createImageBitmap(blob);
              } else {
                const img = new Image();
                img.src = iconUrl;
                await new Promise((resolve) => {
                  if (img.complete && img.naturalWidth > 0) {
                    resolve();
                    return;
                  }
                  img.onload = resolve;
                  img.onerror = resolve;
                });
                if (img.naturalWidth > 0) {
                  bitmap = img;
                }
              }

              if (bitmap) {
                const canvas = document.createElement("canvas");
                canvas.width = 16;
                canvas.height = 16;
                const ctx = canvas.getContext("2d", { willReadFrequently: true });
                ctx.drawImage(bitmap, 0, 0, 16, 16);
                const imgData = ctx.getImageData(0, 0, 16, 16).data;
                extractedColor = this._extractDominantFromData(imgData);
              }
            } catch {}
          }

          const finalColor = extractedColor || fastColor;
          if (finalColor) {
            if (cacheKey) this._faviconCache.set(cacheKey, finalColor);
            this._applyFaviconColor(finalColor, tab);
          }
        } catch (err) {
          Nebula.logger.error("Favicon color error: " + err);
        }
      }, 300);
    }

    // helper: convert HSL to RGB
    hslToRgb(h, s, l) {
      let r, g, b;
      if (s === 0) {
        r = g = b = l; // achromatic
      } else {
        const hue2rgb = (p, q, t) => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1 / 6) return p + (q - p) * 6 * t;
          if (t < 1 / 2) return q;
          if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
          return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
      }
      return { r: r * 255, g: g * 255, b: b * 255 };
    }

    // helper: convert RGB to HSL
    rgbToHsl(r, g, b) {
      r /= 255;
      g /= 255;
      b /= 255;
      const max = Math.max(r, g, b),
        min = Math.min(r, g, b);
      let h,
        s,
        l = (max + min) / 2;

      if (max === min) {
        h = s = 0;
      } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r:
            h = (g - b) / d + (g < b ? 6 : 0);
            break;
          case g:
            h = (b - r) / d + 2;
            break;
          case b:
            h = (r - g) / d + 4;
            break;
        }
        h /= 6;
      }
      return { h, s, l };
    }

    destroy() {
      this.compactObserver?.disconnect();
      this.modeObserver?.disconnect();

      if (window.gBrowser) {
        gBrowser.tabContainer.removeEventListener(
          "TabSelect",
          this.updateFaviconColor,
        );
        gBrowser.tabContainer.removeEventListener(
          "TabAttrModified",
          this.updateFaviconColor,
        );
      }

      this.root.removeAttribute("nebula-single-toolbar");
      this.root.removeAttribute("nebula-multi-toolbar");
      this.root.removeAttribute("nebula-collapsed-toolbar");

      Nebula.logger.log("🧹 [Polyfill] Destroyed.");
    }
  }

  // ========== NebulaGradientSliderModule ==========
  class NebulaGradientSliderModule {
    constructor() {
      this.root = document.documentElement;
      this.gradientSlider = null;
      this._patched = false;
      this._sliderHandler = this.sync.bind(this);

      // Store original methods without polluting prototype
      this._origMethods = new WeakMap();
    }

    init() {
      this._waitFor(
        () => document.querySelector("#PanelUI-zen-gradient-generator-opacity"),
        (slider) => {
          this.gradientSlider = slider;
          slider.min = 0.0; // force min opacity
          slider.addEventListener("input", this._sliderHandler);

          this.sync();
          this._patchThemePicker();
        },
      );
    }

    _waitFor(fn, callback, maxRetries = 40) {
      let retries = maxRetries;
      const tryFind = () => {
        const el = fn();
        if (el) return callback(el);
        if (retries-- > 0) {
          Nebula.logger.debug?.(
            `[GradientSlider] Waiting… retries left: ${retries}`,
          );
          requestAnimationFrame(tryFind);
        } else {
          Nebula.logger.error("❌ [GradientSlider] Target not found.");
        }
      };
      tryFind();
    }

    sync() {
      if (!this.gradientSlider) return;
      const val = +this.gradientSlider.value;
      this.root.style.setProperty(
        "--nebula-gradient-opacity",
        val === 0 ? "0" : null,
      );
      Nebula.logger.debug?.(`[GradientSlider] Sync → ${val}`);
    }

    _patchThemePicker() {
      if (this._patched) return;

      this._waitFor(
        () =>
          window.nsZenThemePicker?.prototype ||
          window.browser?.gZenThemePicker?.constructor?.prototype,
        (proto) => {
          if (!proto?.blendWithWhiteOverlay) return;

          // Save original
          this._origMethods.set(proto, proto.blendWithWhiteOverlay);

          const moduleInstance = this;

          proto.blendWithWhiteOverlay = function (baseColor, opacity) {
            const val = +moduleInstance.gradientSlider?.value ?? opacity;
            if (val === 0) {
              if (Array.isArray(baseColor)) {
                return `rgba(${baseColor.join(",")},0)`;
              }
              if (
                typeof baseColor === "string" &&
                baseColor.startsWith("rgb")
              ) {
                return baseColor.replace(/rgb(a)?\(([^)]+)\)/, "rgba($2, 0)");
              }
              return "rgba(0,0,0,0)";
            }
            // Call the original method with the correct context
            return moduleInstance._origMethods
              .get(proto)
              .call(this, baseColor, opacity);
          };

          this._patched = true;
          Nebula.logger.log(
            "✅ [GradientSlider] Patched blendWithWhiteOverlay",
          );
        },
      );
    }

    destroy() {
      if (this.gradientSlider) {
        this.gradientSlider.removeEventListener("input", this._sliderHandler);
        this.gradientSlider = null;
      }

      if (this._patched) {
        const proto =
          window.nsZenThemePicker?.prototype ||
          window.browser?.gZenThemePicker?.constructor?.prototype;
        if (proto && this._origMethods.has(proto)) {
          proto.blendWithWhiteOverlay = this._origMethods.get(proto);
          this._origMethods.delete(proto);
        }
        this._patched = false;
      }

      this.root.style.removeProperty("--nebula-gradient-opacity");
      Nebula.logger.log("🧹 [GradientSlider] Destroyed");
    }
  }

  // ========== NebulaTitlebarBackgroundModule ==========
  class NebulaTitlebarBackgroundModule {
    constructor() {
      this.root = document.documentElement;
      this.browser = document.getElementById("browser");
      this.titlebar = document.getElementById("titlebar");
      this.overlay = null;
      this.lastRect = {};
      this.lastVisible = false;
      this.animationFrameId = null;

      this.update = this.update.bind(this);
      this._compactCallback = this._compactCallback.bind(this);
      this.resizeObserver = null;
      this.intersectionObserver = null;
    }

    init() {
      if (!this.browser || !this.titlebar) {
        Nebula.logger.warn(
          "⚠️ [TitlebarBackground] Required elements not found.",
        );
        return;
      }

      this.overlay = document.createElement("div");
      this.overlay.id = "Nebula-titlebar-background";
      Object.assign(this.overlay.style, {
        position: "absolute",
        display: "none",
      });
      this.browser.appendChild(this.overlay);

      gZenCompactModeManager.addEventListener(this._compactCallback);

      if (this.root.hasAttribute("nebula-compact-mode")) {
        this.startLiveTracking();
      }

      Nebula.logger.log("✅ [TitlebarBackground] Tracking initialized.");
    }

    _compactCallback() {
      const isCompact = this.root.hasAttribute("nebula-compact-mode");
      if (isCompact) {
        this.startLiveTracking();
      } else {
        this.stopLiveTracking();
        this.hideOverlay();
      }
    }

    update() {
      const isCompact = this.root.hasAttribute("nebula-compact-mode");

      if (!isCompact) {
        this.stopLiveTracking();
        this.hideOverlay();
        return;
      }

      const rect = this.titlebar.getBoundingClientRect();
      const style = getComputedStyle(this.titlebar);

      const isVisible =
        rect.width > 5 &&
        rect.height > 5 &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        style.opacity !== "0" &&
        rect.bottom > 0 &&
        rect.top < window.innerHeight;

      this.lastRect = {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      };

      if (isVisible) {
        Object.assign(this.overlay.style, {
          top: `${rect.top + window.scrollY}px`,
          left: `${rect.left + window.scrollX}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
          display: "block",
        });

        if (!this.lastVisible) {
          this.overlay.classList.add("visible");
          this.lastVisible = true;
        }
      } else {
        this.hideOverlay();
      }
    }

    hideOverlay() {
      if (this.lastVisible) {
        this.overlay.classList.remove("visible");
        this.overlay.style.display = "none";
        this.lastVisible = false;
      }
    }

    startLiveTracking() {
      this.stopLiveTracking();
      this.update();
      if (!this.resizeObserver && window.ResizeObserver) {
        this.resizeObserver = new ResizeObserver(() => this.update());
        this.resizeObserver.observe(this.titlebar);
      }
      window.addEventListener("resize", this.update, { passive: true });
    }

    stopLiveTracking() {
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
        this.resizeObserver = null;
      }
      window.removeEventListener("resize", this.update);
    }

    destroy() {
      gZenCompactModeManager.removeEventListener(this._compactCallback);
      this.stopLiveTracking();
      this.hideOverlay();
      this.overlay?.remove();
      this.overlay = null;
      Nebula.logger.log("🧹 [TitlebarBackground] Destroyed.");
    }
  }

  // ========== NebulaNavbarBackgroundModule ==========
  class NebulaNavbarBackgroundModule {
    constructor() {
      this.root = document.documentElement;
      this.browser = document.getElementById("browser");
      this.navbar = document.getElementById("nav-bar");
      this.overlay = null;
      this.lastRect = {};
      this.lastVisible = false;
      this.animationFrameId = null;

      this.update = this.update.bind(this);
      this._compactCallback = this._compactCallback.bind(this);
    }

    init() {
      if (!this.browser || !this.navbar) {
        Nebula.logger.warn(
          "⚠️ [NavbarBackground] Required elements not found.",
        );
        return;
      }

      this.overlay = document.createElement("div");
      this.overlay.id = "Nebula-navbar-background";
      Object.assign(this.overlay.style, {
        position: "absolute",
        display: "none",
      });
      this.browser.appendChild(this.overlay);

      gZenCompactModeManager.addEventListener(this._compactCallback);

      if (this.root.hasAttribute("nebula-compact-mode")) {
        this.startLiveTracking();
      }

      Nebula.logger.log("✅ [NavbarBackground] Tracking initialized.");
    }

    _compactCallback() {
      const isCompact = this.root.hasAttribute("nebula-compact-mode");
      if (isCompact) {
        this.startLiveTracking();
      } else {
        this.stopLiveTracking();
        this.hideOverlay();
      }
    }

    update() {
      const isCompact = this.root.hasAttribute("nebula-compact-mode");
      if (!isCompact) {
        this.stopLiveTracking();
        this.hideOverlay();
        return;
      }

      const rect = this.navbar.getBoundingClientRect();
      const style = getComputedStyle(this.navbar);

      const isVisible =
        rect.width > 5 &&
        rect.height > 5 &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        style.opacity !== "0" &&
        rect.bottom > 0 &&
        rect.top < window.innerHeight;

      const changed =
        rect.top !== this.lastRect.top ||
        rect.left !== this.lastRect.left ||
        rect.width !== this.lastRect.width ||
        rect.height !== this.lastRect.height;

      if (!changed && this.lastVisible === isVisible) {
        this.animationFrameId = requestAnimationFrame(this.update);
        return;
      }

      this.lastRect = {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      };

      if (isVisible) {
        Object.assign(this.overlay.style, {
          top: `${rect.top + window.scrollY}px`,
          left: `${rect.left + window.scrollX}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
          display: "block",
        });

        if (!this.lastVisible) {
          this.overlay.classList.add("visible");
          this.lastVisible = true;
        }
      } else {
        this.hideOverlay();
      }

      this.animationFrameId = requestAnimationFrame(this.update);
    }

    hideOverlay() {
      if (this.lastVisible) {
        this.overlay.classList.remove("visible");
        this.overlay.style.display = "none";
        this.lastVisible = false;
      }
    }

    startLiveTracking() {
      this.stopLiveTracking();
      this.update();
    }

    stopLiveTracking() {
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
    }

    destroy() {
      gZenCompactModeManager.removeEventListener(this._compactCallback);
      this.stopLiveTracking();
      this.hideOverlay();
      this.overlay?.remove();
      this.overlay = null;
      Nebula.logger.log("🧹 [NavbarBackground] Destroyed.");
    }
  }

  // ========== NebulaURLBarBackgroundModule ==========
  class NebulaURLBarBackgroundModule {
    constructor() {
      this.root = document.documentElement;
      this.browser = document.getElementById("browser");
      this.urlbar = document.getElementById("urlbar");
      this.overlay = null;
      this.lastRect = {};
      this.lastVisible = false;
      this.animationFrameId = null;

      this.update = this.update.bind(this);
      this.mutationObserver = null;
    }

    init() {
      if (!this.browser || !this.urlbar) {
        Nebula.logger.warn(
          "⚠️ [URLBarBackground] Required elements not found.",
        );
        return;
      }

      this.overlay = document.createElement("div");
      this.overlay.id = "Nebula-urlbar-background";
      Object.assign(this.overlay.style, {
        position: "absolute",
        display: "none",
      });
      this.browser.appendChild(this.overlay);

      // Start mutation observer for `open` attribute change
      this.mutationObserver = new MutationObserver(() => this.onMutation());
      this.mutationObserver.observe(this.urlbar, {
        attributes: true,
        attributeFilter: ["open"],
      });

      if (this.urlbar.hasAttribute("open")) {
        this.startLiveTracking();
      }

      Nebula.logger.log("✅ [URLBarBackground] Tracking initialized.");
    }

    onMutation() {
      const isOpen = this.urlbar.hasAttribute("open");
      if (isOpen) {
        this.startLiveTracking();
      } else {
        this.stopLiveTracking();
        this.hideOverlay();
      }
    }

    update() {
      const isOpen = this.urlbar.hasAttribute("open");
      if (!isOpen) {
        this.stopLiveTracking();
        this.hideOverlay();
        return;
      }

      const rect = this.urlbar.getBoundingClientRect();
      const style = getComputedStyle(this.urlbar);

      const isVisible =
        rect.width > 5 &&
        rect.height > 5 &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        style.opacity !== "0" &&
        rect.bottom > 0 &&
        rect.top < window.innerHeight;

      const changed =
        rect.top !== this.lastRect.top ||
        rect.left !== this.lastRect.left ||
        rect.width !== this.lastRect.width ||
        rect.height !== this.lastRect.height;

      if (!changed && this.lastVisible === isVisible) {
        this.animationFrameId = requestAnimationFrame(this.update);
        return;
      }

      this.lastRect = {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      };

      if (isVisible) {
        Object.assign(this.overlay.style, {
          top: `${rect.top + window.scrollY}px`,
          left: `${rect.left + window.scrollX}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
          display: "block",
        });

        if (!this.lastVisible) {
          this.overlay.classList.add("visible");
          this.lastVisible = true;
        }
      } else {
        this.hideOverlay();
      }

      this.animationFrameId = requestAnimationFrame(this.update);
    }

    hideOverlay() {
      if (this.lastVisible) {
        this.overlay.classList.remove("visible");
        this.overlay.style.display = "none";
        this.lastVisible = false;
      }
    }

    startLiveTracking() {
      this.stopLiveTracking();
      this.update();
    }

    stopLiveTracking() {
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
    }

    destroy() {
      this.mutationObserver?.disconnect();
      this.stopLiveTracking();
      this.hideOverlay();
      this.overlay?.remove();
      this.overlay = null;
      Nebula.logger.log("🧹 [URLBarBackground] Destroyed.");
    }
  }

  // ========== NebulaMediaCoverArtModule ==========
  class NebulaMediaCoverArtModule {
    constructor() {
      this.OVERLAY_ID = "Nebula-media-cover-art";
      this._prototypeHooked = false;
    }

    init() {
      this._hookMediaController();
    }

    _getToolbar() {
      return (
        window.gZenMediaController?.mediaControlBar ||
        document.getElementById("zen-media-controls-toolbar")
      );
    }

    _hookMediaController() {
      const self = this;

      // 1. Hook gZenMediaController.activateMediaControls synchronously without race conditions
      if (
        window.gZenMediaController &&
        typeof window.gZenMediaController.activateMediaControls === "function"
      ) {
        const origActivate = window.gZenMediaController.activateMediaControls;
        if (!origActivate._nebulaHooked) {
          window.gZenMediaController.activateMediaControls = function (
            mediaController,
            browser
          ) {
            const bar = self._getToolbar();
            const prevCards = new Set(
              bar ? bar.querySelectorAll(".zen-media-card") : []
            );

            const res = origActivate.apply(this, arguments);

            try {
              self._tryHookZenMediaCard();

              if (bar && mediaController) {
                // Find the exact new card element created synchronously for this activation
                let newCard = null;
                for (const el of bar.querySelectorAll(".zen-media-card")) {
                  if (!prevCards.has(el)) {
                    newCard = el;
                    break;
                  }
                }

                // If not newly appended, find the card corresponding to this browser
                if (!newCard && browser) {
                  newCard = self._findCardForBrowser(browser);
                }

                if (newCard) {
                  self._bindCard(newCard, mediaController, browser);
                }
              }
            } catch (e) {
              Nebula.logger.error("[MediaCoverArt] activateMediaControls hook error:", e);
            }

            return res;
          };
          window.gZenMediaController.activateMediaControls._nebulaHooked = true;
        }
      }

      // 2. Observe toolbar for DOM card additions / updates
      const observer = new MutationObserver(() => {
        self._tryHookZenMediaCard();
        self._updateAllCards();
      });

      const startObserver = () => {
        const toolbar = self._getToolbar();
        if (toolbar) {
          observer.observe(toolbar, { childList: true });
          self._tryHookZenMediaCard();
          self._updateAllCards();
        } else {
          setTimeout(startObserver, 300);
        }
      };
      startObserver();

      // 3. Audio playback attribute listener on tabs
      if (window.gBrowser?.tabContainer) {
        window.gBrowser.tabContainer.addEventListener("TabAttrModified", (e) => {
          if (e.detail?.changed?.includes("soundplaying")) {
            self._tryHookZenMediaCard();
            self._updateAllCards();
          }
        });
      }

      self._tryHookZenMediaCard();
      Nebula.logger.log("✅ [MediaCoverArt] Hooked into Modern Zen Media Player.");
    }

    _tryHookZenMediaCard() {
      if (this._prototypeHooked) return true;

      let proto = null;
      if (typeof ZenMediaCard !== "undefined" && ZenMediaCard.prototype) {
        proto = ZenMediaCard.prototype;
      } else if (window.gZenMediaController?.frontCard) {
        proto = Object.getPrototypeOf(window.gZenMediaController.frontCard);
      } else {
        const anyCard = document.querySelector("#zen-media-controls-toolbar .zen-media-card");
        if (anyCard?._zenMediaCard) {
          proto = Object.getPrototypeOf(anyCard._zenMediaCard);
        }
      }

      if (proto && !proto._nebulaCoverHooked) {
        this._patchZenMediaCard(proto);
        this._prototypeHooked = true;
        return true;
      }
      return false;
    }

    _patchZenMediaCard(proto) {
      if (!proto || proto._nebulaCoverHooked) return;
      proto._nebulaCoverHooked = true;

      const origUpdate = proto.updateMetadata;
      const origPosition = proto.updatePosition;
      const origFocus = proto.onFocus;
      const self = this;

      proto.updateMetadata = function () {
        origUpdate.apply(this, arguments);
        try {
          if (this.element && this.controller) {
            this.element._zenMediaCard = this;
            self._bindCard(this.element, this.controller, this.browser);
          }
        } catch (e) {
          Nebula.logger.error("[MediaCoverArt] updateMetadata patch error:", e);
        }
      };

      if (typeof origPosition === "function") {
        proto.updatePosition = function () {
          origPosition.apply(this, arguments);
          try {
            if (this.element && this.controller) {
              this.element._zenMediaCard = this;
              self._applyCoverToCard(this.element, this.controller);
            }
          } catch (e) {}
        };
      }

      proto.onFocus = function () {
        try {
          const tab = window.gBrowser?.getTabForBrowser(this.browser);
          if (tab && window.gZenWorkspaces?.switchTabIfNeeded) {
            window.gZenWorkspaces.switchTabIfNeeded(tab);
            return;
          }
        } catch (e) {
          Nebula.logger.error("[MediaCoverArt] onFocus error:", e);
        }
        if (typeof origFocus === "function") {
          origFocus.apply(this, arguments);
        }
      };

      Nebula.logger.log("✅ [MediaCoverArt] ZenMediaCard prototype patched successfully.");
    }

    _bindCard(cardEl, mediaController, browser) {
      if (!cardEl || !mediaController) return;

      // Avoid re-binding the same controller
      if (cardEl._mediaController === mediaController && cardEl._nebulaBound) {
        this._applyCoverToCard(cardEl, mediaController);
        return;
      }

      // Clean up previous controller listeners if controller changed
      if (typeof cardEl._nebulaCleanup === "function") {
        cardEl._nebulaCleanup();
      }

      cardEl._mediaController = mediaController;
      if (browser) cardEl._browser = browser;
      cardEl._nebulaBound = true;

      const update = () => this._applyCoverToCard(cardEl, mediaController);

      // Listen directly to controller events for instant, synchronized updates
      const listeners = {
        metadatachange: update,
        playbackstatechange: update,
        positionstatechange: update,
      };

      for (const [evt, fn] of Object.entries(listeners)) {
        try {
          mediaController.addEventListener(evt, fn);
        } catch {}
      }

      cardEl._nebulaCleanup = () => {
        for (const [evt, fn] of Object.entries(listeners)) {
          try {
            mediaController.removeEventListener(evt, fn);
          } catch {}
        }
        cardEl._nebulaBound = false;
      };

      update();
    }

    _findCardForBrowser(browser) {
      if (!browser) return null;
      const bar = this._getToolbar();
      if (!bar) return null;

      const cards = bar.querySelectorAll(".zen-media-card");
      for (const cardEl of cards) {
        if (cardEl._browser === browser || cardEl._zenMediaCard?.browser === browser) {
          return cardEl;
        }
        if (
          cardEl._browser?.browserId === browser.browserId ||
          cardEl._zenMediaCard?.browser?.browserId === browser.browserId
        ) {
          return cardEl;
        }
      }
      return null;
    }

    _findControllerForCard(cardEl) {
      if (cardEl._mediaController?.isActive) return cardEl._mediaController;
      if (cardEl._zenMediaCard?.controller?.isActive) return cardEl._zenMediaCard.controller;

      const browser = cardEl._browser || cardEl._zenMediaCard?.browser;
      if (browser?.browsingContext?.mediaController?.isActive) {
        return browser.browsingContext.mediaController;
      }

      const title = cardEl.querySelector(".zen-media-title")?.textContent?.trim();
      const artist = cardEl.querySelector(".zen-media-artist")?.textContent?.trim();

      if (window.gBrowser?.browsers) {
        // 1. Match by exact title
        if (title) {
          for (const b of window.gBrowser.browsers) {
            const ctrl = b.browsingContext?.mediaController;
            if (!ctrl?.isActive) continue;
            const meta = ctrl.getMetadata?.();
            if (meta?.title && meta.title.trim() === title) {
              cardEl._mediaController = ctrl;
              cardEl._browser = b;
              return ctrl;
            }
          }
        }

        // 2. Match by artist
        if (artist) {
          for (const b of window.gBrowser.browsers) {
            const ctrl = b.browsingContext?.mediaController;
            if (!ctrl?.isActive) continue;
            const meta = ctrl.getMetadata?.();
            if (meta?.artist && meta.artist.trim() === artist) {
              cardEl._mediaController = ctrl;
              cardEl._browser = b;
              return ctrl;
            }
          }
        }

        // 3. Fallback: single active card
        const allCards = document.querySelectorAll("#zen-media-controls-toolbar .zen-media-card");
        if (allCards.length === 1) {
          for (const b of window.gBrowser.browsers) {
            const ctrl = b.browsingContext?.mediaController;
            if (ctrl?.isActive && (ctrl.isPlaying || b.hasAttribute?.("soundplaying"))) {
              cardEl._mediaController = ctrl;
              cardEl._browser = b;
              return ctrl;
            }
          }
        }
      }

      return null;
    }

    _updateAllCards() {
      const bar = this._getToolbar();
      if (!bar) return;

      const cards = bar.querySelectorAll(".zen-media-card");
      cards.forEach((cardEl) => {
        const controller = this._findControllerForCard(cardEl);
        if (controller) {
          this._bindCard(cardEl, controller, cardEl._browser);
        }
      });
    }

    _applyCoverToCard(cardEl, controller) {
      if (!cardEl) return;

      const metadata = controller?.getMetadata?.();
      const artwork = metadata?.artwork;

      let coverUrl = null;
      if (Array.isArray(artwork) && artwork.length > 0) {
        const sorted = [...artwork].sort((a, b) => {
          const [aw, ah] = a.sizes?.split("x").map(Number) || [0, 0];
          const [bw, bh] = b.sizes?.split("x").map(Number) || [0, 0];
          return bw * bh - aw * ah;
        });
        coverUrl = sorted[0]?.src || null;
      }

      // Fast fallback for YouTube videos before MediaSession artwork arrives
      if (!coverUrl) {
        const browser = cardEl._browser || cardEl._zenMediaCard?.browser;
        const currentUrl = browser?.currentURI?.spec || "";
        if (currentUrl.includes("youtube.com/watch") || currentUrl.includes("youtu.be/")) {
          try {
            const urlObj = new URL(currentUrl);
            let videoId = urlObj.searchParams.get("v");
            if (!videoId && currentUrl.includes("youtu.be/")) {
              videoId = urlObj.pathname.slice(1).split("/")[0];
            }
            if (videoId) {
              coverUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
            }
          } catch {}
        }
      }

      let overlay = cardEl.querySelector(`:scope > #${this.OVERLAY_ID}`);
      if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = this.OVERLAY_ID;
        cardEl.prepend(overlay);
      }

      if (coverUrl) {
        cardEl._currentCoverUrl = coverUrl;
        if (overlay.style.backgroundImage !== `url("${coverUrl}")`) {
          overlay.style.backgroundImage = `url("${coverUrl}")`;
        }
        overlay.classList.add("visible");
        cardEl.style.setProperty("--nebula-cover-art", `url("${coverUrl}")`);
      } else if (!cardEl._currentCoverUrl || !controller?.isActive) {
        cardEl._currentCoverUrl = null;
        overlay.style.backgroundImage = "none";
        overlay.classList.remove("visible");
        cardEl.style.removeProperty("--nebula-cover-art");
      }
    }

    destroy() {
      const bar = this._getToolbar();
      if (bar) {
        bar.querySelectorAll(".zen-media-card").forEach((cardEl) => {
          if (typeof cardEl._nebulaCleanup === "function") {
            cardEl._nebulaCleanup();
          }
        });
      }
      document.querySelectorAll(`#${this.OVERLAY_ID}`).forEach((el) => el.remove());
      Nebula.logger.log("🧹 [MediaCoverArt] Destroyed.");
    }
  }

  // ========== NebulaMenuModule ==========
  class NebulaMenuModule {
    constructor() {
      this.root = document.documentElement;
      this.STAGGER_DELAY = 12;
      this.MAX_DELAY = 160;
      this.MENU_ITEM_SELECTORS = [
        "menuitem",
        "menuseparator",
        ".subviewbutton",
        ".panel-menuitem",
        ".panel-list-item",
        ".PanelUI-subView .subviewbutton",
        ".panel-subview-body > *",
        ".panel-subview .subviewbutton",
        'toolbarbutton[class*="subviewbutton"]',
        ".cui-widget-panel .subviewbutton",
        "vbox.panel-subview-body > *",
        ".panel-subview-body > toolbarbutton",
        ".panel-subview-body > .subviewbutton",
      ];

      this.observers = new Map();

      // Bind methods
      this.handlePopupShowing = this.handlePopupShowing.bind(this);
      this.handlePopupHidden = this.handlePopupHidden.bind(this);
    }

    init() {
      // Use bubble phase (false) so that Firefox's internal onpopupshowing handlers (PageContextMenu.onShowing)
      // have already updated item visibility, preventing stale items and double animations.
      document.addEventListener("popupshowing", this.handlePopupShowing, false);
      document.addEventListener("popuphidden", this.handlePopupHidden, true);
      document.addEventListener("ViewShowing", this.handlePopupShowing, false);
      document.addEventListener("ViewHiding", this.handlePopupHidden, true);

      Nebula.logger.log("✅ [MenuModule] Animations initialized.");
    }

    isItemVisible(item) {
      if (!item || item.nodeType !== 1) return false;
      if (item.hidden || item.getAttribute("hidden") === "true" || item.collapsed) {
        return false;
      }
      try {
        const style = window.getComputedStyle(item);
        if (style.display === "none" || style.visibility === "hidden") {
          return false;
        }
      } catch {
        return false;
      }
      return true;
    }

    getMenuItems(popup) {
      if (!popup) return [];
      let items = [];
      const selectorString =
        this._cachedSelectorString ||
        (this._cachedSelectorString = this.MENU_ITEM_SELECTORS.join(","));

      if (popup.localName === "menupopup") {
        items = Array.from(popup.children);
      } else {
        const subviewBody = popup.querySelector(".panel-subview-body");
        items = Array.from(
          (subviewBody || popup).querySelectorAll(selectorString),
        );
      }

      // Flatten children only if needed
      const flattenedItems = [];
      for (const item of items) {
        if (
          item.matches &&
          item.matches(".panel-subview-body, .panel-subview")
        ) {
          for (const child of item.children) {
            if (
              this.MENU_ITEM_SELECTORS.some((selector) =>
                child.matches(selector),
              )
            ) {
              flattenedItems.push(child);
            }
          }
        } else {
          flattenedItems.push(item);
        }
      }

      // Filter visible elements without depending on getBoundingClientRect during popupshowing
      return flattenedItems.filter((item) => this.isItemVisible(item));
    }

    animateMenuItems(popup) {
      if (!popup) return;

      const shouldAnimate =
        getComputedStyle(this.root)
          .getPropertyValue("--nebula-menu-animation")
          .trim() === "true";

      if (!shouldAnimate) return;

      const items = this.getMenuItems(popup);
      let animIndex = 0;

      window.requestAnimationFrame(() => {
        items.forEach((item) => {
          // Never re-animate an item that has already animated during this popup session
          if (item._nebulaAnimated) return;

          this.animateItem(item, animIndex++);
        });
      });
    }

    animateItem(item, index) {
      item._nebulaAnimated = true;

      const delay = Math.min(index * this.STAGGER_DELAY, this.MAX_DELAY);
      item.style.animationDelay = `${delay}ms`;
      item.classList.add("nebula-menu-anim");

      // Clean up animation class once completed so CSS transform doesn't linger and interfere with hover/submenus
      const onAnimEnd = () => {
        item.removeEventListener("animationend", onAnimEnd);
        item.classList.remove("nebula-menu-anim");
        item.style.animationDelay = "";
      };
      item.addEventListener("animationend", onAnimEnd, { once: true });
    }

    cleanupMenuItems(popup) {
      if (!popup) return;
      popup._nebulaAnimating = false;

      window.requestAnimationFrame(() => {
        const allDescendants = popup.querySelectorAll("*");
        for (const item of allDescendants) {
          item._nebulaAnimated = false;
          if (item.classList.contains("nebula-menu-anim")) {
            item.classList.remove("nebula-menu-anim");
            item.style.animationDelay = "";
          }
        }
        for (const child of popup.children) {
          child._nebulaAnimated = false;
          if (child.classList.contains("nebula-menu-anim")) {
            child.classList.remove("nebula-menu-anim");
            child.style.animationDelay = "";
          }
        }
      });
    }

    isTargetMenu(popup) {
      if (!popup || !popup.localName) return false;
      const menuTypes = [
        "menupopup",
        "#appMenu-popup",
        "#PanelUI-popup",
        ".panel-popup",
        ".panel-subview",
        "#PanelUI-history",
        "#PanelUI-bookmarks",
        "#PanelUI-downloads",
      ];
      return (
        menuTypes.some((selector) =>
          selector.startsWith("#") || selector.startsWith(".")
            ? popup.matches && popup.matches(selector)
            : popup.localName === selector,
        ) ||
        popup.classList.contains("panel-subview") ||
        popup.classList.contains("PanelUI-subView") ||
        popup.querySelector(".panel-subview-body")
      );
    }

    setupMutationObserver(popup) {
      // Native synchronous menupopups (context menus) do not need MutationObservers
      // because all items are ready at popupshowing. Observers on menupopups only cause
      // unwanted re-animations when hover or attributes change.
      if (popup.localName === "menupopup") return;
      if (this.observers.has(popup)) return;

      let debounceTimer = null;
      const observer = new MutationObserver((mutations) => {
        const hasRelevantMutations = mutations.some(
          (m) =>
            (m.type === "childList" && m.addedNodes.length > 0) ||
            (m.type === "attributes" &&
              ["hidden", "collapsed"].includes(m.attributeName)),
        );

        if (hasRelevantMutations) {
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            // Only animates newly added or newly visible items that don't have _nebulaAnimated
            this.animateMenuItems(popup);
          }, 16);
        }
      });

      // Observe only direct children (no subtree: true) to prevent child submenus from triggering parent observer
      observer.observe(popup, {
        childList: true,
        subtree: false,
        attributes: true,
        attributeFilter: ["hidden", "collapsed"],
      });

      this.observers.set(popup, observer);
    }

    handlePopupShowing(event) {
      const popup = event.target;
      if (!this.isTargetMenu(popup)) return;

      // Prevent re-triggering on the same popup if it's already showing/animating
      if (popup._nebulaAnimating) return;
      popup._nebulaAnimating = true;

      this.animateMenuItems(popup);
      this.setupMutationObserver(popup);
    }

    handlePopupHidden(event) {
      const popup = event.target;
      if (!this.isTargetMenu(popup)) return;

      this.cleanupMenuItems(popup);

      if (this.observers.has(popup)) {
        this.observers.get(popup).disconnect();
        this.observers.delete(popup);
      }
    }

    stop() {
      document.removeEventListener(
        "popupshowing",
        this.handlePopupShowing,
        false,
      );
      document.removeEventListener("popuphidden", this.handlePopupHidden, true);
      document.removeEventListener(
        "ViewShowing",
        this.handlePopupShowing,
        false,
      );
      document.removeEventListener("ViewHiding", this.handlePopupHidden, true);

      this.observers.forEach((observer) => observer.disconnect());
      this.observers.clear();

      document.querySelectorAll(".nebula-menu-anim").forEach((item) => {
        item.classList.remove("nebula-menu-anim");
        item.style.animationDelay = "";
        item._nebulaAnimated = false;
      });

      Nebula.logger.log("🛑 [MenuModule] Animations disabled.");
    }

    destroy() {
      this.stop();
      Nebula.logger.log("🧹 [MenuModule] Module destroyed.");
    }
  }

  // ========== NebulaCtrlTabDualBackgroundModule ==========
  class NebulaCtrlTabDualBackgroundModule {
    constructor({ trackingMode = "above" } = {}) {
      this.browser = document.getElementById("browser");
      this.panel = document.getElementById("ctrlTab-panel");
      this.overlays = {};
      this.lastRect = null;
      this.lastVisible = false;
      this.rafId = null;
      this.trackingMode = trackingMode;

      this.update = this.update.bind(this);
      this.onPopupShown = this.startTracking.bind(this);
      this.onPopupHidden = this.stopTracking.bind(this);
    }

    init() {
      if (!this.browser || !this.panel) {
        return Nebula.logger.warn(
          "⚠️ [CtrlTabDualBackground] Required elements not found.",
        );
      }

      if (this.trackingMode !== "below")
        this.overlays.above = this.createOverlay(
          "nebula-ctrltab-background-above",
          2147483646,
          true,
        );
      if (this.trackingMode !== "above")
        this.overlays.below = this.createOverlay(
          "nebula-ctrltab-background-below",
          0,
          false,
        );

      this.panel.addEventListener("popupshown", this.onPopupShown);
      this.panel.addEventListener("popuphidden", this.onPopupHidden);

      Nebula.logger.log("✅ [CtrlTabDualBackground] Initialized.");
    }

    createOverlay(id, zIndex, interactive) {
      const o = document.createElement("div");
      o.id = id;
      Object.assign(o.style, {
        position: "absolute",
        display: "none",
        zIndex: interactive ? zIndex : "",
        pointerEvents: interactive ? "auto" : "none",
      });
      this.browser.appendChild(o);
      return o;
    }

    startTracking() {
      if (!this.rafId) this.update();
    }

    stopTracking() {
      if (this.rafId) cancelAnimationFrame(this.rafId);
      this.rafId = null;
      this.hideOverlays();
    }

    update() {
      const p = this.panel;
      if (!p) return;

      const target = document.getElementById("ctrlTab-previews") || p;
      const r = target.getBoundingClientRect();
      const cs = getComputedStyle(p);
      const visible =
        r.width > 5 &&
        r.height > 5 &&
        cs.display !== "none" &&
        cs.visibility !== "hidden" &&
        cs.opacity !== "0";

      if (!visible) return this.hideOverlays();

      const changed =
        !this.lastRect ||
        r.top !== this.lastRect.top ||
        r.left !== this.lastRect.left ||
        r.width !== this.lastRect.width ||
        r.height !== this.lastRect.height;

      if (!changed && this.lastVisible) {
        this.rafId = requestAnimationFrame(this.update);
        return;
      }

      this.lastRect = {
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
      };
      const style = {
        top: `${r.top + window.scrollY}px`,
        left: `${r.left + window.scrollX}px`,
        width: `${r.width}px`,
        height: `${r.height}px`,
        display: "block",
      };

      Object.values(this.overlays).forEach(
        (o) => o && Object.assign(o.style, style),
      );

      this.lastVisible = true;
      this.rafId = requestAnimationFrame(this.update);
    }

    hideOverlays() {
      Object.values(this.overlays).forEach(
        (o) => o && (o.style.display = "none"),
      );
      this.lastVisible = false;
    }

    destroy() {
      this.panel?.removeEventListener("popupshown", this.onPopupShown);
      this.panel?.removeEventListener("popuphidden", this.onPopupHidden);
      this.stopTracking();
      Object.values(this.overlays).forEach((o) => o?.remove());
      this.overlays = {};
      Nebula.logger.log("🧹 [CtrlTabDualBackground] Destroyed.");
    }
  }

  // ========== NebulaPDFHelperModule ==========
  class NebulaPDFHelperModule {
    constructor() {
      this._onKeyDown = this._onKeyDown.bind(this);
    }

    init() {
      window.addEventListener("keydown", this._onKeyDown, true);
      Nebula.logger.log("✅ [PDFHelper] Active.");
    }

    _onKeyDown(e) {
      if (e.key === "Escape") {
        try {
          const doc =
            window.gBrowser?.selectedBrowser?.contentDocument ||
            window.content?.document;
          const sidebarContainer = doc?.getElementById("sidebarContainer");
          const outerContainer = doc?.getElementById("outerContainer");
          const sidebarToggle = doc?.getElementById("sidebarToggle");

          if (
            sidebarContainer &&
            outerContainer?.classList.contains("sidebarOpen")
          ) {
            sidebarToggle?.click();
          }
        } catch {}
      }
    }

    destroy() {
      window.removeEventListener("keydown", this._onKeyDown, true);
    }
  }

  // ========== NebulaStartupTabFixModule ==========
  class NebulaStartupTabFixModule {
    init() {
      this._userInteracted = false;
      this._saveActiveTab = this._saveActiveTab.bind(this);
      this._setupLiveTracking();
      this._restoreStartupTab();
    }

    _saveActiveTab() {
      try {
        const tab = window.gBrowser?.selectedTab;
        if (
          !tab ||
          tab.collapsed ||
          tab.hidden ||
          tab.hasAttribute("zen-empty-tab")
        )
          return;
        const uri = tab.linkedBrowser?.currentURI?.spec || "";
        if (
          !uri ||
          uri.startsWith("about:") ||
          uri.startsWith("chrome:") ||
          uri.startsWith("resource:")
        )
          return;

        const activeWs = window.gZenWorkspaces?.activeWorkspace || "default";
        const wsKey = `nebula.last-tab-uri.${activeWs}`;
        if (typeof Services !== "undefined" && Services.prefs) {
          Services.prefs.setStringPref(wsKey, uri);
          Services.prefs.setStringPref("nebula.last-active-global-uri", uri);
        }
      } catch {}
    }

    _setupLiveTracking() {
      // If user clicks, never fight their choice
      window.addEventListener(
        "mousedown",
        () => {
          this._userInteracted = true;
        },
        { capture: true, once: true },
      );

      // Save the active tab's URI on every tab select and before closing
      window.addEventListener("TabSelect", this._saveActiveTab, {
        capture: true,
      });
      window.addEventListener("beforeunload", this._saveActiveTab, {
        capture: true,
      });
      window.addEventListener("pagehide", this._saveActiveTab, {
        capture: true,
      });
    }

    _restoreStartupTab() {
      const executeRestore = () => {
        if (this._userInteracted) return;

        try {
          const gBrowser = window.gBrowser;
          if (!gBrowser?.tabs || gBrowser.tabs.length <= 1) return;

          const activeWorkspace = window.gZenWorkspaces?.activeWorkspace;
          const wsKey = activeWorkspace
            ? `nebula.last-tab-uri.${activeWorkspace}`
            : "";

          let savedUri = "";
          if (typeof Services !== "undefined" && Services.prefs) {
            try {
              if (wsKey && Services.prefs.prefHasUserValue(wsKey)) {
                savedUri = Services.prefs.getStringPref(wsKey);
              }
              if (
                !savedUri &&
                Services.prefs.prefHasUserValue("nebula.last-active-global-uri")
              ) {
                savedUri = Services.prefs.getStringPref(
                  "nebula.last-active-global-uri",
                );
              }
            } catch {}
          }

          // Filter tabs belonging specifically to the active workspace
          const workspaceTabs = Array.from(gBrowser.tabs).filter((t) => {
            if (t.collapsed || t.hidden || t.hasAttribute("zen-empty-tab"))
              return false;
            const uri = t.linkedBrowser?.currentURI?.spec || "";
            if (uri === "about:newtab" || uri === "about:blank") return false;
            if (activeWorkspace) {
              const tabWs = t.getAttribute("zen-workspace-id");
              if (
                tabWs &&
                tabWs !== activeWorkspace &&
                !t.hasAttribute("zen-essential")
              )
                return false;
            }
            return true;
          });

          if (workspaceTabs.length === 0) return;

          let targetTab = null;

          // 1. Direct exact match by saved URI
          if (savedUri) {
            targetTab = workspaceTabs.find(
              (t) => t.linkedBrowser?.currentURI?.spec === savedUri,
            );
          }

          // 2. Fallback to most recently accessed timestamp
          if (!targetTab) {
            targetTab = [...workspaceTabs].sort(
              (a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0),
            )[0];
          }

          if (targetTab) {
            if (gBrowser.selectedTab !== targetTab) {
              gBrowser.selectedTab = targetTab;
            }
            if (window.gZenWorkspaces && activeWorkspace) {
              window.gZenWorkspaces.lastSelectedWorkspaceTabs[
                activeWorkspace
              ] = targetTab;
            }
          }
        } catch (e) {
          Nebula.logger.warn("[StartupTabFix] " + e);
        }
      };

      const scheduleTimes = [50, 150, 300, 600, 1000, 1500];
      scheduleTimes.forEach((delay) => setTimeout(executeRestore, delay));

      if (
        typeof SessionStore !== "undefined" &&
        SessionStore.promiseInitialized
      ) {
        SessionStore.promiseInitialized.then(() => {
          scheduleTimes.forEach((delay) => setTimeout(executeRestore, delay));
        });
      }

      if (window.gZenWorkspaces?.promiseInitialized) {
        window.gZenWorkspaces.promiseInitialized.then(() => {
          executeRestore();
        });
      }
    }
  }

  // ========== NebulaWindowRestoreModule ==========
  class NebulaWindowRestoreModule {
    constructor() {
      this.TARGET_WIDTH = 1296;
      this.TARGET_HEIGHT = 760;
      this.isAdjusting = false;
      this.lastSizeMode = document.documentElement.getAttribute("sizemode") || "normal";
      this.onSizeModeChange = this.onSizeModeChange.bind(this);
    }

    centerAndResize() {
      if (this.isAdjusting) return;
      const sizemode = document.documentElement.getAttribute("sizemode");
      // STRICT: Only in normal (windowed) mode. Never touch maximized or fullscreen!
      if (sizemode !== "normal") return;

      this.isAdjusting = true;
      try {
        const availW = window.screen.availWidth || window.screen.width;
        const availH = window.screen.availHeight || window.screen.height;
        const screenL = window.screen.availLeft ?? window.screenLeft ?? 0;
        const screenT = window.screen.availTop ?? window.screenTop ?? 0;

        const targetX = Math.round(screenL + (availW - this.TARGET_WIDTH) / 2);
        const targetY = Math.round(screenT + (availH - this.TARGET_HEIGHT) / 2);

        window.resizeTo(this.TARGET_WIDTH, this.TARGET_HEIGHT);
        window.moveTo(targetX, targetY);
      } catch (err) {
        Nebula.logger.error("WindowRestoreModule error: " + err);
      } finally {
        setTimeout(() => {
          this.isAdjusting = false;
        }, 200);
      }
    }

    onSizeModeChange() {
      const currentSizeMode = document.documentElement.getAttribute("sizemode");

      // Only trigger when entering "normal" (windowed mode) from maximized/fullscreen
      if (currentSizeMode === "normal" && this.lastSizeMode !== "normal") {
        setTimeout(() => {
          if (document.documentElement.getAttribute("sizemode") === "normal") {
            this.centerAndResize();
          }
        }, 100);
      }

      this.lastSizeMode = currentSizeMode;
    }

    init() {
      this.lastSizeMode = document.documentElement.getAttribute("sizemode") || "normal";
      window.addEventListener("sizemodechange", this.onSizeModeChange);

      if (document.documentElement.getAttribute("sizemode") === "normal") {
        setTimeout(() => this.centerAndResize(), 300);
      }
    }

    destroy() {
      window.removeEventListener("sizemodechange", this.onSizeModeChange);
    }
  }

  // ========== NebulaPerformanceModule ==========
  class NebulaPerformanceModule {
    init() {
      try {
        if (typeof Services === "undefined" || !Services.prefs) return;

        const boolPrefs = {
          // Network anti-stall & fast loading
          "network.http.rcwn.enabled": false,
          "network.http.http3.enable": true,
          "network.dns.disableIPv6": true,
          "network.dns.disablePrefetch": false,
          "network.dns.disablePrefetchFromHTTPS": false,
          "network.predictor.enabled": true,
          "network.predictor.enable-prefetch": false,

          // Memory & Cache
          "browser.cache.memory.enable": true,
          "browser.cache.disk.smart_size.enabled": true,
          "browser.tabs.unloadOnLowMemory": true,
          "browser.tabs.remote.warmup.enabled": false,

          // Fast startup (on-demand restore)
          "browser.sessionstore.restore_on_demand": true,

          // GPU & Multithread rendering
          "layout.css.servo.parallel-restyle": true,
          "gfx.webrender.all": true,
          "gfx.webrender.dcomp-video-overlay-win": true,
          "media.hardware-video-decoding.overlay.enabled": true,
          "dom.ipc.processPriorityManager.enabled": true,

          // Telemetry
          "toolkit.telemetry.enabled": false,
          "toolkit.telemetry.unified": false,
          "browser.ping-centre.telemetry": false,
          "datareporting.healthreport.uploadEnabled": false,
          "datareporting.policy.dataSubmissionEnabled": false,

          // PDF viewer
          "pdfjs.enableAltText": false,
          "pdfjs.enableAltTextForEnglish": false,
          "pdfjs.enableScripting": false,
          "pdfjs.enabledCache.state": true,
          "pdfjs.enableOptimizedPartialRendering": false,
          "pdfjs.disableAutoFetch": false,

          // Style sheets
          "toolkit.legacyUserProfileCustomizations.stylesheets": true,
        };

        const intPrefs = {
          "network.http.response.timeout": 20,
          "network.http.connection-timeout": 10,
          "network.http.max-connections": 300,
          "network.http.max-persistent-connections-per-server": 6,
          "network.http.max-urgent-start-connections": 4,
          "network.http.speculative-parallel-limit": 6,
          "network.ssl_tokens_cache_capacity": 2048,
          "browser.cache.memory.capacity": -1,
          "browser.sessionhistory.max_total_viewers": 4,
          "accessibility.force_disabled": 1,
          "places.history.expiration.max_pages": 20000,
          "pdfjs.annotationEditorMode": 0,
          "pdfjs.capCanvasAreaFactor": -1,
        };

        for (const [pref, val] of Object.entries(boolPrefs)) {
          if (Services.prefs.getBoolPref(pref, !val) !== val) {
            Services.prefs.setBoolPref(pref, val);
          }
        }

        for (const [pref, val] of Object.entries(intPrefs)) {
          if (Services.prefs.getIntPref(pref, val + 1) !== val) {
            Services.prefs.setIntPref(pref, val);
          }
        }

        Nebula.logger.log("🚀 [Performance] System and network optimizations applied.");
      } catch (err) {
        Nebula.logger.error("Failed to apply performance preferences: " + err);
      }
    }
  }

  // ========== NebulaDirectFaviconModule ==========
  class NebulaDirectFaviconModule {
    constructor() {
      this._inProgress = new Set();
      this._resolveTabFavicon = this._resolveTabFavicon.bind(this);
    }

    async init() {
      while (!window.gBrowser?.tabContainer) {
        await new Promise((r) => setTimeout(r, 50));
      }

      window.gBrowser.tabContainer.addEventListener(
        "TabAttrModified",
        this._resolveTabFavicon
      );
      window.gBrowser.tabContainer.addEventListener(
        "TabSelect",
        this._resolveTabFavicon
      );

      // Check existing tabs that have already finished loading
      for (const tab of window.gBrowser.tabs) {
        this._checkTab(tab);
      }

      Nebula.logger.log("✅ [DirectFavicon] Direct site favicon resolver active.");
    }

    _resolveTabFavicon(e) {
      const tab = e?.target;
      if (!tab || tab.tagName !== "tab") return;

      // Only act when busy is removed (page finished loading) or on TabSelect/image change
      if (e.type === "TabAttrModified") {
        const changed = e.detail?.changed || [];
        if (!changed.includes("busy") && !changed.includes("image")) return;
      }

      // If tab is still loading, wait until it finishes so cookies and clearance are ready
      if (tab.hasAttribute("busy")) return;

      this._checkTab(tab);
    }

    async _checkTab(tab) {
      if (!tab || tab.closing || tab.hidden) return;
      if (tab.hasAttribute("busy")) return;

      const currentImg = tab.getAttribute("image") || tab.image || "";
      if (currentImg && !currentImg.startsWith("data:image/svg+xml")) return;

      const uri = tab.linkedBrowser?.currentURI?.spec || "";
      if (!uri.startsWith("http://") && !uri.startsWith("https://")) return;

      let origin = "";
      try {
        const urlObj = new URL(uri);
        origin = urlObj.origin;
        if (!origin || origin === "null") return;
      } catch {
        return;
      }

      const checkKey = `${origin}::${tab.linkedBrowser?.browserId || ""}`;
      if (this._inProgress.has(checkKey)) return;
      this._inProgress.add(checkKey);

      try {
        const candidates = [
          `${origin}/favicon.ico`,
          `${origin}/favicon.png`,
        ];

        let foundDataUrl = null;

        for (const candUrl of candidates) {
          try {
            const res = await window.fetch(candUrl, { credentials: "include" });
            if (res.ok) {
              const ctype = res.headers.get("content-type") || "";
              // Validate that it's a real image, not an HTML error or challenge page
              if (
                ctype.includes("image") ||
                ctype.includes("octet-stream") ||
                ctype.includes("icon")
              ) {
                const blob = await res.blob();
                if (blob && blob.size > 20) {
                  foundDataUrl = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = () => resolve(null);
                    reader.readAsDataURL(blob);
                  });
                  if (foundDataUrl) break;
                }
              }
            }
          } catch {}
        }

        // Fallback: If fetch had CORS issues but image loads via chrome Image
        if (!foundDataUrl) {
          for (const candUrl of candidates) {
            const loaded = await new Promise((resolve) => {
              const img = new Image();
              img.onload = () => resolve(candUrl);
              img.onerror = () => resolve(null);
              img.src = candUrl;
            });
            if (loaded) {
              foundDataUrl = loaded;
              break;
            }
          }
        }

        if (foundDataUrl) {
          const nowImg = tab.getAttribute("image") || tab.image || "";
          if (!nowImg || nowImg.startsWith("data:image/svg+xml")) {
            tab.setAttribute("image", foundDataUrl);
            if (window.gBrowser && typeof gBrowser.setIcon === "function") {
              try {
                gBrowser.setIcon(tab, foundDataUrl);
              } catch {}
            }
            if (tab.selected && window.Nebula) {
              const poly = Nebula.getModule("NebulaPolyfillModule");
              poly?.updateFaviconColor?.();
            }
          }
        }
      } finally {
        this._inProgress.delete(checkKey);
      }
    }

    destroy() {
      if (window.gBrowser?.tabContainer) {
        window.gBrowser.tabContainer.removeEventListener(
          "TabAttrModified",
          this._resolveTabFavicon
        );
        window.gBrowser.tabContainer.removeEventListener(
          "TabSelect",
          this._resolveTabFavicon
        );
      }
      this._inProgress.clear();
      Nebula.logger.log("🧹 [DirectFavicon] Destroyed.");
    }
  }

  // Register Nebula Modules
  Nebula.register(NebulaPolyfillModule);
  Nebula.register(NebulaGradientSliderModule);
  //Nebula.register(NebulaTitlebarBackgroundModule); // NOT NEEDED ANYMORE (Zen handles titlebar background natively)
  //Nebula.register(NebulaNavbarBackgroundModule); NOT NEEDED ANYMORE
  Nebula.register(NebulaURLBarBackgroundModule);
  Nebula.register(NebulaMediaCoverArtModule);
  Nebula.register(NebulaMenuModule);
  Nebula.register(NebulaCtrlTabDualBackgroundModule);
  Nebula.register(NebulaPDFHelperModule);
  Nebula.register(NebulaStartupTabFixModule);
  Nebula.register(NebulaWindowRestoreModule);
  Nebula.register(NebulaPerformanceModule);
  Nebula.register(NebulaDirectFaviconModule);

  // Start the core
  Nebula.init();
})();
