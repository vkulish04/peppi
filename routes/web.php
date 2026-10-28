<?php

use Illuminate\Support\Facades\Route;

// React SPA. API lives under /api/v1 and is registered separately.
Route::view('/{any?}', 'app')
    ->where('any', '^(?!api(?:/|$)|up$).*$');
