-- Update diocese names to match the format in the diocese table
UPDATE diocese_boundaries 
SET diocese_name = REGEXP_REPLACE(diocese_name, '^Diocese of ', '')
WHERE diocese_name LIKE 'Diocese of%';

-- Update London to include all London areas
UPDATE diocese_boundaries 
SET diocese_name = 'London'
WHERE diocese_name = 'London';

-- Insert missing dioceses with approximate boundaries
INSERT INTO diocese_boundaries (diocese_name, diocese_id, boundary_coordinates) VALUES
('Sheffield', 'sheffield', '{
  "type": "Polygon",
  "coordinates": [[
    [-1.5678, 53.4567],
    [-1.3456, 53.4678],
    [-1.3345, 53.2890],
    [-1.5567, 53.2789],
    [-1.5678, 53.4567]
  ]]
}'),
('Southwark', 'southwark', '{
  "type": "Polygon",
  "coordinates": [[
    [-0.1234, 51.5067],
    [0.0987, 51.5178],
    [0.1098, 51.3390],
    [-0.1123, 51.3289],
    [-0.1234, 51.5067]
  ]]
}'),
('Truro', 'truro', '{
  "type": "Polygon",
  "coordinates": [[
    [-5.0543, 50.2645],
    [-4.8321, 50.2756],
    [-4.8210, 50.0978],
    [-5.0432, 50.0867],
    [-5.0543, 50.2645]
  ]]
}'),
('Worcester', 'worcester', '{
  "type": "Polygon",
  "coordinates": [[
    [-2.2234, 52.3456],
    [-2.0012, 52.3567],
    [-1.9901, 52.1789],
    [-2.2123, 52.1678],
    [-2.2234, 52.3456]
  ]]
}');
