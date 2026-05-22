# IgirePay Idempotency Gateway (The "Pay-Once" Protocol)

A production-ready idempotency layer built with **NestJS** to ensure guarantees of exactly-once processing for financial transactions, completely eliminating double-charging anomalies caused by network retries.

## Architecture & Logic Flow

The system uses an advanced NestJS Interceptor layer to handle distributed request states safely. Below is the operational sequence diagram for incoming traffic:

Client Idempotency Interceptor Cache State Payment Core
| | | |
|--- POST /process-payment ---------->| | |
| (Idempotency-Key: "key_123") |--- Check key status --------------->| |
| | Result: Not Found | |
| | | |
| |--- Transition State to 'STARTED'--->| |
| | | |
| |---------------------------------------------------------->| Simulates
| | | | 2s Delay
| |<----------------------------------------------------------| (Processed)
| | | |
| |--- Update State to 'RESOLVED' ----->| |
|<-- 201 Created ---------------------| Saves response payload | |
| | | |
| [DUPLICATE REQUEST ARRIVES] | | |
|--- POST /process-payment ---------->| | |
| (Idempotency-Key: "key_123") |--- Check key status --------------->| |
| | Result: Cached Response Found | |
|<-- 201 Created (X-Cache-Hit: true) -| | |

## Setup & Installation Instructions

Ensure you have [Node.js](https://nodejs.org/) installed on your machine.

### 1. Install Dependencies

```bash
npm install
```

### 2. Run the server

npm run start:dev
