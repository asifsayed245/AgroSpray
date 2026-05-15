-- AgroSpray V1 seed data
-- Runs after migrations on `supabase db reset`.

------------------------------------------------------------
-- Crops master list (25+ common Indian crops, PRD §6.5.1)
------------------------------------------------------------
insert into crops (id, name_en, name_hi, name_mr, default_volume_per_acre_l, aliases) values
  ('cotton',     'Cotton',     'कपास',       'कापूस',       12, '{cotton,kapas,kapus}'),
  ('wheat',      'Wheat',      'गेहूं',       'गहू',         10, '{wheat,gehun,gahu}'),
  ('soybean',    'Soybean',    'सोयाबीन',     'सोयाबीन',     10, '{soybean,soya}'),
  ('sugarcane',  'Sugarcane',  'गन्ना',      'ऊस',          15, '{sugarcane,ganna,us}'),
  ('paddy',      'Paddy',      'धान',        'भात',         10, '{paddy,rice,dhan,bhat}'),
  ('maize',      'Maize',      'मक्का',      'मका',         10, '{maize,corn,makka,maka}'),
  ('groundnut',  'Groundnut',  'मूंगफली',     'भुईमूग',      10, '{groundnut,peanut,moongphali}'),
  ('mustard',    'Mustard',    'सरसों',      'मोहरी',       8,  '{mustard,sarson,mohori}'),
  ('chickpea',   'Chickpea',   'चना',        'हरभरा',       8,  '{chickpea,chana,harbhara}'),
  ('lentil',     'Lentil',     'मसूर',       'मसूर',        8,  '{lentil,masoor}'),
  ('pigeonpea',  'Pigeon pea', 'अरहर',       'तूर',         8,  '{pigeonpea,arhar,tur}'),
  ('mungbean',   'Mung bean',  'मूंग',        'मूग',         8,  '{mungbean,moong,mug}'),
  ('jowar',      'Sorghum',    'ज्वार',      'ज्वारी',      10, '{jowar,sorghum}'),
  ('bajra',      'Pearl millet','बाजरा',      'बाजरी',       10, '{bajra,pearl millet}'),
  ('barley',     'Barley',     'जौ',         'सातू',        10, '{barley,jau,satu}'),
  ('tomato',     'Tomato',     'टमाटर',      'टोमॅटो',     12, '{tomato,tamatar,tomato}'),
  ('onion',      'Onion',      'प्याज',       'कांदा',       12, '{onion,pyaaz,kanda}'),
  ('potato',     'Potato',     'आलू',        'बटाटा',       12, '{potato,aloo,batata}'),
  ('chilli',     'Chilli',     'मिर्च',       'मिरची',      12, '{chilli,mirch,mirchi}'),
  ('brinjal',    'Brinjal',    'बैंगन',       'वांगे',       12, '{brinjal,eggplant,baingan,vange}'),
  ('okra',       'Okra',       'भिंडी',       'भेंडी',       12, '{okra,bhindi,bhendi}'),
  ('cabbage',    'Cabbage',    'पत्ता गोभी',   'कोबी',        12, '{cabbage,patta gobhi,kobi}'),
  ('cauliflower','Cauliflower','फूल गोभी',     'फ्लॉवर',      12, '{cauliflower,phool gobhi,flower}'),
  ('cucumber',   'Cucumber',   'खीरा',       'काकडी',       12, '{cucumber,kheera,kakdi}'),
  ('grape',      'Grapes',     'अंगूर',       'द्राक्षे',     14, '{grape,grapes,angoor,draksha}'),
  ('banana',     'Banana',     'केला',       'केळी',        14, '{banana,kela,keli}'),
  ('mango',      'Mango',      'आम',         'आंबा',        14, '{mango,aam,amba}'),
  ('turmeric',   'Turmeric',   'हल्दी',      'हळद',         12, '{turmeric,haldi,halad}')
on conflict (id) do nothing;

