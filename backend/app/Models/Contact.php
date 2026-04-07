<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Contact extends Model
{
    protected $fillable = [
        'user_id',
        'tenant_id',
        'name',
        'phone',
        'email',
        'source_file',
        'tags',
        'raw_data',
    ];

    protected function casts(): array
    {
        return [
            'tags'     => 'array',
            'raw_data' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function lists(): BelongsToMany
    {
        return $this->belongsToMany(
            ContactList::class,
            'contact_list_items',
            'contact_id',
            'list_id'
        )->withTimestamps();
    }
}
