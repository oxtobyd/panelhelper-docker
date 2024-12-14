-- Create venue_locations table
CREATE TABLE IF NOT EXISTS public.venue_locations (
    id SERIAL PRIMARY KEY,
    venue_name VARCHAR(100) NOT NULL,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert the venue locations
INSERT INTO public.venue_locations (venue_name, latitude, longitude)
VALUES 
    ('Woking', 51.2454, -0.5616),
    ('Shallowford', 52.9065, -2.1492),
    ('Wydale', 54.2397, -0.5297),
    ('Pleshey', 51.7977, 0.4135),
    ('Launde', 52.6213, -0.8379),
    ('Ammerdown', 51.2856, -2.4139),
    ('Foxhill', 53.2729, -2.7243)
ON CONFLICT (venue_name) DO UPDATE 
SET latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude;
