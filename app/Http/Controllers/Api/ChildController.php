<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ChildRequest;
use App\Models\Child;
use Illuminate\Http\Request;

class ChildController extends Controller
{
    public function index(Request $request)
    {
        return Child::with('group')
            ->when($request->group_id, fn($q, $id) => $q->where('group_id', $id))
            ->when($request->has('active'), fn($q) => $q->where('active', $request->boolean('active')))
            ->orderBy('full_name')->paginate(100);
    }
    public function store(ChildRequest $request) { return response()->json(Child::create($request->validated())->load('group'), 201); }
    public function show(Child $child) { return $child->load('group'); }
    public function update(ChildRequest $request, Child $child) { $child->update($request->validated()); return $child->fresh('group'); }
    public function destroy(Child $child) { $child->delete(); return response()->noContent(); }
}
