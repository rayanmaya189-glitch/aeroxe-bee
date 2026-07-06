package fraud

import (
	"regexp"
	"strings"
	"unicode"
)

// ContentCategory classifies the type of sensitive content detected.
type ContentCategory string

const (
	CategoryProfanity          ContentCategory = "profanity"
	CategoryPII                ContentCategory = "pii_leak"
	CategoryPhishing           ContentCategory = "phishing"
	CategorySpam               ContentCategory = "spam"
	CategoryGambling           ContentCategory = "gambling"
	CategoryAdultContent       ContentCategory = "adult_content"
	CategoryDrugRelated        ContentCategory = "drug_related"
	CategoryHateSpeech         ContentCategory = "hate_speech"
	CategoryScam               ContentCategory = "scam"
	CategorySmishing           ContentCategory = "smishing"
	CategorySuspiciousSender   ContentCategory = "suspicious_sender"
	CategorySuspiciousRecipient ContentCategory = "suspicious_recipient"
)

// ContentViolation represents a single detected content violation.
type ContentViolation struct {
	Category ContentCategory
	Pattern  string
	Weight   float64 // 0.0-1.0 severity
}

// ContentFilter scans message text, sender, and recipient for sensitive/prohibited content.
type ContentFilter struct {
	// Compiled regex patterns organized by category.
	profanityPatterns           []*regexp.Regexp
	phishingPatterns            []*regexp.Regexp
	spamPatterns                []*regexp.Regexp
	gamblingPatterns            []*regexp.Regexp
	adultPatterns               []*regexp.Regexp
	drugPatterns                []*regexp.Regexp
	hatePatterns                []*regexp.Regexp
	scamPatterns                []*regexp.Regexp
	smishingPatterns            []*regexp.Regexp
	suspiciousSenderPatterns    []*regexp.Regexp
	suspiciousRecipientPatterns []*regexp.Regexp
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
			// URL shorteners (common in smishing)
			`(?i)(bit\.ly|tinyurl|t\.co|is\.gd|shorturl|rb\.gy|ow\.ly|tiny\.cc|clk\.ru|shrten|shortlink)`,
			// Delivery/package impersonation scams (USPS, FedEx, DHL, UPS, Canada Post, Royal Mail)
			`(?i)(usps|dhl|fedex|ups|canada\s*post|royal\s*mail).{0,40}(package|delivery|tracking|shipped|parcel|address|fee|label)`,
			`(?i)(package|delivery|parcel|shipment).{0,20}(on\s+hold|awaiting|incomplete|requires?.{0,10}confirmation|fee|failed|pending)`,
			`(?i)(missed\s+delivery|delivery\s+attempt|reschedule\s+delivery)`,
			`(?i)(your\s+(package|delivery|parcel).{0,20}(arriving|delayed|exception|problem|action))`,
			// Government/tax impersonation
			`(?i)(irs|tax\s*refund|social\s+security|ssn|gov\s*stimulus|tax\s+return|stimulus\s+payment).{0,30}(pending|claim|eligible|deposit|review)`,
			`(?i)(court|legal\s+action|lawsuit|subpoena|arrest\s+warrant|contempt|citation).{0,30}(notice|filed|appearance|response|required)`,
			`(?i)(benefits\s+claim|entitlement|rebate\s+check|stimulus).{0,30}(process|approve|pending|deposit)`,
			// Callback/vishing patterns
			`(?i)(call\s+us\s+(immediately|right\s+away|now|urgent|today)|call\s+this\s+number|customer\s+support\s+number)`,
			`(?i)(large\s+(transaction|purchase|withdrawal|charge|order).{0,40}(not\s+you|call|verify|dispute|fraud))`,
			`(?i)(suspicious\s+(activity|login|attempt|access|transaction).{0,40}(call|verify|secure|confirm))`,
			// Fake account alerts
			`(?i)(new\s+device\s+logged|login\s+from\s+(new|unknown|different)\s+(device|location|ip))`,
			`(?i)(recent\s+sign[\s-]*in|unusual\s+sign[\s-]*in|unknown\s+sign[\s-]*in)`,
		}),

		suspiciousSenderPatterns: compilePatterns([]string{
			// Sender names impersonating banks or financial institutions
			`(?i)^(bank\s*alert|bk\s*alert|secure\s*bank|security\s*bank|alert\s*bank)$`,
			`(?i)^(paypa[l1]|venm0|ca$h\s*app|zelle\s*pay|g-pay|apple\s*pay)$`,
			`(?i)^(chase|wells\s*fargo|boa\s*alert|citi\s*alert|amex|capital\s*one|hsbc|barclays|natwest|lloyds|halifax|santander)$`,
			// Delivery company impersonation
			`(?i)^(usps|fedex|dhl|ups|purolator|canada\s*post|royal\s*mail|dpd|hermes|evri)$`,
			// Authority/government impersonation
			`(?i)^(gov\s*alert|irs|dhs|cbp|ssa|uscis|hmrc|centrelink|service\s*canada)$`,
			// Tech company impersonation
			`(?i)^(amazon|amzn|g00gle|google|microsoft|msft|apple|app\s*le|netflix|nflx|meta|whatsapp|telegram)$`,
			// Generic suspicious authority names
			`(?i)^(alert|security|secure\s*alert|verify|verification|confirmation|support|helpdesk|notification)$`,
			// Sender names with phishing/scam keywords
			`(?i)(verify|v[e3]rif[yie]|conf[i1]rm|secure|s[e3]cur[e3])$`,
			`(?i)(winner|prize|lott?ery|jackpot|claim)$`,
			`(?i)(refund|rebate|tax\s*return|stimulus)$`,
			// Sender names containing URLs or domain-like patterns
			`(?i)\.(com?|net|org|io|app|xyz|info|site)$`,
			`(?i)(http|https|www\.)`,
			// All-numeric sender names (potential phone number spoofing)
			`^\+?\d{6,15}$`,
		}),

		suspiciousRecipientPatterns: compilePatterns([]string{
			// Premium-rate numbers - US & Canada
			`^\+?1[-.]?900`,
			`^\+?1[-.]?976`,
			// Premium-rate numbers - UK
			`^\+?44[-.]?70`,
			`^\+?44[-.]?9[0-9][0-9]`,
			`^\+?44[-.]?87[0-9]`,
			// Premium-rate numbers - Australia
			`^\+?61[-.]?190`,
			`^\+?61[-.]?19[0-9]`,
			// Premium-rate numbers - Germany
			`^\+?49[-.]?900`,
			`^\+?49[-.]?137`,
			// Premium-rate numbers - France
			`^\+?33[-.]?899`,
			`^\+?33[-.]?89[0-9]`,
			// Premium-rate numbers - Netherlands
			`^\+?31[-.]?900`,
			`^\+?31[-.]?906`,
			// Premium-rate numbers - Belgium
			`^\+?32[-.]?900`,
			// Premium-rate numbers - Switzerland
			`^\+?41[-.]?900`,
			// Premium-rate numbers - Italy
			`^\+?39[-.]?89[0-9]`,
			`^\+?39[-.]?166`,
			// Premium-rate numbers - Spain
			`^\+?34[-.]?803`,
			`^\+?34[-.]?806`,
			`^\+?34[-.]?807`,
			// Satellite & international network prefixes (often used in IRSF)
			`^\+?881`,
			`^\+?882`,
			`^\+?883`,
			`^\+?979`,
			// Numbers with excessive repeated digits (potential scam numbers)
			`^(\+?\d{1,3}[-.]?)?(\d)\2{5,}$`,
			// Suspiciously long numbers (not standard E.164)
			`^\+?\d{16,}`,
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
			// Cryptocurrency scams
			`(?i)(crypto|cryptocurrency|bitcoin|btc|eth|ethereum|usdt|usdc|tether).{0,30}(invest|transfer|send|recover|verify|sync|withdraw|bonus|giveaway)`,
			`(?i)(wallet.{0,20}(sync|recover|restore|validate|verify|update|upgrade))`,
			`(?i)(nft.{0,20}(mint|claim|giveaway|drop|airdrop|prize))`,
			`(?i)(doubl(e|ing).{0,20}(crypto|bitcoin|btc|eth|money|investment))`,
			// Job/employment scams
			`(?i)(work\s+from\s+home|remote\s+job|data\s+entry|mystery\s+shopper|earn\s+money\s+online){0,20}(\$|salary|income|pay|hiring)`,
			`(?i)((make|earn).{0,10}\$[\d,]+.{0,20}(day|week|month|hour|home|online))`,
			`(?i)(no\s+experience.{0,30}(needed|required|apply|start|job|work))`,
			// Romance/social scams
			`(?i)\b(dating|single)\b.{0,30}\b(near|local|your|find|love|someone|match)\b|\b(matchmaking|soulmate|lonely)\b`,
			// Tech support scams
			`(?i)(virus.{0,30}(detected|found|infected)|your.{0,10}(computer|iphone|device|phone).{0,20}(infected|virus|hacked|compromised))`,
			`(?i)((microsoft|apple|google|amazon|mcafee|norton).{0,30}(alert|security|support|notice|subscription|renewal))`,
		}),

		smishingPatterns: compilePatterns([]string{
			// Social engineering: "Hi Mum/Dad" family impersonation
			`(?i)\b(hi|hello|hey)\s+(mum|mom|dad|father|mother|grandma|grandpa|aunt|uncle|brother|sister|sweetie|honey|dear|darling|baby)\b`,
			`(?i)\b(i.{0,20}(need|require|ask).{0,20}(help|money|favor|urgent|emergency)).{0,40}(cash|pay|transfer|send|gift\s*card|card|bitcoin|itunes|google\s*play|amazon)`,
			// Wrong number / changed number scams
			`(?i)(wrong\s+number|new\s+number|changed\s+my\s+number|lost\s+my\s+phone|new\s+phone)`,
			`(?i)(i\s+(lost|broke|damaged|forgot).{0,20}(phone|sim|device))`,
			`(?i)(sorry.{0,10}(wrong|mistake|incorrect).{0,30}(number|person|contact))`,
			// Pivot to encrypted messaging platforms
			`(?i)(add\s+me|contact\s+me|reach\s+me|message\s+me).{0,20}(whatsapp|telegram|signal|wechat|line|viber|imessage|kik|discord)`,
			`(?i)(download|install|get).{0,15}(whatsapp|telegram|signal|wechat|kik).{0,15}(chat|talk|message|speak|text)`,
			// Emergency/grandparent scams
			`(?i)(i.{0,20}(in\s+trouble|in\s+an?\s+accident|arrested|in\s+hospital|stuck|stranded))`,
			`(?i)(grandson|granddaughter|grandchild|nephew|niece).{0,30}(trouble|accident|arrest|hospital|emergency|need|money|bail|help)`,
			// Fake prize/gift card redemption
			`(?i)(gift\s+card.{0,30}(winner|prize|free|claim|redeem|pin|code|scratch))`,
			`(?i)((amazon|google\s*play|itunes|steam|walmart|target)\s+gift\s+card.{0,30}(purchase|code|pin|number|claim))`,
			// Investment scam teasers
			`(?i)(\$[\d,]+.{0,20}(profit|return|earnings|guaranteed|passive|income|week))`,
			`(?i)((double|triple|multiply).{0,20}(your|the).{0,20}(money|investment|income|crypto|cash))`,
			// Urgency pressure tactics (excluding OTP-friendly "reply now" patterns)
			`(?i)((act|respond|click|call).{0,10}(now|today|immediately|urgently|fast|quick|ASAP))`,
			`(?i)(limited.{0,30}(time|offer|spots|availability|supply))`,
			`(?i)(expir(e|ing|es).{0,20}(today|soon|now|tonight|midnight|shortly))`,
		}),
	}
}

