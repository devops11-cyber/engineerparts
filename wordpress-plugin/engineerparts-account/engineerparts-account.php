<?php
/**
 * Plugin Name: EngineerParts Customer Accounts
 * Description: Secure customer authentication endpoints for the EngineerParts storefront.
 * Version: 1.1.1
 * Requires PHP: 8.0
 * Requires Plugins: woocommerce
 */

defined('ABSPATH') || exit;

final class EngineerParts_Customer_Accounts {
    private const NAMESPACE = 'engineerparts/v1';
    private const VERIFIED_META = '_engineerparts_email_verified';
    private const VERIFY_HASH_META = '_engineerparts_verify_hash';
    private const VERIFY_EXPIRES_META = '_engineerparts_verify_expires';
    private const CUSTOMER_TYPES = array(
        'End User',
        'Contractor',
        'EPC Contractor',
        'Trading Company',
        'Distributor',
        'Maintenance Company',
        'OEM',
        'Other',
    );

    public static function boot(): void {
        add_action('init', array(self::class, 'register_enquiry_type'));
        add_action('rest_api_init', array(self::class, 'register_routes'));
        add_action('engineerparts_purge_sessions', array(self::class, 'purge_sessions'));
    }

    public static function activate(): void {
        global $wpdb;
        require_once ABSPATH . 'wp-admin/includes/upgrade.php';

        $table = self::session_table();
        $charset = $wpdb->get_charset_collate();
        dbDelta("CREATE TABLE {$table} (
            id bigint unsigned NOT NULL AUTO_INCREMENT,
            user_id bigint unsigned NOT NULL,
            token_hash char(64) NOT NULL,
            expires_at datetime NOT NULL,
            created_at datetime NOT NULL,
            last_seen_at datetime NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY token_hash (token_hash),
            KEY user_id (user_id),
            KEY expires_at (expires_at)
        ) {$charset};");

        if (!wp_next_scheduled('engineerparts_purge_sessions')) {
            wp_schedule_event(time() + HOUR_IN_SECONDS, 'daily', 'engineerparts_purge_sessions');
        }
    }

    public static function deactivate(): void {
        wp_clear_scheduled_hook('engineerparts_purge_sessions');
    }

    public static function register_routes(): void {
        self::route('/auth/register', 'POST', 'register');
        self::route('/auth/login', 'POST', 'login');
        self::route('/auth/logout', 'POST', 'logout');
        self::route('/auth/me', 'GET', 'me');
        self::route('/auth/verify-email', 'POST', 'verify_email');
        self::route('/auth/resend-verification', 'POST', 'resend_verification');
        self::route('/auth/forgot-password', 'POST', 'forgot_password');
        self::route('/auth/reset-password', 'POST', 'reset_password');
        self::route('/account', 'GET', 'account');
        self::route('/account', 'PUT', 'update_account');
        self::route('/account/addresses', 'PUT', 'update_addresses');
        self::route('/account/security/password', 'PUT', 'change_password');
        self::route('/account/orders', 'GET', 'orders');
        self::route('/account/orders/(?P<id>\d+)', 'GET', 'order');
        self::route('/account/orders/(?P<id>\d+)/reorder', 'POST', 'reorder');
        self::route('/account/enquiries', 'GET', 'enquiries');
        self::route('/account/enquiries/claim', 'POST', 'claim_enquiries');
        self::route('/account/saved-products', 'GET', 'saved_products');
        self::route('/account/saved-products', 'POST', 'toggle_saved_product');
        self::route('/enquiries', 'POST', 'submit_enquiry');
    }

    public static function register_enquiry_type(): void {
        register_post_type('engineerparts_enquiry', array(
            'labels' => array('name' => 'EngineerParts Enquiries', 'singular_name' => 'EngineerParts Enquiry'),
            'public' => false,
            'show_ui' => true,
            'show_in_menu' => 'woocommerce',
            'supports' => array('title'),
            'capability_type' => 'post',
            'map_meta_cap' => true,
        ));
    }

    private static function route(string $path, string $method, string $callback): void {
        register_rest_route(self::NAMESPACE, $path, array(
            'methods' => $method,
            'callback' => array(self::class, $callback),
            'permission_callback' => array(self::class, 'allow_proxy'),
        ));
    }

    public static function allow_proxy(WP_REST_Request $request): bool {
        $configured = defined('ENGINEERPARTS_PROXY_SECRET') ? (string) ENGINEERPARTS_PROXY_SECRET : '';
        $provided = (string) $request->get_header('x-engineerparts-proxy-secret');
        return strlen($configured) >= 32 && hash_equals($configured, $provided);
    }