------------------------------------------------------------
-- CIB pesticide registry — representative sample (drone-approved subset)
------------------------------------------------------------
insert into pesticides_cib (name, brand, active_ingredient, approved_crops, drone_approved, phi_days_by_crop, notes) values
  ('Chlorantraniliprole 18.5 SC', 'Coragen', 'Chlorantraniliprole',
    '{cotton,paddy,maize,soybean,chickpea,pigeonpea,tomato,chilli,brinjal,okra}',
    true,
    '{"cotton":21,"paddy":15,"maize":15,"soybean":21,"chickpea":21,"tomato":3,"chilli":3,"brinjal":5,"okra":3}',
    'Drone-approved per CIB label.'),
  ('Acetamiprid 20 SP', 'Pride', 'Acetamiprid',
    '{cotton,paddy,wheat,chilli,brinjal,okra,mustard}',
    true,
    '{"cotton":21,"paddy":15,"wheat":30,"chilli":7,"brinjal":5,"okra":3,"mustard":21}',
    'Drone-approved per CIB label.'),
  ('Imidacloprid 17.8 SL', 'Confidor', 'Imidacloprid',
    '{cotton,paddy,sugarcane,soybean}',
    false,
    '{"cotton":40,"paddy":30,"sugarcane":60,"soybean":40}',
    'NOT approved for drone application as of current CIB list.'),
  ('Mancozeb 75 WP', 'Indofil M-45', 'Mancozeb',
    '{potato,tomato,onion,grape,chilli,paddy,wheat}',
    true,
    '{"potato":15,"tomato":3,"onion":7,"grape":15,"chilli":3,"paddy":21,"wheat":30}',
    'Drone-approved per CIB label.'),
  ('Copper Oxychloride 50 WP', 'Blitox', 'Copper Oxychloride',
    '{grape,citrus,potato,tomato,paddy}',
    true,
    '{"grape":15,"potato":15,"tomato":3,"paddy":21}',
    'Drone-approved per CIB label.'),
  ('Glyphosate 41 SL', 'Roundup', 'Glyphosate',
    '{}',
    false,
    '{}',
    'NOT permitted for in-crop drone application.'),
  ('Profenofos 50 EC', 'Curacron', 'Profenofos',
    '{cotton,chilli}',
    true,
    '{"cotton":21,"chilli":7}',
    'Drone-approved per CIB label.')
on conflict (name, brand) do nothing;

------------------------------------------------------------
-- Demo tenant (single-supplier V1 launch)
------------------------------------------------------------
insert into tenants (
  id, slug, name, gstin, pan, dgca_operator_uin,
  registered_address, state, default_language, timezone, upi_vpa,
  activated_at
)
values (
  '00000000-0000-0000-0000-000000000001',
  'sah',
  'Sahyadri Agri Drones',
  '27ABCDE1234F1Z5',
  'ABCDE1234F',
  'UIN-IN-OPERATOR-001',
  'Plot 12, Krishna Nagar, Wai, Satara',
  'Maharashtra',
  'en',
  'Asia/Kolkata',
  'sahyadri@upi',
  now()
)
on conflict (id) do nothing;

------------------------------------------------------------
-- Demo pilots, drones, farmers, slots
------------------------------------------------------------
insert into pilots (id, tenant_id, name, phone, telegram_id, rpc_number, rpc_expiry, certified_drone_classes, joined_date) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
   'Sandeep Kale', '+919812000001', '@sandeep_k', 'RPC-IN-001', current_date + 365, '{medium,large}', current_date - 400),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
   'Anil Ravi', '+919812000002', '@anil_r', 'RPC-IN-002', current_date + 220, '{medium}', current_date - 200),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001',
   'Pooja Shinde', '+919812000003', '@pooja_s', 'RPC-IN-003', current_date + 12, '{medium}', current_date - 100)
on conflict (id) do nothing;

