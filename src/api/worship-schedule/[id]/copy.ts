export async function POST(req: Request) {
  const { source_panel_id } = await req.json();
  const panelId = req.url.split('/').slice(-2)[0];

  // Fetch the source panel's worship schedule
  const sourceSchedule = await db.query(
    'SELECT * FROM worship_schedule WHERE panel_id = $1',
    [source_panel_id]
  );

  // Copy the schedule to the target panel
  await db.query(
    'INSERT INTO worship_schedule (panel_id, season, services) VALUES ($1, $2, $3)',
    [panelId, sourceSchedule.season, sourceSchedule.services]
  );

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
} 