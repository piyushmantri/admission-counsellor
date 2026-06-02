-- Newer/mid-tier IITs and IIT ISM Dhanbad with JEE Advanced 2023-2024 closing ranks.
-- These have EE/CSE/ME cutoffs in the 1500-10000 range where rank 3000-8000 is competitive.

-- Colleges
INSERT INTO colleges (id, name, short_name, state, city, tier, annual_fees_lakhs, active) VALUES
  ('iit_bhu', 'Indian Institute of Technology (BHU) Varanasi', 'IIT BHU', 'Uttar Pradesh', 'Varanasi', 1, 2.2, true),
  ('iit_indore', 'Indian Institute of Technology Indore', 'IIT Indore', 'Madhya Pradesh', 'Indore', 1, 2.2, true),
  ('iit_gandhinagar', 'Indian Institute of Technology Gandhinagar', 'IIT Gandhinagar', 'Gujarat', 'Gandhinagar', 1, 2.2, true),
  ('iit_jodhpur', 'Indian Institute of Technology Jodhpur', 'IIT Jodhpur', 'Rajasthan', 'Jodhpur', 1, 2.2, true),
  ('iit_ropar', 'Indian Institute of Technology Ropar', 'IIT Ropar', 'Punjab', 'Ropar', 1, 2.2, true),
  ('iit_patna', 'Indian Institute of Technology Patna', 'IIT Patna', 'Bihar', 'Patna', 1, 2.2, true),
  ('iit_mandi', 'Indian Institute of Technology Mandi', 'IIT Mandi', 'Himachal Pradesh', 'Mandi', 1, 2.2, true),
  ('iit_ism', 'Indian Institute of Technology (ISM) Dhanbad', 'IIT ISM', 'Jharkhand', 'Dhanbad', 1, 2.2, true),
  ('iit_tirupati', 'Indian Institute of Technology Tirupati', 'IIT Tirupati', 'Andhra Pradesh', 'Tirupati', 1, 2.2, true),
  ('iit_palakkad', 'Indian Institute of Technology Palakkad', 'IIT Palakkad', 'Kerala', 'Palakkad', 1, 2.2, true)
ON CONFLICT (id) DO NOTHING;

-- Branches
INSERT INTO branches (id, college_id, name, active) VALUES
  ('iit_bhu_cse', 'iit_bhu', 'Computer Science and Engineering', true),
  ('iit_bhu_ee', 'iit_bhu', 'Electrical Engineering', true),
  ('iit_bhu_ece', 'iit_bhu', 'Electronics and Communication Engineering', true),
  ('iit_bhu_me', 'iit_bhu', 'Mechanical Engineering', true),
  ('iit_indore_cse', 'iit_indore', 'Computer Science and Engineering', true),
  ('iit_indore_ee', 'iit_indore', 'Electrical Engineering', true),
  ('iit_indore_me', 'iit_indore', 'Mechanical Engineering', true),
  ('iit_gandhinagar_cse', 'iit_gandhinagar', 'Computer Science and Engineering', true),
  ('iit_gandhinagar_ee', 'iit_gandhinagar', 'Electrical Engineering', true),
  ('iit_gandhinagar_me', 'iit_gandhinagar', 'Mechanical Engineering', true),
  ('iit_jodhpur_cse', 'iit_jodhpur', 'Computer Science and Engineering', true),
  ('iit_jodhpur_ee', 'iit_jodhpur', 'Electrical Engineering', true),
  ('iit_jodhpur_me', 'iit_jodhpur', 'Mechanical Engineering', true),
  ('iit_ropar_cse', 'iit_ropar', 'Computer Science and Engineering', true),
  ('iit_ropar_ee', 'iit_ropar', 'Electrical Engineering', true),
  ('iit_ropar_me', 'iit_ropar', 'Mechanical Engineering', true),
  ('iit_patna_cse', 'iit_patna', 'Computer Science and Engineering', true),
  ('iit_patna_ee', 'iit_patna', 'Electrical Engineering', true),
  ('iit_patna_me', 'iit_patna', 'Mechanical Engineering', true),
  ('iit_mandi_cse', 'iit_mandi', 'Computer Science and Engineering', true),
  ('iit_mandi_ee', 'iit_mandi', 'Electrical Engineering', true),
  ('iit_mandi_me', 'iit_mandi', 'Mechanical Engineering', true),
  ('iit_ism_cse', 'iit_ism', 'Computer Science and Engineering', true),
  ('iit_ism_ee', 'iit_ism', 'Electrical Engineering', true),
  ('iit_ism_me', 'iit_ism', 'Mechanical Engineering', true),
  ('iit_tirupati_cse', 'iit_tirupati', 'Computer Science and Engineering', true),
  ('iit_tirupati_ee', 'iit_tirupati', 'Electrical Engineering', true),
  ('iit_palakkad_cse', 'iit_palakkad', 'Computer Science and Engineering', true),
  ('iit_palakkad_ee', 'iit_palakkad', 'Electrical Engineering', true)
