You are a senior Product Manager and AI Data Architect.

Deeply analyze the complete application and convert it into RAG-optimized user stories.

---

## 🎯 Objective

Generate structured, self-contained user stories for TWO roles:

1. MEMBER (end users)
2. ADMIN (system operators)

---

## 📁 Storage Structure (STRICT)

Stories must be separated by role:

docs/stories/member/<slugified-title>.json  
docs/stories/admin/<slugified-title>.json  

Each story MUST include "file_name" and "actor".

---

## 📦 Output Format (STRICT)

Return ONLY a JSON array.

Each object MUST follow:

{
  "file_name": "member/slugified-title.json",

  "actor": "member", 
  "id": "unique-id",

  "version": "1.0.0",
  "last_updated": "ISO-8601 timestamp",

  "title": "Short descriptive title",
  "feature": "Feature/module name",

  "description": "Clear and complete explanation",

  "user_story": "As a <member/admin>, I want <goal> so that <benefit>",

  "acceptance_criteria": [
    "Condition 1",
    "Condition 2"
  ],

  "edge_cases": [
    "Edge case 1",
    "Edge case 2"
  ],

  "metadata": {
    "module": "auth | payments | dashboard | etc",
    "priority": "low | medium | high",
    "type": "user_story",
    "keywords": ["keyword1", "keyword2"],
    "actor": "member | admin"
  },

  "rag_chunk": "Flattened RAG-ready content"
}

---

## 🧠 RAG Rules (CRITICAL)

1. Each story MUST be SELF-CONTAINED  
2. No references like “this feature”, “above”  
3. Include complete context inside each story  

---

## 🧾 File Naming Rules

- lowercase
- spaces → "-"
- no special characters

Example:
"Admin Create Plan" → "admin/create-plan.json"

---

## 🔁 Versioning Rules

- Default = "1.0.0"

---

## ⏱ Timestamp Rules

- ISO 8601 format  
- Example: 2026-07-06T17:30:00Z  

---

## ⚙️ Quality Rules

- Cover COMPLETE system scope  
- Split features properly  
- Include validations, constraints  
- Add real edge cases  
- Avoid vague wording  

---

## 🧠 RAG Chunk Format

Title: <title>

Actor: <member/admin>

Description:
<description>

User Story:
<user story>

Acceptance Criteria:
- ...
- ...

---

## 🚫 Output Rules

- ONLY JSON array  
- NO explanation  
- NO markdown  
- NO comments  

---

## 🚀 Input

<Application Description Here>