<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

interface SmsServiceInterface
{
    public function sendVerifyOtp(string $mobile, string $code): bool;
}

class SmsService implements SmsServiceInterface
{
    protected string $apiKey;
    protected int $templateId;
    protected string $lineNumber;

    public function __construct()
    {
        $this->apiKey = config('services.smsir.api_key', env('SMSIR_API_KEY', ''));
        $this->templateId = (int) config('services.smsir.template_id', env('SMSIR_TEMPLATE_ID', 0));
        $this->lineNumber = config('services.smsir.line_number', env('SMSIR_LINE_NUMBER', ''));
    }

    /**
     * Send OTP Verification code through SMS.ir official Verify/Template endpoint
     * Docs: https://app.sms.ir/developer/help/introduction
     */
    public function sendVerifyOtp(string $mobile, string $code): bool
    {
        // If API key is not configured (e.g. dev/sandbox), log code for local testing
        if (empty($this->apiKey)) {
            Log::info("[SMS.ir Local Mode] Verification code for {$mobile} is: {$code}");
            return true;
        }

        try {
            $response = Http::withHeaders([
                'X-API-KEY' => $this->apiKey,
                'ACCEPT' => 'application/json',
                'Content-Type' => 'application/json',
            ])->timeout(10)->post('https://api.sms.ir/v1/send/verify', [
                'mobile' => $mobile,
                'templateId' => $this->templateId,
                'parameters' => [
                    [
                        'name' => 'Code',
                        'value' => $code,
                    ]
                ]
            ]);

            if ($response->successful() && $response->json('status') == 1) {
                return true;
            }

            Log::error('SMS.ir send error: ' . $response->body());
            return false;
        } catch (\Exception $e) {
            Log::error('SMS.ir Exception: ' . $e->getMessage());
            return false;
        }
    }
}
