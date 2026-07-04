package middleware

import (
	"log"
	"net/http"

	"github.com/klauspost/compress/gzhttp"
)

// compressibleTypes defines MIME types that benefit from compression.
var compressibleTypes = []string{
	"application/json",
	"application/xml",
	"text/html",
	"text/css",
	"text/javascript",
	"text/plain",
	"text/xml",
	"image/svg+xml",
}

// ResponseCompression adds gzip compression to responses when the client
// supports it (Accept-Encoding: gzip). Only compresses responses larger
// than 1KB that have a compressible content type.
func ResponseCompression(next http.Handler) http.Handler {
	wrapper, err := gzhttp.NewWrapper(
		gzhttp.ContentTypes(compressibleTypes),
		gzhttp.MinSize(1024),           // don't compress <1KB
		gzhttp.CompressionLevel(6),     // good ratio (DefaultCompression)
	)
	if err != nil {
		log.Printf("[WARN] failed to initialize gzip compression: %v, serving uncompressed", err)
		return next
	}
	return wrapper(next)
}
