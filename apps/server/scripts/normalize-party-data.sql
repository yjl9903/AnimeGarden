-- One-time cleanup for users/teams captured from /users and /teams on 2026-08-20.
-- Review the verification blocks and run this file with psql. Any mismatch aborts the transaction.

BEGIN;

LOCK TABLE users, teams, resources, telegram_messages IN SHARE ROW EXCLUSIVE MODE;

CREATE TEMP TABLE party_alias_groups (
  entity text NOT NULL CHECK (entity IN ('user', 'team')),
  group_key text NOT NULL,
  names text[] NOT NULL,
  PRIMARY KEY (entity, group_key)
) ON COMMIT DROP;

-- These are equivalence groups backed by rows that existed in the API snapshot.
-- The retained row and name are selected by MAX(resources.created_at), then id as a stable fallback.
INSERT INTO party_alias_groups (entity, group_key, names)
VALUES
  ('team', 'astral-union', ARRAY['Astral Union字幕组', 'Astral Union']),
  ('team', 'boluo-cafe', ARRAY['波洛咖啡厅', '波洛咖啡厅字幕组']),
  ('team', 'ymdr', ARRAY['YMDR发布组', 'YMDR']),
  ('team', 'moe-wiki', ARRAY['萌物百科字幕组', '萌物百科']),
  ('team', 'light-novel', ARRAY['轻之国度', '轻之国度字幕组']),
  ('team', 'eggpain', ARRAY['EggPainRaws', 'EggPain-Raws']),
  ('team', 'new-sub', ARRAY['新sub', '新Sub']),
  ('team', 'nyamazing', ARRAY['Nyamazing字幕組', 'Nyamazing字幕组']),
  ('team', 'coffee', ARRAY['咖啡發佈', '咖啡发布']),
  ('team', 'suzukaze', ARRAY['鈴風字幕組', '铃风字幕组']),
  ('team', 'stl', ARRAY['STL字幕組', 'STL字幕组']),
  ('team', 'chitose', ARRAY['千歲字幕組', '千岁字幕组']),
  ('team', 'lemon', ARRAY['檸檬好酸字幕組', '柠檬好酸字幕组']),
  ('team', 'iet', ARRAY['IET字幕組', 'IET字幕组']),
  ('team', 'dhr', ARRAY['DHR動研字幕組', 'DHR动研字幕组']),
  ('team', 'mancat', ARRAY['漫貓字幕組', '漫猫字幕组']),
  ('team', 'gokusai', ARRAY['極彩字幕组', '极彩字幕组']),
  ('team', 'zhongken', ARRAY['中肯字幕組', '中肯字幕组']),
  ('team', 'sanctuary', ARRAY['聖域字幕組', '圣域字幕组']),
  ('team', 'sashihara-sakura', ARRAY['指原x櫻花字幕組', '指原x樱花字幕组']),
  ('team', 'f-house', ARRAY['F宅字幕組', 'F宅字幕组']),
  ('team', 'miaomiao', ARRAY['喵喵字幕組', '喵喵字幕组']),
  ('team', 'hkg', ARRAY['HKG字幕組', 'HKG字幕组']),
  ('team', 'rh', ARRAY['RH字幕組', 'RH字幕组']),
  ('team', 'tfo', ARRAY['TFO字幕組', 'TFO字幕组']),
  ('team', 'yukikaze', ARRAY['悠久の風', '悠久の风']),
  ('team', 'hkacg', ARRAY['HKACG字幕組', 'HKACG字幕组']),
  ('team', 'white-moon', ARRAY['白月字幕組', '白月字幕组']),
  ('team', 'vmoe', ARRAY['Vmoe字幕組', 'Vmoe字幕组']),
  ('team', 'anime-garden', ARRAY['動漫花園', '动漫花园']),
  ('team', 'douon', ARRAY['動音漫影', '动音漫影']),
  ('team', 'little-flower', ARRAY['小花花同盟戰線', '小花花同盟战线']),
  ('team', 'akito', ARRAY['秋人摸魚', '秋人摸鱼']),
  ('team', 'wind-temple', ARRAY['風之聖殿字幕組', '风之圣殿字幕组']),
  ('team', 'anime-country', ARRAY['動漫國字幕組', '动漫国字幕组']),
  ('team', 'chihiro', ARRAY['千夏字幕組', '千夏字幕组']),
  ('team', 'angel', ARRAY['天使字幕組', '天使字幕组']),
  ('team', 'tsdm', ARRAY['TSDM字幕組', 'TSDM字幕组']),
  ('team', 'producer', ARRAY['Producer字幕組', 'Producer字幕组']),
  ('team', 'garden-compress', ARRAY['花園壓制組', '花园压制组']),
  ('team', 'shigure', ARRAY['時雨初空', '时雨初空']),
  ('team', 'masora', ARRAY['masora字幕組', 'masora字幕组']),
  ('team', 'x2', ARRAY['X2字幕組', 'X2字幕组']),
  ('team', 'ten-no', ARRAY['天の字幕組', '天の字幕组']),
  ('team', 'dream-sakura', ARRAY['夢幻戀櫻', '梦幻恋樱']),
  ('team', 'hsq', ARRAY['HSQ-rip組', 'HSQ-rip组']),
  ('team', 'anime-pop', ARRAY['動漫流行館字幕組', '动漫流行馆字幕组']),
  ('team', 'anime-moe', ARRAY['動漫萌系字幕組', '动漫萌系字幕组']),
  ('team', 'qimeng', ARRAY['啟萌字幕組', '启萌字幕组']),
  ('team', '129-3', ARRAY['129.3字幕組', '129.3字幕组']),
  ('team', 'ntr', ARRAY['NTR字幕組', 'NTR字幕组']),
  ('team', 'kurokawa', ARRAY['黒川実業字幕組', '黒川実业字幕组']),
  ('team', 'moshituan', ARRAY['摸死團字幕組', '摸死团字幕组']),
  ('user', 'chihiro', ARRAY['千夏字幕組', '千夏字幕组']),
  ('user', 'kisssub', ARRAY['KissSub', 'kisssub']),
  ('user', 'von-encodes', ARRAY['Von Encodes', 'VoN Encodes']),
  ('user', 'hoshino', ARRAY['hoshinokun', 'HoshinoKun']),
  ('user', 'laputa', ARRAY['Laputa', 'laputa']),
  ('user', 'dewsweet', ARRAY['Dewsweet', 'dewsweet']),
  ('user', 'dhr', ARRAY['DHR動研字幕組', 'DHR动研字幕组']),
  ('user', 'gryphonheart', ARRAY['Gryphonheart', 'gryphonheart']),
  ('user', 'stl', ARRAY['stl字幕组', 'STL字幕组']),
  ('user', 'qinglan', ARRAY['清藍動漫', '清蓝动漫']),
  ('user', 'kurokawa', ARRAY['黒川実業字幕組', '黒川実业字幕组']),
  ('user', 'kna', ARRAY['kna', 'KNA']),
  ('user', 'x2', ARRAY['x2字幕组', 'X2字幕组']),
  ('user', 'ten-no', ARRAY['天の字幕組', '天の字幕组']),
  ('user', 'c2club', ARRAY['c2club', 'C2Club']),
  ('user', 'miaomiao', ARRAY['喵喵字幕組', '喵喵字幕组']),
  ('user', 'xiangyue', ARRAY[' 翔月', '翔月']),
  ('user', 'tfo', ARRAY['TFO字幕組', 'TFO字幕组']),
  ('user', 'airotaspy', ARRAY['Airota.spy', 'airota.spy']),
  ('user', 'ntr', ARRAY['NTR字幕組', 'NTR字幕组']),
  ('user', 'fujiwa', ARRAY['藤和エリオ ', '藤和エリオ']),
  ('user', 'manfeng', ARRAY['漫枫F ', '漫枫F']),
  ('user', 'nanaharuka', ARRAY['ななはるか ', 'ななはるか']),
  ('user', 'lastphoenix', ARRAY['Lastphoenix', 'lastphoenix']),
  ('user', 'fengxue', ARRAY['風雪酷兒', '风雪酷儿']),
  ('user', 'digistudio-case', ARRAY['Digi-Studio', 'DIGI-STUDIO']),
  ('user', 'sumisora', ARRAY['SumiSora', 'sumisora']),
  ('user', 'camoe', ARRAY['CAMOE', 'camoe']),
  ('user', 'mdm', ARRAY['mdm', 'MDM']),
  ('user', 'jiaolove', ARRAY['jiaoloveKT', 'jiaolovekt']),
  ('user', 'wind-temple', ARRAY['風之聖殿字幕組', '风之圣殿字幕组']),
  ('user', 'naggi', ARRAY['naggi', 'Naggi']),
  ('user', 'bbasub', ARRAY['bbasub', 'BBASUB']),
  ('user', 'natsukage', ARRAY['NatsuKage', 'natsukage']),
  ('user', 'six64', ARRAY['六四位元字幕組', '六四位元字幕组']),
  ('user', 'aomeng', ARRAY['奧盟字幕組', '奥盟字幕组']),
  ('user', 'tdraws-case', ARRAY['TDRAWS', 'tdraws']),
  ('user', 'animerep', ARRAY['animerep', 'Animerep']),
  ('user', 'shigure', ARRAY['時雨初空', '时雨初空']),
  ('user', 'qlqg', ARRAY['Qlqg', 'QLQG']),
  ('user', 'acg', ARRAY['ACG-', 'ACG']),
  ('user', 'eggpain', ARRAY['EggPainRaws', 'EggPain-Raws']),
  ('user', 'sfeo', ARRAY['SFEOraws', 'SFEO-Raws']),
  ('user', 'ansunion', ARRAY['ANSUnion', 'ANS-Union']),
  ('user', 'lxkfx', ARRAY['lxkfx', 'lxk_fx']),
  ('user', 'otakuzero', ARRAY['OTAKU zero', 'OTAKUzero']),
  ('user', 'ohys', ARRAY['Ohys-Raws', 'OhysRaws']),
  ('user', 'masu', ARRAY['ma su', 'masu']),
  ('user', 'phdogs', ARRAY['phdogs', 'PHDOGS!']),
  ('user', 'pzcat', ARRAY['PzCAT', 'Pz-Cat']),
  ('user', 'mrl', ARRAY['Mr.L.', 'Mr.L']),
  ('user', 'akizuki', ARRAY['秋月暮葉', '秋月 暮葉']),
  ('user', 'digistudio-punctuation', ARRAY['Digi-Studio', 'DIGISTUDIO', 'DIGI-STUDIO']),
  ('user', 'littlebakas', ARRAY['LittleBakas!', 'LittleBakas']),
  ('user', 'shixue', ARRAY['逝雪', '逝 雪']),
  ('user', 'leopard', ARRAY['Leopard-Raws', 'Leopard_RawS']),
  ('user', 'busterx', ARRAY['Buster_X', 'BusterX']),
  ('user', 'henc', ARRAY['HEnc', 'H-Enc']),
  ('user', 'lilith', ARRAY['lilithraws', 'Lilith-Raws']),
  ('user', 'vcbstudio', ARRAY['VCBStudio', 'VCB-Studio']),
  ('user', 'airaws', ARRAY['AIRaws', 'AI-Raws']),
  ('user', 'tdraws-punctuation', ARRAY['TDRAWS', 'tdraws', 'TD-RAWS']),
  ('user', 'nan-raws', ARRAY['NaN_Raws', 'NaN-Raws']),
  ('user', 'seven-stars', ARRAY['SevenStarsArmy', 'SEVENSTARS-ARMY']);

