<?php

namespace App\Services;

use App\Models\Contact;
use App\Models\ContactList;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class ContactImportService
{
    // ─── Column Alias Registry ────────────────────────────────────────
    // Each target field maps to a ranked list of known aliases.
    // Fuzzy matching (case-insensitive, partial) is applied on top.
    private const COLUMN_ALIASES = [
        'name' => [
            'name', 'full_name', 'fullname', 'first_name', 'firstname',
            'nome', 'nome_completo', 'contato', 'contact', 'cliente', 'customer',
            'billing_first_name', 'shipping_first_name', 'display_name',
        ],
        'last_name' => [
            'last_name', 'lastname', 'sobrenome', 'surname',
            'billing_last_name', 'shipping_last_name',
        ],
        'email' => [
            'email', 'e-mail', 'e_mail', 'mail', 'user_email',
            'billing_email', 'customer_email', 'email_address',
        ],
        'phone' => [
            'phone', 'telefone', 'celular', 'whatsapp', 'whats', 'tel',
            'mobile', 'fone', 'numero', 'número', 'billing_phone',
            'shipping_phone', 'phone_number', 'customer_phone',
        ],
        'city' => [
            'city', 'cidade', 'billing_city', 'shipping_city',
        ],
        'state' => [
            'state', 'estado', 'uf', 'billing_state', 'shipping_state',
            'province', 'region',
        ],
        'country' => [
            'country', 'pais', 'país', 'billing_country', 'shipping_country',
        ],
    ];

    private const CHUNK_SIZE = 500;

    /** Detection metadata from the last parse operation. */
    private array $lastParseInfo = [];

    // ─── Preview ──────────────────────────────────────────────────────

    /**
     * Parse the file and return a preview (first N rows + detected mappings).
     *
     * @return array{headers:string[], mappings:array<string,?string>, preview_rows:array[], total_rows:int}
     */
    public function preview(
        UploadedFile $file,
        ?array $manualMappings = null,
        int $previewLimit = 10,
    ): array {
        $rows = $this->parseFile($file);

        if (empty($rows)) {
            throw new RuntimeException('Arquivo vazio ou sem linhas válidas.');
        }

        $rawHeaders = array_map(fn ($h) => trim((string) $h), array_shift($rows));
        $normalizedHeaders = array_map(fn ($h) => $this->normalizeHeader($h), $rawHeaders);

        $totalRows = count($rows);

        Log::info('CSV preview: file parsed', [
            'headers_detected' => $rawHeaders,
            'total_rows_parsed' => $totalRows,
            'sample_row' => $rows[0] ?? null,
        ]);

        // Self-healing: if no data rows, attempt raw-content rescue before giving up
        if ($totalRows === 0) {
            Log::warning('CSV preview: no data rows after header extraction, attempting recovery', [
                'headers'     => $rawHeaders,
                'raw_content' => array_slice(file($file->getRealPath(), FILE_IGNORE_NEW_LINES) ?: [], 0, 5),
            ]);

            $rescued = $this->rescueParseRawContent($file->getRealPath());
            if ($rescued !== null && count($rescued) > 1) {
                $rows = $rescued;
                $rawHeaders = array_map(fn ($h) => trim((string) $h), array_shift($rows));
                $normalizedHeaders = array_map(fn ($h) => $this->normalizeHeader($h), $rawHeaders);
                $totalRows = count($rows);
                Log::info('CSV preview: recovery succeeded', [
                    'headers'    => $rawHeaders,
                    'total_rows' => $totalRows,
                ]);
            }

            if ($totalRows === 0) {
                Log::error('CSV preview: no data rows after all recovery attempts', [
                    'headers' => $rawHeaders,
                ]);
                throw new RuntimeException('CSV parsed but no data rows found — likely a delimiter or encoding issue.');
            }
        }

        // Detect or apply manual overrides
        $mappings = $manualMappings
            ? $this->applyManualMappings($normalizedHeaders, $manualMappings)
            : $this->detectColumns($normalizedHeaders);

        // Build preview rows with mapped field names
        $previewRows = [];
        foreach (array_slice($rows, 0, $previewLimit) as $row) {
            if (!is_array($row)) {
                continue;
            }
            $mapped = $this->mapRow($row, $rawHeaders, $mappings, 0);
            $previewRows[] = $mapped;
        }

        return [
            'headers'            => $rawHeaders,
            'mappings'           => $this->formatMappingsForDisplay($mappings, $rawHeaders),
            'preview_rows'       => $previewRows,
            'total_rows'         => $totalRows,
            'detected_columns'   => array_filter($this->formatMappingsForDisplay($mappings, $rawHeaders)),
            'detected_encoding'  => $this->lastParseInfo['detected_encoding'] ?? 'utf-8',
            'detected_delimiter' => $this->lastParseInfo['detected_delimiter'] ?? ',',
        ];
    }

    // ─── Import ───────────────────────────────────────────────────────

    /**
     * Import contacts from an uploaded CSV or XLSX file.
     *
     * @param  string  $duplicateStrategy  'update' or 'skip'
     * @return array{total_rows:int,imported:int,updated:int,skipped:int,errors:array,list_id:?int}
     */
    public function importFromUpload(
        User $user,
        UploadedFile $file,
        ?int $listId = null,
        ?string $newListName = null,
        ?array $manualMappings = null,
        string $duplicateStrategy = 'update',
    ): array {
        $originalName = $file->getClientOriginalName();
        $rows = $this->parseFile($file);

        if (empty($rows)) {
            throw new RuntimeException('Arquivo vazio ou sem linhas válidas.');
        }

        $rawHeaders = array_map(fn ($h) => trim((string) $h), array_shift($rows));
        $normalizedHeaders = array_map(fn ($h) => $this->normalizeHeader($h), $rawHeaders);

        $totalRows = count($rows);

        Log::info('CSV import: file parsed', [
            'file'               => $originalName,
            'headers_detected'   => $rawHeaders,
            'total_rows_parsed'  => $totalRows,
            'sample_row'         => $rows[array_key_first($rows)] ?? null,
            'detected_encoding'  => $this->lastParseInfo['detected_encoding'] ?? 'unknown',
            'detected_delimiter' => $this->lastParseInfo['detected_delimiter'] ?? 'unknown',
        ]);

        // Self-healing: if no data rows, attempt raw-content rescue before giving up
        if ($totalRows === 0) {
            Log::warning('CSV import: no data rows after header extraction, attempting recovery', [
                'file'        => $originalName,
                'headers'     => $rawHeaders,
                'raw_content' => array_slice(file($file->getRealPath(), FILE_IGNORE_NEW_LINES) ?: [], 0, 5),
            ]);

            $rescued = $this->rescueParseRawContent($file->getRealPath());
            if ($rescued !== null && count($rescued) > 1) {
                $rows = $rescued;
                $rawHeaders = array_map(fn ($h) => trim((string) $h), array_shift($rows));
                $normalizedHeaders = array_map(fn ($h) => $this->normalizeHeader($h), $rawHeaders);
                $totalRows = count($rows);
                Log::info('CSV import: recovery succeeded', [
                    'file'       => $originalName,
                    'headers'    => $rawHeaders,
                    'total_rows' => $totalRows,
                ]);
            }

            if ($totalRows === 0) {
                Log::error('CSV import: no data rows after all recovery attempts', [
                    'file'    => $originalName,
                    'headers' => $rawHeaders,
                ]);
                throw new RuntimeException('CSV parsed but no data rows found — likely a delimiter or encoding issue.');
            }
        }

        $mappings = $manualMappings
            ? $this->applyManualMappings($normalizedHeaders, $manualMappings)
            : $this->detectColumns($normalizedHeaders);

        $imported = 0;
        $updated = 0;
        $skipped = 0;
        $errors = [];

        $list = $this->resolveList($user, $listId, $newListName);

        // Process in chunks to handle large files
        $chunks = array_chunk($rows, self::CHUNK_SIZE, true);

        foreach ($chunks as $chunk) {
            DB::transaction(function () use (
                $user, $chunk, $rawHeaders, $mappings, $originalName, $list,
                $duplicateStrategy, &$imported, &$updated, &$skipped, &$errors,
            ) {
                foreach ($chunk as $index => $row) {
                    if (!is_array($row)) {
                        $skipped++;
                        continue;
                    }

                    try {
                        $mapped = $this->mapRow($row, $rawHeaders, $mappings, $index);
                        $result = $this->upsertContact($user, $mapped, $originalName, $duplicateStrategy);

                        if ($result === 'imported') {
                            $imported++;
                        } elseif ($result === 'updated') {
                            $updated++;
                        } else {
                            $skipped++;
                        }

                        if ($list && $result !== 'skipped') {
                            $contact = $this->findContactForSync($user, $mapped);
                            if ($contact) {
                                $list->contacts()->syncWithoutDetaching([$contact->id]);
                            }
                        }
                    } catch (\Throwable $e) {
                        Log::warning('Contact import row failed', [
                            'row'   => $index + 2,
                            'error' => $e->getMessage(),
                        ]);
                        $errors[] = ['row' => $index + 2, 'error' => $e->getMessage()];
                        $skipped++;
                    }
                }
            });
        }

        // Never silently return "0 rows processed"
        if ($imported === 0 && $updated === 0 && $totalRows > 0) {
            Log::error('CSV import: all rows were skipped', [
                'file'       => $originalName,
                'total_rows' => $totalRows,
                'skipped'    => $skipped,
                'errors'     => $errors,
                'mappings'   => $mappings,
                'headers'    => $rawHeaders,
            ]);
            throw new RuntimeException(
                "Nenhum contato importado de {$totalRows} linhas. " .
                "Verifique se o arquivo contém email ou telefone válidos. " .
                "Colunas detectadas: " . json_encode(
                    array_filter($this->formatMappingsForDisplay($mappings, $rawHeaders))
                )
            );
        }

        return [
            'total_rows' => $totalRows,
            'imported'   => $imported,
            'updated'    => $updated,
            'skipped'    => $skipped,
            'errors'     => $errors,
            'list_id'    => $list?->id,
            // Keep backward compatibility
            'duplicates' => $updated,
        ];
    }

    // ─── Row Mapping ──────────────────────────────────────────────────

    /**
     * Map a raw CSV row to our normalized structure.
     *
     * @param  array  $row         Raw row values
     * @param  array  $rawHeaders  Original header names
     * @param  array  $mappings    Detected column indices: ['name' => ?int, ...]
     * @param  int    $rowIndex    Row index (for placeholder generation)
     * @return array{name:string, email:string, phone:?string, city:?string, state:?string, country:?string, raw_data:array}
     */
    private function mapRow(array $row, array $rawHeaders, array $mappings, int $rowIndex): array
    {
        // Build original columns map for raw_data
        $originalColumns = [];
        foreach ($row as $i => $val) {
            $header = $rawHeaders[$i] ?? "col_{$i}";
            $originalColumns[$header] = $val;
        }

        // Extract and concatenate name (first_name + last_name if separate)
        $name = $this->extractString($row, $mappings['name']);
        $lastName = $this->extractString($row, $mappings['last_name'] ?? null);
        if ($lastName) {
            $name = trim(($name ?? '') . ' ' . $lastName);
        }
        $name = $name ?: 'Unknown';

        // Email: normalize
        $email = $this->extractString($row, $mappings['email']);
        $email = $email ? $this->normalizeEmail($email) : null;

        // Phone: normalize
        $rawPhone = $this->extractString($row, $mappings['phone']);
        $phone = $rawPhone ? $this->normalizePhone($rawPhone) : null;

        // Data-sniffing fallback: scan row values for email/phone patterns
        if (!$email || !$phone) {
            foreach ($row as $i => $val) {
                $val = trim((string) $val);
                if (!$email && str_contains($val, '@')) {
                    $candidate = $this->normalizeEmail($val);
                    if ($candidate) {
                        $email = $candidate;
                    }
                }
                if (!$phone && preg_match('/[\d\(\)\+\-\s]{8,}/', $val)) {
                    $candidate = $this->normalizePhone($val);
                    if ($candidate) {
                        $phone = $candidate;
                    }
                }
            }
        }

        // Fallback placeholder only after all detection attempts
        if (!$email) {
            $email = "user_{$rowIndex}@import.local";
        }

        // Extra fields
        $city = $this->extractString($row, $mappings['city'] ?? null);
        $state = $this->extractString($row, $mappings['state'] ?? null);
        $country = $this->extractString($row, $mappings['country'] ?? null);

        $mappedFields = array_filter([
            'name'    => $name,
            'email'   => $email,
            'phone'   => $phone,
            'city'    => $city,
            'state'   => $state,
            'country' => $country,
        ], fn ($v) => $v !== null);

        return [
            'name'     => $name,
            'email'    => $email,
            'phone'    => $phone,
            'city'     => $city,
            'state'    => $state,
            'country'  => $country,
            'raw_data' => [
                'original_columns' => $originalColumns,
                'mapped_fields'    => $mappedFields,
            ],
        ];
    }

    private function extractString(array $row, ?int $index): ?string
    {
        if ($index === null) {
            return null;
        }
        $val = $row[$index] ?? null;
        if ($val === null || $val === '') {
            return null;
        }
        return $this->cleanString((string) $val);
    }

    // ─── Upsert Logic ─────────────────────────────────────────────────

    /**
     * Insert or update a contact. Dedup by email first, then phone.
     *
     * @return string 'imported'|'updated'|'skipped'
     */
    private function upsertContact(
        User $user,
        array $mapped,
        string $sourceFile,
        string $duplicateStrategy,
    ): string {
        $email = $mapped['email'];
        $phone = $mapped['phone'];

        // Must have at least email or phone to be useful
        $isPlaceholderEmail = str_ends_with($email, '@import.local');
        if (!$phone && $isPlaceholderEmail) {
            return 'skipped';
        }

        // Try to find existing contact: email first (if real), then phone
        $existing = null;
        if (!$isPlaceholderEmail) {
            $existing = Contact::where('user_id', $user->id)
                ->where('email', $email)
                ->first();
        }
        if (!$existing && $phone) {
            $existing = Contact::where('user_id', $user->id)
                ->where('phone', $phone)
                ->first();
        }

        if ($existing) {
            if ($duplicateStrategy === 'skip') {
                return 'skipped';
            }

            // Update existing
            $updateData = array_filter([
                'name'        => $mapped['name'] !== 'Unknown' ? $mapped['name'] : null,
                'email'       => !$isPlaceholderEmail ? $email : null,
                'phone'       => $phone ?: null,
                'source_file' => $sourceFile,
                'raw_data'    => $mapped['raw_data'],
            ], fn ($v) => $v !== null);

            $existing->update($updateData);
            return 'updated';
        }

        // Create new
        Contact::create([
            'user_id'     => $user->id,
            'tenant_id'   => $user->tenant_id,
            'name'        => $mapped['name'],
            'email'       => $isPlaceholderEmail ? null : $email,
            'phone'       => $phone ?? '',
            'source_file' => $sourceFile,
            'raw_data'    => $mapped['raw_data'],
        ]);

        return 'imported';
    }

    private function findContactForSync(User $user, array $mapped): ?Contact
    {
        $isPlaceholderEmail = str_ends_with($mapped['email'] ?? '', '@import.local');

        if (!$isPlaceholderEmail && $mapped['email']) {
            $contact = Contact::where('user_id', $user->id)
                ->where('email', $mapped['email'])
                ->first();
            if ($contact) {
                return $contact;
            }
        }

        if ($mapped['phone']) {
            return Contact::where('user_id', $user->id)
                ->where('phone', $mapped['phone'])
                ->first();
        }

        return null;
    }

    // ─── Column Detection (Fuzzy) ─────────────────────────────────────

    /**
     * Detect semantic columns from headers using fuzzy matching.
     *
     * @param  array<int,string>  $headers  Normalized header strings
     * @return array<string,?int>  Map of field => column index (null if not found)
     */
    private function detectColumns(array $headers): array
    {
        $result = [];
        $claimed = []; // track which header indices are already assigned

        // Process fields in priority order
        $fieldOrder = ['email', 'phone', 'name', 'last_name', 'city', 'state', 'country'];

        foreach ($fieldOrder as $field) {
            $aliases = self::COLUMN_ALIASES[$field] ?? [];
            $bestIndex = null;
            $bestScore = 0;

            foreach ($headers as $i => $header) {
                if (isset($claimed[$i])) {
                    continue;
                }

                $score = $this->matchScore($header, $aliases);
                if ($score > $bestScore) {
                    $bestScore = $score;
                    $bestIndex = $i;
                }
            }

            // Require a minimum score to accept a match
            if ($bestScore >= 50) {
                $result[$field] = $bestIndex;
                $claimed[$bestIndex] = true;
            } else {
                $result[$field] = null;
            }
        }

        // If no columns were detected at all, apply positional fallback
        $hasAnyMapping = collect($result)->filter(fn ($v) => $v !== null)->isNotEmpty();
        if (!$hasAnyMapping && count($headers) > 0) {
            Log::info('CSV import: no columns matched by alias, applying positional fallback', [
                'headers' => $headers,
            ]);
            $result = $this->fallbackPositionalMapping($headers);
        }

        Log::info('CSV import: column detection result', [
            'headers'  => $headers,
            'mappings' => $result,
        ]);

        return $result;
    }

    /**
     * Positional fallback when no headers match known aliases.
     * Assigns name → first column, then scans for email-like and phone-like columns.
     */
    private function fallbackPositionalMapping(array $headers): array
    {
        $result = [
            'name' => 0, // first column is always name
            'last_name' => null,
            'email' => null,
            'phone' => null,
            'city' => null,
            'state' => null,
            'country' => null,
        ];

        // Scan remaining columns for email-like or phone-like headers
        for ($i = 1; $i < count($headers); $i++) {
            $h = $headers[$i];
            if ($result['email'] === null && (
                str_contains($h, '@') || str_contains($h, 'mail') || str_contains($h, 'email')
            )) {
                $result['email'] = $i;
            } elseif ($result['phone'] === null && (
                preg_match('/phone|tel|cel|fone|whats|mob/i', $h)
            )) {
                $result['phone'] = $i;
            }
        }

        // If still no email/phone detected, assign by position
        if ($result['email'] === null && count($headers) >= 2) {
            $result['email'] = 1;
        }
        if ($result['phone'] === null && count($headers) >= 3) {
            $result['phone'] = 2;
        }

        return $result;
    }

    /**
     * Score how well a header matches a list of aliases (0-100).
     */
    private function matchScore(string $header, array $aliases): int
    {
        foreach ($aliases as $priority => $alias) {
            // Exact match → highest score (diminished slightly by position in alias list)
            if ($header === $alias) {
                return 100 - $priority;
            }
        }

        foreach ($aliases as $priority => $alias) {
            // Header contains alias (e.g., "billing_email_address" contains "email")
            if (str_contains($header, $alias)) {
                return 80 - $priority;
            }
            // Alias contains header (e.g., alias "email" and header is "mail")
            if (strlen($header) >= 3 && str_contains($alias, $header)) {
                return 60 - $priority;
            }
        }

        return 0;
    }

    /**
     * Apply user-provided manual mappings.
     * Manual mappings format: {"name": "billing_first_name", "email": "billing_email", ...}
     * Values are original header names that should map to each field.
     */
    private function applyManualMappings(array $normalizedHeaders, array $manualMappings): array
    {
        $result = [];
        $fields = ['name', 'last_name', 'email', 'phone', 'city', 'state', 'country'];

        foreach ($fields as $field) {
            $result[$field] = null;
            if (!isset($manualMappings[$field])) {
                continue;
            }
            $targetHeader = $this->normalizeHeader($manualMappings[$field]);
            $idx = array_search($targetHeader, $normalizedHeaders, true);
            if ($idx !== false) {
                $result[$field] = $idx;
            }
        }

        return $result;
    }

    /**
     * Format mappings for display: field => original header name or null.
     */
    private function formatMappingsForDisplay(array $mappings, array $rawHeaders): array
    {
        $display = [];
        foreach ($mappings as $field => $index) {
            $display[$field] = $index !== null ? ($rawHeaders[$index] ?? null) : null;
        }
        return $display;
    }

    // ─── Normalization ────────────────────────────────────────────────

    private function normalizeHeader(string $header): string
    {
        $header = strtolower(trim($header));
        // Remove BOM, non-printable chars
        $header = preg_replace('/[\x00-\x1F\x7F\xEF\xBB\xBF]+/', '', $header);
        $header = preg_replace('/[\s\-\.]+/', '_', $header);
        $header = preg_replace('/[^a-z0-9_àáâãéêíóôõúüçñ]/', '', $header);
        return $header;
    }

    private function cleanString(string $value): string
    {
        $value = trim($value);
        // Remove non-printable characters except common whitespace
        $value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $value);
        return $value;
    }

    private function normalizeEmail(string $email): ?string
    {
        $email = strtolower(trim($email));
        // Strip surrounding quotes/whitespace
        $email = trim($email, "\" '\t");
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return null;
        }
        return $email;
    }

    /**
     * Normalize a phone number to E.164-ish international format.
     * Defaults to BR country code (55) if national number lacks one.
     */
    public function normalizePhone(string $raw): ?string
    {
        $raw = trim($raw);
        $hasPlus = str_starts_with($raw, '+');
        $digits = preg_replace('/\D+/', '', $raw);

        if (!$digits) {
            return null;
        }

        if (!$hasPlus) {
            $digits = ltrim($digits, '0');

            // Brazilian number without country code (10 or 11 digits)
            if (strlen($digits) === 10 || strlen($digits) === 11) {
                $digits = '55' . $digits;
            }
        }

        // E.164: max 15 digits, min 8
        if (strlen($digits) < 8 || strlen($digits) > 15) {
            return null;
        }

        return '+' . $digits;
    }

    // ─── List Resolution ──────────────────────────────────────────────

    private function resolveList(User $user, ?int $listId, ?string $newListName): ?ContactList
    {
        if ($listId) {
            return ContactList::where('id', $listId)
                ->where('user_id', $user->id)
                ->firstOrFail();
        }

        if ($newListName) {
            return ContactList::create([
                'user_id'   => $user->id,
                'tenant_id' => $user->tenant_id,
                'name'      => $newListName,
            ]);
        }

        return null;
    }

    // ─── File Parsing ─────────────────────────────────────────────────

    private function parseFile(UploadedFile $file): array
    {
        $extension = strtolower($file->getClientOriginalExtension());
        $path = $file->getRealPath();

        // parseCsv now handles encoding detection internally via the
        // encoding × delimiter matrix — no upfront ensureUtf8() needed.
        return match ($extension) {
            'csv', 'txt' => $this->parseCsv($path),
            'xlsx'       => $this->parseXlsx($path),
            default      => throw new RuntimeException('Formato não suportado. Envie CSV ou XLSX.'),
        };
    }

    /**
     * Convert file to UTF-8 if it appears to be in a different encoding.
     * Handles UTF-16 (LE/BE), UTF-8 BOM, Windows-1252, and ISO-8859-1.
     */
    private function ensureUtf8(string $path): void
    {
        $content = file_get_contents($path);
        if ($content === false || $content === '') {
            return;
        }

        $changed = false;

        // Detect and convert from UTF-16 LE/BE (common in some Windows exports)
        if (str_starts_with($content, "\xFF\xFE")) {
            $content = mb_convert_encoding(substr($content, 2), 'UTF-8', 'UTF-16LE');
            $changed = true;
        } elseif (str_starts_with($content, "\xFE\xFF")) {
            $content = mb_convert_encoding(substr($content, 2), 'UTF-8', 'UTF-16BE');
            $changed = true;
        }

        // Strip UTF-8 BOM
        if (str_starts_with($content, "\xEF\xBB\xBF")) {
            $content = substr($content, 3);
            $changed = true;
        }

        // Convert from legacy single-byte encodings if not valid UTF-8
        if (!mb_check_encoding($content, 'UTF-8')) {
            // Try Windows-1252 first (superset of ISO-8859-1, common in WooCommerce/Excel)
            $converted = mb_convert_encoding($content, 'UTF-8', 'Windows-1252');
            if ($converted !== false) {
                $content = $converted;
                $changed = true;
            }
        }

        // Normalize line endings to \n (handles \r\n and bare \r)
        $normalized = str_replace(["\r\n", "\r"], "\n", $content);
        if ($normalized !== $content) {
            $content = $normalized;
            $changed = true;
        }

        if ($changed) {
            file_put_contents($path, $content);
        }
    }

    /**
     * Self-healing CSV parser: exhaustively tries every encoding × delimiter
     * combination and picks the one that produces the most usable data.
     *
     * Encodings tried: UTF-8 (with UTF-16/BOM handling), Latin-1 / Windows-1252.
     * Delimiters tried: comma, semicolon, tab.
     *
     * @return array<int,array<int,string>>
     */
    private function parseCsv(string $path): array
    {
        $rawBytes = file_get_contents($path);
        if ($rawBytes === false || trim($rawBytes) === '') {
            return [];
        }

        Log::info('CSV self-healing parser: starting', [
            'file_size'   => strlen($rawBytes),
            'first_bytes' => mb_substr($rawBytes, 0, 200),
        ]);

        // ── Build content variants for each encoding ────────────────
        $variants = $this->buildEncodingVariants($rawBytes);

        // ── Exhaustive encoding × delimiter scan ────────────────────
        $delimiters = [',', ';', "\t"];
        $bestRows = null;
        $bestScore = 0;
        $bestEncoding = 'utf-8';
        $bestDelimiter = ',';

        foreach ($variants as $encoding => $content) {
            $lines = $this->splitLines($content);
            if (count($lines) < 2) {
                continue;
            }

            foreach ($delimiters as $delimiter) {
                $rows = array_map(
                    fn (string $line) => str_getcsv($line, $delimiter),
                    $lines,
                );

                // Strip BOM artifact from first cell
                if (!empty($rows[0][0])) {
                    $rows[0][0] = preg_replace('/^\xEF\xBB\xBF/', '', $rows[0][0]);
                }

                $headerCols = count($rows[0]);
                if ($headerCols <= 1) {
                    continue;
                }

                // Score = headerCols × data rows whose column count is close to header
                $matchingDataRows = 0;
                for ($i = 1, $max = count($rows); $i < $max; $i++) {
                    if (count($rows[$i]) >= $headerCols - 1) { // relax_column_count
                        $matchingDataRows++;
                    }
                }

                if ($matchingDataRows === 0) {
                    continue;
                }

                $score = $headerCols * $matchingDataRows;

                Log::debug('CSV self-healing parser: scored combination', [
                    'encoding'           => $encoding,
                    'delimiter'          => $delimiter === "\t" ? 'TAB' : $delimiter,
                    'header_cols'        => $headerCols,
                    'matching_data_rows' => $matchingDataRows,
                    'score'              => $score,
                ]);

                if ($score > $bestScore) {
                    $bestScore = $score;
                    $bestRows = $rows;
                    $bestEncoding = $encoding;
                    $bestDelimiter = $delimiter;
                }
            }
        }

        // ── Bonus: if winning result's header is single-column, force retry ";" ──
        if ($bestRows !== null && count($bestRows[0]) === 1) {
            foreach ($variants as $encoding => $content) {
                $lines = $this->splitLines($content);
                if (count($lines) < 2) {
                    continue;
                }
                $retryRows = array_map(
                    fn (string $line) => str_getcsv($line, ';'),
                    $lines,
                );
                if (count($retryRows[0]) > 1) {
                    $bestRows = $retryRows;
                    $bestEncoding = $encoding;
                    $bestDelimiter = ';';
                    break;
                }
            }
        }

        if ($bestRows !== null && count($bestRows) > 1) {
            $this->lastParseInfo = [
                'detected_encoding'  => $bestEncoding,
                'detected_delimiter' => $bestDelimiter === "\t" ? 'TAB' : $bestDelimiter,
                'total_rows'         => count($bestRows) - 1,
                'sample_row'         => $bestRows[1] ?? null,
            ];
            Log::info('CSV self-healing parser: best combination found', $this->lastParseInfo);
            return $bestRows;
        }

        // ── All combinations failed — log and return empty ──────────
        Log::error('CSV self-healing parser: all encoding × delimiter combinations failed', [
            'file_size'   => strlen($rawBytes),
            'first_bytes' => bin2hex(substr($rawBytes, 0, 40)),
        ]);

        return [];
    }

    /**
     * Build UTF-8 content variants from raw bytes for each source encoding.
     *
     * @return array<string,string>  encoding-label => UTF-8 content
     */
    private function buildEncodingVariants(string $rawBytes): array
    {
        $variants = [];

        // ── UTF-8 variant (handles UTF-16 BOM, UTF-8 BOM, Windows-1252) ──
        $utf8 = $rawBytes;
        if (str_starts_with($utf8, "\xFF\xFE")) {
            $utf8 = mb_convert_encoding(substr($utf8, 2), 'UTF-8', 'UTF-16LE');
        } elseif (str_starts_with($utf8, "\xFE\xFF")) {
            $utf8 = mb_convert_encoding(substr($utf8, 2), 'UTF-8', 'UTF-16BE');
        }
        if (str_starts_with($utf8, "\xEF\xBB\xBF")) {
            $utf8 = substr($utf8, 3);
        }
        if (!mb_check_encoding($utf8, 'UTF-8')) {
            $utf8 = mb_convert_encoding($utf8, 'UTF-8', 'Windows-1252');
        }
        $variants['utf-8'] = $utf8;

        // ── Latin-1 variant (force-convert from ISO-8859-1) ──
        $latin1 = $rawBytes;
        if (str_starts_with($latin1, "\xEF\xBB\xBF")) {
            $latin1 = substr($latin1, 3);
        }
        $latin1 = mb_convert_encoding($latin1, 'UTF-8', 'ISO-8859-1');
        $variants['latin1'] = $latin1;

        return $variants;
    }

    /**
     * Normalize line endings and split into non-empty lines.
     *
     * @return string[]
     */
    private function splitLines(string $content): array
    {
        $content = str_replace(["\r\n", "\r"], "\n", $content);
        return array_values(array_filter(
            explode("\n", $content),
            fn (string $l) => trim($l) !== '',
        ));
    }

    /**
     * Last-resort parser: reads the entire file as a string, splits lines
     * manually, then tries every delimiter via str_getcsv.
     *
     * @return array<int,array<int,string>>|null  Parsed rows, or null on failure
     */
    private function rescueParseRawContent(string $path): ?array
    {
        $raw = file_get_contents($path);
        if ($raw === false || trim($raw) === '') {
            return null;
        }

        Log::info('CSV parser: attempting raw-content rescue', [
            'file_size' => strlen($raw),
        ]);

        // Normalize any line endings fgetcsv might have choked on
        $raw = str_replace(["\r\n", "\r"], "\n", $raw);
        $lines = explode("\n", $raw);
        $lines = array_filter($lines, fn ($l) => trim($l) !== '');
        $lines = array_values($lines);

        if (count($lines) < 2) {
            return null;
        }

        $delimiters = [';', ',', "\t", '|'];
        $bestRows = null;
        $bestScore = 0;

        foreach ($delimiters as $delimiter) {
            $rows = [];
            foreach ($lines as $line) {
                $rows[] = str_getcsv($line, $delimiter);
            }

            $headerCols = count($rows[0]);
            if ($headerCols <= 1) {
                continue;
            }

            // Score: header columns × number of data rows with matching column count
            $matchingRows = 0;
            for ($i = 1; $i < count($rows); $i++) {
                if (count($rows[$i]) >= $headerCols - 1) { // allow slight mismatch
                    $matchingRows++;
                }
            }

            $score = $headerCols * $matchingRows;
            if ($score > $bestScore) {
                $bestScore = $score;
                $bestRows = $rows;
            }
        }

        if ($bestRows !== null && count($bestRows) > 1) {
            Log::info('CSV parser: raw-content rescue succeeded', [
                'row_count' => count($bestRows) - 1,
                'col_count' => count($bestRows[0]),
            ]);
            return $bestRows;
        }

        Log::warning('CSV parser: raw-content rescue failed — no delimiter produced usable rows');
        return null;
    }

    /**
     * Detect the most likely delimiter by analyzing the first few lines.
     * Uses consistency across lines rather than raw counts to avoid
     * being fooled by delimiter characters inside quoted fields.
     */
    private function detectDelimiter(string $path): string
    {
        $lines = [];
        $handle = fopen($path, 'r');
        if (!$handle) {
            return ',';
        }
        for ($i = 0; $i < 5; $i++) {
            $line = fgets($handle);
            if ($line === false) {
                break;
            }
            $lines[] = $line;
        }
        fclose($handle);

        if (empty($lines)) {
            return ',';
        }

        $candidates = [',', ';', "\t"];
        $bestDelimiter = ',';
        $bestScore = -1;

        foreach ($candidates as $candidate) {
            // Parse each line with this candidate delimiter and count columns
            $columnCounts = [];
            foreach ($lines as $line) {
                $parsed = str_getcsv($line, $candidate);
                $columnCounts[] = count($parsed);
            }

            // A good delimiter produces >1 column and consistent counts across lines
            $maxCols = max($columnCounts);
            if ($maxCols <= 1) {
                continue;
            }

            // Score: number of columns × consistency (how many lines have the same count)
            $mostCommonCount = array_count_values($columnCounts);
            arsort($mostCommonCount);
            $consistency = reset($mostCommonCount);
            $score = $maxCols * $consistency;

            if ($score > $bestScore) {
                $bestScore = $score;
                $bestDelimiter = $candidate;
            }
        }

        return $bestDelimiter;
    }

    /**
     * Parse a CSV file using a specific delimiter.
     *
     * @return array<int,array<int,string>>
     */
    private function parseCsvWithDelimiter(string $path, string $delimiter): array
    {
        $handle = fopen($path, 'r');
        if (!$handle) {
            throw new RuntimeException('Não foi possível abrir o arquivo CSV.');
        }

        $rows = [];
        while (($row = fgetcsv($handle, 0, $delimiter)) !== false) {
            // Strip BOM from first cell of first row
            if (empty($rows) && isset($row[0])) {
                $row[0] = preg_replace('/^\xEF\xBB\xBF/', '', $row[0]);
            }
            $rows[] = $row;
        }
        fclose($handle);

        return $rows;
    }

    /**
     * Minimal native XLSX reader (uses ZipArchive + SimpleXML).
     *
     * @return array<int,array<int,string>>
     */
    private function parseXlsx(string $path): array
    {
        if (!class_exists(\ZipArchive::class)) {
            throw new RuntimeException('Extensão ZIP do PHP é necessária para ler XLSX.');
        }

        $zip = new \ZipArchive();
        if ($zip->open($path) !== true) {
            throw new RuntimeException('Arquivo XLSX inválido.');
        }

        $shared = [];
        if (($sharedXml = $zip->getFromName('xl/sharedStrings.xml')) !== false) {
            $sx = @simplexml_load_string($sharedXml);
            if ($sx !== false) {
                foreach ($sx->si as $si) {
                    $text = '';
                    if (isset($si->t)) {
                        $text = (string) $si->t;
                    } elseif (isset($si->r)) {
                        foreach ($si->r as $r) {
                            $text .= (string) $r->t;
                        }
                    }
                    $shared[] = $text;
                }
            }
        }

        $sheetXml = $zip->getFromName('xl/worksheets/sheet1.xml');
        $zip->close();

        if ($sheetXml === false) {
            throw new RuntimeException('Não foi possível ler a primeira planilha.');
        }

        $sx = @simplexml_load_string($sheetXml);
        if ($sx === false) {
            throw new RuntimeException('XML de planilha inválido.');
        }

        $rows = [];
        foreach ($sx->sheetData->row as $row) {
            $rowData = [];
            $lastCol = -1;
            foreach ($row->c as $c) {
                $ref = (string) $c['r'];
                $col = $this->columnIndexFromRef($ref);
                while ($lastCol + 1 < $col) {
                    $rowData[] = '';
                    $lastCol++;
                }

                $type = (string) $c['t'];
                $val = '';
                if ($type === 's') {
                    $idx = (int) $c->v;
                    $val = $shared[$idx] ?? '';
                } elseif ($type === 'inlineStr') {
                    $val = (string) ($c->is->t ?? '');
                } else {
                    $val = (string) $c->v;
                }

                $rowData[] = $val;
                $lastCol = $col;
            }
            $rows[] = $rowData;
        }

        return $rows;
    }

    private function columnIndexFromRef(string $ref): int
    {
        $letters = preg_replace('/\d+/', '', $ref);
        $index = 0;
        $length = strlen($letters);
        for ($i = 0; $i < $length; $i++) {
            $index = $index * 26 + (ord($letters[$i]) - 64);
        }
        return max(0, $index - 1);
    }
}
