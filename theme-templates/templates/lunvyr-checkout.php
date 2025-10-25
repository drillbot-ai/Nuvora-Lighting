<?php
/**
 * Template Name: LUNVYR – Checkout
 * Description: Branded checkout page layout wrapping the WooCommerce checkout shortcode with LUNVYR styling (theme version).
 */
if (!defined('ABSPATH')) { exit; }
get_header();
?>

<main class="lv-shell">
  <section class="lv-hero">
    <div class="lv-container">
      <h1 class="lv-title">Checkout</h1>
      <p class="lv-sub">Secure checkout. All transactions are encrypted.</p>
    </div>
  </section>

  <section class="lv-container lv-content">
    <div class="lv-card">
      <?php echo do_shortcode('[woocommerce_checkout]'); ?>
    </div>
  </section>
</main>

<?php get_footer(); ?>
