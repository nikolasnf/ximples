<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $pageId = $this->route('id');

        return [
            'title' => 'sometimes|string|max:255',
            'slug' => ['sometimes', 'string', 'max:255', Rule::unique('pages', 'slug')->ignore($pageId)],
            'type' => 'sometimes|string|in:landing,sales,thank_you,lead_capture,webinar,portfolio',
            'status' => 'sometimes|string|in:draft,published,archived',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string|max:500',
            'theme_json' => 'nullable|array',
            'content_json' => 'nullable|array',
        ];
    }
}
