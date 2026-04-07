<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Token cost per copy suggestion generation
    |--------------------------------------------------------------------------
    |
    | Debited from the user's wallet only after a suggestion was successfully
    | persisted. Set to 0 to disable the cost entirely.
    |
    */

    'token_cost' => (int) env('COPY_SUGGESTION_TOKEN_COST', 3),

];
