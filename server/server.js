const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const axios = require("axios");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());

const PORT = process.env.PORT || 3000;
const GRAPH_URL = "https://graph.facebook.com/v26.0";

// --------------------------------------------------
// Health check
// --------------------------------------------------

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Meta Lead Ads backend is running",
  });
});

// --------------------------------------------------
// Fetch leads
// --------------------------------------------------

app.get("/leads", async (req, res) => {
  try {
    const formId = process.env.FORM_ID;

    if (!formId) {
      return res.status(400).json({
        error: "FORM_ID is missing from .env",
      });
    }

    const response = await axios.get(
      `${GRAPH_URL}/${formId}/leads`,
      {
        params: {
          fields: "id,created_time,field_data,form_id",
          access_token: process.env.PAGE_ACCESS_TOKEN,
        },
      }
    );

    console.log("Leads fetched:");
    console.log(JSON.stringify(response.data, null, 2));

    res.json(response.data);
  } catch (error) {
    console.error(
      "Error fetching leads:",
      error.response?.data || error.message
    );

    res.status(500).json({
      error: "Failed to fetch leads",
      details: error.response?.data || error.message,
    });
  }
});

// --------------------------------------------------
// Meta webhook verification
// --------------------------------------------------

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (
    mode === "subscribe" &&
    token === process.env.VERIFY_TOKEN
  ) {
    console.log("Webhook verified successfully");
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

// --------------------------------------------------
// Meta sends lead events here
// --------------------------------------------------

app.post("/webhook", async (req, res) => {

  const receivedAt = Date.now();

  console.log("Meta webhook received:");

  console.log(JSON.stringify(req.body, null, 2));

  // Respond immediately to Meta
  res.sendStatus(200);

  console.log(
    `Webhook response sent in ${Date.now() - receivedAt} ms`
  );

  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];

    if (change?.field !== "leadgen") {
      return;
    }

    const leadgenId = change.value?.leadgen_id;
    const formId = change.value?.form_id;

    if (!leadgenId) {
      console.log("No leadgen_id found");
      return;
    }

    console.log("Lead ID:", leadgenId);
    console.log("Form ID:", formId);

    // --------------------------------------------------
    // Retrieve lead from the form's leads
    // --------------------------------------------------

    try {
      const response = await axios.get(
        `${GRAPH_URL}/${formId}/leads`,
        {
          params: {
            fields: "id,created_time,field_data,form_id",
            access_token: process.env.PAGE_ACCESS_TOKEN,
          },
        }
      );

      const leads = response.data.data || [];

      console.log("Leads returned by Meta:");
      console.log(JSON.stringify(leads, null, 2));

      // Find the lead that triggered this webhook
      const lead = leads.find(
        (item) => item.id === leadgenId
      );

      if (!lead) {
        console.log(
          "Lead event received, but matching lead was not found."
        );
        return;
      }

      console.log("Retrieved lead:");
      console.log(JSON.stringify(lead, null, 2));

      // Send lead to React Native
      sendToClients({
        type: "NEW_LEAD",
        lead,
      });

    } catch (error) {
      console.error(
        "Error retrieving lead:",
        error.response?.data || error.message
      );
    }

  } catch (error) {
    console.error(
      "Webhook processing error:",
      error.message
    );
  }
});

// --------------------------------------------------
// Send message to all connected React Native apps
// --------------------------------------------------

function sendToClients(message) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

// --------------------------------------------------
// React Native WebSocket connections
// --------------------------------------------------

wss.on("connection", (ws) => {
  console.log("React Native app connected");

  ws.send(
    JSON.stringify({
      type: "CONNECTED",
      message: "Connected to Meta Lead backend",
    })
  );

  ws.on("close", () => {
    console.log("React Native app disconnected");
  });
});

// --------------------------------------------------
// Start server
// --------------------------------------------------

server.listen(PORT, () => {
  console.log(
    `Server running on http://localhost:${PORT}`
  );

  console.log("Configuration:");

  console.log(
    "PAGE_ID:",
    process.env.PAGE_ID ? "✓" : "✗"
  );

  console.log(
    "FORM_ID:",
    process.env.FORM_ID ? "✓" : "✗"
  );

  console.log(
    "PAGE_ACCESS_TOKEN:",
    process.env.PAGE_ACCESS_TOKEN ? "✓" : "✗"
  );

  console.log(
    "VERIFY_TOKEN:",
    process.env.VERIFY_TOKEN ? "✓" : "✗"
  );
});