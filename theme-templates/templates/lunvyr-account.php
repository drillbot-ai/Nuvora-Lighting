<?php
/**
 * Template Name: LUNVYR – My Account
 * Description: Branded My Account page layout with LUNVYR styling (theme version).
 */
if (!defined('ABSPATH')) { exit; }
get_header();
?>

<main class="lv-shell">
  <section class="lv-hero">
    <div class="lv-container">
      <h1 class="lv-title">My Account</h1>
      <p class="lv-sub">Manage your orders, addresses, and account details.</p>
    </div>
  </section>

  <section class="lv-container lv-content">
    <div class="lv-grid two">
      <div class="lv-card">
        <?php echo do_shortcode('[woocommerce_my_account]'); ?>
      </div>
      <aside class="lv-card lv-aside">
        <h3>Need Help?</h3>
        <p>Our team is here to help you.</p>
        <ul class="lv-list">
          <li><strong>Email:</strong> info@lunvyr.com</li>
          <li><strong>Phone:</strong> +1 (929) 728-2394</li>
        </ul>
      </aside>
    </div>
  </section>
</main>

<?php get_footer(); ?>
