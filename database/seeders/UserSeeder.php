<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedUser(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Администратор',
                'iin' => '900101000001',
                'phone' => '+77010000001',
                'role' => 'admin',
            ]
        );

        $this->seedUser(
            ['email' => 'psychologist@example.com'],
            [
                'name' => 'Психолог СПП',
                'iin' => '900101000002',
                'phone' => '+77010000002',
                'role' => 'psychologist',
            ]
        );

        $this->seedUser(
            ['email' => 'ddm@example.com'],
            [
                'name' => 'Сотрудник ДДМ',
                'iin' => '900101000003',
                'phone' => '+77010000003',
                'role' => 'ddm_staff',
            ]
        );

        $this->seedUser(
            ['email' => 'student@example.com'],
            [
                'name' => 'Студент ATU',
                'iin' => '060101000004',
                'phone' => '+77010000004',
                'role' => 'student',
                'faculty' => 'ФИТ',
                'group_name' => 'ИС-23-1',
                'student_id' => 'ATU-00001',
            ]
        );
    }

    private function seedUser(array $identity, array $data): void
    {
        $user = User::firstOrNew($identity);
        $user->fill($data);

        if (! $user->exists) {
            $user->password = Hash::make('password');
        }

        $user->save();
    }
}
