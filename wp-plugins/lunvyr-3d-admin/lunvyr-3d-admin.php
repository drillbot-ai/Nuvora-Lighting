<?php
/*
Plugin Name: LUNVYR 3D Product Configurator (Admin)
Description: Adds a 3D configurator meta box to WooCommerce products to create finishes (materials) and camera views, storing JSON in product meta.
Version: 0.1.0
Author: LUNVYR
*/

if (!defined('ABSPATH')) { exit; }

class LUNVYR_3D_Admin {
  const META_MODEL_URL = '3d_model_url';
  const META_MATERIALS = '3d_materials';
  const META_VIEWS     = '3d_views';
  const NONCE          = 'lunvyr_3d_nonce';

  public function __construct(){
    add_action('add_meta_boxes', [$this, 'add_meta_box']);
    add_action('save_post_product', [$this, 'save_meta'], 10, 2);
    add_action('admin_enqueue_scripts', [$this, 'enqueue_assets']);
    // Frontend polish: replace literal entity sequences like &#8211; with a hyphen in titles
    add_filter('the_title', [$this, 'filter_fix_dash_entities'], 9, 2);
    // Frontend: register and load custom page templates (Cart, My Account)
    add_filter('theme_page_templates', [$this, 'register_page_templates'], 10, 4);
    add_filter('template_include', [$this, 'load_page_template']);
    add_action('wp_enqueue_scripts', [$this, 'enqueue_front_assets']);
  }

  public function add_meta_box(){
    add_meta_box(
      'lunvyr_3d_configurator',
      __('3D Configurator', 'lunvyr'),
      [$this, 'render_meta_box'],
      'product',
      'normal',
      'high'
    );
  }

