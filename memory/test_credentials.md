# Test Credentials

## Admin
- Email: klenakan.eric@gmail.com
- Password: 474Treckadzo

## Cooperative
- Email: bielaghana@gmail.com
- Password: test123456

## Agent Terrain
- Email: testagent@test.ci
- Password: test123456

## Planteur
- Email: testplanteur@test.ci
- Password: test123456

## Login
- Endpoint: POST /api/auth/login
- Body: {"identifier": "<email>", "password": "<password>"}
- Response key: access_token
- Note: Rate limiter blocks after 30 attempts/minute. Restart backend to clear.
