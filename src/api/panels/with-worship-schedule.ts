export async function GET() {
  try {
    const result = await db.query(`
      SELECT p.id, p.panel_name, p.panel_date, p.panel_type
      FROM worship_schedule ws
      JOIN panels p ON ws.panel_id = p.id
      ORDER BY p.panel_date DESC
    `);

    return new Response(JSON.stringify(result.rows), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching panels with worship schedule:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch panels' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 