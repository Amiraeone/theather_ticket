<?php

namespace App\Services;

use App\Models\SeatReservation;
use App\Models\Ticket;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use Carbon\Carbon;
use Exception;

class SeatLockService
{
    const HOLD_DURATION_MINUTES = 10;

    /**
     * Atomically locks seats for a session for 10 minutes.
     * Prevents race conditions and double-booking using DB transactions and pessimistic locking.
     */
    public function holdSeats(int $sessionId, array $seatIds, ?int $userId, ?string $userMobile): array
    {
        return DB::transaction(function () use ($sessionId, $seatIds, $userId, $userMobile) {
            $now = Carbon::now();

            // 1. Check if any seat is already sold
            $alreadySold = Ticket::where('session_id', $sessionId)
                ->whereIn('seat_id', $seatIds)
                ->where('status', '!=', 'CANCELLED')
                ->lockForUpdate()
                ->exists();

            if ($alreadySold) {
                throw new Exception('یک یا چند صندلی انتخابی در این لحظه توسط کاربر دیگری خریداری شد.');
            }

            // 2. Check if any seat is currently reserved by another user
            $activeHolds = SeatReservation::where('session_id', $sessionId)
                ->whereIn('seat_id', $seatIds)
                ->where('expires_at', '>', $now)
                ->when($userId, fn($q) => $q->where('user_id', '!=', $userId))
                ->lockForUpdate()
                ->exists();

            if ($activeHolds) {
                throw new Exception('یک یا چند صندلی انتخابی در حال حاضر در حال خرید توسط شخص دیگری است (قفل موقت ۱۰ دقیقه‌ای).');
            }

            // 3. Clear user's previous holds on this session
            SeatReservation::where('session_id', $sessionId)
                ->where('user_id', $userId)
                ->delete();

            // 4. Create new 10-minute hold records
            $expiresAt = $now->copy()->addMinutes(self::HOLD_DURATION_MINUTES);
            $reservations = [];

            foreach ($seatIds as $seatId) {
                $reservations[] = SeatReservation::create([
                    'session_id' => $sessionId,
                    'seat_id' => $seatId,
                    'user_id' => $userId,
                    'user_mobile' => $userMobile,
                    'expires_at' => $expiresAt,
                ]);

                // Also record in Redis if enabled
                try {
                    $redisKey = "seat_lock:{$sessionId}:{$seatId}";
                    Redis::setex($redisKey, self::HOLD_DURATION_MINUTES * 60, $userId ?? 'guest');
                } catch (\Exception $e) {
                    // Fallback to database lock
                }
            }

            return [
                'success' => true,
                'expires_at' => $expiresAt->toIso8601String(),
                'duration_seconds' => self::HOLD_DURATION_MINUTES * 60,
                'seats_count' => count($seatIds),
            ];
        });
    }

    /**
     * Release held seats
     */
    public function releaseSeats(int $sessionId, array $seatIds, ?int $userId = null): void
    {
        $query = SeatReservation::where('session_id', $sessionId)->whereIn('seat_id', $seatIds);
        if ($userId) {
            $query->where('user_id', $userId);
        }
        $query->delete();

        foreach ($seatIds as $seatId) {
            try {
                Redis::del("seat_lock:{$sessionId}:{$seatId}");
            } catch (\Exception $e) {}
        }
    }
}
