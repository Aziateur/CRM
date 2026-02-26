-- ============================================================================
-- MIGRATION: Replace emoji icons with Lucide icon names
-- This updates all categories to use Lucide icon names instead of emoji
-- so the frontend can render clean, consistent vector icons.
-- ============================================================================

-- ── Friction Types ──
UPDATE categories SET icon = 'shield-alert'   WHERE icon = '🧱' AND category_type = 'friction_type';
UPDATE categories SET icon = 'brain'          WHERE icon = '🔄' AND category_type = 'friction_type';
UPDATE categories SET icon = 'help-circle'    WHERE icon = '❓' AND category_type = 'friction_type';
UPDATE categories SET icon = 'clock'          WHERE icon = '⏰' AND category_type = 'friction_type';
UPDATE categories SET icon = 'monitor'        WHERE icon = '🖥️' AND category_type = 'friction_type';

-- ── Root Cause Types ──  
UPDATE categories SET icon = 'scroll-text'    WHERE icon = '📝' AND category_type = 'root_cause_type';
UPDATE categories SET icon = 'target'         WHERE icon = '🎯' AND category_type = 'root_cause_type';
UPDATE categories SET icon = 'book-open'      WHERE icon = '📚' AND category_type = 'root_cause_type';
UPDATE categories SET icon = 'graduation-cap' WHERE icon = '🎓' AND category_type = 'root_cause_type';
UPDATE categories SET icon = 'trending-up'    WHERE icon = '📈' AND category_type = 'root_cause_type';
UPDATE categories SET icon = 'alert-triangle' WHERE icon = '⚠️' AND category_type = 'root_cause_type';
UPDATE categories SET icon = 'settings'       WHERE icon = '⚙️' AND category_type = 'root_cause_type';
UPDATE categories SET icon = 'monitor'        WHERE icon = '🖥️' AND category_type = 'root_cause_type';

-- ── Segments ──
UPDATE categories SET icon = 'help-circle'    WHERE icon = '❓' AND category_type = 'segment';
UPDATE categories SET icon = 'megaphone'      WHERE icon = '📣' AND category_type = 'segment';
UPDATE categories SET icon = 'wrench'         WHERE icon = '🔧' AND category_type = 'segment';
UPDATE categories SET icon = 'shopping-cart'  WHERE icon = '🛒' AND category_type = 'segment';
UPDATE categories SET icon = 'globe'          WHERE icon = '🌐' AND category_type = 'segment';
UPDATE categories SET icon = 'circle-dot'     WHERE icon = '📋' AND category_type = 'segment';

-- ── Intel Categories ──
UPDATE categories SET icon = 'building'       WHERE icon = '🏭' AND category_type = 'intel_category';
UPDATE categories SET icon = 'building-2'     WHERE icon = '🏢' AND category_type = 'intel_category';
UPDATE categories SET icon = 'bar-chart'      WHERE icon = '📊' AND category_type = 'intel_category';
UPDATE categories SET icon = 'shield'         WHERE icon = '🛡️' AND category_type = 'intel_category';
UPDATE categories SET icon = 'dollar-sign'    WHERE icon = '💰' AND category_type = 'intel_category';
UPDATE categories SET icon = 'monitor'        WHERE icon = '💻' AND category_type = 'intel_category';
UPDATE categories SET icon = 'link'           WHERE icon = '🔗' AND category_type = 'intel_category';
UPDATE categories SET icon = 'flame'          WHERE icon = '🔥' AND category_type = 'intel_category';

-- ── Script Stages ──
UPDATE categories SET icon = 'phone'          WHERE icon = '📞' AND category_type = 'script_stage';
UPDATE categories SET icon = 'refresh-cw'     WHERE icon = '🔄' AND category_type = 'script_stage';
UPDATE categories SET icon = 'rotate-ccw'     WHERE icon = '🔁' AND category_type = 'script_stage';
UPDATE categories SET icon = 'target'         WHERE icon = '🎯' AND category_type = 'script_stage';
UPDATE categories SET icon = 'mail'           WHERE icon = '📨' AND category_type = 'script_stage';

-- ── Script Section Types ──
UPDATE categories SET icon = 'handshake'      WHERE icon = '🤝' AND category_type = 'script_section_type';
UPDATE categories SET icon = 'circle-dot'     WHERE icon = '📋' AND category_type = 'script_section_type';
UPDATE categories SET icon = 'search'         WHERE icon = '🔍' AND category_type = 'script_section_type';
UPDATE categories SET icon = 'lightbulb'      WHERE icon = '💡' AND category_type = 'script_section_type';
UPDATE categories SET icon = 'alert-triangle' WHERE icon = '⚠️' AND category_type = 'script_section_type';
UPDATE categories SET icon = 'target'         WHERE icon = '🎯' AND category_type = 'script_section_type';
UPDATE categories SET icon = 'phone'          WHERE icon = '📞' AND category_type = 'script_section_type';
UPDATE categories SET icon = 'file-text'      WHERE icon = '📄' AND category_type = 'script_section_type';

-- ── Segment Section Types ──
UPDATE categories SET icon = 'message-square' WHERE icon = '💬' AND category_type = 'segment_section_type';
UPDATE categories SET icon = 'brain'          WHERE icon = '🧠' AND category_type = 'segment_section_type';
UPDATE categories SET icon = 'file-text'      WHERE icon = '📰' AND category_type = 'segment_section_type';

-- ── Catch-all: any remaining common emoji ──
UPDATE categories SET icon = 'file-text'      WHERE icon = '📄' AND icon NOT LIKE '%-%'; -- 📄 → file-text
UPDATE categories SET icon = 'circle-dot'     WHERE icon = '📋' AND icon NOT LIKE '%-%'; -- 📋 → circle-dot
UPDATE categories SET icon = 'pen-tool'       WHERE icon = '📝' AND icon NOT LIKE '%-%'; -- 📝 → pen-tool

-- ── Default icon column ──
ALTER TABLE categories ALTER COLUMN icon SET DEFAULT 'circle-dot';
