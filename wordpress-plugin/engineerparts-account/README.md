# EngineerParts Customer Accounts

This plugin provides the restricted WordPress endpoints used by the EngineerParts Next.js account system. WooCommerce customers remain the source of truth for profiles, addresses, passwords, and orders.

## Install

1. Copy `engineerparts-account` to `wp-content/plugins/` on `https://shop.engineerparts.com`.
2. Add these constants to `wp-config.php`, using the same randomly generated secret as the Next.js `ENGINEERPARTS_PROXY_SECRET` environment variable:

   ```php
   define('ENGINEERPARTS_PROXY_SECRET', 'replace-with-at-least-32-random-characters');
   define('ENGINEERPARTS_TURNSTILE_SECRET', 'your-cloudflare-turnstile-secret-key');
   define('ENGINEERPARTS_FRONTEND_URL', 'https://engineerparts.com');
   ```

   `ENGINEERPARTS_FRONTEND_URL` is also used to redirect customers to `{FRONTEND_URL}/checkout/success` after payment, in place of WooCommerce's default thank-you page.

3. Activate **EngineerParts Customer Accounts** after WooCommerce.
4. Confirm the `wp_engineerparts_sessions` and `wp_engineerparts_enquiries` tables were created. The prefix may differ from `wp_`.
5. Configure and test WordPress transactional email before enabling registration in production.

Updating from an earlier version only requires replacing the plugin folder and reactivating it if WordPress requests activation.

Headless checkout submits orders through WooCommerce's Store API checkout endpoint and follows the gateway's `payment_result.redirect_url` directly. Confirm the Nomod gateway is enabled and its WooCommerce payment method ID is `nomod`.

Generate the shared secret with a password manager or `openssl rand -hex 32`. Never expose it through a `NEXT_PUBLIC_` variable.

## WordPress requirements

- HTTPS on both WordPress and Next.js
- Cloudflare Turnstile site key configured as `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in Next.js and its secret key configured as `ENGINEERPARTS_TURNSTILE_SECRET` in `wp-config.php`. Restrict the Turnstile widget to the storefront hostname.
- Pretty permalinks enabled
- WooCommerce account creation enabled
- Guest checkout left enabled for the existing storefront flow
- Working `wp_mail` delivery, preferably through an authenticated SMTP provider
- A WooCommerce REST API key with only the permissions required by the existing catalog/order integration

No JWT plugin is required. Browser requests go only to Next.js, so WordPress CORS access for `engineerparts.com` is not required.

## Security model

- Customer passwords are verified by WordPress and are never stored by Next.js.
- The plugin stores only SHA-256 hashes of random session and verification tokens.
- Next.js stores the opaque session token in an HTTP-only, `SameSite=Lax`, production-secure cookie.
- Password reset uses WordPress-native reset keys.
- Auth endpoints require the server-to-server proxy secret and apply rate limits.
- Registration CAPTCHA tokens are verified by WordPress with Cloudflare Turnstile before a WooCommerce customer is created; registration fails closed if the secret is not configured or verification cannot complete.
- Unverified customers cannot sign in.
- Every order lookup verifies that the authenticated customer owns the WooCommerce order.
- Account checkout uses a five-minute, single-use payment handoff so WordPress can sign in the order owner and open the payment page. The resulting browser login expires within one hour. Customer passwords are never included in the handoff.
- Headless order checkout uses the WooCommerce Store API so the configured gateway creates its normal payment result and redirect.
- Enquiries are stored as structured rows in the `{$wpdb->prefix}engineerparts_enquiries` database table and linked to the WooCommerce customer ID.
- Saved product IDs use the `engineerparts_saved_products` customer metadata key.
- Existing WooCommerce customers are marked verified after their first successful password login; newly registered customers must verify by email. The storefront also accepts WooCommerce's native email confirmation when it matches the customer's current account email.

## Account endpoints

The plugin exposes controlled routes under `/wp-json/engineerparts/v1/` for authentication, profile and address updates, password changes, customer-owned orders and payment handoffs, headless checkout payment redirects, reorder validation, enquiries, and saved products. Every route requires the server-to-server proxy secret. Customer routes additionally require a valid opaque session token.

Guest enquiry submission is proxied by Next.js and rate-limited. Enquiries are listed under **WooCommerce > EngineerParts Enquiries**. Open a reference to view, edit, or permanently delete that database row. Editing requires a name and valid email address; status can be set to Submitted, Reviewing, Responded, or Closed. On upgrade, the plugin copies existing `ep_enquiry` posts into the database table without deleting the originals. The submitted details are emailed to the WordPress admin email configured under **Settings > General** and to the customer. Guest enquiries can be claimed after login only when both the stored RFQ reference and verified account email match.

Configure and test WordPress email delivery (preferably authenticated SMTP) and set the correct site email under **Settings > General**. Enquiry records are still saved if email delivery fails; WordPress logs mail failures and the storefront tells the customer their enquiry was saved but a notification could not be sent. Email verification and password reset also depend on working WordPress email delivery.