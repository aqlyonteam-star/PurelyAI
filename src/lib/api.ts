

export const aiFetch = async (url: string, options: any) => {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    let data: any = {};
    try { data = JSON.parse(text); } catch(e) {}
    if (data.fallbackMessages) {
      throw new Error(data.error || 'Server Error');
    }
    return new Response(JSON.stringify({ error: data.error || 'Server Error' }), { status: res.status });
  }
  return res;
};
