const axios = require("axios");

module.exports = async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
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
    
    // Map custom fields to a more readable format
    const customFields = cfArray.map(field => ({
      id: field.id,
      name: field.name,
      value: field.value,
      // If this field might be the quality score, highlight it
      potentialMatch: 
        field.name?.includes("quality") || 
        field.name?.includes("score") || 
        field.name?.includes("00__") ||
        (typeof field.value === 'string' && !isNaN(parseInt(field.value)) && parseInt(field.value) <= 30)
    }));

    // Sort potential matches first
    customFields.sort((a, b) => {
      if (a.potentialMatch && !b.potentialMatch) return -1;
      if (!a.potentialMatch && b.potentialMatch) return 1;
      return 0;
    });

    res.json({
      success: true,
      contactName: contact.name,
      contactEmail: contact.email,
      customFields
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