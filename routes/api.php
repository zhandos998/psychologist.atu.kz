<?php

use App\Http\Controllers\Api\StudentTestDataController;
use Illuminate\Support\Facades\Route;

Route::middleware('static.api.token')->group(function () {
    Route::get('/students/{iin}/test-results', StudentTestDataController::class)
        ->name('api.students.test-results');
});