insert into drones (id, tenant_id, display_id, uin, manufacturer, model, year, payload_l, hours_flown, hours_since_service, service_threshold_hours, insurance_ref, insurance_expiry, status) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
   'T40-A', 'UIN-IN-AS01-T40-001', 'DJI', 'Agras T40', 2024, 40, 412, 28, 50, 'INS-001', current_date + 200, 'ready'),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
   'T40-B', 'UIN-IN-AS01-T40-002', 'DJI', 'Agras T40', 2024, 40, 198, 12, 50, 'INS-002', current_date + 320, 'ready'),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001',
   'P100-A', 'UIN-IN-AS01-P100-001', 'XAG', 'P100', 2023, 50, 304, 50, 50, 'INS-003', current_date + 90, 'maintenance')
on conflict (id) do nothing;

insert into farmers (id, tenant_id, name, phone, default_language, village, district, state) values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
   'Ramesh Patil', '+919876543210', 'mr', 'Wai', 'Satara', 'Maharashtra'),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
   'Sunita Deshmukh', '+919876543211', 'mr', 'Phaltan', 'Satara', 'Maharashtra'),
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001',
   'Vikas Jadhav', '+919876543212', 'mr', 'Karad', 'Satara', 'Maharashtra'),
  ('30000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001',
   'Kavita Pawar', '+919876543213', 'mr', 'Koregaon', 'Satara', 'Maharashtra'),
  ('30000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001',
   'Mahesh Kale', '+919876543214', 'mr', 'Mhaswad', 'Satara', 'Maharashtra'),
  ('30000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001',
   'Ganesh More', '+919876543215', 'mr', 'Khatav', 'Satara', 'Maharashtra')
on conflict (id) do nothing;

------------------------------------------------------------
-- Slots for the next 14 days at default capacity 6
------------------------------------------------------------
insert into slots (tenant_id, date, capacity, booked)
select
  '00000000-0000-0000-0000-000000000001',
  current_date + g,
  6,
  case g when 0 then 4 when 1 then 3 when 2 then 6 else 0 end
from generate_series(0, 13) g
on conflict (tenant_id, date) do nothing;

------------------------------------------------------------
-- Demo jobs across states for showcase
------------------------------------------------------------
do $$
declare
  v_tenant uuid := '00000000-0000-0000-0000-000000000001';
  v_pricing jsonb;