  public function enqueue_assets($hook){
    global $post;
    if ($hook !== 'post.php' && $hook !== 'post-new.php') return;
    if (!$post || $post->post_type !== 'product') return;

    // Model Viewer
    wp_enqueue_script('model-viewer', 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js', [], '3.3.0', true);
    if (function_exists('wp_script_add_data')) {
      wp_script_add_data('model-viewer', 'type', 'module');
    } else {
      // Fallback: force type="module" via filter
      add_filter('script_loader_tag', function($tag, $handle){
        if ($handle === 'model-viewer'){
          $tag = str_replace("<script ", "<script type=\"module\" ", $tag);
        }
        return $tag;
      }, 10, 2);
    }

    // Admin JS/CSS
    wp_enqueue_style('lunvyr-3d-admin', plugins_url('admin.css', __FILE__), [], '0.1.0');
    wp_enqueue_script('lunvyr-3d-admin', plugins_url('admin.js', __FILE__), ['jquery'], '0.1.0', true);

    // Media library for picking textures
    wp_enqueue_media();

    // Pass initial values
    $data = [
      'postId'       => $post->ID,
      'modelUrl'     => get_post_meta($post->ID, self::META_MODEL_URL, true),
      'materialsRaw' => get_post_meta($post->ID, self::META_MATERIALS, true),
      'viewsRaw'     => get_post_meta($post->ID, self::META_VIEWS, true),
      'nonce'        => wp_create_nonce(self::NONCE)
    ];
    wp_localize_script('lunvyr-3d-admin', 'LUNVYR3D', $data);
  }

  // ============== Frontend Page Templates (Cart & My Account) ==============
  public function register_page_templates($post_templates, $theme, $post, $post_type){
    if ($post_type === 'page'){
      $post_templates['lunvyr-cart.php'] = __('LUNVYR – Cart', 'lunvyr');
      $post_templates['lunvyr-account.php'] = __('LUNVYR – My Account', 'lunvyr');
      $post_templates['lunvyr-checkout.php'] = __('LUNVYR – Checkout', 'lunvyr');
    }
    return $post_templates;
  }

  public function load_page_template($template){
    if (is_page()){
      $tpl = get_page_template_slug(get_queried_object_id());
      if (in_array($tpl, ['lunvyr-cart.php','lunvyr-account.php','lunvyr-checkout.php'], true)){
        $file = plugin_dir_path(__FILE__) . 'templates/' . $tpl;
        if (file_exists($file)) return $file;
      }
    }
    return $template;
  }

  public function enqueue_front_assets(){
    if (!is_page()) return;
    $tpl = get_page_template_slug(get_queried_object_id());
    if (in_array($tpl, ['lunvyr-cart.php','lunvyr-account.php','lunvyr-checkout.php'], true)){
      wp_enqueue_style('lunvyr-pages', plugins_url('pages.css', __FILE__), [], '0.1.0');
    }
  }

  public function render_meta_box($post){
    $model = esc_url(get_post_meta($post->ID, self::META_MODEL_URL, true));
    $materials = get_post_meta($post->ID, self::META_MATERIALS, true);
    $views = get_post_meta($post->ID, self::META_VIEWS, true);
    wp_nonce_field(self::NONCE, self::NONCE);
    ?>
    <script>
      // Ensure model-viewer loads as a module even if optimizers alter enqueued tags
      (function(){
        try{
          if (!window.customElements || !window.customElements.get('model-viewer')){
            var s=document.createElement('script');
            s.type='module';
            s.src='https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js';
            document.head.appendChild(s);
          }
        }catch(e){ console.warn('model-viewer bootstrap failed', e); }
      })();
    </script>
    <div class="lunvyr-3d-admin shell">
      <div class="l3d-view">
        <model-viewer id="l3dViewer" src="<?php echo $model; ?>" camera-controls interaction-policy="always-allow" shadow-intensity="1" exposure="1.2" style="width:100%;height:480px;background:#f6f7fb;border-radius:12px;display:block;"></model-viewer>
        <div class="l3d-toolbar">
          <button type="button" class="button" id="l3dSaveView">Save Current View</button>
          <button type="button" class="button" id="l3dApplyDefault">Apply Default Finish</button>
          <div class="spacer"></div>
          <label style="margin-right:6px;">Model GLB</label>
          <input type="url" id="l3dModelUrl" name="<?php echo self::META_MODEL_URL; ?>" value="<?php echo esc_attr($model); ?>" placeholder="https://.../model.glb" style="max-width:360px;"/>
          <button type="button" class="button" id="l3dPickModel">Select</button>
        </div>
      </div>
      <aside class="l3d-sidebar">
        <nav class="l3d-tabs">
          <button type="button" class="active" data-tab="env">Environment</button>
          <button type="button" data-tab="mat">Materials</button>
          <button type="button" data-tab="fx">Effects</button>
        </nav>
        <div class="l3d-panels">
          <section id="tab-env" class="active">
            <details open class="acc">
              <summary>HDRI & Lighting</summary>
              <div class="acc-body">
                <label>Preset</label>
                <select id="sb_env_preset">
                  <option value="">(None)</option>
                  <option value="neutral">Neutral (built-in)</option>
                  <option value="legacy">Legacy (built-in)</option>
                </select>
                <label style="margin-top:8px;">Custom env URL</label>
                <input type="text" id="sb_env_url" placeholder="https://.../studio.hdr"/>
                <div class="row">
                  <div class="col"><label>Exposure</label><input type="range" id="sb_exposure" min="0.2" max="3" step="0.05" value="1.2"><span class="val" data-for="sb_exposure">1.2</span></div>
                  <div class="col"><label>Shadow Intensity</label><input type="range" id="sb_shadow_int" min="0" max="3" step="0.05" value="1"><span class="val" data-for="sb_shadow_int">1.0</span></div>
                  <div class="col"><label>Shadow Softness</label><input type="range" id="sb_shadow_soft" min="0" max="2" step="0.05" value="0.5"><span class="val" data-for="sb_shadow_soft">0.5</span></div>
                </div>
                <p class="hint">Estos valores se guardan por acabado si los defines en el Finish Builder; si no, se aplican como vista previa.</p>
              </div>
            </details>
          </section>
          <section id="tab-mat">
            <details open class="acc">
              <summary>Finishes</summary>
              <div class="acc-body">
                <div class="row">
                  <div class="col">
                    <ul id="sb_finish_list" class="finish-list"></ul>
                    <div class="row small">
                      <button type="button" class="button" id="sb_new_finish">New</button>
                      <button type="button" class="button" id="sb_delete_finish">Delete</button>
                      <button type="button" class="button" id="sb_set_default">Set Default</button>
                    </div>
                  </div>
                  <div class="col">
                    <label>Key</label>
                    <input type="text" id="fb_key" placeholder="e.g. brass"/>
                    <label>Name</label>
                    <input type="text" id="fb_name" placeholder="Polished Brass"/>
                    <label>Swatch URL</label>
                    <input type="text" id="fb_swatch" placeholder="https://.../swatch.jpg"/>
                    <label>Variant (KHR_materials_variants)</label>
                    <input type="text" id="fb_variant" placeholder="(optional)"/>
                    <div class="row">
                      <div class="col"><label>Color</label><input type="color" id="fb_color_picker"><input type="text" id="fb_color" placeholder="#b8860b"></div>
                    </div>
                    <div class="row">
                      <div class="col"><label>Metalness</label><input type="range" id="fb_metal_r" min="0" max="1" step="0.01" value="0.8"><span class="val" data-for="fb_metal_r">0.8</span></div>
                      <div class="col"><label>Roughness</label><input type="range" id="fb_rough_r" min="0" max="1" step="0.01" value="0.2"><span class="val" data-for="fb_rough_r">0.2</span></div>
                    </div>
                    <details class="acc">
                      <summary>Advanced PBR</summary>
                      <div class="acc-body">
                        <div class="row">
                          <div class="col"><label>Specular</label><input type="range" id="fb_specular" min="0" max="2" step="0.01" value="1"><span class="val" data-for="fb_specular">1.0</span></div>
                          <div class="col"><label>Specular Color</label><input type="color" id="fb_specular_color_picker"><input type="text" id="fb_specular_color" placeholder="#ffffff"></div>
                        </div>
                        <div class="row">
                          <div class="col"><label>Clearcoat</label><input type="range" id="fb_clearcoat" min="0" max="1" step="0.01" value="0"><span class="val" data-for="fb_clearcoat">0.0</span></div>
                          <div class="col"><label>Clearcoat Roughness</label><input type="range" id="fb_clearcoat_rough" min="0" max="1" step="0.01" value="0"><span class="val" data-for="fb_clearcoat_rough">0.0</span></div>
                        </div>
                        <div class="row">
                          <div class="col"><label>Sheen Color</label><input type="color" id="fb_sheen_color_picker"><input type="text" id="fb_sheen_color" placeholder="#000000"></div>
                          <div class="col"><label>Sheen Roughness</label><input type="range" id="fb_sheen_rough" min="0" max="1" step="0.01" value="0"><span class="val" data-for="fb_sheen_rough">0.0</span></div>
                        </div>
                        <div class="row">
                          <div class="col"><label>Transmission</label><input type="range" id="fb_transmission" min="0" max="1" step="0.01" value="0"><span class="val" data-for="fb_transmission">0.0</span></div>
                          <div class="col"><label>IOR</label><input type="number" id="fb_ior" step="0.01" value="1.5"></div>
                        </div>
                        <div class="row">
                          <div class="col"><label>Alpha Mode</label>
                            <select id="fb_alpha_mode">
                              <option value="">(Material default)</option>
                              <option value="OPAQUE">Opaque</option>
                              <option value="MASK">Mask</option>
                              <option value="BLEND">Blend</option>
                            </select>
                          </div>
                          <div class="col"><label>Alpha Cutoff</label><input type="number" step="0.01" id="fb_alpha_cutoff" value="0.5"></div>
                          <div class="col"><label>Double Sided</label><input type="checkbox" id="fb_double_sided"></div>
                        </div>
                      </div>
                    </details>
                  </div>
                </div>
              </div>
            </details>

            <details class="acc">
              <summary>Textures</summary>
              <div class="acc-body">
                <div class="row">
                  <div class="col"><label>Base Color</label><input type="text" id="fb_tex_base" placeholder="https://.../albedo.jpg"><button type="button" class="button" data-pick="#fb_tex_base">Pick</button></div>
                </div>
                <div class="row">
                  <div class="col"><label>Normal</label><input type="text" id="fb_tex_normal" placeholder="https://.../normal.jpg"><button type="button" class="button" data-pick="#fb_tex_normal">Pick</button></div>
                  <div class="col"><label>Normal Strength</label><input type="range" id="fb_normal_strength_r" min="0" max="5" step="0.1" value="1"><span class="val" data-for="fb_normal_strength_r">1.0</span></div>
                </div>
                <div class="row">
                  <div class="col"><label>Metallic</label><input type="text" id="fb_tex_metal" placeholder="mono channel"><button type="button" class="button" data-pick="#fb_tex_metal">Pick</button></div>
                  <div class="col"><label>Roughness</label><input type="text" id="fb_tex_rough" placeholder="mono channel"><button type="button" class="button" data-pick="#fb_tex_rough">Pick</button></div>
                </div>
                <div class="row">
                  <div class="col"><label>MetallicRoughness (packed)</label><input type="text" id="fb_tex_mr" placeholder="https://.../mr.jpg"><button type="button" class="button" data-pick="#fb_tex_mr">Pick</button></div>
                  <div class="col"><label>AO (occlusion)</label><input type="text" id="fb_tex_ao" placeholder="mono channel"><button type="button" class="button" data-pick="#fb_tex_ao">Pick</button></div>
                </div>
                <div class="row">
                  <div class="col"><label>Emissive</label><input type="text" id="fb_tex_emis" placeholder="https://.../emissive.jpg"><button type="button" class="button" data-pick="#fb_tex_emis">Pick</button></div>
                  <div class="col"><label>Emissive Color</label><input type="color" id="fb_emissive_color_picker"><input type="text" id="fb_emissive_color" placeholder="#000000"></div>
                </div>
                <div class="row">
                  <div class="col"><label>Scale U/V</label><input type="number" step="0.01" id="fb_scale_u" value="1"> <input type="number" step="0.01" id="fb_scale_v" value="1"></div>
                  <div class="col"><label>Offset U/V</label><input type="number" step="0.01" id="fb_off_u" value="0"> <input type="number" step="0.01" id="fb_off_v" value="0"></div>
                  <div class="col"><label>Rotation (rad)</label><input type="number" step="0.01" id="fb_rotation" value="0"></div>
                </div>
                <div class="row small">
                  <button type="button" class="button" id="fb_pack_mr">Pack Metallic+Roughness (+AO) → MR</button>
                </div>
              </div>
            </details>

            <details class="acc">
              <summary>Assignments (per glTF material)</summary>
              <div class="acc-body">
                <div id="l3dMaterialsList" class="materials-list"><em>Load the model to list materials…</em></div>
                <div class="row small"><button type="button" class="button" id="l3dSaveAssignments">Save Assignments to JSON</button></div>
              </div>
            </details>
          </section>
          <section id="tab-fx">
            <details open class="acc">
              <summary>Visual Effects</summary>
              <div class="acc-body">
                <div class="row">
                  <div class="col"><label>Emissive Color</label><input type="color" id="fx_emissive_color_picker"><input type="text" id="fx_emissive_color" placeholder="#000000"></div>
                  <div class="col"><label>Emissive Intensity</label><input type="range" id="fx_emissive_int" min="0" max="5" step="0.1" value="1"><span class="val" data-for="fx_emissive_int">1.0</span></div>
                </div>
                <p class="hint">Algunos efectos dependen del material del glTF y soporte del navegador.</p>
              </div>
            </details>
          </section>
        </div>
        <div class="l3d-actions">
          <button type="button" class="button button-primary" id="sb_save_finish">Save Finish to JSON</button>
          <button type="button" class="button" id="l3dPreviewMaterials">Preview in Viewer</button>
        </div>
      </aside>
    </div>

    <!-- Legacy fields kept (hidden) to persist data and for advanced JSON edits -->
    <div class="l3d-legacy" style="display:none;">
      <textarea id="l3dMaterials" name="<?php echo self::META_MATERIALS; ?>" rows="12" style="width:100%;font-family:monospace;"></textarea>
      <textarea id="l3dViews" name="<?php echo self::META_VIEWS; ?>" rows="8" style="width:100%;font-family:monospace;"></textarea>
    </div>
    <script>
      // Pre-fill existing JSON values
      (function(){
        const m = <?php echo $materials ? json_encode($materials) : 'null'; ?>;
        const v = <?php echo $views ? json_encode($views) : 'null'; ?>;
        if (m) try{ document.getElementById('l3dMaterials').value = JSON.stringify(JSON.parse(m), null, 2); }catch(e){ document.getElementById('l3dMaterials').value = m; }
        if (v) try{ document.getElementById('l3dViews').value = JSON.stringify(JSON.parse(v), null, 2); }catch(e){ document.getElementById('l3dViews').value = v; }
      })();
    </script>
    <?php
  }

  public function save_meta($post_id, $post){
    if (!isset($_POST[self::NONCE]) || !wp_verify_nonce($_POST[self::NONCE], self::NONCE)) return;
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
    if ($post->post_type !== 'product') return;
    if (!current_user_can('edit_post', $post_id)) return;

    // Model URL
    if (isset($_POST[self::META_MODEL_URL])) {
      update_post_meta($post_id, self::META_MODEL_URL, esc_url_raw($_POST[self::META_MODEL_URL]));
    }

    // Materials
    if (isset($_POST[self::META_MATERIALS])) {
      $raw = wp_unslash($_POST[self::META_MATERIALS]);
      update_post_meta($post_id, self::META_MATERIALS, $raw);
    }

    // Views
    if (isset($_POST[self::META_VIEWS])) {
      $raw = wp_unslash($_POST[self::META_VIEWS]);
      update_post_meta($post_id, self::META_VIEWS, $raw);
    }
  }

  /**
   * Replace common dash HTML entity sequences that might have been stored as literal text
   * (e.g., '&#8211;' or '&ndash;') so visitors see a hyphen instead of the entity string.
   */
  public function filter_fix_dash_entities($title, $post_id){
    // Only on frontend output
    if (is_admin()) return $title;
    $replacements = [
      '&amp;#8211;' => '-', // double-encoded
      '&#8211;'     => '-',
      '&amp;ndash;' => '-',
      '&ndash;'     => '-',
    ];
    return strtr($title, $replacements);
  }
}

new LUNVYR_3D_Admin();
