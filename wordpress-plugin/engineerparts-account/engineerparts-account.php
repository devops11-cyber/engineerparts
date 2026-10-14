<?php
/**
 * Plugin Name: EngineerParts Customer Accounts
 * Description: Secure customer authentication endpoints for the EngineerParts storefront.
 * Version: 1.7.0
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
        add_action('plugins_loaded', array(self::class, 'maybe_install_enquiries_table'), 1);
        add_action('init', array(self::class, 'register_legacy_enquiry_type'), 0);
        add_action('init', array(self::class, 'maybe_migrate_legacy_enquiries'), 1);
        add_action('admin_menu', array(self::class, 'register_enquiries_admin_page'));
        add_action('admin_post_engineerparts_update_enquiry', array(self::class, 'update_enquiry_admin'));
        add_action('admin_post_engineerparts_delete_enquiry', array(self::class, 'delete_enquiry_admin'));
        add_action('admin_post_engineerparts_payment_handoff', array(self::class, 'payment_handoff'));
        add_action('admin_post_nopriv_engineerparts_payment_handoff', array(self::class, 'payment_handoff'));
        add_action('rest_api_init', array(self::class, 'register_routes'));
        add_action('engineerparts_purge_sessions', array(self::class, 'purge_sessions'));
        add_filter('woocommerce_get_checkout_order_received_url', array(self::class, 'order_received_url'), 10, 2);
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

        self::install_enquiries_table();

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
        self::route('/account/orders/(?P<id>\d+)/payment-link', 'POST', 'create_payment_link');
        self::route('/account/orders/(?P<id>\d+)', 'GET', 'order');
        self::route('/account/orders/(?P<id>\d+)/reorder', 'POST', 'reorder');
        self::route('/orders/(?P<id>\d+)/payment-link', 'POST', 'create_proxy_payment_link');
        self::route('/account/enquiries', 'GET', 'enquiries');
        self::route('/account/enquiries/claim', 'POST', 'claim_enquiries');
        self::route('/account/saved-products', 'GET', 'saved_products');
        self::route('/account/saved-products', 'POST', 'toggle_saved_product');
        self::route('/enquiries', 'POST', 'submit_enquiry');
    }

    public static function maybe_install_enquiries_table(): void {
        if (get_option('engineerparts_enquiries_db_version') === '1.3.0') {
            return;
        }
        if (!self::install_enquiries_table()) {
            error_log(wp_json_encode(array(
                'timestamp' => gmdate(DATE_ATOM),
                'endpoint' => 'enquiries',
                'category' => 'table_install_failed',
            )));
        }
    }

    public static function register_legacy_enquiry_type(): void {
        register_post_type('ep_enquiry', array(
            'public' => false,
            'show_ui' => false,
            'show_in_menu' => false,
            'supports' => array('title', 'editor'),
        ));
    }

    public static function maybe_migrate_legacy_enquiries(): void {
        if (get_option('engineerparts_enquiries_db_version') === '1.3.0') {
            return;
        }
        if (self::install_enquiries_table() && self::migrate_legacy_enquiries()) {
            update_option('engineerparts_enquiries_db_version', '1.3.0');
        }
    }

    private static function install_enquiries_table(): bool {
        global $wpdb;
        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        $table = self::enquiries_table();
        $charset = $wpdb->get_charset_collate();
        dbDelta("CREATE TABLE {$table} (
            id bigint unsigned NOT NULL AUTO_INCREMENT,
            enquiry_reference varchar(40) DEFAULT NULL,
            customer_id bigint unsigned NOT NULL DEFAULT 0,
            lead_type varchar(40) NOT NULL DEFAULT '',
            enquiry_type varchar(100) NOT NULL DEFAULT '',
            product_id bigint unsigned NOT NULL DEFAULT 0,
            product_name text NOT NULL,
            sku varchar(191) NOT NULL DEFAULT '',
            requested_quantity int unsigned NOT NULL DEFAULT 0,
            message text NOT NULL,
            company varchar(191) NOT NULL DEFAULT '',
            contact varchar(191) NOT NULL DEFAULT '',
            email varchar(191) NOT NULL DEFAULT '',
            phone varchar(100) NOT NULL DEFAULT '',
            country varchar(100) NOT NULL DEFAULT '',
            status varchar(40) NOT NULL DEFAULT 'submitted',
            source varchar(100) NOT NULL DEFAULT 'web',
            created_at varchar(35) NOT NULL DEFAULT '',
            updated_at varchar(35) NOT NULL DEFAULT '',
            PRIMARY KEY  (id),
            UNIQUE KEY enquiry_reference (enquiry_reference),
            KEY customer_id (customer_id),
            KEY email (email),
            KEY created_at (created_at)
        ) {$charset};");
        return $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $wpdb->esc_like($table))) === $table;
    }

    private static function migrate_legacy_enquiries(): bool {
        global $wpdb;
        $table = self::enquiries_table();
        $posts = get_posts(array(
            'post_type' => 'ep_enquiry',
            'post_status' => 'any',
            'numberposts' => -1,
            'orderby' => 'ID',
            'order' => 'ASC',
        ));
        foreach ($posts as $post) {
            $reference = (string) get_post_meta($post->ID, 'enquiry_reference', true);
            if (!$reference) {
                $reference = 'EP-LEGACY-' . (int) $post->ID;
            }
            if ($wpdb->get_var($wpdb->prepare("SELECT id FROM {$table} WHERE enquiry_reference = %s", $reference))) {
                continue;
            }
            $created_at = (string) get_post_meta($post->ID, 'created_at', true);
            $row = array(
                'enquiry_reference' => $reference,
                'customer_id' => (int) get_post_meta($post->ID, 'customer_id', true),
                'lead_type' => (string) get_post_meta($post->ID, 'lead_type', true),
                'enquiry_type' => (string) get_post_meta($post->ID, 'enquiry_type', true),
                'product_id' => (int) get_post_meta($post->ID, 'product_id', true),
                'product_name' => (string) get_post_meta($post->ID, 'product_name', true),
                'sku' => (string) get_post_meta($post->ID, 'sku', true),
                'requested_quantity' => (int) get_post_meta($post->ID, 'requested_quantity', true),
                'message' => (string) get_post_meta($post->ID, 'message', true),
                'company' => (string) get_post_meta($post->ID, 'company', true),
                'contact' => (string) get_post_meta($post->ID, 'contact', true),
                'email' => (string) get_post_meta($post->ID, 'email', true),
                'phone' => (string) get_post_meta($post->ID, 'phone', true),
                'country' => (string) get_post_meta($post->ID, 'country', true),
                'status' => (string) get_post_meta($post->ID, 'status', true) ?: 'submitted',
                'source' => (string) get_post_meta($post->ID, 'source', true) ?: 'web',
                'created_at' => $created_at ?: get_post_time(DATE_ATOM, true, $post),
                'updated_at' => (string) get_post_meta($post->ID, 'updated_at', true) ?: get_post_modified_time(DATE_ATOM, true, $post),
            );
            if ($wpdb->insert($table, $row) === false) {
                error_log(wp_json_encode(array(
                    'timestamp' => gmdate(DATE_ATOM),
                    'endpoint' => 'enquiries',
                    'category' => 'legacy_migration_failed',
                    'postId' => (int) $post->ID,
                    'databaseError' => $wpdb->last_error,
                )));
                return false;
            }
        }
        return true;
    }

    public static function register_enquiries_admin_page(): void {
        add_submenu_page(
            'woocommerce',
            'EngineerParts Enquiries',
            'EngineerParts Enquiries',
            'manage_woocommerce',
            'engineerparts-enquiries',
            array(self::class, 'render_enquiries_admin_page')
        );
    }

    public static function render_enquiries_admin_page(): void {
        if (!current_user_can('manage_woocommerce')) {
            wp_die(esc_html__('You do not have permission to view enquiries.', 'engineerparts'));
        }
        global $wpdb;
        $table = self::enquiries_table();
        $reference = isset($_GET['reference']) ? sanitize_text_field(wp_unslash($_GET['reference'])) : '';
        echo '<div class="wrap"><h1>EngineerParts Enquiries</h1>';
        $notice = isset($_GET['notice']) ? sanitize_key(wp_unslash($_GET['notice'])) : '';
        if ($notice === 'saved') {
            echo '<div class="notice notice-success is-dismissible"><p>Enquiry updated.</p></div>';
        } elseif ($notice === 'deleted') {
            echo '<div class="notice notice-success is-dismissible"><p>Enquiry deleted.</p></div>';
        } elseif ($notice === 'not_found') {
            echo '<div class="notice notice-error"><p>That enquiry no longer exists; it may have been deleted.</p></div>';
        } elseif ($notice === 'error') {
            echo '<div class="notice notice-error"><p>Unable to update or delete the enquiry. Please try again.</p></div>';
        }
        if ($reference !== '') {
            $enquiry = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$table} WHERE enquiry_reference = %s", $reference), ARRAY_A);
            if (!$enquiry) {
                echo '<p>Enquiry not found.</p>';
            } elseif (isset($_GET['edit']) && $_GET['edit'] === '1') {
                self::render_enquiry_edit_form($enquiry);
            } else {
                echo '<p><a href="' . esc_url(admin_url('admin.php?page=engineerparts-enquiries')) . '">&larr; All enquiries</a></p>';
                echo '<p><a class="button button-primary" href="' . esc_url(add_query_arg(
                    array('page' => 'engineerparts-enquiries', 'reference' => $reference, 'edit' => '1'),
                    admin_url('admin.php')
                )) . '">Edit enquiry</a></p>';
                echo '<table class="widefat striped"><tbody>';
                $labels = array(
                    'enquiry_reference' => 'Reference', 'enquiry_type' => 'Enquiry type',
                    'contact' => 'Name', 'company' => 'Company', 'email' => 'Email',
                    'phone' => 'Phone', 'country' => 'Country', 'product_name' => 'Product',
                    'sku' => 'Product / SKU / Lot reference', 'requested_quantity' => 'Quantity',
                    'message' => 'Message', 'status' => 'Status', 'created_at' => 'Submitted',
                );
                foreach ($labels as $key => $label) {
                    $value = (string) $enquiry[$key];
                    echo '<tr><th scope="row">' . esc_html($label) . '</th><td>' . nl2br(esc_html($value)) . '</td></tr>';
                }
                echo '</tbody></table>';
                echo '<form method="post" action="' . esc_url(admin_url('admin-post.php')) . '" style="margin-top:16px" onsubmit="return confirm(\'Permanently delete this enquiry?\')">';
                echo '<input type="hidden" name="action" value="engineerparts_delete_enquiry">';
                echo '<input type="hidden" name="reference" value="' . esc_attr($reference) . '">';
                wp_nonce_field('engineerparts_delete_enquiry_' . $reference);
                echo '<button type="submit" class="button button-link-delete">Delete enquiry</button></form>';
            }
        } else {
            $enquiries = $wpdb->get_results("SELECT * FROM {$table} ORDER BY id DESC LIMIT 100", ARRAY_A);
            if (!$enquiries) {
                echo '<p>No enquiries have been submitted yet.</p>';
            } else {
                echo '<table class="widefat striped"><thead><tr><th>Reference</th><th>Name</th><th>Company</th><th>Email</th><th>Enquiry type</th><th>Submitted</th></tr></thead><tbody>';
                foreach ($enquiries as $enquiry) {
                    $url = add_query_arg(
                        array('page' => 'engineerparts-enquiries', 'reference' => $enquiry['enquiry_reference']),
                        admin_url('admin.php')
                    );
                    echo '<tr><td><a href="' . esc_url($url) . '">' . esc_html($enquiry['enquiry_reference']) . '</a></td>';
                    echo '<td>' . esc_html($enquiry['contact']) . '</td><td>' . esc_html($enquiry['company']) . '</td>';
                    echo '<td>' . esc_html($enquiry['email']) . '</td><td>' . esc_html($enquiry['enquiry_type'] ?: $enquiry['lead_type']) . '</td>';
                    echo '<td>' . esc_html($enquiry['created_at']) . '</td></tr>';
                }
                echo '</tbody></table>';
            }
        }
        echo '</div>';
    }

    private static function render_enquiry_edit_form(array $enquiry): void {
        $reference = (string) $enquiry['enquiry_reference'];
        echo '<p><a href="' . esc_url(add_query_arg(
            array('page' => 'engineerparts-enquiries', 'reference' => $reference),
            admin_url('admin.php')
        )) . '">&larr; Cancel</a></p>';
        echo '<form method="post" action="' . esc_url(admin_url('admin-post.php')) . '">';
        echo '<input type="hidden" name="action" value="engineerparts_update_enquiry">';
        echo '<input type="hidden" name="reference" value="' . esc_attr($reference) . '">';
        wp_nonce_field('engineerparts_update_enquiry_' . $reference);
        echo '<table class="form-table"><tbody>';
        $fields = array(
            'enquiry_type' => array('Enquiry type', 'text'),
            'contact' => array('Name', 'text'),
            'company' => array('Company', 'text'),
            'email' => array('Email', 'email'),
            'phone' => array('Phone', 'text'),
            'country' => array('Country', 'text'),
            'product_name' => array('Product', 'text'),
            'sku' => array('Product / SKU / Lot reference', 'text'),
            'requested_quantity' => array('Quantity', 'number'),
        );
        foreach ($fields as $key => $field) {
            echo '<tr><th scope="row"><label for="enquiry-' . esc_attr($key) . '">' . esc_html($field[0]) . '</label></th><td>';
            echo '<input class="regular-text" id="enquiry-' . esc_attr($key) . '" name="fields[' . esc_attr($key) . ']" type="' . esc_attr($field[1]) . '" value="' . esc_attr((string) $enquiry[$key]) . '"' . ($field[1] === 'number' ? ' min="0" step="1"' : '') . '></td></tr>';
        }
        echo '<tr><th scope="row"><label for="enquiry-status">Status</label></th><td><select id="enquiry-status" name="fields[status]">';
        foreach (array('submitted', 'reviewing', 'responded', 'closed') as $status) {
            echo '<option value="' . esc_attr($status) . '"' . selected((string) $enquiry['status'], $status, false) . '>' . esc_html(ucfirst($status)) . '</option>';
        }
        echo '</select></td></tr>';
        echo '<tr><th scope="row"><label for="enquiry-message">Message</label></th><td><textarea class="large-text" rows="8" id="enquiry-message" name="fields[message]">' . esc_textarea((string) $enquiry['message']) . '</textarea></td></tr>';
        echo '</tbody></table><p><button type="submit" class="button button-primary">Save changes</button></p></form>';
    }

    public static function update_enquiry_admin(): void {
        if (!current_user_can('manage_woocommerce')) {
            wp_die(esc_html__('You do not have permission to edit enquiries.', 'engineerparts'));
        }
        $reference = isset($_POST['reference']) ? sanitize_text_field(wp_unslash($_POST['reference'])) : '';
        check_admin_referer('engineerparts_update_enquiry_' . $reference);
        $submitted = isset($_POST['fields']) && is_array($_POST['fields']) ? wp_unslash($_POST['fields']) : array();
        $email = sanitize_email($submitted['email'] ?? '');
        $contact = sanitize_text_field($submitted['contact'] ?? '');
        if (!$reference || !$contact || !is_email($email)) {
            self::redirect_enquiry_admin($reference, 'error');
        }
        $fields = array(
            'enquiry_type' => sanitize_text_field($submitted['enquiry_type'] ?? ''),
            'contact' => $contact,
            'company' => sanitize_text_field($submitted['company'] ?? ''),
            'email' => $email,
            'phone' => sanitize_text_field($submitted['phone'] ?? ''),
            'country' => sanitize_text_field($submitted['country'] ?? ''),
            'product_name' => sanitize_text_field($submitted['product_name'] ?? ''),
            'sku' => sanitize_text_field($submitted['sku'] ?? ''),
            'requested_quantity' => max(0, absint($submitted['requested_quantity'] ?? 0)),
            'message' => sanitize_textarea_field($submitted['message'] ?? ''),
            'status' => in_array(($submitted['status'] ?? ''), array('submitted', 'reviewing', 'responded', 'closed'), true)
                ? sanitize_key($submitted['status'])
                : 'submitted',
            'updated_at' => gmdate(DATE_ATOM),
        );
        global $wpdb;
        $exists = $wpdb->get_var($wpdb->prepare(
            'SELECT COUNT(*) FROM ' . self::enquiries_table() . ' WHERE enquiry_reference = %s',
            $reference
        ));
        if (!$exists) {
            self::redirect_enquiry_admin($reference, 'not_found');
        }
        $updated = $wpdb->update(
            self::enquiries_table(),
            $fields,
            array('enquiry_reference' => $reference),
            array('%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%d', '%s', '%s', '%s'),
            array('%s')
        );
        self::redirect_enquiry_admin($reference, $updated === false ? 'error' : 'saved');
    }

    public static function delete_enquiry_admin(): void {
        if (!current_user_can('manage_woocommerce')) {
            wp_die(esc_html__('You do not have permission to delete enquiries.', 'engineerparts'));
        }
        $reference = isset($_POST['reference']) ? sanitize_text_field(wp_unslash($_POST['reference'])) : '';
        check_admin_referer('engineerparts_delete_enquiry_' . $reference);
        global $wpdb;
        $deleted = $wpdb->delete(
            self::enquiries_table(),
            array('enquiry_reference' => $reference),
            array('%s')
        );
        if ($deleted === false) {
            self::redirect_enquiry_admin($reference, 'error');
        }
        wp_safe_redirect(add_query_arg(
            array('page' => 'engineerparts-enquiries', 'notice' => 'deleted'),
            admin_url('admin.php')
        ));
        exit;
    }

    private static function redirect_enquiry_admin(string $reference, string $notice): void {
        wp_safe_redirect(add_query_arg(
            array('page' => 'engineerparts-enquiries', 'reference' => $reference, 'notice' => $notice),
            admin_url('admin.php')
        ));
        exit;
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
        if (!self::rate_limit('register', self::client_identifier($request), 5, HOUR_IN_SECONDS)) {
            return self::error('Too many registration attempts. Please try again later.', 429);
        }
        $captcha_error = self::verify_turnstile((string) ($data['captchaToken'] ?? ''));
        if ($captcha_error) {
            return $captcha_error;
        }
        if (email_exists($email)) {
            return self::error('An account already exists with this email address. Please sign in instead.', 409, 'email_exists');
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
        $identifier = strtolower($email);

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
        if (self::rate_limit('resend', strtolower($email), 3, HOUR_IN_SECONDS)) {
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
        $identifier = strtolower($email);

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
        if (!self::rate_limit('reset', strtolower($login), 5, HOUR_IN_SECONDS)) {
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
        $detail = self::order_detail($order);
        if ($order->needs_payment() && empty($detail['paymentUrl'])) {
            return self::error('Secure payment could not be started. Please try again later.', 503, 'payment_handoff_failed');
        }
        return self::success(array('order' => $detail));
    }

    public static function create_payment_link(WP_REST_Request $request): WP_REST_Response {
        $user_id = self::authenticated_user_id($request);
        if (!$user_id) return self::error('Authentication required.', 401, 'unauthenticated');
        $order = wc_get_order((int) $request['id']);
        if (!$order || (int) $order->get_customer_id() !== $user_id || !$order->needs_payment()) {
            return self::error('Order not found or does not require payment.', 404, 'not_found');
        }

        $payment_url = self::payment_handoff_url($order);
        if (!$payment_url) return self::error('Secure payment could not be started. Please try again later.', 503, 'payment_handoff_failed');
        return self::success(array('paymentUrl' => $payment_url));
    }

    public static function create_proxy_payment_link(WP_REST_Request $request): WP_REST_Response {
        $order = wc_get_order((int) $request['id']);
        if (!$order || !$order->needs_payment() || $order->get_payment_method() !== 'nomod') {
            return self::error('Order not found or does not require Nomod payment.', 404, 'not_found');
        }

        $payment_url = self::nomod_payment_url($order);
        if (!$payment_url) {
            return self::error('Secure Nomod payment could not be started. Please try again later.', 503, 'payment_handoff_failed');
        }
        return self::success(array('paymentUrl' => $payment_url));
    }

    private static function nomod_payment_url(WC_Order $order): ?string {
        try {
            $gateways = WC()->payment_gateways()->payment_gateways();
            $gateway = $gateways[$order->get_payment_method()] ?? null;
            if (!$gateway || !is_callable(array($gateway, 'process_payment'))) {
                error_log(wp_json_encode(array(
                    'timestamp' => gmdate(DATE_ATOM),
                    'endpoint' => 'nomod_payment_handoff',
                    'category' => 'gateway_unavailable',
                    'order_id' => $order->get_id(),
                )));
                return null;
            }
            $result = $gateway->process_payment($order->get_id());
        } catch (Throwable $error) {
            error_log(wp_json_encode(array(
                'timestamp' => gmdate(DATE_ATOM),
                'endpoint' => 'nomod_payment_handoff',
                'category' => 'gateway_failed',
                'order_id' => $order->get_id(),
                'error' => get_class($error),
            )));
            return null;
        }

        $payment_url = is_array($result) && ($result['result'] ?? '') === 'success'
            ? esc_url_raw($result['redirect'] ?? '')
            : '';
        $parts = $payment_url ? wp_parse_url($payment_url) : false;
        $store_host = wp_parse_url(home_url('/'), PHP_URL_HOST);
        if (
            !$parts ||
            strtolower((string) ($parts['scheme'] ?? '')) !== 'https' ||
            empty($parts['host']) ||
            strtolower((string) $parts['host']) === strtolower((string) $store_host) ||
            !wp_http_validate_url($payment_url)
        ) {
            error_log(wp_json_encode(array(
                'timestamp' => gmdate(DATE_ATOM),
                'endpoint' => 'nomod_payment_handoff',
                'category' => 'invalid_gateway_redirect',
                'order_id' => $order->get_id(),
            )));
            return null;
        }
        return $payment_url;
    }

    /**
     * Creates a short-lived, single-use link that signs in only the customer who
     * owns this order before opening WooCommerce's order-payment page.
     */
    private static function payment_handoff_url(WC_Order $order): ?string {
        $user_id = (int) $order->get_customer_id();
        if (!$user_id) return $order->get_checkout_payment_url();

        $token = bin2hex(random_bytes(32));
        $transient = 'ep_payment_handoff_' . hash('sha256', $token);
        if (!set_transient($transient, array('order_id' => $order->get_id(), 'user_id' => $user_id), 5 * MINUTE_IN_SECONDS)) {
            error_log(wp_json_encode(array(
                'timestamp' => gmdate(DATE_ATOM),
                'endpoint' => 'payment_handoff',
                'category' => 'token_storage_failed',
                'order_id' => $order->get_id(),
            )));
            return null;
        }

        return add_query_arg(array(
            'action' => 'engineerparts_payment_handoff',
            'token' => $token,
        ), admin_url('admin-post.php'));
    }

    public static function payment_handoff(): void {
        nocache_headers();
        header('Referrer-Policy: no-referrer');

        $token = isset($_GET['token']) && is_string($_GET['token']) ? sanitize_text_field(wp_unslash($_GET['token'])) : '';
        if (!preg_match('/^[a-f0-9]{64}$/', $token)) {
            wp_die(esc_html__('This payment link is invalid or has expired.', 'engineerparts-account'), '', array('response' => 403));
        }

        $transient = 'ep_payment_handoff_' . hash('sha256', $token);
        $lock = 'ep_payment_handoff_consume_' . hash('sha256', $token);
        if (!add_option($lock, '1', '', 'no')) {
            wp_die(esc_html__('This payment link has already been used or has expired.', 'engineerparts-account'), '', array('response' => 403));
        }
        try {
            $handoff = get_transient($transient);
            delete_transient($transient);
        } finally {
            delete_option($lock);
        }

        if (!is_array($handoff) || empty($handoff['order_id']) || empty($handoff['user_id'])) {
            wp_die(esc_html__('This payment link is invalid or has expired.', 'engineerparts-account'), '', array('response' => 403));
        }

        $order = wc_get_order((int) $handoff['order_id']);
        $user_id = (int) $handoff['user_id'];
        $user = get_userdata($user_id);
        if (!$order || !$user || (int) $order->get_customer_id() !== $user_id || !$order->needs_payment()) {
            wp_die(esc_html__('This order is no longer available for payment.', 'engineerparts-account'), '', array('response' => 403));
        }

        wp_set_current_user($user_id);
        $short_cookie = static fn(int $expiration): int => min($expiration, HOUR_IN_SECONDS);
        add_filter('auth_cookie_expiration', $short_cookie, PHP_INT_MAX);
        try {
            wp_set_auth_cookie($user_id, false, is_ssl());
        } finally {
            remove_filter('auth_cookie_expiration', $short_cookie, PHP_INT_MAX);
        }
        do_action('wp_login', $user->user_login, $user);
        wp_safe_redirect($order->get_checkout_payment_url());
        exit;
    }

    /**
     * Sends the customer to the headless frontend's confirmation page instead of
     * WooCommerce's own thank-you page after a gateway redirects back. The order
     * key travels in the URL the same way it does for payment_handoff_url above,
     * so the frontend can look the order up without a WordPress session.
     */
    public static function order_received_url($url, $order) {
        if (!$order instanceof WC_Order) return $url;
        return add_query_arg(array(
            'order_id' => $order->get_id(),
            'order_key' => $order->get_order_key(),
        ), self::frontend_url() . '/checkout/success');
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
        global $wpdb;
        $table = self::enquiries_table();
        $rows = $wpdb->get_results(
            $wpdb->prepare("SELECT * FROM {$table} WHERE customer_id = %d ORDER BY id DESC LIMIT 100", $user_id),
            ARRAY_A
        );
        return self::success(array('enquiries' => array_map(array(self::class, 'enquiry_payload'), $rows ?: array())));
    }

    public static function claim_enquiries(WP_REST_Request $request): WP_REST_Response {
        $user_id = self::authenticated_user_id($request);
        if (!$user_id) return self::error('Authentication required.', 401, 'unauthenticated');
        $data = self::json($request);
        $references = isset($data['references']) && is_array($data['references']) ? array_slice($data['references'], 0, 200) : array();
        $user = get_userdata($user_id);
        $claimed = 0;
        global $wpdb;
        $table = self::enquiries_table();
        foreach ($references as $reference) {
            $reference = sanitize_text_field($reference);
            $updated = $wpdb->update(
                $table,
                array('customer_id' => $user_id, 'updated_at' => gmdate(DATE_ATOM)),
                array('enquiry_reference' => $reference, 'email' => $user->user_email, 'customer_id' => 0),
                array('%d', '%s'),
                array('%s', '%s', '%d')
            );
            if ($updated === false) {
                error_log(wp_json_encode(array(
                    'timestamp' => gmdate(DATE_ATOM),
                    'endpoint' => 'enquiries',
                    'category' => 'claim_failed',
                    'databaseError' => $wpdb->last_error,
                )));
            } else {
                $claimed += $updated;
            }
        }
        return self::success(array('claimed' => $claimed));
    }

    public static function submit_enquiry(WP_REST_Request $request): WP_REST_Response {
        global $wpdb;
        $data = self::json($request);
        $email = sanitize_email($data['email'] ?? '');
        $contact = sanitize_text_field($data['contact'] ?? '');
        if (!is_email($email) || !$contact) return self::error('Please provide a valid name and email address.', 422);
        if (!self::rate_limit('enquiry', strtolower($email), 10, HOUR_IN_SECONDS)) {
            return self::error('Too many enquiries have been submitted. Please try again later.', 429);
        }
        $user_id = self::authenticated_user_id($request);
        if ($user_id) {
            $user = get_userdata($user_id);
            $email = $user->user_email;
        }
        $table = self::enquiries_table();
        $fields = array(
            'customer_id' => $user_id,
            'lead_type' => sanitize_key($data['lead_type'] ?? 'general_contact'),
            'enquiry_type' => sanitize_text_field($data['enquiry_type'] ?? ''),
            'product_id' => absint($data['product_id'] ?? 0),
            'product_name' => sanitize_text_field($data['product_name'] ?? ''),
            'sku' => sanitize_text_field($data['sku'] ?? ''),
            'requested_quantity' => max(0, absint($data['quantity'] ?? 0)),
            'message' => sanitize_textarea_field($data['message'] ?? ''),
            'company' => sanitize_text_field($data['company'] ?? ''),
            'contact' => $contact,
            'email' => $email,
            'phone' => sanitize_text_field($data['phone'] ?? ''),
            'country' => sanitize_text_field($data['country'] ?? ''),
            'status' => 'submitted',
            'source' => sanitize_key($data['source'] ?? 'web'),
            'created_at' => gmdate(DATE_ATOM),
            'updated_at' => gmdate(DATE_ATOM),
        );
        if ($wpdb->insert($table, $fields) === false) {
            error_log(wp_json_encode(array(
                'timestamp' => gmdate(DATE_ATOM),
                'endpoint' => 'enquiries',
                'category' => 'create_failed',
                'databaseError' => $wpdb->last_error,
            )));
            return self::error('Unable to submit your enquiry right now.', 502);
        }
        $enquiry_id = (int) $wpdb->insert_id;
        $reference_id = $enquiry_id;
        do {
            $reference = sprintf('EP-RFQ-%s-%06d', gmdate('Y'), $reference_id++);
            $reference_exists = $wpdb->get_var($wpdb->prepare(
                "SELECT id FROM {$table} WHERE enquiry_reference = %s",
                $reference
            ));
        } while ($reference_exists);
        if ($wpdb->update($table, array('enquiry_reference' => $reference), array('id' => $enquiry_id), array('%s'), array('%d')) === false) {
            $wpdb->delete($table, array('id' => $enquiry_id), array('%d'));
            error_log(wp_json_encode(array(
                'timestamp' => gmdate(DATE_ATOM),
                'endpoint' => 'enquiries',
                'category' => 'reference_save_failed',
                'databaseError' => $wpdb->last_error,
            )));
            return self::error('Unable to submit your enquiry right now.', 502);
        }
        $details = implode("\n", array(
            "Reference: {$reference}",
            'Enquiry type: ' . ($fields['enquiry_type'] ?: $fields['lead_type']),
            "Name: {$contact}",
            'Company: ' . $fields['company'],
            "Email: {$email}",
            'Phone: ' . $fields['phone'],
            'Country: ' . $fields['country'],
            'Product / SKU / Lot reference: ' . $fields['sku'],
            "Message:\n" . $fields['message'],
        ));
        $admin_email = sanitize_email(get_option('admin_email'));
        $admin_sent = is_email($admin_email) && wp_mail(
            $admin_email,
            "New EngineerParts contact enquiry {$reference}",
            "A new contact enquiry was submitted:\n\n{$details}",
            array("Reply-To: {$contact} <{$email}>")
        );
        $customer_sent = wp_mail(
            $email,
            "We received your EngineerParts enquiry {$reference}",
            "Thank you for contacting EngineerParts. We received your enquiry:\n\n{$details}\n\nOur team will respond during the next working day."
        );
        foreach (array('admin_notification' => $admin_sent, 'customer_confirmation' => $customer_sent) as $category => $sent) {
            if (!$sent) {
                error_log(wp_json_encode(array(
                    'timestamp' => gmdate(DATE_ATOM),
                    'endpoint' => 'enquiries',
                    'category' => $category . '_mail_failed',
                )));
            }
        }
        return self::success(array(
            'lead_id' => $reference,
            'received_at' => $fields['created_at'],
            'admin_email_sent' => $admin_sent,
        ), 201);
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
        $payload['paymentUrl'] = $order->needs_payment()
            ? self::payment_handoff_url($order)
            : '';
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

    public static function enquiry_payload(array $row): array {
        return array(
            'reference' => (string) $row['enquiry_reference'],
            'date' => (string) $row['created_at'],
            'productId' => (int) $row['product_id'],
            'productName' => (string) $row['product_name'],
            'sku' => (string) $row['sku'],
            'quantity' => (int) $row['requested_quantity'],
            'message' => (string) $row['message'],
            'status' => (string) $row['status'],
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

    private static function enquiries_table(): string {
        global $wpdb;
        return $wpdb->prefix . 'engineerparts_enquiries';
    }

    private static function verify_turnstile(string $token): ?WP_REST_Response {
        $secret = defined('ENGINEERPARTS_TURNSTILE_SECRET') ? trim((string) ENGINEERPARTS_TURNSTILE_SECRET) : '';
        if ($secret === '') {
            return self::error('Account registration verification is not configured.', 503);
        }
        if ($token === '' || strlen($token) > 4096) {
            return self::error('Please complete the CAPTCHA verification and try again.', 422, 'captcha_required');
        }

        $response = wp_remote_post('https://challenges.cloudflare.com/turnstile/v0/siteverify', array(
            'timeout' => 8,
            'body' => array(
                'secret' => $secret,
                'response' => $token,
            ),
        ));
        if (is_wp_error($response) || wp_remote_retrieve_response_code($response) < 200 || wp_remote_retrieve_response_code($response) >= 300) {
            return self::error('Unable to verify CAPTCHA right now. Please try again.', 503);
        }

        $result = json_decode(wp_remote_retrieve_body($response), true);
        if (!is_array($result) || empty($result['success'])) {
            return self::error('CAPTCHA verification failed. Please try again.', 422, 'captcha_failed');
        }
        return null;
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