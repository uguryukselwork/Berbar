import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const HAIRSTYLE_PROMPTS: Record<string, string> = {
  "Fade": "a professional fade haircut with clean tapered sides and back",
  "Buzz Cut": "a short buzz cut with uniform length all around",
  "Undercut": "a modern undercut hairstyle with short sides and longer top",
  "Pompadour": "a classic pompadour hairstyle with volume on top swept back",
  "Crew Cut": "a traditional crew cut with short sides and slightly longer top",
  "Side Part": "a classic side part hairstyle with neat combed hair",
  "Mohawk": "a bold mohawk hairstyle with shaved sides and tall center strip",
  "Long Waves": "long wavy hair with natural flowing texture",
};

interface RequestBody {
  image_url: string;
  hairstyle: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const FAL_API_KEY = Deno.env.get("FAL_API_KEY");

    if (!FAL_API_KEY) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "FAL_API_KEY not configured",
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { image_url, hairstyle }: RequestBody = await req.json();

    if (!image_url || !hairstyle) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing image_url or hairstyle",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const hairstylePrompt = HAIRSTYLE_PROMPTS[hairstyle] || hairstyle;

    const prompt = `Professional hairstyle: ${hairstylePrompt}. Keep the exact same face, facial features, skin tone, and identity. Only change the hairstyle. High quality, realistic, professional barber result.`;

    const falResponse = await fetch("https://fal.run/fal-ai/recraft-v3", {
      method: "POST",
      headers: {
        "Authorization": `Key ${FAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: prompt,
        image_url: image_url,
        style: "realistic_image",
        size: "square_hd",
        sync_mode: true,
      }),
    });

    if (!falResponse.ok) {
      const errorData = await falResponse.text();
      console.error("FAL API Error:", errorData);

      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to process image with AI",
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const result = await falResponse.json();

    const imageUrl = result.images?.[0]?.url || result.image?.url;

    if (!imageUrl) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No image generated",
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        image_url: imageUrl,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in style-preview function:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
