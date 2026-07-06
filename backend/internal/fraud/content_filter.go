package fraud

import (
	"regexp"
	"strings"
	"unicode"
)

// ContentCategory classifies the type of sensitive content detected.
type ContentCategory string

const (
	CategoryProfanity     ContentCategory = "profanity"
	CategoryPII           ContentCategory = "pii_leak"
	CategoryPhishing      ContentCategory = "phishing"
	CategorySpam          ContentCategory = "spam"
	CategoryGambling      ContentCategory = "gambling"
	CategoryAdultContent  ContentCategory = "adult_content"
	CategoryDrugRelated   ContentCategory = "drug_related"
	CategoryHateSpeech    ContentCategory = "hate_speech"
	CategoryScam          ContentCategory = "scam"
)

// ContentViolation represents a single detected content violation.
type ContentViolation struct {
	Category ContentCategory
	Pattern  string
	Weight   float64 // 0.0-1.0 severity
}

// ContentFilter scans message text and sender for sensitive/prohibited content.
type ContentFilter struct {
	// Compiled regex patterns organized by category.
	profanityPatterns    []*regexp.Regexp
	phishingPatterns     []*regexp.Regexp
	spamPatterns         []*regexp.Regexp
	gamblingPatterns     []*regexp.Regexp
	adultPatterns        []*regexp.Regexp
	drugPatterns         []*regexp.Regexp
	hatePatterns         []*regexp.Regexp
	scamPatterns         []*regexp.Regexp
}

// NewContentFilter creates a ContentFilter with all pattern sets compiled.
func NewContentFilter() *ContentFilter {
	return &ContentFilter{
		profanityPatterns: compilePatterns([]string{
			// Common profanity (case-insensitive)
			`(?i)\b(f+[\W_]*u+[\W_]*c+[\W_]*k+)\b`,
			`(?i)\b(s+[\W_]*h+[\W_]*[i1!]+[\W_]*t+)\b`,
			`(?i)\b(b+[\W_]*[i1!]+[\W_]*t+[\W_]*c+[\W_]*h+)\b`,
			`(?i)\b(a+[\W_]*s+[\W_]*s+)\b`,
			`(?i)\b(d+[\W_]*a+[\W_]*m+[\W_]*n+)\b`,
			`(?i)\b(c+[\W_]*r+[\W_]*a+[\W_]*p+)\b`,
			`(?i)\b(d+[\W_]*i+[\W_]*c+[\W_]*k+)\b`,
			`(?i)\b(p+[\W_]*r+[\W_]*i+[\W_]*c+[\W_]*k+)\b`,
			`(?i)\b(b+[\W_]*a+[\W_]*s+[\W_]*t+[\W_]*a+[\W_]*r+[\W_]*d+)\b`,
		}),

		phishingPatterns: compilePatterns([]string{
			// Credential harvesting
			`(?i)(verify\s+(your|you're)\s+(account|identity|payment))`,
			`(?i)(click\s+(here|below|this\s+link)\s+to\s+(verify|confirm|update|secure))`,
			`(?i)(your\s+(account|card|bank)\s+(has\s+been|is)\s+(suspended|locked|compromised|limited))`,
			`(?i)(unauthorized\s+(activity|access|transaction)\s+detected)`,
			`(?i)(urgent(?:ly)?[\s:]+.*(?:verify|confirm|update|provide|submit))`,
			`(?i)(failure\s+to\s+(verify|confirm|update)\s+(will|may|could)\s+result)`,
			`(?i)(your\s+account\s+will\s+be\s+(closed|suspended|terminated|locked))`,
			// Fake login pages
			`(?i)(login\s+page|sign[\s-]*in\s+page|auth\s+page)`,
			`(?i)(bit\.ly|tinyurl|t\.co|is\.gd|shorturl)`,
		}),

		spamPatterns: compilePatterns([]string{
			// Repetitive patterns
			`(?i)(buy\s+now|act\s+now|limited\s+time|order\s+now|shop\s+now)`,
			`(?i)(you\s+(have\s+)?won|congratulations|winner|claimed\s+your\s+prize)`,
			`(?i)(free\s+(gift|money|cash|prize|offer|trial))`,
			`(?i)(100%\s+free|no\s+cost|risk[\s-]*free|guaranteed)`,
			`(?i)(make\s+money\s+(fast|quick|now|easy)|earn\s+\$[\d,k]+)`,
			`(?i)(double\s+your|triple\s+your|multiply\s+your)`,
			`(?i)(call\s+now|text\s+now|reply\s+(yes|now|stop))`,
			`(?i)(unsubscribe|opt[\s-]*out|stop\s+texting|do\s+not\s+contact)`,
		}),

		gamblingPatterns: compilePatterns([]string{
			`(?i)(casino|blackjack|poker\s+room|slot\s+machine|roulette)`,
			`(?i)(bet\s+now|place\s+your\s+bet|odds|wager)`,
			`(?i)(jackpot|spin\s+to\s+win|lottery|lotto)`,
			`(?i)(sports\s*betting|horse\s+racing|draftkings|fanduel|bet365)`,
			`(?i)(online\s+casino|live\s+dealer|table\s+games)`,
		}),

		adultPatterns: compilePatterns([]string{
			`(?i)(porn|xxx|nsfw|adult\s+content|erotic|fetish)`,
			`(?i)(nude|naked|explicit|sex\s+chat|cam\s+girl|cam\s+boy)`,
			`(?i)(escort|hookup|one\s+night|casual\s+sex|dating\s+site)`,
			`(?i)(viagra|cialis|male\s+enhancement|penis\s+enlargement)`,
		}),

		drugPatterns: compilePatterns([]string{
			`(?i)(buy\s+(weed|marijuana|cocaine|meth|heroin|drugs|pills))`,
			`(?i)(weed\s+delivery|marijuana\s+dispensary|420\s+friendly)`,
			`(?i)(pain\s+pills|oxycodone|vicodin|adderall|xanax\s+for\s+sale)`,
			`(?i)(steroids|hgh|testosterone\s+booster|growth\s+hormone)`,
			`(?i)(mdma|ecstasy|lsd|acid|mushrooms|shrooms\s+for\s+sale)`,
		}),

		hatePatterns: compilePatterns([]string{
			`(?i)(kill\s+(all|every)\s+(jews|muslims|christians|blacks|whites|asians|gays|trans))`,
			`(?i)(racial\s+slur|white\s+power|heil|supremac)`,
			`(?i)(ethnic\s+cleansing|genocide|holocaust\s+denial)`,
		}),

		scamPatterns: compilePatterns([]string{
			`(?i)(nigerian\s+prince|inheritance\s+claim|unclaimed\s+funds)`,
			`(?i)(wire\s+transfer|western\s+union|money\s+gram|crypto\s+wallet)`,
			`(?i)(investment\s+opportunity|passive\s+income|mlm|multi[\s-]*level)`,
			`(?i)(binary\s+options|forex\s+signals|crypto\s+signals)`,
			`(?i)(flipping|dropshipping\s+course|side\s+hustle\s+secret)`,
		}),
	}
}

