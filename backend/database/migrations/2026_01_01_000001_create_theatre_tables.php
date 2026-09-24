<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Users
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('mobile', 20)->unique()->index();
            $table->string('name')->nullable();
            $table->enum('role', ['admin', 'seller', 'buyer'])->default('buyer')->index();
            $table->boolean('is_verified')->default(false);
            $table->string('password')->nullable(); // Optional for seeded accounts
            $table->rememberToken();
            $table->timestamps();
            $table->softDeletes();
        });

        // 2. OTP Codes
        Schema::create('otp_codes', function (Blueprint $table) {
            $table->id();
            $table->string('mobile', 20)->index();
            $table->string('code_hash', 64);
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->timestamp('expires_at')->index();
            $table->timestamp('last_sent_at');
            $table->timestamps();
        });

        // 3. Venues
        Schema::create('venues', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('city')->index();
            $table->text('address')->nullable();
            $table->unsignedInteger('capacity')->default(0);
            $table->timestamps();
        });

        // 4. Venue Sections
        Schema::create('venue_sections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('venue_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->unsignedInteger('capacity')->default(0);
            $table->unsignedInteger('rows')->default(1);
            $table->unsignedInteger('seats_per_row')->default(1);
            $table->unsignedDecimal('base_price', 12, 0)->default(0);
            $table->timestamps();
        });

        // 5. Seats
        Schema::create('seats', function (Blueprint $table) {
            $table->id();
            $table->foreignId('venue_id')->constrained()->cascadeOnDelete();
            $table->foreignId('section_id')->constrained('venue_sections')->cascadeOnDelete();
            $table->unsignedInteger('row_number');
            $table->unsignedInteger('seat_number');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['section_id', 'row_number', 'seat_number'], 'seat_unique_in_section');
            $table->index(['venue_id', 'section_id']);
        });

        // 6. Shows
        Schema::create('shows', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('poster_url');
            $table->json('gallery_urls')->nullable();
            $table->foreignId('venue_id')->constrained()->restrictOnDelete();
            $table->unsignedSmallInteger('duration_minutes')->default(90);
            $table->string('age_rating', 10)->default('+12');
            $table->string('category', 50)->index();
            $table->string('director')->nullable();
            $table->json('cast_members')->nullable();
            $table->enum('ticketing_mode', ['SEAT_SELECTION', 'QUANTITY_ONLY'])->default('SEAT_SELECTION');
            $table->enum('status', ['published', 'draft', 'archived'])->default('draft')->index();
            $table->timestamps();
            $table->softDeletes();
        });

        // 7. Show Sessions
        Schema::create('show_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('show_id')->constrained()->cascadeOnDelete();
            $table->foreignId('venue_id')->constrained()->restrictOnDelete();
            $table->dateTime('start_at')->index();
            $table->dateTime('end_at');
            $table->unsignedInteger('capacity')->default(0);
            $table->unsignedInteger('remaining_capacity')->default(0);
            $table->enum('status', ['open', 'closed', 'sold_out'])->default('open')->index();
            $table->timestamps();

            $table->index(['show_id', 'start_at']);
        });

        // 8. Price Tiers
        Schema::create('price_tiers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('session_id')->constrained('show_sessions')->cascadeOnDelete();
            $table->foreignId('section_id')->nullable()->constrained('venue_sections')->nullOnDelete();
            $table->string('name');
            $table->unsignedDecimal('price_toman', 12, 0);
            $table->timestamps();
        });

        // 9. Show - Seller Pivot
        Schema::create('show_seller', function (Blueprint $table) {
            $table->id();
            $table->foreignId('show_id')->constrained()->cascadeOnDelete();
            $table->foreignId('seller_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['show_id', 'seller_id']);
        });

        // 10. Seat Reservations (Temporary 10-min locks)
        Schema::create('seat_reservations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('session_id')->constrained('show_sessions')->cascadeOnDelete();
            $table->foreignId('seat_id')->constrained('seats')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('user_mobile', 20)->nullable();
            $table->timestamp('expires_at')->index();
            $table->timestamps();

            $table->unique(['session_id', 'seat_id'], 'unique_seat_lock');
        });

        // 11. Orders
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('show_id')->constrained()->restrictOnDelete();
            $table->foreignId('session_id')->constrained('show_sessions')->restrictOnDelete();
            $table->enum('type', ['online', 'offline_pos', 'offline_cash'])->default('online');
            $table->unsignedDecimal('total_amount', 12, 0);
            $table->enum('status', ['pending', 'paid', 'cancelled', 'refunded'])->default('pending')->index();
            $table->string('buyer_name')->nullable();
            $table->string('buyer_mobile', 20)->index();
            $table->string('payment_ref')->nullable();
            $table->string('payment_gateway')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        // 12. Order Items
        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('seat_id')->nullable()->constrained()->nullOnDelete();
            $table->string('seat_label')->nullable();
            $table->unsignedDecimal('price', 12, 0);
            $table->timestamps();
        });

        // 13. Payments
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->enum('gateway', ['zarinpal', 'offline_pos', 'offline_cash']);
            $table->string('authority')->nullable()->index();
            $table->string('ref_id')->nullable()->index();
            $table->unsignedDecimal('amount', 12, 0);
            $table->enum('status', ['initiated', 'success', 'failed'])->default('initiated');
            $table->string('card_pan', 30)->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
        });

        // 14. Tickets
        Schema::create('tickets', function (Blueprint $table) {
            $table->id();
            $table->string('code', 30)->unique()->index();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('session_id')->constrained('show_sessions')->restrictOnDelete();
            $table->foreignId('show_id')->constrained()->restrictOnDelete();
            $table->foreignId('seat_id')->nullable()->constrained()->nullOnDelete();
            $table->string('seat_label')->nullable();
            $table->enum('status', ['VALID', 'USED', 'CANCELLED'])->default('VALID')->index();
            $table->string('buyer_name')->nullable();
            $table->string('buyer_mobile', 20)->index();
            $table->unsignedDecimal('price', 12, 0);
            $table->timestamp('issued_at');
            $table->timestamp('used_at')->nullable();
            $table->foreignId('used_by_seller_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['session_id', 'seat_id'], 'unique_seat_ticket_per_session');
        });

        // 15. Check In Logs
        Schema::create('check_in_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ticket_id')->constrained()->cascadeOnDelete();
            $table->string('ticket_code', 30);
            $table->foreignId('seller_id')->constrained('users')->cascadeOnDelete();
            $table->string('seller_name')->nullable();
            $table->enum('action', ['SUCCESS', 'ALREADY_USED', 'WRONG_SHOW', 'CANCELLED']);
            $table->timestamp('timestamp');
            $table->timestamps();
        });

        // 16. Audit Logs
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('user_name')->nullable();
            $table->string('action', 50)->index();
            $table->text('details')->nullable();
            $table->timestamp('timestamp');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('check_in_logs');
        Schema::dropIfExists('tickets');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('seat_reservations');
        Schema::dropIfExists('show_seller');
        Schema::dropIfExists('price_tiers');
        Schema::dropIfExists('show_sessions');
        Schema::dropIfExists('shows');
        Schema::dropIfExists('seats');
        Schema::dropIfExists('venue_sections');
        Schema::dropIfExists('venues');
        Schema::dropIfExists('otp_codes');
        Schema::dropIfExists('users');
    }
};
