const axios = require("axios");

module.exports = async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'https://wefindthebest.homes');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { cid } = req.query; 
    if (!cid) {
      return res.status(400).json({
        success: false,
        message: "Missing contact id (cid) param"
      });
    }

    const apiKey = process.env.GHL_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: "Missing GHL_API_KEY env variable"
      });
    }

    // Make a request to GHL API to get the contact details
    const ghlUrl = `https://rest.gohighlevel.com/v1/contacts/${cid}?include=customField`;
    const ghlResponse = await axios.get(ghlUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      }
    });

    const contact = ghlResponse.data.contact;
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: `No contact found with id ${cid}`
      });
    }

    const cfArray = contact.customField || [];
    
    // Search through custom fields to find the quality score
    // Using the field ID directly
    const qualityScoreFieldId = '0NBOPMGYmmBJDGqAACk6'; // Quality score field ID
    
    let qualityScore = null;
    const scoreField = cfArray.find(field => field.id === qualityScoreFieldId);
    
    if (scoreField) {
      qualityScore = parseInt(scoreField.value, 10) || 0;
    } else {
      // If not found by ID, try name as fallback
      const scoreByName = cfArray.find(field => field.name === "00__quality_score");
      if (scoreByName) {
        qualityScore = parseInt(scoreByName.value, 10) || 0;
      } else {
        qualityScore = 0; // Default if not found
        console.log("Quality score field not found. Available fields:", 
          cfArray.map(f => `${f.name} (${f.id}): ${f.value}`));
      }
    }

    // Determine the redirect URL based on the score
    let redirectUrl = "https://wefindthebest.homes/next-steps"; // Default for low quality (≤ 10)
    
    if (qualityScore >= 21) { // High quality lead (21-30)
      redirectUrl = "https://wefindthebest.homes/schedule";
    } else if (qualityScore >= 11) { // Lender lead (11-20)
      redirectUrl = "https://wefindthebest.homes/lender";
    }
    // else score is 10 or below, keep default redirectUrl

    res.json({
      success: true,
      data: {
        qualityScore,
        redirectUrl
      }
    });

  } catch (err) {
    console.error("Detailed error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.toString()
    });
  }
};
