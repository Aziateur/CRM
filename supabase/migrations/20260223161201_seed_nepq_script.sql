-- ============================================================
-- Seed: NEPQ Education Business Lead Optimization Script
-- ============================================================

-- 1. Insert the main script
INSERT INTO sales_scripts (id, title, methodology, description, target_audience, offer_summary, primary_goal, secondary_goal)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Education Business Lead Optimization',
  'NEPQ',
  'NEPQ Sales Script for Education Business Lead Optimization. $150/Month Offer with Case Study Frame.',
  'Cold outreach to education businesses (tutoring centers, language schools, academies, coding bootcamps, etc.)',
  '$150/Month — Full audit, lead capture optimization, 60-second follow-up automation, monthly optimization. No long-term contract.',
  'Book a Walkthrough Call',
  'Close on $150/mo (if conversation goes deep enough)'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. Insert Stages
-- ============================================================

-- STAGE 1: THE CONNECTION STAGE
INSERT INTO sales_script_stages (id, script_id, stage_number, title, purpose, sort_order)
VALUES (
  'aaaaaaaa-0001-0001-0001-000000000001',
  '11111111-1111-1111-1111-111111111111',
  1,
  'THE CONNECTION STAGE',
  'Disarm the prospect. Move them from defensive/skeptical thinking into curiosity. You are NOT selling here — you are getting permission to have a conversation.',
  1
) ON CONFLICT (id) DO NOTHING;

-- STAGE 2: THE ENGAGEMENT STAGE
INSERT INTO sales_script_stages (id, script_id, stage_number, title, purpose, sort_order)
VALUES (
  'aaaaaaaa-0002-0002-0002-000000000002',
  '11111111-1111-1111-1111-111111111111',
  2,
  'THE ENGAGEMENT STAGE',
  'This is where 85% of the sale is made. You''re helping the prospect discover their own problems through questions — not telling them what''s wrong. By the end of this stage, they should feel the gap between where they are and where they want to be.',
  2
) ON CONFLICT (id) DO NOTHING;

-- STAGE 3: THE TRANSITION STAGE
INSERT INTO sales_script_stages (id, script_id, stage_number, title, purpose, sort_order)
VALUES (
  'aaaaaaaa-0003-0003-0003-000000000003',
  '11111111-1111-1111-1111-111111111111',
  3,
  'THE TRANSITION STAGE',
  'Bridge from the diagnosis into your solution. You''re not pitching — you''re connecting what they told you to what you can do.',
  3
) ON CONFLICT (id) DO NOTHING;

-- STAGE 4: THE PRESENTATION STAGE
INSERT INTO sales_script_stages (id, script_id, stage_number, title, purpose, sort_order)
VALUES (
  'aaaaaaaa-0004-0004-0004-000000000004',
  '11111111-1111-1111-1111-111111111111',
  4,
  'THE PRESENTATION STAGE',
  'Show how your solution specifically solves each problem they told you about. Use the 3-step formula: Problem → How We Solve It → What That Means for You.',
  4
) ON CONFLICT (id) DO NOTHING;