// Scan checks both the message body and sender for sensitive content.
// Returns true if any violation is found (message should be blocked).
func (f *ContentFilter) Scan(message string, sender string) (blocked bool, violations []ContentViolation) {
	combined := sender + " " + message

	checks := []struct {
		patterns  []*regexp.Regexp
		category  ContentCategory
		weight    float64
	}{
		{f.hatePatterns, CategoryHateSpeech, 1.0},       // highest severity
		{f.phishingPatterns, CategoryPhishing, 0.95},    // very high
		{f.drugPatterns, CategoryDrugRelated, 0.85},     // high
		{f.scamPatterns, CategoryScam, 0.85},            // high
		{f.adultPatterns, CategoryAdultContent, 0.75},   // medium-high
		{f.gamblingPatterns, CategoryGambling, 0.7},     // medium
		{f.profanityPatterns, CategoryProfanity, 0.5},   // medium
		{f.spamPatterns, CategorySpam, 0.4},             // lower
	}

	for _, check := range checks {
		for _, re := range check.patterns {
			if re.MatchString(combined) {
				violations = append(violations, ContentViolation{
					Category: check.category,
					Pattern:  re.String(),
					Weight:   check.weight,
				})
				blocked = true
			}
		}
	}

	return
}

// SanitizeSender validates and sanitizes the sender name.
// Blocks empty, overly long, or suspicious sender names.
func SanitizeSender(sender string) (string, bool) {
	sender = strings.TrimSpace(sender)

	// Empty sender
	if sender == "" {
		return "", false
	}

	// Too long
	if len(sender) > 11 { // SMS sender ID max
		return "", false
	}

	// Must contain at least one letter or digit
	hasContent := false
	for _, r := range sender {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			hasContent = true
			break
		}
	}
	if !hasContent {
		return "", false
	}

	// No URLs in sender
	lower := strings.ToLower(sender)
	if strings.Contains(lower, "http") || strings.Contains(lower, "www.") || strings.Contains(lower, ".com") || strings.Contains(lower, ".net") {
		return "", false
	}

	// No excessive special characters
	specialCount := 0
	for _, r := range sender {
		if !unicode.IsLetter(r) && !unicode.IsDigit(r) && r != ' ' && r != '-' && r != '_' {
			specialCount++
		}
	}
	if specialCount > len(sender)/3 {
		return "", false
	}

	return sender, true
}

// compilePatterns compiles a list of regex pattern strings, ignoring any that fail.
func compilePatterns(patterns []string) []*regexp.Regexp {
	compiled := make([]*regexp.Regexp, 0, len(patterns))
	for _, p := range patterns {
		if re, err := regexp.Compile(p); err == nil {
			compiled = append(compiled, re)
		}
	}
	return compiled
}

// phoneRegex validates international phone numbers (E.164-like).
var phoneRegex = regexp.MustCompile(`^\+?[1-9]\d{6,14}$`)

// IsValidPhoneNumber checks if the phone number matches a valid international format.
func IsValidPhoneNumber(phone string) bool {
	phone = strings.TrimSpace(phone)
	if phone == "" {
		return false
	}
	return phoneRegex.MatchString(phone)
}
