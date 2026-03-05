import crypto from 'crypto'

// Configuration - set these in Vercel Environment Variables
// PRIVATE_KEY: Your RSA private key (paste the entire PEM content)
// MIN_VERSION: Minimum allowed version (e.g., "2.0.0") - optional
// BLOCKED_VERSIONS: Comma-separated list of blocked versions (e.g., "1.0.0,1.1.0") - optional

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { nonce, version, timeWindow, platform, arch } = req.body

    if (!nonce || !version || timeWindow === undefined) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Check if version is blocked
    const blockedVersions = (process.env.BLOCKED_VERSIONS || '').split(',').filter(Boolean)
    if (blockedVersions.includes(version)) {
      return res.status(200).json({
        blocked: true,
        message: 'This version is no longer supported. Please update.',
        minVersion: process.env.MIN_VERSION || null
      })
    }

    // Check minimum version requirement
    const minVersion = process.env.MIN_VERSION
    if (minVersion && !meetsMinimumVersion(version, minVersion)) {
      return res.status(200).json({
        blocked: true,
        message: `Please update to version ${minVersion} or later.`,
        minVersion
      })
    }

    // Get private key from environment
    const privateKeyPem = process.env.PRIVATE_KEY
    if (!privateKeyPem) {
      console.error('PRIVATE_KEY environment variable not set')
      return res.status(500).json({ error: 'Server configuration error' })
    }

    // Create the message to sign
    const message = `${nonce}:${version}:${timeWindow}`

    // Sign the message
    const sign = crypto.createSign('SHA256')
    sign.update(message)
    sign.end()

    const signature = sign.sign(privateKeyPem, 'base64')

    // Log the verification (for analytics)
    console.log(`License verified: version=${version}, platform=${platform}, arch=${arch}`)

    return res.status(200).json({
      signature,
      minVersion: minVersion || null
    })
  } catch (error) {
    console.error('Verification error:', error)
    return res.status(500).json({ error: 'Verification failed' })
  }
}

function meetsMinimumVersion(current, minimum) {
  const currentParts = current.split('.').map(Number)
  const minParts = minimum.split('.').map(Number)

  for (let i = 0; i < 3; i++) {
    const c = currentParts[i] || 0
    const m = minParts[i] || 0
    if (c > m) return true
    if (c < m) return false
  }
  return true
}
