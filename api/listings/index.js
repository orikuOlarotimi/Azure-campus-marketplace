/**
 * Campus Marketplace — Azure Functions Backend
 * GET  /api/listings  → returns all listings from Cosmos DB
 * POST /api/listings  → saves a new listing to Cosmos DB
 *
 * Runtime: Node.js 18 LTS
 * Cosmos DB API: Core (SQL)
 * Partition key: /category
 */

const { CosmosClient } = require('@azure/cosmos');

/* ── Cosmos DB connection (set these in Azure Portal → Function App → Configuration) ── */
const COSMOS_ENDPOINT   = process.env.COSMOS_DB_ENDPOINT;
const COSMOS_KEY        = process.env.COSMOS_DB_KEY;
const DATABASE_ID       = process.env.COSMOS_DB_DATABASE  || 'campus-marketplace';
const CONTAINER_ID      = process.env.COSMOS_DB_CONTAINER || 'listings';

/* Lazy singleton client */
let _container = null;
async function getContainer() {
  if (_container) return _container;
  const client = new CosmosClient({ endpoint: COSMOS_ENDPOINT, key: COSMOS_KEY });
  const db     = client.database(DATABASE_ID);
  _container   = db.container(CONTAINER_ID);
  return _container;
}

/* ── Validation rules (matches plan Section 7) ── */
const RULES = {
  title:       { required: true,  maxLength: 120 },
  category:    { required: true,  allowedValues: ['For Sale', 'Lost & Found'] },
  description: { required: true,  maxLength: 600 },
  contact:     { required: false, maxLength: 80  },
};

function validateBody(body) {
  const errors = [];

  for (const [field, rule] of Object.entries(RULES)) {
    const value = (body[field] || '').toString().trim();

    if (rule.required && !value) {
      errors.push(`"${field}" is required.`);
      continue;
    }
    if (rule.maxLength && value.length > rule.maxLength) {
      errors.push(`"${field}" must be ${rule.maxLength} characters or fewer.`);
    }
    if (rule.allowedValues && value && !rule.allowedValues.includes(value)) {
      errors.push(`"${field}" must be one of: ${rule.allowedValues.join(', ')}.`);
    }
  }

  return errors;
}

/* ── Main HTTP handler ── */
module.exports = async function (context, req) {
  context.log(`[listings] ${req.method} ${req.url}`);

  /* CORS headers — Azure SWA routes /api/* internally, but kept for local dev */
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  /* Handle preflight */
  if (req.method === 'OPTIONS') {
    context.res = { status: 204, headers: corsHeaders, body: '' };
    return;
  }

  try {
    const container = await getContainer();

    /* ─── GET: return all listings ─── */
    if (req.method === 'GET') {
      const { resources } = await container.items
        .query('SELECT * FROM c ORDER BY c._ts DESC')
        .fetchAll();

      context.res = {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        body: JSON.stringify({ listings: resources }),
      };
      return;
    }

    /* ─── POST: save a new listing ─── */
    if (req.method === 'POST') {
      const body = req.body || {};

      const errors = validateBody(body);
      if (errors.length) {
        context.res = {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          body: JSON.stringify({ error: errors.join(' ') }),
        };
        return;
      }

      /* Build the document to store */
      const doc = {
        id:          generateId(),
        title:       body.title.trim(),
        category:    body.category.trim(),
        description: body.description.trim(),
        contact:     (body.contact || '').trim(),
        postedAt:    new Date().toISOString(),
      };

      const { resource } = await container.items.create(doc);

      context.res = {
        status: 201,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        body: JSON.stringify(resource),
      };
      return;
    }

    /* ─── Method not allowed ─── */
    context.res = {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      body: JSON.stringify({ error: 'Method not allowed.' }),
    };

  } catch (err) {
    context.log.error('[listings] Unhandled error:', err);
    context.res = {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      body: JSON.stringify({ error: 'Internal server error. Please try again.' }),
    };
  }
};

/* ── Helpers ── */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