-- STAGE 5: THE COMMITMENT STAGE
INSERT INTO sales_script_stages (id, script_id, stage_number, title, purpose, sort_order)
VALUES (
  'aaaaaaaa-0005-0005-0005-000000000005',
  '11111111-1111-1111-1111-111111111111',
  5,
  'THE COMMITMENT STAGE',
  'Help them commit to the next step. Primary goal is booking the walkthrough call (if this is the initial outreach call) or closing on $150/mo (if the conversation went deep enough).',
  5
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. Insert Sections
-- ============================================================

-- ─── STAGE 1 SECTIONS ───

INSERT INTO sales_script_sections (stage_id, section_code, title, content, coaching_notes, sort_order) VALUES
('aaaaaaaa-0001-0001-0001-000000000001', '1A', 'Problem Statement (Cold Call Opening)',
'Is [Name] there? Hey [Name], this is just [Your Name] — I was wondering if you could help me out for a moment?

[Pause. Let them answer.]

Well, I''m not quite sure you could yet. I called because I''m putting together a case study on how education businesses like yours convert website visitors into enrolled students. I actually already rebuilt a version of your homepage to show what a high-converting layout could look like — would you be open to me walking you through what I found? It takes about 10 minutes.',
'The word "just" and "help me out" lowers their guard. You sound like a human, not a pitch machine. The "I''m not quite sure you could yet" is a pattern interrupt — it breaks the expected sales call flow and creates curiosity. "Case study" kills the "what''s the catch" objection because it explains why it''s free.',
1);

INSERT INTO sales_script_sections (stage_id, section_code, title, content, coaching_notes, sort_order) VALUES
('aaaaaaaa-0001-0001-0001-000000000001', '1A-fallback', 'If They Seem Guarded',
'Oh, I apologize if that came out of nowhere — what I do is... you know how a lot of education businesses — tutoring centers, language schools, academies — sometimes get frustrated because they''re spending money on ads or putting time into their website, but they don''t really know how many potential students are visiting their site and then just... leaving without ever reaching out?

Well, what I do is I help education businesses like that figure out exactly where prospective students are falling off between finding them online and actually enrolling — and then fix those gaps so more of those visitors turn into real inquiries.

Does that resonate with you at all, or is that something you might be experiencing?',
'This is the Personalized Intro. Problem → Solution → Question. Three frustrations they can identify with, then what you do framed as solving those specific frustrations, then a question that puts the ball back in their court.',
2);

INSERT INTO sales_script_sections (stage_id, section_code, title, content, coaching_notes, sort_order) VALUES
('aaaaaaaa-0001-0001-0001-000000000001', '1B', 'DM / Email First Outreach',
'Hey [Name] — I''m building case studies on how education businesses convert visitors into enrolled students. I already rebuilt your homepage to show what a high-converting version looks like — want me to walk you through it and show you where you might be leaving students on the table?',
'Use this as your initial outreach message. The goal is a reply, not a sale. If they reply with interest, your next message books the call. Then the call itself follows Stage 2 onward from this script.',
3);

-- ─── STAGE 2 SECTIONS ───

INSERT INTO sales_script_sections (stage_id, section_code, title, content, coaching_notes, sort_order) VALUES
('aaaaaaaa-0002-0002-0002-000000000002', '2A', 'Situation Questions',
'So just so I have some context before I walk you through what I found — how are most of your new students finding you right now? Is it mostly word of mouth, your website, social media, ads, or a mix?

[Let them answer fully. Don''t interrupt.]

And when someone does reach out — whether they fill out a form, send a DM, call your front desk — what does that process look like? What happens next?

Roughly how quickly does someone hear back after they first inquire?

Do you have any kind of system in place for that, or is it more manual — like whoever''s available gets to it when they can?

And how long have you been running things this way?',
'Understand their current reality before diagnosing anything. You''re mapping their current lead flow. Most will reveal a messy, slow, manual process here. Don''t react yet — just listen and take notes.',
1);

INSERT INTO sales_script_sections (stage_id, section_code, title, content, coaching_notes, sort_order) VALUES
('aaaaaaaa-0002-0002-0002-000000000002', '2B', 'Problem Awareness Questions',
'So when it comes to that process of someone finding you and then actually enrolling — how do you feel about how that''s working for you right now?

IF THEY SAY IT''S FINE / GOOD:
That''s great to hear. So it sounds like things are going fairly well. Is there anything you''d change about how new students come in, if you could?

IF THEY SAY IT''S NOT GREAT / COULD BE BETTER:
What specifically about it is frustrating you the most?

When you say [repeat what they said] — what do you mean by that?

How long has that been going on?

Has that had an impact on your enrollment numbers? In what way?

Do you have a sense of how many people might be inquiring or visiting your site but never actually following through?

What do you think is causing that?',
'Now open the emotional door. You''re helping them feel the cost of their current situation. The "Two Truth" technique: Nobody likes 100% of what they have. This question gives them permission to admit what''s not working without feeling like they''re being sold to. Let them diagnose themselves. Whatever they say, probe deeper with "What do you mean by that?" and "Why do you think that is?" They need to FEEL the problem, not just acknowledge it logically.',
2);

INSERT INTO sales_script_sections (stage_id, section_code, title, content, coaching_notes, sort_order) VALUES
('aaaaaaaa-0002-0002-0002-000000000002', '2C', 'Solution Awareness Questions',
'Before we started talking today, had you been looking into any ways to tighten up that process — maybe getting leads responded to faster, or making sure fewer people slip through the cracks?

If you could wave a magic wand and every person who inquired about your programs got a response within 60 seconds — and then got followed up with automatically until they either enrolled or said no — what would that do for your business?

What would it do for you personally, though? Like in terms of the stress of wondering if your team is following up, or whether leads are falling through the cracks?

How would it feel to know that every single lead is being contacted immediately, without you having to manage it?',
'Help them picture what it would look like if this were solved. The first question gets the logical answer (more students, more revenue). The personal question gets how it would FEEL. That''s what drives decisions.',
3);

INSERT INTO sales_script_sections (stage_id, section_code, title, content, coaching_notes, sort_order) VALUES
('aaaaaaaa-0002-0002-0002-000000000002', '2D', 'Consequence Questions',
'So what happens if nothing changes? If leads keep coming in the way they are now and the follow-up stays the same for the next 6 months — what does that look like for you?

Have you thought about how many potential students you might be losing every month just because the response time is too slow or because there''s no system catching the ones who don''t hear back?

What would it mean financially if even 3 or 4 of those people enrolled each month instead of disappearing?',
'Help them feel the weight of doing nothing. Let the math do the talking. If their average student is worth $200+/month and they''re losing 3-4 per month, that''s $600-800/month in lost revenue. Your offer is $150. The gap becomes obvious.',
4);

INSERT INTO sales_script_sections (stage_id, section_code, title, content, coaching_notes, sort_order) VALUES
('aaaaaaaa-0002-0002-0002-000000000002', '2E', 'Qualifying Questions',
'So based on everything you''ve told me — how important is it for you to fix this and actually start capturing more of the students who are already finding you?

On a scale of 1 to 10, how much of a priority is this for you right now?

Why is that important to you right now, though?',
'Confirm this matters enough for them to act. If they say 7+, you have a buyer. If they say below 5, probe: "What would need to happen for this to become more of a priority?" The last question deepens their emotional commitment. Whatever they say here, you''ll use it back in the transition.',
5);

-- ─── STAGE 3 SECTIONS ───

INSERT INTO sales_script_sections (stage_id, section_code, title, content, coaching_notes, sort_order) VALUES
('aaaaaaaa-0003-0003-0003-000000000003', '3', 'Transition Script',
'So based on everything you''ve told me — it sounds like you''re getting leads in from [repeat their channels], but the follow-up process is [repeat what they described — slow, manual, inconsistent, whatever it was], and because of that you''re pretty sure students are slipping through the cracks.

And you mentioned that''s been making you feel [repeat their emotional language — frustrated, stressed, worried, like you''re leaving money on the table].

I think what we''ve put together could actually help with that. With your permission, can I walk you through what I already built for you and show you how we could solve this?',
'Always ask permission before presenting. It keeps them in control and lowers resistance. The phrase "with your permission" is a soft commitment — they''re now mentally agreeing to hear your solution.',
1);

-- ─── STAGE 4 SECTIONS ───

INSERT INTO sales_script_sections (stage_id, section_code, title, content, coaching_notes, sort_order) VALUES
('aaaaaaaa-0004-0004-0004-000000000004', '4-P1', 'Problem #1: Website Not Converting',
'So one of the biggest challenges education businesses have is that people are landing on their website but there''s nothing pulling them toward taking action — no clear call to action, no reason to inquire right now. The site looks fine, but it''s not built to convert visitors into leads.

So what we do is we audit your current site and rebuild the key pages to follow a proven high-conversion layout — the mockup I built for you is an example of that. It''s designed to make it dead simple for a parent or student to take the next step.

And what that means for you is instead of people visiting your site and leaving, more of them are actually filling out a form, calling, or sending a message — without you spending more on ads.

Does that make sense?',
'Use the 3-step formula: Problem → How We Solve It → What That Means for You.',
1);

INSERT INTO sales_script_sections (stage_id, section_code, title, content, coaching_notes, sort_order) VALUES
('aaaaaaaa-0004-0004-0004-000000000004', '4-P2', 'Problem #2: Slow or Inconsistent Follow-Up',
'The second issue you mentioned is that when leads do come in, the response time is [whatever they said — a few hours, next day, inconsistent]. Studies show that if a lead doesn''t hear back within 5 minutes, the chance of them enrolling drops by over 80%.

So what we do is set up automation so that every single lead — whether they come from your website, Instagram, an ad, or a referral — gets contacted within 60 seconds. Automatically. No one on your team has to remember or be available.

And what that means for you is you stop losing students to competitors simply because they responded faster. You''re the first one to reach that person, every single time.

How do you see that helping you?',
'Tie the stat (80% drop after 5 min) to their specific situation.',
2);

INSERT INTO sales_script_sections (stage_id, section_code, title, content, coaching_notes, sort_order) VALUES
('aaaaaaaa-0004-0004-0004-000000000004', '4-P3', 'Problem #3: No System / Leads Fall Through',
'And the third thing you mentioned is that there''s no real system tracking all of this — so leads come in and some get followed up with, some don''t, and there''s no way to know who fell through the cracks.

So what we do is build a lead capture and follow-up system around whatever you''re already using — your website, your socials, your ads — so every lead is tracked, every one gets a response, and we optimize it monthly based on what''s actually working.

And what that means for you is you finally have visibility into what''s happening with your leads. You''ll know exactly how many came in, who responded, who enrolled, and where the dropoff is. No more guessing.

What are your thoughts on that?',
'Close the loop on all three problems before asking the final qualifying question.',
3);

INSERT INTO sales_script_sections (stage_id, section_code, title, content, coaching_notes, sort_order) VALUES
('aaaaaaaa-0004-0004-0004-000000000004', '4-close', 'End-of-Presentation Qualifying Question',
'So based on everything we''ve gone over — the site optimization, the 60-second response automation, and the monthly optimization — do you see how this could help you enroll more of the students who are already finding you?',
'Get a verbal yes before moving to commitment.',
4);

-- ─── STAGE 5 SECTIONS ───

INSERT INTO sales_script_sections (stage_id, section_code, title, content, coaching_notes, sort_order) VALUES
('aaaaaaaa-0005-0005-0005-000000000005', '5A', 'Book the Walkthrough Call',
'So here''s what I''d suggest. I''ve already got the mockup of your homepage ready. Why don''t we book 20 minutes so I can screen-share and walk you through exactly what I found and what the rebuilt version looks like? That way you can see it for yourself and decide if it makes sense to go further. No pressure either way — worst case, you walk away with some free insights on your site.

Do you have your calendar handy? I can pull up mine and we can lock in a specific time so neither of us has to chase the other down.',
'NEPQ calendar commitment. "Neither of us has to chase the other down" frames you as busy and positions you as an equal, not someone desperate for the meeting.',
1);

INSERT INTO sales_script_sections (stage_id, section_code, title, content, coaching_notes, sort_order) VALUES
('aaaaaaaa-0005-0005-0005-000000000005', '5B', 'Close on $150/mo (If Ready)',
'So based on everything you''ve told me, it sounds like this is something you want to get handled sooner rather than later. The way we work is pretty straightforward — it''s $150 a month. That covers the full audit, the lead capture optimization, the 60-second follow-up automation, and we optimize everything monthly as we learn what''s working for your specific business. There''s no long-term contract — if it''s not working, you can cancel anytime.

How does that sound to you?',
'Present the price casually and immediately tie it back to everything they told you they wanted. The "no long-term contract" removes risk.',
2);


-- ============================================================
-- 4. Insert Objection Handlers
-- ============================================================

INSERT INTO sales_script_objections (script_id, objection, response, coaching_notes, sort_order) VALUES
('11111111-1111-1111-1111-111111111111',
'"I need to think about it."',
'That''s not a problem at all. And I wouldn''t expect you to make a snap decision on something like this. Just so I understand though — when you say you need to think about it, is it the investment itself, or is it more about whether this is the right time?

[After they answer] That makes sense. What would need to happen for you to feel comfortable moving forward?

What''s your timeframe on getting back to me in the next few days, just so I can see if I''d be available for you?',
'Clarify what''s actually behind the objection. Status frame — you''re busy with other clients. Narrows the decision timeline.',
1);

INSERT INTO sales_script_objections (script_id, objection, response, coaching_notes, sort_order) VALUES
('11111111-1111-1111-1111-111111111111',
'"What''s the catch? Why is the mockup free?"',
'Great question — I''d be skeptical too. The reason is I''m building case studies right now on education businesses, so I''m doing the initial work upfront because I want real examples I can show future clients. The mockup is genuine — there''s nothing to sign, no obligation. If you like what you see on the walkthrough and want help implementing it, we can talk about that. If not, you keep the insights for free. Fair enough?',
'Transparency kills skepticism. The case study frame makes the free work logical.',
2);

INSERT INTO sales_script_objections (script_id, objection, response, coaching_notes, sort_order) VALUES
('11111111-1111-1111-1111-111111111111',
'"We already have someone handling our marketing."',
'Oh that''s great, I''m glad you have someone. Just out of curiosity though — the stuff I''m talking about is really specific to what happens AFTER someone finds you. Like, once a lead comes in — how fast they hear back, whether they get followed up with if they don''t respond, that kind of thing. Is that something your current marketing person is handling, or is that more on your team internally?',
'This separates you from their marketing person. You''re not competing with their marketer — you''re fixing the gap between their marketing and their enrollment.',
3);

INSERT INTO sales_script_objections (script_id, objection, response, coaching_notes, sort_order) VALUES
('11111111-1111-1111-1111-111111111111',
'"$150/month is a lot for us right now."',
'I totally understand that. And honestly, I wouldn''t want you to invest in something that doesn''t make financial sense. Can I ask you something though — you mentioned earlier that you think you''re losing about [X] potential students a month because of the follow-up gaps. If even 2 or 3 of those students enrolled, what would that be worth to your business each month?',
'Let them do the math out loud. If a student is worth $200-500/month and they''re losing 3+, the $150 becomes a no-brainer ROI.',
4);

INSERT INTO sales_script_objections (script_id, objection, response, coaching_notes, sort_order) VALUES
('11111111-1111-1111-1111-111111111111',
'"I''m not sure this applies to us — we''re mostly referral-based."',
'That actually makes this even more interesting, because referral-based businesses usually don''t have any system catching those referrals when they come in. So when someone hears about you and checks out your website or sends a message — what happens? How fast do they hear back? Because if someone was referred to you and they don''t get a response quickly, they might still go check out the competitor down the street. Does that make sense?',
'Reframe referral-based as even MORE in need of fast follow-up.',
5);

INSERT INTO sales_script_objections (script_id, objection, response, coaching_notes, sort_order) VALUES
('11111111-1111-1111-1111-111111111111',
'"Just send me some information."',
'I could definitely do that. The only thing is, what I''ve put together is really specific to YOUR business — it''s not like a generic brochure. It''s an actual rebuilt version of your homepage. It would make a lot more sense if I could walk you through it for 10 minutes so you can see what I''m talking about in context. Would you be open to that, or would another time this week work better?',
'Redirect back to the walkthrough. "Another time this week" gives them an alternative to yes/no.',
6);


-- ============================================================
-- 5. Insert Key Phrases
-- ============================================================

-- Disarming Language
INSERT INTO sales_script_phrases (script_id, category, phrase, sort_order) VALUES
('11111111-1111-1111-1111-111111111111', 'Disarming Language', 'I was wondering if you could help me out for a moment', 1),
('11111111-1111-1111-1111-111111111111', 'Disarming Language', 'I''m not quite sure you could yet', 2),
('11111111-1111-1111-1111-111111111111', 'Disarming Language', 'With your permission', 3),
('11111111-1111-1111-1111-111111111111', 'Disarming Language', 'That''s not a problem at all', 4),
('11111111-1111-1111-1111-111111111111', 'Disarming Language', 'I wouldn''t expect you to make a snap decision', 5);

-- Status Frames
INSERT INTO sales_script_phrases (script_id, category, phrase, sort_order) VALUES
('11111111-1111-1111-1111-111111111111', 'Status Frames', 'So neither of us has to chase the other down', 1),
('11111111-1111-1111-1111-111111111111', 'Status Frames', 'Just so I can see if I''d be available for you', 2),
('11111111-1111-1111-1111-111111111111', 'Status Frames', 'I''m building case studies right now', 3);

-- Checking for Agreement
INSERT INTO sales_script_phrases (script_id, category, phrase, sort_order) VALUES
('11111111-1111-1111-1111-111111111111', 'Checking for Agreement', 'Does that make sense?', 1),
('11111111-1111-1111-1111-111111111111', 'Checking for Agreement', 'Are we on the same page?', 2),
('11111111-1111-1111-1111-111111111111', 'Checking for Agreement', 'How do you see this helping you?', 3),
('11111111-1111-1111-1111-111111111111', 'Checking for Agreement', 'What are your thoughts on that?', 4),
('11111111-1111-1111-1111-111111111111', 'Checking for Agreement', 'Does that resonate with you at all?', 5);

-- Emotional Deepeners
INSERT INTO sales_script_phrases (script_id, category, phrase, sort_order) VALUES
('11111111-1111-1111-1111-111111111111', 'Emotional Deepeners', 'What would it do for you personally, though?', 1),
('11111111-1111-1111-1111-111111111111', 'Emotional Deepeners', 'How would that make you feel?', 2),
('11111111-1111-1111-1111-111111111111', 'Emotional Deepeners', 'Why is that important to you right now, though?', 3);

-- Clarifying
INSERT INTO sales_script_phrases (script_id, category, phrase, sort_order) VALUES
('11111111-1111-1111-1111-111111111111', 'Clarifying', 'When you say [X], what do you mean by that?', 1),
('11111111-1111-1111-1111-111111111111', 'Clarifying', 'Can you tell me more about that?', 2),
('11111111-1111-1111-1111-111111111111', 'Clarifying', 'What''s behind that?', 3);
