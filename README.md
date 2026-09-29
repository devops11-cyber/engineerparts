# Engineerparts

Engineerparts is a responsive industrial marketplace built with Next.js. It provides WooCommerce product and brand browsing, search, enquiries, a cart and checkout flow, and lightweight API endpoints.

## Tech stack

- Next.js 14 with the App Router
- React 18
- TypeScript
- Tailwind CSS
- WooCommerce product catalog
- Browser `localStorage` for the cart and client-side enquiry history

## Prerequisites

Install the following before running the project:

- [Node.js](https://nodejs.org/) 18.17 or newer (Node.js 20 LTS is recommended)
- npm, which is included with Node.js

Check that both are available:

```bash
node --version
npm --version
```

## Run locally

1. Open a terminal in the application directory:

   ```powershell
   cd "C:\Users\Bhatia\Downloads\Code File\workspace"
   ```

2. Install the locked dependency versions:

   ```bash
   npm ci
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in a browser.

The development server reloads the page automatically when source files change. Stop it with `Ctrl+C`.

WooCommerce configuration is required to display products. Without it, the product catalog is empty.

## Connect WooCommerce

1. In WordPress, open **WooCommerce > Settings > Advanced > REST API**.
2. Create a key with **Read** access for a user who can read products.
3. Copy `.env.example` to `.env.local`.
4. Replace the example values:

  ```env
  WOOCOMMERCE_URL=https://your-wordpress-site.azurewebsites.net
  WOOCOMMERCE_CONSUMER_KEY=ck_your_consumer_key
  WOOCOMMERCE_CONSUMER_SECRET=cs_your_consumer_secret
  WOOCOMMERCE_CURRENCY=
  NEXT_PUBLIC_WHATSAPP_NUMBER=
  ```

5. Restart `npm run dev` after changing environment variables.

The app fetches all published WooCommerce products in pages of 100 and caches responses for five minutes. Keys are read only by server code and are never sent to the browser. HTTPS stores use Basic Authentication; local HTTP stores use OAuth 1.0 request signing as required by WooCommerce. If the authenticated REST API rejects the key, the app falls back to WooCommerce's public Store API and still displays published products. Create the REST API key for an Administrator or Shop Manager user to expose custom metadata to the storefront. Set `WOOCOMMERCE_CURRENCY` to the store's ISO currency code when using the authenticated REST API. `NEXT_PUBLIC_WHATSAPP_NUMBER` is optional; omit it to hide direct WhatsApp buttons.

For Azure App Service, add the same three names under **Configuration > Application settings**, then restart the Next.js app. Do not prefix secrets with `NEXT_PUBLIC_` and do not commit `.env.local`.

### WooCommerce field mapping

Standard WooCommerce fields map automatically: ID, SKU, name, slug, description, price, stock, publication date, categories, images, and attributes. Product attributes named `Brand`, `Manufacturer`, `Part Number`, `Model`, and `Condition` are also recognized.

Optional WooCommerce custom metadata can enrich listings:

| Metadata key | Example |
| --- | --- |
| `brand` | Product brand |
| `manufacturer` | Manufacturer name |
| `part_number` | Manufacturer part number |
| `model` | Product model |
| `condition` | `New Old Stock` |
| `condition_notes` | `Original carton opened for inspection` |
| `listing_type` | `Buy Now` |
| `warehouse_location` | Stock location |
| `lot_id` | Optional lot reference |
| `badges` | `CLEARANCE,SURPLUS` |
| `lead_time` | `Ships within 2 working days` |

Supported condition values are `New Surplus`, `New Old Stock`, `Refurbished`, `Used - Good`, `Used - Fair`, `For Parts / Repair`, and `Mixed`. Supported listing types are `Buy Now`, `Enquiry Only`, `Buy or Enquire`, `Make an Offer`, `Whole Lot`, and `Equipment Enquiry`.

## Production build

Create and run an optimized production build:

```bash
npm ci
npm run build
npm start
```

Then open [http://localhost:3000](http://localhost:3000).

Run the code-quality checks separately:

```bash
npm run typecheck
npm run lint
```

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Starts the development server on port 3000 |
| `npm run build` | Creates an optimized production build |
| `npm start` | Serves the production build on port 3000 |
| `npm run typecheck` | Checks TypeScript without emitting files |
| `npm run lint` | Runs the Next.js ESLint checks |

## Main features

- Browse live WooCommerce products and brands
- Filter catalog pages and search inventory
- View product images, specifications, documents, stock, and pricing
- Add products to a persistent browser cart
- Submit product and contact enquiries
- Complete the checkout flow
- Browse recently added stock and live brands
- Record lightweight page-view analytics through an API route

## Application routes

| Route | Description |
| --- | --- |
| `/` | Home page and featured inventory |
| `/search` | Search results and catalog filtering |
| `/product/[slug]` | Product details |
| `/brands` and `/brands/[brand]` | Brand listing and inventory |
| `/clearance` | All live WooCommerce products |
| `/recently-added` | Recently added inventory |
| `/cart` | Shopping cart |
| `/checkout` | Checkout form |
| `/my-enquiries` | Enquiries saved in this browser |
| `/account` | Account overview |
| `/about` | About Engineerparts |
| `/contact` | Contact form |

## API routes

| Endpoint | Methods | Current behavior |
| --- | --- | --- |
| `/api/leads` | `GET`, `POST` | Accepts and lists enquiries in temporary server memory |
| `/api/orders` | `GET`, `POST` | Accepts and lists orders in temporary server memory |
| `/api/analytics` | `GET`, `POST` | Records and reports temporary page-view data |
| `/api/search` | `GET` | Returns WooCommerce product and brand suggestions |
| `/api/import` | `GET`, `POST` | Documents the reserved future catalog-import contract |

The lead, order, and analytics API stores are prototypes. Their contents are lost whenever the Next.js server restarts and may not be shared between serverless instances. Connect these endpoints to a persistent database before production use.

## Project structure

```text
app/                    Next.js pages, layouts, and API route handlers
  api/                  Lead, order, analytics, and import endpoints
  product/              Dynamic product detail pages
components/             Shared React components
  cards/                Product and brand cards
  providers/            Cart, enquiry, and toast state providers
  product/              Product detail components
  home/                 Home-page sections
lib/                    Types, search, analytics, utilities, and domain logic
  data/                 Empty compatibility modules and live-brand helpers
```

The `@/` import alias points to the project root, so `@/components/Header` resolves to `components/Header.tsx`.

## Data and persistence

Products come only from WooCommerce. The files under `lib/data/` intentionally contain no product, lot, equipment, brand, or category records. They preserve existing type-safe module contracts while those features are either live-derived or disabled.

- `lib/data/products.ts`
- `lib/data/lots.ts`
- `lib/data/equipment.ts`
- `lib/data/brands.ts`
- `lib/data/categories.ts`

Manage products, prices, stock, images, categories, and attributes in WooCommerce. Do not add inventory records to `lib/data/`.

Cart state and the user's enquiry list are stored in the browser's `localStorage`. Clearing site data or using another browser/device removes that local state. Submitted leads and orders also reach the API prototype, but its in-memory server state is temporary.

## Images

The application uses Next.js image optimization. Remote images are currently allowed from:

- `images.unsplash.com`
- `plus.unsplash.com`
- The hostname configured in `WOOCOMMERCE_URL`

To use another remote image host, add it to `images.remotePatterns` in `next.config.mjs`, then restart the development server.

## Troubleshooting

### Port 3000 is already in use

Stop the process using port 3000, or run development on another port:

```bash
npm run dev -- -p 3001
```

Open `http://localhost:3001` when using the alternate port.

### Dependencies fail to install

Confirm the Node.js version first. Because the repository includes `package-lock.json`, prefer `npm ci` for a clean, reproducible install. If the lock file was intentionally changed through dependency updates, run `npm install` to refresh it.

### A remote image does not load

Confirm the URL is valid and that its hostname is listed in `next.config.mjs`. Local images should be placed under a root-level `public/` directory and referenced from `/`, for example `/images/product.jpg`.

### Production server does not start

Run `npm run build` before `npm start`. The start command serves the generated `.next` build and does not compile the application first.

## Production readiness

Before deploying this as a live marketplace, replace temporary API storage with a database and connect the queued integrations to real email, CRM, ERP, and payment services. Add authentication and authorization for account and administrative operations, validate all imported data, configure monitoring, and provide production environment variables through the hosting platform rather than committing secrets.#   e n g i n e e r p a r t s  
 