CREATE TEMP TABLE party_name_rewrites (
  entity text NOT NULL CHECK (entity IN ('user', 'team')),
  source_name text NOT NULL,
  target_name text NOT NULL,
  PRIMARY KEY (entity, source_name)
) ON COMMIT DROP;

-- Exact corrections only; there is deliberately no generic whitespace, suffix, or T/S conversion.
INSERT INTO party_name_rewrites (entity, source_name, target_name)
VALUES
  ('team', '雪飄工作室(FLsnow)', '雪飄工作室'),
  ('team', '雪飘工作室(FLsnow)', '雪飄工作室'),
  ('team', '雪飘工作室', '雪飄工作室'),
  ('user', '雪飘工作室', '雪飄工作室'),
  ('user', '雪飘工作室(FLsnow)', '雪飄工作室'),
  ('team', 'MC日劇字幕組(MCS)', 'MC日劇字幕組'),
  ('user', 'MC日剧字幕组', 'MC日劇字幕組'),
  ('team', '幻樱砂之团(SCST)', '幻樱砂之团'),
  ('team', 'SNOW放映社(SnowSub)', 'SNOW放映社'),
  ('team', '飞龙骑脸字幕组(G.I.A.N.T)', '飞龙骑脸字幕组'),
  ('user', '飞龙骑脸字幕组(G.I.A.N.T)', '飞龙骑脸字幕组'),
  ('team', '紫音動漫&發佈組', '紫音动漫发布组'),
  ('team', '紫音字幕組', '紫音动漫发布组'),
  ('team', '紫音字幕组', '紫音动漫发布组'),
  ('team', '紫音动漫&发布组', '紫音动漫发布组'),
  ('user', '紫音字幕组', '紫音动漫发布组'),
  ('user', '紫音动漫&发布组', '紫音动漫发布组'),
  ('team', 'K&W-RAWS', 'KW-RAWS'),
  ('user', 'K&W-RAWS', 'KW-RAWS'),
  ('team', 'v-bird&Eros', 'v-bird-Eros'),
  ('team', 'H&C推广站', 'HC推广站'),
  ('team', '#CHAT RUMBLE#', 'CHAT RUMBLE'),
  ('team', '◆漫游FREEWIND工作室', '漫游FREEWIND工作室'),
  ('team', '复活城&猫咪', '复活城猫咪'),
  ('team', '梦幻旋律♪发布组', '梦幻旋律发布组'),
  ('team', '樱桃花字幕组&sakura-hana', '樱桃花字幕组'),
  ('team', '天月動漫&發佈組', '天月動漫發佈組'),
  ('team', '天月动漫&发布组', '天月動漫發佈組'),
  ('user', '天月动漫&发布组', '天月動漫發佈組'),
  ('team', '六四位元字幕组', '六四位元字幕組'),
  ('user', '六四位元字幕组', '六四位元字幕組'),
  ('team', '君の名は。FANS字幕组', '君の名は。FANS字幕組'),
  ('user', '君の名は。FANS字幕组', '君の名は。FANS字幕組'),
  ('team', 'Astral Union字幕组', 'Astral-Union字幕组'),
  ('team', 'Astral Union', 'Astral-Union字幕组'),
  ('user', 'Astral Union', 'Astral-Union'),
  ('team', '指原x櫻花字幕組', '指原'),
  ('team', '指原x樱花字幕组', '指原'),
  ('user', '指原x樱花字幕组', '指原'),
  ('team', '得宗字幕组×拾月出云', '得宗字幕组'),
  ('user', '得宗字幕组×拾月出云', '得宗字幕组'),
  ('user', ' 翔月', '翔月'),
  ('user', '藤和エリオ ', '藤和エリオ'),
  ('user', '漫枫F ', '漫枫F'),
  ('user', 'ななはるか ', 'ななはるか'),
  ('user', 'Anonymous　', 'Anonymous'),
  ('user', '汁姬 ', '汁姬');

