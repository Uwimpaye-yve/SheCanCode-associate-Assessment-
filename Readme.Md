# IgirePay Idempotency Gateway (The "Pay-Once" Protocol)

A production-ready idempotency layer built with **NestJS** to ensure guarantees of exactly-once processing for financial transactions, completely eliminating double-charging anomalies caused by network retries.

## Architecture & Logic Flow

The system uses an advanced NestJS Interceptor layer to handle distributed request states safely. Below is the operational sequence diagram for incoming traffic:

```text
Client                  Idempotency Interceptor                         Cache State            Payment Core
  |                                     |                                     |                     |
  |--- POST /process-payment ---------->|                                     |                     |
  |    (Idempotency-Key: "key_123")     |--- Check key status --------------->|                     |
  |                                     |    Result: Not Found                |                     |
  |                                     |                                     |                     |
  |                                     |--- Transition State to 'STARTED'--->|                     |
  |                                     |                                     |                     |
  |                                     |---------------------------------------------------------->| Simulates
  |                                     |                                     |                     | 2s Delay
  |                                     |<----------------------------------------------------------| (Processed)
  |                                     |                                     |                     |
  |                                     |--- Update State to 'RESOLVED' ----->|                     |
  |<-- 201 Created ---------------------|    Saves response payload           |                     |
  |                                     |                                     |                     |
  |    [DUPLICATE REQUEST ARRIVES]      |                                     |                     |
  |--- POST /process-payment ---------->|                                     |                     |
  |    (Idempotency-Key: "key_123")     |--- Check key status --------------->|                     |
  |                                     |    Result: Cached Response Found    |                     |
  |<-- 201 Created (X-Cache-Hit: true) -|                                     |                     |
```

Setup & Installation Instructions
Ensure you have Node.js installed on your machine.

1. Install Dependencies
Bash
npm install
2. Run the Server
Bash
npm run start:dev
The gateway will start up locally at http://localhost:3000.

API Documentation
Process Payment
Endpoint: POST /process-payment

Headers Required:

Idempotency-Key:

Content-Type: application/json

Example Request Body
JSON
{
  "amount": 100,
  "currency": "GHS"
}
Possible Responses
First Request (Success - 201 Created):
Processes after a simulated 2-second backend network delay.

JSON
{ "status": "Charged 100 GHS" }


* **Duplicate Request (Idempotent Hit - 201 Created):**
  Returns instantly with zero execution lag.
  * **Response Header:** X-Cache-Hit: true
  ```json
  { "status": "Charged 100 GHS" }
  
Payload Mismatch Error (409 Conflict):
Triggered if a malicious or broken request reuses an active key for a different payment amount/currency.

JSON
{
  "statusCode": 409,
  "message": "Idempotency key already used for a different request body."
}


---

## Design Decisions & Developer's Choice

### 1. In-Flight Race Condition Blocking
To satisfy the bonus requirement, concurrent duplicate requests that enter while the primary request is still actively processing ('STARTED' state) are intercepted. They attach to the original unresolved execution promise (Promise tracking map) and await resolution, preventing parallel double-execution entirely.

### 2. Developer's Choice: Deterministic Request Fingerprinting
In high-velocity Fintech environments, network proxies or serialization clients can occasionally alter the order of fields in a JSON body (e.g., {"amount":100,"currency":"GHS"} vs {"currency":"GHS","amount":100}). 
To prevent minor structural formatting changes from breaking idempotency detection, this gateway features a custom recursive key-sorting engine. Payloads are deeply sorted alphabetically prior to SHA-256 hashing, safeguarding fingerprint structural integrity across diverse clients.