CREATE DATABASE campus_eats;
USE campus_eats;

-- 1. Canteens
CREATE TABLE canteens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(255),
    is_open BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users (Handles ALL roles)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('super_admin', 'local_admin', 'kitchen_staff', 'user') DEFAULT 'user',
    canteen_id INT NULL, -- Null for users & super_admin. Links staff/local_admin to their specific canteen
    daily_budget_limit DECIMAL(10,2) DEFAULT 0.00, -- 0 means no limit
    loyalty_points INT DEFAULT 0,
    penalty_flags INT DEFAULT 0, -- Max 3
    is_blocked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (canteen_id) REFERENCES canteens(id) ON DELETE SET NULL
);

-- 3. Menu Items
CREATE TABLE menu_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    canteen_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    image_url VARCHAR(255),
    est_prep_time_mins INT DEFAULT 10,
    is_available BOOLEAN DEFAULT TRUE, -- Kitchen toggles this when stock ends
    was_available_before_close BOOLEAN NULL DEFAULT NULL, -- Stores state prior to canteen shutdown
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (canteen_id) REFERENCES canteens(id) ON DELETE CASCADE
);

-- 4. Orders
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    canteen_id INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL, -- Final amount to be paid in cash
    points_redeemed INT DEFAULT 0, -- 1 pt = 5 Taka discount
    points_earned INT DEFAULT 0,   -- 1 pt per 100 Taka spent
    status ENUM(
        'pending',           -- User submitted
        'accepted',          -- Kitchen agreed to time
        'preparing',         -- Kitchen started making it (User can no longer cancel)
        'ready',             -- Ready for pickup
        'picked_up',         -- Paid and completed
        'cancelled_by_user', 
        'failed_by_canteen', -- Canteen couldn't deliver (awards 3 points to user)
        'no_show'            -- User didn't pick up within 30 mins (awards 1 flag)
    ) DEFAULT 'pending',
    requested_pickup_time DATETIME NOT NULL,
    order_group_id VARCHAR(64) NULL, -- Links orders placed together across multiple canteens
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (canteen_id) REFERENCES canteens(id),
    INDEX idx_order_group_id (order_group_id)
);

-- 5. Order Items (The actual food in the cart)
CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    menu_item_id INT NOT NULL,
    quantity INT NOT NULL,
    price_at_time DECIMAL(10,2) NOT NULL, -- Locks in the price in case it changes later
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
);

-- 6. Reviews
CREATE TABLE reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    menu_item_id INT NOT NULL,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_item_review (user_id, menu_item_id)
);

-- 7. Notifications
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(100),
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);