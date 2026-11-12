<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        User::firstOrCreate(
            ['email' => 'admin@biztrack.com'],
            [
                'name' => 'BizTrack Administrator',
                'password' => Hash::make('BizTrackAdmin123!'),
                'role' => 'admin',
                'is_active' => true,
            ]
        );
    }
}
