require('dotenv').config(); // Load environment variables

const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors({ origin: '*' }));

// Retrieve values from environment variables
const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const redirect_uri = process.env.REDIRECT_URI;
const scope = process.env.SCOPE;

// Store access token and tenant ID in memory for simplicity; use a secure store for production
let accessToken = '';
let xeroTenantId = '';
app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.get('/auth', (req, res) => {
  const authUrl = `https://login.xero.com/identity/connect/authorize?response_type=code&client_id=${client_id}&redirect_uri=${redirect_uri}&scope=${scope}`;
  res.redirect(authUrl);
});

app.get('/callback', async (req, res) => {
  const { code } = req.query;
  console.log('Authorization Code:', code);
  
  try {
    // Exchange authorization code for access token
    const response = await axios.post('https://identity.xero.com/connect/token', new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirect_uri,
      client_id: client_id,
      client_secret: client_secret,
    }).toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    accessToken = response.data.access_token;
    console.log('Access Token:', accessToken);

    // Fetch tenant ID
    const connectionsResponse = await axios.get('https://api.xero.com/connections', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    // Assuming the first connection is the desired tenant
    xeroTenantId = connectionsResponse.data[0].tenantId;
    console.log('Xero Tenant ID:', xeroTenantId);

    // Redirect to frontend with the access token and tenant ID
    res.redirect(`http://localhost:3000/callback?access_token=${accessToken}&xero_tenant_id=${xeroTenantId}`);
  } catch (error) {
    console.error('Error fetching access token or tenant ID:', error.response?.data || error.message);
    res.status(500).send('Error fetching access token or tenant ID.');
  }
});

app.get('/invoices', async (req, res) => {
  try {
    const response = await axios.get('https://api.xero.com/api.xro/2.0/Reports/ProfitAndLoss', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Xero-Tenant-Id': xeroTenantId,  // Include tenant ID in the request headers
      },
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response ? error.response.status : 500).send(error.message);
  }
});

app.listen(5000, () => console.log('Server running on http://localhost:5000'));
