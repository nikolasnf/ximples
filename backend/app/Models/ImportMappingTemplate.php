<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ImportMappingTemplate extends Model
{
    protected $fillable = [
        'user_id',
        'tenant_id',
        'name',
        'mappings',
    ];

    protected function casts(): array
    {
        return [
            'mappings' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
