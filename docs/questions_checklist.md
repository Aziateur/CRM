# Architectural Questions & Observations Checklist

This file tracks the deep research observations and strategic questions posed to the user before finalizing any architectural plans or writing code, ensuring alignment and rigorous planning.

## Observations from Competitor Research
1. **Salesforce & EspoCRM:** Use a heavy metadata abstraction where creating a custom field typically alters the underlying virtualized database schema (adding real DB columns). They have strict distinctions between Standard and Custom fields beneath the surface, even though the UI treats them similarly for layouts.
2. **Close.com:** Offers "Regular" and "Shared" custom fields tied to specific entities (Leads, Contacts). Their UI distinguishes Custom vs Standard, but allows flexible ordering. Data is accessed via specific Schema APIs.
3. **HubSpot:** Treats everything as "Properties" grouped into "Property Groups." Internal API names are permanent. Users cannot delete certain core HubSpot properties, but they *can* remove them from the UI layout forms.
4. **Twenty CRM:** Highly open-source and modular. Treats everything as an Object, and uses a GraphQL schema that is re-computed on the fly when metadata changes.

## Structural Questions for the User
- [ ] **1. Storage Strategy:** Should new fields continue to be stored in the `custom_fields` JSONB column (highly flexible, current approach), or should we actually auto-provision real Postgres columns for them (like Espo/Twenty do) for stricter typing and performance?
- [ ] **2. Core Field Dependencies:** If a user deletes the "Phone" field, the Dialer cannot function. Should the Dialer simply show an error/gracefully disable, or do we only 'hide' the field from the UI while keeping the underlying Postgres `phone` column intact?
- [ ] **3. Data Purging:** When a field is deleted in Settings, should we purge that field's data across all 10,000+ leads, or just hide it from the UI (allowing recovery if recreated)?
- [ ] **4. Custom Sections:** Do you want users to be able to create their own custom layout sections (e.g., "Social Profile", "Company Metrics") instead of just moving fields between the hardcoded "Contact Info" and "Details" buckets?
- [ ] **5. Required Constraints:** If all fields are equal, do you want users to be able to dictate which fields are strictly "Required" to create a standard lead, replacing our current hard-coded validation checks?
