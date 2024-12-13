import express from 'express';
import { pool } from '../db.js';

const router = express.Router();

// Helper function to add season filter
const addSeasonFilter = (query, season) => {
    return season ? query.replace('WHERE', 'WHERE calculated_season = $1 AND') : query;
};

// Get available seasons
router.get('/seasons', async (req, res) => {
    try {
        const seasons = await pool.query(`
            WITH panels_with_season AS (
                SELECT *, calculate_season(panel_date) as calculated_season FROM panels
            )
            SELECT DISTINCT calculated_season 
            FROM panels_with_season 
            ORDER BY calculated_season DESC
        `);
        res.json(seasons.rows);
    } catch (error) {
        console.error('Error fetching seasons:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get overall statistics with optional season filter
router.get('/stats', async (req, res) => {
    const { season } = req.query;
    try {
        const query = `
            WITH panels_with_season AS (
                SELECT *, calculate_season(panel_date) as calculated_season FROM panels
            ),
            panel_type_stats AS (
                SELECT 
                    panel_type,
                    COUNT(*) as count
                FROM panels_with_season
                WHERE 1=1 ${season ? 'AND calculated_season = $1' : ''}
                GROUP BY panel_type
            ),
            candidate_journey AS (
                SELECT 
                    c.id,
                    MAX(CASE WHEN p.panel_type = 'Carousel' THEN 1 ELSE 0 END) as attended_carousel,
                    MAX(CASE WHEN p.panel_type = 'Panel' THEN 1 ELSE 0 END) as attended_panel,
                    MAX(CASE WHEN p.panel_type = 'Carousel' AND ${season ? 'p.calculated_season = $1' : '1=1'} THEN 1 ELSE 0 END) as attended_carousel_in_season,
                    MAX(CASE WHEN p.panel_type = 'Panel' AND ${season ? 'p.calculated_season = $1' : '1=1'} THEN 1 ELSE 0 END) as attended_panel_in_season
                FROM candidates c
                LEFT JOIN panel_attendees pa ON c.id = pa.attendee_id AND pa.attendee_type = 'C'
                LEFT JOIN panels_with_season p ON pa.panel_id = p.id
                GROUP BY c.id
            ),
            progression_stats AS (
                SELECT 
                    -- In-season stats
                    SUM(CASE WHEN attended_carousel_in_season = 1 THEN 1 ELSE 0 END) as total_carousel_candidates,
                    SUM(CASE WHEN attended_panel_in_season = 1 THEN 1 ELSE 0 END) as total_panel_candidates,
                    SUM(CASE WHEN attended_carousel_in_season = 1 AND attended_panel_in_season = 1 THEN 1 ELSE 0 END) as progressed_to_panel,
                    -- Overall stats (across all seasons)
                    SUM(CASE WHEN attended_carousel = 1 THEN 1 ELSE 0 END) as total_carousel_candidates_overall,
                    SUM(CASE WHEN attended_carousel = 1 AND attended_panel = 1 THEN 1 ELSE 0 END) as total_progressed_overall
                FROM candidate_journey
            )
            SELECT 
                COALESCE((SELECT COUNT(*) FROM panels_with_season WHERE panel_type = 'Carousel' ${season ? 'AND calculated_season = $1' : ''}), 0) as total_carousels,
                COALESCE((SELECT COUNT(*) FROM panels_with_season WHERE panel_type = 'Panel' ${season ? 'AND calculated_season = $1' : ''}), 0) as total_panels,
                (SELECT COUNT(DISTINCT a.id) 
                 FROM advisers a 
                 JOIN panel_attendees pa ON a.id = pa.attendee_id
                 JOIN panels_with_season p ON pa.panel_id = p.id
                 WHERE pa.attendee_type = 'A'
                 AND a.active = true
                 ${season ? 'AND p.calculated_season = $1' : ''}) as active_advisers,
                (WITH candidate_attendance AS (
                    SELECT 
                        c.id,
                        COUNT(DISTINCT CASE WHEN p.panel_type = 'Carousel' THEN p.id END) as carousel_count,
                        COUNT(DISTINCT CASE WHEN p.panel_type = 'Panel' THEN p.id END) as panel_count
                    FROM candidates c 
                    JOIN panel_attendees pa ON c.id = pa.attendee_id
                    JOIN panels_with_season p ON pa.panel_id = p.id
                    WHERE pa.attendee_type = 'C'
                    ${season ? 'AND p.calculated_season = $1' : ''}
                    GROUP BY c.id
                )
                SELECT json_build_object(
                    'total_unique', COUNT(*),
                    'carousel_only', COUNT(*) FILTER (WHERE carousel_count > 0 AND panel_count = 0),
                    'panel_only', COUNT(*) FILTER (WHERE carousel_count = 0 AND panel_count > 0),
                    'both_types', COUNT(*) FILTER (WHERE carousel_count > 0 AND panel_count > 0)
                )
                FROM candidate_attendance) as candidate_breakdown,
                COALESCE(ps.total_carousel_candidates, 0) as total_carousel_candidates,
                COALESCE(ps.total_panel_candidates, 0) as total_panel_candidates,
                COALESCE(ps.progressed_to_panel, 0) as progressed_to_panel,
                CASE 
                    WHEN COALESCE(ps.total_carousel_candidates, 0) = 0 THEN 0
                    ELSE ROUND((ps.progressed_to_panel::float / ps.total_carousel_candidates * 100)::numeric, 2)
                END as progression_rate,
                CASE 
                    WHEN COALESCE(ps.total_carousel_candidates_overall, 0) = 0 THEN 0
                    ELSE ROUND((ps.total_progressed_overall::float / ps.total_carousel_candidates_overall * 100)::numeric, 2)
                END as overall_progression_rate,
                ps.total_progressed_overall as total_progressed,
                ps.total_carousel_candidates_overall as total_carousel_overall
            FROM progression_stats ps`;

        const stats = await pool.query(query, season ? [season] : []);
        res.json(stats.rows[0]);
    } catch (error) {
        console.error('Error fetching overall stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get detailed candidate statistics
router.get('/candidate-stats', async (req, res) => {
    const { season } = req.query;
    try {
        const genderQuery = `
            WITH panels_with_season AS (
                SELECT *, calculate_season(panel_date) as calculated_season FROM panels
            ),
            active_candidates AS (
                SELECT DISTINCT c.* 
                FROM candidates c
                JOIN panel_attendees pa ON c.id = pa.attendee_id
                JOIN panels_with_season p ON pa.panel_id = p.id
                WHERE pa.attendee_type = 'C'
                ${season ? 'AND p.calculated_season = $1' : ''}
            ),
            gender_counts AS (
                SELECT 
                    CASE gender
                        WHEN 'Male' THEN 'M'
                        WHEN 'Female' THEN 'F'
                        ELSE 'Not Specified'
                    END as mapped_gender,
                    COUNT(*) as count
                FROM active_candidates
                GROUP BY gender
                ORDER BY 
                    CASE gender
                        WHEN 'Male' THEN 1
                        WHEN 'Female' THEN 2
                        ELSE 3
                    END
            )
            SELECT 
                json_build_object(
                    'byGender', (
                        SELECT json_agg(json_build_object(
                            'gender', mapped_gender,
                            'count', count
                        ))
                        FROM gender_counts
                    ),
                    'totalCandidates', (SELECT COUNT(DISTINCT id) FROM active_candidates)
                ) as result
        `;

        const ageQuery = `
            WITH panels_with_season AS (
                SELECT *, calculate_season(panel_date) as calculated_season FROM panels
            ),
            active_candidates AS (
                SELECT DISTINCT c.* 
                FROM candidates c
                JOIN panel_attendees pa ON c.id = pa.attendee_id
                JOIN panels_with_season p ON pa.panel_id = p.id
                WHERE pa.attendee_type = 'C'
                ${season ? 'AND p.calculated_season = $1' : ''}
            ),
            age_ranges AS (
                SELECT 
                    CASE 
                        WHEN date_of_birth IS NULL THEN 'Not Specified'
                        WHEN date_part('year', age(date_of_birth)) < 25 THEN 'Under 25'
                        WHEN date_part('year', age(date_of_birth)) BETWEEN 25 AND 34 THEN '25-34'
                        WHEN date_part('year', age(date_of_birth)) BETWEEN 35 AND 44 THEN '35-44'
                        WHEN date_part('year', age(date_of_birth)) BETWEEN 45 AND 54 THEN '45-54'
                        ELSE '55 and over'
                    END as range,
                    COUNT(*) as count
                FROM active_candidates
                GROUP BY date_of_birth
                ORDER BY 
                    CASE WHEN date_of_birth IS NULL THEN 1 ELSE 0 END,
                    date_of_birth
            )
            SELECT range, SUM(count) as count
            FROM age_ranges
            GROUP BY range
            ORDER BY 
                CASE range
                    WHEN 'Under 25' THEN 1
                    WHEN '25-34' THEN 2
                    WHEN '35-44' THEN 3
                    WHEN '45-54' THEN 4
                    WHEN '55 and over' THEN 5
                    ELSE 6
                END`;

        const dioceseQuery = `
            WITH panels_with_season AS (
                SELECT *, calculate_season(panel_date) as calculated_season FROM panels
            ),
            diocese_stats AS (
                SELECT 
                    d.diocese_name,
                    p.calculated_season,
                    p.panel_type,
                    COUNT(DISTINCT c.id) as candidate_count
                FROM candidates c
                JOIN panel_attendees pa ON c.id = pa.attendee_id
                JOIN panels_with_season p ON pa.panel_id = p.id
                JOIN diocese d ON c.diocese = d.id
                WHERE pa.attendee_type = 'C'
                ${season ? 'AND p.calculated_season = $1' : ''}
                GROUP BY d.diocese_name, p.calculated_season, p.panel_type
            ),
            prev_season_stats AS (
                SELECT 
                    diocese_name,
                    calculated_season,
                    SUM(CASE WHEN panel_type = 'Panel' THEN candidate_count ELSE 0 END) as panel_count,
                    SUM(CASE WHEN panel_type = 'Carousel' THEN candidate_count ELSE 0 END) as carousel_count
                FROM diocese_stats
                GROUP BY diocese_name, calculated_season
            ),
            current_with_prev AS (
                SELECT 
                    curr.diocese_name,
                    curr.calculated_season as season,
                    curr.panel_count,
                    curr.carousel_count,
                    prev.panel_count as prev_panel_count,
                    prev.carousel_count as prev_carousel_count
                FROM prev_season_stats curr
                LEFT JOIN prev_season_stats prev 
                    ON curr.diocese_name = prev.diocese_name 
                    AND prev.calculated_season = (
                        SELECT calculated_season 
                        FROM panels_with_season 
                        WHERE calculated_season < curr.calculated_season 
                        ORDER BY calculated_season DESC 
                        LIMIT 1
                    )
            )
            SELECT 
                diocese_name,
                season,
                COALESCE(panel_count, 0) as panel_count,
                COALESCE(carousel_count, 0) as carousel_count,
                COALESCE(panel_count, 0) + COALESCE(carousel_count, 0) as total_count,
                COALESCE(panel_count, 0) - COALESCE(prev_panel_count, 0) as panel_change,
                COALESCE(carousel_count, 0) - COALESCE(prev_carousel_count, 0) as carousel_change,
                (COALESCE(panel_count, 0) + COALESCE(carousel_count, 0)) - 
                (COALESCE(prev_panel_count, 0) + COALESCE(prev_carousel_count, 0)) as total_change
            FROM current_with_prev
            ORDER BY season DESC, total_count DESC`;

        const [ageStats, dioceseStats] = await Promise.all([
            pool.query(ageQuery, season ? [season] : []),
            pool.query(dioceseQuery, season ? [season] : [])
        ]);

        res.json({
            byGender: (await pool.query(genderQuery, season ? [season] : [])).rows[0].result.byGender,
            byAge: ageStats.rows,
            byDiocese: dioceseStats.rows
        });
    } catch (error) {
        console.error('Error fetching candidate stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get panel outcomes
router.get('/panel-outcomes', async (req, res) => {
    try {
        const { season } = req.query;
        const params = [season || null];  // Use null if no season specified

        const query = `
            WITH outcomes_with_season AS (
                SELECT 
                    panel_outcomes.*,
                    calculate_season(completed_date) as season_calculated 
                FROM panel_outcomes
                WHERE panel_result_text IS NOT NULL
            ),
            categorized_outcomes AS (
                SELECT 
                    CASE 
                        WHEN panel_result_text ILIKE '%conditionally%recommended%' THEN 'Conditionally Recommended'
                        WHEN panel_result_text ILIKE '%recommended%preparation%' OR 
                             panel_result_text ILIKE '%recommended%suggested%preparation%' THEN 'Recommended with Preparation'
                        WHEN panel_result_text ILIKE '%not yet ready%' OR 
                             panel_result_text ILIKE '%notyetready%' THEN 'Not Yet Ready to Proceed'
                        WHEN panel_result_text ILIKE '%advice not%' OR 
                             panel_result_text ILIKE '%advicenot%' THEN 'Advice Not to Proceed'
                        WHEN panel_result_text ILIKE '%recommended%' THEN 'Recommended'
                        ELSE panel_result_text
                    END as outcome,
                    season_calculated
                FROM outcomes_with_season
            )
            SELECT 
                outcome,
                CAST(COUNT(*) AS INTEGER) as count
            FROM categorized_outcomes co
            WHERE ($1::text IS NULL OR co.season_calculated = $1)
            GROUP BY outcome
            ORDER BY count DESC;
        `;

        const result = await pool.query(query, params);
        res.json(result.rows || []); // Ensure we always return an array
    } catch (error) {
        console.error('Error fetching panel outcomes:', error);
        res.status(500).json([]); // Return empty array on error instead of error message
    }
});

// Get venue statistics
router.get('/venue-stats', async (req, res) => {
    try {
        const season = req.query.season;
        const query = `
            WITH panels_with_season AS (
                SELECT *, calculate_season(panel_date) as calculated_season FROM panels
            ),
            active_candidates AS (
                SELECT DISTINCT c.* 
                FROM candidates c
                JOIN panel_attendees pa ON c.id = pa.attendee_id
                JOIN panels_with_season p ON pa.panel_id = p.id
                WHERE pa.attendee_type = 'C'
                ${season ? 'AND p.calculated_season = $1' : ''}
            ),
            panel_data AS (
                SELECT 
                    v.name as venue,
                    p.panel_type,
                    p.panel_date,
                    p.calculated_season,
                    p.panel_time,
                    COUNT(DISTINCT pa.attendee_id) as candidate_count,
                    CASE 
                        WHEN p.panel_type = 'Carousel' THEN 
                            CASE 
                                WHEN EXTRACT(HOUR FROM p.panel_time) < 12 THEN 8
                                ELSE 6
                            END
                        WHEN p.panel_type = 'Panel' THEN 
                            CASE 
                                WHEN p.calculated_season >= '2024/25' THEN 12
                                ELSE 14
                            END
                        ELSE 
                            CASE 
                                WHEN EXTRACT(HOUR FROM p.panel_time) < 12 THEN 8
                                ELSE 6
                            END
                    END as max_candidates
                FROM panels_with_season p
                LEFT JOIN panel_venues v ON p.venue_id = v.id
                LEFT JOIN panel_attendees pa ON p.id = pa.panel_id AND pa.attendee_type = 'C'
                WHERE 1=1 ${season ? 'AND p.calculated_season = $1' : ''}
                GROUP BY v.name, p.panel_type, p.panel_date, p.calculated_season, p.panel_time
            )
            SELECT 
                COALESCE(venue, 'Online') as venue,
                COUNT(*) as total_events,
                COUNT(CASE WHEN candidate_count = 0 THEN 1 END) as cancelled_events,
                COUNT(CASE WHEN candidate_count > 0 THEN 1 END) as completed_events,
                STRING_AGG(DISTINCT panel_type, ', ') as panel_types,
                ROUND(AVG(CASE WHEN candidate_count > 0 THEN candidate_count END)::numeric, 1) as avg_candidates,
                ROUND(AVG(CASE WHEN candidate_count > 0 THEN candidate_count * 100.0 / NULLIF(max_candidates, 0) END)::numeric, 1) as avg_utilization,
                (SELECT COUNT(DISTINCT id) FROM active_candidates) as total_candidates,
                SUM(candidate_count) as total_attendance,
                SUM(max_candidates) as total_capacity
            FROM panel_data
            GROUP BY COALESCE(venue, 'Online')
            ORDER BY total_events DESC;
        `;

        const params = season ? [season] : [];
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching venue stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get venue statistics by season
router.get('/venue-stats-by-season', async (req, res) => {
    try {
        const query = `
            WITH panels_with_season AS (
                SELECT *, calculate_season(panel_date) as calculated_season 
                FROM panels
            ),
            venue_seasons AS (
                SELECT DISTINCT calculated_season 
                FROM panels_with_season 
                ORDER BY calculated_season DESC
            ),
            venue_stats AS (
                SELECT 
                    COALESCE(v.name, 'Online') as venue_name,
                    p.calculated_season,
                    COUNT(*) as total_events
                FROM panels_with_season p
                LEFT JOIN panel_venues v ON p.venue_id = v.id
                GROUP BY COALESCE(v.name, 'Online'), p.calculated_season
            )
            SELECT 
                v.name as venue,
                json_agg(
                    json_build_object(
                        'season', s.calculated_season,
                        'events', COALESCE(vs.total_events, 0)
                    ) ORDER BY s.calculated_season DESC
                ) as seasons
            FROM panel_venues v
            CROSS JOIN venue_seasons s
            LEFT JOIN venue_stats vs ON v.name = vs.venue_name AND s.calculated_season = vs.calculated_season
            GROUP BY v.name
            ORDER BY v.name;
        `;

        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching venue statistics by season:', error);
        res.status(500).json({ error: 'Failed to fetch venue statistics by season' });
    }
});

// Get adviser demographics
router.get('/adviser-demographics', async (req, res) => {
    const { season } = req.query;
    try {
        const query = `
            WITH panels_with_season AS (
                SELECT *, calculate_season(panel_date) as calculated_season FROM panels
            ),
            active_advisers AS (
                SELECT DISTINCT a.* 
                FROM advisers a 
                JOIN panel_attendees pa ON a.id = pa.attendee_id
                JOIN panels_with_season p ON pa.panel_id = p.id
                WHERE pa.attendee_type = 'A'
                AND a.active = true
                ${season ? 'AND p.calculated_season = $1' : ''}
            ),
            age_ranges AS (
                SELECT 
                    CASE 
                        WHEN date_of_birth IS NULL THEN 'Not Specified'
                        WHEN date_part('year', age(date_of_birth)) < 35 THEN 'Under 35'
                        WHEN date_part('year', age(date_of_birth)) BETWEEN 35 AND 44 THEN '35-44'
                        WHEN date_part('year', age(date_of_birth)) BETWEEN 45 AND 54 THEN '45-54'
                        WHEN date_part('year', age(date_of_birth)) BETWEEN 55 AND 64 THEN '55-64'
                        ELSE '65 and over'
                    END as range,
                    COUNT(*) as count
                FROM active_advisers
                GROUP BY date_of_birth
                ORDER BY 
                    CASE WHEN date_of_birth IS NULL THEN 1 ELSE 0 END,
                    date_of_birth
            ),
            age_ranges_grouped AS (
                SELECT range, SUM(count) as count
                FROM age_ranges
                GROUP BY range
                ORDER BY 
                    CASE range
                        WHEN 'Under 35' THEN 1
                        WHEN '35-44' THEN 2
                        WHEN '45-54' THEN 3
                        WHEN '55-64' THEN 4
                        WHEN '65 and over' THEN 5
                        ELSE 6
                    END
            ),
            gender_stats AS (
                SELECT 
                    COALESCE(gender, 'Not Specified') as gender,
                    COUNT(*) as count
                FROM active_advisers
                GROUP BY gender
                ORDER BY gender
            ),
            training_status AS (
                SELECT 
                    status,
                    COUNT(*) as count
                FROM (
                    SELECT 
                        CASE training_category
                            WHEN 'stage1_total' THEN 'Stage 1 Total'
                            WHEN 'stage2_total' THEN 'Stage 2 Total'
                            WHEN 'stage1_only' THEN 'Stage 1 Only'
                            WHEN 'no_training' THEN 'No Training'
                        END as status
                    FROM (
                        SELECT 'stage1_total' as training_category FROM active_advisers WHERE p_stage1_training
                        UNION ALL
                        SELECT 'stage2_total' FROM active_advisers WHERE p_stage2_training
                        UNION ALL
                        SELECT 'stage1_only' FROM active_advisers WHERE p_stage1_training AND NOT p_stage2_training
                        UNION ALL
                        SELECT 'no_training' FROM active_advisers WHERE NOT p_stage1_training AND NOT p_stage2_training
                    ) subquery
                ) categories
                GROUP BY status
            ),
            formation_type AS (
                SELECT 
                    CASE 
                        WHEN p_mfa THEN 'Ministerial'
                        WHEN p_pfa THEN 'Personal'
                        ELSE 'Not Specified'
                    END as type,
                    CASE 
                        WHEN p_mfa THEN 1
                        WHEN p_pfa THEN 2
                        ELSE 3
                    END as sort_order,
                    COUNT(*) as count
                FROM active_advisers
                GROUP BY 
                    CASE 
                        WHEN p_mfa THEN 'Ministerial'
                        WHEN p_pfa THEN 'Personal'
                        ELSE 'Not Specified'
                    END,
                    CASE 
                        WHEN p_mfa THEN 1
                        WHEN p_pfa THEN 2
                        ELSE 3
                    END
                ORDER BY sort_order
            ),
            adviser_type AS (
                SELECT 
                    CASE 
                        WHEN p_ordained THEN 'Ordained'
                        WHEN p_lay THEN 'Lay'
                        ELSE 'Not Specified'
                    END as type,
                    CASE 
                        WHEN p_ordained THEN 1
                        WHEN p_lay THEN 2
                        ELSE 3
                    END as sort_order,
                    COUNT(*) as count
                FROM active_advisers
                GROUP BY 
                    CASE 
                        WHEN p_ordained THEN 'Ordained'
                        WHEN p_lay THEN 'Lay'
                        ELSE 'Not Specified'
                    END,
                    CASE 
                        WHEN p_ordained THEN 1
                        WHEN p_lay THEN 2
                        ELSE 3
                    END
                ORDER BY sort_order
            )
            SELECT json_build_object(
                'age_ranges', (SELECT json_agg(json_build_object('range', range, 'count', count)) FROM age_ranges_grouped),
                'gender', (SELECT json_agg(json_build_object('gender', gender, 'count', count)) FROM gender_stats),
                'training_status', (SELECT json_agg(json_build_object('status', status, 'count', count)) FROM training_status),
                'formation_type', (SELECT json_agg(json_build_object('type', type, 'count', count)) FROM formation_type),
                'adviser_type', (SELECT json_agg(json_build_object('type', type, 'count', count)) FROM adviser_type)
            ) as demographics`;

        const result = await pool.query(query, season ? [season] : []);
        res.json(result.rows[0].demographics);
    } catch (error) {
        console.error('Error fetching adviser demographics:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get adviser engagement by season
router.get('/adviser-engagement', async (req, res) => {
    try {
        const query = `
            WITH adviser_participation AS (
                SELECT 
                    a.id,
                    a.forenames || ' ' || a.surname as adviser_name,
                    calculate_season(p.panel_date) as season,
                    p.panel_type,
                    COUNT(DISTINCT p.id) as event_count
                FROM advisers a
                JOIN panel_attendees pa ON a.id = pa.attendee_id
                JOIN panels p ON pa.panel_id = p.id
                WHERE pa.attendee_type = 'A'
                AND a.active = true
                GROUP BY 
                    a.id,
                    a.forenames,
                    a.surname,
                    calculate_season(p.panel_date),
                    p.panel_type
            ),
            adviser_seasons AS (
                SELECT DISTINCT season 
                FROM adviser_participation 
                ORDER BY season DESC 
                LIMIT 4
            )
            SELECT 
                ap.id,
                ap.adviser_name,
                json_agg(
                    json_build_object(
                        'season', s.season,
                        'panel_count', COALESCE((
                            SELECT event_count 
                            FROM adviser_participation temp 
                            WHERE temp.id = ap.id 
                            AND temp.season = s.season 
                            AND temp.panel_type = 'Panel'
                        ), 0),
                        'carousel_count', COALESCE((
                            SELECT event_count 
                            FROM adviser_participation temp 
                            WHERE temp.id = ap.id 
                            AND temp.season = s.season 
                            AND temp.panel_type = 'Carousel'
                        ), 0)
                    ) ORDER BY s.season DESC
                ) as seasons
            FROM (SELECT DISTINCT id, adviser_name FROM adviser_participation) ap
            CROSS JOIN adviser_seasons s
            GROUP BY ap.id, ap.adviser_name
            ORDER BY ap.adviser_name`;

        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching adviser engagement:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get monthly breakdown statistics
router.get('/monthly-stats', async (req, res) => {
    try {
        const query = `
            WITH panels_with_season AS (
                SELECT *, calculate_season(panel_date) as calculated_season FROM panels
            ),
            monthly_counts AS (
                SELECT 
                    EXTRACT(YEAR FROM panel_date) as year,
                    EXTRACT(MONTH FROM panel_date) as month,
                    COUNT(CASE WHEN panel_type = 'Panel' THEN 1 END) as panel_count,
                    COUNT(CASE WHEN panel_type = 'Carousel' THEN 1 END) as carousel_count,
                    calculated_season as academic_year
                FROM panels_with_season
                GROUP BY EXTRACT(YEAR FROM panel_date), EXTRACT(MONTH FROM panel_date), calculated_season
                ORDER BY year DESC, month DESC
            )
            SELECT 
                academic_year,
                json_agg(
                    json_build_object(
                        'month', month,
                        'panel_count', panel_count,
                        'carousel_count', carousel_count
                    ) ORDER BY year DESC, month DESC
                ) as monthly_data
            FROM monthly_counts
            GROUP BY academic_year
            ORDER BY academic_year DESC
            LIMIT 4;
        `;

        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching monthly stats:', error);
        res.status(500).json({ error: 'Failed to fetch monthly statistics' });
    }
});

// Get monthly candidate attendance
router.get('/monthly-attendance', async (req, res) => {
    try {
        const query = `
            WITH panels_with_season AS (
                SELECT *, calculate_season(panel_date) as calculated_season FROM panels
            ),
            monthly_attendance AS (
                SELECT 
                    EXTRACT(YEAR FROM p.panel_date) as year,
                    EXTRACT(MONTH FROM p.panel_date) as month,
                    COUNT(DISTINCT CASE WHEN p.panel_type = 'Panel' THEN pa.attendee_id END) as panel_candidates,
                    COUNT(DISTINCT CASE WHEN p.panel_type = 'Carousel' THEN pa.attendee_id END) as carousel_candidates,
                    p.calculated_season as academic_year
                FROM panels_with_season p
                LEFT JOIN panel_attendees pa ON p.id = pa.panel_id AND pa.attendee_type = 'C'
                GROUP BY EXTRACT(YEAR FROM p.panel_date), EXTRACT(MONTH FROM p.panel_date), p.calculated_season
                ORDER BY year DESC, month DESC
            )
            SELECT 
                academic_year,
                json_agg(
                    json_build_object(
                        'month', month,
                        'panel_candidates', panel_candidates,
                        'carousel_candidates', carousel_candidates
                    ) ORDER BY year DESC, month DESC
                ) as monthly_data
            FROM monthly_attendance
            GROUP BY academic_year
            ORDER BY academic_year DESC
            LIMIT 4;
        `;

        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching monthly attendance:', error);
        res.status(500).json({ error: 'Failed to fetch monthly attendance statistics' });
    }
});

// Get adviser stats
router.get('/adviser-stats', async (req, res) => {
    const { season } = req.query;
    try {
        const query = `
            WITH panels_with_season AS (
                SELECT *, calculate_season(panel_date) as calculated_season FROM panels
            ),
            active_advisers AS (
                SELECT DISTINCT a.* 
                FROM advisers a 
                JOIN panel_attendees pa ON a.id = pa.attendee_id
                JOIN panels_with_season p ON pa.panel_id = p.id
                WHERE pa.attendee_type = 'A'
                AND a.active = true
                ${season ? 'AND p.calculated_season = $1' : ''}
            ),
            engaged_advisers AS (
                SELECT DISTINCT a.id
                FROM advisers a
                JOIN panel_attendees pa ON a.id = pa.attendee_id
                JOIN panels_with_season p ON pa.panel_id = p.id
                WHERE pa.attendee_type = 'A'
                AND a.active = true
                AND (
                    p.panel_date >= NOW() - INTERVAL '18 months'
                    OR p.panel_date > NOW()
                )
                ${season ? 'AND p.calculated_season = $1' : ''}
            ),
            no_max_values AS (
                SELECT DISTINCT id
                FROM active_advisers
                WHERE (p_max_panels = 0 OR p_max_carousels = 0 OR p_max_panels IS NULL OR p_max_carousels IS NULL)
            ),
            incomplete_profiles AS (
                WITH missing_field_checks AS (
                    SELECT 
                        id,
                        (p_max_panels = 0 OR p_max_carousels = 0 OR p_max_panels IS NULL OR p_max_carousels IS NULL) as missing_max_values,
                        (NOT p_stage1_training AND NOT p_stage2_training) as missing_training,
                        (NOT p_mfa AND NOT p_pfa) as missing_formation,
                        (NOT p_ordained AND NOT p_lay) as missing_type,
                        p_gender IS NULL as missing_gender
                    FROM active_advisers
                    WHERE 
                        p_max_panels = 0 OR p_max_carousels = 0 OR p_max_panels IS NULL OR p_max_carousels IS NULL OR
                        (NOT p_stage1_training AND NOT p_stage2_training) OR
                        (NOT p_mfa AND NOT p_pfa) OR
                        (NOT p_ordained AND NOT p_lay) OR
                        p_gender IS NULL
                )
                SELECT 
                    id,
                    (
                        CASE WHEN missing_max_values THEN 1 ELSE 0 END +
                        CASE WHEN missing_training THEN 1 ELSE 0 END +
                        CASE WHEN missing_formation THEN 1 ELSE 0 END +
                        CASE WHEN missing_type THEN 1 ELSE 0 END +
                        CASE WHEN missing_gender THEN 1 ELSE 0 END
                    ) as missing_fields_count,
                    ARRAY_REMOVE(ARRAY[
                        CASE WHEN missing_max_values THEN 'Maximum Values' END,
                        CASE WHEN missing_training THEN 'Training Status' END,
                        CASE WHEN missing_formation THEN 'Formation Type' END,
                        CASE WHEN missing_type THEN 'Adviser Type' END,
                        CASE WHEN missing_gender THEN 'Gender' END
                    ], NULL) as missing_fields
                FROM missing_field_checks
            ),
            incomplete_profile_stats AS (
                SELECT 
                    missing_fields_count,
                    COUNT(*) as adviser_count,
                    json_agg(json_build_object(
                        'id', id,
                        'missing_fields', missing_fields
                    )) as advisers
                FROM incomplete_profiles
                GROUP BY missing_fields_count
                ORDER BY missing_fields_count DESC
            ),
            training_status AS (
                SELECT 
                    status,
                    COUNT(*) as count
                FROM (
                    SELECT 
                        CASE training_category
                            WHEN 'stage1_total' THEN 'Stage 1 Total'
                            WHEN 'stage2_total' THEN 'Stage 2 Total'
                            WHEN 'stage1_only' THEN 'Stage 1 Only'
                            WHEN 'no_training' THEN 'No Training'
                        END as status
                    FROM (
                        SELECT 'stage1_total' as training_category FROM active_advisers WHERE p_stage1_training
                        UNION ALL
                        SELECT 'stage2_total' FROM active_advisers WHERE p_stage2_training
                        UNION ALL
                        SELECT 'stage1_only' FROM active_advisers WHERE p_stage1_training AND NOT p_stage2_training
                        UNION ALL
                        SELECT 'no_training' FROM active_advisers WHERE NOT p_stage1_training AND NOT p_stage2_training
                    ) subquery
                ) categories
                GROUP BY status
            ),
            formation_type AS (
                SELECT 
                    CASE 
                        WHEN p_mfa THEN 'Ministerial'
                        WHEN p_pfa THEN 'Personal'
                        ELSE 'Not Specified'
                    END as type,
                    CASE 
                        WHEN p_mfa THEN 1
                        WHEN p_pfa THEN 2
                        ELSE 3
                    END as sort_order,
                    COUNT(*) as count
                FROM active_advisers
                GROUP BY 
                    CASE 
                        WHEN p_mfa THEN 'Ministerial'
                        WHEN p_pfa THEN 'Personal'
                        ELSE 'Not Specified'
                    END,
                    CASE 
                        WHEN p_mfa THEN 1
                        WHEN p_pfa THEN 2
                        ELSE 3
                    END
                ORDER BY sort_order
            ),
            adviser_type AS (
                SELECT 
                    CASE 
                        WHEN p_ordained THEN 'Ordained'
                        WHEN p_lay THEN 'Lay'
                        ELSE 'Not Specified'
                    END as type,
                    CASE 
                        WHEN p_ordained THEN 1
                        WHEN p_lay THEN 2
                        ELSE 3
                    END as sort_order,
                    COUNT(*) as count
                FROM active_advisers
                GROUP BY 
                    CASE 
                        WHEN p_ordained THEN 'Ordained'
                        WHEN p_lay THEN 'Lay'
                        ELSE 'Not Specified'
                    END,
                    CASE 
                        WHEN p_ordained THEN 1
                        WHEN p_lay THEN 2
                        ELSE 3
                    END
                ORDER BY sort_order
            )
            SELECT json_build_object(
                'total_advisers', (SELECT COUNT(*) FROM advisers),
                'flagged_active_advisers', (SELECT COUNT(*) FROM active_advisers),
                'engaged_advisers', (SELECT COUNT(*) FROM engaged_advisers),
                'incomplete_profiles', (SELECT COUNT(*) FROM incomplete_profiles),
                'incomplete_profile_stats', (SELECT json_agg(json_build_object('missing_fields_count', missing_fields_count, 'adviser_count', adviser_count, 'advisers', advisers)) FROM incomplete_profile_stats),
                'no_max_values', (SELECT COUNT(*) FROM no_max_values),
                'not_engaged', (
                    SELECT COUNT(*) 
                    FROM active_advisers 
                    WHERE id NOT IN (SELECT id FROM engaged_advisers)
                ),
                'training_status', (SELECT json_agg(json_build_object('status', status, 'count', count)) FROM training_status),
                'formation_type', (SELECT json_agg(json_build_object('type', type, 'count', count)) FROM formation_type),
                'adviser_type', (SELECT json_agg(json_build_object('type', type, 'count', count)) FROM adviser_type)
            ) as stats`;

        const result = await pool.query(query, season ? [season] : []);
        res.json(result.rows[0].stats);
    } catch (error) {
        console.error('Error fetching adviser stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get advisers with specific missing fields
router.get('/adviser-missing-fields', async (req, res) => {
    try {
        const { fields, season, missingFieldsCount } = req.query;
        const fieldsList = fields.split(',');
        
        let query = `
            WITH panels_with_season AS (
                SELECT *, calculate_season(panel_date) as calculated_season FROM panels
            ),
            active_advisers AS (
                SELECT DISTINCT a.* 
                FROM advisers a 
                JOIN panel_attendees pa ON a.id = pa.attendee_id
                JOIN panels_with_season p ON pa.panel_id = p.id
                WHERE pa.attendee_type = 'A'
                AND a.active = true
                ${season ? 'AND p.calculated_season = $1' : ''}
            ),
            missing_fields AS (
                SELECT 
                    a.id,
                    a.forenames || ' ' || a.surname as name,
                    ARRAY_REMOVE(ARRAY[
                        CASE WHEN (a.p_max_panels = 0 OR a.p_max_carousels = 0 OR a.p_max_panels IS NULL OR a.p_max_carousels IS NULL) THEN 'Maximum Values' END,
                        CASE WHEN NOT (a.p_stage1_training OR a.p_stage2_training) THEN 'Training Status' END,
                        CASE WHEN NOT (a.p_mfa OR a.p_pfa) THEN 'Formation Type' END,
                        CASE WHEN NOT (a.p_ordained OR a.p_lay) THEN 'Adviser Type' END,
                        CASE WHEN a.p_gender IS NULL THEN 'Gender' END
                    ], NULL) as missing_fields
                FROM active_advisers a
                WHERE 
                    (a.p_max_panels = 0 OR a.p_max_carousels = 0 OR a.p_max_panels IS NULL OR a.p_max_carousels IS NULL)
                    OR NOT (a.p_stage1_training OR a.p_stage2_training)
                    OR NOT (a.p_mfa OR a.p_pfa)
                    OR NOT (a.p_ordained OR a.p_lay)
                    OR a.p_gender IS NULL
            )
            SELECT id, name, missing_fields
            FROM missing_fields
            WHERE missing_fields && $${season ? '2' : '1'}::text[]
            ${missingFieldsCount ? `AND array_length(missing_fields, 1) = $${season ? '3' : '2'}` : ''}
            ORDER BY name;
        `;

        const queryParams = season 
            ? missingFieldsCount 
                ? [season, fieldsList, parseInt(missingFieldsCount)]
                : [season, fieldsList]
            : missingFieldsCount
                ? [fieldsList, parseInt(missingFieldsCount)]
                : [fieldsList];

        const result = await pool.query(query, queryParams);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get venue locations with panel counts
router.get('/venue-locations', async (req, res) => {
    const { season } = req.query;
    try {
        const query = `
            SELECT 
                pv.name as venue_name,
                COUNT(*) as panel_count,
                CASE
                    WHEN pv.name = 'Woking' THEN json_build_array(51.2454, -0.5616)
                    WHEN pv.name = 'Shallowford' THEN json_build_array(52.9065, -2.1492)
                    WHEN pv.name = 'Wydale' THEN json_build_array(54.2397, -0.5297)
                    WHEN pv.name = 'Pleshey' THEN json_build_array(51.7977, 0.4135)
                    WHEN pv.name = 'Launde' THEN json_build_array(52.6213, -0.8379)
                    WHEN pv.name = 'Ammerdown' THEN json_build_array(51.2856, -2.4139)
                    WHEN pv.name = 'Foxhill' THEN json_build_array(53.2729, -2.7243)
                END as position
            FROM panels p
            JOIN panel_venues pv ON p.venue_id = pv.id
            WHERE pv.name != 'Online'
            ${season ? 'AND public.calculate_season(p.panel_date) = $1' : ''}
            GROUP BY pv.name
            ORDER BY panel_count DESC;
        `;
        
        const result = await pool.query(query, season ? [season] : []);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching venue locations:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get candidate progression times
router.get('/progression-times', async (req, res) => {
    const { season } = req.query;
    try {
        const query = `
            WITH panels_with_season AS (
                SELECT *, calculate_season(panel_date) as calculated_season FROM panels
            ),
            candidate_journey AS (
                SELECT 
                    c.id as attendee_id,
                    MIN(CASE WHEN p.panel_type = 'Carousel' THEN p.panel_date END) as carousel_date,
                    MIN(CASE WHEN p.panel_type = 'Panel' THEN p.panel_date END) as panel_date,
                    MAX(CASE WHEN p.panel_type = 'Carousel' THEN 1 ELSE 0 END) as attended_carousel,
                    MAX(CASE WHEN p.panel_type = 'Panel' THEN 1 ELSE 0 END) as attended_panel
                FROM candidates c
                LEFT JOIN panel_attendees pa ON c.id = pa.attendee_id AND pa.attendee_type = 'C'
                LEFT JOIN panels_with_season p ON pa.panel_id = p.id
                WHERE 1=1 ${season ? 'AND p.calculated_season = $1' : ''}
                GROUP BY c.id
                HAVING MAX(CASE WHEN p.panel_type = 'Carousel' THEN 1 ELSE 0 END) = 1 
                AND MAX(CASE WHEN p.panel_type = 'Panel' THEN 1 ELSE 0 END) = 1
            ),
            all_progressions AS (
                SELECT 
                    attendee_id,
                    carousel_date,
                    panel_date,
                    panel_date - carousel_date as days_between
                FROM candidate_journey
                WHERE carousel_date IS NOT NULL 
                AND panel_date IS NOT NULL
                AND panel_date > carousel_date
                AND panel_date - carousel_date <= 730
            ),
            filtered_records AS (
                SELECT * FROM all_progressions 
                WHERE days_between >= 42
            ),
            distribution AS (
                SELECT 
                    CASE 
                        WHEN days_between <= 90 THEN '6 weeks - 3 months'
                        WHEN days_between <= 180 THEN '3-6 months'
                        WHEN days_between <= 270 THEN '6-9 months'
                        WHEN days_between <= 365 THEN '9-12 months'
                        ELSE 'Over 1 year'
                    END as time_range,
                    COUNT(*) as count,
                    ROUND(COUNT(*)::numeric / (SELECT COUNT(*) FROM filtered_records) * 100, 1) as percentage
                FROM filtered_records
                GROUP BY time_range
            )
            SELECT 
                json_build_object(
                    'summary', (
                        SELECT json_build_object(
                            'avg_days', AVG(days_between),
                            'median_days', PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY days_between),
                            'min_days', MIN(days_between),
                            'max_days', MAX(days_between),
                            'total_candidates', COUNT(*)
                        )
                        FROM filtered_records
                    ),
                    'outliers', (
                        SELECT json_build_object(
                            'total_records', COUNT(*),
                            'filtered_too_short', COUNT(*) FILTER (WHERE days_between < 42),
                            'filtered_too_long', COUNT(*) FILTER (WHERE days_between > 730)
                        )
                        FROM all_progressions
                    ),
                    'distribution', (
                        SELECT json_agg(row_to_json(d))
                        FROM distribution d
                    )
                ) as stats;
        `;
        
        const result = await pool.query(query, season ? [season] : []);
        res.json(result.rows[0].stats);
    } catch (error) {
        console.error('Error fetching progression times:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