-- Fail before modifying data if any reviewed source row disappeared or changed name.
DO $$
DECLARE
  item record;
  expected_name text;
  found boolean;
BEGIN
  FOR item IN SELECT * FROM party_alias_groups LOOP
    FOREACH expected_name IN ARRAY item.names LOOP
      IF item.entity = 'user' THEN
        SELECT EXISTS (SELECT 1 FROM users WHERE name = expected_name) INTO found;
      ELSE
        SELECT EXISTS (SELECT 1 FROM teams WHERE name = expected_name) INTO found;
      END IF;
      IF NOT found THEN
        RAISE EXCEPTION 'Missing reviewed % name: % (%)', item.entity, expected_name, item.group_key;
      END IF;
    END LOOP;
  END LOOP;

  FOR item IN SELECT * FROM party_name_rewrites LOOP
    IF item.entity = 'user' THEN
      SELECT EXISTS (SELECT 1 FROM users WHERE name = item.source_name) INTO found;
    ELSE
      SELECT EXISTS (SELECT 1 FROM teams WHERE name = item.source_name) INTO found;
    END IF;
    IF NOT found THEN
      RAISE EXCEPTION 'Missing reviewed % rewrite source: %', item.entity, item.source_name;
    END IF;
  END LOOP;
END
$$;

