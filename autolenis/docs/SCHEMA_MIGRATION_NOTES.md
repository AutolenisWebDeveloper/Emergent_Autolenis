# AutoLenis Database Schema Migration Notes

## Overview
This document outlines the database schema updates applied to align with the comprehensive AutoLenis specification.

## Migration Scripts Applied

### 02 - Dealer Users Table
- **Added**: `DealerUser` table for dealer staff members
- **Purpose**: Separate dealer business entity from individual dealer users
- **Fields**: userId, dealerId, roleLabel (e.g., "GM", "F&I Manager")

### 03-10 - Field Additions & Standardization
- **Monetary Values**: All currency fields standardized to `*Cents` (INTEGER) format
- **Addresses**: Added addressLine2, postalCode, country fields
- **Buyer Profile**: Added dateOfBirth, employmentStatus, employerName, monthly income/housing in cents
- **Dealer**: Added legalName, email, active status
- **Vehicle**: Added drivetrain, engine, renamed color fields
- **Inventory**: Added stockNumber, isNew, location fields

### 11-23 - System-Specific Updates
- **Pre-Qualification**: Added status enum (ACTIVE, EXPIRED, REVOKED), dtiRatio
- **Preferences**: Added radiusMiles, homePostalCode
- **Auction**: Added cents fields for all monetary values
- **Deal**: Added baseLoanAmountCents, apr, termMonths
- **Payments**: Added provider, providerPaymentId, reason fields
- **Insurance**: Added type enum (AUTOLENIS, EXTERNAL), startDate, endDate
- **Contracts**: Added metaJson, type, fileUrl, issuesCount, summary
- **E-Sign**: Added provider field, signingUrl
- **Pickup**: Added locationName, locationAddress, qrCodeValue
- **Affiliate**: Added refCode, landingSlug, parentReferralId for multi-level
- **Commission**: Added serviceFeePaymentId, amountCents
- **Payout**: Added provider, providerRef
- **Payment Methods**: Added provider, providerRef, expires fields
- **Fee Disclosure**: Added comprehensive consent tracking fields
- **Compliance**: Added type enum and severity
- **Admin Settings**: Renamed and added valueJson

## Data Migration Considerations

### Currency Conversion
All existing float/double monetary values have been converted to cents (INTEGER):
- Multiply by 100 and cast to INTEGER
- Original columns preserved for backward compatibility during transition

### Enum Additions
New enums created:
- `PreQualStatus`: ACTIVE, EXPIRED, REVOKED
- `InsurancePolicyType`: AUTOLENIS, EXTERNAL
- `ComplianceEventType`: SOFT_PULL, FEE_DISCLOSURE, ADMIN_ACTION, CONTRACT_SCAN, PAYMENT_EVENT

### Foreign Keys
New relationships established:
- DealerUser → User, Dealer
- Referral → Referral (self-referencing for multi-level)
- Commission → ServiceFeePayment

## Next Steps

1. **Update Prisma Schema**: Modify `prisma/schema.prisma` to reflect all changes
2. **Regenerate Prisma Client**: Run `npx prisma generate`
3. **Update TypeScript Types**: Regenerate type definitions from Prisma
4. **Update API Endpoints**: Modify all APIs to use `*Cents` fields
5. **Update Frontend**: Update UI to display monetary values correctly (divide by 100)

## Testing Checklist

- [ ] Verify all foreign key relationships work correctly
- [ ] Test monetary value conversions (cents ↔ dollars)
- [ ] Validate enum constraints
- [ ] Check indexes are properly created
- [ ] Test cascade deletes work as expected
- [ ] Verify compliance event tracking
- [ ] Test multi-level affiliate referrals

## Rollback Plan

If needed, rollback migrations in reverse order (23 → 02). Original columns have been preserved where data was migrated.
