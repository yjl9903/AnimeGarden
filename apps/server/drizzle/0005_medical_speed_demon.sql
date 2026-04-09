INSERT INTO "providers" ("id", "name", "refreshed_at", "is_active")
SELECT 'mikan', '蜜柑计划', NOW(), true
WHERE NOT EXISTS (SELECT 1 FROM "providers" WHERE "id" = 'mikan');
