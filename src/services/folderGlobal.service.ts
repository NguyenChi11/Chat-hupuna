export async function folderGlobalApi(payload: Record<string, unknown>) {
  try {
    const res = await fetch('/api/folders-global', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch {
    return null;
  }
}
