-- JACOB'S — starting data: one active barber (Jacob) and the current menu.
-- Contact details are placeholders; change them in the admin settings.

insert into public.business_settings (id, name, descriptor, address, city, phone, whatsapp, instagram,
  booking_policy, cancellation_policy)
values (true, 'JACOB''S', 'מספרה', 'דיזנגוף 120', 'תל אביב', '03-000-0000', '97230000000', 'jacobs.barbershop',
  'התשלום במספרה.', 'אפשר לבטל או לשנות תור עד 3 שעות לפני מועדו.')
on conflict (id) do nothing;

insert into public.barbers (id, name, bio, sort_order)
values ('11111111-1111-4111-8111-111111111111', 'יעקב', 'מייסד · ספר ראשי', 0)
on conflict (id) do nothing;

insert into public.services (id, name, description, duration_minutes, price, sort_order) values
  ('22222222-0000-4000-8000-000000000001', 'תספורת הבית', 'ייעוץ, תספורת במספריים ובמכונה, חפיפה ועיצוב', 45, 90, 1),
  ('22222222-0000-4000-8000-000000000002', 'סקין פייד', 'מעבר חלק עד העור, עם גימור ידני', 45, 100, 2),
  ('22222222-0000-4000-8000-000000000003', 'תספורת וזקן', 'תספורת הבית יחד עם עיצוב זקן מלא', 70, 140, 3),
  ('22222222-0000-4000-8000-000000000004', 'עיצוב זקן', 'עיצוב, קווים וגימור במגבת חמה', 25, 60, 4),
  ('22222222-0000-4000-8000-000000000005', 'גילוח במגבת חמה', 'גילוח בתער עם מגבות חמות ובאלם', 30, 80, 5),
  ('22222222-0000-4000-8000-000000000006', 'תספורת ילדים', 'עד גיל 12', 30, 60, 6)
on conflict (id) do nothing;

insert into public.barber_services (barber_id, service_id)
select '11111111-1111-4111-8111-111111111111', id from public.services
on conflict do nothing;

insert into public.working_hours (barber_id, weekday, start_time, end_time) values
  ('11111111-1111-4111-8111-111111111111', 0, '09:00', '20:00'),
  ('11111111-1111-4111-8111-111111111111', 1, '09:00', '20:00'),
  ('11111111-1111-4111-8111-111111111111', 2, '09:00', '20:00'),
  ('11111111-1111-4111-8111-111111111111', 3, '09:00', '20:00'),
  ('11111111-1111-4111-8111-111111111111', 4, '09:00', '21:00'),
  ('11111111-1111-4111-8111-111111111111', 5, '08:00', '15:00')
on conflict do nothing;

insert into public.breaks (barber_id, weekday, start_time, end_time)
select '11111111-1111-4111-8111-111111111111', d, '13:00', '13:30' from generate_series(0, 4) d;
