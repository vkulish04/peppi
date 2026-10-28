<?php

use App\Http\Controllers\Api\ActivityController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BackupController;
use App\Http\Controllers\Api\BillController;
use App\Http\Controllers\Api\ChildController;
use App\Http\Controllers\Api\ChildAccountController;
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\FinanceOptionController;
use App\Http\Controllers\Api\GroupController;
use App\Http\Controllers\Api\JournalController;
use App\Http\Controllers\Api\JournalCarryForwardController;
use App\Http\Controllers\Api\MonthClosureController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\PayrollController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\ReceiptController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\SubscriptionTariffController;
use App\Http\Controllers\Api\UserManagementController;
use App\Http\Middleware\EnsureActiveUser;
use App\Http\Middleware\EnsureRole;
use Illuminate\Support\Facades\Route;

$financeRoles = EnsureRole::class . ':director,accountant';

Route::prefix('v1')->group(function () use ($financeRoles) {
    Route::get('/settings', [SettingsController::class, 'show']);
    Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:10,1');

    Route::middleware(['auth:sanctum', EnsureActiveUser::class])->group(function () use ($financeRoles) {
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        // Читання доступне всім авторизованим ролям.
        Route::get('/groups', [GroupController::class, 'index']);
        Route::get('/children', [ChildController::class, 'index']);
        Route::get('/children/{child}', [ChildController::class, 'show']);
        Route::get('/activities', [ActivityController::class, 'index']);
        Route::get('/activities/{activity}', [ActivityController::class, 'show']);
        Route::get('/journal', [JournalController::class, 'index']);
        Route::get('/month-closure', [MonthClosureController::class, 'show']);
        Route::put('/journal/activity', [JournalController::class, 'setActivity']);

        // Фінансові та адміністративні зміни — директор/бухгалтер.
        Route::middleware($financeRoles)->group(function () {
            Route::get('/journal/reset', [\App\Http\Controllers\Api\JournalResetController::class, 'preview']);
            Route::post('/journal/reset', [\App\Http\Controllers\Api\JournalResetController::class, 'store']);
            Route::get('/journal/carry-forward', [JournalCarryForwardController::class, 'preview']);
            Route::post('/journal/carry-forward', [JournalCarryForwardController::class, 'store']);
            Route::put('/settings', [SettingsController::class, 'update']);
            Route::post('/settings/receipt-logo', [SettingsController::class, 'uploadLogo']);
            Route::delete('/settings/receipt-logo', [SettingsController::class, 'removeLogo']);
            Route::get('/finance-options', [FinanceOptionController::class, 'index']);
            Route::post('/finance-options', [FinanceOptionController::class, 'store']);
            Route::put('/finance-options/{financeOption}', [FinanceOptionController::class, 'update']);
            Route::delete('/finance-options/{financeOption}', [FinanceOptionController::class, 'destroy']);
            Route::get('/subscription-tariffs', [SubscriptionTariffController::class, 'index']);
            Route::put('/subscription-tariffs/{activity}', [SubscriptionTariffController::class, 'update']);
            Route::post('/groups', [GroupController::class, 'store']);
            Route::put('/groups/{group}', [GroupController::class, 'update']);
            Route::delete('/groups/{group}', [GroupController::class, 'destroy']);

            Route::post('/children', [ChildController::class, 'store']);
            Route::put('/children/{child}', [ChildController::class, 'update']);
            Route::delete('/children/{child}', [ChildController::class, 'destroy']);

            Route::post('/activities', [ActivityController::class, 'store']);
            Route::put('/activities/{activity}', [ActivityController::class, 'update']);
            Route::delete('/activities/{activity}', [ActivityController::class, 'destroy']);

            Route::get('/bills', [BillController::class, 'index']);
            Route::post('/bills', [BillController::class, 'store']);
            Route::get('/bills/{bill}', [BillController::class, 'show']);
            Route::put('/bills/{bill}', [BillController::class, 'update']);
            Route::get('/children/{child}/account', [ChildAccountController::class, 'show']);
            Route::post('/bills/{bill}/payments', [PaymentController::class, 'store']);
            Route::put('/payments/{payment}', [PaymentController::class, 'update']);
            Route::delete('/payments/{payment}', [PaymentController::class, 'destroy']);
            Route::get('/bills/{bill}/receipt.pdf', [ReceiptController::class, 'download']);

            Route::apiResource('employees', EmployeeController::class);
            Route::apiResource('payrolls', PayrollController::class)->only(['index','store','update']);
            Route::post('/payrolls/{payroll}/payments', [\App\Http\Controllers\Api\PayrollPaymentController::class, 'store']);
            Route::apiResource('expenses', ExpenseController::class);

            Route::get('/reports/monthly', [ReportController::class, 'monthly']);
            Route::get('/reports/monthly/csv', [ReportController::class, 'monthlyCsv']);
        });

        Route::middleware(EnsureRole::class . ':director')->group(function () {
            Route::post('/month-closure/close', [MonthClosureController::class, 'close']);
            Route::post('/month-closure/reopen', [MonthClosureController::class, 'reopen']);
            Route::get('/users', [UserManagementController::class, 'index']);
            Route::post('/users', [UserManagementController::class, 'store']);
            Route::put('/users/{user}', [UserManagementController::class, 'update']);
            Route::get('/audit-logs', [AuditLogController::class, 'index']);
            Route::get('/backups', [BackupController::class, 'index']);
            Route::get('/backups/{filename}', [BackupController::class, 'download']);
        });
    });
});