    public static function register(WP_REST_Request $request): WP_REST_Response {
        if (!function_exists('wc_create_new_customer')) {
            return self::error('Account service is temporarily unavailable.', 503);
        }

        $data = self::json($request);
        $first_name = sanitize_text_field($data['firstName'] ?? '');
        $last_name = sanitize_text_field($data['lastName'] ?? '');
        $email = sanitize_email($data['email'] ?? '');
        $phone = sanitize_text_field($data['phone'] ?? '');
        $company = sanitize_text_field($data['company'] ?? '');
        $password = (string) ($data['password'] ?? '');

        if (!$first_name || !$last_name || !is_email($email) || !$phone || !self::valid_password($password)) {
            return self::error('Unable to create your account. Please check the information and try again.', 422);
        }
        if (email_exists($email)) {
            return self::error('An account already exists with this email address. Please sign in instead.', 409, 'email_exists');
        }
        if (!self::rate_limit('register', self::client_identifier($request), 5, HOUR_IN_SECONDS)) {
            return self::error('Too many registration attempts. Please try again later.', 429);
        }

        $customer_id = wc_create_new_customer($email, '', $password, array(
            'first_name' => $first_name,
            'last_name' => $last_name,
            'display_name' => trim("{$first_name} {$last_name}"),
        ));
        if (is_wp_error($customer_id)) {
            self::log_failure('register', 'customer_create', $customer_id);
            return self::error('Unable to create your account. Please check the information and try again.', 502);
        }

        $customer = new WC_Customer($customer_id);
        $customer->set_billing_first_name($first_name);
        $customer->set_billing_last_name($last_name);
        $customer->set_billing_email($email);
        $customer->set_billing_phone($phone);
        $customer->set_billing_company($company);
        if (!empty($data['country'])) {
            $customer->set_billing_country(strtoupper(sanitize_text_field($data['country'])));
        }
        $customer->save();

        self::save_business_meta($customer_id, $data);
        update_user_meta($customer_id, self::VERIFIED_META, '0');
        self::send_verification($customer_id, $email);

        return self::success(array(
            'message' => 'Account created. Please check your email to verify your account before signing in.',
            'requiresVerification' => true,
        ), 201);
    }

    public static function login(WP_REST_Request $request): WP_REST_Response {
        $data = self::json($request);
        $email = sanitize_email($data['email'] ?? '');
        $password = (string) ($data['password'] ?? '');
        $identifier = self::client_identifier($request) . '|' . strtolower($email);

        if (!self::rate_limit('login', $identifier, 10, 15 * MINUTE_IN_SECONDS)) {
            return self::error('Too many sign-in attempts. Please try again later.', 429);
        }
        if (!is_email($email) || !$password) {
            return self::error('Incorrect email or password.', 401, 'invalid_credentials');
        }

        $existing = get_user_by('email', $email);
        $user = $existing ? wp_authenticate($existing->user_login, $password) : new WP_Error('invalid_credentials');
        if (is_wp_error($user) || !$user instanceof WP_User) {
            return self::error('Incorrect email or password.', 401, 'invalid_credentials');
        }
        $verification = (string) get_user_meta($user->ID, self::VERIFIED_META, true);
        if ($verification === '0') {
            if (!self::woocommerce_email_verified($user->ID)) {
                return self::error('Please verify your email address before signing in.', 403, 'email_unverified');
            }
            update_user_meta($user->ID, self::VERIFIED_META, '1');
        }
        if ($verification === '') update_user_meta($user->ID, self::VERIFIED_META, '1');

        $remember = !empty($data['remember']);
        $session = self::create_session($user->ID, $remember);
        if (!$session) {
            return self::error('Unable to sign in right now. Please try again.', 503);
        }

        return self::success(array(
            'token' => $session['token'],
            'expiresAt' => $session['expiresAt'],
            'customer' => self::customer_payload($user->ID),
        ));
    }

    public static function logout(WP_REST_Request $request): WP_REST_Response {
        $token = self::session_token($request);
        if ($token) {
            global $wpdb;
            $wpdb->delete(self::session_table(), array('token_hash' => hash('sha256', $token)), array('%s'));
        }
        return self::success(array('message' => 'Signed out.'));
    }

    public static function me(WP_REST_Request $request): WP_REST_Response {
        $user_id = self::authenticated_user_id($request);
        if (!$user_id) {
            return self::error('Authentication required.', 401, 'unauthenticated');
        }
        return self::success(array('customer' => self::customer_payload($user_id)));
    }

