<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureStaticApiToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $configuredToken = config('services.spp_api.token');
        $providedToken = $request->header('X-API-TOKEN') ?: $request->bearerToken();

        if (! $configuredToken || ! $providedToken || ! hash_equals($configuredToken, $providedToken)) {
            return response()->json([
                'message' => 'Invalid API token.',
            ], 401);
        }

        $request->attributes->set('api_access_role', config('services.spp_api.role', 'admin'));

        return $next($request);
    }
}
