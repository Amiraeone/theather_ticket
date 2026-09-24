<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

interface PaymentGatewayInterface
{
    public function requestPayment(int $amountToman, string $description, string $callbackUrl, ?string $mobile = null): array;
    public function verifyPayment(string $authority, int $amountToman): array;
}

class ZarinpalGateway implements PaymentGatewayInterface
{
    protected string $merchantId;
    protected bool $sandbox;
    protected string $baseUrl;

    public function __construct()
    {
        $this->merchantId = env('ZARINPAL_MERCHANT_ID', '00000000-0000-0000-0000-000000000000');
        $this->sandbox = filter_var(env('ZARINPAL_SANDBOX', true), FILTER_VALIDATE_BOOLEAN);

        $this->baseUrl = $this->sandbox
            ? 'https://sandbox.zarinpal.com/pg/v4/payment/'
            : 'https://payment.zarinpal.com/pg/v4/payment/';
    }

    /**
     * Request payment from Zarinpal API v4
     */
    public function requestPayment(int $amountToman, string $description, string $callbackUrl, ?string $mobile = null): array
    {
        // Zarinpal v4 accepts Rials or Tomans depending on merchant config; default standard is Toman:
        $payload = [
            'merchant_id' => $this->merchantId,
            'amount' => $amountToman,
            'description' => $description,
            'callback_url' => $callbackUrl,
            'metadata' => [
                'mobile' => $mobile,
            ],
        ];

        try {
            $response = Http::timeout(15)->post($this->baseUrl . 'request.json', $payload);

            if ($response->successful() && $response->json('data.code') == 100) {
                $authority = $response->json('data.authority');
                $paymentUrl = ($this->sandbox
                    ? 'https://sandbox.zarinpal.com/pg/StartPay/'
                    : 'https://payment.zarinpal.com/pg/StartPay/') . $authority;

                return [
                    'success' => true,
                    'authority' => $authority,
                    'payment_url' => $paymentUrl,
                ];
            }

            Log::error('Zarinpal request failed: ' . $response->body());
            return [
                'success' => false,
                'message' => $response->json('errors.message') ?? 'خطا در ارتباط با درگاه پرداخت زرین‌پال.',
            ];
        } catch (\Exception $e) {
            Log::error('Zarinpal exception: ' . $e->getMessage());
            return [
                'success' => false,
                'message' => 'عدم دسترسی به درگاه زرین‌پال: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Verify payment with Zarinpal API v4 (Idempotent)
     */
    public function verifyPayment(string $authority, int $amountToman): array
    {
        $payload = [
            'merchant_id' => $this->merchantId,
            'amount' => $amountToman,
            'authority' => $authority,
        ];

        try {
            $response = Http::timeout(15)->post($this->baseUrl . 'verify.json', $payload);
            $code = $response->json('data.code');

            // 100: Success, 101: Already verified (idempotent success)
            if ($code == 100 || $code == 101) {
                return [
                    'success' => true,
                    'ref_id' => $response->json('data.ref_id'),
                    'card_pan' => $response->json('data.card_pan'),
                    'fee' => $response->json('data.fee'),
                ];
            }

            return [
                'success' => false,
                'code' => $code,
                'message' => 'پرداخت توسط بانک یا کاربر لغو شده یا نامعتبر است.',
            ];
        } catch (\Exception $e) {
            Log::error('Zarinpal verify exception: ' . $e->getMessage());
            return [
                'success' => false,
                'message' => $e->getMessage(),
            ];
        }
    }
}
