-- Custom SQL migration file, put you code below! --

-- providers
INSERT INTO "providers" ("id", "name", "refreshed_at", "is_active") VALUES ('dmhy', '动漫花园', NOW(), true);
INSERT INTO "providers" ("id", "name", "refreshed_at", "is_active") VALUES ('moe', '萌番组', NOW(), true);
INSERT INTO "providers" ("id", "name", "refreshed_at", "is_active") VALUES ('ani', 'ANi', NOW(), true);

-- anonymous users
INSERT INTO "users" ("name", "avatar", "providers") VALUES ('anonymous', 'https://garden.onekuma.cn/favicon.svg', '{}');
INSERT INTO "users" ("name", "avatar", "providers") VALUES ('ANi', 'https://garden.onekuma.cn/favicon.svg', '{}');
