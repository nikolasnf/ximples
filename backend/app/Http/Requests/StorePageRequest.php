<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:pages,slug',
            'type' => 'nullable|string|in:landing,sales,thank_you,lead_capture,webinar,portfolio',
            'status' => 'nullable|string|in:draft,published',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string|max:500',
            'theme_json' => 'nullable|array',
            'theme_json.fontFamily' => 'nullable|string',
            'theme_json.primaryColor' => 'nullable|string',
            'theme_json.backgroundColor' => 'nullable|string',
            'theme_json.textColor' => 'nullable|string',
            'theme_json.radius' => 'nullable|string',
            'content_json' => 'nullable|array',
            'content_json.version' => 'nullable|integer',
            'content_json.sections' => 'nullable|array',
        ];
    }
}
