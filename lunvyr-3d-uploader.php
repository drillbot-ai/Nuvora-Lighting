<?php
/**
 * Plugin Name: LUNVYR 3D File Uploader
 * Description: Permite subir archivos GLB y GLTF para modelos 3D
 * Version: 1.0
 * Author: LUNVYR
 */

// Prevenir acceso directo
if (!defined('ABSPATH')) {
    exit;
}

// Forzar permitir archivos 3D
add_filter('upload_mimes', function($mimes) {
    $mimes['glb'] = 'model/gltf-binary';
    $mimes['gltf'] = 'model/gltf+json';
    return $mimes;
}, 999);

add_filter('wp_check_filetype_and_ext', function($data, $file, $filename, $mimes) {
    if (strpos($filename, '.glb') !== false) {
        return array(
            'ext' => 'glb',
            'type' => 'model/gltf-binary',
            'proper_filename' => false
        );
    }
    if (strpos($filename, '.gltf') !== false) {
        return array(
            'ext' => 'gltf',
            'type' => 'model/gltf+json',
            'proper_filename' => false
        );
    }
    return $data;
}, 10, 4);

// Bypass completo para archivos 3D
add_filter('wp_handle_upload_prefilter', function($file) {
    if (isset($file['name']) && (strpos($file['name'], '.glb') !== false || strpos($file['name'], '.gltf') !== false)) {
        $file['error'] = 0;
    }
    return $file;
});