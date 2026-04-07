<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['chat_id', 'tenant_id', 'title', 'description', 'status', 'progress'])]
class Milestone extends Model
{
    public function chat(): BelongsTo
    {
        return $this->belongsTo(Chat::class);
    }
}
