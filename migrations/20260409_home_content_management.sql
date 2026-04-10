-- Home page content management for admin panel
-- Creates editable carousel banners and popup banner storage.

CREATE TABLE IF NOT EXISTS home_carousel_banners (
    id INT NOT NULL AUTO_INCREMENT,
    image_url VARCHAR(500) NOT NULL,
    link_url VARCHAR(500) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS home_popup_banner (
    id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NULL,
    image_url VARCHAR(500) NULL,
    button_text VARCHAR(100) NULL,
    button_link VARCHAR(500) NULL,
    is_enabled TINYINT(1) NOT NULL DEFAULT 1,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO home_carousel_banners (image_url, link_url, sort_order, is_active)
SELECT seed.image_url, seed.link_url, seed.sort_order, seed.is_active
FROM (
    SELECT '/img/banner/banner-1.png' AS image_url, '' AS link_url, 1 AS sort_order, 1 AS is_active
    UNION ALL SELECT '/img/banner/banner-2.png', '', 2, 1
    UNION ALL SELECT '/img/banner/banner-3.png', '', 3, 1
    UNION ALL SELECT '/img/banner/banner-4.jpg', '', 4, 1
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM home_carousel_banners LIMIT 1);

INSERT IGNORE INTO home_popup_banner (id, title, message, image_url, button_text, button_link, is_enabled)
VALUES (
    1,
    'SUPER EVENT !!!',
    'Recharge on any BABA GAME channel and get bonus offers on selected days.',
    '/img/banner/banner-2.png',
    'VIP BABA GAME',
    '#',
    1
);