    public static function verify_email(WP_REST_Request $request): WP_REST_Response {
        $data = self::json($request);
        $email = sanitize_email($data['email'] ?? '');
        $token = (string) ($data['token'] ?? '');
        $user = get_user_by('email', $email);

        if (!$user || !$token || time() > (int) get_user_meta($user->ID, self::VERIFY_EXPIRES_META, true)) {
            return self::error('This verification link is invalid or has expired.', 400, 'invalid_verification');
        }
        $stored_hash = (string) get_user_meta($user->ID, self::VERIFY_HASH_META, true);
        if (!$stored_hash || !hash_equals($stored_hash, hash('sha256', $token))) {
            return self::error('This verification link is invalid or has expired.', 400, 'invalid_verification');
        }

        update_user_meta($user->ID, self::VERIFIED_META, '1');
        delete_user_meta($user->ID, self::VERIFY_HASH_META);
        delete_user_meta($user->ID, self::VERIFY_EXPIRES_META);
        return self::success(array('message' => 'Email verified. You can now sign in.'));
    }

    public static function resend_verification(WP_REST_Request $request): WP_REST_Response {
        $data = self::json($request);
        $email = sanitize_email($data['email'] ?? '');
        if (self::rate_limit('resend', self::client_identifier($request) . '|' . strtolower($email), 3, HOUR_IN_SECONDS)) {
            $user = get_user_by('email', $email);
            if ($user && get_user_meta($user->ID, self::VERIFIED_META, true) !== '1') {
                self::send_verification($user->ID, $email);
            }
        }
        return self::success(array('message' => 'If this account requires verification, a new email has been sent.'));
    }

    public static function forgot_password(WP_REST_Request $request): WP_REST_Response {
        $data = self::json($request);
        $email = sanitize_email($data['email'] ?? '');
        $identifier = self::client_identifier($request) . '|' . strtolower($email);

        if (self::rate_limit('forgot', $identifier, 3, HOUR_IN_SECONDS)) {
            $user = get_user_by('email', $email);
            if ($user) {
                $key = get_password_reset_key($user);
                if (!is_wp_error($key)) {
                    $url = add_query_arg(array(
                        'key' => $key,
                        'login' => $user->user_login,
                    ), self::frontend_url() . '/reset-password');
                    wp_mail($email, 'Reset your EngineerParts password', "Use the secure link below to reset your password.\n\n{$url}\n\nIf you did not request this, ignore this email.");
                }
            }
        }

        return self::success(array('message' => 'If an account exists for this email address, password reset instructions have been sent.'));
    }

    public static function reset_password(WP_REST_Request $request): WP_REST_Response {
        $data = self::json($request);
        $login = sanitize_user($data['login'] ?? '');
        $key = sanitize_text_field($data['key'] ?? '');
        $password = (string) ($data['password'] ?? '');

        if (!self::valid_password($password)) {
            return self::error('Password must be at least 8 characters and contain letters and numbers.', 422);
        }
        if (!self::rate_limit('reset', self::client_identifier($request) . '|' . strtolower($login), 5, HOUR_IN_SECONDS)) {
            return self::error('Too many reset attempts. Please request a new password reset email.', 429);
        }

        $user = check_password_reset_key($key, $login);
        if (is_wp_error($user)) {
            return self::error('This password reset link is invalid or has expired.', 400, 'invalid_reset');
        }
        reset_password($user, $password);
        self::revoke_user_sessions($user->ID);
        return self::success(array('message' => 'Password updated. You can now sign in.'));
    }

    public static function account(WP_REST_Request $request): WP_REST_Response {
        $user_id = self::authenticated_user_id($request);
        if (!$user_id) return self::error('Authentication required.', 401, 'unauthenticated');
        return self::success(array('customer' => self::customer_payload($user_id, true)));
    }

    public static function update_account(WP_REST_Request $request): WP_REST_Response {
        $user_id = self::authenticated_user_id($request);
        if (!$user_id) return self::error('Authentication required.', 401, 'unauthenticated');
        $data = self::json($request);
        $first_name = sanitize_text_field($data['firstName'] ?? '');
        $last_name = sanitize_text_field($data['lastName'] ?? '');
        $email = sanitize_email($data['email'] ?? '');
        if (!$first_name || !$last_name || !is_email($email)) {
            return self::error('Please check the required profile fields.', 422);
        }
        $email_owner = email_exists($email);
        if ($email_owner && (int) $email_owner !== $user_id) {
            return self::error('This email address is already used by another account.', 409, 'email_exists');
        }
        $existing_user = get_userdata($user_id);
        $email_changed = $existing_user && strtolower($existing_user->user_email) !== strtolower($email);
        $updated = wp_update_user(array(
            'ID' => $user_id, 'first_name' => $first_name, 'last_name' => $last_name,
            'display_name' => trim("{$first_name} {$last_name}"), 'user_email' => $email,
        ));
        if (is_wp_error($updated)) {
            self::log_failure('account', 'profile_update', $updated);
            return self::error('Unable to update your profile right now.', 502);
        }
        $customer = new WC_Customer($user_id);
        $customer->set_billing_first_name($first_name);
        $customer->set_billing_last_name($last_name);
        $customer->set_billing_email($email);
        $customer->set_billing_phone(sanitize_text_field($data['phone'] ?? ''));
        $customer->set_billing_company(sanitize_text_field($data['company'] ?? ''));
        $customer->save();
        self::save_business_meta($user_id, $data);
        if ($email_changed) {
            update_user_meta($user_id, self::VERIFIED_META, '0');
            self::send_verification($user_id, $email);
        }
        return self::success(array('message' => $email_changed ? 'Profile updated. Verify your new email address before your next sign-in.' : 'Profile updated.', 'customer' => self::customer_payload($user_id, true)));
    }

