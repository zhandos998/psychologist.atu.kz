<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Администратор',
                'phone' => '+77010000001',
                'role' => 'admin',
                'password' => Hash::make('password'),
            ]
        );

        User::updateOrCreate(
            ['email' => 'psychologist@example.com'],
            [
                'name' => 'Психолог СПП',
                'phone' => '+77010000002',
                'role' => 'psychologist',
                'password' => Hash::make('password'),
            ]
        );

        User::updateOrCreate(
            ['email' => 'ddm@example.com'],
            [
                'name' => 'Сотрудник ДДМ',
                'phone' => '+77010000003',
                'role' => 'ddm_staff',
                'password' => Hash::make('password'),
            ]
        );

        User::updateOrCreate(
            ['email' => 'student@example.com'],
            [
                'name' => 'Студент ATU',
                'phone' => '+77010000004',
                'role' => 'student',
                'faculty' => 'ФИТ',
                'group_name' => 'ИС-23-1',
                'student_id' => 'ATU-00001',
                'password' => Hash::make('password'),
            ]
        );

        $this->call(SppTzSeeder::class);
    }
}
