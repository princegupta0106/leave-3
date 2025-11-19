export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageBase64, apiKey } = req.body;

    if (!imageBase64 || !apiKey) {
      return res.status(400).json({ error: 'Missing imageBase64 or apiKey' });
    }

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(imageBase64.split(',')[1], 'base64');

    // Create FormData for the Remove.bg API
    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: 'image/png' });
    formData.append('image_file', blob);
    formData.append('size', 'auto');

    // Make request to Remove.bg API
    const response = await fetch('https://api.remove.bg/v1/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ 
        error: 'Remove.bg API error',
        details: errorText,
        status: response.status 
      });
    }

    // Get the processed image
    const resultBuffer = await response.arrayBuffer();
    const resultBase64 = Buffer.from(resultBuffer).toString('base64');

    // Return the processed image as base64
    res.status(200).json({
      success: true,
      image: `data:image/png;base64,${resultBase64}`
    });

  } catch (error) {
    console.error('Remove.bg proxy error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}