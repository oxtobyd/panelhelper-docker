-- Add London subdivisions
DELETE FROM diocese_boundaries WHERE diocese_name = 'Diocese of London';

INSERT INTO diocese_boundaries (diocese_name, diocese_id, boundary_coordinates) VALUES
('London - Two Cities', 'london_two_cities', '{
  "type": "Polygon",
  "coordinates": [[
    [-0.15, 51.50],
    [-0.15, 51.52],
    [-0.08, 51.52],
    [-0.08, 51.50],
    [-0.15, 51.50]
  ]]
}'),
('London - Stepney', 'london_stepney', '{
  "type": "Polygon",
  "coordinates": [[
    [-0.08, 51.50],
    [-0.08, 51.54],
    [0.00, 51.54],
    [0.00, 51.50],
    [-0.08, 51.50]
  ]]
}'),
('London - Edmonton', 'london_edmonton', '{
  "type": "Polygon",
  "coordinates": [[
    [-0.15, 51.52],
    [-0.15, 51.56],
    [-0.08, 51.56],
    [-0.08, 51.52],
    [-0.15, 51.52]
  ]]
}'),
('London - Willesden', 'london_willesden', '{
  "type": "Polygon",
  "coordinates": [[
    [-0.22, 51.52],
    [-0.22, 51.56],
    [-0.15, 51.56],
    [-0.15, 51.52],
    [-0.22, 51.52]
  ]]
}'),
('London - Kensington', 'london_kensington', '{
  "type": "Polygon",
  "coordinates": [[
    [-0.22, 51.48],
    [-0.22, 51.52],
    [-0.15, 51.52],
    [-0.15, 51.48],
    [-0.22, 51.48]
  ]]
}');
