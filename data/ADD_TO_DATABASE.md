# Add content straight to MongoDB

Changes show up the next time a page is loaded. Works in `mongosh`, MongoDB Compass, Atlas, etc.
Database: **fillrai**.

## New scheme (collection `schemes`)

```js
db.schemes.insertOne({
  id: "pm-awas",
  name: "PM Awas Yojana",
  category: "Housing",
  description: "Financial help to buy or build a first home.",
  long_description: "Credit-linked subsidy for eligible urban and rural households.",
  fields: ["name", "aadhaar", "address", "annualIncome", "mobile"],
  eligibility_rules: { max_income: 600000, reason: "Household income must be ₹6,00,000/year or below." },
  has_direct_api: false,
  portal: "PMAY portal — pmaymis.gov.in",
  portal_url: "https://pmaymis.gov.in",
  benefits: ["Subsidy up to ₹2.67 lakh"],
  is_active: true
})
```

* `fields` — keys from `field_defs`. Values already in the user's vault are pre-filled; the rest are asked.
* `has_direct_api` — `true` = submitted inside FillrAI, `false` = user finishes on `portal_url`.
* `is_active: false` hides a scheme.

### Eligibility rules (all present rules must pass; `{}` = everyone)

| Rule | Example |
|---|---|
| `max_income` | `{ max_income: 300000 }` (checks `annualIncome`) |
| `category_in` | `{ category_in: ["SC", "ST"] }` |
| `requires_fields` | `{ requires_fields: ["pan"] }` |
| `reason` | text shown when not eligible |

## New field (collection `field_defs`)

```js
db.field_defs.insertOne({ key: "landArea", label: "Land holding (acres)", kind: "text" })
```

`kind`: `text`, `date`, `email`, `tel`, `number`, `textarea`, `select` (with `options: [...]`) or `file`.

## New document type (collection `vault_doc_types`)

```js
db.vault_doc_types.insertOne({ id: "land_record", label: "Land record (7/12)", hint: "Land holding proof", sort_order: 1000 })
```

It appears in every user's vault as *Missing* the next time they open My Documents.

