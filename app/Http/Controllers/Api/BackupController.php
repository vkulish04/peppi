<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class BackupController extends Controller
{
    private const PATTERN = '/^kindergarten_\d{8}_\d{6}\.sql\.gz$/';

    public function index(): JsonResponse
    {
        $files = glob(base_path('backups/kindergarten_*.sql.gz')) ?: [];
        $rows = [];
        foreach ($files as $path) {
            $name = basename($path);
            if (!preg_match(self::PATTERN, $name) || !is_file($path) || is_link($path)) continue;
            $rows[] = ['name' => $name, 'size' => filesize($path), 'createdAt' => date(DATE_ATOM, filemtime($path))];
        }
        usort($rows, fn ($a, $b) => strcmp($b['name'], $a['name']));
        return response()->json($rows);
    }

    public function download(string $filename): BinaryFileResponse
    {
        abort_unless(preg_match(self::PATTERN, $filename), 404);
        $path = base_path('backups/'.$filename);
        abort_unless(is_file($path) && !is_link($path), 404);
        return response()->download($path, $filename, ['Cache-Control' => 'private, no-store']);
    }
}
