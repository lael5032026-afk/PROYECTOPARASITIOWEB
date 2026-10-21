CREATE TABLE IF NOT EXISTS inventory_products (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 160),
    category TEXT NOT NULL CHECK (length(category) BETWEEN 1 AND 80),
    sku TEXT NOT NULL UNIQUE CHECK (length(sku) <= 40),
    stock INTEGER NOT NULL CHECK (stock >= 0),
    minimum_stock INTEGER NOT NULL CHECK (minimum_stock >= 0),
    price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
    status TEXT NOT NULL CHECK (status IN ('Óptimo', 'Bajo', 'Agotado'))
);

CREATE TABLE IF NOT EXISTS store_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL CHECK (length(customer_name) BETWEEN 1 AND 160),
    email TEXT NOT NULL CHECK (length(email) BETWEEN 3 AND 160),
    phone TEXT NOT NULL CHECK (length(phone) BETWEEN 1 AND 40),
    shipping_address TEXT NOT NULL CHECK (length(shipping_address) BETWEEN 1 AND 300),
    created_at TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status = 'Solicitud sin pago'),
    total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
    items_json TEXT NOT NULL CHECK (length(items_json) <= 12000)
);

CREATE TABLE IF NOT EXISTS software_plan_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    software_code TEXT NOT NULL CHECK (software_code = 'lael-nexus'),
    software_name TEXT NOT NULL CHECK (software_name = 'LAEL Nexus'),
    customer_name TEXT NOT NULL CHECK (length(customer_name) BETWEEN 1 AND 160),
    email TEXT NOT NULL CHECK (length(email) BETWEEN 3 AND 160),
    company TEXT NOT NULL CHECK (length(company) BETWEEN 1 AND 160),
    plan_period TEXT NOT NULL CHECK (plan_period IN ('mensual', 'anual')),
    created_at TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status = 'Pendiente de cotización')
);

CREATE TABLE IF NOT EXISTS request_limits (
    bucket_key TEXT PRIMARY KEY,
    window_start INTEGER NOT NULL,
    request_count INTEGER NOT NULL CHECK (request_count > 0)
);

CREATE INDEX IF NOT EXISTS IX_request_limits_window_start
    ON request_limits(window_start);

INSERT OR IGNORE INTO inventory_products
    (id, name, category, sku, stock, minimum_stock, price_cents, status)
VALUES
    (1, 'Laptop Pro 14', 'Electrónica', 'LAP-014', 42, 10, 129999, 'Óptimo'),
    (2, 'Monitor UltraWide 34', 'Electrónica', 'MON-034', 8, 12, 64950, 'Bajo'),
    (3, 'Silla Ergonómica Nexus', 'Mobiliario', 'SIL-108', 26, 8, 28900, 'Óptimo'),
    (4, 'Teclado Mecánico RGB', 'Accesorios', 'TEC-220', 0, 15, 8999, 'Agotado'),
    (5, 'Cámara de Conferencia 4K', 'Electrónica', 'CAM-004', 15, 5, 17999, 'Óptimo');
