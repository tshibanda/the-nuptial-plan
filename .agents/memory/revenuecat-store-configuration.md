---
name: RevenueCat store configuration
description: Native store products and package attachment rules for iOS and Android billing.
---

RevenueCat offerings must attach one product per configured store app (Test Store, App Store, and Play Store). Package responses expose the product identifier under the nested `product.id`; checking only `product_id` makes an idempotent seed attempt duplicate attachments.

**Why:** RevenueCat rejects attaching a second product from the same app as incompatible, so a seed can fail even though the package is already correctly configured.

**How to apply:** When synchronizing store products, read the existing package products first and compare `product.id` (with `product_id` as a compatibility fallback) before attaching missing products.