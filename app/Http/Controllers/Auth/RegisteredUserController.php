<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    /**
     * Display the registration view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Register');
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate(
            [
                'name' => 'required|string|max:255',
                'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
                'iin' => ['required', 'string', 'regex:/^\d{12}$/', 'unique:'.User::class],
                'password' => ['required', 'confirmed', Rules\Password::defaults()],
            ],
            $this->validationMessages()
        );

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'iin' => $request->iin,
            'password' => Hash::make($request->password),
        ]);

        event(new Registered($user));

        Auth::login($user);

        return redirect(route('dashboard', absolute: false));
    }

    private function validationMessages(): array
    {
        return match (app()->getLocale()) {
            'kk' => [
                'iin.required' => 'ЖСН міндетті.',
                'iin.regex' => 'ЖСН 12 цифрдан тұруы керек.',
                'iin.unique' => 'Бұл ЖСН тіркелген.',
            ],
            default => [
                'iin.required' => 'ИИН обязателен.',
                'iin.regex' => 'ИИН должен состоять из 12 цифр.',
                'iin.unique' => 'Этот ИИН уже зарегистрирован.',
            ],
        };
    }
}
