# E2E Test Summary

**Generated:** 2026-04-02

## Overall Status

| Metric | Value |
|--------|-------|
| Total Test Suites | 2 |
| Failed Suites | 2 |
| Passed Suites | 0 |
| Total Tests | 54 |
| Failed Tests | 31 |
| Passed Tests | 23 |
| Pass Rate | 43% |

---

## Failing Tests by File

### auth.e2e-spec.ts (9 failures)

#### Password Reset Flows (4 failures)
1. `should complete merchant password reset flow`
2. `should complete hunter password reset flow`
3. `should invalidate reset token after use (single-use)`
4. `should revoke all refresh tokens on password reset for merchant`

**Error:** Returns 400 instead of 200

#### Security Assertions (2 failures)
5. `should detect and revoke token family on token reuse (token theft protection)`
   - Expected: "Token reuse detected"
   - Received: "Invalid refresh token"
6. `should enforce rate limiting on login endpoints`
   - Error: Connection reset (ECONNRESET)

#### Token Validation (3 failures)
7. `should reject requests with invalid access tokens`
8. `should reject requests with expired access tokens format`
9. `should reject malformed authorization headers`

**Error:** Returns 200 instead of 401

---

### vouchers.e2e-spec.ts (22 failures)

#### Full Voucher Lifecycle (1 failure)
10. `should complete full lifecycle: Create Drop → Claim Voucher → Redeem Voucher`

#### Claim Validation (2 failures)
11. `should prevent same device from claiming twice`
12. `should allow different devices to claim from same drop`

#### Capture Limits (2 failures)
13. `should enforce limited availability`
14. `should allow unlimited claims when availability is unlimited`

#### Redemption Types (6 failures)
15. `should redeem anytime voucher without time restrictions`
16. `should redeem timer voucher within time limit`
17. `should reject timer voucher after time limit expires`
18. `should redeem window voucher within deadline`
19. `should reject window voucher after deadline`

#### Magic Link Access (1 failure)
20. `should retrieve voucher by magic token`

#### Promo Code Assignment (2 failures)
21. `should assign promo code on claim`
22. `should return null promo code when no codes available`

#### Share via Email/WhatsApp (2 failures)
23. `should share voucher via email`
24. `should share voucher via WhatsApp`

#### Security Assertions (5 failures)
25. `should not redeem already redeemed voucher`
26. `should require magic token for redemption`
27. `should only allow owning merchant to redeem`
28. `should allow scanner token to redeem for owning merchant`
29. `should not allow scanner from different merchant`

#### Hunter Voucher Access (2 failures)
30. `should list vouchers for hunter`
31. `should list vouchers for merchant`

---

## Summary by Category

| Category | Failures | Likely Cause |
|----------|----------|--------------|
| Password Reset | 4 | Reset token validation returning 400 |
| Token Security | 3 | Token reuse detection message mismatch |
| Token Validation | 3 | JWT guard not rejecting invalid tokens |
| Drop/Voucher Creation | 22 | All voucher tests fail because drop creation fails (401) |

---

## Root Cause Analysis

The main issue is that **drop creation is failing with 401**, which causes all 22 voucher tests to fail (they need drops to claim from). The 9 auth tests are failing due to specific auth flow issues:

1. **Password reset tokens** - Not validating correctly
2. **Token reuse detection** - Error message mismatch
3. **JWT validation** - Not rejecting invalid/malformed tokens

---

## Tests Passing (23)

### Auth Tests
- Merchant registration
- Email verification flow
- Hunter device login
- Token refresh
- Logout

### Basic API Tests
- Health check endpoints
- Public drop listing
- Basic merchant profile access

---

## Next Steps to Fix

1. Fix password reset token validation in `auth.service.ts`
2. Update token reuse error message to match test expectation
3. Fix JWT guard to properly reject invalid tokens
4. Debug why drop creation returns 401 (likely RolesGuard or JWT issue)
