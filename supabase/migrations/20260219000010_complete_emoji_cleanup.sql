-- ============================================================================
-- MIGRATION: Complete emoji cleanup — catch any remaining emoji in categories
-- Covers ALL emoji that may exist from seeded or user-created data.
-- ============================================================================

-- ── Segments — additional emoji ──
UPDATE categories SET icon = 'truck'         WHERE icon = '🚛';
UPDATE categories SET icon = 'home'          WHERE icon = '🏠';
UPDATE categories SET icon = 'hard-hat'      WHERE icon = '🏗️';
UPDATE categories SET icon = 'clipboard-list' WHERE icon = '📋';
UPDATE categories SET icon = 'help-circle'   WHERE icon = '❓';

-- ── Root Cause Types — additional ──
UPDATE categories SET icon = 'scroll-text'   WHERE icon = '📝';
UPDATE categories SET icon = 'target'        WHERE icon = '🎯';
UPDATE categories SET icon = 'book-open'     WHERE icon = '📚';
UPDATE categories SET icon = 'graduation-cap' WHERE icon = '🎓';
UPDATE categories SET icon = 'trending-up'   WHERE icon = '📈';
UPDATE categories SET icon = 'alert-triangle' WHERE icon = '⚠️';
UPDATE categories SET icon = 'settings'      WHERE icon = '⚙️';

-- ── Intel Categories — comprehensive ──
UPDATE categories SET icon = 'factory'       WHERE icon = '🏭';
UPDATE categories SET icon = 'building'      WHERE icon = '🏢';
UPDATE categories SET icon = 'bar-chart'     WHERE icon = '📊';
UPDATE categories SET icon = 'shield'        WHERE icon = '🛡️';
UPDATE categories SET icon = 'dollar-sign'   WHERE icon = '💰';
UPDATE categories SET icon = 'file-text'     WHERE icon = '📜';
UPDATE categories SET icon = 'monitor'       WHERE icon = '💻';
UPDATE categories SET icon = 'link'          WHERE icon = '🔗';

-- ── Script Stages — comprehensive ──
UPDATE categories SET icon = 'mic'           WHERE icon = '🎤';
UPDATE categories SET icon = 'search'        WHERE icon = '🔍';
UPDATE categories SET icon = 'gem'           WHERE icon = '💎';
UPDATE categories SET icon = 'target'        WHERE icon = '🎯' AND icon != 'target';

-- ── Script Section Types — comprehensive ──
UPDATE categories SET icon = 'handshake'     WHERE icon = '🤝';
UPDATE categories SET icon = 'phone'         WHERE icon = '📞';
UPDATE categories SET icon = 'file-text'     WHERE icon = '📄';

-- ── Segment Section Types ──
UPDATE categories SET icon = 'message-circle' WHERE icon = '💬';
UPDATE categories SET icon = 'brain'          WHERE icon = '🧠';
UPDATE categories SET icon = 'newspaper'      WHERE icon = '📰';

-- ── Friction Types — updated mapping ──
UPDATE categories SET icon = 'shield-alert'  WHERE icon = '🧱';
UPDATE categories SET icon = 'crosshair'     WHERE icon = '🔄' AND category_type = 'friction_type';
UPDATE categories SET icon = 'clock'         WHERE icon = '⏰';

-- ── Catch-all remaining common emoji ──
UPDATE categories SET icon = 'zap'           WHERE icon = '⚡';
UPDATE categories SET icon = 'flame'         WHERE icon = '🔥';
UPDATE categories SET icon = 'rocket'        WHERE icon = '🚀';
UPDATE categories SET icon = 'sparkles'      WHERE icon = '✨';
UPDATE categories SET icon = 'star'          WHERE icon = '⭐';
UPDATE categories SET icon = 'heart'         WHERE icon = '❤️';
UPDATE categories SET icon = 'bell'          WHERE icon = '🔔';
UPDATE categories SET icon = 'check-circle'  WHERE icon = '✅';
UPDATE categories SET icon = 'x-circle'      WHERE icon = '❌';

-- ── Also update kb_categories if they have emoji ──
UPDATE kb_categories SET icon = 'file-text'      WHERE icon = '📄';
UPDATE kb_categories SET icon = 'clipboard-list'  WHERE icon = '📋';
UPDATE kb_categories SET icon = 'scroll-text'    WHERE icon = '📝';
UPDATE kb_categories SET icon = 'bar-chart'      WHERE icon = '📊';
UPDATE kb_categories SET icon = 'zap'            WHERE icon = '⚡';
UPDATE kb_categories SET icon = 'lightbulb'      WHERE icon = '💡';

-- ── Update metric_definitions if they have emoji ──
UPDATE metric_definitions SET icon = 'bar-chart'   WHERE icon = '📊';
UPDATE metric_definitions SET icon = 'trending-up'  WHERE icon = '📈';
UPDATE metric_definitions SET icon = 'target'       WHERE icon = '🎯';
UPDATE metric_definitions SET icon = 'zap'          WHERE icon = '⚡';