begin
  -- Job 1: In progress
  insert into jobs (id, tenant_id, number, farmer_id, crop, area, area_acres, scheduled_date,
                    village, spray_type, pesticide_name, state, assigned_pilot_id, assigned_drone_id)
  values (
    '40000000-0000-0000-0000-000000000001', v_tenant,
    generate_job_number(v_tenant, 'cotton', current_date),
    '30000000-0000-0000-0000-000000000001',
    'cotton', 18, 18, current_date, 'Wai', 'insecticide',
    'Chlorantraniliprole 18.5 SC', 'in_progress',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001'
  )
  on conflict (id) do nothing;
  v_pricing := calculate_pricing('40000000-0000-0000-0000-000000000001');
  update jobs set pricing_snapshot = v_pricing where id = '40000000-0000-0000-0000-000000000001';

  -- Sorties for that job
  insert into sorties (tenant_id, job_id, sortie_number, pilot_id, drone_id, takeoff_at, landing_at,
                       state, area_covered_acres, volume_sprayed_l, npnt_permission_ref)
  values
    (v_tenant, '40000000-0000-0000-0000-000000000001', 1,
     '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
     now() - interval '2 hours', now() - interval '90 minutes',
     'closed', 6, 72, 'NPNT-DS-001'),
    (v_tenant, '40000000-0000-0000-0000-000000000001', 2,
     '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
     now() - interval '75 minutes', now() - interval '40 minutes',
     'closed', 6, 70, 'NPNT-DS-002'),
    (v_tenant, '40000000-0000-0000-0000-000000000001', 3,
     '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
     now() - interval '20 minutes', null, 'active', null, null, 'NPNT-DS-003')
  on conflict do nothing;

  -- Job 2: Crew assigned
  insert into jobs (id, tenant_id, number, farmer_id, crop, area, area_acres, scheduled_date,
                    village, spray_type, pesticide_name, state, assigned_pilot_id, assigned_drone_id)
  values (
    '40000000-0000-0000-0000-000000000002', v_tenant,
    generate_job_number(v_tenant, 'wheat', current_date),
    '30000000-0000-0000-0000-000000000002',
    'wheat', 6, 6, current_date, 'Phaltan', 'fungicide',
    'Mancozeb 75 WP', 'crew_assigned',
    '10000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002'
  )
  on conflict (id) do nothing;
  v_pricing := calculate_pricing('40000000-0000-0000-0000-000000000002');
  update jobs set pricing_snapshot = v_pricing where id = '40000000-0000-0000-0000-000000000002';

  -- Job 3: Confirmed, awaiting crew
  insert into jobs (id, tenant_id, number, farmer_id, crop, area, area_acres, scheduled_date,
                    village, spray_type, pesticide_name, state)
  values (
    '40000000-0000-0000-0000-000000000003', v_tenant,
    generate_job_number(v_tenant, 'soybean', current_date),
    '30000000-0000-0000-0000-000000000003',
    'soybean', 22, 22, current_date, 'Karad', 'insecticide',
    'Acetamiprid 20 SP', 'confirmed'
  )
  on conflict (id) do nothing;
  update jobs set pricing_snapshot = calculate_pricing('40000000-0000-0000-0000-000000000003')
    where id = '40000000-0000-0000-0000-000000000003';

  -- Job 4: Compliance fail (CIB)
  insert into jobs (id, tenant_id, number, farmer_id, crop, area, area_acres, scheduled_date,
                    village, spray_type, pesticide_name, state)
  values (
    '40000000-0000-0000-0000-000000000004', v_tenant,
    generate_job_number(v_tenant, 'cotton', current_date + 1),
    '30000000-0000-0000-0000-000000000005',
    'cotton', 14, 14, current_date + 1, 'Mhaswad', 'insecticide',
    'Imidacloprid 17.8 SL', 'comp_fail'
  )
  on conflict (id) do nothing;
  update jobs set pricing_snapshot = calculate_pricing('40000000-0000-0000-0000-000000000004')
    where id = '40000000-0000-0000-0000-000000000004';
  insert into compliance_checks (tenant_id, job_id, check_type, status, reason)
  values (v_tenant, '40000000-0000-0000-0000-000000000004', 'cib_pesticide', 'fail',
          'Imidacloprid 17.8 SL not CIB-approved for drone application on cotton.')
  on conflict do nothing;

  -- Job 5: Compliance fail (RPC expiring soon)
  insert into jobs (id, tenant_id, number, farmer_id, crop, area, area_acres, scheduled_date,
                    village, spray_type, pesticide_name, state, assigned_pilot_id)
  values (
    '40000000-0000-0000-0000-000000000005', v_tenant,
    generate_job_number(v_tenant, 'wheat', current_date + 2),
    '30000000-0000-0000-0000-000000000006',
    'wheat', 8, 8, current_date + 2, 'Khatav', 'fungicide',
    'Mancozeb 75 WP', 'comp_fail',
    '10000000-0000-0000-0000-000000000003'
  )
  on conflict (id) do nothing;
  update jobs set pricing_snapshot = calculate_pricing('40000000-0000-0000-0000-000000000005')
    where id = '40000000-0000-0000-0000-000000000005';
  insert into compliance_checks (tenant_id, job_id, check_type, status, reason)
  values (v_tenant, '40000000-0000-0000-0000-000000000005', 'dgca_rpc', 'fail',
          'Assigned pilot RPC expires in 12 days — renewal in progress.')
  on conflict do nothing;

end$$;
