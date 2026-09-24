<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Venue;
use App\Models\VenueSection;
use App\Models\Seat;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database with EXACTLY 3 accounts as required:
     * 1. Admin
     * 2. Seller
     * 3. Buyer
     */
    public function run(): void
    {
        // 1. Admin Account
        $admin = User::firstOrCreate(
            ['mobile' => env('SEED_ADMIN_MOBILE', '09120000001')],
            [
                'name' => 'مدیر کل سامانه تیکت',
                'role' => 'admin',
                'is_verified' => true,
                'password' => Hash::make(env('SEED_ADMIN_PASSWORD', 'admin123456')),
            ]
        );

        // 2. Seller Account
        $seller = User::firstOrCreate(
            ['mobile' => env('SEED_SELLER_MOBILE', '09120000002')],
            [
                'name' => 'مسئول گیشه و فروش سالن',
                'role' => 'seller',
                'is_verified' => true,
                'password' => Hash::make(env('SEED_SELLER_PASSWORD', 'seller123456')),
            ]
        );

        // 3. Buyer Account
        $buyer = User::firstOrCreate(
            ['mobile' => env('SEED_BUYER_MOBILE', '09120000003')],
            [
                'name' => 'علی صادقی (خریدار تایید شده)',
                'role' => 'buyer',
                'is_verified' => true,
                'password' => Hash::make(env('SEED_BUYER_PASSWORD', 'buyer123456')),
            ]
        );

        // Seed default venue structure for production readiness
        $venue = Venue::firstOrCreate(
            ['name' => 'تالار وحدت تهران (سالن اصلی)'],
            [
                'city' => 'تهران',
                'address' => 'تهران، خیابان حافظ، پایین‌تر از چهارراه کالج، بلوار شهریار',
                'capacity' => 120,
            ]
        );

        if ($venue->wasRecentlyCreated) {
            $vipSection = VenueSection::create([
                'venue_id' => $venue->id,
                'name' => 'همکف - جایگاه VIP',
                'rows' => 4,
                'seats_per_row' => 12,
                'base_price' => 350000,
                'capacity' => 48,
            ]);

            $stdSection = VenueSection::create([
                'venue_id' => $venue->id,
                'name' => 'همکف - ردیف‌های عادی',
                'rows' => 6,
                'seats_per_row' => 12,
                'base_price' => 250000,
                'capacity' => 72,
            ]);

            foreach ([$vipSection, $stdSection] as $section) {
                for ($r = 1; $r <= $section->rows; $r++) {
                    for ($s = 1; $s <= $section->seats_per_row; $s++) {
                        Seat::create([
                            'venue_id' => $venue->id,
                            'section_id' => $section->id,
                            'row_number' => $r,
                            'seat_number' => $s,
                            'is_active' => true,
                        ]);
                    }
                }
            }
        }
    }
}
