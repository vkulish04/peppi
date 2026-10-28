<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Group;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class GroupController extends Controller
{
    public function index()
    {
        return Group::withCount(['children' => fn ($query) => $query->withTrashed()])
            ->orderBy('sort_order')->orderBy('name')->get();
    }
    public function store(Request $request)
    {
        if ($request->has('name')) $request->merge(['name' => trim((string) $request->input('name'))]);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('groups', 'name')->whereNull('deleted_at')],
            'active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ]);
        return response()->json(Group::create($data), 201);
    }
    public function update(Request $request, Group $group)
    {
        if ($request->has('name')) $request->merge(['name' => trim((string) $request->input('name'))]);
        $group->update($request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('groups', 'name')->ignore($group->id)->whereNull('deleted_at')],
            'active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ]));
        return $group;
    }
    public function destroy(Group $group)
    {
        if ($group->children()->withTrashed()->exists()) {
            return response()->json(['message' => 'Не можна видалити групу, в якій є діти.'], 409);
        }

        $group->delete();
        return response()->noContent();
    }
}
