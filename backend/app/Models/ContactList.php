<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ContactList extends Model
{
    protected $fillable = [
        'user_id',
        'tenant_id',
        'name',
        'description',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function contacts(): BelongsToMany
    {
        return $this->belongsToMany(
            Contact::class,
            'contact_list_items',
            'list_id',
            'contact_id'
        )->withTimestamps();
    }

    public function items(): HasMany
    {
        return $this->hasMany(ContactListItem::class, 'list_id');
    }

    public function campaigns(): HasMany
    {
        return $this->hasMany(Campaign::class, 'list_id');
    }
}
