# LUNVYR WooCommerce Templates (Theme Version)

This folder contains theme-ready page templates and CSS to style your WooCommerce pages (Cart, My Account, Checkout) without relying on the plugin to provide templates.

## Files

- `templates/lunvyr-cart.php` — Page Template for Cart (`[woocommerce_cart]`)
- `templates/lunvyr-account.php` — Page Template for My Account (`[woocommerce_my_account]`)
- `templates/lunvyr-checkout.php` — Page Template for Checkout (`[woocommerce_checkout]`)
- `assets/css/lunvyr-woocommerce.css` — Styles matching the LUNVYR brand

## How to install into your (child) theme

1. Create or open your child theme folder: `wp-content/themes/your-child-theme/`
2. Copy the contents of this `theme-templates/` folder into your child theme:
   - Put the three PHP files under `wp-content/themes/your-child-theme/templates/`
   - Put the CSS file under `wp-content/themes/your-child-theme/assets/css/lunvyr-woocommerce.css`
3. Enqueue the CSS conditionally from your child theme's `functions.php`:

```php
<?php
add_action('wp_enqueue_scripts', function(){
  if (!is_page()) return;
  $id  = get_queried_object_id();
  $tpl = get_page_template_slug($id);
  if (in_array($tpl, ['templates/lunvyr-cart.php','templates/lunvyr-account.php','templates/lunvyr-checkout.php'], true)){
    wp_enqueue_style(
      'lunvyr-woocommerce',
      get_stylesheet_directory_uri() . '/assets/css/lunvyr-woocommerce.css',
      [],
      '1.0'
    );
  }
});
```

4. In WordPress → Pages, edit each WooCommerce page and assign the template:
   - Cart → Template: "LUNVYR – Cart"
   - My Account → Template: "LUNVYR – My Account"
   - Checkout → Template: "LUNVYR – Checkout"

5. In WooCommerce → Settings → Advanced, ensure page assignments point to these pages.

## Notes

- WordPress recognizes page templates in subfolders since WP 4.7; the `Template Name:` header makes them appear in the Page → Template dropdown.
- All My Account endpoints (orders, downloads, edit-address, edit-account, etc.) render within the same My Account page and inherit the template automatically.
- If you previously assigned the plugin-provided templates, switch them to these theme templates; you can then disable the plugin template registration if you wish.