    public static function update_addresses(WP_REST_Request $request): WP_REST_Response {
        $user_id = self::authenticated_user_id($request);
        if (!$user_id) return self::error('Authentication required.', 401, 'unauthenticated');
        $data = self::json($request);
        $billing = isset($data['billing']) && is_array($data['billing']) ? $data['billing'] : array();
        $shipping = !empty($data['sameAsBilling']) ? $billing : (isset($data['shipping']) && is_array($data['shipping']) ? $data['shipping'] : array());
        if (!self::valid_address($billing, true) || !self::valid_address($shipping, false)) {
            return self::error('Please complete all required address fields.', 422);
        }
        $customer = new WC_Customer($user_id);
        self::set_customer_address($customer, 'billing', $billing);
        self::set_customer_address($customer, 'shipping', $shipping);
        $customer->save();
        return self::success(array('message' => 'Addresses updated.', 'customer' => self::customer_payload($user_id, true)));
    }

    public static function change_password(WP_REST_Request $request): WP_REST_Response {
        $user_id = self::authenticated_user_id($request);
        if (!$user_id) return self::error('Authentication required.', 401, 'unauthenticated');
        $data = self::json($request);
        $current = (string) ($data['currentPassword'] ?? '');
        $password = (string) ($data['newPassword'] ?? '');
        if (!self::rate_limit('change_password', self::client_identifier($request) . '|' . $user_id, 5, 15 * MINUTE_IN_SECONDS)) {
            return self::error('Too many password attempts. Please try again later.', 429);
        }
        $user = get_userdata($user_id);
        if (!$user || !wp_check_password($current, $user->user_pass, $user_id)) {
            return self::error('Current password is incorrect.', 403, 'invalid_password');
        }
        if (!self::valid_password($password)) {
            return self::error('Password must be at least 8 characters and contain letters and numbers.', 422);
        }
        wp_set_password($password, $user_id);
        self::revoke_user_sessions($user_id);
        return self::success(array('message' => 'Password changed. Please sign in again.'));
    }

    public static function orders(WP_REST_Request $request): WP_REST_Response {
        $user_id = self::authenticated_user_id($request);
        if (!$user_id) return self::error('Authentication required.', 401, 'unauthenticated');
        $orders = wc_get_orders(array('customer_id' => $user_id, 'limit' => 50, 'orderby' => 'date', 'order' => 'DESC'));
        return self::success(array('orders' => array_map(array(self::class, 'order_summary'), $orders)));
    }

    public static function order(WP_REST_Request $request): WP_REST_Response {
        $user_id = self::authenticated_user_id($request);
        if (!$user_id) return self::error('Authentication required.', 401, 'unauthenticated');
        $order = wc_get_order((int) $request['id']);
        if (!$order || (int) $order->get_customer_id() !== $user_id) return self::error('Order not found.', 404, 'not_found');
        return self::success(array('order' => self::order_detail($order)));
    }

    public static function reorder(WP_REST_Request $request): WP_REST_Response {
        $user_id = self::authenticated_user_id($request);
        if (!$user_id) return self::error('Authentication required.', 401, 'unauthenticated');
        $order = wc_get_order((int) $request['id']);
        if (!$order || (int) $order->get_customer_id() !== $user_id) return self::error('Order not found.', 404, 'not_found');
        $items = array();
        foreach ($order->get_items() as $item) {
            $product = $item->get_product();
            if (!$product || !$product->is_purchasable() || !$product->is_in_stock()) continue;
            $stock = $product->get_stock_quantity();
            $quantity = min((int) $item->get_quantity(), $stock === null ? 99 : max(0, (int) $stock));
            if ($quantity < 1) continue;
            $image_id = $product->get_image_id();
            $items[] = array(
                'productId' => (string) $product->get_id(), 'sku' => $product->get_sku(),
                'name' => $product->get_name(), 'slug' => $product->get_slug(),
                'brand' => (string) $product->get_meta('brand'),
                'condition' => (string) ($product->get_meta('condition') ?: 'New Surplus'),
                'unitPrice' => (float) wc_get_price_to_display($product), 'currency' => get_woocommerce_currency(),
                'quantity' => $quantity, 'maxQuantity' => $stock === null ? 99 : (int) $stock,
                'image' => $image_id ? wp_get_attachment_image_url($image_id, 'woocommerce_thumbnail') : wc_placeholder_img_src(),
                'warehouse' => (string) $product->get_meta('warehouse_location'),
            );
        }
        return self::success(array('items' => $items));
    }

