<?php

namespace App\Support;

final class NoveltySalary
{
    public const LABEL = 'Булочка з сосискою';

    public const POSITIONS = [
        'Майстер на всі руки',
        'Майстер на всю голову',
    ];

    public static function appliesTo(?string $position): bool
    {
        $normalized = mb_strtolower(trim((string) $position));

        return in_array($normalized, array_map(
            static fn (string $value): string => mb_strtolower($value),
            self::POSITIONS,
        ), true);
    }
}
