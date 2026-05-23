-- Real RCI-36 assessment structure.
-- Domains: Personal Capital, Social Capital, Cultural Capital.
-- Reverse scored questions: 2, 5, 7, 12, 13, 15.

alter table public.rci_questions
add column if not exists reverse_scored boolean not null default false;

alter table public.rci_assessments
add column if not exists personal_capital_score numeric,
add column if not exists personal_capital_level text,
add column if not exists personal_capital_summary text,
add column if not exists social_capital_score numeric,
add column if not exists social_capital_level text,
add column if not exists social_capital_summary text,
add column if not exists cultural_capital_score numeric,
add column if not exists cultural_capital_level text,
add column if not exists cultural_capital_summary text,
add column if not exists overall_summary text;

update public.rci_questions
set is_active = false
where rci_version = 'DEMO-RCI';

insert into public.rci_questions
  (rci_version, question_number, domain, question_text, response_type, min_score, max_score, reverse_scored, is_active)
values
  ('RCI-36', 1, 'Personal Capital', 'Today, my overall health is good.', 'scale', 1, 5, false, true),
  ('RCI-36', 2, 'Personal Capital', 'Most of the time, I’m bothered by an illness, bodily disorder, pain, or fears about my health.', 'scale', 1, 5, true, true),
  ('RCI-36', 3, 'Personal Capital', 'I often wake up feeling fresh and rested.', 'scale', 1, 5, false, true),
  ('RCI-36', 4, 'Personal Capital', 'I am satisfied with my current emotions or feelings.', 'scale', 1, 5, false, true),
  ('RCI-36', 5, 'Personal Capital', 'My emotions often interfere with my work, personal life, or ability to accomplish tasks.', 'scale', 1, 5, true, true),
  ('RCI-36', 6, 'Personal Capital', 'I am satisfied with my mental or psychological health.', 'scale', 1, 5, false, true),
  ('RCI-36', 7, 'Personal Capital', 'Today, I feel depressed.', 'scale', 1, 5, true, true),
  ('RCI-36', 8, 'Personal Capital', 'I am satisfied with my nutritional intake.', 'scale', 1, 5, false, true),
  ('RCI-36', 9, 'Personal Capital', 'My food intake is nutritionally balanced.', 'scale', 1, 5, false, true),
  ('RCI-36', 10, 'Personal Capital', 'I am satisfied with my current employment status.', 'scale', 1, 5, false, true),
  ('RCI-36', 11, 'Personal Capital', 'I am satisfied with my current financial situation.', 'scale', 1, 5, false, true),
  ('RCI-36', 12, 'Personal Capital', 'I am worried about not having enough money to provide for myself and/or my family.', 'scale', 1, 5, true, true),
  ('RCI-36', 13, 'Personal Capital', 'I am stressed about my debts or financial obligations.', 'scale', 1, 5, true, true),
  ('RCI-36', 14, 'Personal Capital', 'My current housing or living situation is sufficient for myself and/or my family.', 'scale', 1, 5, false, true),
  ('RCI-36', 15, 'Personal Capital', 'I am stressed about my housing or living situation.', 'scale', 1, 5, true, true),

  ('RCI-36', 16, 'Social Capital', 'My family tries to help me when I need it.', 'scale', 1, 5, false, true),
  ('RCI-36', 17, 'Social Capital', 'I get the emotional help and support I need from my family.', 'scale', 1, 5, false, true),
  ('RCI-36', 18, 'Social Capital', 'I can talk about my problems with my family.', 'scale', 1, 5, false, true),
  ('RCI-36', 19, 'Social Capital', 'My family is willing to help me make decisions.', 'scale', 1, 5, false, true),
  ('RCI-36', 20, 'Social Capital', 'There is a special person with whom I can share my joys and sorrows when needed.', 'scale', 1, 5, false, true),
  ('RCI-36', 21, 'Social Capital', 'I have a special person who is a source of comfort to me.', 'scale', 1, 5, false, true),
  ('RCI-36', 22, 'Social Capital', 'I am satisfied with my friends and/or social network.', 'scale', 1, 5, false, true),
  ('RCI-36', 23, 'Social Capital', 'I can count on my friends and/or social network when things go wrong.', 'scale', 1, 5, false, true),
  ('RCI-36', 24, 'Social Capital', 'I have friends and/or a social network with whom I can share my joys and sorrows.', 'scale', 1, 5, false, true),
  ('RCI-36', 25, 'Social Capital', 'I have access to activities or support groups in my community.', 'scale', 1, 5, false, true),
  ('RCI-36', 26, 'Social Capital', 'My community promotes living a healthy lifestyle.', 'scale', 1, 5, false, true),
  ('RCI-36', 27, 'Social Capital', 'I am satisfied with my ability to access medical care when needed.', 'scale', 1, 5, false, true),

  ('RCI-36', 28, 'Cultural Capital', 'My wellness or recovery plan reflects my values.', 'scale', 1, 5, false, true),
  ('RCI-36', 29, 'Cultural Capital', 'My personal values have become clearer and stronger.', 'scale', 1, 5, false, true),
  ('RCI-36', 30, 'Cultural Capital', 'I am satisfied with my spiritual life.', 'scale', 1, 5, false, true),
  ('RCI-36', 31, 'Cultural Capital', 'My spirituality is connected to my daily activities.', 'scale', 1, 5, false, true),
  ('RCI-36', 32, 'Cultural Capital', 'I get strength from a profound life or spiritual experience.', 'scale', 1, 5, false, true),
  ('RCI-36', 33, 'Cultural Capital', 'My life has purpose.', 'scale', 1, 5, false, true),
  ('RCI-36', 34, 'Cultural Capital', 'I have reasonable goals and hopes for my future.', 'scale', 1, 5, false, true),
  ('RCI-36', 35, 'Cultural Capital', 'I feel like I have meaningful, positive participation in my family or community.', 'scale', 1, 5, false, true),
  ('RCI-36', 36, 'Cultural Capital', 'There are people within my community that look to me for support.', 'scale', 1, 5, false, true)
on conflict (rci_version, question_number) do update
set
  domain = excluded.domain,
  question_text = excluded.question_text,
  response_type = excluded.response_type,
  min_score = excluded.min_score,
  max_score = excluded.max_score,
  reverse_scored = excluded.reverse_scored,
  is_active = excluded.is_active;
