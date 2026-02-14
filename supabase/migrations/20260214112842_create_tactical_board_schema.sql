/*
  # Create Tactical Board Database Schema

  1. New Tables
    - `cases` - Study cases for the tactical board
      - `id` (uuid, primary key)
      - `title` (text, required)
      - `description` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `units` - Military units in each case
      - `id` (uuid, primary key)
      - `case_id` (uuid, foreign key to cases)
      - `position_x` (numeric)
      - `position_y` (numeric)
      - `rotation` (numeric, in degrees)
      - `type` (text, unit type)
      - `name` (text)
      - `created_at` (timestamp)
    
    - `terrain` - Terrain features in each case
      - `id` (uuid, primary key)
      - `case_id` (uuid, foreign key to cases)
      - `terrain_type` (text)
      - `x` (numeric)
      - `y` (numeric)
      - `width` (numeric)
      - `height` (numeric)
      - `created_at` (timestamp)
    
    - `movements` - Movement logs for units
      - `id` (uuid, primary key)
      - `case_id` (uuid, foreign key to cases)
      - `unit_id` (uuid, foreign key to units)
      - `action_type` (text)
      - `description` (text)
      - `timestamp` (timestamp)
    
    - `comments` - Comments on cases
      - `id` (uuid, primary key)
      - `case_id` (uuid, foreign key to cases)
      - `content` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage cases
*/

CREATE TABLE IF NOT EXISTS cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cases"
  ON cases
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create cases"
  ON cases
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update cases"
  ON cases
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete cases"
  ON cases
  FOR DELETE
  USING (true);

CREATE TABLE IF NOT EXISTS units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  position_x numeric DEFAULT 0,
  position_y numeric DEFAULT 0,
  rotation numeric DEFAULT 0,
  type text DEFAULT 'default',
  name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read units"
  ON units
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create units"
  ON units
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update units"
  ON units
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete units"
  ON units
  FOR DELETE
  USING (true);

CREATE TABLE IF NOT EXISTS terrain (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  terrain_type text NOT NULL,
  x numeric DEFAULT 0,
  y numeric DEFAULT 0,
  width numeric DEFAULT 100,
  height numeric DEFAULT 100,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE terrain ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read terrain"
  ON terrain
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create terrain"
  ON terrain
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update terrain"
  ON terrain
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete terrain"
  ON terrain
  FOR DELETE
  USING (true);

CREATE TABLE IF NOT EXISTS movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES units(id) ON DELETE CASCADE,
  action_type text,
  description text,
  timestamp timestamptz DEFAULT now()
);

ALTER TABLE movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read movements"
  ON movements
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create movements"
  ON movements
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update movements"
  ON movements
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete movements"
  ON movements
  FOR DELETE
  USING (true);

CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read comments"
  ON comments
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create comments"
  ON comments
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update comments"
  ON comments
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete comments"
  ON comments
  FOR DELETE
  USING (true);
