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

    const prompt = `A professional portrait photo of a person with ${hairstylePrompt}, maintaining facial features, high quality, well-lit, front facing, realistic, photorealistic, professional barber shop quality`;

    const falResponse = await fetch("https://fal.run/fal-ai/flux-pro/v1.1/redux", {
      method: "POST",
      headers: {
        "Authorization": `Key ${FAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: prompt,
        image_url: image_url,
        image_size: "square_hd",
        num_inference_steps: 28,
        guidance_scale: 3.5,
        num_images: 1,
        enable_safety_checker: true,
        output_format: "jpeg",
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
