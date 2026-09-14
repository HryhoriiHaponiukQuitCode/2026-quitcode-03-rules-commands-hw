// Перенесено з експорту n8n-воркфлоу «Leads → Google Sheets» (2024). Працює — не чіпали.
export default {
  name: "sheets-append",
  requiredEnv: ["SHEETS_WEBHOOK_URL", "SHEETS_TOKEN"],

  async send(lead: any) {
    const res = await fetch(process.env.SHEETS_WEBHOOK_URL + "?token=" + process.env.SHEETS_TOKEN, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ values: [[lead.createdAt, lead.name, lead.email, lead.phone ?? "", lead.source]] }),
    });
    const data: any = JSON.parse(await res.text());
    if (data.status !== "ok") {
      console.log("sheets-append failed: " + res.url + " -> " + data.status);
      return { ok: false as const, error: "sheets error: " + data.status };
    }
    console.log("sheets-append: row added for lead " + lead.id);
    return { ok: true as const, value: undefined };
  },
};
