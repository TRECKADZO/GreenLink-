# GreenLink Agritech - Product Requirements Document

## Original Problem Statement
Utiliser le meme code developpe sur GitHub (GreenLink). Implementer tout le projet (reproduire le projet GreenLink Agritech avec le meme code).

## Product Requirements
1. Fix cooperative referral code bugs
2. Clean up all test/demo data and keep only real data across all dashboards
3. Fix security and data isolation bugs
4. Implement Harvest validation flow
5. Improve the Web views for "Agent Terrain" and "Agriculteur"
6. Verify and professionally improve the messaging system for all users
7. Generate mobile native implementation prompts for handoff to another developer

## Architecture
- **Backend**: FastAPI (Python) + MongoDB Atlas (greenlink_production)
- **Frontend**: React (CRA)
- **Mobile**: Expo React Native
- **Database**: MongoDB Atlas

## Completed Tasks
- Fixed auto-calculated "Couverture ombragee" 404 API error
- Fixed mobile strata formula in ParcelVerifyFormScreen.js
- Created Carbon Score Analytics Dashboard for Cooperatives
- Upgraded Farmer's Carbon Score page with charts and history
- Upgraded Farmer's Web Parcel Declaration form to match Field Agent's form
- Generated complete Mobile App Specification (MOBILE_SPEC.md)
- Generated Field Agent, REDD+ Guide, USSD Simulator, and Messaging mobile prompts
- Fixed shade cover fallback formula (80 -> 35 m2)
- Fixed messaging contacts loading (member_id -> user_id in coop_members queries)
- Fixed test agent cooperative_id
- **Fixed ICI profile history refresh**: Added historyRefreshKey to auto-reload FarmerHistorySection after ICI/SSRTE form submission
- **Enriched history API**: Added total_visites_ssrte, date_derniere_visite_ssrte, dernier_niveau_risque_ssrte to ici_profile in /history endpoint

## Pending Issues
- P2: Emails sent via Resend going to Spam (BLOCKED: awaiting user DNS config SPF/DKIM/DMARC)

## Upcoming Tasks
- P1: Real SMS Gateway integration (Orange CI / MTN) - currently mocked
- P1: Support for local languages (Baoule/Dioula)
- P2: Clean up all test/demo data
- P2: Implement Harvest validation flow

## Future/Backlog
- P3: Refactor ussd.py (over 2700 lines)

## Mocked Services
- Orange CI SMS
- Orange Money
