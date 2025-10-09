import { getMemoryDetails, summarizeText } from './utils.js';
import { createClient } from '@supabase/supabase-js';
console.log("🔍 Using Supabase URL:", process.env.SUPABASE_URL);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { memoryId } = req.body;
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) return res.status(401).json({ error: "Unauthorized: no token provided." });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY, // ✅ correct one
  { global: { headers: { Authorization: `Bearer ${token}` } } }
);

const { data: { user }, error: authError } = await supabase.auth.getUser(token);
if (authError || !user) {
  console.error("❌ Auth error:", authError?.message);
  return res.status(401).json({ error: "Unauthorized: invalid token." });
}


  if (!memoryId) return res.status(400).json({ error: "Memory ID is required." });

  try {
    const memory = await getMemoryDetails(memoryId, supabase);
    const { title, description, tags, location } = memory;

    const summary = await summarizeText(title, description, tags, location);
    return res.status(200).json({ summary });

  } catch (error) {
    console.error("Summarization error:", error);
    return res.status(500).json({ error: "Failed to summarize memory." });
  }
}
