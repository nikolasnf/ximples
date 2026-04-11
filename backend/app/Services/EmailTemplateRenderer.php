<?php

namespace App\Services;

use App\Models\Contact;

/**
 * Interpolates {{placeholder}} tokens in email subjects/bodies with real contact data.
 *
 * Supports both Portuguese and English placeholder names:
 *   {{nome}} / {{name}}, {{email}}, {{telefone}} / {{phone}}
 *
 * Unknown placeholders are left blank (safe fallback).
 */
class EmailTemplateRenderer
{
    /**
     * Render a template string, replacing placeholders with contact data.
     */
    public function render(string $template, Contact $contact, array $extra = []): string
    {
        $replacements = $this->buildReplacements($contact, $extra);

        // Replace all {{key}} tokens
        return preg_replace_callback(
            '/\{\{(\s*[\w.]+\s*)\}\}/',
            function (array $match) use ($replacements) {
                $key = strtolower(trim($match[1]));
                return $replacements[$key] ?? '';
            },
            $template
        ) ?? $template;
    }

    /**
     * Build the replacement map from a contact and optional extra data.
     */
    private function buildReplacements(Contact $contact, array $extra = []): array
    {
        $map = [
            // Portuguese
            'nome'     => $contact->name ?? '',
            'email'    => $contact->email ?? '',
            'telefone' => $contact->phone ?? '',

            // English aliases
            'name'  => $contact->name ?? '',
            'phone' => $contact->phone ?? '',

            // Common extras
            'primeiro_nome' => $this->firstName($contact->name),
            'first_name'    => $this->firstName($contact->name),
        ];

        // Merge raw_data fields (e.g. {{empresa}}, {{cidade}})
        if (is_array($contact->raw_data)) {
            foreach ($contact->raw_data as $key => $value) {
                if (is_string($value) || is_numeric($value)) {
                    $map[strtolower((string) $key)] = (string) $value;
                }
            }
        }

        // Merge caller-provided extras (highest priority)
        foreach ($extra as $key => $value) {
            $map[strtolower((string) $key)] = (string) $value;
        }

        return $map;
    }

    private function firstName(?string $fullName): string
    {
        if (!$fullName) {
            return '';
        }
        return explode(' ', trim($fullName))[0];
    }
}
