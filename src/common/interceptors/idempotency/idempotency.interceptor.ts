import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import * as crypto from 'crypto';

interface IdempotencyRecord {
  requestHash: string; // Captures the unique signature of the body
  status: 'STARTED' | 'RESOLVED';
  statusCode: number;
  responseBody: any;
}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  // In-memory data structures to track requests and concurrent locks
  private cache = new Map<string, IdempotencyRecord>();
  private locks = new Map<string, Promise<any>>();

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const idempotencyKey = request.headers['idempotency-key'];

    // If there is no key, bypass the interceptor and process normally
    if (!idempotencyKey) {
      return next.handle();
    }

    // Task 7 (Developer's Choice): Sort JSON keys before hashing to guarantee
    // consistent structural payload matching even if order varies.
    const sortedBody = this.sortObjectKeys(request.body || {});
    const currentHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(sortedBody))
      .digest('hex');

    const cachedRecord = this.cache.get(idempotencyKey);

    if (cachedRecord) {
      // User Story 3: Different Request, Same Key (Fraud / Error Check)
      if (cachedRecord.requestHash !== currentHash) {
        throw new HttpException(
          'Idempotency key already used for a different request body.',
          HttpStatus.CONFLICT,
        );
      }

      // User Story 2: Duplicate Attempt (Return Cached Response immediately)
      if (cachedRecord.status === 'RESOLVED') {
        response.header('X-Cache-Hit', 'true');
        response.status(cachedRecord.statusCode);
        return of(cachedRecord.responseBody);
      }

      // Bonus User Story: The "In-Flight" Race Condition Check
      if (cachedRecord.status === 'STARTED') {
        const inFlightPromise = this.locks.get(idempotencyKey);
        if (inFlightPromise) {
          // Block and wait execution until the primary request resolves
          const resolvedData = await inFlightPromise;
          response.header('X-Cache-Hit', 'true');
          response.status(HttpStatus.CREATED);
          return of(resolvedData);
        }
      }
    }

    // First Request Path: Register key as in-flight
    this.cache.set(idempotencyKey, {
      requestHash: currentHash,
      status: 'STARTED',
      statusCode: HttpStatus.CREATED,
      responseBody: null,
    });

    // Capture execution stream as an authentic promise shared across threads
    const executionPromise = next
      .handle()
      .toPromise()
      .then(
        (data) => {
          // Cache success state
          this.cache.set(idempotencyKey, {
            requestHash: currentHash,
            status: 'RESOLVED',
            statusCode: HttpStatus.CREATED,
            responseBody: data,
          });
          this.locks.delete(idempotencyKey);
          return data;
        },
        (error) => {
          // Infrastructure fallback: Remove key if payment completely crashes so client can safely retry
          this.cache.delete(idempotencyKey);
          this.locks.delete(idempotencyKey);
          throw error;
        },
      );

    this.locks.set(idempotencyKey, executionPromise);
    return of(await executionPromise);
  }

  // Helper utility to safely stabilize object ordering
  private sortObjectKeys(obj: any): any {
    if (typeof obj !== 'object' || obj === null) return obj;
    if (Array.isArray(obj)) return obj.map(this.sortObjectKeys.bind(this));
    return Object.keys(obj)
      .sort()
      .reduce((acc, key) => {
        acc[key] = this.sortObjectKeys(obj[key]);
        return acc;
      }, {});
  }
}
