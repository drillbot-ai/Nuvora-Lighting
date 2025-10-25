(function($){
  const q = (s, r=document)=>r.querySelector(s);
  const qa = (s, r=document)=>Array.from(r.querySelectorAll(s));

  function parseJSON(str){ try{ return JSON.parse(str); }catch(e){ return null; } }
  function pretty(obj){ try{ return JSON.stringify(obj, null, 2); }catch(e){ return ''; } }

  function hexToRGBA(hex){
    if (!hex) return [1,1,1,1];
    const h = hex.replace('#','');
    const v = parseInt(h,16);
    return [(v>>16&255)/255,(v>>8&255)/255,(v&255)/255,1];
  }

  async function applyMaterialToViewer(mv, cfg){
    if (!mv || !mv.model || !cfg) return;
    const mats = mv.model.materials || [];
    const targets = Array.isArray(cfg.targets) && cfg.targets.length ? cfg.targets.map(String) : null;

    const setTextureIfPossible = async (texInfo, url, transform) => {
      try{
        if (!texInfo || !url) return false;
        const create = mv.model.createTexture || mv.createTexture;
        if (typeof create !== 'function') return false;
        const texture = await create.call(mv.model, url);
        if (!texture) return false;
        if (typeof texInfo.setTexture === 'function') {
          await texInfo.setTexture(texture);
        } else if ('texture' in texInfo) {
          texInfo.texture = texture;
        }
        if (transform && typeof texInfo.setTextureTransform === 'function') {
          texInfo.setTextureTransform(transform);
        }
        return true;
      }catch(e){ console.warn('Texture set failed', url, e); return false; }
    };

    const base = hexToRGBA(cfg.color || '#ffffff');
    const metallic = (cfg.metalness ?? 0.5);
    const rough = (cfg.roughness ?? 0.5);
    const textures = cfg.textures || cfg.maps || null;
    const tTransform = cfg.textureTransform || null;

    for (const mat of mats){
      if (targets && !targets.includes(mat.name)) continue;
      const pbr = mat.pbrMetallicRoughness;
      if (!pbr) continue;
      pbr.setBaseColorFactor(base);
      if (pbr.setMetallicFactor) pbr.setMetallicFactor(metallic);
      if (pbr.setRoughnessFactor) pbr.setRoughnessFactor(rough);
      if (textures){
        if (pbr.baseColorTexture) await setTextureIfPossible(pbr.baseColorTexture, textures.baseColor||textures.base_color||textures.albedo||textures.diffuse, tTransform);
        if (pbr.metallicRoughnessTexture) await setTextureIfPossible(pbr.metallicRoughnessTexture, textures.metallicRoughness||textures.mr||textures.metallic_roughness, tTransform);
        if (mat.normalTexture) await setTextureIfPossible(mat.normalTexture, textures.normal||textures.normalMap, tTransform);
        if (mat.occlusionTexture) await setTextureIfPossible(mat.occlusionTexture, textures.occlusion||textures.ao, tTransform);
        if (mat.emissiveTexture) await setTextureIfPossible(mat.emissiveTexture, textures.emissive||textures.emissiveMap, tTransform);
      }

      // Emissive color
      if (cfg.emissive){
        const e = hexToRGBA(cfg.emissive);
        if (Array.isArray(mat.emissiveFactor)) mat.emissiveFactor = [e[0], e[1], e[2]];
      }
      // Normal strength (if supported by API)
      try{
        if (mat.normalTexture && typeof cfg.normalStrength !== 'undefined'){
          if (typeof mat.normalTexture.scale !== 'undefined') mat.normalTexture.scale = cfg.normalStrength;
        }
      }catch(_){}

      // Advanced PBR extensions if available
      if (typeof mat.clearcoatFactor !== 'undefined' && typeof cfg.clearcoat !== 'undefined') mat.clearcoatFactor = cfg.clearcoat;
      if (typeof mat.clearcoatRoughnessFactor !== 'undefined' && typeof cfg.clearcoatRoughness !== 'undefined') mat.clearcoatRoughnessFactor = cfg.clearcoatRoughness;
      if (typeof mat.sheenColorFactor !== 'undefined' && cfg.sheenColor){
        const c = hexToRGBA(cfg.sheenColor); mat.sheenColorFactor = [c[0], c[1], c[2]];
      }
      if (typeof mat.sheenRoughnessFactor !== 'undefined' && typeof cfg.sheenRoughness !== 'undefined') mat.sheenRoughnessFactor = cfg.sheenRoughness;
      if (typeof mat.specularFactor !== 'undefined' && typeof cfg.specular !== 'undefined') mat.specularFactor = cfg.specular;
      if (typeof mat.specularColorFactor !== 'undefined' && cfg.specularColor){
        const s = hexToRGBA(cfg.specularColor); mat.specularColorFactor = [s[0], s[1], s[2]];
      }
      if (typeof mat.transmissionFactor !== 'undefined' && typeof cfg.transmission !== 'undefined') mat.transmissionFactor = cfg.transmission;
      if (typeof mat.ior !== 'undefined' && typeof cfg.ior !== 'undefined') mat.ior = cfg.ior;
      if (typeof mat.doubleSided !== 'undefined' && typeof cfg.doubleSided !== 'undefined') mat.doubleSided = !!cfg.doubleSided;
      if (typeof mat.alphaMode !== 'undefined' && cfg.alphaMode){ mat.alphaMode = cfg.alphaMode; }
      if (typeof mat.alphaCutoff !== 'undefined' && typeof cfg.alphaCutoff !== 'undefined') mat.alphaCutoff = cfg.alphaCutoff;
    }

    // Environment and exposure preview per finish
    try{
      if (typeof cfg.exposure !== 'undefined') mv.exposure = cfg.exposure;
      if (typeof cfg.environment !== 'undefined') mv.environmentImage = cfg.environment || null;
    }catch(_){}
    mv.requestUpdate('material');
  }

  function openMediaLibrary(cb, title='Select file'){
    const frame = wp.media({ title, multiple:false });
    frame.on('select', ()=>{
      const file = frame.state().get('selection').first().toJSON();
      cb && cb(file.url, file);
    });
    frame.open();
  }

  function ensureMaterialsJSON(){
    const ta = q('#l3dMaterials');
    if (!ta.value.trim()){
      const example = {
        default: 'brass',
        order: ['brass','black','chrome'],
        materials: {
          brass: { name:'Polished Brass', color:'#b8860b', metalness:0.8, roughness:0.2 },
          black: { name:'Matte Black', color:'#2d3748', metalness:0.1, roughness:0.8 },
          chrome:{ name:'Polished Chrome', color:'#c0c0c0', metalness:1.0, roughness:0.1 }
        },
        views: {
          hero: { name:'Hero', cameraOrbit:'30deg 70deg 1.2m', cameraTarget:'auto auto auto', fieldOfView:'45deg' }
        },
        defaultView: 'hero'
      };
      ta.value = pretty(example);
    }
  }

  async function loadImage(url){
    return new Promise((resolve, reject)=>{
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = ()=> resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }

  async function packMetallicRoughnessAO({metallicUrl, roughnessUrl, aoUrl, size=1024}){
    try{
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = canvas.height = size;
      ctx.clearRect(0,0,size,size);
      // Base: AO in R
      if (aoUrl){
        const ao = await loadImage(aoUrl);
        ctx.drawImage(ao, 0, 0, size, size);
      } else {
        ctx.fillStyle = 'rgb(255,0,0)'; // R=1 (full AO)
        ctx.fillRect(0,0,size,size);
      }
      const imgData = ctx.getImageData(0,0,size,size);
      const data = imgData.data;
      if (roughnessUrl){
        const rImg = await loadImage(roughnessUrl);
        const c2 = document.createElement('canvas');
        c2.width = c2.height = size;
        const x2 = c2.getContext('2d');
        x2.drawImage(rImg,0,0,size,size);
        const d2 = x2.getImageData(0,0,size,size).data;
        for (let i=0;i<data.length;i+=4){ data[i+1] = d2[i]; } // G <- roughness (use R from source)
      }
      if (metallicUrl){
        const mImg = await loadImage(metallicUrl);
        const c3 = document.createElement('canvas');
        c3.width = c3.height = size;
        const x3 = c3.getContext('2d');
        x3.drawImage(mImg,0,0,size,size);
        const d3 = x3.getImageData(0,0,size,size).data;
        for (let i=0;i<data.length;i+=4){ data[i+2] = d3[i]; } // B <- metallic (use R from source)
      }
      ctx.putImageData(imgData, 0, 0);
      return canvas.toDataURL('image/png');
    }catch(e){ console.warn('MR pack failed', e); return null; }
  }

  $(document).ready(function(){
    const mv = document.getElementById('l3dViewer');
    const modelInput = q('#l3dModelUrl');

    // Pick model from media
    q('#l3dPickModel')?.addEventListener('click', ()=>{
      openMediaLibrary((url)=>{
        modelInput.value = url;
        mv?.setAttribute('src', url);
      }, 'Select 3D model (GLB)');
    });

    // Load example
    q('#l3dLoadExample')?.addEventListener('click', ensureMaterialsJSON);

    // Preview materials in viewer
    q('#l3dPreviewMaterials')?.addEventListener('click', async ()=>{
      if (!mv) return;
      const raw = q('#l3dMaterials').value;
      let cfg = parseJSON(raw);
      if (!cfg){ alert('Invalid JSON in Finishes'); return; }
      const mats = cfg.materials && typeof cfg.materials==='object' ? cfg.materials : cfg;
      const defKey = cfg.default || cfg.defaultFinish || Object.keys(mats)[0];
      const def = mats[defKey];
      if (!def){ alert('No default material found'); return; }
      if (!mv.model){ await new Promise(r=> mv.addEventListener('load', r, { once:true })); }
      await applyMaterialToViewer(mv, def);
    });

    // Save current camera as a new view
    q('#l3dSaveView')?.addEventListener('click', ()=>{
      if (!mv) return;
      const orbit = mv.getCameraOrbit();
      const target = mv.getCameraTarget ? mv.getCameraTarget() : null;
      const fov = mv.fieldOfView || q('#fieldOfView')?.value || '45deg';
      const view = {
        name: 'New View',
        cameraOrbit: `${orbit.theta}deg ${orbit.phi}deg ${orbit.radius}m`,
        cameraTarget: target ? `${target.x}m ${target.y}m ${target.z}m` : 'auto auto auto',
        fieldOfView: fov
      };
      const ta = q('#l3dViews');
      let cfg = parseJSON(ta.value) || {};
      if (!cfg.views) cfg.views = {};
      let key = 'view_' + Math.random().toString(36).slice(2,7);
      cfg.views[key] = view;
      if (!cfg.defaultView) cfg.defaultView = key;
      ta.value = pretty(cfg);
    });

    // Apply default finish
    q('#l3dApplyDefault')?.addEventListener('click', async ()=>{
      const raw = q('#l3dMaterials').value;
      let cfg = parseJSON(raw);
      if (!cfg){ alert('Invalid JSON in Finishes'); return; }
      const mats = cfg.materials && typeof cfg.materials==='object' ? cfg.materials : cfg;
      const defKey = cfg.default || cfg.defaultFinish || Object.keys(mats)[0];
      const def = mats[defKey];
      if (!def){ alert('No default material found'); return; }
      if (!mv.model){ await new Promise(r=> mv.addEventListener('load', r, { once:true })); }
      await applyMaterialToViewer(mv, def);
    });

    // Register pickers for all [data-pick]
    qa('[data-pick]').forEach(btn => {
      btn.addEventListener('click', ()=>{
        const sel = btn.getAttribute('data-pick');
        const input = q(sel);
        if (!input) return;
        openMediaLibrary((url)=>{ input.value = url; try{ input.dispatchEvent(new Event('input', {bubbles:true})); input.dispatchEvent(new Event('change', {bubbles:true})); }catch(_){} });
      });
    });

    // Pack MR
    q('#fb_pack_mr')?.addEventListener('click', async ()=>{
      const metallicUrl = q('#fb_tex_metal').value.trim();
      const roughnessUrl = q('#fb_tex_rough').value.trim();
      const aoUrl = q('#fb_tex_ao').value.trim();
      if (!metallicUrl && !roughnessUrl){ alert('Provide Metallic and/or Roughness map'); return; }
      const packed = await packMetallicRoughnessAO({ metallicUrl, roughnessUrl, aoUrl, size:1024 });
      if (packed){ q('#fb_tex_mr').value = packed; }
    });

    // Insert/Update Finish → JSON
    q('#fb_insert_finish')?.addEventListener('click', ()=>{
      const key = q('#fb_key').value.trim();
      if (!key) return alert('Finish key is required');
      const val = parseJSON(q('#l3dMaterials').value) || {};
      const wrapper = (val.materials && typeof val.materials==='object') ? val : { materials: val };
      if (!wrapper.materials) wrapper.materials = {};

      const textures = {};
      if (q('#fb_tex_base').value.trim()) textures.baseColor = q('#fb_tex_base').value.trim();
      if (q('#fb_tex_normal').value.trim()) textures.normal = q('#fb_tex_normal').value.trim();
      if (q('#fb_tex_mr').value.trim()) textures.metallicRoughness = q('#fb_tex_mr').value.trim();
      if (q('#fb_tex_ao').value.trim()) textures.occlusion = q('#fb_tex_ao').value.trim();
      if (q('#fb_tex_emis').value.trim()) textures.emissive = q('#fb_tex_emis').value.trim();

      const transform = {
        scale: [parseFloat(q('#fb_scale_u').value||'1'), parseFloat(q('#fb_scale_v').value||'1')],
        offset:[parseFloat(q('#fb_off_u').value||'0'), parseFloat(q('#fb_off_v').value||'0')],
        rotation: parseFloat(q('#fb_rotation').value||'0')
      };

      const cfg = {
        name: q('#fb_name').value.trim() || undefined,
        color: q('#fb_color').value.trim() || undefined,
        metalness: parseFloat(q('#fb_metal').value||'0.5'),
        roughness: parseFloat(q('#fb_rough').value||'0.5'),
        swatch: q('#fb_swatch').value.trim() || undefined,
        variant: q('#fb_variant').value.trim() || undefined,
        textures: Object.keys(textures).length? textures : undefined,
        textureTransform: transform,
        normalStrength: parseFloat(q('#fb_normal_strength').value||'1'),
        emissive: q('#fb_emissive_color').value.trim() || undefined
      };

      // Environment
      const envPreset = q('#fb_env_preset').value;
      const envUrl = q('#fb_env_url').value.trim();
      const exposure = parseFloat(q('#fb_env_exposure').value||'1.2');
      if (envUrl || envPreset){
        cfg.environment = envUrl || envPreset;
        cfg.exposure = exposure;
      }

      wrapper.materials[key] = cfg;
      q('#l3dMaterials').value = pretty(wrapper);
    });

    // Assignments: list glTF materials and let user map to a finish key
    async function refreshMaterialsList(){
      const list = q('#l3dMaterialsList'); if (!list) return;
      list.innerHTML = '<em>Loading…</em>';
      if (!mv.model){ await new Promise(r=> mv.addEventListener('load', r, {once:true})); }
      const mats = mv.model?.materials || [];
      if (!mats.length){ list.innerHTML = '<em>No materials found in model</em>'; return; }
      list.innerHTML = '';
      const selected = (activeKey && wrapper?.materials?.[activeKey]?.targets) ? new Set(wrapper.materials[activeKey].targets) : new Set();
      mats.forEach(m => {
        const id = 'chk_'+Math.random().toString(36).slice(2,8);
        const row = document.createElement('div');
        const name = m.name||'(unnamed material)';
        const checked = selected.has(name) ? 'checked' : '';
        row.innerHTML = `<label><input type="checkbox" ${checked} id="${id}" data-mat-name="${name}"> ${name}</label>`;
        list.appendChild(row);
      });

      // Wire live target updates for the active finish
      qa('#l3dMaterialsList input[type="checkbox"]').forEach(cb=>{
        cb.addEventListener('change', ()=>{
          if (!activeKey) return;
          const sel = qa('#l3dMaterialsList input[type="checkbox"]:checked').map(x=> x.getAttribute('data-mat-name'));
          wrapper.materials[activeKey] = wrapper.materials[activeKey] || {};
          wrapper.materials[activeKey].targets = sel;
          writeBack();
          liveApply();
        });
      });
    }

    if (mv){
      // refresh list when model loads or URL changes
      mv.addEventListener('load', refreshMaterialsList);
      if (mv.src) refreshMaterialsList();
    }

    q('#l3dSaveAssignments')?.addEventListener('click', ()=>{
      if (!activeKey) return alert('Select a finish first');
      const selMats = qa('#l3dMaterialsList input[type="checkbox"]:checked').map(x=> x.getAttribute('data-mat-name'));
      wrapper.materials[activeKey] = wrapper.materials[activeKey] || {};
      wrapper.materials[activeKey].targets = selMats;
      writeBack();
      alert('Assignments saved to JSON');
    });

    // Keep model-viewer src in sync with field
    modelInput?.addEventListener('change', ()=>{
      if (mv) mv.setAttribute('src', modelInput.value || '');
    });

    // Initialize textareas with pretty JSON if present
    (function initPretty(){
      ['#l3dMaterials', '#l3dViews'].forEach(sel => {
        const ta = q(sel);
        if (!ta || !ta.value) return;
        const parsed = parseJSON(ta.value);
        if (parsed) ta.value = pretty(parsed);
      });
    })();

      // =========================
      // Sidebar (Tabs + Finish Builder UX)
      // =========================
      const materialsTA = q('#l3dMaterials');
      let wrapper = null; // { default, order, materials: {key:cfg}, ... }
      let activeKey = null;

      function ensureWrapper(){
        const raw = materialsTA?.value?.trim();
        let obj = raw ? parseJSON(raw) : null;
        if (!obj) obj = { default: 'brass', order: ['brass'], materials: { brass: { name:'Polished Brass', color:'#b8860b', metalness:0.8, roughness:0.2 } } };
        if (obj.materials && typeof obj.materials==='object') wrapper = obj; else wrapper = { materials: obj };
        if (!wrapper.materials) wrapper.materials = {};
        if (!wrapper.order || !Array.isArray(wrapper.order) || !wrapper.order.length) wrapper.order = Object.keys(wrapper.materials);
        if (!wrapper.default) wrapper.default = wrapper.order[0] || Object.keys(wrapper.materials)[0] || null;
      }

      function writeBack(){ if (materialsTA) materialsTA.value = pretty(wrapper); }

      function slugify(s){ return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,50)||'finish'; }

      function buildFinishList(){
        const ul = q('#sb_finish_list'); if (!ul) return;
        ul.innerHTML = '';
        const keys = wrapper.order && wrapper.order.length ? wrapper.order : Object.keys(wrapper.materials);
        let wasDragged = false;
        keys.forEach(k=>{
          const li = document.createElement('li');
          li.dataset.key = k;
          li.className = (k===activeKey? 'active':'');
          li.innerHTML = `<span class="drag-handle" title="Drag to reorder">☰</span><span class="name">${wrapper.materials[k]?.name||k}</span>${wrapper.default===k?'<small title="default">★</small>':''}`;
          // Click to select (ignore if just dragged)
          li.addEventListener('click', ()=>{ if (wasDragged) return; setActiveFinish(k); });

          // Enable HTML5 drag & drop reordering
          li.setAttribute('draggable', 'true');
          li.addEventListener('dragstart', (e)=>{
            try{ e.dataTransfer.setData('text/plain', k); e.dataTransfer.effectAllowed = 'move'; }catch(_){}
            li.classList.add('dragging');
          });
          li.addEventListener('dragend', ()=>{
            li.classList.remove('dragging');
            qa('#sb_finish_list li').forEach(x=> x.classList.remove('drag-over'));
          });
          li.addEventListener('dragover', (e)=>{ e.preventDefault(); try{ e.dataTransfer.dropEffect='move'; }catch(_){} li.classList.add('drag-over'); });
          li.addEventListener('dragleave', ()=> li.classList.remove('drag-over'));
          li.addEventListener('drop', (e)=>{
            e.preventDefault();
            li.classList.remove('drag-over');
            let srcKey = null;
            try{ srcKey = e.dataTransfer.getData('text/plain'); }catch(_){ srcKey = k; }
            const targetKey = k;
            if (!srcKey || srcKey === targetKey) { wasDragged = false; return; }
            const order = (wrapper.order && wrapper.order.length) ? [...wrapper.order] : Object.keys(wrapper.materials);
            const from = order.indexOf(srcKey);
            const to = order.indexOf(targetKey);
            if (from === -1 || to === -1) { wasDragged = false; return; }
            // Move item
            order.splice(from, 1);
            order.splice(to, 0, srcKey);
            // Normalize (dedupe and only existing keys)
            wrapper.order = order.filter((v,i,a)=> a.indexOf(v)===i).filter(key=> wrapper.materials[key]);
            writeBack();
            wasDragged = true;
            // Rebuild list and keep current selection
            buildFinishList();
          });
          ul.appendChild(li);
        });
      }

      function syncSliderValue(id){ const el=qa(`.val[data-for="${id}"]`)[0]; const input=q(`#${id}`); if (el && input) el.textContent = String(input.value); }

      function loadUIFromFinish(cfg, key){
        q('#fb_key')?.setAttribute('value',''); if(q('#fb_key')) q('#fb_key').value = key||'';
        if(q('#fb_name')) q('#fb_name').value = cfg.name||'';
        if(q('#fb_swatch')) q('#fb_swatch').value = cfg.swatch||'';
        if(q('#fb_variant')) q('#fb_variant').value = cfg.variant||'';
        if(q('#fb_color')) q('#fb_color').value = cfg.color||'';
        if(q('#fb_color_picker') && cfg.color) q('#fb_color_picker').value = cfg.color;
        if(q('#fb_metal_r')){ q('#fb_metal_r').value = (cfg.metalness ?? 0.5); syncSliderValue('fb_metal_r'); }
        if(q('#fb_rough_r')){ q('#fb_rough_r').value = (cfg.roughness ?? 0.5); syncSliderValue('fb_rough_r'); }
  // Advanced PBR
  if(q('#fb_specular')){ q('#fb_specular').value = (cfg.specular ?? 1.0); syncSliderValue('fb_specular'); }
  if(q('#fb_specular_color')) q('#fb_specular_color').value = cfg.specularColor||'';
  if(q('#fb_specular_color_picker') && cfg.specularColor) q('#fb_specular_color_picker').value = cfg.specularColor;
  if(q('#fb_clearcoat')){ q('#fb_clearcoat').value = (cfg.clearcoat ?? 0); syncSliderValue('fb_clearcoat'); }
  if(q('#fb_clearcoat_rough')){ q('#fb_clearcoat_rough').value = (cfg.clearcoatRoughness ?? 0); syncSliderValue('fb_clearcoat_rough'); }
  if(q('#fb_sheen_color')) q('#fb_sheen_color').value = cfg.sheenColor||'';
  if(q('#fb_sheen_color_picker') && cfg.sheenColor) q('#fb_sheen_color_picker').value = cfg.sheenColor;
  if(q('#fb_sheen_rough')){ q('#fb_sheen_rough').value = (cfg.sheenRoughness ?? 0); syncSliderValue('fb_sheen_rough'); }
  if(q('#fb_transmission')){ q('#fb_transmission').value = (cfg.transmission ?? 0); syncSliderValue('fb_transmission'); }
  if(q('#fb_ior')) q('#fb_ior').value = (cfg.ior ?? 1.5);
  if(q('#fb_alpha_mode')) q('#fb_alpha_mode').value = cfg.alphaMode||'';
  if(q('#fb_alpha_cutoff')) q('#fb_alpha_cutoff').value = (cfg.alphaCutoff ?? 0.5);
  if(q('#fb_double_sided')) q('#fb_double_sided').checked = !!cfg.doubleSided;
        const tex = cfg.textures || {};
        if(q('#fb_tex_base')) q('#fb_tex_base').value = tex.baseColor||'';
        if(q('#fb_tex_normal')) q('#fb_tex_normal').value = tex.normal||'';
        if(q('#fb_tex_metal')) q('#fb_tex_metal').value = tex.metallic||'';
        if(q('#fb_tex_rough')) q('#fb_tex_rough').value = tex.roughness||'';
        if(q('#fb_tex_mr')) q('#fb_tex_mr').value = tex.metallicRoughness||'';
        if(q('#fb_tex_ao')) q('#fb_tex_ao').value = tex.occlusion||'';
        if(q('#fb_tex_emis')) q('#fb_tex_emis').value = tex.emissive||'';
        const t = cfg.textureTransform || { scale:[1,1], offset:[0,0], rotation:0 };
        if(q('#fb_scale_u')) q('#fb_scale_u').value = t.scale?.[0] ?? 1;
        if(q('#fb_scale_v')) q('#fb_scale_v').value = t.scale?.[1] ?? 1;
        if(q('#fb_off_u')) q('#fb_off_u').value = t.offset?.[0] ?? 0;
        if(q('#fb_off_v')) q('#fb_off_v').value = t.offset?.[1] ?? 0;
        if(q('#fb_rotation')) q('#fb_rotation').value = t.rotation ?? 0;
        if(q('#fb_normal_strength_r')){ q('#fb_normal_strength_r').value = cfg.normalStrength ?? 1; syncSliderValue('fb_normal_strength_r'); }
        if(q('#fb_emissive_color')) q('#fb_emissive_color').value = cfg.emissive||'#000000';
        if(q('#fb_emissive_color_picker') && cfg.emissive) q('#fb_emissive_color_picker').value = cfg.emissive;
        // Env
        if(q('#sb_env_preset')) q('#sb_env_preset').value = (cfg.environment==='neutral' || cfg.environment==='legacy') ? cfg.environment : '';
        if(q('#sb_env_url')) q('#sb_env_url').value = (cfg.environment && cfg.environment!=='neutral' && cfg.environment!=='legacy') ? cfg.environment : '';
        if(q('#sb_exposure')){ q('#sb_exposure').value = (cfg.exposure ?? 1.2); syncSliderValue('sb_exposure'); }
      }

      function collectFinishFromUI(){
        const key = slugify(q('#fb_key')?.value||activeKey||'finish');
        const cfg = wrapper.materials[activeKey] || {};
        if(q('#fb_name')) cfg.name = q('#fb_name').value||undefined;
        if(q('#fb_swatch')) cfg.swatch = q('#fb_swatch').value||undefined;
        if(q('#fb_variant')) cfg.variant = q('#fb_variant').value||undefined;
        if(q('#fb_color')) cfg.color = q('#fb_color').value||undefined;
        if(q('#fb_metal_r')) cfg.metalness = parseFloat(q('#fb_metal_r').value||'0.5');
        if(q('#fb_rough_r')) cfg.roughness = parseFloat(q('#fb_rough_r').value||'0.5');
  // Advanced PBR
  if(q('#fb_specular')) cfg.specular = parseFloat(q('#fb_specular').value||'1');
  if(q('#fb_specular_color')) cfg.specularColor = q('#fb_specular_color').value||undefined;
  if(q('#fb_clearcoat')) cfg.clearcoat = parseFloat(q('#fb_clearcoat').value||'0');
  if(q('#fb_clearcoat_rough')) cfg.clearcoatRoughness = parseFloat(q('#fb_clearcoat_rough').value||'0');
  if(q('#fb_sheen_color')) cfg.sheenColor = q('#fb_sheen_color').value||undefined;
  if(q('#fb_sheen_rough')) cfg.sheenRoughness = parseFloat(q('#fb_sheen_rough').value||'0');
  if(q('#fb_transmission')) cfg.transmission = parseFloat(q('#fb_transmission').value||'0');
  if(q('#fb_ior')) cfg.ior = parseFloat(q('#fb_ior').value||'1.5');
  if(q('#fb_alpha_mode')) cfg.alphaMode = q('#fb_alpha_mode').value||undefined;
  if(q('#fb_alpha_cutoff')) cfg.alphaCutoff = parseFloat(q('#fb_alpha_cutoff').value||'0.5');
  if(q('#fb_double_sided')) cfg.doubleSided = q('#fb_double_sided').checked;
        cfg.textures = cfg.textures||{};
        if(q('#fb_tex_base')?.value) cfg.textures.baseColor = q('#fb_tex_base').value; else delete cfg.textures.baseColor;
        if(q('#fb_tex_normal')?.value) cfg.textures.normal = q('#fb_tex_normal').value; else delete cfg.textures.normal;
        if(q('#fb_tex_metal')?.value) cfg.textures.metallic = q('#fb_tex_metal').value; else delete cfg.textures.metallic;
        if(q('#fb_tex_rough')?.value) cfg.textures.roughness = q('#fb_tex_rough').value; else delete cfg.textures.roughness;
        if(q('#fb_tex_mr')?.value) cfg.textures.metallicRoughness = q('#fb_tex_mr').value; else delete cfg.textures.metallicRoughness;
        if(q('#fb_tex_ao')?.value) cfg.textures.occlusion = q('#fb_tex_ao').value; else delete cfg.textures.occlusion;
        if(q('#fb_tex_emis')?.value) cfg.textures.emissive = q('#fb_tex_emis').value; else delete cfg.textures.emissive;
        cfg.textureTransform = {
          scale: [parseFloat(q('#fb_scale_u')?.value||'1'), parseFloat(q('#fb_scale_v')?.value||'1')],
          offset:[parseFloat(q('#fb_off_u')?.value||'0'), parseFloat(q('#fb_off_v')?.value||'0')],
          rotation: parseFloat(q('#fb_rotation')?.value||'0')
        };
        if(q('#fb_normal_strength_r')) cfg.normalStrength = parseFloat(q('#fb_normal_strength_r').value||'1');
        if(q('#fb_emissive_color')) cfg.emissive = q('#fb_emissive_color').value||undefined;
        // Env
        const envPreset = q('#sb_env_preset')?.value||'';
        const envUrl = q('#sb_env_url')?.value?.trim()||'';
        const exposure = parseFloat(q('#sb_exposure')?.value||'1.2');
        cfg.environment = envUrl || envPreset || undefined;
        cfg.exposure = exposure;
        return { key, cfg };
      }

      async function setActiveFinish(key){
        activeKey = key; const cfg = wrapper.materials[key] || {};
        buildFinishList(); loadUIFromFinish(cfg, key);
        if (mv){
          if (!mv.model){ await new Promise(r=> mv.addEventListener('load', r, {once:true})); }
          await applyMaterialToViewer(mv, cfg);
          await refreshMaterialsList();
        }
      }

      function addNewFinish(){
        let key = slugify('finish-'+(Object.keys(wrapper.materials).length+1));
        let n=1; while (wrapper.materials[key]){ key = slugify('finish-'+(Object.keys(wrapper.materials).length+1+n++)); }
        wrapper.materials[key] = { name:'New Finish', color:'#b8860b', metalness:0.8, roughness:0.2 };
        if (!wrapper.order.includes(key)) wrapper.order.push(key);
        if (!wrapper.default) wrapper.default = key;
        writeBack(); setActiveFinish(key);
      }

      function deleteActiveFinish(){
        if (!activeKey) return;
        if (!confirm('Delete finish '+activeKey+'?')) return;
        delete wrapper.materials[activeKey];
        wrapper.order = (wrapper.order||[]).filter(k=>k!==activeKey);
        if (wrapper.default===activeKey) wrapper.default = wrapper.order?.[0] || Object.keys(wrapper.materials)[0] || null;
        activeKey = wrapper.default;
        writeBack(); buildFinishList(); if (activeKey) setActiveFinish(activeKey);
      }

      // Tabs
      qa('.l3d-tabs button').forEach(btn=>{
        btn.addEventListener('click', (e)=>{
          e.preventDefault();
          qa('.l3d-tabs button').forEach(b=>b.classList.remove('active'));
          btn.classList.add('active');
          const id = btn.getAttribute('data-tab');
          qa('.l3d-panels section').forEach(s=> s.classList.remove('active'));
          q('#tab-'+id)?.classList.add('active');
        });
      });

      // Initialize wrapper and sidebar UI
      ensureWrapper();
      buildFinishList();
      activeKey = wrapper.default || Object.keys(wrapper.materials)[0] || null;
      if (activeKey) setActiveFinish(activeKey);

      // Color picker sync
  q('#fb_color_picker')?.addEventListener('input', e=>{ if(q('#fb_color')) q('#fb_color').value = e.target.value; liveApply(); });
  q('#fb_emissive_color_picker')?.addEventListener('input', e=>{ if(q('#fb_emissive_color')) q('#fb_emissive_color').value = e.target.value; if(q('#fx_emissive_color')) q('#fx_emissive_color').value = e.target.value; if(q('#fx_emissive_color_picker')) q('#fx_emissive_color_picker').value = e.target.value; liveApply(); });
      q('#fx_emissive_color_picker')?.addEventListener('input', e=>{ if(q('#fx_emissive_color')) q('#fx_emissive_color').value = e.target.value; if(q('#fb_emissive_color')) q('#fb_emissive_color').value = e.target.value; });
  q('#fb_specular_color_picker')?.addEventListener('input', e=>{ if(q('#fb_specular_color')) q('#fb_specular_color').value = e.target.value; liveApply(); });
  q('#fb_sheen_color_picker')?.addEventListener('input', e=>{ if(q('#fb_sheen_color')) q('#fb_sheen_color').value = e.target.value; liveApply(); });

      // Slider badges
      ['fb_metal_r','fb_rough_r','fb_normal_strength_r','sb_exposure','sb_shadow_int','sb_shadow_soft','fx_emissive_int']
        .forEach(id=>{ const el=q('#'+id); if(el){ el.addEventListener('input', ()=> syncSliderValue(id)); syncSliderValue(id);} });

      // Actions
      q('#sb_new_finish')?.addEventListener('click', addNewFinish);
      q('#sb_delete_finish')?.addEventListener('click', deleteActiveFinish);
      q('#sb_set_default')?.addEventListener('click', ()=>{ if (!activeKey) return; wrapper.default = activeKey; writeBack(); buildFinishList(); });
      q('#sb_save_finish')?.addEventListener('click', ()=>{
        const prev = activeKey;
        const {key,cfg} = collectFinishFromUI();
        if (key !== prev){
          delete wrapper.materials[prev];
          wrapper.materials[key] = cfg; activeKey = key;
          wrapper.order = (wrapper.order||[]).filter(k=>k!==prev);
          if (!wrapper.order.includes(key)) wrapper.order.push(key);
        } else { wrapper.materials[key] = cfg; }
        writeBack(); buildFinishList();
      });

      // Debounce utility for input events
      function debounce(fn, wait){ let t; return function(...args){ clearTimeout(t); t=setTimeout(()=>fn.apply(this,args), wait); } }

      async function liveApply(){ const {cfg}=collectFinishFromUI(); if (!mv.model) await new Promise(r=> mv.addEventListener('load', r, {once:true})); await applyMaterialToViewer(mv, cfg); }

      // Live apply on change/input of fields (more responsive)
  const liveChangeIds = ['fb_color','fb_emissive_color','fb_variant','sb_env_preset','sb_env_url','fb_ior','fb_alpha_mode','fb_alpha_cutoff','fb_double_sided'];
      liveChangeIds.forEach(id=>{ const el=q('#'+id); if(!el) return; el.addEventListener('change', ()=> liveApply()); });

  const liveInputIds = ['fb_metal_r','fb_rough_r','fb_normal_strength_r','sb_exposure','fb_specular','fb_clearcoat','fb_clearcoat_rough','fb_sheen_rough','fb_transmission'];
      liveInputIds.forEach(id=>{ const el=q('#'+id); if(!el) return; el.addEventListener('input', ()=>{ syncSliderValue(id); liveApply(); }); });

      // Texture + transform fields (debounced to avoid spamming)
      const debouncedApply = debounce(()=> liveApply(), 300);
      const textureIds = ['fb_tex_base','fb_tex_normal','fb_tex_metal','fb_tex_rough','fb_tex_mr','fb_tex_ao','fb_tex_emis'];
      textureIds.forEach(id=>{ const el=q('#'+id); if(!el) return; el.addEventListener('change', debouncedApply); el.addEventListener('input', debouncedApply); });
      const transformIds = ['fb_scale_u','fb_scale_v','fb_off_u','fb_off_v','fb_rotation'];
      transformIds.forEach(id=>{ const el=q('#'+id); if(!el) return; el.addEventListener('input', debouncedApply); });

      // Other non-slider changes for live apply
      ;['fb_specular_color','fb_sheen_color','fb_alpha_mode','fb_alpha_cutoff','fb_double_sided'].forEach(id=>{
        const el=q('#'+id); if(!el) return; el.addEventListener('change', debouncedApply);
      });

      // Shadow preview only (not saved into finish unless desired later)
      q('#sb_shadow_int')?.addEventListener('input', (e)=>{ syncSliderValue('sb_shadow_int'); if(mv) mv.shadowIntensity = parseFloat(e.target.value||'1'); });
      q('#sb_shadow_soft')?.addEventListener('input', (e)=>{ syncSliderValue('sb_shadow_soft'); if(mv) mv.shadowSoftness = parseFloat(e.target.value||'0.5'); });
  });
})(jQuery);
