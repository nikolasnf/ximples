<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SendMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'chat_id' => 'nullable|exists:chats,id',
            'message' => 'required|string|max:5000',
            'template_id' => 'nullable|integer|exists:page_templates,id',
        ];
    }
}