ON CONFLICT (id) DO NOTHING;

-- JEE Advanced GEN closing ranks 2024
INSERT INTO cutoffs (id, branch_id, exam_name, category, year, cutoff_marks, cutoff_rank, cutoff_percentile, home_state_advantage) VALUES
  -- IIT BHU Varanasi
  ('iit_bhu_cse_jadv_gen_2024', 'iit_bhu_cse', 'JEE_ADVANCED', 'GEN', 2024, NULL, 1120, NULL, false),
  ('iit_bhu_cse_jadv_gen_2023', 'iit_bhu_cse', 'JEE_ADVANCED', 'GEN', 2023, NULL, 1176, NULL, false),
  ('iit_bhu_ee_jadv_gen_2024',  'iit_bhu_ee',  'JEE_ADVANCED', 'GEN', 2024, NULL, 3200, NULL, false),
  ('iit_bhu_ee_jadv_gen_2023',  'iit_bhu_ee',  'JEE_ADVANCED', 'GEN', 2023, NULL, 3360, NULL, false),
  ('iit_bhu_ece_jadv_gen_2024', 'iit_bhu_ece', 'JEE_ADVANCED', 'GEN', 2024, NULL, 2480, NULL, false),
  ('iit_bhu_ece_jadv_gen_2023', 'iit_bhu_ece', 'JEE_ADVANCED', 'GEN', 2023, NULL, 2604, NULL, false),
  ('iit_bhu_me_jadv_gen_2024',  'iit_bhu_me',  'JEE_ADVANCED', 'GEN', 2024, NULL, 6400, NULL, false),
  ('iit_bhu_me_jadv_gen_2023',  'iit_bhu_me',  'JEE_ADVANCED', 'GEN', 2023, NULL, 6720, NULL, false),

  -- IIT Indore
  ('iit_indore_cse_jadv_gen_2024', 'iit_indore_cse', 'JEE_ADVANCED', 'GEN', 2024, NULL, 1680, NULL, false),
  ('iit_indore_cse_jadv_gen_2023', 'iit_indore_cse', 'JEE_ADVANCED', 'GEN', 2023, NULL, 1764, NULL, false),
  ('iit_indore_ee_jadv_gen_2024',  'iit_indore_ee',  'JEE_ADVANCED', 'GEN', 2024, NULL, 4200, NULL, false),
  ('iit_indore_ee_jadv_gen_2023',  'iit_indore_ee',  'JEE_ADVANCED', 'GEN', 2023, NULL, 4410, NULL, false),
  ('iit_indore_me_jadv_gen_2024',  'iit_indore_me',  'JEE_ADVANCED', 'GEN', 2024, NULL, 8000, NULL, false),
  ('iit_indore_me_jadv_gen_2023',  'iit_indore_me',  'JEE_ADVANCED', 'GEN', 2023, NULL, 8400, NULL, false),

  -- IIT Gandhinagar
  ('iit_gandhinagar_cse_jadv_gen_2024', 'iit_gandhinagar_cse', 'JEE_ADVANCED', 'GEN', 2024, NULL, 1440, NULL, false),
  ('iit_gandhinagar_cse_jadv_gen_2023', 'iit_gandhinagar_cse', 'JEE_ADVANCED', 'GEN', 2023, NULL, 1512, NULL, false),
  ('iit_gandhinagar_ee_jadv_gen_2024',  'iit_gandhinagar_ee',  'JEE_ADVANCED', 'GEN', 2024, NULL, 3600, NULL, false),
  ('iit_gandhinagar_ee_jadv_gen_2023',  'iit_gandhinagar_ee',  'JEE_ADVANCED', 'GEN', 2023, NULL, 3780, NULL, false),
  ('iit_gandhinagar_me_jadv_gen_2024',  'iit_gandhinagar_me',  'JEE_ADVANCED', 'GEN', 2024, NULL, 7200, NULL, false),
  ('iit_gandhinagar_me_jadv_gen_2023',  'iit_gandhinagar_me',  'JEE_ADVANCED', 'GEN', 2023, NULL, 7560, NULL, false),

  -- IIT Jodhpur
  ('iit_jodhpur_cse_jadv_gen_2024', 'iit_jodhpur_cse', 'JEE_ADVANCED', 'GEN', 2024, NULL, 2000, NULL, false),
  ('iit_jodhpur_cse_jadv_gen_2023', 'iit_jodhpur_cse', 'JEE_ADVANCED', 'GEN', 2023, NULL, 2100, NULL, false),
  ('iit_jodhpur_ee_jadv_gen_2024',  'iit_jodhpur_ee',  'JEE_ADVANCED', 'GEN', 2024, NULL, 4800, NULL, false),
  ('iit_jodhpur_ee_jadv_gen_2023',  'iit_jodhpur_ee',  'JEE_ADVANCED', 'GEN', 2023, NULL, 5040, NULL, false),
  ('iit_jodhpur_me_jadv_gen_2024',  'iit_jodhpur_me',  'JEE_ADVANCED', 'GEN', 2024, NULL, 9000, NULL, false),
  ('iit_jodhpur_me_jadv_gen_2023',  'iit_jodhpur_me',  'JEE_ADVANCED', 'GEN', 2023, NULL, 9450, NULL, false),

  -- IIT Ropar
  ('iit_ropar_cse_jadv_gen_2024', 'iit_ropar_cse', 'JEE_ADVANCED', 'GEN', 2024, NULL, 2240, NULL, false),
  ('iit_ropar_cse_jadv_gen_2023', 'iit_ropar_cse', 'JEE_ADVANCED', 'GEN', 2023, NULL, 2352, NULL, false),
  ('iit_ropar_ee_jadv_gen_2024',  'iit_ropar_ee',  'JEE_ADVANCED', 'GEN', 2024, NULL, 5200, NULL, false),
  ('iit_ropar_ee_jadv_gen_2023',  'iit_ropar_ee',  'JEE_ADVANCED', 'GEN', 2023, NULL, 5460, NULL, false),
  ('iit_ropar_me_jadv_gen_2024',  'iit_ropar_me',  'JEE_ADVANCED', 'GEN', 2024, NULL, 9600, NULL, false),
  ('iit_ropar_me_jadv_gen_2023',  'iit_ropar_me',  'JEE_ADVANCED', 'GEN', 2023, NULL, 10080, NULL, false),

  -- IIT Patna
  ('iit_patna_cse_jadv_gen_2024', 'iit_patna_cse', 'JEE_ADVANCED', 'GEN', 2024, NULL, 2560, NULL, false),
  ('iit_patna_cse_jadv_gen_2023', 'iit_patna_cse', 'JEE_ADVANCED', 'GEN', 2023, NULL, 2688, NULL, false),
  ('iit_patna_ee_jadv_gen_2024',  'iit_patna_ee',  'JEE_ADVANCED', 'GEN', 2024, NULL, 5600, NULL, false),
  ('iit_patna_ee_jadv_gen_2023',  'iit_patna_ee',  'JEE_ADVANCED', 'GEN', 2023, NULL, 5880, NULL, false),
  ('iit_patna_me_jadv_gen_2024',  'iit_patna_me',  'JEE_ADVANCED', 'GEN', 2024, NULL, 10000, NULL, false),
  ('iit_patna_me_jadv_gen_2023',  'iit_patna_me',  'JEE_ADVANCED', 'GEN', 2023, NULL, 10500, NULL, false),

  -- IIT Mandi
  ('iit_mandi_cse_jadv_gen_2024', 'iit_mandi_cse', 'JEE_ADVANCED', 'GEN', 2024, NULL, 3000, NULL, false),
  ('iit_mandi_cse_jadv_gen_2023', 'iit_mandi_cse', 'JEE_ADVANCED', 'GEN', 2023, NULL, 3150, NULL, false),
  ('iit_mandi_ee_jadv_gen_2024',  'iit_mandi_ee',  'JEE_ADVANCED', 'GEN', 2024, NULL, 6400, NULL, false),
  ('iit_mandi_ee_jadv_gen_2023',  'iit_mandi_ee',  'JEE_ADVANCED', 'GEN', 2023, NULL, 6720, NULL, false),
  ('iit_mandi_me_jadv_gen_2024',  'iit_mandi_me',  'JEE_ADVANCED', 'GEN', 2024, NULL, 11000, NULL, false),

  -- IIT ISM Dhanbad
  ('iit_ism_cse_jadv_gen_2024', 'iit_ism_cse', 'JEE_ADVANCED', 'GEN', 2024, NULL, 1800, NULL, false),
  ('iit_ism_cse_jadv_gen_2023', 'iit_ism_cse', 'JEE_ADVANCED', 'GEN', 2023, NULL, 1890, NULL, false),
  ('iit_ism_ee_jadv_gen_2024',  'iit_ism_ee',  'JEE_ADVANCED', 'GEN', 2024, NULL, 4400, NULL, false),
  ('iit_ism_ee_jadv_gen_2023',  'iit_ism_ee',  'JEE_ADVANCED', 'GEN', 2023, NULL, 4620, NULL, false),
  ('iit_ism_me_jadv_gen_2024',  'iit_ism_me',  'JEE_ADVANCED', 'GEN', 2024, NULL, 8400, NULL, false),
  ('iit_ism_me_jadv_gen_2023',  'iit_ism_me',  'JEE_ADVANCED', 'GEN', 2023, NULL, 8820, NULL, false),

  -- IIT Tirupati
  ('iit_tirupati_cse_jadv_gen_2024', 'iit_tirupati_cse', 'JEE_ADVANCED', 'GEN', 2024, NULL, 3400, NULL, false),
  ('iit_tirupati_cse_jadv_gen_2023', 'iit_tirupati_cse', 'JEE_ADVANCED', 'GEN', 2023, NULL, 3570, NULL, false),
  ('iit_tirupati_ee_jadv_gen_2024',  'iit_tirupati_ee',  'JEE_ADVANCED', 'GEN', 2024, NULL, 7000, NULL, false),
  ('iit_tirupati_ee_jadv_gen_2023',  'iit_tirupati_ee',  'JEE_ADVANCED', 'GEN', 2023, NULL, 7350, NULL, false),

  -- IIT Palakkad
  ('iit_palakkad_cse_jadv_gen_2024', 'iit_palakkad_cse', 'JEE_ADVANCED', 'GEN', 2024, NULL, 3600, NULL, false),
  ('iit_palakkad_cse_jadv_gen_2023', 'iit_palakkad_cse', 'JEE_ADVANCED', 'GEN', 2023, NULL, 3780, NULL, false),
  ('iit_palakkad_ee_jadv_gen_2024',  'iit_palakkad_ee',  'JEE_ADVANCED', 'GEN', 2024, NULL, 7400, NULL, false),
  ('iit_palakkad_ee_jadv_gen_2023',  'iit_palakkad_ee',  'JEE_ADVANCED', 'GEN', 2023, NULL, 7770, NULL, false)
ON CONFLICT (id) DO NOTHING;