    public static function enquiries(WP_REST_Request $request): WP_REST_Response {
        $user_id = self::authenticated_user_id($request);
        if (!$user_id) return self::error('Authentication required.', 401, 'unauthenticated');
        $posts = get_posts(array(
            'post_type' => 'engineerparts_enquiry', 'post_status' => 'private', 'numberposts' => 100,
            'orderby' => 'date', 'order' => 'DESC',
            'meta_query' => array(array('key' => 'customer_id', 'value' => (string) $user_id, 'compare' => '=')),
        ));
        return self::success(array('enquiries' => array_map(array(self::class, 'enquiry_payload'), $posts)));
    }

    public static function claim_enquiries(WP_REST_Request $request): WP_REST_Response {
        $user_id = self::authenticated_user_id($request);
        if (!$user_id) return self::error('Authentication required.', 401, 'unauthenticated');
        $data = self::json($request);
        $references = isset($data['references']) && is_array($data['references']) ? array_slice($data['references'], 0, 200) : array();
        $user = get_userdata($user_id);
        $claimed = 0;
        foreach ($references as $reference) {
            $reference = sanitize_text_field($reference);
            $posts = get_posts(array(
                'post_type' => 'engineerparts_enquiry', 'post_status' => 'private', 'numberposts' => 1,
                'meta_query' => array(
                    'relation' => 'AND',
                    array('key' => 'enquiry_reference', 'value' => $reference, 'compare' => '='),
                    array('key' => 'email', 'value' => $user->user_email, 'compare' => '='),
                    array('key' => 'customer_id', 'value' => '0', 'compare' => '='),
                ),
            ));
            if ($posts) {
                update_post_meta($posts[0]->ID, 'customer_id', (string) $user_id);
                $claimed++;
            }
        }
        return self::success(array('claimed' => $claimed));
    }

    public static function submit_enquiry(WP_REST_Request $request): WP_REST_Response {
        $data = self::json($request);
        $email = sanitize_email($data['email'] ?? '');
        $contact = sanitize_text_field($data['contact'] ?? '');
        if (!is_email($email) || !$contact) return self::error('Please provide a valid name and email address.', 422);
        if (!self::rate_limit('enquiry', self::client_identifier($request) . '|' . strtolower($email), 10, HOUR_IN_SECONDS)) {
            return self::error('Too many enquiries have been submitted. Please try again later.', 429);
        }
        $user_id = self::authenticated_user_id($request);
        if ($user_id) {
            $user = get_userdata($user_id);
            $email = $user->user_email;
        }
        $post_id = wp_insert_post(array(
            'post_type' => 'engineerparts_enquiry', 'post_status' => 'private',
            'post_title' => 'New EngineerParts enquiry', 'post_author' => 0,
        ), true);
        if (is_wp_error($post_id)) {
            self::log_failure('enquiries', 'create', $post_id);
            return self::error('Unable to submit your enquiry right now.', 502);
        }
        $reference = sprintf('EP-RFQ-%s-%06d', gmdate('Y'), $post_id);
        wp_update_post(array('ID' => $post_id, 'post_title' => $reference));
        $fields = array(
            'enquiry_reference' => $reference, 'customer_id' => (string) $user_id,
            'lead_type' => sanitize_key($data['lead_type'] ?? 'general_contact'),
            'product_id' => absint($data['product_id'] ?? 0), 'product_name' => sanitize_text_field($data['product_name'] ?? ''),
            'sku' => sanitize_text_field($data['sku'] ?? ''), 'requested_quantity' => max(0, absint($data['quantity'] ?? 0)),
            'message' => sanitize_textarea_field($data['message'] ?? ''), 'company' => sanitize_text_field($data['company'] ?? ''),
            'contact' => $contact, 'email' => $email, 'phone' => sanitize_text_field($data['phone'] ?? ''),
            'country' => sanitize_text_field($data['country'] ?? ''), 'status' => 'submitted',
            'source' => sanitize_key($data['source'] ?? 'web'), 'created_at' => gmdate(DATE_ATOM), 'updated_at' => gmdate(DATE_ATOM),
        );
        foreach ($fields as $key => $value) update_post_meta($post_id, $key, $value);
        wp_mail(get_option('admin_email'), "New enquiry {$reference}", "A new EngineerParts enquiry has been submitted.\nReference: {$reference}\nCustomer: {$contact}\nEmail: {$email}");
        wp_mail($email, "EngineerParts enquiry {$reference}", "We received your enquiry.\nReference: {$reference}\nOur team will review it and respond shortly.");
        return self::success(array('lead_id' => $reference, 'received_at' => $fields['created_at']), 201);
    }

