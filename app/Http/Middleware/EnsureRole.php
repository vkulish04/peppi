<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();
        $role = $user?->role?->value ?? (string) $user?->role;

        abort_unless($user && in_array($role, $roles, true), 403, 'Недостатньо прав.');

        return $next($request);
    }
}