/**
 * Merges one connected party group. Provider objects are retained, and each source name is added
 * only to the aliases array of providers carried by that source row.
 */
CREATE OR REPLACE FUNCTION pg_temp.merge_party(
  party_entity text,
  requested_ids integer[],
  requested_name text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  ids integer[];
  loser_ids integer[];
  winner_id integer;
  winner_name text;
  final_name text;
  final_avatar text;
  merged_providers jsonb := '{}'::jsonb;
  party record;
  provider_entry record;
  previous_info jsonb;
  next_info jsonb;
  alias_values jsonb;
BEGIN
  IF party_entity = 'user' THEN
    SELECT array_agg(id ORDER BY id)
      INTO ids
      FROM users
      WHERE id = ANY(requested_ids) OR (requested_name IS NOT NULL AND name = requested_name);

    SELECT u.id, u.name
      INTO winner_id, winner_name
      FROM users u
      LEFT JOIN resources r ON r.publisher_id = u.id
      WHERE u.id = ANY(ids)
      GROUP BY u.id, u.name
      ORDER BY max(r.created_at) DESC NULLS LAST, u.id DESC
      LIMIT 1;
  ELSIF party_entity = 'team' THEN
    SELECT array_agg(id ORDER BY id)
      INTO ids
      FROM teams
      WHERE id = ANY(requested_ids) OR (requested_name IS NOT NULL AND name = requested_name);

    SELECT t.id, t.name
      INTO winner_id, winner_name
      FROM teams t
      LEFT JOIN resources r ON r.fansub_id = t.id
      WHERE t.id = ANY(ids)
      GROUP BY t.id, t.name
      ORDER BY max(r.created_at) DESC NULLS LAST, t.id DESC
      LIMIT 1;
  ELSE
    RAISE EXCEPTION 'Unsupported party entity: %', party_entity;
  END IF;

  IF winner_id IS NULL THEN
    RETURN;
  END IF;

  final_name := coalesce(requested_name, winner_name);
  loser_ids := array_remove(ids, winner_id);

  IF party_entity = 'user' THEN
    SELECT coalesce(
      (SELECT avatar FROM users WHERE id = winner_id),
      (SELECT avatar FROM users WHERE id = ANY(ids) AND avatar IS NOT NULL ORDER BY id DESC LIMIT 1)
    ) INTO final_avatar;

    FOR party IN
      SELECT u.*, max(r.created_at) AS last_used_at
      FROM users u
      LEFT JOIN resources r ON r.publisher_id = u.id
      WHERE u.id = ANY(ids)
      GROUP BY u.id
      ORDER BY max(r.created_at) ASC NULLS FIRST, u.id ASC
    LOOP
      FOR provider_entry IN
        SELECT key, value FROM jsonb_each(coalesce(party.providers::jsonb, '{}'::jsonb))
      LOOP
        previous_info := merged_providers -> provider_entry.key;
        next_info := coalesce(previous_info, '{}'::jsonb) || provider_entry.value;

        SELECT coalesce(jsonb_agg(alias ORDER BY alias), '[]'::jsonb)
          INTO alias_values
          FROM (
            SELECT DISTINCT alias
            FROM (
              SELECT jsonb_array_elements_text(coalesce(previous_info -> 'aliases', '[]'::jsonb)) AS alias
              UNION ALL
              SELECT jsonb_array_elements_text(coalesce(provider_entry.value -> 'aliases', '[]'::jsonb))
              UNION ALL
              SELECT party.name
            ) observed
            WHERE alias <> '' AND alias <> final_name
          ) unique_aliases;

        IF jsonb_array_length(alias_values) > 0 THEN
          next_info := jsonb_set(next_info, '{aliases}', alias_values, true);
        ELSE
          next_info := next_info - 'aliases';
        END IF;
        merged_providers := jsonb_set(merged_providers, ARRAY[provider_entry.key], next_info, true);
      END LOOP;
    END LOOP;

    IF coalesce(array_length(loser_ids, 1), 0) > 0 THEN
      DELETE FROM telegram_messages tm
      USING (
        SELECT id, row_number() OVER (
          PARTITION BY subject_id, episode
          ORDER BY (publisher_id = winner_id) DESC, updated_at DESC, id DESC
        ) AS duplicate_rank
        FROM telegram_messages
        WHERE publisher_id = winner_id OR publisher_id = ANY(loser_ids)
      ) duplicate
      WHERE tm.id = duplicate.id AND duplicate.duplicate_rank > 1;

      UPDATE resources SET publisher_id = winner_id WHERE publisher_id = ANY(loser_ids);
      UPDATE telegram_messages SET publisher_id = winner_id WHERE publisher_id = ANY(loser_ids);
      DELETE FROM users WHERE id = ANY(loser_ids);
    END IF;

    UPDATE users
      SET name = final_name, avatar = final_avatar, providers = merged_providers::json
      WHERE id = winner_id;
  ELSE
    SELECT coalesce(
      (SELECT avatar FROM teams WHERE id = winner_id),
      (SELECT avatar FROM teams WHERE id = ANY(ids) AND avatar IS NOT NULL ORDER BY id DESC LIMIT 1)
    ) INTO final_avatar;

    FOR party IN
      SELECT t.*, max(r.created_at) AS last_used_at
      FROM teams t
      LEFT JOIN resources r ON r.fansub_id = t.id
      WHERE t.id = ANY(ids)
      GROUP BY t.id
      ORDER BY max(r.created_at) ASC NULLS FIRST, t.id ASC
    LOOP
      FOR provider_entry IN
        SELECT key, value FROM jsonb_each(coalesce(party.providers::jsonb, '{}'::jsonb))
      LOOP
        previous_info := merged_providers -> provider_entry.key;
        next_info := coalesce(previous_info, '{}'::jsonb) || provider_entry.value;

        SELECT coalesce(jsonb_agg(alias ORDER BY alias), '[]'::jsonb)
          INTO alias_values
          FROM (
            SELECT DISTINCT alias
            FROM (
              SELECT jsonb_array_elements_text(coalesce(previous_info -> 'aliases', '[]'::jsonb)) AS alias
              UNION ALL
              SELECT jsonb_array_elements_text(coalesce(provider_entry.value -> 'aliases', '[]'::jsonb))
              UNION ALL
              SELECT party.name
            ) observed
            WHERE alias <> '' AND alias <> final_name
          ) unique_aliases;

        IF jsonb_array_length(alias_values) > 0 THEN
          next_info := jsonb_set(next_info, '{aliases}', alias_values, true);
        ELSE
          next_info := next_info - 'aliases';
        END IF;
        merged_providers := jsonb_set(merged_providers, ARRAY[provider_entry.key], next_info, true);
      END LOOP;
    END LOOP;

    IF coalesce(array_length(loser_ids, 1), 0) > 0 THEN
      DELETE FROM telegram_messages tm
      USING (
        SELECT id, row_number() OVER (
          PARTITION BY subject_id, episode
          ORDER BY (fansub_id = winner_id) DESC, updated_at DESC, id DESC
        ) AS duplicate_rank
        FROM telegram_messages
        WHERE fansub_id = winner_id OR fansub_id = ANY(loser_ids)
      ) duplicate
      WHERE tm.id = duplicate.id AND duplicate.duplicate_rank > 1;

      UPDATE resources SET fansub_id = winner_id WHERE fansub_id = ANY(loser_ids);
      UPDATE telegram_messages SET fansub_id = winner_id WHERE fansub_id = ANY(loser_ids);
      DELETE FROM teams WHERE id = ANY(loser_ids);
    END IF;

    UPDATE teams
      SET name = final_name, avatar = final_avatar, providers = merged_providers::json
      WHERE id = winner_id;
  END IF;
END
$$;

-- First merge every duplicate (entity, provider, providerId), even when the names are unrelated.
DO $$
DECLARE
  collision record;
BEGIN
  LOOP
    SELECT p.key AS provider, p.value ->> 'providerId' AS provider_id, array_agg(u.id) AS ids
      INTO collision
      FROM users u
      CROSS JOIN LATERAL jsonb_each(coalesce(u.providers::jsonb, '{}'::jsonb)) p
      WHERE nullif(p.value ->> 'providerId', '') IS NOT NULL
      GROUP BY p.key, p.value ->> 'providerId'
      HAVING count(*) > 1
      LIMIT 1;
    EXIT WHEN NOT FOUND;
    PERFORM pg_temp.merge_party('user', collision.ids);
  END LOOP;

  LOOP
    SELECT p.key AS provider, p.value ->> 'providerId' AS provider_id, array_agg(t.id) AS ids
      INTO collision
      FROM teams t
      CROSS JOIN LATERAL jsonb_each(coalesce(t.providers::jsonb, '{}'::jsonb)) p
      WHERE nullif(p.value ->> 'providerId', '') IS NOT NULL
      GROUP BY p.key, p.value ->> 'providerId'
      HAVING count(*) > 1
      LIMIT 1;
    EXIT WHEN NOT FOUND;
    PERFORM pg_temp.merge_party('team', collision.ids);
  END LOOP;
END
$$;

-- Then merge the reviewed cross-provider/cross-id alias groups.
DO $$
DECLARE
  item record;
  ids integer[];
BEGIN
  FOR item IN SELECT * FROM party_alias_groups ORDER BY entity, group_key LOOP
    IF item.entity = 'user' THEN
      SELECT array_agg(DISTINCT u.id)
        INTO ids
        FROM users u
        WHERE u.name = ANY(item.names)
           OR EXISTS (
             SELECT 1
             FROM jsonb_each(coalesce(u.providers::jsonb, '{}'::jsonb)) p
             CROSS JOIN LATERAL jsonb_array_elements_text(coalesce(p.value -> 'aliases', '[]'::jsonb)) AS old_name(value)
             WHERE old_name.value = ANY(item.names)
           );
    ELSE
      SELECT array_agg(DISTINCT t.id)
        INTO ids
        FROM teams t
        WHERE t.name = ANY(item.names)
           OR EXISTS (
             SELECT 1
             FROM jsonb_each(coalesce(t.providers::jsonb, '{}'::jsonb)) p
             CROSS JOIN LATERAL jsonb_array_elements_text(coalesce(p.value -> 'aliases', '[]'::jsonb)) AS old_name(value)
             WHERE old_name.value = ANY(item.names)
           );
    END IF;
    PERFORM pg_temp.merge_party(item.entity, ids);
  END LOOP;
END
$$;

-- Finally apply the exact spelling/symbol rewrites, merging an existing target row when necessary.
DO $$
DECLARE
  item record;
  ids integer[];
BEGIN
  FOR item IN SELECT * FROM party_name_rewrites ORDER BY entity, source_name LOOP
    IF item.entity = 'user' THEN
      SELECT array_agg(DISTINCT u.id)
        INTO ids
        FROM users u
        WHERE u.name IN (item.source_name, item.target_name);
    ELSE
      SELECT array_agg(DISTINCT t.id)
        INTO ids
        FROM teams t
        WHERE t.name IN (item.source_name, item.target_name);
    END IF;
    PERFORM pg_temp.merge_party(item.entity, ids, item.target_name);
  END LOOP;
END
$$;

-- Postconditions: no duplicate provider identity and no dangling resource references.
DO $$
DECLARE
  duplicate_count integer;
  dangling_count integer;
  matched_count integer;
  item record;
BEGIN
  FOR item IN SELECT * FROM party_alias_groups LOOP
    IF item.entity = 'user' THEN
      SELECT count(DISTINCT u.id)
        INTO matched_count
        FROM users u
        WHERE u.name = ANY(item.names)
           OR EXISTS (
             SELECT 1
             FROM jsonb_each(coalesce(u.providers::jsonb, '{}'::jsonb)) p
             CROSS JOIN LATERAL jsonb_array_elements_text(coalesce(p.value -> 'aliases', '[]'::jsonb)) AS old_name(value)
             WHERE old_name.value = ANY(item.names)
           );
    ELSE
      SELECT count(DISTINCT t.id)
        INTO matched_count
        FROM teams t
        WHERE t.name = ANY(item.names)
           OR EXISTS (
             SELECT 1
             FROM jsonb_each(coalesce(t.providers::jsonb, '{}'::jsonb)) p
             CROSS JOIN LATERAL jsonb_array_elements_text(coalesce(p.value -> 'aliases', '[]'::jsonb)) AS old_name(value)
             WHERE old_name.value = ANY(item.names)
           );
    END IF;
    IF matched_count <> 1 THEN
      RAISE EXCEPTION 'Alias group %:% resolved to % rows', item.entity, item.group_key, matched_count;
    END IF;
  END LOOP;

  FOR item IN SELECT * FROM party_name_rewrites LOOP
    IF item.entity = 'user' THEN
      SELECT count(*) INTO matched_count FROM users WHERE name = item.source_name;
    ELSE
      SELECT count(*) INTO matched_count FROM teams WHERE name = item.source_name;
    END IF;
    IF matched_count > 0 THEN
      RAISE EXCEPTION 'Unapplied % name rewrite: %', item.entity, item.source_name;
    END IF;
  END LOOP;

  SELECT count(*) INTO duplicate_count
  FROM (
    SELECT 'user', p.key, p.value ->> 'providerId'
    FROM users u CROSS JOIN LATERAL jsonb_each(coalesce(u.providers::jsonb, '{}'::jsonb)) p
    WHERE nullif(p.value ->> 'providerId', '') IS NOT NULL
    GROUP BY p.key, p.value ->> 'providerId' HAVING count(*) > 1
    UNION ALL
    SELECT 'team', p.key, p.value ->> 'providerId'
    FROM teams t CROSS JOIN LATERAL jsonb_each(coalesce(t.providers::jsonb, '{}'::jsonb)) p
    WHERE nullif(p.value ->> 'providerId', '') IS NOT NULL
    GROUP BY p.key, p.value ->> 'providerId' HAVING count(*) > 1
  ) duplicates;
  IF duplicate_count > 0 THEN
    RAISE EXCEPTION 'Provider identity duplicates remain: %', duplicate_count;
  END IF;

  SELECT count(*) INTO dangling_count
  FROM resources r
  LEFT JOIN users u ON u.id = r.publisher_id
  LEFT JOIN teams t ON t.id = r.fansub_id
  WHERE u.id IS NULL OR (r.fansub_id IS NOT NULL AND t.id IS NULL);
  IF dangling_count > 0 THEN
    RAISE EXCEPTION 'Dangling resource party references remain: %', dangling_count;
  END IF;
END
$$;

COMMIT;
