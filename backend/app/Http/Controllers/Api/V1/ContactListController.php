<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Models\ContactList;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContactListController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $lists = ContactList::where('user_id', $user->id)
            ->where('tenant_id', $user->tenant_id)
            ->withCount('contacts')
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['success' => true, 'data' => $lists]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validate([
            'name'        => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
        ]);

        $list = ContactList::create([
            'user_id'     => $user->id,
            'tenant_id'   => $user->tenant_id,
            'name'        => $data['name'],
            'description' => $data['description'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Lista criada com sucesso.',
            'data'    => $list,
        ], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $list = ContactList::where('id', $id)
            ->where('user_id', $user->id)
            ->withCount('contacts')
            ->first();

        if (!$list) {
            return response()->json(['success' => false, 'message' => 'Lista não encontrada.'], 404);
        }

        $contacts = $list->contacts()->orderByDesc('contact_list_items.created_at')->paginate(
            (int) $request->query('per_page', 50)
        );

        return response()->json([
            'success' => true,
            'data'    => [
                'list'     => $list,
                'contacts' => $contacts->items(),
                'meta'     => [
                    'total'        => $contacts->total(),
                    'current_page' => $contacts->currentPage(),
                    'last_page'    => $contacts->lastPage(),
                ],
            ],
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $list = ContactList::where('id', $id)->where('user_id', $user->id)->first();

        if (!$list) {
            return response()->json(['success' => false, 'message' => 'Lista não encontrada.'], 404);
        }

        $data = $request->validate([
            'name'        => 'sometimes|required|string|max:255',
            'description' => 'nullable|string|max:1000',
        ]);
        $list->update($data);

        return response()->json(['success' => true, 'data' => $list]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $list = ContactList::where('id', $id)->where('user_id', $user->id)->first();

        if (!$list) {
            return response()->json(['success' => false, 'message' => 'Lista não encontrada.'], 404);
        }

        $list->delete();

        return response()->json(['success' => true]);
    }

    /**
     * Attach existing contacts to a list.
     */
    public function attachContacts(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $list = ContactList::where('id', $id)->where('user_id', $user->id)->first();

        if (!$list) {
            return response()->json(['success' => false, 'message' => 'Lista não encontrada.'], 404);
        }

        $data = $request->validate([
            'contact_ids'   => 'required|array|min:1',
            'contact_ids.*' => 'integer',
        ]);

        $ownedIds = Contact::where('user_id', $user->id)
            ->whereIn('id', $data['contact_ids'])
            ->pluck('id')
            ->all();

        $list->contacts()->syncWithoutDetaching($ownedIds);

        return response()->json([
            'success' => true,
            'data'    => ['attached' => count($ownedIds)],
        ]);
    }

    public function detachContact(Request $request, int $id, int $contactId): JsonResponse
    {
        $user = $request->user();
        $list = ContactList::where('id', $id)->where('user_id', $user->id)->first();

        if (!$list) {
            return response()->json(['success' => false, 'message' => 'Lista não encontrada.'], 404);
        }

        $list->contacts()->detach($contactId);

        return response()->json(['success' => true]);
    }
}
