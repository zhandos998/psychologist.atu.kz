<?php

use App\Http\Controllers\Admin\ResultController;
use App\Http\Controllers\Admin\TestController as AdminTestController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\TestAttemptController;
use App\Http\Controllers\TestCatalogController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect()->route('dashboard');
});

Route::post('/locale/{locale}', function (Request $request, string $locale) {
    abort_unless(in_array($locale, ['ru', 'kk'], true), 404);

    $request->session()->put('locale', $locale);

    return back();
})->name('locale.switch');

Route::get('/dashboard', DashboardController::class)
    ->middleware(['auth', 'verified'])
    ->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('/tests', [TestCatalogController::class, 'index'])->name('tests.index');
    Route::get('/tests/{test}', [TestAttemptController::class, 'show'])->name('tests.show');
    Route::post('/tests/{test}/attempts', [TestAttemptController::class, 'store'])->name('tests.attempts.store');
    Route::get('/attempts/{attempt}', [TestAttemptController::class, 'result'])->name('attempts.show');
});

Route::middleware(['auth', 'role:admin,psychologist'])->prefix('admin')->name('admin.')->group(function () {
    Route::resource('tests', AdminTestController::class)->only(['index', 'create', 'store']);
});

Route::middleware(['auth', 'role:admin,psychologist,ddm_staff'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/results', [ResultController::class, 'index'])->name('results.index');
    Route::get('/results/export.csv', [ResultController::class, 'exportCsv'])->name('results.export.csv');
    Route::get('/results/export.xlsx', [ResultController::class, 'exportXlsx'])->name('results.export.xlsx');
    Route::get('/results/tests/{test}', [ResultController::class, 'showTest'])->name('results.tests.show');
    Route::get('/results/tests/{test}/export.csv', [ResultController::class, 'exportTestCsv'])->name('results.tests.export.csv');
    Route::get('/results/tests/{test}/export.xlsx', [ResultController::class, 'exportTestXlsx'])->name('results.tests.export.xlsx');
});

require __DIR__.'/auth.php';
