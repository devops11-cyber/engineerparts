# EngineerParts Customer Accounts

This plugin provides the restricted WordPress endpoints used by the EngineerParts Next.js account system. WooCommerce customers remain the source of truth for profiles, addresses, passwords, and orders.

## Install

1. Copy `engineerparts-account` to `wp-content/plugins/` on `https://shop.engineerparts.com`.
2. Add these constants to `wp-config.php`, using the same randomly generated secret as the Next.js `ENGINEERPARTS_PROXY_SECRET` environment variable:

   ```php
   define('ENGINEERPARTS_PROXY_SECRET', 'replace-with-at-least-32-random-characters');
   define('ENGINEERPARTS_FRONTEND_URL', 'https://engineerparts.com');
   ```

3. Activate **EngineerParts Customer Accounts** after WooCommerce.
4. Confirm the `wp_engineerparts_sessions` table was created. The prefix may differ from `wp_`.
5. Configure and test WordPress transactional email before enabling registration in production.

Updating from an earlier version only requires replacing the plugin folder and reactivating it if WordPress requests activation.

Generate the shared secret with a password manager or `openssl rand -hex 32`. Never expose it through a `NEXT_PUBLIC_` variable.

## WordPress requirements

- HTTPS on both WordPress and Next.js
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
- Unverified customers cannot sign in.
- Every order lookup verifies that the authenticated customer owns the WooCommerce order.
- Enquiries are private `engineerparts_enquiry` posts linked to the WooCommerce customer ID.
- Saved product IDs use the `engineerparts_saved_products` customer metadata key.
- Existing WooCommerce customers are marked verified after their first successful password login; newly registered customers must verify by email. The storefront also accepts WooCommerce's native email confirmation when it matches the customer's current account email.

## Account endpoints

The plugin exposes controlled routes under `/wp-json/engineerparts/v1/` for authentication, profile and address updates, password changes, customer-owned orders, reorder validation, enquiries, and saved products. Every route requires the server-to-server proxy secret. Customer routes additionally require a valid opaque session token.

Guest enquiry submission is proxied by Next.js and rate-limited. Guest enquiries can be claimed after login only when both the stored RFQ reference and verified account email match.

Email verification and password reset cannot work reliably until WordPress email delivery is configured and tested.