// Scan checks the message body, sender, and recipient for sensitive content.
// Returns true if any violation is found (message should be blocked).
func (f *ContentFilter) Scan(message string, sender string, recipient string) (blocked bool, violations []ContentViolation) {
	// Run message body patterns against combined body + sender + recipient
	// (these patterns use \b word boundaries, not anchors, so they work on combined text)
	bodyChecks := []struct {
		patterns  []*regexp.Regexp
		category  ContentCategory
		weight    float64
	}{
		{f.hatePatterns, CategoryHateSpeech, 1.0},
		{f.phishingPatterns, CategoryPhishing, 0.95},
		{f.smishingPatterns, CategorySmishing, 0.9},
		{f.drugPatterns, CategoryDrugRelated, 0.85},
		{f.scamPatterns, CategoryScam, 0.85},
		{f.adultPatterns, CategoryAdultContent, 0.75},
		{f.gamblingPatterns, CategoryGambling, 0.7},
		{f.profanityPatterns, CategoryProfanity, 0.5},
		{f.spamPatterns, CategorySpam, 0.4},
	}

	combined := sender + " " + message + " " + recipient
	for _, check := range bodyChecks {
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

	// Run sender-specific patterns against just the sender field
	for _, re := range f.suspiciousSenderPatterns {
		if re.MatchString(sender) {
			violations = append(violations, ContentViolation{
				Category: CategorySuspiciousSender,
				Pattern:  re.String(),
				Weight:   0.8,
			})
			blocked = true
		}
	}

	// Run recipient-specific patterns against just the recipient field
	for _, re := range f.suspiciousRecipientPatterns {
		if re.MatchString(recipient) {
			violations = append(violations, ContentViolation{
				Category: CategorySuspiciousRecipient,
				Pattern:  re.String(),
				Weight:   0.8,
			})
			blocked = true
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
