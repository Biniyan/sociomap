@import "tailwindcss";

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
}

@layer base {
  body {
    @apply antialiased text-slate-900 bg-slate-50;
  }
}

/* Custom Leaflet Styling */
.leaflet-container {
  font-family: inherit;
}

.leaflet-popup-content-wrapper {
  @apply rounded-2xl shadow-2xl border border-slate-100 p-0 overflow-hidden;
}

.leaflet-popup-content {
  @apply !m-0;
}

.leaflet-popup-tip {
  @apply shadow-none;
}

.custom-popup .leaflet-popup-content-wrapper {
  @apply p-4;
}

.leaflet-control-zoom {
  @apply !border-none !shadow-lg !rounded-xl overflow-hidden;
}

.leaflet-control-zoom-in, .leaflet-control-zoom-out {
  @apply !bg-white !text-slate-600 !border-slate-100 hover:!bg-slate-50 transition-colors !w-10 !h-10 !leading-10 !text-lg !font-bold !flex !items-center !justify-center;
}

/* Custom Div Icon */
.custom-marker-icon {
  @apply flex items-center justify-center;
}
