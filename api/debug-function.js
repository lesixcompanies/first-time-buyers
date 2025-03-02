const axios = require("axios");

module.exports = async function handler(req, res) {
  // Add CORS headers - specifically allowing your domain
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

    // Debug log
    console.log(`Processing request for contact ID: ${cid}`);

    const apiKey = process.env.GHL_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: "Missing GHL_API_KEY env variable"
      });
    }

    // Make a request to GHL API to get the contact details
    const ghlUrl = `https://rest.gohighlevel.com/v1/contacts/${cid}?include=customField`;
    console.log(`Fetching from GHL URL: ${ghlUrl}`);
    
    const ghlResponse = await axios.get(ghlUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      }
    });

    console.log(`GHL response status: ${ghlResponse.status}`);

    const contact = ghlResponse.data.contact;
    if (!contact) {
      console.log("No contact found in response");
      return res.status(404).json({
        success: false,
        message: `No contact found with id ${cid}`
      });
    }

    console.log(`Found contact: ${contact.firstName} ${contact.lastName}`);

    const cfArray = contact.customField || [];
    console.log(`Found ${cfArray.length} custom fields`);
    
    // Using the direct field ID
    const qualityScoreFieldId = '0NBOPMGYmmBJDGqAACk6';
    console.log(`Looking for quality score field with ID: ${qualityScoreFieldId}`);
    
    // Find the field and get the value
    const scoreField = cfArray.find(field => field.id === qualityScoreFieldId);
    
    let qualityScore = 0;
    if (scoreField) {
      console.log(`Found field: ${scoreField.id}, Name: ${scoreField.name}, Value: ${scoreField.value}`);
      qualityScore = parseInt(scoreField.value, 10) || 0;
    } else {
      console.log(`Field with ID ${qualityScoreFieldId} not found!`);
      console.log("Available fields:", cfArray.map(f => `${f.id}: ${f.name} = ${f.value}`));
    }

    console.log(`Final quality score: ${qualityScore}`);

    // Determine the redirect URL based on the score
    let redirectUrl = "https://wefindthebest.homes/next-steps"; // Default for low quality (≤ 9)
    
    if (qualityScore >= 21) { // High quality lead (21-30)
      redirectUrl = "https://wefindthebest.homes/schedule";
      console.log(`Score ${qualityScore} >= 21, redirecting to schedule page`);
    } else if (qualityScore >= 10) { // Lender lead (10-20)
      redirectUrl = "https://wefindthebest.homes/lender";
      console.log(`Score ${qualityScore} >= 10, redirecting to lender page`);
    } else {
      console.log(`Score ${qualityScore} < 10, redirecting to next-steps page`);
    }

    console.log(`Final redirect URL: ${redirectUrl}`);

    res.json({
      success: true,
      data: {
        contactName: `${contact.firstName} ${contact.lastName}`,
        qualityScore,
        redirectUrl,
        allFields: cfArray.map(f => ({ id: f.id, name: f.name, value: f.value }))
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
