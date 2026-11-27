-- ============================================================================
-- SQL Rush — Beginner Mode, part 1: achievement metrics for learning badges
-- ============================================================================
--
-- New enum values can't be used in the transaction that adds them, so this file
-- only adds them; 20261127000001_beginner_mode.sql uses them.
--
--   learn_xp            learning XP (public.learners.xp)
--   lessons_completed   distinct Beginner Mode lessons completed
--   modules_completed   Beginner Mode modules with every lesson completed
--   learn_best_streak   longest run of consecutive learning days
--   lessons             complete `threshold` of the lessons in achievements.lesson_ids
--
-- Safe to re-run.
-- ============================================================================

alter type public.achievement_metric add value if not exists 'learn_xp';
alter type public.achievement_metric add value if not exists 'lessons_completed';
alter type public.achievement_metric add value if not exists 'modules_completed';
alter type public.achievement_metric add value if not exists 'learn_best_streak';
alter type public.achievement_metric add value if not exists 'lessons';

-- For the `lessons` metric: the lesson ids (public.learn_lessons.id) the badge is about.
alter table public.achievements add column if not exists lesson_ids text[];
