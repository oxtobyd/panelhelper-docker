-- Add Europe (using Paris) and Sodor and Man (using Isle of Man) boundaries
INSERT INTO diocese_boundaries (diocese_name, diocese_id, boundary_coordinates) VALUES
('Europe', 'europe', '{
  "type": "Polygon",
  "coordinates": [[
    [2.2241, 48.8156],
    [2.4697, 48.9021],
    [2.4180, 48.9137],
    [2.2945, 48.8585],
    [2.2241, 48.8156]
  ]]
}'),
('Sodor and Man', 'sodor-and-man', '{
  "type": "Polygon",
  "coordinates": [[
    [-4.7986, 54.4048],
    [-4.3097, 54.4048],
    [-4.3097, 54.0723],
    [-4.7986, 54.0723],
    [-4.7986, 54.4048]
  ]]
}');