    public static function saved_products(WP_REST_Request $request): WP_REST_Response {
        $user_id = self::authenticated_user_id($request);
        if (!$user_id) return self::error('Authentication required.', 401, 'unauthenticated');
        $ids = get_user_meta($user_id, 'engineerparts_saved_products', true);
        return self::success(array('productIds' => is_array($ids) ? array_values(array_map('intval', $ids)) : array()));
    }

    public static function toggle_saved_product(WP_REST_Request $request): WP_REST_Response {
        $user_id = self::authenticated_user_id($request);
        if (!$user_id) return self::error('Authentication required.', 401, 'unauthenticated');
        $data = self::json($request);
        $product_id = absint($data['productId'] ?? 0);
        $product = $product_id ? wc_get_product($product_id) : false;
        if (!$product || $product->get_status() !== 'publish') return self::error('Product not found.', 404, 'not_found');
        $ids = get_user_meta($user_id, 'engineerparts_saved_products', true);
        $ids = is_array($ids) ? array_values(array_unique(array_map('intval', $ids))) : array();
        $saved = !in_array($product_id, $ids, true);
        if ($saved) $ids[] = $product_id;
        else $ids = array_values(array_diff($ids, array($product_id)));
        update_user_meta($user_id, 'engineerparts_saved_products', array_slice($ids, -100));
        return self::success(array('saved' => $saved, 'productIds' => $ids));
    }

    public static function purge_sessions(): void {
        global $wpdb;
        $wpdb->query($wpdb->prepare('DELETE FROM ' . self::session_table() . ' WHERE expires_at < %s', current_time('mysql', true)));
    }

    private static function authenticated_user_id(WP_REST_Request $request): int {
        $token = self::session_token($request);
        if (!$token) {
            return 0;
        }

        global $wpdb;
        $row = $wpdb->get_row($wpdb->prepare(
            'SELECT user_id, expires_at FROM ' . self::session_table() . ' WHERE token_hash = %s LIMIT 1',
            hash('sha256', $token)
        ));
        if (!$row || strtotime($row->expires_at . ' UTC') <= time()) {
            return 0;
        }

        $wpdb->update(
            self::session_table(),
            array('last_seen_at' => current_time('mysql', true)),
            array('token_hash' => hash('sha256', $token)),
            array('%s'),
            array('%s')
        );
        return (int) $row->user_id;
    }

    private static function create_session(int $user_id, bool $remember): ?array {
        global $wpdb;
        $token = bin2hex(random_bytes(32));
        $expires = time() + ($remember ? 30 * DAY_IN_SECONDS : DAY_IN_SECONDS);
        $created = current_time('mysql', true);
        $inserted = $wpdb->insert(self::session_table(), array(
            'user_id' => $user_id,
            'token_hash' => hash('sha256', $token),
            'expires_at' => gmdate('Y-m-d H:i:s', $expires),
            'created_at' => $created,
            'last_seen_at' => $created,
        ), array('%d', '%s', '%s', '%s', '%s'));

        return $inserted ? array('token' => $token, 'expiresAt' => gmdate(DATE_ATOM, $expires)) : null;
    }

    private static function revoke_user_sessions(int $user_id): void {
        global $wpdb;
        $wpdb->delete(self::session_table(), array('user_id' => $user_id), array('%d'));
    }

    private static function customer_payload(int $user_id, bool $include_account = false): array {
        $user = get_userdata($user_id);
        $customer = class_exists('WC_Customer') ? new WC_Customer($user_id) : null;
        $payload = array(
            'id' => $user_id,
            'firstName' => $customer ? $customer->get_first_name() : $user->first_name,
            'lastName' => $customer ? $customer->get_last_name() : $user->last_name,
            'displayName' => $user->display_name,
            'email' => $user->user_email,
            'phone' => $customer ? $customer->get_billing_phone() : '',
            'company' => $customer ? $customer->get_billing_company() : '',
            'emailVerified' => get_user_meta($user_id, self::VERIFIED_META, true) === '1',
        );
        if ($include_account && $customer) {
            $payload['jobTitle'] = (string) get_user_meta($user_id, 'engineerparts_job_title', true);
            $payload['department'] = (string) get_user_meta($user_id, 'engineerparts_department', true);
            $payload['vatNumber'] = (string) get_user_meta($user_id, 'engineerparts_vat_trn', true);
            $payload['companyWebsite'] = (string) get_user_meta($user_id, 'engineerparts_company_website', true);
            $payload['customerType'] = (string) get_user_meta($user_id, 'engineerparts_customer_type', true);
            $payload['billingAddress'] = self::customer_address($customer, 'billing');
            $payload['shippingAddress'] = self::customer_address($customer, 'shipping');
            global $wpdb;
            $payload['activeSessionCount'] = (int) $wpdb->get_var($wpdb->prepare(
                'SELECT COUNT(*) FROM ' . self::session_table() . ' WHERE user_id = %d AND expires_at > %s',
                $user_id,
                current_time('mysql', true)
            ));
        }
        return $payload;
    }

