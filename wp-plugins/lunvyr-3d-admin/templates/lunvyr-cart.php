<?php
/**
 * Template Name: LUNVYR – Cart
 * Description: Branded cart page layout wrapping the WooCommerce cart shortcode with LUNVYR styling.
 */
if (!defined('ABSPATH')) { exit; }
get_header();
?>

<main class="lv-shell">
  <section class="lv-hero">
    <div class="lv-container">
      <h1 class="lv-title">Your Cart</h1>
      <p class="lv-sub">Review your selection and proceed to checkout.</p>
    </div>
  </section>

  <section class="lv-container lv-content">
    <div class="lv-card">
      <?php echo do_shortcode('[woocommerce_cart]'); ?>
    </div>
  </section>
</main>

<?php get_footer(); ?>
