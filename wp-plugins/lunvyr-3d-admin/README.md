# LUNVYR 3D Product Configurator (Admin)

This WordPress plugin adds a 3D configurator meta box to WooCommerce products. It lets you:

- Pick the GLB model URL (from Media Library)
- Define finishes (materials) via JSON: color, metalness, roughness, and optional texture maps
- Define camera views (presets) and set a default view
- Preview the default finish in an embedded `<model-viewer>` in the editor
- Save everything to product meta (3d_model_url, 3d_materials, 3d_views)

## Install

1. Copy the `lunvyr-3d-admin` folder into `wp-content/plugins/`
2. Activate the plugin in WordPress → Plugins
3. Edit a WooCommerce product → See the "3D Configurator" meta box

## JSON Shapes

Finishes (preferred wrapper):
```json
{
  "default": "brass",
  "order": ["brass", "black", "chrome"],
  "materials": {
    "brass": {
      "name": "Polished Brass",
      "color": "#b8860b",
      "metalness": 0.8,
      "roughness": 0.2,
      "textures": {
        "baseColor": "https://.../albedo.jpg",
        "normal": "https://.../normal.jpg",
        "metallicRoughness": "https://.../mr.jpg",
        "occlusion": "https://.../ao.jpg",
        "emissive": "https://.../emissive.jpg"
      },
      "textureTransform": { "scale": [1,1], "offset": [0,0], "rotation": 0.0 },
      "swatch": "https://.../swatch-brass.jpg"
    }
  },
  "views": {
    "hero": {
      "name": "Hero",
      "cameraOrbit": "30deg 70deg 1.2m",
      "cameraTarget": "auto auto auto",
      "fieldOfView": "45deg"
    }
  },
  "defaultView": "hero"
}
```

Views (separate meta) alternative:
```json
{
  "defaultView": "hero",
  "views": {
    "hero": { "name": "Hero", "cameraOrbit": "30deg 70deg 1.2m", "cameraTarget": "auto auto auto", "fieldOfView": "45deg" }
  }
}
```

## Front-end Integration

The provided `product.htm` script will:
- Fetch 3d_materials and 3d_views meta
- Build the materials grid dynamically from JSON
- Apply the default finish on open/reset
- Render a Views section (if views exist) and allow switching
- Apply textures when provided (best-effort using model-viewer scene graph)

## Notes

- Use GLB for best compatibility.
- Texture transforms require `KHR_texture_transform` support in the scene-graph implementation; fallback behavior is graceful.
- If a texture field is present but fails to load, it is skipped and logged to console.

## Branded WooCommerce Pages (Cart / My Account / Checkout)

This plugin also provides optional page templates to give WooCommerce pages the LUNVYR look without editing your theme:

- LUNVYR – Cart (`templates/lunvyr-cart.php`)
- LUNVYR – My Account (`templates/lunvyr-account.php`)
- LUNVYR – Checkout (`templates/lunvyr-checkout.php`)

How to apply:

1. Activate the plugin.
2. In WordPress → Pages, edit each WooCommerce page:
  - Cart → Page Attributes → Template: "LUNVYR – Cart"
  - My Account → Template: "LUNVYR – My Account"
  - Checkout → Template: "LUNVYR – Checkout"
3. Save the page.

Notes:
- The "My Account" endpoints (orders, downloads, edit-address, edit-account, etc.) render inside the same page and will automatically inherit this template and styles.
- The plugin enqueues `pages.css` only on these templates to keep styles scoped.

