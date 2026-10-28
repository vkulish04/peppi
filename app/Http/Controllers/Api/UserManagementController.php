<?php

namespace App\Http\Controllers\Api;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class UserManagementController extends Controller
{
    public function __construct(private AuditLogger $audit) {}

    public function index(): JsonResponse
    {
        return response()->json(User::query()->orderBy('name')->get(['id', 'name', 'email', 'role', 'active']));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:12'],
            'role' => ['required', Rule::enum(UserRole::class)],
            'active' => ['required', 'boolean'],
        ]);

        $user = DB::transaction(function () use ($request, $data) {
            $user = User::create($data);
            $this->audit->record($request->user(), 'user.created', 'user', $user->id, ['name' => $user->name, 'role' => $user->role->value]);
            return $user;
        });

        return response()->json($user->only(['id', 'name', 'email', 'role', 'active']), 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'role' => ['required', Rule::enum(UserRole::class)],
            'active' => ['required', 'boolean'],
            'password' => ['nullable', 'string', 'min:12'],
        ]);

        if ($user->id === $request->user()->id && (!$data['active'] || $data['role'] !== UserRole::DIRECTOR->value)) {
            throw ValidationException::withMessages(['role' => 'Не можна вимкнути власний обліковий запис або змінити свою роль.']);
        }

        if ($user->active && $user->role === UserRole::DIRECTOR && (!$data['active'] || $data['role'] !== UserRole::DIRECTOR->value)
            && User::where('role', UserRole::DIRECTOR->value)->where('active', true)->count() <= 1) {
            throw ValidationException::withMessages(['role' => 'Потрібен принаймні один активний директор.']);
        }

        DB::transaction(function () use ($request, $user, $data) {
            $oldRole = $user->role->value;
            $oldActive = $user->active;
            $passwordChanged = !empty($data['password']);
            if (!$passwordChanged) unset($data['password']);
            $user->fill($data);
            $fields = array_keys($user->getDirty());
            if (!$fields) return;
            $user->save();
            if ($passwordChanged || $oldRole !== $user->role->value || $oldActive !== $user->active) {
                $user->tokens()->delete();
            }
            $this->audit->record($request->user(), 'user.updated', 'user', $user->id, [
                'name' => $user->name,
                'fields' => $fields,
                'role' => $user->role->value,
                'active' => $user->active,
            ]);
        });

        return response()->json($user->fresh()->only(['id', 'name', 'email', 'role', 'active']));
    }
}
