import { Code, Terminal } from 'lucide-react'

export function WebhookVerificationDocs() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-white/[0.06] pb-2">
        <Code className="h-4 w-4 text-blue-400" />
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Signature Verification</span>
      </div>

      <p className="text-xs leading-relaxed text-gray-400">
        Every webhook request includes an <code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-xs text-blue-300">X-Signature</code> header containing an HMAC-SHA256 signature of the raw request body. Use your webhook secret to verify the signature before processing the payload.
      </p>

      <div className="rounded-xl border border-white/[0.06] bg-black/30 p-4">
        <div className="mb-2 flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-xs font-medium text-emerald-400">Node.js / TypeScript</span>
        </div>
        <pre className="overflow-x-auto text-xs leading-relaxed text-gray-300"><code>{`import { createHmac, timingSafeEqual } from 'crypto'

function verifyWebhookSignature(
  rawBody: Buffer,
  signature: string,
  secret: string
): boolean {
  const expected = createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')

  return timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  )
}`}</code></pre>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-black/30 p-4">
        <div className="mb-2 flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-xs font-medium text-emerald-400">Python</span>
        </div>
        <pre className="overflow-x-auto text-xs leading-relaxed text-gray-300"><code>{`import hmac
import hashlib

def verify_webhook_signature(
    raw_body: bytes,
    signature: str,
    secret: str
) -> bool:
    expected = hmac.new(
        secret.encode(),
        raw_body,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)`}</code></pre>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-black/30 p-4">
        <div className="mb-2 flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-xs font-medium text-emerald-400">Go</span>
        </div>
        <pre className="overflow-x-auto text-xs leading-relaxed text-gray-300"><code>{`import (
  "crypto/hmac"
  "crypto/sha256"
  "encoding/hex"
)

func VerifySignature(
  payload []byte,
  secret string,
  signature string,
) bool {
  mac := hmac.New(sha256.New, []byte(secret))
  mac.Write(payload)
  expected := hex.EncodeToString(mac.Sum(nil))
  return hmac.Equal(
    []byte(expected),
    []byte(signature),
  )
}`}</code></pre>
      </div>

      <div className="mt-3 rounded-lg border border-amber-500/15 bg-amber-500/5 p-3">
        <p className="text-xs text-amber-400/80">
          <strong className="text-amber-300">Security tip:</strong> Always use a constant-time comparison function (like <code className="rounded bg-white/[0.06] px-1 font-mono text-xs text-amber-300">timingSafeEqual</code> or <code className="rounded bg-white/[0.06] px-1 font-mono text-xs text-amber-300">compare_digest</code>) when verifying signatures. This prevents timing attacks.
        </p>
      </div>
    </div>
  )
}
