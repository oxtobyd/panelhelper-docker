-- Add calculated_season column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'panels' 
                  AND column_name = 'calculated_season') THEN
        ALTER TABLE panels ADD COLUMN calculated_season VARCHAR(10);
        
        -- Update existing records with calculated season based on panel date
        UPDATE panels 
        SET calculated_season = 
            CASE 
                WHEN EXTRACT(MONTH FROM panel_date) >= 9 THEN 
                    EXTRACT(YEAR FROM panel_date)::TEXT || '-' || (EXTRACT(YEAR FROM panel_date) + 1)::TEXT
                ELSE 
                    (EXTRACT(YEAR FROM panel_date) - 1)::TEXT || '-' || EXTRACT(YEAR FROM panel_date)::TEXT
            END;
    END IF;
END $$;

-- Create or replace the calculated_season function
CREATE OR REPLACE FUNCTION calculated_season()
RETURNS VARCHAR(10) AS $$
BEGIN
    RETURN 
        CASE 
            WHEN EXTRACT(MONTH FROM panel_date) >= 9 THEN 
                EXTRACT(YEAR FROM panel_date)::TEXT || '-' || (EXTRACT(YEAR FROM panel_date) + 1)::TEXT
            ELSE 
                (EXTRACT(YEAR FROM panel_date) - 1)::TEXT || '-' || EXTRACT(YEAR FROM panel_date)::TEXT
        END;
END;
$$ LANGUAGE plpgsql;
