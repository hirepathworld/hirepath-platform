export default async (req) => {
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  try {
    const body = await req.json();

    const full_name = String(body.full_name || "").trim();
    const email = String(body.email || "").trim();
    const phone = String(body.phone || "").trim();
    const service = String(body.service || "").trim();

    if (!full_name || !email) {
      return new Response(
        JSON.stringify({ error: "Name and email are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    if (
      full_name.length > 150 ||
      email.length > 254 ||
      phone.length > 30 ||
      service.length > 150
    ) {
      return new Response(
        JSON.stringify({ error: "Input is too long" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Server configuration is missing");
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/crm_leads`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Prefer": "return=minimal"
        },
        body: JSON.stringify({
          full_name,
          email,
          phone,
          service,
          lead_source: "Website",
          status: "New"
        })
      }
    );

    if (!response.ok) {
      console.error("Supabase insert failed:", response.status);

      return new Response(
        JSON.stringify({ error: "Unable to save enquiry" }),
        {
          status: 502,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Enquiry received successfully"
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Lead submission failed:", error.message);

    return new Response(
      JSON.stringify({ error: "Something went wrong" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};
