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
    const prompt = `Transform this person's hairstyle to: ${hairstylePrompt}. Maintain the same face, features, and appearance. Professional haircut, realistic result.`;

    const hfResponse = await fetch(
      "https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            negative_prompt: "blurry, low quality, distorted face, different person",
            num_inference_steps: 30,
          },
        }),
      }
    );

    if (!hfResponse.ok) {
      const errorText = await hfResponse.text();
      console.error("Hugging Face API Error:", errorText);

      return new Response(
        JSON.stringify({
          success: false,
          error: "AI processing failed. Please try again in a moment.",
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

    const imageBlob = await hfResponse.blob();
    const imageArrayBuffer = await imageBlob.arrayBuffer();
    const imageBase64Result = btoa(
      String.fromCharCode(...new Uint8Array(imageArrayBuffer))
    );

    return new Response(
      JSON.stringify({
        success: true,
        image_url: `data:image/jpeg;base64,${imageBase64Result}`,
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
