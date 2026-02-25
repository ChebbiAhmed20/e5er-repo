# Backend License API Reference

This document describes the license activation endpoint that must be implemented in your backend (`dentist-api`).

## Endpoint: POST /api/license/activate

### Request

```http
POST /api/license/activate
Content-Type: application/json

{
  "key": "CLINIC-XXXX-XXXX",
  "machineId": "abc123def456..."
}
```

### Request Validation

1. Validate license key format and existence in database
2. Check if license is active and not expired
3. Verify seat count (if multi-seat license)
4. Optionally validate machineId (for device binding)

### Response (Success)

```json
{
  "token": {
    "clinicId": "clinic-123",
    "machineId": "abc123def456...",
    "validUntil": "2026-12-31T23:59:59Z",
    "gracePeriodDays": 7,
    "features": ["patients", "appointments", "billing", "analytics"],
    "issuedAt": "2026-02-02T10:00:00Z"
  },
  "signature": "base64-encoded-rsa-signature"
}
```

### Response (Error)

```json
{
  "error": "Invalid license key"
}
```

## Token Signing

### Generate RSA Key Pair

```bash
# Generate private key
openssl genrsa -out license-private.pem 2048

# Extract public key
openssl rsa -in license-private.pem -pubout -out license-public.pem
```

### Sign Token (Node.js)

```javascript
const crypto = require('crypto');
const fs = require('fs');

const privateKey = fs.readFileSync('license-private.pem', 'utf8');
const token = {
  clinicId: 'clinic-123',
  machineId: 'abc123...',
  validUntil: '2026-12-31T23:59:59Z',
  gracePeriodDays: 7,
  features: ['patients', 'appointments'],
  issuedAt: new Date().toISOString()
};

const sign = crypto.createSign('SHA256');
sign.update(JSON.stringify(token));
sign.end();

const signature = sign.sign(privateKey, 'base64');
```

### Verify Token (Electron)

The Electron app uses the public key (embedded in `modules/licensing.js`) to verify signatures locally, without network access.

## Example Implementation

### Express Route

```javascript
// routes/license.routes.js
const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const router = express.Router();

const privateKey = fs.readFileSync(process.env.LICENSE_PRIVATE_KEY_PATH, 'utf8');

router.post('/activate', async (req, res) => {
  try {
    const { key, machineId } = req.body;
    
    // Validate input
    if (!key || !machineId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Look up license in database
    const license = await db.query(
      'SELECT * FROM licenses WHERE key = $1',
      [key]
    );
    
    if (!license.rows[0]) {
      return res.status(404).json({ error: 'Invalid license key' });
    }
    
    const licenseData = license.rows[0];
    
    // Check if license is active
    if (licenseData.status !== 'active') {
      return res.status(403).json({ error: 'License is not active' });
    }
    
    // Check expiration
    if (new Date(licenseData.expires_at) < new Date()) {
      return res.status(403).json({ error: 'License has expired' });
    }
    
    // Build token
    const token = {
      clinicId: licenseData.clinic_id,
      machineId: machineId,
      validUntil: licenseData.expires_at.toISOString(),
      gracePeriodDays: 7,
      features: licenseData.features || ['patients', 'appointments', 'billing'],
      issuedAt: new Date().toISOString()
    };
    
    // Sign token
    const sign = crypto.createSign('SHA256');
    sign.update(JSON.stringify(token));
    sign.end();
    const signature = sign.sign(privateKey, 'base64');
    
    // Return token and signature
    res.json({
      token,
      signature
    });
    
  } catch (error) {
    console.error('License activation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
```

### Database Schema

```sql
CREATE TABLE licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(50) UNIQUE NOT NULL,
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  expires_at TIMESTAMP NOT NULL,
  features JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_licenses_key ON licenses(key);
CREATE INDEX idx_licenses_clinic_id ON licenses(clinic_id);
```

## Security Considerations

1. **Rate Limiting** - Limit activation attempts per IP/key
2. **Key Format** - Use strong, unique license keys
3. **Token Expiry** - Set reasonable expiration dates
4. **Machine Binding** - Optionally restrict to specific machines
5. **Audit Logging** - Log all activation attempts
6. **Key Storage** - Store private key securely (env var, key management service)

## Testing

### Test Activation

```bash
curl -X POST http://localhost:3000/api/license/activate \
  -H "Content-Type: application/json" \
  -d '{
    "key": "CLINIC-TEST-1234",
    "machineId": "test-machine-123"
  }'
```

### Verify Signature (Node.js)

```javascript
const crypto = require('crypto');
const publicKey = fs.readFileSync('license-public.pem', 'utf8');

const verify = crypto.createVerify('SHA256');
verify.update(JSON.stringify(token));
verify.end();

const isValid = verify.verify(publicKey, signature, 'base64');
console.log('Signature valid:', isValid);
```

## Integration with Electron

The Electron app (`electron/modules/licensing.js`) will:

1. Call this endpoint with license key and machine ID
2. Receive token and signature
3. Verify signature locally using embedded public key
4. Store encrypted token locally
5. Validate token on each app launch (offline)

No network required after initial activation (until token expires).
