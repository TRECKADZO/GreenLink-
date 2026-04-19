# Test Credentials - GreenLink Agritech

## Super Admin
- Email: klenakan.eric@gmail.com
- Password: admin123456
- User Type: admin
- Dashboard: /admin/dashboard

## Cooperative
- Email: bielaghana@gmail.com
- Password: test123456
- User Type: cooperative
- Dashboard: /cooperative/dashboard

## Agent Terrain
- Email: testagent@test.ci
- Password: test123456
- User Type: field_agent
- Dashboard: /agent/terrain

## Producteur (Koffi)
- Phone: +2250709090909
- Password: test123456
- User Type: producteur
- Dashboard: /farmer/dashboard
- Has PDC: Yes (validated)

## Notes
- Rate limiter blocks after 30 attempts/minute. Restart backend to clear.
- Login endpoint: POST /api/auth/login with {"identifier": "<email_or_phone>", "password": "<password>"}