    private static function woocommerce_email_verified(int $user_id): bool {
        global $wpdb;
        $user = get_userdata($user_id);
        $meta_key = '_wc_email_verified_' . rtrim($wpdb->get_blog_prefix(get_current_blog_id()), '_');
        $verified_email = strtolower((string) get_user_meta($user_id, $meta_key, true));
        return $user instanceof WP_User && $verified_email !== '' &&
            hash_equals(strtolower($user->user_email), $verified_email);
    }

    private static function customer_address(WC_Customer $customer, string $type): array {
        $get = static fn(string $field): string => (string) $customer->{"get_{$type}_{$field}"}();
        return array(
            'firstName' => $get('first_name'), 'lastName' => $get('last_name'), 'company' => $get('company'),
            'address1' => $get('address_1'), 'address2' => $get('address_2'), 'city' => $get('city'),
            'state' => $get('state'), 'postalCode' => $get('postcode'), 'country' => $get('country'),
            'email' => $type === 'billing' ? $get('email') : '', 'phone' => $type === 'billing' ? $get('phone') : '',
        );
    }

    private static function valid_address(array $address, bool $billing): bool {
        $required = array('firstName', 'lastName', 'address1', 'city', 'country');
        if ($billing) { $required[] = 'email'; $required[] = 'phone'; }
        foreach ($required as $field) {
            if (empty(trim((string) ($address[$field] ?? '')))) return false;
        }
        return preg_match('/^[A-Z]{2}$/', strtoupper((string) $address['country'])) === 1;
    }

    private static function set_customer_address(WC_Customer $customer, string $type, array $address): void {
        $fields = array(
            'first_name' => 'firstName', 'last_name' => 'lastName', 'company' => 'company',
            'address_1' => 'address1', 'address_2' => 'address2', 'city' => 'city',
            'state' => 'state', 'postcode' => 'postalCode', 'country' => 'country',
        );
        foreach ($fields as $woo => $input) {
            $value = sanitize_text_field($address[$input] ?? '');
            $customer->{"set_{$type}_{$woo}"}($woo === 'country' ? strtoupper($value) : $value);
        }
        if ($type === 'billing') {
            $customer->set_billing_email(sanitize_email($address['email'] ?? ''));
            $customer->set_billing_phone(sanitize_text_field($address['phone'] ?? ''));
        }
    }

    public static function order_summary($order): array {
        return array(
            'id' => $order->get_id(), 'number' => $order->get_order_number(),
            'date' => $order->get_date_created() ? $order->get_date_created()->date(DATE_ATOM) : '',
            'status' => $order->get_status(), 'total' => (float) $order->get_total(), 'currency' => $order->get_currency(),
            'paymentStatus' => $order->is_paid() ? 'paid' : ($order->needs_payment() ? 'unpaid' : 'not-required'),
            'itemCount' => $order->get_item_count(), 'canPay' => $order->needs_payment(), 'canReorder' => $order->has_status('completed'),
        );
    }

    private static function order_detail($order): array {
        $payload = self::order_summary($order);
        $payload['paymentMethod'] = $order->get_payment_method_title();
        $payload['paymentUrl'] = $order->needs_payment() ? $order->get_checkout_payment_url() : '';
        $payload['transactionReference'] = $order->get_transaction_id();
        $payload['customerNote'] = $order->get_customer_note();
        $payload['subtotal'] = (float) $order->get_subtotal();
        $payload['tax'] = (float) $order->get_total_tax();
        $payload['shipping'] = (float) $order->get_shipping_total();
        $payload['billingAddress'] = self::order_address($order, 'billing');
        $payload['shippingAddress'] = self::order_address($order, 'shipping');
        $payload['items'] = array_values(array_map(static function ($item): array {
            $quantity = max(1, (int) $item->get_quantity());
            return array(
                'productId' => $item->get_product_id(), 'name' => $item->get_name(), 'quantity' => $quantity,
                'unitPrice' => (float) $item->get_subtotal() / $quantity,
                'subtotal' => (float) $item->get_subtotal(), 'total' => (float) $item->get_total(),
            );
        }, $order->get_items()));
        return $payload;
    }

