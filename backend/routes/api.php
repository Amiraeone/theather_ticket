<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\ShowController;
use App\Http\Controllers\Api\V1\BookingController;
use App\Http\Controllers\Api\V1\PaymentController;
use App\Http\Controllers\Api\V1\SellerController;
use App\Http\Controllers\Api\V1\AdminController;
use App\Http\Controllers\Api\V1\BuyerController;

/*
|--------------------------------------------------------------------------
| API Routes - Version 1
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {

    // 1. Authentication (OTP & Seeded Password)
    Route::prefix('auth')->group(function () {
        Route::post('send-otp', [AuthController::class, 'sendOtp'])->middleware('throttle:5,1');
        Route::post('verify-otp', [AuthController::class, 'verifyOtp'])->middleware('throttle:10,1');
        Route::post('login-password', [AuthController::class, 'loginPassword']);

        Route::middleware('auth:sanctum')->group(function () {
            Route::get('me', [AuthController::class, 'me']);
            Route::post('logout', [AuthController::class, 'logout']);
        });
    });

    // 2. Public Shows, Venues and Sessions
    Route::get('shows', [ShowController::class, 'index']);
    Route::get('shows/{slug}', [ShowController::class, 'show']);
    Route::get('sessions/{id}/seatmap', [ShowController::class, 'seatmap']);

    // 3. Booking & Concurrency Locks (10-minute hold)
    Route::prefix('bookings')->group(function () {
        Route::post('hold-seats', [BookingController::class, 'holdSeats']);
        Route::post('release-seats', [BookingController::class, 'releaseSeats']);
        Route::middleware('auth:sanctum')->post('checkout', [BookingController::class, 'checkout']);
    });

    // 4. Payment Gateway Callback (Zarinpal)
    Route::prefix('payments')->group(function () {
        Route::get('zarinpal/callback', [PaymentController::class, 'zarinpalCallback']);
    });

    // Order detail
    Route::get('orders/{id}', [BuyerController::class, 'orderDetail']);

    // 5. Buyer Panel (Protected)
    Route::middleware(['auth:sanctum'])->prefix('buyer')->group(function () {
        Route::get('orders', [BuyerController::class, 'orders']);
        Route::get('tickets', [BuyerController::class, 'tickets']);
    });

    // 6. Seller Panel (Protected: seller & admin)
    Route::middleware(['auth:sanctum', 'role:seller,admin'])->prefix('seller')->group(function () {
        Route::get('shows', [SellerController::class, 'assignedShows']);
        Route::get('stats', [SellerController::class, 'stats']);
        Route::post('offline-order', [SellerController::class, 'createOfflineOrder']);
        Route::post('check-in', [SellerController::class, 'checkInTicket']);
    });

    // 7. Admin Panel (Protected: admin)
    Route::middleware(['auth:sanctum', 'role:admin'])->prefix('admin')->group(function () {
        Route::get('overview', [AdminController::class, 'overview']);
        Route::apiResource('shows', AdminController::class);
        Route::post('shows/{id}/sellers', [AdminController::class, 'assignSeller']);
        Route::delete('shows/{id}/sellers/{sellerId}', [AdminController::class, 'removeSeller']);
        Route::apiResource('venues', AdminController::class);
        Route::get('users', [AdminController::class, 'users']);
        Route::get('orders', [AdminController::class, 'orders']);
        Route::post('orders/{id}/refund', [AdminController::class, 'refundOrder']);
        Route::get('audit-logs', [AdminController::class, 'auditLogs']);
    });
});
