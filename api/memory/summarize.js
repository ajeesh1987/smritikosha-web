// /api/memory/summarize.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = req.headers.authorization?.split(' ')[1];
  const { memoryId } = req.body;

  if (!memoryId) {
    return res.status(400).json({ error: "Memory ID is required." });
  }

  try {
    // Forward the request internally to summarizeText.js
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/memory/summarizeText`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ memoryId }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Summarization failed");
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error("❌ Summarize proxy error:", err);
    return res.status(500).json({ error: err.message });
  }
}