    private static function order_address($order, string $type): array {
        $get = static fn(string $field): string => (string) $order->{"get_{$type}_{$field}"}();
        return array(
            'firstName' => $get('first_name'), 'lastName' => $get('last_name'), 'company' => $get('company'),
            'address1' => $get('address_1'), 'address2' => $get('address_2'), 'city' => $get('city'),
            'state' => $get('state'), 'postalCode' => $get('postcode'), 'country' => $get('country'),
            'email' => $type === 'billing' ? $get('email') : '', 'phone' => $type === 'billing' ? $get('phone') : '',
        );
    }

    public static function enquiry_payload(WP_Post $post): array {
        $meta = static fn(string $key): string => (string) get_post_meta($post->ID, $key, true);
        return array(
            'reference' => $meta('enquiry_reference'), 'date' => $meta('created_at'),
            'productId' => (int) $meta('product_id'), 'productName' => $meta('product_name'),
            'sku' => $meta('sku'), 'quantity' => (int) $meta('requested_quantity'),
            'message' => $meta('message'), 'status' => $meta('status'),
        );
    }

    private static function send_verification(int $user_id, string $email): void {
        $token = bin2hex(random_bytes(32));
        update_user_meta($user_id, self::VERIFY_HASH_META, hash('sha256', $token));
        update_user_meta($user_id, self::VERIFY_EXPIRES_META, (string) (time() + DAY_IN_SECONDS));
        $url = add_query_arg(array('token' => $token, 'email' => $email), self::frontend_url() . '/verify-email');
        wp_mail($email, 'Verify your EngineerParts account', "Verify your email address using the secure link below.\n\n{$url}\n\nThis link expires in 24 hours.");
    }

    private static function save_business_meta(int $user_id, array $data): void {
        $fields = array(
            'jobTitle' => 'engineerparts_job_title',
            'department' => 'engineerparts_department',
            'vatNumber' => 'engineerparts_vat_trn',
        );
        foreach ($fields as $input => $meta_key) {
            update_user_meta($user_id, $meta_key, sanitize_text_field($data[$input] ?? ''));
        }
        update_user_meta($user_id, 'engineerparts_company_website', esc_url_raw($data['companyWebsite'] ?? ''));
        $type = sanitize_text_field($data['customerType'] ?? '');
        update_user_meta($user_id, 'engineerparts_customer_type', in_array($type, self::CUSTOMER_TYPES, true) ? $type : '');
    }

    private static function valid_password(string $password): bool {
        return strlen($password) >= 8 && preg_match('/[A-Za-z]/', $password) && preg_match('/\d/', $password);
    }

    private static function rate_limit(string $scope, string $identifier, int $limit, int $window): bool {
        $key = 'ep_' . substr(hash_hmac('sha256', $scope . '|' . $identifier, wp_salt('auth')), 0, 40);
        $count = (int) get_transient($key);
        if ($count >= $limit) {
            return false;
        }
        set_transient($key, $count + 1, $window);
        return true;
    }

    private static function client_identifier(WP_REST_Request $request): string {
        $forwarded = sanitize_text_field($request->get_header('x-engineerparts-client-ip'));
        return $forwarded ?: sanitize_text_field($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    }

    private static function session_token(WP_REST_Request $request): string {
        return sanitize_text_field($request->get_header('x-engineerparts-session'));
    }

    private static function frontend_url(): string {
        $url = defined('ENGINEERPARTS_FRONTEND_URL') ? (string) ENGINEERPARTS_FRONTEND_URL : 'https://engineerparts.com';
        return untrailingslashit(esc_url_raw($url));
    }

    private static function session_table(): string {
        global $wpdb;
        return $wpdb->prefix . 'engineerparts_sessions';
    }

    private static function json(WP_REST_Request $request): array {
        $data = $request->get_json_params();
        return is_array($data) ? $data : array();
    }

    private static function success(array $data, int $status = 200): WP_REST_Response {
        return new WP_REST_Response(array_merge(array('ok' => true), $data), $status);
    }

    private static function error(string $message, int $status, string $code = 'request_failed'): WP_REST_Response {
        return new WP_REST_Response(array('ok' => false, 'error' => $message, 'code' => $code), $status);
    }

    private static function log_failure(string $endpoint, string $category, WP_Error $error): void {
        error_log(wp_json_encode(array(
            'timestamp' => gmdate(DATE_ATOM),
            'endpoint' => $endpoint,
            'category' => $category,
            'wordpressCode' => $error->get_error_code(),
        )));
    }
}

register_activation_hook(__FILE__, array(EngineerParts_Customer_Accounts::class, 'activate'));
register_deactivation_hook(__FILE__, array(EngineerParts_Customer_Accounts::class, 'deactivate'));
EngineerParts_Customer_Accounts::boot();